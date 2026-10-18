import type {WorldAudienceCohortState, WorldAudienceParticipationCohortState,
    WorldStreamingPlatformOffer, OwnedStreamingPricingConfiguration, OwnedStreamingPlatformState} from '../../types';
import type {StreamingAudienceCohortChoice} from './worldStreamingAudienceChoice';
import {getWorldStreamingStoreStrength} from './worldStreamingOffers';
import {projectStreamingCommercialOffers} from '../streamingCommercialOffers';
import {createStreamingHouseholdBudget, createStreamingStoreWallet,
    spendStreamingStoreWallet, allocateStreamingStoreUnits,
    type WorldStreamingCommercialRevenue, type StreamingAdFreePassOutcome} from './worldStreamingCommercialEconomy';

export interface StreamingCommerceSource {
    id: string;
    cohortId: string;
    platformId: string;
    kind: 'SUBSCRIPTION' | 'FREE_AD' | 'STORE';
    planId: string | null;
    households: number;
    remainingMonthlyBudget: number;
    wallet: ReturnType<typeof createStreamingStoreWallet>;
    platformWallet: ReturnType<typeof createStreamingStoreWallet>;
}

/** Aggregate cohorts do not identify individual homes. Secondary opportunities
 * overlap primary access, while both source and market wallets constrain cash. */
export const createStreamingCohortCommerce = (input: {
    countryId:string;
    cohort: WorldAudienceCohortState;
    participation: WorldAudienceParticipationCohortState;
    choice: StreamingAudienceCohortChoice;
    offers: WorldStreamingPlatformOffer[];
    subscriptions?: Array<{platformId:string;planId:string|null;households:number;monthlySpend:number}>;
    consumerProductPlatformIds?: string[];
}) => {
    const {cohort, choice, offers} = input;
    const subscriptions = input.subscriptions ?? choice.allocations.filter(row=>row.kind==='SUBSCRIPTION');
    const monthlyBudget = Math.max(0, Math.min(input.participation.totalMonthlyStreamingBudget,
        choice.reachableHouseholds * cohort.monthlyEntertainmentBudgetPerHousehold));
    const monthlySubscriptionSpend = subscriptions.reduce((sum,row)=>sum+Math.max(0,row.monthlySpend),0);
    const averageRemainder = Math.max(0, monthlyBudget-monthlySubscriptionSpend) / Math.max(1,choice.reachableHouseholds);
    const sources = offers.flatMap(offer => {
        const projected = projectStreamingCommercialOffers(offer.commercialConfiguration);
        const paid = subscriptions.filter(row=>row.platformId===offer.platformId);
        const nonpaid = choice.allocations.filter(row=>row.platformId===offer.platformId && row.kind!=='SUBSCRIPTION');
        const secondaryAd=Math.min(Math.max(0,choice.reachableHouseholds-paid.reduce((sum,row)=>sum+row.households,0)-nonpaid.reduce((sum,row)=>sum+row.households,0)),(choice.freeAdOpportunities||[]).filter(row=>row.platformId===offer.platformId).reduce((sum,row)=>sum+row.households,0));
        const reached = secondaryAd+paid.reduce((sum,row)=>sum+row.households,0)+nonpaid.reduce((sum,row)=>sum+row.households,0);
        const extra = Math.min(Math.max(0,choice.reachableHouseholds-reached),
            choice.storeOpportunities.filter(row=>row.platformId===offer.platformId).reduce((sum,row)=>sum+row.households,0));
        const raw = [...paid.map((row,i)=>({id:`${offer.platformId}:paid:${i}`,kind:'SUBSCRIPTION' as const,
            planId:row.planId,households:row.households,
            remainingMonthlyBudget:Math.min(averageRemainder,Math.max(0,cohort.monthlyEntertainmentBudgetPerHousehold-row.monthlySpend/Math.max(1,row.households)))})),
            ...nonpaid.map((row,i)=>({id:`${offer.platformId}:free:${i}`,kind:row.kind,
                planId:null,households:row.households,remainingMonthlyBudget:averageRemainder})),
            ...(secondaryAd ? [{id:`${offer.platformId}:secondary-ad`,kind:'FREE_AD' as const,planId:null,households:secondaryAd,remainingMonthlyBudget:averageRemainder}]:[]),
            ...(extra ? [{id:`${offer.platformId}:secondary`,kind:'STORE' as const,planId:null,
                households:extra,remainingMonthlyBudget:averageRemainder}] : [])];
        return raw.filter(row=>row.households>0).map(row=>({...row,cohortId:cohort.id,platformId:offer.platformId,
            weight: projected.storeOffer?.eligibility.kind==='PUBLIC' || row.kind!=='STORE'
                ? row.households : 0}));
    });
    const spendingPlatforms = new Set(offers.filter(offer=>{
        const passes=projectStreamingCommercialOffers(offer.commercialConfiguration).adFreePasses;
        return input.consumerProductPlatformIds?.includes(offer.platformId) || passes.oneHourPrice!==null || passes.dayPrice!==null || offer.commercialConfiguration.streams.some(
            stream=>(stream==='rentals' && getWorldStreamingStoreStrength(offer,input.countryId)>0) || ['daypass','metered','patron','premium'].includes(stream));
    }).map(offer=>offer.platformId));
    const budget = createStreamingHouseholdBudget({monthlyBudget,monthlySubscriptionSpend,
        platformWeights:sources.filter(row=>spendingPlatforms.has(row.platformId)).map(row=>({platformId:row.platformId,weight:row.weight}))});
    const storeSources:StreamingCommerceSource[] = sources.map(({weight:_,...row})=>({...row,
        wallet:createStreamingStoreWallet(row.households,row.remainingMonthlyBudget),
        platformWallet:budget.wallets[row.platformId] || {remainingCents:0}}));
    return {budget,storeSources};
};

