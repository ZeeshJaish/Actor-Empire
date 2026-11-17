import type {
    OwnedStreamingPlatformState,
    OwnedStreamingTitleWeekPerformance,
    Player,
    WorldStreamingViewingTitleState,
} from '../types';

/** One title's latest measured week. `detailed`: the service's own weekly record, with its cost
    split; otherwise the viewing engine's row for the same week (viewers, completion, revenue). */
export interface StreamingTitleWeekRead {
    row: OwnedStreamingTitleWeekPerformance;
    detailed: boolean;
}

const fromViewingEngine = (title: WorldStreamingViewingTitleState, absoluteWeek: number, programWeek: number): OwnedStreamingTitleWeekPerformance => ({
    id: `viewing:${title.projectId}:${absoluteWeek}`,
    projectId: title.projectId,
    title: title.title,
    source: title.source,
    projectType: title.projectType,
    genre: title.genre,
    absoluteWeek,
    programWeek,
    weeksAvailable: title.weeksAvailable,
    viewingAccounts: title.viewingAccounts,
    estimatedViewers: title.estimatedViewers,
    starts: title.starts,
    hoursViewed: title.hoursViewed,
    completionRate: title.completionRate,
    repeatViewingRate: title.repeatViewingRate,
    abandonmentRate: title.abandonmentRate,
    paidViewingAccounts: title.accessMix.paidViewingAccounts,
    sharedViewingAccounts: title.accessMix.sharedViewingAccounts,
    piracyViewingAccounts: title.accessMix.piracyViewingAccounts,
    topCountryId: title.topCountryId,
    acquisitionAttributedAccounts: title.acquisitionAttributedAccounts,
    retentionAttributedAccounts: title.retentionAttributedAccounts,
    satisfactionScore: title.satisfactionScore,
    discoveryMix: { ...title.discoveryMix },
    attributedSubscriptionRevenue: title.revenue.attributedSubscriptionRevenue,
    advertisingRevenue: title.revenue.advertisingRevenue,
    premiumRevenue: title.revenue.premiumRevenue,
    rentalRevenue: title.revenue.rentalRevenue,
    purchaseRevenue: title.revenue.purchaseRevenue,
    dayPassRevenue: title.revenue.dayPassRevenue,
    incrementalRevenue: title.revenue.totalIncrementalRevenue,
    /* the week's cost split is kept only in the service's own record (detailed: false) */
    allocatedCashCost: 0,
    allocatedContentAmortization: 0,
    cashContribution: 0,
    accountingContribution: 0,
    playbackSuccessRate: 0,
});

/* B16 (2026-11-15): the service's weekly record keeps its 24 most-watched titles (to keep saves and every
   platform read small). On a big catalogue every other title read "0 viewers" and "Scheduled" on its page
   while its row said LIVE, though the viewing engine had counted its viewers: on a 562-title test service,
   534 watched titles (about 81K viewers each) showed 0. The engine's own rows for the same week, kept in
   the world's viewing state for every title, fill in the rest. Read-only; nothing is added to the save. */
export const getLatestStreamingTitleWeekRows = (
    player: Player,
    platform: OwnedStreamingPlatformState = player.ownedStreamingPlatform,
): Map<string, StreamingTitleWeekRead> => {
    const latest = platform?.weeklyHistory?.at(-1);
    const rows = new Map<string, StreamingTitleWeekRead>();
    (latest?.operations?.titlePerformance || []).forEach(row => {
        if (!rows.has(row.projectId)) rows.set(row.projectId, { row, detailed: true });
    });
    const viewing = player?.world?.worldStreamingViewing;
    const engine = viewing?.platforms?.PLAYER?.titlePerformance;
    /* only the same week: the engine's rows are replaced each week, the record is the latest week */
    if (!latest || !engine?.length || viewing?.lastProcessedAbsoluteWeek !== latest.absoluteWeek) return rows;
    const programWeek = latest.operations?.programWeek ?? 0;
    engine.forEach(title => {
        if (!rows.has(title.projectId)) rows.set(title.projectId, { row: fromViewingEngine(title, latest.absoluteWeek, programWeek), detailed: false });
    });
    return rows;
};
