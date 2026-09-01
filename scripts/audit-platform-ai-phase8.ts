import assert from 'node:assert/strict';
import type { NewsItem, PlatformId } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    countPhase8EcosystemEvents,
    PHASE8_HORIZON_WEEKS,
    measurePhase8SaveBytes,
    processPlatformAiPhase8StreamingWeek,
} from './helpers/platformAiPhase8Harness';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const CORE_IDS: PlatformId[] = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'];
const fixture = createPlatformAiFixture();
fixture.news = Array.from({ length: 55 }, (_, index): NewsItem => ({
    id: `phase8-existing-news-${index}`,
    headline: `Existing industry story ${index}`,
    category: 'INDUSTRY',
    week: fixture.currentWeek,
    year: fixture.age,
    impactLevel: 'MEDIUM',
}));
const absoluteWeek = getAbsoluteWeek(fixture.age, fixture.currentWeek) + 1;

assert.deepEqual(
    PHASE8_HORIZON_WEEKS,
    [520, 1_300, 2_600],
    'Phase 8 must expose the approved 10-, 25-, and 50-year checkpoints.',
);

assert.deepEqual(
    countPhase8EcosystemEvents([
        { type: 'LAUNCH' },
        { type: 'PROMOTED' },
        { type: 'DISTRESS' },
        { type: 'RECOVERY' },
        { type: 'CLOSED' },
        { type: 'EXPANSION' },
    ]),
    { launches: 1, promotions: 1, distress: 1, recoveries: 1, closures: 1 },
    'Phase 8 reporting must classify canonical ecosystem event names.',
);

const first = processPlatformAiPhase8StreamingWeek(fixture, fixture.world, absoluteWeek);
for (const platformId of CORE_IDS) {
    assert.equal(first.world.platforms![platformId].ai!.lastProcessedAbsoluteWeek, absoluteWeek);
}
assert.equal(first.world.streamingPlatformEcosystem!.lastProcessedAbsoluteWeek, absoluteWeek);
for (const operator of Object.values(first.world.streamingPlatformEcosystem!.operators)) {
    if (operator.kind === 'CORE_GLOBAL' || operator.lifecycle === 'CLOSED' || operator.lifecycle === 'ACQUIRED') continue;
    assert.equal(operator.lastProcessedAbsoluteWeek, absoluteWeek, `${operator.id} must expose the Phase 8 week checkpoint.`);
}
assert.strictEqual(first.player.world, first.world, 'The Phase 8 runner must keep player.world canonical.');
assert.ok(first.player.news.length <= 50, 'Long-run News history must use the live weekly bound.');
assert.equal(new Set(first.player.news.map(item => item.id)).size, first.player.news.length, 'Long-run News IDs must be unique.');
assert.ok(measurePhase8SaveBytes(first.player) > 0, 'Phase 8 must expose measurable serialized save size.');

const replay = processPlatformAiPhase8StreamingWeek(first.player, first.world, absoluteWeek);
assert.deepEqual(replay.world, first.world, 'Same-week Phase 8 replay must not mutate canonical world state.');
assert.deepEqual(replay.news, [], 'Same-week Phase 8 replay must emit no new News events.');
assert.deepEqual(replay.player.news, first.player.news, 'Same-week replay must preserve bounded News exactly.');

console.log('Platform AI Phase 8 canonical long-run harness audit passed.');