/** Free's advertising is already paid through the finite country ad market.
 * Consumer merchandise/fan/interactive income must clear household wallets. */
export const streamingConsumerProductRate = (platform:OwnedStreamingPlatformState):number =>
    platform.lifecycle==='ACTIVE' && platform.infrastructureSetup
        ? platform.productLines.filter(line=>line.status==='ACTIVE' && line.lineId!=='FREE')
            .reduce((sum,line)=>sum+Math.max(0,Number.isFinite(line.benefit.weeklyRevenuePerSubscriber)
                ? line.benefit.weeklyRevenuePerSubscriber : 0),0) : 0;

export const fundStreamingConsumerProducts = (sources:StreamingCommerceSource[],weeklyRate:number):number =>
    sources.filter(source=>source.kind==='SUBSCRIPTION').reduce((sum,source)=>{
        const dollars=Math.max(0,Math.min(Math.floor(source.households*weeklyRate),
            Math.floor(source.wallet.remainingCents/100),Math.floor(source.platformWallet.remainingCents/100)));
        source.wallet.remainingCents-=dollars*100;
        source.platformWallet.remainingCents-=dollars*100;
        return sum+dollars;
    },0);

export const spendStreamingCommerceSource = (source:StreamingCommerceSource, wanted:number, price:number):number => {
    const cents=Math.max(0,Math.round((Number.isFinite(price)?Math.max(0,price):0)*100));
    const allowed=cents ? Math.min(wanted,Math.floor(source.platformWallet.remainingCents/cents)) : wanted;
    const count=spendStreamingStoreWallet(source.wallet,allowed,price);
    spendStreamingStoreWallet(source.platformWallet,count,price);
    return count;
};

export const streamingBudgetEvidence = (countryId:string,cohortId:string,
    budget:ReturnType<typeof createStreamingHouseholdBudget>) => {
    const spentByPlatformCents=Object.fromEntries(Object.entries(budget.allocatedCents).map(([id,cents])=>
        [id,cents-budget.wallets[id].remainingCents]));
    return {countryId,cohortId,monthlyBudget:budget.monthlyBudget,
        monthlySubscriptionSpend:budget.monthlySubscriptionSpend,
        weeklyDiscretionaryCents:budget.weeklyDiscretionaryCents,
        spentCents:Object.values(spentByPlatformCents).reduce((sum,cents)=>sum+cents,0),spentByPlatformCents};
};

export interface StreamingFundedSourceReceipt {
    sourceKind: StreamingCommerceSource['kind'];
    planId: string | null;
    grossReceipts: number;
}

