import type { Player, PortfolioItem } from '../types';
import { captureStudioEquityCashBasis } from './studioEquityCash';
import { settleStockCash } from './stockSettlement';

/** Unknown legacy history stays unknown; current quotes cannot supply an original cost. */
export const getRecordedStockBasis = (holding?: Pick<PortfolioItem, 'shares' | 'totalInvested' | 'averageCost'>): number | undefined => {
    if (!holding || holding.shares === 0) return 0;
    if (holding.totalInvested !== undefined) return holding.totalInvested;
    return holding.averageCost === undefined ? undefined : holding.shares * holding.averageCost;
};

export const getStockHoldingAllocations = (holding: PortfolioItem): {
    personalShares: number;
    corporate: Array<{ ownerStudioId: string; shares: number }>;
} => {
    const total = Math.max(0, Math.floor(Number.isFinite(holding.shares) ? holding.shares : 0));
    let remaining = total;
    const corporate = new Map<string, number>();
    for (const row of holding.equityFunding || []) {
        if (!row || typeof row.ownerStudioId !== 'string' || !row.ownerStudioId || !Number.isFinite(row.shares)) continue;
        const shares = Math.min(remaining, Math.max(0, Math.floor(row.shares)));
        if (!shares) continue;
        corporate.set(row.ownerStudioId, (corporate.get(row.ownerStudioId) || 0) + shares);
        remaining -= shares;
    }
    return { personalShares: remaining, corporate: [...corporate].map(([ownerStudioId, shares]) => ({ ownerStudioId, shares })) };
};

/** Integral share splits conserve both personal and company ownership, including small mixed sells. */
export const splitStockReceipt = (holding: PortfolioItem, shares: number, amount: number) => {
    const allocation = getStockHoldingAllocations(holding);
    if (!Number.isSafeInteger(holding.shares) || !Number.isSafeInteger(shares) || shares < 0 || shares > holding.shares
        || !Number.isFinite(amount) || amount < 0) throw new RangeError('INVALID_STOCK_RECEIPT');
    const total = BigInt(Math.max(1, holding.shares));
    const count = BigInt(shares);
    const groups = [{ ownerStudioId: '', shares: allocation.personalShares }, ...allocation.corporate];
    const orderRemainders = <T extends { remainder: bigint }>(rows: T[]) => [...rows].sort((a, b) => a.remainder > b.remainder ? -1 : a.remainder < b.remainder ? 1 : 0);
    const sold = groups.map(group => ({ ...group, sold: Number(count * BigInt(group.shares) / total), remainder: count * BigInt(group.shares) % total }));
    let left = shares - sold.reduce((sum, group) => sum + group.sold, 0);
    for (const group of orderRemainders(sold)) {
        if (left > 0 && group.sold < group.shares) { group.sold++; left--; }
    }
    const units = 100;
    const amountUnits = Math.round(amount * units);
    if (!Number.isSafeInteger(amountUnits)) throw new RangeError('UNREPRESENTABLE_STOCK_RECEIPT');
    const denominator = count > 0n ? count : 1n;
    const money = BigInt(amountUnits);
    const receipts = sold.map(group => ({ ownerStudioId: group.ownerStudioId, soldShares: group.sold,
        proceeds: Number(money * BigInt(group.sold) / denominator), remainder: money * BigInt(group.sold) % denominator }));
    let remainingMoney = amountUnits - receipts.reduce((sum, row) => sum + row.proceeds, 0);
    for (const row of orderRemainders(receipts)) {
        if (remainingMoney > 0 && row.soldShares > 0) { row.proceeds++; remainingMoney--; }
    }
    return {
        receipts: receipts.map(({ remainder: _remainder, ...row }) => ({ ...row, proceeds: row.proceeds / units })),
        remainingFunding: sold.filter(group => group.ownerStudioId && group.shares > group.sold)
            .map(group => ({ ownerStudioId: group.ownerStudioId, shares: group.shares - group.sold })),
    };
};

