/**
 * #245 (plan §25.4 Q5): a premium plan can watch up to four weeks before general release. Zeesh (2026-11-04): "platform deliberately premium users ko ek
 * hafta peele de Diya to box office reflection ko hm log handle wise Karenga ki week first me premium user ka add car ke dikhange take issues Bach jay".
 * Opening-week views are the early weeks plus the first general week. They stay views: box office is tickets, which contracts and charts read.
 */
import type { Player } from '../types';

/** the most a plan can offer, and the most a grant can allow */
export const STREAMING_EARLY_ACCESS_MAX_WEEKS = 4;

export interface StreamingTitleOpening {
    generalWeek: number;
    /** the views before general release */
    early: number;
    first: number;
    total: number;
}

const generalReleaseWeek = (player: Player, projectId: string): number | null => {
    const platform = player.ownedStreamingPlatform;
    const commission = platform.originalCommissions.find(item => item.canonicalProjectId === projectId);
    if (commission?.releasePlan) return commission.releasePlan.premiereAtAbsoluteWeek;
    const launchAt = platform.launchCommit?.committedAtAbsoluteWeek;
    const entry = platform.launchSlate?.entries.find(item => item.projectId === projectId);
    return entry && launchAt !== undefined ? launchAt + entry.launchWeek - 1 : null;
};

/** null until its first general week has settled, or once that week has left the history */
export const getStreamingTitleOpening = (player: Player, projectId: string): StreamingTitleOpening | null => {
    const generalWeek = generalReleaseWeek(player, projectId);
    if (generalWeek === null) return null;
    const snapshot = player.ownedStreamingPlatform.weeklyHistory.find(item => item.absoluteWeek === generalWeek);
    if (!snapshot) return null;
    const first = snapshot.operations?.titlePerformance?.find(row => row.projectId === projectId)?.viewingAccounts || 0;
    const early = player.ownedStreamingPlatform.titleEarlyViews?.[projectId] || 0;
    return { generalWeek, early, first, total: early + first };
};

/** the week's close: the views a title had before its general release */
export const recordStreamingEarlyViews = (player: Player, absoluteWeek: number): Player => {
    const platform = player.ownedStreamingPlatform;
    const viewing = player.world?.worldStreamingViewing;
    if (platform?.lifecycle !== 'ACTIVE' || viewing?.lastProcessedAbsoluteWeek !== absoluteWeek) return player;
    let early: Record<string, number> | null = null;
    for (const row of viewing.platforms.PLAYER?.titlePerformance || []) {
        if (row.viewingAccounts <= 0) continue;
        const general = generalReleaseWeek(player, row.projectId);
        if (general === null || absoluteWeek >= general) continue;
        early = early || { ...platform.titleEarlyViews };
        early[row.projectId] = (early[row.projectId] || 0) + row.viewingAccounts;
    }
    return early ? { ...player, ownedStreamingPlatform: { ...platform, titleEarlyViews: early } } : player;
};

/** the views of the latest settled week, for a title not yet on the weekly report */
export const getStreamingTitleEarlyWeekViews = (player: Player, projectId: string): number | undefined => (
    player.world?.worldStreamingViewing?.platforms.PLAYER?.titlePerformance.find(row => row.projectId === projectId)?.viewingAccounts
);
