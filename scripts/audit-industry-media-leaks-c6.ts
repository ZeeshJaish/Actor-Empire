// @ts-nocheck - executable C6 private-intent leak boundary fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import {
    appendIndustryEventFacts,
    buildIndustryMediaLeakCandidates,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';

const absoluteWeek = 2_600;
const player = structuredClone(INITIAL_PLAYER);
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.businesses = [];
player.ownedStreamingPlatform = undefined;

const event = createIndustryEventFact({
    idempotencyKey: 'c6:leak:anchor', absoluteWeek: absoluteWeek - 2,
    type: 'PROJECT_RELEASED', importance: 'HIGH', companyId: 'rival_platform', companyName: 'Rival Platform',
    projectId: 'night_signal', headline: 'Night Signal builds an audience',
    detail: 'The project has an established public record.', evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const story = {
    schemaVersion: 1, id: 'story_c6_leak', subjectKey: 'project:night_signal', category: 'PROJECT_OUTCOME',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: event.absoluteWeek, lastAdvancedAbsoluteWeek: event.absoluteWeek,
    headline: event.headline, detail: event.detail, channelEligibility: ['NEWS', 'X', 'YOUTUBE'],
    publishedChannels: ['NEWS'], companyId: 'rival_platform', companyName: 'Rival Platform', projectId: 'night_signal',
};
const proposal = {
    id: 'proposal_c6_commission', idempotencyKey: 'proposal:c6:commission', companyId: 'rival_platform',
    companyKind: 'STREAMING_PLATFORM', lane: 'CONTENT_STRATEGY', decisionCycle: 4,
    absoluteWeek: absoluteWeek - 1, actionFamily: 'ORIGINAL_COMMISSION', optionId: 'night_signal',
    urgency: 72, confidence: 78, expectedExposureMillions: 180, affordabilityCeilingMillions: 900,
    score: { total: 82, need: 80, strategyFit: 84, expectedUpside: 86, relationshipValue: 60,
        competitiveValue: 77, financialRisk: 34, capacityPressure: 20, fatigue: 10, executionRisk: 28 },
    reasonCodes: ['STRATEGIC_NEED'], uncertaintyKey: 'secret-debug-key', status: 'PROPOSED',
    nextReviewAbsoluteWeek: absoluteWeek + 2,
};
player.world.platforms = {
    rival_platform: {
        id: 'rival_platform', name: 'Rival Platform', ai: {
            playerAcquisitionHandoffAtAbsoluteWeek: null,
            intelligence: { proposals: [proposal], content: { selectedFingerprints: [] } },
        },
    },
};
player.world.studios = {};
player.world.projects = [];
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story] });

const beforePlatforms = structuredClone(player.world.platforms);
const candidates = buildIndustryMediaLeakCandidates(player, absoluteWeek);
assert.equal(candidates.length, 1);
assert.equal(candidates[0].kind, 'LEAK');
assert.equal(candidates[0].story.id, story.id);
assert.equal(candidates[0].leakIntentSnapshot.intentionId, proposal.id);
assert.equal(candidates[0].leakIntentSnapshot.companyId, 'rival_platform');
assert.equal(candidates[0].leakIntentSnapshot.subjectId, 'night_signal');
const serialized = JSON.stringify(candidates[0].leakIntentSnapshot);
assert.doesNotMatch(serialized, /affordability|exposure|score|uncertainty|budget|ceiling|reason/i);
assert.deepEqual(player.world.platforms, beforePlatforms, 'leak discovery must not mutate platform AI');
assert.deepEqual(buildIndustryMediaLeakCandidates(structuredClone(player), absoluteWeek), candidates);

const acquired = structuredClone(player);
acquired.ownedStreamingPlatform = {
    corporateDevelopment: { acquiredPlatformIds: ['rival_platform'] },
};
assert.equal(buildIndustryMediaLeakCandidates(acquired, absoluteWeek).length, 0);

const handedOff = structuredClone(player);
handedOff.world.platforms.rival_platform.ai.playerAcquisitionHandoffAtAbsoluteWeek = absoluteWeek - 1;
assert.equal(buildIndustryMediaLeakCandidates(handedOff, absoluteWeek).length, 0);

const abandoned = structuredClone(player);
abandoned.world.platforms.rival_platform.ai.intelligence.proposals[0].status = 'REJECTED';
assert.equal(buildIndustryMediaLeakCandidates(abandoned, absoluteWeek).length, 0);

const stale = structuredClone(player);
stale.world.platforms.rival_platform.ai.intelligence.proposals[0].absoluteWeek = absoluteWeek - 12;
assert.equal(buildIndustryMediaLeakCandidates(stale, absoluteWeek).length, 0);

const noAnchor = structuredClone(player);
noAnchor.world.industryMedia = normalizeIndustryMediaWorld(undefined);
assert.equal(buildIndustryMediaLeakCandidates(noAnchor, absoluteWeek).length, 0);

console.log('Industry media C6 safe leak audit passed.');
