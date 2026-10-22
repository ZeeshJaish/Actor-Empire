import type { ProjectDetails, ProjectInvestorPayoutSummary } from '../../types';
import { getProjectFundingEconomics } from '../projectFundingEconomics';
import { normalizeCinemaReceiptHistory } from './boxOfficeReceiptHistory';
import type { CinemaFinanceSummary, CinemaGrossSplit, CinemaLedger, CinemaLedgerCategory } from './boxOfficeTypes';

const cents = (value: number): number => {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Cinema money must be nonnegative safe integer cents');
    return value;
};
const sumCents = (values: number[]): number => values.reduce((sum, value) => cents(sum + cents(value)), 0);
const convertMoney = (value: number, scale: number): number => {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid cinema currency amount');
    return cents(Math.round(value * scale));
};
export const dollarsToCinemaCents = (amount: number): number => convertMoney(amount, 100);
export const npcMillionsToCinemaCents = (amount: number): number => convertMoney(amount, 100_000_000);

export const splitRealizedCinemaGross = ({ grossCents, exhibitorBasisPoints, distributionBasisPoints }: {
    grossCents: number; exhibitorBasisPoints: number; distributionBasisPoints: number;
}): CinemaGrossSplit => {
    cents(grossCents);
    if (![exhibitorBasisPoints, distributionBasisPoints].every(value => Number.isInteger(value) && value >= 0 && value <= 10_000)
        || exhibitorBasisPoints + distributionBasisPoints > 10_000) throw new RangeError('Invalid cinema receipt shares');
    // Integer multiplication cannot lose cents even near Number.MAX_SAFE_INTEGER.
    const exhibitorReceiptsCents = Number(BigInt(grossCents) * BigInt(exhibitorBasisPoints) / 10_000n);
    const distributionDeductionsCents = Number(BigInt(grossCents) * BigInt(distributionBasisPoints) / 10_000n);
    return { grossCents, exhibitorReceiptsCents, distributionDeductionsCents,
        producerReceiptsCents: grossCents - exhibitorReceiptsCents - distributionDeductionsCents };
};

const LEDGER_CATEGORIES = new Set<CinemaLedgerCategory>(['THEATRICAL_GROSS', 'PRODUCER_RECEIPTS', 'STREAMING_RECEIPTS', 'SOUNDTRACK_RECEIPTS',
    'PRODUCTION_COST', 'MARKETING_COST', 'BOOKING_COST', 'LOCALIZATION_COST', 'INVESTOR_PAYOUT', 'TALENT_BACKEND', 'ACTOR_PAY']);

export const summarizeCinemaFinance = (ledger: CinemaLedger): CinemaFinanceSummary => {
    const events = new Map<string, CinemaLedger['entries'][number]>();
    const totals: Partial<Record<CinemaLedgerCategory, number>> = {};
    for (const entry of ledger.entries) {
        if (!entry.id) throw new Error('Cinema finance event requires an identity');
        if (!LEDGER_CATEGORIES.has(entry.category)) throw new Error('Unknown cinema ledger category');
        cents(entry.amountCents);
        const previous = events.get(entry.id);
        if (previous) {
            if (previous.category !== entry.category || previous.amountCents !== entry.amountCents) throw new Error(`Conflicting cinema finance event ${entry.id}`);
            continue;
        }
        events.set(entry.id, entry);
        totals[entry.category] = sumCents([totals[entry.category] || 0, entry.amountCents]);
    }
    const producerReceiptsCents = sumCents([totals.PRODUCER_RECEIPTS || 0, totals.STREAMING_RECEIPTS || 0, totals.SOUNDTRACK_RECEIPTS || 0]);
    const totalPaidCostsCents = sumCents([totals.PRODUCTION_COST || 0, totals.MARKETING_COST || 0, totals.BOOKING_COST || 0, totals.LOCALIZATION_COST || 0]);
    const investorPayoutCents = totals.INVESTOR_PAYOUT || 0, talentBackendCents = totals.TALENT_BACKEND || 0;
    const netStudioReceiptsCents = producerReceiptsCents - sumCents([investorPayoutCents, talentBackendCents]);
    const netProfitCents = netStudioReceiptsCents - totalPaidCostsCents;
    if (!Number.isSafeInteger(netProfitCents)) throw new RangeError('Cinema profit exceeds safe integer cents');
    return { publicGrossCents: totals.THEATRICAL_GROSS || 0, theatricalProducerReceiptsCents: totals.PRODUCER_RECEIPTS || 0,
        producerReceiptsCents, netStudioReceiptsCents, totalPaidCostsCents,
        investorPayoutCents, talentBackendCents, netProfitCents,
        // Upfront acting pay is already inside production cost; report it without charging it twice.
        actorEarningsCents: totals.ACTOR_PAY || 0 };
};

