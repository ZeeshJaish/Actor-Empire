/** Preserve the stored balance and reject stock settlements Number cannot express in cents.
    2026-11-11: a credit (a dividend, a sale) may land on a balance in debt and leave it in debt; only a
    debit must not overdraw. It refused any balance below zero, so a career in debt could not sell shares,
    and its first dividend week (week 13) failed on every retry. */
export const settleStockCash = (balance: number, delta: number):
    { success: true; balance: number } | { success: false; reason: 'UNREPRESENTABLE_AMOUNT' } => {
    if (!Number.isFinite(balance) || !Number.isFinite(delta) || (balance < 0 && delta < 0)) return { success: false, reason: 'UNREPRESENTABLE_AMOUNT' };
    if (delta === 0) return { success: true, balance };
    const cents = Math.round(delta * 100);
    const next = balance + cents / 100;
    if (!Number.isSafeInteger(Math.round(balance * 100)) || !Number.isSafeInteger(cents)
        || !Number.isSafeInteger(Math.round(next * 100)) || (delta < 0 && next < 0)
        || Math.round((next - balance) * 100) !== cents) return { success: false, reason: 'UNREPRESENTABLE_AMOUNT' };
    return { success: true, balance: next };
};

export const roundStockCash = (amount: number): number => Math.round(amount * 100) / 100;
