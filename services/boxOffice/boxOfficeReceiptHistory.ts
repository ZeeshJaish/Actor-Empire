/** Preserve legacy receipt gaps independently from actual collected money.
 * New weeks can then append real receipts without disguising older gaps as zero.
 */
export interface CinemaReceiptHistorySource {
    gross?: number;
    totalGross?: number;
    totalStudioReceipts?: number;
    weeklyStudioReceipts?: number[];
    unrecordedTheatricalGross?: number;
}
const validMoney = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export const normalizeCinemaReceiptHistory = (source: CinemaReceiptHistorySource): {
    totalStudioReceipts: number; unrecordedTheatricalGross: number;
} => {
    const gross = source.gross ?? source.totalGross ?? 0;
    const hasWeekly = Array.isArray(source.weeklyStudioReceipts) && source.weeklyStudioReceipts.length > 0;
    const actual = validMoney(source.totalStudioReceipts) ? source.totalStudioReceipts
        : hasWeekly ? source.weeklyStudioReceipts!.reduce((sum, value) => sum + (validMoney(value) ? value : 0), 0) : 0;
    const missingGross = validMoney(source.unrecordedTheatricalGross) ? source.unrecordedTheatricalGross
        : !validMoney(source.totalStudioReceipts) && !hasWeekly && validMoney(gross) ? gross : 0;
    return { totalStudioReceipts: actual, unrecordedTheatricalGross: Math.min(validMoney(gross) ? gross : 0, missingGross) };
};