export interface CinemaFinanceSource {
    id?: string; budget?: number; gross?: number; totalGross?: number; totalStudioReceipts?: number; weeklyStudioReceipts?: number[];
    unrecordedTheatricalGross?: number;
    streamingRevenue?: number; soundtrackRevenue?: number; earnings?: number; marketingBudgetSpent?: number; totalCampaignSpend?: number;
    reservedMarketingBudget?: number; returnedMarketingBudget?: number;
    bookingCost?: number; bookingCostPaid?: number; localizationCostPaid?: number; talentBackendPaid?: number;
    investorPlan?: ProjectDetails['investorPlan']; talentParticipation?: ProjectDetails['talentParticipation'];
    investorPayouts?: ProjectInvestorPayoutSummary; platformProductionFunding?: number; studioCashAtRisk?: number; productionFundApplied?: number;
    projectDetails?: Partial<ProjectDetails>;
}
const nonnegative = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
const hasActualMoney = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Pure adapter for current active/history surfaces. No cash is paid or save rewritten.
 * Missing legacy receipts use an explicitly flagged estimate, never actor earnings.
 */
export const getCinemaProjectFinance = (source: CinemaFinanceSource): CinemaFinanceSummary & {
    receiptsEstimated: boolean; costsEstimated: boolean; studioReturnPercent: number | null;
} => {
    const details = source.projectDetails;
    const gross = nonnegative(source.gross ?? source.totalGross);
    const receiptHistory = normalizeCinemaReceiptHistory(source);
    const receiptsEstimated = receiptHistory.unrecordedTheatricalGross > 0;
    const theater = receiptHistory.totalStudioReceipts + Math.floor(receiptHistory.unrecordedTheatricalGross * 0.5);
    const marketing = nonnegative(source.marketingBudgetSpent ?? details?.marketingBudgetSpent ?? source.totalCampaignSpend ?? details?.totalCampaignSpend);
    const production = nonnegative(source.budget ?? details?.estimatedBudget);
    const booking = nonnegative(source.bookingCostPaid), localization = nonnegative(source.localizationCostPaid);
    const row = (id: string, category: CinemaLedgerCategory, dollars: number): CinemaLedger['entries'][number] => ({ id, category, amountCents: dollarsToCinemaCents(dollars) });
    const summary = summarizeCinemaFinance({ titleId: source.id || 'legacy-title', entries: [
        row('public-gross', 'THEATRICAL_GROSS', gross), row('theater', 'PRODUCER_RECEIPTS', theater),
        row('streaming', 'STREAMING_RECEIPTS', nonnegative(source.streamingRevenue ?? details?.streamingRevenue)),
        row('soundtrack', 'SOUNDTRACK_RECEIPTS', nonnegative(source.soundtrackRevenue)),
        row('production', 'PRODUCTION_COST', production), row('marketing', 'MARKETING_COST', marketing),
        row('booking', 'BOOKING_COST', booking), row('localization', 'LOCALIZATION_COST', localization),
        row('investors', 'INVESTOR_PAYOUT', nonnegative((source.investorPayouts ?? details?.investorPayouts)?.lifetimeInvestorPayout)),
        row('backend', 'TALENT_BACKEND', nonnegative(source.talentBackendPaid)), row('actor-pay', 'ACTOR_PAY', nonnegative(source.earnings)),
    ] });
    const funding = getProjectFundingEconomics(source, production);
    const reserve = nonnegative(source.reservedMarketingBudget ?? details?.reservedMarketingBudget);
    const refund = Math.min(reserve, nonnegative(source.returnedMarketingBudget ?? details?.returnedMarketingBudget));
    const recordedRisk = source.studioCashAtRisk ?? details?.hiddenStats?.studioCashAtRisk;
    // Greenlight debits the whole production + campaign reserve package after
    // investor/platform/fund financing. Reserve spend is already in that debit;
    // only its actual refund, or marketing paid outside that reserve, changes it.
    const packageWasDebited = reserve > 0 && hasActualMoney(recordedRisk);
    const risk = packageWasDebited
        ? Math.max(0, funding.studioCashAtRisk - refund) + Math.max(0, marketing - reserve)
        : funding.studioCashAtRisk + marketing;
    const riskCents = sumCents([dollarsToCinemaCents(risk), dollarsToCinemaCents(booking), dollarsToCinemaCents(localization)]);
    const costsEstimated = Boolean((source.talentParticipation || details?.talentParticipation)?.contracts.length && !hasActualMoney(source.talentBackendPaid));
    return { ...summary, receiptsEstimated, costsEstimated,
        studioReturnPercent: riskCents > 0 ? (summary.netStudioReceiptsCents - riskCents) / riskCents * 100 : null };
};

/** NPC treasuries use millions; cash moves retain ticket cents across coarse budget quotes. */
export const moveCinemaNpcCash=(balanceMillions:number,deltaMillions:number):number=>{
    const base=Math.round(balanceMillions*100_000_000),delta=Math.round(deltaMillions*100_000_000),next=base+delta;
    if(!Number.isSafeInteger(base)||!Number.isSafeInteger(delta)||!Number.isSafeInteger(next))throw new RangeError('NPC cinema cash overflow');
    return next/100_000_000;
};
