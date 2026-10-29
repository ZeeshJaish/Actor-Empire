import type {Player,SponsorshipActionType,SponsorshipCategory,SponsorshipValueBasis} from '../types';
import {getAbsoluteWeek} from './legacyLogic';
import {createWorldPopulationState} from './worldEconomy/worldPopulation';
import {getStreamingCountryAdMarket} from './worldEconomy/worldStreamingAdMarket';

export interface SponsorshipQuoteInput {
    source: SponsorshipValueBasis['source'];
    brandName: string;
    brandFollowers?: number;
    category: SponsorshipCategory;
    type: SponsorshipActionType;
    durationWeeks: number;
    totalRequired: number;
    isExclusive: boolean;
    negotiationPower?: number;
    commercialMultiplier?: number;
    creatorMultiplier?: number;
}

const finite=(n:unknown,fallback=0):number=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const categoryFit:Record<SponsorshipCategory,number>={FASHION:.6,FITNESS:.48,BEVERAGE:.65,TECH:.45,AUTOMOTIVE:.35,LUXURY:.28};

/** Estimate one campaign, not a cash entitlement per follower. This reads country
 * ad prices as a valuation reference; it does not spend the streaming ad pool. */
export const quoteSponsorshipValue=(p:Player,input:SponsorshipQuoteInput):{weeklyPay:number;valueBasis:SponsorshipValueBasis}=>{
    const absoluteWeek=getAbsoluteWeek(p.age,p.currentWeek);
    const countries=Object.values(p.world.worldPopulation?.countries||createWorldPopulationState(absoluteWeek).countries);
    let eligiblePeople=0,weightedCpm=0,weeklyMarketBudget=0;
    for(const country of countries){
        const eligible=Math.max(0,finite(country.population))*clamp(finite(country.reliableInternetPercent),0,100)/100
            *clamp(finite(country.smartphoneAccessPercent),0,100)/100;
        const market=getStreamingCountryAdMarket(country,absoluteWeek,Math.max(0,finite(country.households)));
        eligiblePeople+=eligible;weightedCpm+=eligible*market.marketReferenceCpm;
        weeklyMarketBudget+=market.advertiserDemandBudget;
    }
    const referenceCpm=eligiblePeople>0?weightedCpm/eligiblePeople:0;
    const observed=new Map<string,{week:number;engagement:number}>();
    for(const post of p.instagram?.posts||[]){
        const week=getAbsoluteWeek(finite(post.year),finite(post.week));
        if(!post.isPlayer||!post.id||week>absoluteWeek||absoluteWeek-week>26)continue;
        const engagement=Math.max(0,finite(post.likes),finite(post.comments),finite(post.shares),finite(post.saves));
        observed.set(post.id,{week,engagement});
    }
    const recent=[...observed.values()].sort((a,b)=>b.week-a.week).slice(0,8)
        .map(row=>row.engagement/.26).sort((a,b)=>a-b);
    const median=recent.length?recent[Math.floor(recent.length/2)]:0;
    // A post stores engagement rather than unique reach. Infer a median exposure;
    // do not count overlapping likes/comments/shares, or Instagram's two aliases twice.
    const recognition=Math.max(0,finite(p.stats.followers),finite(p.instagram?.followers),finite(p.youtube?.subscribers));
    const fame=clamp(finite(p.stats.fame),0,100)/100;
    const commercial=clamp(finite(input.commercialMultiplier,1),.15,1.1);
    const imageReach=input.source==='MANAGER'?eligiblePeople*.0005*fame**3*commercial:0;
    let rawReach=(recent.length?median:recognition*.12)+imageReach;
    // A micro-brand has a smaller acquisition campaign than a global brand even
    // when it approaches a celebrity. Buyer reach grows with its own customer base.
    if(input.source==='INSTAGRAM_DM')rawReach=Math.min(rawReach,Math.max(0,finite(input.brandFollowers))*25);
    const reachablePeople=eligiblePeople>0?-eligiblePeople*Math.expm1(-Math.max(0,rawReach)/eligiblePeople):0;
    const safety=clamp(1-finite(p.instagram?.controversy)/150,.3,1);
    const qualifiedImpressions=reachablePeople*(categoryFit[input.category]||.5)*safety;
    const marketScale=referenceCpm/18;
    const imageFee=input.source==='MANAGER'?(250+150_000*fame**3)*marketScale*commercial:(50+fame*30)*marketScale;
    const mediaValue=qualifiedImpressions*referenceCpm/1000*(input.source==='MANAGER'?1:.4);
    const negotiation=.85+clamp(finite(input.negotiationPower,5),0,10)*.03;
    const creator=clamp(finite(input.creatorMultiplier,1),.88,1.22);
    const perDeliverableValue=(imageFee+mediaValue)*negotiation*creator
        *(input.type==='SHOOT'?1.25:1)*(input.isExclusive?1.15:1);
    // Campaign budget is finite country demand scaled to addressed people and
    // buyer type. No fixed dollar ceiling and no producer-budget/personal-income kicker.
    const buyerShare=input.source==='MANAGER'?.03:.001;
    const buyerReach=input.source==='INSTAGRAM_DM'&&eligiblePeople>0
        ? -eligiblePeople*Math.expm1(-Math.max(0,finite(input.brandFollowers))*25/eligiblePeople)
        : reachablePeople;
    const buyerBudget=eligiblePeople>0?weeklyMarketBudget*buyerReach/eligiblePeople*buyerShare:0;
    // Live durationWeeks is the *remaining* paid term; weeksCompleted increases
    // separately, so comparing them would release the budget halfway through.
    const alreadyCommitted=(p.activeSponsorships||[]).filter(deal=>deal.brandName===input.brandName
        && finite(deal.durationWeeks)>0)
        .reduce((sum,deal)=>sum+Math.max(0,finite(deal.weeklyPay)),0);
    const weeklyBuyerBudget=Math.max(0,buyerBudget-alreadyCommitted);
    const duration=Math.max(0,Math.floor(finite(input.durationWeeks)));
    const required=Math.max(0,Math.floor(finite(input.totalRequired)));
    // Required deliveries, not the number of weeks alone, buy the content rights.
    const weeklyPay=duration>0&&required>0?Math.floor(Math.max(0,Math.min(
        perDeliverableValue*required/duration,weeklyBuyerBudget))):0;
    return {weeklyPay,valueBasis:{version:1,source:input.source,
        audienceBasis:recent.length?'OBSERVED_ENGAGEMENT':'ESTIMATED_REACH',absoluteWeek,
        eligiblePeople,reachablePeople,qualifiedImpressions,referenceCpm,weeklyBuyerBudget,
        perDeliverableValue,estimatedContractValue:weeklyPay*duration}};
};
