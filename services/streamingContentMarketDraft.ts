import type { OwnedStreamingPlatformState } from '../types';

type ContentMarketDraft = NonNullable<OwnedStreamingPlatformState['contentMarketDraft']>;
const emptyDraft: ContentMarketDraft = { tab: 'ALL', search: '', selectedId: null, ownedIds: [] };
const tabs: readonly string[] = ['ALL', 'MOVIE', 'SERIES', 'COLLECTIONS', 'OWNED', 'OFFERS', 'AUCTIONS', 'UPCOMING'];

/** Keep UI comparisons and persistence on the same bounded draft schema. */
export const normalizeStreamingContentMarketDraft = (value: unknown): ContentMarketDraft | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Record<string, unknown>;
    return {
        tab: typeof source.tab === 'string' && tabs.includes(source.tab) ? source.tab as ContentMarketDraft['tab'] : 'ALL',
        search: String(source.search || '').slice(0, 100),
        selectedId: typeof source.selectedId === 'string' ? source.selectedId.slice(0, 200) : null,
        ownedIds: Array.isArray(source.ownedIds)
            ? Array.from(new Set(source.ownedIds.filter((id): id is string => typeof id === 'string'))).slice(0, 500) : [],
    };
};

/** Key insertion order and values discarded by the saved schema are not edits.
 * An absent draft represents the initial empty shelf, without needing a save. */
export const sameStreamingContentMarketDraft = (left: unknown, right: unknown): boolean => {
    const a = normalizeStreamingContentMarketDraft(left) || emptyDraft;
    const b = normalizeStreamingContentMarketDraft(right) || emptyDraft;
    return a.tab === b.tab && a.search === b.search && a.selectedId === b.selectedId
        && a.ownedIds.length === b.ownedIds.length && a.ownedIds.every((id, index) => id === b.ownedIds[index]);
};
