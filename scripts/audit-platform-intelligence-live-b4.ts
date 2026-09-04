import assert from 'node:assert/strict';
import { processPlatformAiWorldTurn } from '../services/platformAi/platformAiTurn';
import { normalizeWorldPlatformAi } from '../services/platformAi/platformAiState';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const WEEK = 2_140;
const fixture = createPlatformAiFixture();
const makeWorld = () => {
    const world = normalizeWorldPlatformAi(fixture, structuredClone(fixture.world), WEEK);
    const ai = world.platforms!.NETFLIX.ai!;
    ai.lastProcessedAbsoluteWeek = WEEK - 1;
    ai.nextPlanningAbsoluteWeek = WEEK;
    ai.audienceHealth.catalogueStrengthIndex = 0;
    ai.intelligence!.nextDueAbsoluteWeek = {
        CONTENT_STRATEGY: WEEK,
        PRODUCTION_REVIEW: WEEK + 100,
        RELEASE_REVIEW: WEEK + 100,
        FINANCE_REVIEW: WEEK + 100,
        MARKET_EXPANSION: WEEK + 100,
        CAPABILITY_GROWTH: WEEK + 100,
    };
    return world;
};

const dueWorld = makeWorld();
const due = processPlatformAiWorldTurn({ ...fixture, world: dueWorld }, dueWorld, WEEK);
const dueAi = due.world.platforms!.NETFLIX.ai!;
const proposal = dueAi.intelligence!.proposals.find(item => item.absoluteWeek === WEEK && item.lane === 'CONTENT_STRATEGY');
assert.equal(proposal?.actionFamily, 'DEVELOP_CONTENT');
assert.ok(proposal?.contentFingerprintId);
assert.ok(dueAi.intelligence!.platformMigration!.processedProposalKeys.includes(proposal!.idempotencyKey));
assert.ok(dueAi.slate.length > 0, 'a live due B2/B3 content decision must reach the existing canonical platform slate');

const notDueWorld = makeWorld();
notDueWorld.platforms!.NETFLIX.ai!.intelligence!.nextDueAbsoluteWeek.CONTENT_STRATEGY = WEEK + 100;
const notDue = processPlatformAiWorldTurn({ ...fixture, world: notDueWorld }, notDueWorld, WEEK);
assert.equal(notDue.world.platforms!.NETFLIX.ai!.slate.length, 0, 'legacy nextPlanning must no longer create content without a due intelligence proposal');

const replay = processPlatformAiWorldTurn({ ...fixture, world: due.world }, due.world, WEEK);
assert.deepEqual(replay.world.platforms!.NETFLIX, due.world.platforms!.NETFLIX, 'same-week live replay must be byte-stable');

const missingLedgerWorld = makeWorld();
delete missingLedgerWorld.platforms!.NETFLIX.ai!.intelligence!.platformMigration;
assert.doesNotThrow(
    () => processPlatformAiWorldTurn({ ...fixture, world: missingLedgerWorld }, missingLedgerWorld, WEEK),
    'a migrated platform missing the optional B4 ledger must normalize before executing due proposals',
);
console.log('Platform Intelligence B4 live cutover audit passed.');
