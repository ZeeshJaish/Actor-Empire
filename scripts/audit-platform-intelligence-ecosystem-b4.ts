import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';
import { processStreamingPlatformEcosystemTurn } from '../services/streamingPlatformEcosystemTurn';
import { adaptStreamingEcosystemIntelligenceContext } from '../services/industryIntelligence/streamingEcosystemIntelligenceAdapter';
import { evaluateStreamingOperatorCanonicalBidderEligibility } from '../services/platformAi/streamingOperatorBidderBridge';

const WEEK = 1_500;
const normalized = normalizeStreamingPlatformEcosystem(undefined, WEEK);
const jio = normalized.operators.JIOHOTSTAR;
assert.ok(jio.intelligence, 'every non-core operator needs normalized private intelligence');
const context = adaptStreamingEcosystemIntelligenceContext(jio, WEEK + 1);
assert.equal(context.companyId, 'JIOHOTSTAR');
assert.equal(context.companyKind, 'STREAMING_PLATFORM');
assert.equal(context.controller, 'AI');
assert.ok(context.condition.runwayWeeks > 0);
assert.ok((context.capabilities.LOCALIZATION || 0) >= 90);

jio.intelligence!.nextDueAbsoluteWeek = {
    CONTENT_STRATEGY: WEEK + 1,
    PRODUCTION_REVIEW: 9_999,
    RELEASE_REVIEW: 9_999,
    FINANCE_REVIEW: 9_999,
    MARKET_EXPANSION: 9_999,
    CAPABILITY_GROWTH: 9_999,
};
const player = structuredClone(INITIAL_PLAYER);
player.world.streamingPlatformEcosystem = normalized;
const progressed = processStreamingPlatformEcosystemTurn(player, player.world, WEEK + 1);
const after = progressed.world.streamingPlatformEcosystem!.operators.JIOHOTSTAR;
assert.equal(after.intelligence!.lastProcessedAbsoluteWeek, WEEK + 1);
assert.equal(after.intelligence!.proposals.filter(item => item.absoluteWeek === WEEK + 1).length, 1);
assert.ok(after.intelligence!.content.selectedFingerprints.length <= 24);

const replayPlayer = { ...player, world: progressed.world };
const replay = processStreamingPlatformEcosystemTurn(replayPlayer, progressed.world, WEEK + 1);
assert.equal(replay.changed, false, 'same ecosystem week must be idempotent');
assert.deepEqual(replay.world.streamingPlatformEcosystem, progressed.world.streamingPlatformEcosystem);

const unsupported = evaluateStreamingOperatorCanonicalBidderEligibility(jio, {
    countryIds: ['IN'], commitmentMillions: 20, externalSettlementIdentitySupported: false,
});
assert.equal(unsupported.eligible, false);
assert.equal(unsupported.reason, 'UNSUPPORTED_SETTLEMENT_IDENTITY');
const eligible = evaluateStreamingOperatorCanonicalBidderEligibility(jio, {
    countryIds: ['IN'], commitmentMillions: 20, externalSettlementIdentitySupported: true,
});
assert.equal(eligible.eligible, true);
assert.equal(eligible.settlementIdentity, 'JIOHOTSTAR');
const wrongTerritory = evaluateStreamingOperatorCanonicalBidderEligibility(jio, {
    countryIds: ['JP'], commitmentMillions: 20, externalSettlementIdentitySupported: true,
});
assert.equal(wrongTerritory.reason, 'OUTSIDE_ACTIVE_MARKET');
const distressed = evaluateStreamingOperatorCanonicalBidderEligibility({ ...jio, lifecycle: 'DISTRESSED' }, {
    countryIds: ['IN'], commitmentMillions: 20, externalSettlementIdentitySupported: true,
});
assert.equal(distressed.reason, 'OPERATOR_NOT_ACTIVE');

console.log('Platform Intelligence B4 ecosystem audit passed.');
