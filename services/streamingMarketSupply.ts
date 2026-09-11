import type { Player } from '../types';
import type { StreamingCatalogTitle } from './streamingCatalog';
import { hashDeterministicSeed } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';

export interface StreamingMarketSupplyProfile {
    absoluteWeek: number;
    cycle: number;
    cycleStartAbsoluteWeek: number;
    foundingBoost: boolean;
    directLimit: 12;
    collectionLimit: 4 | 6;
    collectionMaximumSize: 24 | 50;
    auctionLimit: 2 | 3;
}

export const getStreamingMarketCycle = (absoluteWeek: number): number => (
    Math.max(0, Math.floor(absoluteWeek / 3))
);

export const getStreamingMarketSupplyProfile = (player: Player): StreamingMarketSupplyProfile => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const incorporationWeek = Number(player.ownedStreamingPlatform?.foundingProfile?.incorporatedAtAbsoluteWeek);
    const weeksSinceIncorporation = Number.isFinite(incorporationWeek)
        ? Math.max(0, absoluteWeek - incorporationWeek)
        : Number.POSITIVE_INFINITY;
    const foundingBoost = player.ownedStreamingPlatform?.lifecycle === 'FOUNDING'
        && weeksSinceIncorporation < 12;
    const cycle = getStreamingMarketCycle(absoluteWeek);
    return {
        absoluteWeek,
        cycle,
        cycleStartAbsoluteWeek: cycle * 3,
        foundingBoost,
        directLimit: 12,
        collectionLimit: foundingBoost ? 6 : 4,
        collectionMaximumSize: foundingBoost ? 50 : 24,
        auctionLimit: foundingBoost ? 3 : 2,
    };
};

const headlineScore = (title: StreamingCatalogTitle): number => (
    Math.max(0, title.rating || 0) * 10_000
    + Math.log10(Math.max(1, title.gross || 0)) * 1_000
    + Math.max(0, title.releaseYear || 0)
);

const rotationScore = (player: Player, title: StreamingCatalogTitle, cycle: number): number => (
    hashDeterministicSeed([
        player.ownedStreamingPlatform?.simulationSeed || player.id,
        'content-market',
        cycle,
        title.id,
        title.projectType,
        title.genre,
        title.studioId,
    ].join(':'))
);

/**
 * Selects the small discovery shelf from a complete canonical pool. The
 * function is pure: the same player seed and three-week cycle always return
 * the same ordering, while three commercial headliners provide continuity.
 */
export const selectStreamingMarketTitles = (
    player: Player,
    candidates: StreamingCatalogTitle[],
    limit: number = getStreamingMarketSupplyProfile(player).directLimit,
): StreamingCatalogTitle[] => {
    const safeLimit = Math.max(0, Math.floor(limit));
    if (!safeLimit || !candidates.length) return [];
    const profile = getStreamingMarketSupplyProfile(player);
    const unique = Array.from(new Map(candidates.map(title => [title.id, title])).values());
    const headlineCount = Math.min(3, safeLimit, unique.length);
    const headliners = unique.slice().sort((left, right) => (
        headlineScore(right) - headlineScore(left)
        || left.id.localeCompare(right.id)
    )).slice(0, headlineCount);
    const headlineIds = new Set(headliners.map(title => title.id));
    const groups = new Map<string, StreamingCatalogTitle[]>();
    unique.filter(title => !headlineIds.has(title.id)).forEach(title => {
        const key = `${title.projectType}:${title.genre}:${title.studioId}`;
        groups.set(key, [...(groups.get(key) || []), title]);
    });
    const buckets = [...groups.entries()].map(([key, titles]) => ({
        key,
        titles: titles.slice().sort((left, right) => (
            rotationScore(player, right, profile.cycle) - rotationScore(player, left, profile.cycle)
            || left.id.localeCompare(right.id)
        )),
    })).sort((left, right) => (
        hashDeterministicSeed(`${player.ownedStreamingPlatform?.simulationSeed || player.id}:${profile.cycle}:bucket:${right.key}`)
        - hashDeterministicSeed(`${player.ownedStreamingPlatform?.simulationSeed || player.id}:${profile.cycle}:bucket:${left.key}`)
        || left.key.localeCompare(right.key)
    ));
    const rotating: StreamingCatalogTitle[] = [];
    while (rotating.length < safeLimit - headliners.length && buckets.some(bucket => bucket.titles.length)) {
        for (const bucket of buckets) {
            const next = bucket.titles.shift();
            if (next) rotating.push(next);
            if (rotating.length >= safeLimit - headliners.length) break;
        }
    }
    return [...headliners, ...rotating].slice(0, safeLimit);
};
