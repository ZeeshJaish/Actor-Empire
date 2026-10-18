import type {OwnedStreamingPlatformState} from '../types';
import {evaluateStreamingMarketTaxAssessment} from './streamingMarketEconomics';
import {getStreamingAdditionalOperatingExpense} from './streamingOperatingExpenses';

/** Reassess only the earned-week frozen tax basis. The remaining paid-policy
 * balance is consumed with the credit and persisted, so reload/replay cannot refund it twice. */
export const finalizeStreamingMaintenanceTax = (platform:OwnedStreamingPlatformState,absoluteWeek:number):OwnedStreamingPlatformState => {
    const snapshot=platform.weeklyHistory.find(row=>row.absoluteWeek===absoluteWeek);
    const operations=snapshot?.operations,assessment=operations?.marketTaxSettlement;
    if(!operations||!assessment) return platform;
    const charges=evaluateStreamingMarketTaxAssessment(assessment,
        getStreamingAdditionalOperatingExpense(platform,absoluteWeek,operations.additionalOperatingExpense));
    const reduction=Math.max(0,(operations.marketPolicyCost||0)-charges.policyCost);
    if(!reduction) return platform;
    // The funded payment still covers the revised liability first. Reducing an
    // unpaid liability is an accounting adjustment, never a treasury refund.
    const cashRelief=Math.max(0,Math.min(reduction,assessment.remainingFundedPolicyCost-charges.policyCost));
    const titles=operations.titlePerformance||[];
    const totalAllocated=titles.reduce((sum,title)=>sum+Math.max(0,title.allocatedCashCost),0);
    let cumulativeWeight=0,allocated=0;
    const titlePerformance=titles.map(title=>{
        cumulativeWeight+=Math.max(0,title.allocatedCashCost);
        const target=Math.floor(Math.min(reduction,totalAllocated)*cumulativeWeight/Math.max(1,totalAllocated));
        const costReduction=target-allocated;
        allocated=target;
        return {...title,allocatedCashCost:title.allocatedCashCost-costReduction,
            cashContribution:title.cashContribution+costReduction,accountingContribution:title.accountingContribution+costReduction};
    });
    return {...platform,treasuryCash:platform.treasuryCash+cashRelief,
        weeklyHistory:platform.weeklyHistory.map(row=>row!==snapshot?row:{...row,operations:{...operations,
            marketPolicyCost:charges.policyCost,marketIncomeTax:charges.incomeTax,marketRevenueLevy:charges.revenueLevy,
            marketTaxSettlement:{...assessment,remainingFundedPolicyCost:Math.max(0,assessment.remainingFundedPolicyCost-cashRelief)},
            totalCashCost:operations.totalCashCost-reduction,netCashContribution:operations.netCashContribution+cashRelief,
            accountingContribution:operations.accountingContribution+reduction,titlePerformance}})};
};
