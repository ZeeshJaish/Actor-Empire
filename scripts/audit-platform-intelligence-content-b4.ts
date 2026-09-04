import assert from 'node:assert/strict';
import type { IndustryContentFingerprint, IndustryIntelligenceProposal, IndustryProject } from '../types';
import { normalizeWorldPlatformAi } from '../services/platformAi/platformAiState';
import { buildPlatformContentCandidatesForIntent } from '../services/platformAi/platformAiContentSourcing';
import { derivePlatformIntelligenceIntent } from '../services/platformAi/platformIntelligenceIntent';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const WEEK = 2_100;
const fixture = createPlatformAiFixture();
const base = normalizeWorldPlatformAi(fixture, structuredClone(fixture.world), WEEK);
const proposal: IndustryIntelligenceProposal = {
    id: 'content_proposal', idempotencyKey: 'content_key', companyId: 'NETFLIX', companyKind: 'STREAMING_PLATFORM', lane: 'CONTENT_STRATEGY',
    decisionCycle: 8, absoluteWeek: WEEK, actionFamily: 'DEVELOP_CONTENT', optionId: 'develop_content', urgency: 90, confidence: 80,
    expectedExposureMillions: 200, affordabilityCeilingMillions: 275,
    score: { total: 80, need: 90, strategyFit: 85, expectedUpside: 80, relationshipValue: 20, competitiveValue: 60, financialRisk: 5, capacityPressure: 4, fatigue: 0, executionRisk: 8 },
    reasonCodes: ['STRATEGIC_NEED'], uncertaintyKey: 'stable', status: 'SHADOW', nextReviewAbsoluteWeek: WEEK + 6, contentFingerprintId: 'fingerprint',
};
const makeFingerprint = (sourceIntent: IndustryContentFingerprint['sourceIntent']): IndustryContentFingerprint => ({
    id: 'fingerprint', seed: 'seed', ownerCompanyId: 'NETFLIX', ownerCompanyKind: 'STREAMING_PLATFORM', format: 'LIMITED_SERIES',
    primaryGenre: 'MYSTERY', subgenre: 'LOCKED_ROOM', tone: 'TENSE', theme: 'TRUST', setting: 'MOUNTAIN_TOWN', period: 'CONTEMPORARY',
    targetAudience: 'ADULT_MAINSTREAM', originalLanguage: 'HINDI', priorityMarket: 'INDIA', commercialIntent: 80, prestigeIntent: 78,
    creativeRisk: 64, starPowerTarget: 76, releasePath: 'STREAMING_FIRST', sourceIntent, relationship: 'STANDALONE',
    budgetSuitability: { minimumMillions: 80, idealLowMillions: 140, idealHighMillions: 310, ambitiousMaximumMillions: 450 },
    noveltySignature: 'fingerprint_sig', noveltyScore: 88, createdAtAbsoluteWeek: WEEK, decisionCycle: 8, lifecycle: 'SELECTED',
});

const originalIntent = derivePlatformIntelligenceIntent({ proposal, fingerprint: makeFingerprint('PLATFORM_ORIGINAL'), spendingRestricted: false });
let projectRead = false;
const noScanWorld = { ...base };
Object.defineProperty(noScanWorld, 'projects', {
    enumerable: true,
    get() { projectRead = true; throw new Error('original intent scanned the released-title universe'); },
});
const originalCandidates = buildPlatformContentCandidatesForIntent({ player: fixture, world: noScanWorld, platformId: 'NETFLIX', absoluteWeek: WEEK }, originalIntent);
assert.equal(projectRead, false);
assert.equal(originalCandidates.length, 1);
assert.equal(originalCandidates[0].source, 'COMMISSIONED_ORIGINAL');
assert.equal(originalCandidates[0].genre, 'MYSTERY');
assert.equal(originalCandidates[0].projectType, 'SERIES');
assert.equal(originalCandidates[0].productionBudgetMillions, 275);
assert.ok(originalCandidates[0].id.includes('platform_ai_candidate'));

const project: IndustryProject = {
    id: 'eligible_title', title: 'The Quiet Border', genre: 'DRAMA', mediaType: 'MOVIE', targetAudience: 'PG-13', studioId: 'UNIVERSAL',
    budgetTier: 'MID', quality: 84, rating: 8.1, boxOffice: 240_000_000, year: 39, weekReleased: 1,
    leadActorId: 'lead', leadActorName: 'Lead', directorName: 'Director', reviews: 'Strong.',
};
const rightsWorld = { ...structuredClone(base), projects: [project] };
const licenceIntent = derivePlatformIntelligenceIntent({ proposal, fingerprint: makeFingerprint('LICENSED_WORK'), spendingRestricted: false });
const licenceCandidates = buildPlatformContentCandidatesForIntent({ player: fixture, world: rightsWorld, platformId: 'NETFLIX', absoluteWeek: WEEK }, licenceIntent);
assert.ok(licenceCandidates.length > 0);
assert.ok(licenceCandidates.every(candidate => candidate.source === 'LICENSED_RELEASED_TITLE'));
assert.ok(licenceCandidates.every(candidate => candidate.sourceProjectIds[0] === project.id));

const acquisitionIntent = derivePlatformIntelligenceIntent({ proposal, fingerprint: makeFingerprint('ACQUIRED_IP'), spendingRestricted: false });
const impossible = buildPlatformContentCandidatesForIntent({ player: fixture, world: { ...rightsWorld, projects: [] }, platformId: 'NETFLIX', absoluteWeek: WEEK }, acquisitionIntent);
assert.deepEqual(impossible, [], 'an impossible acquired-IP intent must not silently become an original');
console.log('Platform Intelligence B4 content audit passed.');
