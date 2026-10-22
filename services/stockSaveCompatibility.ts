import type { Player, PortfolioItem, Stock } from '../types';
import { getStockMarketCapCeiling } from './stockLogic';

export interface StockSaveIssue {
    stockId: string;
    code: 'INVALID_CASH' | 'UNSAFE_SUPPLY' | 'INVALID_HOLDING' | 'MISSING_STOCK' | 'DUPLICATE_HOLDING' | 'INVALID_BASIS' | 'INVALID_OWNER_ALLOCATION';
    detail: string;
}

export class StockSaveRecoveryError extends Error {
    readonly code = 'STOCK_SAVE_RECOVERY_REQUIRED';
    readonly rawStockState: { stocks: unknown; portfolio: unknown; money: unknown };
    constructor(readonly issues: StockSaveIssue[], input: Pick<Partial<Player>, 'stocks' | 'portfolio' | 'money'>) {
        super('This career has an inconsistent stock register. Its cash, shares and original save have not been rewritten. Restore a verified previous save or import a verified backup to recover these holdings.');
        this.name = 'StockSaveRecoveryError';
        const copy = (value: any): any => Array.isArray(value) ? value.map(copy)
            : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])) : value;
        this.rawStockState = copy({ stocks: input.stocks, portfolio: input.portfolio, money: input.money });
    }
}

export const isStockSaveRecoveryError = (error: unknown): error is StockSaveRecoveryError => (
    error instanceof StockSaveRecoveryError
    || Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'STOCK_SAVE_RECOVERY_REQUIRED')
);

export const inspectStockSaveContainers = (
    input: Pick<Partial<Player>, 'stocks' | 'portfolio'>,
): StockSaveIssue[] => {
    const issues: StockSaveIssue[] = [];
    for (const field of ['stocks', 'portfolio'] as const) {
        const value = input[field];
        if (value === undefined || value === null) continue;
        if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
            issues.push({ stockId: '', code: field === 'stocks' ? 'UNSAFE_SUPPLY' : 'INVALID_HOLDING', detail: `The ${field} container cannot be discarded as empty during migration.` });
        }
    }
    return issues;
};

