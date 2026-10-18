import type { Business, Player, StudioFinanceEntry } from '../types';
// Keep this clock calculation local: inheritance imports this module to rebase studio evidence.
const getAbsoluteWeek = (age: number, week: number): number => (Math.max(1, age) - 1) * 52 + Math.min(51, Math.max(0, week - 1));

const MIN_HOLDING_WEEKS = 13;
const EARNINGS_WINDOW_WEEKS = 52;
type EarningsWeek = { absoluteWeek: number; revenue: number; profit: number; ledgerEntryIds?: string[] };
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const validAbsoluteWeek = (value: unknown): value is number => finite(value) && value >= 0;
const validYear = (value: unknown): value is number => finite(value) && Number.isInteger(value) && value >= 1;
const validWeek = (value: unknown): value is number => finite(value) && Number.isInteger(value) && value >= 1 && value <= 52;
const isAcquiredStudio = (studio: Business): boolean => studio.studioState?.acquisitionOrigin === 'STUDIO_ACQUISITION'
    || studio.config?.productionType === 'Acquired Studio';

const getAcquiredAbsoluteWeek = (studio: Business): number | undefined => {
    const state = studio.studioState;
    if (validAbsoluteWeek(state?.acquiredAbsoluteWeek)) return Math.floor(state.acquiredAbsoluteWeek);
    if (validYear(state?.acquiredYear) && validWeek(state?.acquiredWeek)) return getAbsoluteWeek(state.acquiredYear, state.acquiredWeek);
    return undefined;
};

/** Absolute stamps survive rollover, renovation and renaming. Undated legacy studios are grandfathered. */
export const getStudioSaleHoldingPeriod = (player: Player, studio: Business): {
    eligible: boolean; elapsedWeeks: number; remainingWeeks: number;
} => {
    const acquired = isAcquiredStudio(studio);
    const started = acquired ? getAcquiredAbsoluteWeek(studio)
        : validAbsoluteWeek(studio.foundedAbsoluteWeek) ? Math.floor(studio.foundedAbsoluteWeek)
            : validYear(studio.foundedYear) && validWeek(studio.foundedWeek) ? getAbsoluteWeek(studio.foundedYear, studio.foundedWeek) : undefined;
    // A week-of-year alone cannot distinguish a recent launch from one years ago.
    // Short rolling profit history is not proof of a recent founding either.
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    // Pre-patch heir saves can still carry dates from an older parent's age clock.
    const elapsedWeeks = started === undefined || started > now ? MIN_HOLDING_WEEKS
        : Math.max(0, now - started);
    const remainingWeeks = Math.max(0, MIN_HOLDING_WEEKS - elapsedWeeks);
    return { eligible: remainingWeeks === 0, elapsedWeeks, remainingWeeks };
};

const normalizeRows = (rows: EarningsWeek[], now: number): EarningsWeek[] => {
    const byWeek = new Map<number, EarningsWeek>();
    for (const row of rows) {
        if (!row || !validAbsoluteWeek(row.absoluteWeek) || !finite(row.revenue) || !finite(row.profit)) continue;
        const absoluteWeek = Math.floor(row.absoluteWeek);
        if (absoluteWeek > now || absoluteWeek <= now - EARNINGS_WINDOW_WEEKS || byWeek.has(absoluteWeek)) continue;
        byWeek.set(absoluteWeek, {
            absoluteWeek, revenue: Math.max(0, row.revenue), profit: row.profit,
            ...(Array.isArray(row.ledgerEntryIds) ? { ledgerEntryIds: [...new Set(row.ledgerEntryIds.filter(id => typeof id === 'string'))] } : {}),
        });
    }
    return [...byWeek.values()].sort((a, b) => b.absoluteWeek - a.absoluteWeek);
};

const RECEIPT_TYPES = new Set<StudioFinanceEntry['type']>(['THEATRICAL', 'STREAMING_DEAL', 'STREAMING_ROYALTY', 'SOUNDTRACK', 'UNIVERSE']);

