// @ts-nocheck - executable C6 claim/source normalization fixture.
import assert from 'node:assert/strict';
import {
    INDUSTRY_MEDIA_CLAIM_EVIDENCE_LIMIT,
    INDUSTRY_MEDIA_CLAIM_LIMIT,
    INDUSTRY_MEDIA_CLAIM_PROCESSED_KEY_LIMIT,
    INDUSTRY_MEDIA_CLAIM_RESOLUTION_EVENT_LIMIT,
    INDUSTRY_MEDIA_SOURCE_CATEGORY_LIMIT,
    INDUSTRY_MEDIA_SOURCE_RECENT_CLAIM_LIMIT,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';

const eventId = 'event_c6_anchor';
const story = {
    schemaVersion: 1,
    id: 'story_c6_anchor',
    subjectKey: 'project:night_signal',
    category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: eventId,
    industryEventIds: [eventId, 'event_c6_resolution'],
    firstAbsoluteWeek: 2_400,
    lastAdvancedAbsoluteWeek: 2_401,
    headline: 'Night Signal prepares for release',
    detail: 'Empire Studios has scheduled the film.',
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'],
    publishedChannels: ['NEWS'],
    companyId: 'empire_studios',
    companyName: 'Empire Studios',
    projectId: 'night_signal',
};

const institution = {
    schemaVersion: 1,
    id: 'screenline_trade',
    name: 'The Screen Ledger',
    shortName: 'Screen Ledger',
    kind: 'TRADE',
    handles: { X: '@screenledger' },
    channels: ['NEWS', 'X'],
    homeRegionId: 'GLOBAL',
    coveredRegionIds: ['GLOBAL'],
    languageIds: ['en'],
    focusCategories: ['PROJECT_OUTCOME'],
    primaryColor: '#A61B1B',
    secondaryColor: '#111111',
    avatar: 'data:image/svg+xml,local',
    credibility: 78,
    reach: 72,
    access: 70,
    sensationalism: 28,
    prestige: 74,
    isAnchor: true,
    isActive: true,
};

const personality = {
    schemaVersion: 1,
    id: 'mara_voss',
    name: 'Maya Khanna',
    handle: '@mayakhanna',
    avatar: 'data:image/svg+xml,local',
    gender: 'FEMALE',
    institutionId: institution.id,
    role: 'INVESTIGATOR',
    voiceArchetype: 'INSIDER',
    channels: ['NEWS', 'X'],
    homeRegionId: 'GLOBAL',
    languageIds: ['en'],
    focusCategories: ['PROJECT_OUTCOME'],
    preferredGenreIds: [],
    credibility: 76,
    reach: 68,
    aggression: 42,
    optimism: 50,
    humour: 20,
    sensationalism: 24,
    independence: 82,
    baselinePlayerAffinity: 0,
    stanceFloor: -70,
    stanceCeiling: 70,
    isAnchor: true,
    isActive: true,
    verified: true,
    lastAppearanceAbsoluteWeek: 2_400,
    recentStoryIds: [story.id],
};

const claim = (index: number) => ({
    schemaVersion: 1,
    id: `claim_${index}`,
    claimKey: index === 1 ? 'claim-key-0' : `claim-key-${index}`,
    kind: index === 0 ? 'NOT_REAL' : 'PREDICTION',
    status: index % 4 === 0 ? 'OPEN' : 'REFUTED',
    category: index === 0 ? 'NOT_REAL' : 'PROJECT_OUTCOME',
    confidence: index === 0 ? 'NOT_REAL' : 'CREDIBLE_CHATTER',
    subjectKey: story.subjectKey,
    subjectName: 'Night Signal',
    anchorIndustryEventId: eventId,
    anchorStoryId: story.id,
    evidenceEventIds: Array.from({ length: 18 }, (_, evidenceIndex) => (
        evidenceIndex === 0 ? eventId : `evidence_${evidenceIndex}`
    )),
    institutionId: institution.id,
    personalityId: personality.id,
    publicationChannel: 'X',
    importance: 'HIGH',
    headline: `Prediction ${index}`,
    summary: 'The Screen Ledger predicts Night Signal could become a sleeper hit.',
    knownEvidence: 'Empire Studios has scheduled the film.',
    interpretation: 'Audience momentum may exceed expectations.',
    target: {
        expectedEventTypes: ['PROJECT_SLEEPER'],
        projectId: story.projectId,
        expectedOutcome: 'SLEEPER',
    },
    createdAbsoluteWeek: 2_401 + index,
    earliestResolutionAbsoluteWeek: 2_402 + index,
    expiryAbsoluteWeek: 2_420 + index,
    lastEvaluatedAbsoluteWeek: 2_401 + index,
    playerRelated: true,
    ...(index % 4 === 0 ? {} : {
        resolution: {
            status: 'REFUTED',
            absoluteWeek: 2_410 + index,
            eventIds: Array.from({ length: 9 }, (_, eventIndex) => `resolution_${eventIndex}`),
            explanation: 'The canonical release outcome contradicted the prediction.',
            sourceReliabilityDelta: -3,
        },
    }),
});

const sourceRecord = (index: number) => ({
    schemaVersion: 1,
    id: `source:${personality.id}:category:${index}`,
    sourceId: personality.id,
    institutionId: institution.id,
    personalityId: personality.id,
    category: index === 0 ? 'NOT_REAL' : 'PROJECT_OUTCOME',
    calls: -4,
    confirmed: 8,
    partlyConfirmed: 3,
    refuted: 2,
    expired: 1,
    reliability: 140,
    currentStreak: 99,
    lastResolvedAbsoluteWeek: 2_450,
    recentClaimIds: Array.from({ length: 30 }, (_, claimIndex) => `claim_${claimIndex}`),
});

const normalized = normalizeIndustryMediaWorld({
    schemaVersion: 5,
    stories: [story],
    institutions: [institution],
    personalities: [personality],
    claims: [
        ...Array.from({ length: 230 }, (_, index) => claim(index)),
        { ...claim(231), id: 'orphan-story', anchorStoryId: 'missing_story' },
        { ...claim(232), id: 'orphan-event', anchorIndustryEventId: 'missing_event' },
        { ...claim(233), id: 'orphan-institution', institutionId: 'missing_institution' },
        { ...claim(234), id: 'orphan-personality', personalityId: 'missing_personality' },
    ],
    sourceRecords: Array.from({ length: 12 }, (_, index) => sourceRecord(index)),
    processedClaimKeys: Array.from({ length: 700 }, (_, index) => `processed_${index}`),
});

assert.equal(normalized.schemaVersion, 7);
assert.equal(normalized.claims.length, INDUSTRY_MEDIA_CLAIM_LIMIT);
assert.equal(normalized.processedClaimKeys.length, INDUSTRY_MEDIA_CLAIM_PROCESSED_KEY_LIMIT);
assert.equal(new Set(normalized.claims.map(item => item.claimKey)).size, normalized.claims.length);
assert.ok(normalized.claims.every(item => item.anchorStoryId === story.id));
assert.ok(normalized.claims.every(item => item.anchorIndustryEventId === eventId));
assert.ok(normalized.claims.every(item => item.evidenceEventIds.length <= INDUSTRY_MEDIA_CLAIM_EVIDENCE_LIMIT));
assert.ok(normalized.claims.every(item => (item.resolution?.eventIds.length || 0) <= INDUSTRY_MEDIA_CLAIM_RESOLUTION_EVENT_LIMIT));
assert.ok(normalized.claims.some(item => item.status === 'OPEN'), 'open claims must survive compaction');
assert.ok(normalized.sourceRecords.length <= INDUSTRY_MEDIA_SOURCE_CATEGORY_LIMIT);
assert.ok(normalized.sourceRecords.every(item => item.recentClaimIds.length <= INDUSTRY_MEDIA_SOURCE_RECENT_CLAIM_LIMIT));

const repaired = normalized.claims.find(item => item.id === 'claim_0');
assert.ok(repaired);
assert.equal(repaired.kind, 'RUMOUR');
assert.equal(repaired.category, 'PROJECT_STATUS');
assert.equal(repaired.confidence, 'TENTATIVE');

const repairedRecord = normalized.sourceRecords.find(item => item.id === 'source:mara_voss:category:0');
assert.ok(repairedRecord);
assert.equal(repairedRecord.category, 'PROJECT_STATUS');
assert.equal(repairedRecord.calls, 0);
assert.equal(repairedRecord.reliability, 100);
assert.ok(repairedRecord.currentStreak <= 20);

console.log('Industry media C6 claim state audit passed.');
