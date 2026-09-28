import assert from 'node:assert/strict';
import { createStreamingTitleRouteCache } from '../services/worldEconomy/worldStreamingViewing';
import { appendStreamingOpeningProgrammeTransitions } from '../services/streamingOpeningProgramme';
import type { Player } from '../types';

let evaluations = 0;
const cached = createStreamingTitleRouteCache((_projectId, _countryId, route) => {
    evaluations += 1;
    return { allowed: route.kind !== 'AD_SUPPORTED', evaluation: evaluations };
});

const subscription = { kind: 'SUBSCRIPTION' as const, planId: 'STANDARD' };
const first = cached('title-1', 'US', subscription);
const second = cached('title-1', 'US', { ...subscription });
assert.equal(first, second, 'equivalent route lookups should reuse the exact cached decision');
assert.equal(evaluations, 1);

cached('title-1', 'CA', subscription);
cached('title-1', 'US', { kind: 'SUBSCRIPTION', planId: 'PREMIUM' });
cached('title-1', 'US', { kind: 'RENTAL' });
cached('title-2', 'US', subscription);
assert.equal(evaluations, 5, 'country, plan, route kind, and title must remain distinct cache dimensions');

const livePlatform = new Proxy({
    launchCommit: null,
    lifecycle: 'ACTIVE',
}, {
    get(target, key) {
        if (key === 'launchCommit') return target.launchCommit;
        if (key === 'lifecycle') return target.lifecycle;
        throw new Error(`live transition fast path accessed ${String(key)}`);
    },
});
const livePlayer = { ownedStreamingPlatform: livePlatform } as unknown as Player;
assert.equal(
    appendStreamingOpeningProgrammeTransitions({} as Player, livePlayer),
    livePlayer,
    'a live service has no opening-programme transition work',
);

console.log('Adaptive performance Phase 6 cache audit passed.');