/** Inspect before normalizers can replace a contradictory register with invented units. */
export const inspectStockSaveCompatibility = (
    input: Pick<Partial<Player>, 'stocks' | 'portfolio' | 'money'>,
    normalizedStocks: Stock[],
): StockSaveIssue[] => {
    const issues: StockSaveIssue[] = [];
    if (input.money !== undefined && !Number.isFinite(Number(input.money))) issues.push({stockId: '', code: 'INVALID_CASH', detail: 'A nonfinite wallet balance needs verified recovery, not a new-account replacement.'});
    const stocks = new Map(normalizedStocks.map(stock => [stock.id, stock]));
    const rawStocks = new Map((Array.isArray(input.stocks) ? input.stocks : []).map(stock => [stock.id, stock]));
    for (const stock of rawStocks.values()) {
        if (stock.outstandingShares === undefined) continue;
        const raw = Number(stock.outstandingShares);
        const normalized = stocks.get(stock.id)?.outstandingShares;
        // Empty legacy defaults with no positive holder are recoverable via the catalog.
        const hasPositiveHolder = (input.portfolio || []).some(position => position.stockId === stock.id && Number(position.shares) > 0);
        if (Number.isSafeInteger(raw) && raw > 0 && raw / 100 > getStockMarketCapCeiling(stocks.get(stock.id) || stock)) {
            issues.push({ stockId: stock.id, code: 'UNSAFE_SUPPLY', detail: 'Even a minimum one-cent share quote exceeds the supported company value. Original register units need verified recovery.' });
        }
        if ((!Number.isSafeInteger(raw) || raw <= 0 || raw !== normalized) && (raw > 0 || hasPositiveHolder)) {
            issues.push({ stockId: stock.id, code: 'UNSAFE_SUPPLY', detail: 'Issued share units cannot be normalized without changing ownership.' });
        }
    }
    const seen = new Set<string>();
    for (const position of Array.isArray(input.portfolio) ? input.portfolio : []) {
        const id = String(position.stockId || '');
        const shares = Number(position.shares);
        if (seen.has(id)) issues.push({ stockId: id, code: 'DUPLICATE_HOLDING', detail: 'Multiple position records cannot be discarded or merged without ownership evidence.' });
        seen.add(id);
        if (!stocks.has(id) && shares > 0) issues.push({ stockId: id, code: 'MISSING_STOCK', detail: 'A positive holding has no corresponding stock registry.' });
        if (!Number.isSafeInteger(shares) || shares < 0 || shares > Number(stocks.get(id)?.outstandingShares || 0)) {
            // Negative/empty legacy junk carried no positive share entitlement.
            if (shares > 0 || !Number.isFinite(shares)) issues.push({ stockId: id, code: 'INVALID_HOLDING', detail: 'Held share units are unsafe or exceed issued shares.' });
        }
        for (const field of ['averageCost', 'totalInvested'] as const) {
            if (position[field] !== undefined && (!Number.isFinite(Number(position[field])) || Number(position[field]) < 0) && shares > 0) {
                issues.push({ stockId: id, code: 'INVALID_BASIS', detail: `Recorded ${field} cannot be reconstructed from today's quote.` });
            }
        }
        if (position.equityFunding !== undefined) {
            let allocated = 0;
            if (!Array.isArray(position.equityFunding)) issues.push({ stockId: id, code: 'INVALID_OWNER_ALLOCATION', detail: 'Corporate ownership metadata is not a share allocation.' });
            else for (const allocation of position.equityFunding) {
                if (!allocation || typeof allocation.ownerStudioId !== 'string' || !allocation.ownerStudioId.trim()
                    || !Number.isSafeInteger(allocation.shares) || allocation.shares < 0) {
                    issues.push({ stockId: id, code: 'INVALID_OWNER_ALLOCATION', detail: 'Corporate share owner or quantity is invalid.' });
                    continue;
                }
                allocated += allocation.shares;
            }
            if (!Number.isSafeInteger(allocated) || allocated > shares) issues.push({ stockId: id, code: 'INVALID_OWNER_ALLOCATION', detail: 'Corporate allocations exceed the total holding.' });
        }
    }
    return issues;
};

/** Preserve issued historical quantities and costs; quote repair never rewrites accounting. */
export const migrateStockPortfolio = (portfolio: Partial<PortfolioItem>[] | undefined, _stocks: Stock[]): PortfolioItem[] => (
    (Array.isArray(portfolio) ? portfolio : []).filter(position => Number(position.shares) > 0).map(position => ({
        ...position,
        stockId: String(position.stockId),
        shares: Number(position.shares),
        ...(position.averageCost !== undefined ? { averageCost: Number(position.averageCost) } : {}),
        ...(position.totalInvested !== undefined ? { totalInvested: Number(position.totalInvested) } : {}),
        ...(position.equityFunding ? { equityFunding: position.equityFunding.map(allocation => ({ ...allocation })) } : {}),
    }))
);

export const recordStockQuoteRepairs = (player: Player, stocks: Stock[]): Player['flags'] => {
    const byId = new Map(stocks.map(stock => [stock.id, stock]));
    const repairs = { ...(player.flags?.stockQuoteRepairs || {}) };
    for (const raw of player.stocks || []) {
        const normalized = byId.get(raw.id);
        if (!normalized) continue;
        const history = Array.isArray(raw.priceHistory) ? raw.priceHistory.map(String) : [];
        const normalizedHistory = normalized.priceHistory.map(String);
        if (Number(raw.price) === normalized.price && history.join('|') === normalizedHistory.join('|')) continue;
        if (!repairs[raw.id]) repairs[raw.id] = {
            version: 1,
            originalPrice: String(raw.price),
            originalHistory: history,
            repairedPrice: normalized.price,
            repairedYear: player.age,
            repairedWeek: player.currentWeek,
            reason: 'INVALID_OR_OUT_OF_BOUND_QUOTE',
        };
    }
    return { ...player.flags, ...(Object.keys(repairs).length ? { stockQuoteRepairs: repairs } : {}) };
};
