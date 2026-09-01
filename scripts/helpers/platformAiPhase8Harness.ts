import type { NewsItem, Player, StreamingEcosystemEvent, WorldState } from '../../types';
import { processStreamingIndustryWorldWeek } from '../../services/platformAi';
import { compactPlayerForPersistence } from '../../services/saveCompaction';

export const PHASE8_HORIZON_WEEKS = [520, 1_300, 2_600] as const;

export interface PlatformAiPhase8StreamingWeekResult {
    player: Player;
    world: WorldState;
    news: NewsItem[];
    logs: string[];
    absoluteWeek: number;
}

export interface Phase8EcosystemEventCounts {
    launches: number;
    promotions: number;
    distress: number;
    recoveries: number;
    closures: number;
}

export const countPhase8EcosystemEvents = (
    events: ReadonlyArray<Pick<StreamingEcosystemEvent, 'type'>>,
): Phase8EcosystemEventCounts => events.reduce<Phase8EcosystemEventCounts>((counts, event) => {
    if (event.type === 'LAUNCH') counts.launches += 1;
    if (event.type === 'PROMOTED') counts.promotions += 1;
    if (event.type === 'DISTRESS') counts.distress += 1;
    if (event.type === 'RECOVERY') counts.recoveries += 1;
    if (event.type === 'CLOSED') counts.closures += 1;
    return counts;
}, { launches: 0, promotions: 0, distress: 0, recoveries: 0, closures: 0 });

const playerAtAbsoluteWeek = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): Player => {
    const safeAbsoluteWeek = Math.max(0, Math.round(absoluteWeek));
    return {
        ...player,
        age: Math.floor(safeAbsoluteWeek / 52) + 1,
        currentWeek: safeAbsoluteWeek % 52 + 1,
        world,
    };
};

const mergeBoundedNews = (fresh: NewsItem[], existing: NewsItem[]): NewsItem[] => {
    const seenIds = new Set<string>();
    const merged: NewsItem[] = [];
    for (const item of [...fresh, ...existing]) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        merged.push(item);
        if (merged.length >= 50) break;
    }
    return merged;
};

/**
 * Runs the real Phase 7 rival-streaming seam while retaining the bounded News
 * envelope used by the live weekly loop. This contains no simulation formula.
 */
export const processPlatformAiPhase8StreamingWeek = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): PlatformAiPhase8StreamingWeekResult => {
    const datedPlayer = playerAtAbsoluteWeek(player, world, absoluteWeek);
    const result = processStreamingIndustryWorldWeek(datedPlayer, world, absoluteWeek);
    const nextPlayer: Player = {
        ...datedPlayer,
        world: result.world,
        news: mergeBoundedNews(result.news, datedPlayer.news || []),
    };
    return {
        player: nextPlayer,
        world: result.world,
        news: result.news,
        logs: result.logs,
        absoluteWeek,
    };
};

export const measurePhase8SaveBytes = (player: Player): number => (
    Buffer.byteLength(JSON.stringify(compactPlayerForPersistence(player)), 'utf8')
);
