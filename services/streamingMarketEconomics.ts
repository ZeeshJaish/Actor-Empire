import type {OwnedStreamingMarketOperation, OwnedStreamingWeeklyOperations} from '../types';
const nonnegative=(n:number|undefined)=>Number.isFinite(n)?Math.max(0,Number(n)):0;
export interface StreamingTaxExpenseBasis {
    deductibleOperatingCost?:number;
    contentAmortization?:number;
    additionalOperatingExpense?:number;
    /** Current earned receipts; missing data uses the legacy market allocation proxy. */
    countryRevenues?:Record<string,number>;
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
