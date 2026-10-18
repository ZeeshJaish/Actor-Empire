import type { Player, PortfolioItem } from '../types';
import { captureStudioEquityCashBasis } from './studioEquityCash';

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
    const total = Math.max(1, Math.floor(holding.shares));
    const groups = [{ ownerStudioId: '', shares: allocation.personalShares }, ...allocation.corporate];
    const sold = groups.map(group => ({ ...group, sold: Math.floor(shares * group.shares / total), remainder: shares * group.shares / total % 1 }));
    let left = shares - sold.reduce((sum, group) => sum + group.sold, 0);
    for (const group of [...sold].sort((a, b) => b.remainder - a.remainder)) {
        if (left > 0 && group.sold < group.shares) { group.sold++; left--; }
    }
    const receipts = sold.map(group => ({ ownerStudioId: group.ownerStudioId, soldShares: group.sold,
        proceeds: Math.floor(amount * group.sold / Math.max(1, shares)),
        remainder: amount * group.sold / Math.max(1, shares) % 1 }));
    let remainingMoney = Math.max(0, Math.floor(amount)) - receipts.reduce((sum, row) => sum + row.proceeds, 0);
    for (const row of [...receipts].sort((a, b) => b.remainder - a.remainder)) {
        if (remainingMoney > 0 && row.soldShares > 0) { row.proceeds++; remainingMoney--; }
    }
    return {
        receipts,
        remainingFunding: sold.filter(group => group.ownerStudioId && group.shares > group.sold)
            .map(group => ({ ownerStudioId: group.ownerStudioId, shares: group.shares - group.sold })),
    };
};

/** Company investments pay their company treasury; missing companies never fall back to personal cash. */
export const creditCorporateStockReceipt = (player: Player, ownerStudioId: string, amount: number, kind: 'SALE' | 'DIVIDEND', stockId: string): Player => ({
    ...player,
    businesses: player.businesses.map(business => {
        if (business.id !== ownerStudioId || business.type !== 'PRODUCTION_HOUSE' || !business.studioState || amount <= 0) return business;
        const captured = captureStudioEquityCashBasis(business);
        return {
            ...captured, balance: captured.balance + amount,
            ...(kind === 'DIVIDEND' ? { stats: { ...captured.stats,
                weeklyRevenue: captured.stats.weeklyRevenue + amount,
                weeklyProfit: captured.stats.weeklyProfit + amount,
                lifetimeRevenue: captured.stats.lifetimeRevenue + amount } } : {}),
            studioState: { ...captured.studioState!, financeLedger: [{
                id: `corporate_stock_${kind}_${stockId}_${player.age}_${player.currentWeek}_${Date.now()}`,
                week: player.currentWeek, year: player.age, amount,
                type: kind === 'DIVIDEND' ? 'INVESTMENT_RETURN' as const : 'CAPITAL_INJECTION' as const,
                label: kind === 'DIVIDEND' ? `${stockId} company dividend` : `${stockId} company investment sale`,
            }, ...(captured.studioState?.financeLedger || [])].slice(0, 200) },
        };
    }),
});