export const settleStreamingSourceUnits = (sources:StreamingCommerceSource[],wanted:number,price:number,
    onFunded?: (source:StreamingCommerceSource,units:number)=>void):number => {
    const eligible=sources.filter(source=>source.remainingMonthlyBudget>=price);
    const counts=allocateStreamingStoreUnits(wanted,eligible.map(source=>source.households));
    return eligible.reduce((sum,source,i)=>{
        const units=spendStreamingCommerceSource(source,Math.min(counts[i],source.households),price);
        if(units>0)onFunded?.(source,units);
        return sum+units;
    },0);
};

const fundSourceReceipts=(sources:StreamingCommerceSource[],wanted:number,price:number,recognizedPrice=price)=>{
    const funded:Array<{source:StreamingCommerceSource;units:number}>=[];
    const units=settleStreamingSourceUnits(sources,wanted,price,(source,count)=>funded.push({source,units:count}));
    const grossReceipts=Math.floor(units*recognizedPrice);
    const amounts=allocateStreamingStoreUnits(grossReceipts,funded.map(row=>row.units));
    return {units,grossReceipts,receipts:funded.map((row,i)=>({sourceKind:row.source.kind,
        planId:row.source.planId,grossReceipts:amounts[i]})).filter(row=>row.grossReceipts>0)};
};

export const fundStreamingAdFreePasses = (passes:StreamingAdFreePassOutcome,
    sources:StreamingCommerceSource[],oneHourPrice:number|null,dayPrice:number|null,eligibleHours:number,
    onFunded?:(receipt:StreamingFundedSourceReceipt)=>void):StreamingAdFreePassOutcome => {
    const one=fundSourceReceipts(sources,passes.oneHourTransactions,oneHourPrice || 0);
    const day=fundSourceReceipts(sources,passes.dayTransactions,dayPrice || 0);
    [...one.receipts,...day.receipts].forEach(row=>onFunded?.(row));
    return {oneHourTransactions:one.units,dayTransactions:day.units,oneHourRevenue:one.grossReceipts,
        dayRevenue:day.grossReceipts,coveredHours:Math.min(eligibleHours,one.units+day.units*3)};
};

/** Every consumer extra clears the same wallets and retains its access source.
 * Advertising/sponsorship are funded by businesses, not household wallets. */
export const fundStreamingAncillaryRevenue = (commercial:WorldStreamingCommercialRevenue,
    pricing:OwnedStreamingPricingConfiguration,sources:StreamingCommerceSource[]):StreamingFundedSourceReceipt[] => {
    const before=commercial.premiumRevenue+commercial.dayPassRevenue+commercial.meteredRevenue+commercial.patronRevenue;
    const premium=fundSourceReceipts(sources,commercial.premiumTransactions,pricing.premium.price);
    commercial.premiumTransactions=premium.units;commercial.premiumRevenue=premium.grossReceipts;
    const day=fundSourceReceipts(sources,commercial.dayPassTransactions,pricing.daypass.price);
    commercial.dayPassTransactions=day.units;commercial.dayPassRevenue=day.grossReceipts;
    const oldHours=commercial.meteredHours;
    const metered=fundSourceReceipts(sources,oldHours,pricing.metered.perHour);
    commercial.meteredHours=metered.units;
    commercial.meteredAccounts=oldHours?Math.floor(commercial.meteredAccounts*metered.units/oldHours):0;
    commercial.meteredRevenue=metered.grossReceipts;
    const patron=fundSourceReceipts(sources.filter(source=>source.remainingMonthlyBudget>=pricing.patron.monthly),
        commercial.patronAccounts,Math.ceil(pricing.patron.monthly/4.33*100)/100,pricing.patron.monthly/4.33);
    commercial.patronAccounts=patron.units;commercial.patronRevenue=patron.grossReceipts;
    commercial.totalIncrementalRevenue+=premium.grossReceipts+day.grossReceipts+metered.grossReceipts+patron.grossReceipts-before;
    commercial.commercialOperatingCost=Math.round(commercial.advertisingRevenue*.12
        +(commercial.premiumRevenue+commercial.rentalRevenue+commercial.purchaseRevenue+commercial.dayPassRevenue+commercial.meteredRevenue)*.035
        +commercial.patronRevenue*.06+commercial.sponsorshipRevenue*.05);
    return [...premium.receipts,...day.receipts,...metered.receipts,...patron.receipts];
};
