import type {OwnedStreamingMarketOperation, OwnedStreamingWeeklyOperations, Player} from '../types';
const nonnegative=(n:number|undefined)=>Number.isFinite(n)?Math.max(0,Number(n)):0;
export interface StreamingTaxExpenseBasis {
    deductibleOperatingCost?:number;
    contentAmortization?:number;
    additionalOperatingExpense?:number;
    /** Current earned receipts; missing data uses the legacy market allocation proxy. */
    countryRevenues?:Record<string,number>;
    countryActiveAudience?:Record<string,number|undefined>;
}
/** Levy follows receipts; income tax follows positive contribution after real expenses.
 * This simplified weekly model issues no negative tax, refund credit or loss subsidy. */
export const createStreamingMarketTaxAssessment=(markets:OwnedStreamingMarketOperation[],revenue:number,basis:StreamingTaxExpenseBasis={})=>{
    const active=markets.filter(x=>x.scope==='COUNTRY'&&x.status==='ACTIVE'&&x.countryProfile&&x.policySnapshot);
    const actual=active.map(x=>nonnegative(basis.countryRevenues?.[x.countryId!]));
    const hasEarnedWeights=actual.some(x=>x>0);
    const weights=hasEarnedWeights?actual:active.map(x=>nonnegative(x.countryProfile!.audienceSize)||1);
    const totalWeight=weights.reduce((s,n)=>s+n,0);
    const deductions=nonnegative(basis.deductibleOperatingCost)+nonnegative(basis.contentAmortization);
    let revenueLevy=0;
    const bands:NonNullable<OwnedStreamingWeeklyOperations['marketTaxSettlement']>['bands']=[];
    for(const [i,market] of active.entries()){
        const share=totalWeight?weights[i]/totalWeight:0;
        const receipts=nonnegative(revenue)*share;
        const levy=receipts*Math.min(100,nonnegative(market.policySnapshot!.streamingLevyPercent))/100;
        revenueLevy+=levy;
        bands.push({preMaintenanceProfit:receipts-deductions*share-levy,maintenanceShare:share,
            taxRate:Math.min(100,nonnegative(market.policySnapshot!.effectiveTaxPercent))/100});
    }
    return {revenueLevy:Math.round(revenueLevy),bands};
};
export const evaluateStreamingMarketTaxAssessment=(assessment:Pick<NonNullable<OwnedStreamingWeeklyOperations['marketTaxSettlement']>,'revenueLevy'|'bands'>,maintenanceExpense:number)=>{
    const incomeTax=Math.round(assessment.bands.reduce((sum,band)=>sum
        +Math.max(0,band.preMaintenanceProfit-nonnegative(maintenanceExpense)*band.maintenanceShare)*band.taxRate,0));
    return {incomeTax,revenueLevy:assessment.revenueLevy,policyCost:incomeTax+assessment.revenueLevy};
};
export const calculateStreamingMarketPolicyCharges=(markets:OwnedStreamingMarketOperation[],revenue:number,basis:StreamingTaxExpenseBasis={})=>
    evaluateStreamingMarketTaxAssessment(createStreamingMarketTaxAssessment(markets,revenue,basis),basis.additionalOperatingExpense||0);

/** Existing country minimum and privacy-compliance rate, bounded by
 * the approved full-reach budget. Missing usage proof retains the legacy bill. */
export const calculateStreamingCountryServiceCost=(market:OwnedStreamingMarketOperation,servedAudience:number|undefined):number=>{
    const ceiling=nonnegative(market.weeklyOperatingCost);
    if(servedAudience===undefined || !Number.isFinite(servedAudience)) return Math.round(ceiling);
    const rate=market.countryProfile?.privacyComplianceLevel=== 'STRICT' ? 0.0048 : 0.0034;
    const audience=Math.min(nonnegative(market.countryProfile?.audienceSize),nonnegative(servedAudience));
    return Math.round(Math.min(ceiling,Math.max(55_000,audience*rate)));
};
/** Serviced memberships plus separate nonmember channel activity. This is a
 * bounded service-load estimate, not a new unique-audience count. External
 * piracy is not a hosted customer. */
export const getStreamingCountryServedAudience=(player:Player,platformId:string,countryId:string,absoluteWeek:number,maximumLagWeeks=0):number|undefined=>{
    const population=player.world.worldPopulation?.countries?.[countryId];
    if(!population || !Number.isFinite(population.households) || population.households<=0
        || !Number.isFinite(population.averageHouseholdSize) || population.averageHouseholdSize<=0) return undefined;
    const customers=player.world.worldStreamingCustomers;
    const viewing=player.world.worldStreamingViewing;
    const inWindow=(week:number|undefined)=>week!==undefined && week<=absoluteWeek && week>=absoluteWeek-maximumLagWeeks;
    const customerCountry=inWindow(customers?.lastProcessedAbsoluteWeek)?customers?.countries?.[countryId]:undefined;
    const viewingCountry=inWindow(viewing?.lastProcessedAbsoluteWeek)?viewing?.countries?.[countryId]:undefined;
    if(!Array.isArray(customerCountry?.platformSummaries) && !viewingCountry?.platformPerformance) return undefined;
    const customer=customerCountry?.platformSummaries?.find(row=>row.platformId===platformId);
    const mix=viewingCountry?.platformPerformance?.[platformId]?.accessMix;
    const memberStock=Math.max(nonnegative(customer?.endingPaidAccounts),nonnegative(mix?.paidViewingAccounts));
    // Current player store receipts retain membership at purchase. Those
    // memberships are already serviced above. Unknown/legacy store activity
    // receives no invented overlap discount; it remains a conservative load.
    const memberStore=platformId==='PLAYER' && viewingCountry
        ? (viewing?.commercialTransactions||[]).filter(row=>row.countryId===countryId && Boolean(row.buyerPlanId))
            .reduce((sum,row)=>sum+nonnegative(row.households),0) : 0;
    const nonmemberStore=Math.max(0,nonnegative(mix?.storeViewingAccounts)-memberStore);
    const households=Math.min(nonnegative(population.households),memberStock+nonnegative(mix?.freeViewingAccounts)
        +nonnegative(mix?.sharedViewingAccounts)+nonmemberStore);
    return households*Math.max(1,nonnegative(population.averageHouseholdSize));
};