export const canCreditCorporateStockReceipt = (player: Player, ownerStudioId: string, amount: number, kind: 'SALE' | 'DIVIDEND'): boolean => {
    const business = player.businesses.find(item => item.id === ownerStudioId && item.type === 'PRODUCTION_HOUSE');
    if (!business?.studioState || !settleStockCash(business.balance, amount).success) return false;
    return kind !== 'DIVIDEND' || [business.stats.weeklyRevenue, business.stats.weeklyProfit, business.stats.lifetimeRevenue]
        .every(value => Number.isFinite(value) && Number.isSafeInteger(Math.round((value + amount) * 100)) && Math.round(((value + amount) - value) * 100) === Math.round(amount * 100));
};

/**
 * 2026-11-11 (1.0.27 hotfix, "Week N was not applied"): the weekly company dividend must never stop a week.
 * It takes the exact credit below whenever that works, so a normal career is unchanged. When it cannot (a
 * company balance or statement past safe cents, or shares still booked to a company that no longer exists),
 * the company gets a plain rounded addition, or, with no company left, its owner, the player. Anything still
 * impossible skips that one dividend instead of throwing.
 */
export const creditCorporateDividendSafely = (player: Player, ownerStudioId: string, amount: number, stockId: string): Player => {
    if (!Number.isFinite(amount) || amount <= 0) return player;
    try {
        if (canCreditCorporateStockReceipt(player, ownerStudioId, amount, 'DIVIDEND')) {
            return creditCorporateStockReceipt(player, ownerStudioId, amount, 'DIVIDEND', stockId);
        }
    } catch { /* the plain addition below */ }
    try {
        const cents = (value: number) => Math.round(value * 100) / 100;
        const plus = (value: number) => (Number.isFinite(value) ? cents(value + amount) : value);
        const owner = player.businesses.find(item => item.id === ownerStudioId);
        if (owner && Number.isFinite(owner.balance)) {
            return {
                ...player,
                businesses: player.businesses.map(business => (business.id !== ownerStudioId ? business : {
                    ...business,
                    balance: cents(business.balance + amount),
                    ...(business.stats ? { stats: { ...business.stats,
                        weeklyRevenue: plus(business.stats.weeklyRevenue),
                        weeklyProfit: plus(business.stats.weeklyProfit),
                        lifetimeRevenue: plus(business.stats.lifetimeRevenue) } } : {}),
                })),
            };
        }
        if (!owner && Number.isFinite(player.money)) return { ...player, money: cents(player.money + amount) };
    } catch { /* skipped below */ }
    return player;
};

/** Company investments pay their company treasury; an impossible credit aborts the caller's atomic action. */
export const creditCorporateStockReceipt = (player: Player, ownerStudioId: string, amount: number, kind: 'SALE' | 'DIVIDEND', stockId: string): Player => {
    if (amount <= 0) return player;
    if (!canCreditCorporateStockReceipt(player, ownerStudioId, amount, kind)) throw new RangeError('UNREPRESENTABLE_CORPORATE_STOCK_RECEIPT');
    return {
        ...player,
        businesses: player.businesses.map(business => {
            if (business.id !== ownerStudioId) return business;
            const captured = captureStudioEquityCashBasis(business);
            const balance = settleStockCash(captured.balance, amount);
            if (!balance.success) throw new RangeError('UNREPRESENTABLE_AMOUNT');
            return {
                ...captured, balance: balance.balance,
                ...(kind === 'DIVIDEND' ? { stats: { ...captured.stats,
                    weeklyRevenue: captured.stats.weeklyRevenue + amount,
                    weeklyProfit: captured.stats.weeklyProfit + amount,
                    lifetimeRevenue: captured.stats.lifetimeRevenue + amount } } : {}),
                studioState: { ...captured.studioState!, financeLedger: [{
                    id: `corporate_stock_${kind}_${stockId}_${player.age}_${player.currentWeek}_${Date.now()}`,
                    week: player.currentWeek, year: player.age, amount,
                    type: kind === 'DIVIDEND' ? 'INVESTMENT_RETURN' as const : 'CAPITAL_INJECTION' as const,
                    label: kind === 'DIVIDEND' ? `${stockId} company dividend` : `${stockId} company investment sale`,
                }, ...(captured.studioState?.financeLedger || [])] },
            };
        }),
    };
};
