import type { Player } from '../types';
import type { StreamingOpeningTitleCoverage } from './streamingOpeningCatalogue';
import { getStreamingContentAvailability } from './streamingContentAvailability';
import { resolveStreamingCatalogTitle } from './streamingCatalog';

export interface StreamingAnchorCandidate {
    id: string;
    title: string;
    genre: string;
    format: 'MOVIE' | 'SERIES';
    source: 'OWNED' | 'LICENSED' | 'ORIGINAL';
    rating: number | null;
    coveredMarketCount: number;
    scheduledWeek: number | null;
}

const sourceWeight: Record<StreamingAnchorCandidate['source'], number> = {
    ORIGINAL: 15,
    OWNED: 6,
    LICENSED: 0,
};

const baseScore = (candidate: StreamingAnchorCandidate): number => {
    const rating = Number.isFinite(candidate.rating) ? candidate.rating! : 6;
    const scheduleWeight = candidate.scheduledWeek === null
        ? 0
        : Math.max(0, 9 - Math.min(9, candidate.scheduledWeek));
    return rating * 10
        + sourceWeight[candidate.source]
        + candidate.coveredMarketCount * 2
        + (candidate.format === 'SERIES' ? 5 : 0)
        + scheduleWeight;
};

/**
 * Select a small launch-facing set without treating catalogue insertion order
 * as strategy. Repeated genres receive a soft penalty, so a strong diverse
 * title can represent the shelf without hiding a genuine flagship.
 */
export const rankStreamingAnchorCandidates = (
    candidates: StreamingAnchorCandidate[],
    limit = 4,
): StreamingAnchorCandidate[] => {
    const remaining = [...candidates];
    const selected: StreamingAnchorCandidate[] = [];
    while (remaining.length && selected.length < Math.max(0, limit)) {
        const genreCount = new Map<string, number>();
        selected.forEach(item => genreCount.set(item.genre, (genreCount.get(item.genre) || 0) + 1));
        remaining.sort((left, right) => {
            const leftScore = baseScore(left) - (genreCount.get(left.genre) || 0) * 14;
            const rightScore = baseScore(right) - (genreCount.get(right.genre) || 0) * 14;
            return rightScore - leftScore
                || left.title.localeCompare(right.title)
                || left.id.localeCompare(right.id);
        });
        selected.push(remaining.shift()!);
    }
    return selected;
};

export const rankStreamingLaunchAnchors = (
    player: Player,
    titles: StreamingOpeningTitleCoverage[],
    limit = 4,
): StreamingOpeningTitleCoverage[] => {
    const platform = player.ownedStreamingPlatform;
    const byId = new Map(titles.map(title => [title.projectId, title]));
    const candidates = titles.map(title => {
        const canonical = resolveStreamingCatalogTitle(player, title.projectId);
        const scheduled = platform.launchSlate?.entries.find(entry => entry.projectId === title.projectId);
        return {
            id: title.projectId,
            title: title.title,
            genre: title.genre,
            format: title.projectType,
            source: title.source,
            rating: canonical?.rating ?? null,
            coveredMarketCount: getStreamingContentAvailability(player, title.projectId).coveredCountryIds.length,
            scheduledWeek: scheduled?.launchWeek ?? null,
        } satisfies StreamingAnchorCandidate;
    });
    return rankStreamingAnchorCandidates(candidates, limit)
        .flatMap(candidate => byId.get(candidate.id) ?? []);
};
