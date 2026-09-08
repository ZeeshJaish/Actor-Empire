// @ts-nocheck - executable C7 narrative/relationship/PR/promotion normalization fixture.
import assert from 'node:assert/strict';
import {
    INDUSTRY_MEDIA_C7_KEY_LIMIT,
    INDUSTRY_MEDIA_NARRATIVE_LANDMARK_LIMIT,
    INDUSTRY_MEDIA_NARRATIVE_LIMIT,
    INDUSTRY_MEDIA_PR_INTERVENTION_LIMIT,
    INDUSTRY_MEDIA_PROMOTION_ATTRIBUTION_LIMIT,
    INDUSTRY_MEDIA_RELATIONSHIP_LANDMARK_LIMIT,
    INDUSTRY_MEDIA_RELATIONSHIP_LIMIT,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';

const eventId = 'event_c7_anchor';
const story = {
    schemaVersion: 1,
    id: 'story_c7_anchor',
    subjectKey: 'project:night_signal',
    category: 'PROJECT_OUTCOME',
    stage: 'RESOLVED',
    importance: 'HIGH',
    primaryIndustryEventId: eventId,
    industryEventIds: [eventId, 'event_c7_followup'],
    firstAbsoluteWeek: 2_500,
    lastAdvancedAbsoluteWeek: 2_502,
    headline: 'Night Signal becomes a breakout hit',
    detail: 'Empire Studios converted an expensive gamble into a hit.',
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'],
    publishedChannels: ['NEWS'],
    companyId: 'empire_studios',
    companyName: 'Empire Studios',
    projectId: 'night_signal',
};

const personality = {
    schemaVersion: 1,
    id: 'gideon_price',
    name: 'Gideon Price',
    handle: '@gideonprice',
    avatar: 'media-personality:media_gideon_price',
    gender: 'MALE',
    institutionId: 'flashpoint_entertainment',
    role: 'COMMENTATOR',
    voiceArchetype: 'PROVOCATEUR',
    channels: ['NEWS', 'X'],
    homeRegionId: 'GLOBAL',
    languageIds: ['en'],
    focusCategories: ['PROJECT_OUTCOME'],
    preferredGenreIds: [],
    credibility: 58,
    reach: 82,
    aggression: 90,
    optimism: 18,
    humour: 40,
    sensationalism: 75,
    independence: 70,
    baselinePlayerAffinity: -55,
    stanceFloor: -95,
    stanceCeiling: -15,
    signatureRole: 'ANTAGONIST',
    isAnchor: true,
    isActive: true,
    verified: true,
    lastAppearanceAbsoluteWeek: 2_501,
    recentStoryIds: [story.id],
};

const landmark = (index: number) => ({
    id: `landmark_${index}`,
    kind: index === 0 ? 'NOT_REAL' : 'SUPPORT',
    industryEventIds: index === 0 ? ['missing_event'] : [eventId],
    absoluteWeek: 2_500 + index,
    summary: `Landmark ${index}`,
    impact: index === 0 ? 999 : 4,
});

const narrative = (index: number) => ({
    schemaVersion: 1,
    id: `narrative_${index}`,
    narrativeKey: index === 1 ? 'narrative-key-0' : `narrative-key-${index}`,
    subjectKey: story.subjectKey,
    subjectName: 'Night Signal',
    theme: index === 0 ? 'NOT_REAL' : 'AMBITIOUS_RISK_TAKER',
    polarity: index === 0 ? 'NOT_REAL' : 'MIXED',
    stage: index === 0 ? 'NOT_REAL' : index % 9 === 0 ? 'DEFINING' : 'ESTABLISHED',
    strength: index === 0 ? 999 : 60,
    confidence: index === 0 ? -10 : 70,
    supportingEvidence: 4,
    contradictingEvidence: 1,
    primaryStoryId: story.id,
    primaryIndustryEventId: eventId,
    firstAbsoluteWeek: 2_500 + index,
    lastAdvancedAbsoluteWeek: 2_501 + index,
    nextEligiblePublicationAbsoluteWeek: 2_508 + index,
    landmarks: Array.from({ length: 14 }, (_, landmarkIndex) => landmark(landmarkIndex + index * 20)),
    playerRelated: index % 3 === 0,
});

const relationship = (index: number) => ({
    schemaVersion: 1,
    id: `relationship_${index}`,
    relationshipKey: index === 1 ? 'relationship-key-0' : `relationship-key-${index}`,
    personalityId: personality.id,
    subjectKey: story.subjectKey,
    subjectName: 'Night Signal',
    affinity: -999,
    respect: 999,
    trust: -20,
    tension: 140,
    familiarity: 140,
    direction: index === 0 ? 'NOT_REAL' : 'WORSENING',
    feudState: index === 0 ? 'NOT_REAL' : index % 7 === 0 ? 'ACTIVE' : 'BUILDING',
    conflictEventIds: [eventId, 'event_c7_followup'],
    conflictAbsoluteWeeks: [100, 104],
    landmarkInteractionIds: Array.from({ length: 20 }, (_, item) => `interaction_${index}_${item}`),
    firstInteractionAbsoluteWeek: 2_500,
    lastMeaningfulInteractionAbsoluteWeek: 2_502 + index,
    lastIndustryEventId: eventId,
    playerRelated: index % 4 === 0,
});

const normalized = normalizeIndustryMediaWorld({
    schemaVersion: 6,
    stories: [story],
    personalities: [personality],
    narratives: [
        ...Array.from({ length: 150 }, (_, index) => narrative(index)),
        { ...narrative(160), id: 'orphan_narrative', primaryStoryId: 'missing_story' },
    ],
    mediaRelationships: [
        ...Array.from({ length: 280 }, (_, index) => relationship(index)),
        { ...relationship(290), id: 'orphan_relationship', personalityId: 'missing_personality' },
    ],
    prInterventions: Array.from({ length: 190 }, (_, index) => ({
        schemaVersion: 1,
        id: `pr_${index}`,
        interventionKey: index === 1 ? 'pr-key-0' : `pr-key-${index}`,
        absoluteWeek: 2_500 + index,
        tier: index === 189 ? 'NOT_REAL' : 'ELITE',
        importance: 'HIGH',
        rawEffects: { reputation: -3, controversy: 10, followers: -1000, projectBuzz: 0, mediaStance: -4, discussionHeat: 18, relationshipTension: 8, narrativeMomentum: -6 },
        appliedEffects: { reputation: -2, controversy: 7, followers: -650, projectBuzz: 0, mediaStance: -3, discussionHeat: 12, relationshipTension: 5, narrativeMomentum: -4 },
        outcomeLabel: 'BACKFIRED',
        summary: 'PR contained the backlash.',
    })),
    promotionAttributions: Array.from({ length: 190 }, (_, index) => ({
        schemaVersion: 1,
        id: `promotion_${index}`,
        attributionKey: index === 1 ? 'promotion-key-0' : `promotion-key-${index}`,
        publicationId: `post_${index}`,
        projectId: 'night_signal',
        projectName: 'Night Signal',
        channel: index === 189 ? 'NOT_REAL' : 'X',
        promotionType: 'PROJECT_PROMO',
        absoluteWeek: 2_500 + index,
        baseBuzzDelta: 3,
        fatigueMultiplier: 0.8,
        prMultiplier: 1.2,
        appliedBuzzDelta: 3,
    })),
    processedC7Keys: Array.from({ length: 700 }, (_, index) => `c7-key-${index}`),
});

assert.equal(normalized.schemaVersion, 7);
assert.equal(normalized.narratives.length, INDUSTRY_MEDIA_NARRATIVE_LIMIT);
assert.ok(normalized.narratives.every(item => item.landmarks.length <= INDUSTRY_MEDIA_NARRATIVE_LANDMARK_LIMIT));
assert.equal(new Set(normalized.narratives.map(item => item.narrativeKey)).size, normalized.narratives.length);
assert.ok(normalized.narratives.some(item => item.stage === 'DEFINING'));
assert.equal(normalized.mediaRelationships.length, INDUSTRY_MEDIA_RELATIONSHIP_LIMIT);
assert.ok(normalized.mediaRelationships.every(item => item.landmarkInteractionIds.length <= INDUSTRY_MEDIA_RELATIONSHIP_LANDMARK_LIMIT));
assert.ok(normalized.mediaRelationships.some(item => item.feudState === 'ACTIVE'));
assert.equal(normalized.prInterventions.length, INDUSTRY_MEDIA_PR_INTERVENTION_LIMIT);
assert.equal(normalized.promotionAttributions.length, INDUSTRY_MEDIA_PROMOTION_ATTRIBUTION_LIMIT);
assert.equal(normalized.processedC7Keys.length, INDUSTRY_MEDIA_C7_KEY_LIMIT);

const repairedNarrative = normalized.narratives.find(item => item.id === 'narrative_0');
assert.ok(repairedNarrative);
assert.equal(repairedNarrative.theme, 'AMBITIOUS_RISK_TAKER');
assert.equal(repairedNarrative.polarity, 'MIXED');
assert.equal(repairedNarrative.stage, 'EMERGING');
assert.equal(repairedNarrative.strength, 100);
assert.equal(repairedNarrative.confidence, 0);

const repairedRelationship = normalized.mediaRelationships.find(item => item.id === 'relationship_0');
assert.ok(repairedRelationship);
assert.equal(repairedRelationship.affinity, -100);
assert.equal(repairedRelationship.respect, 100);
assert.equal(repairedRelationship.trust, 0);
assert.equal(repairedRelationship.direction, 'STABLE');
assert.equal(repairedRelationship.feudState, 'NONE');

assert.equal(normalized.prInterventions.find(item => item.id === 'pr_189')?.tier, 'ROOKIE');
assert.equal(normalized.promotionAttributions.find(item => item.id === 'promotion_189')?.channel, 'X');

console.log('Industry media C7 state audit passed.');
