// @ts-nocheck - executable C6 candidate generation fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import {
    appendIndustryEventFacts,
    buildIndustryMediaClaimCandidates,
    createIndustryEventFact,
    createIndustryMediaClaim,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';

const absoluteWeek = 2_500;
const eventSeeds = [
    {
        key: 'greenlight', type: 'PROJECT_GREENLIT', projectId: 'signal_one',
        evidence: [
            { kind: 'PROJECT', id: 'signal_one', metric: 'expectedReleaseWeek', value: absoluteWeek + 20 },
            { kind: 'TALENT', id: 'talent_priya', metric: 'candidate' },
        ],
    },
    {
        key: 'planned', type: 'PROJECT_RELEASE_PLANNED', projectId: 'signal_two',
        evidence: [
            { kind: 'PROJECT', id: 'signal_two', metric: 'expectedReleaseWeek', value: absoluteWeek + 8 },
            { kind: 'PLATFORM', id: 'netflix', metric: 'candidateDestination' },
        ],
    },
    { key: 'delayed', type: 'PROJECT_DELAYED', projectId: 'signal_three', evidence: [{ kind: 'PROJECT', id: 'signal_three' }] },
    { key: 'hit', type: 'PROJECT_HIT', projectId: 'signal_four', evidence: [{ kind: 'UNIVERSE', id: 'universe_signal', metric: 'continuationCandidate' }] },
    { key: 'award', type: 'AWARD_NOMINATED', projectId: 'signal_five', awardEventId: 'award_signal', evidence: [{ kind: 'AWARD', id: 'award_signal' }] },
    { key: 'distress', type: 'COMPANY_DISTRESS', companyId: 'rival_studio', evidence: [{ kind: 'COMPANY', id: 'rival_studio' }] },
];

const events = eventSeeds.map((seed, index) => createIndustryEventFact({
    idempotencyKey: `c6:generation:${seed.key}`,
    absoluteWeek: absoluteWeek - 2 + index % 2,
    type: seed.type,
    importance: 'HIGH',
    companyId: seed.companyId || 'empire_studios',
    companyName: seed.companyId ? 'Rival Studio' : 'Empire Studios',
    projectId: seed.projectId,
    awardEventId: seed.awardEventId,
    headline: `${seed.key} headline`,
    detail: `${seed.key} canonical detail`,
    evidence: seed.evidence,
}));

const stories = events.map(event => ({
    schemaVersion: 1,
    id: `story_${event.id}`,
    subjectKey: event.projectId ? `project:${event.projectId}` : `company:${event.companyId}`,
    category: event.type === 'COMPANY_DISTRESS' ? 'COMPANY'
        : event.type === 'AWARD_NOMINATED' ? 'AWARDS'
            : event.type === 'PROJECT_HIT' ? 'PROJECT_OUTCOME'
                : event.type === 'PROJECT_DELAYED' ? 'PROJECT_PRODUCTION'
                    : event.type === 'PROJECT_RELEASE_PLANNED' ? 'PROJECT_RELEASE'
                        : 'PROJECT_DEVELOPMENT',
    stage: event.type === 'PROJECT_HIT' ? 'RESOLVED' : event.type === 'PROJECT_DELAYED' ? 'DEVELOPING' : 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: event.id,
    industryEventIds: [event.id],
    firstAbsoluteWeek: event.absoluteWeek,
    lastAdvancedAbsoluteWeek: event.absoluteWeek,
    headline: event.headline,
    detail: event.detail,
    channelEligibility: ['NEWS', 'X', 'INSTAGRAM', 'YOUTUBE'],
    publishedChannels: ['NEWS'],
    companyId: event.companyId,
    companyName: event.companyName,
    projectId: event.projectId,
    awardEventId: event.awardEventId,
}));

const player = structuredClone(INITIAL_PLAYER);
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.platforms = {};
player.world.studios = {};
player.world.projects = [];
player.world.industryEvents = appendIndustryEventFacts(undefined, events);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories });

const candidates = buildIndustryMediaClaimCandidates(player, absoluteWeek);
const categories = new Set(candidates.map(candidate => candidate.category));
[
    'CASTING', 'PROJECT_STATUS', 'PLATFORM_DESTINATION', 'RELEASE_WINDOW',
    'FRANCHISE_DIRECTION', 'AWARDS', 'COMPANY_MOVE', 'PROJECT_OUTCOME',
].forEach(category => assert.ok(categories.has(category), `missing ${category} candidate`));
assert.ok(candidates.every(candidate => player.world.industryMedia.stories.some(story => story.id === candidate.story.id)));
assert.ok(candidates.every(candidate => candidate.evidenceEventIds.includes(candidate.event.id)));

const first = createIndustryMediaClaim(player, absoluteWeek);
const clone = createIndustryMediaClaim(structuredClone(player), absoluteWeek);
assert.ok(first.claim);
assert.deepEqual(first.claim, clone.claim, 'same world/week must select the same claim');
assert.equal(first.player.world.industryMedia.claims.length, 1);
assert.equal(first.claim.status, 'OPEN');
assert.ok(first.claim.earliestResolutionAbsoluteWeek > absoluteWeek);
assert.ok(first.claim.expiryAbsoluteWeek > first.claim.earliestResolutionAbsoluteWeek);
assert.ok(first.claim.evidenceEventIds.every(id => first.player.world.industryEvents.events.some(event => event.id === id)));
assert.ok(first.player.world.industryMedia.institutions.some(item => item.id === first.claim.institutionId));
assert.ok(!first.claim.personalityId || first.player.world.industryMedia.personalities.some(item => item.id === first.claim.personalityId));

const replay = createIndustryMediaClaim(first.player, absoluteWeek);
assert.equal(replay.claim, undefined);
assert.deepEqual(replay.player, first.player);

const unsupported = structuredClone(player);
unsupported.world.industryEvents = appendIndustryEventFacts(undefined, [createIndustryEventFact({
    idempotencyKey: 'c6:generation:unsupported', absoluteWeek, type: 'PARTNERSHIP_REPEATED', importance: 'LOW',
    companyId: 'empire_studios', companyName: 'Empire Studios', headline: 'Partnership continues',
    detail: 'The companies worked together again.', evidence: [{ kind: 'COMPANY', id: 'empire_studios' }],
})]);
unsupported.world.industryMedia = normalizeIndustryMediaWorld(undefined);
assert.equal(buildIndustryMediaClaimCandidates(unsupported, absoluteWeek).length, 0);

console.log('Industry media C6 claim generation audit passed.');