/** Legacy fallback uses recorded evidence only. Capital/funding and synthetic acquisition forecasts are excluded. */
const getLegacyRows = (player: Pick<Player, 'age' | 'currentWeek'>, studio: Business): EarningsWeek[] => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const byWeek = new Map<number, EarningsWeek>();
    (studio.history || []).slice(0, EARNINGS_WINDOW_WEEKS).forEach((row, index) => {
        if (!row || !finite(row.profit)) return;
        if (isAcquiredStudio(studio) && row.year === undefined
            && row.week === studio.studioState.acquiredWeek) return;
        const absoluteWeek = validYear(row.year) && validWeek(row.week)
            ? getAbsoluteWeek(row.year, row.week) : now - index;
        if (!byWeek.has(absoluteWeek)) byWeek.set(absoluteWeek, { absoluteWeek, revenue: 0, profit: row.profit });
    });
    return normalizeRows([...byWeek.values()], now);
};

const PAYOUT_TYPES = new Set<StudioFinanceEntry['type']>(['INVESTOR_PAYOUT', 'TALENT_BACKEND']);
const isEarningsEntry = (entry: StudioFinanceEntry): boolean => !!entry && typeof entry.id === 'string' && !!entry.id
    && finite(entry.amount) && validYear(entry.year) && validWeek(entry.week)
    && ((RECEIPT_TYPES.has(entry.type) && entry.amount > 0) || (PAYOUT_TYPES.has(entry.type) && entry.amount < 0));

// Older release writers store the net receipt and an informational investor-split row.
// Package and signed-contract ledgers store gross receipts, so their payouts remain real deductions.
const isAlreadyNettedInvestorPayout = (entry: StudioFinanceEntry, ledger: StudioFinanceEntry[]): boolean => {
    if (entry.type !== 'INVESTOR_PAYOUT' || !entry.projectId) return false;
    const channel = entry.id.includes('_deal_') || /streaming deal payout/i.test(entry.label) ? 'STREAMING_DEAL'
        : entry.id.includes('_theatrical_') || /investor theatrical payout/i.test(entry.label) ? 'THEATRICAL'
            : entry.id.includes('_soundtrack_') || /investor soundtrack payout/i.test(entry.label) ? 'SOUNDTRACK' : undefined;
    return !!channel && ledger.some(receipt => receipt.type === channel && receipt.projectId === entry.projectId
        && receipt.year === entry.year && receipt.week === entry.week && receipt.amount > 0
        && /after investor split/i.test(receipt.label));
};

/** Include between-turn signing receipts now, even before the next weekly statement resets its scalar stats. */
const getRows = (player: Pick<Player, 'age' | 'currentWeek'>, studio: Business): EarningsWeek[] => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const history = studio.studioState?.saleEarningsHistory;
    const rows = Array.isArray(history) ? normalizeRows(history, now) : getLegacyRows(player, studio);
    const byWeek = new Map(rows.map(row => [row.absoluteWeek, row]));
    const consumed = new Set(rows.flatMap(row => row.ledgerEntryIds || []));
    const ledger = studio.studioState?.financeLedger || [];
    for (const entry of ledger) {
        if (!isEarningsEntry(entry) || consumed.has(entry.id)) continue;
        const absoluteWeek = getAbsoluteWeek(entry.year, entry.week);
        if (absoluteWeek > now || absoluteWeek <= now - EARNINGS_WINDOW_WEEKS) continue;
        const prior = byWeek.get(absoluteWeek) || { absoluteWeek, revenue: 0, profit: 0 };
        byWeek.set(absoluteWeek, {
            absoluteWeek,
            revenue: prior.revenue + (entry.amount > 0 ? entry.amount : 0),
            profit: prior.profit + (isAlreadyNettedInvestorPayout(entry, ledger) ? 0 : entry.amount),
            ledgerEntryIds: [...(prior.ledgerEntryIds || []), entry.id],
        });
        consumed.add(entry.id);
    }
    return normalizeRows([...byWeek.values()], now);
};

