export interface CareerFilmObservation {
    id:string;name?:string;owner?:string;genre?:string;quality?:number;closed:boolean;ownCredit:boolean;
    budgetCents:number|null;campaignCents:number|null;bookingCents:number;talentPaidCents:number;actorPaidCents:number;
    investorPaidCents:number;grossCents:number;receiptsCents:number;activationWeek?:number;lastSettledWeek?:number;
}

/** Audit reporting only. Theater receipts pay production, campaign, booking and backend.
 * Financing distributions do not become a second project expense; actor cash is separate.
 */
export const summarizeCareerFilms=(input:CareerFilmObservation[])=>{
    const unique=[...new Map(input.map(f=>[f.id,f])).values()];
    const closed=unique.filter(f=>f.closed),known=closed.filter(f=>f.budgetCents!==null&&f.budgetCents>0&&f.campaignCents!==null);
    const classify=(f:CareerFilmObservation)=>{
        const costs=f.budgetCents!+f.campaignCents!+f.bookingCents+f.talentPaidCents+f.actorPaidCents;
        const profit=f.receiptsCents-costs;
        // Same financial-hit hurdle as the existing NPC result: 60% of production budget in profit.
        const status=profit>=f.budgetCents!*.6?'HIT':Math.abs(profit)<=costs*.05?'NEAR_BREAK_EVEN':profit>0?'PROFIT':'LOSS';
        return {...f,costsCents:costs,theatricalProfitCents:profit,status};
    };
    const rows=known.map(classify);
    const counts=(items:typeof rows)=>({completed:items.length,recouped:items.filter(f=>f.theatricalProfitCents>=0).length,
        hits:items.filter(f=>f.status==='HIT').length,profits:items.filter(f=>f.status==='PROFIT').length,
        nearBreakEven:items.filter(f=>f.status==='NEAR_BREAK_EVEN').length,losses:items.filter(f=>f.status==='LOSS').length,
        exactDeficits:items.filter(f=>f.theatricalProfitCents<0).length});
    return {released:unique.length,completed:closed.length,open:unique.length-closed.length,unknownCompleted:closed.length-known.length,
        all:counts(rows),small:counts(rows.filter(f=>f.budgetCents!<=25e8)),player:counts(rows.filter(f=>f.ownCredit)),
        billionAttainment:[1,2,3].map(b=>({billions:b,allReleased:unique.filter(f=>f.grossCents>=b*1e11).length,completed:closed.filter(f=>f.grossCents>=b*1e11).length})),rows};
};
