import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import * as market from '../components/StreamingContentMarket';

const player = structuredClone(INITIAL_PLAYER);
const originalDraft = { tab: 'ALL' as const, search: '', selectedId: null, ownedIds: [] };
player.ownedStreamingPlatform.contentMarketDraft = originalDraft;
const updates: typeof player[] = [];
const persist = (market as typeof market & {
    persistContentMarketDraft?: (player: typeof INITIAL_PLAYER, draft: typeof originalDraft,
        update: (next: typeof INITIAL_PLAYER) => void) => boolean;
}).persistContentMarketDraft;

// A no-op Back must not submit the whole save again.
assert.equal(persist?.(player, { ...originalDraft }, next => updates.push(next)), false);
assert.equal(updates.length, 0);

// A changed draft must still survive leaving the market.
const changedDraft = { ...originalDraft, search: 'north' };
assert.equal(persist?.(player, changedDraft, next => updates.push(next)), true);
assert.equal(updates.length, 1);
assert.equal(updates[0].ownedStreamingPlatform.contentMarketDraft?.search, 'north');

// Opening and immediately closing Add Content must not create a default draft.
player.ownedStreamingPlatform.contentMarketDraft = undefined;
updates.length = 0;
assert.equal(persist?.(player, originalDraft, next => updates.push(next)), false);
assert.equal(updates.length, 0);

console.log('Content market back draft audit: PASS');