/** Sum the actual observed trailing 52 completed weeks. A young studio is never extrapolated to a full year. */
export const getStudioSaleEarnings = (player: Player, studio: Business): {
    revenue: number; profit: number; trackedWeeks: number;
} => {
    const rows = getRows(player, studio);
    return {
        revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
        profit: rows.reduce((sum, row) => sum + row.profit, 0),
        trackedWeeks: rows.length,
    };
};

/** Capture only after every release/platform receipt has posted, once per completed simulation week. */
export const recordStudioSaleEarnings = (player: Player, completedAbsoluteWeek: number, openingPlayer?: Player): Player => {
    const openingById = openingPlayer ? new Map((openingPlayer.businesses || []).map(studio => [studio.id, studio])) : undefined;
    return {
        ...player,
        businesses: (player.businesses || []).map(studio => {
            if (studio.type !== 'PRODUCTION_HOUSE' || !studio.studioState) return studio;
            const previous = openingById?.get(studio.id);
            // Opening evidence contains UI receipts posted after the previous completed week.
            // End-of-week stats contain this simulation's receipts, so never add those ledger amounts twice.
            const existing = previous && openingPlayer ? getRows(openingPlayer, previous)
                : getRows(player, studio);
            const consumed = new Set(existing.flatMap(row => row.ledgerEntryIds || []));
            const engineReceiptIds = (studio.studioState.financeLedger || [])
                .filter(entry => isEarningsEntry(entry) && !consumed.has(entry.id))
                .map(entry => entry.id);
            // Businesses acquired by end-of-week automation have forecast stats, not receipts earned this week.
            const justAcquired = (getAcquiredAbsoluteWeek(studio) ?? -1) >= completedAbsoluteWeek;
            const newlyAdded = !!openingById && !previous;
            const rows = justAcquired || newlyAdded || existing.some(row => row.absoluteWeek === completedAbsoluteWeek)
                ? existing : [{
                    absoluteWeek: completedAbsoluteWeek,
                    revenue: finite(studio.stats?.weeklyRevenue) ? Math.max(0, studio.stats.weeklyRevenue) : 0,
                    profit: finite(studio.stats?.weeklyProfit) ? studio.stats.weeklyProfit : 0,
                    ledgerEntryIds: [...new Set(engineReceiptIds)],
                }, ...existing];
            return { ...studio, studioState: { ...studio.studioState, saleEarningsHistory: normalizeRows(rows, completedAbsoluteWeek) } };
        }),
    };
};

/** Character succession changes the age-based clock, not how long an inherited studio has existed. */
export const rebaseStudioSaleHistoryForInheritance = (
    businesses: Business[], sourceAbsoluteWeek: number, targetAbsoluteWeek: number,
): Business[] => {
    const shift = targetAbsoluteWeek - sourceAbsoluteWeek;
    const sourceClock = { age: Math.floor(sourceAbsoluteWeek / 52) + 1, currentWeek: (sourceAbsoluteWeek % 52) + 1 };
    return businesses.map(studio => {
        if (studio.type !== 'PRODUCTION_HOUSE' || !studio.studioState) return studio;
        const founded = validAbsoluteWeek(studio.foundedAbsoluteWeek) ? studio.foundedAbsoluteWeek
            : validYear(studio.foundedYear) && validWeek(studio.foundedWeek) ? getAbsoluteWeek(studio.foundedYear, studio.foundedWeek) : undefined;
        const acquired = getAcquiredAbsoluteWeek(studio);
        return {
            ...studio,
            ...(founded !== undefined ? { foundedAbsoluteWeek: Math.max(0, founded + shift) } : {}),
            studioState: {
                ...studio.studioState,
                ...(acquired !== undefined ? { acquiredAbsoluteWeek: Math.max(0, acquired + shift) } : {}),
                saleEarningsHistory: getRows(sourceClock, studio).map(row => ({ ...row, absoluteWeek: Math.max(0, row.absoluteWeek + shift) })),
            },
        };
    });
};
