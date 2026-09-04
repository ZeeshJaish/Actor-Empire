import assert from 'node:assert/strict';
import { derivePlatformIntelligenceIntent } from '../services/platformAi/platformIntelligenceIntent';
import type { IndustryContentFingerprint, IndustryIntelligenceProposal } from '../types';

const score = { total: 80, need: 90, strategyFit: 80, expectedUpside: 75, relationshipValue: 20, competitiveValue: 60, financialRisk: 5, capacityPressure: 5, fatigue: 0, executionRisk: 10 };
const proposal = (lane: IndustryIntelligenceProposal['lane'], actionFamily: string): IndustryIntelligenceProposal => ({
    id: `proposal_${lane}_${actionFamily}`, idempotencyKey: `key_${lane}_${actionFamily}`,
    companyId: 'NETFLIX', companyKind: 'STREAMING_PLATFORM', lane, decisionCycle: 4,
    absoluteWeek: 120, actionFamily, optionId: actionFamily.toLowerCase(), urgency: 90, confidence: 82,
    expectedExposureMillions: 240, affordabilityCeilingMillions: 310, score,
    reasonCodes: ['STRATEGIC_NEED'], uncertaintyKey: 'stable', status: 'SHADOW', nextReviewAbsoluteWeek: 126,
    contentFingerprintId: lane === 'CONTENT_STRATEGY' ? 'fp' : undefined,
});
const fingerprint = (sourceIntent: IndustryContentFingerprint['sourceIntent']): IndustryContentFingerprint => ({
    id: 'fp', seed: 'seed', ownerCompanyId: 'NETFLIX', ownerCompanyKind: 'STREAMING_PLATFORM', format: 'LIMITED_SERIES',
    primaryGenre: 'THRILLER', subgenre: 'CONSPIRACY', tone: 'TENSE', theme: 'POWER', setting: 'METROPOLIS', period: 'CONTEMPORARY',
    targetAudience: 'ADULT_MAINSTREAM', originalLanguage: 'HINDI', priorityMarket: 'INDIA', commercialIntent: 82, prestigeIntent: 70,
    creativeRisk: 62, starPowerTarget: 74, releasePath: 'STREAMING_FIRST', sourceIntent, relationship: 'STANDALONE',
    budgetSuitability: { minimumMillions: 70, idealLowMillions: 130, idealHighMillions: 360, ambitiousMaximumMillions: 520 },
    noveltySignature: 'sig', noveltyScore: 84, createdAtAbsoluteWeek: 120, decisionCycle: 4, lifecycle: 'SELECTED',
});

const original = derivePlatformIntelligenceIntent({ proposal: proposal('CONTENT_STRATEGY', 'DEVELOP_CONTENT'), fingerprint: fingerprint('PLATFORM_ORIGINAL'), spendingRestricted: false });
assert.equal(original.route, 'COMMISSION_ORIGINAL');
assert.equal(original.projectType, 'SERIES');
assert.equal(original.primaryGenre, 'THRILLER');
assert.equal(original.targetBudgetMillions, 310, 'fingerprint budget must be capped by proposal affordability');
assert.equal(original.priorityMarket, 'INDIA');

const playerCommission = derivePlatformIntelligenceIntent({ proposal: proposal('CONTENT_STRATEGY', 'DEVELOP_CONTENT'), fingerprint: fingerprint('INDIVIDUAL_COMMISSION'), spendingRestricted: false });
assert.equal(playerCommission.route, 'COMMISSION_ORIGINAL');
assert.equal(playerCommission.preferPlayerStudio, true);
assert.equal(derivePlatformIntelligenceIntent({ proposal: proposal('CONTENT_STRATEGY', 'DEVELOP_CONTENT'), fingerprint: fingerprint('LICENSED_WORK'), spendingRestricted: false }).route, 'LICENSE_TITLE');
assert.equal(derivePlatformIntelligenceIntent({ proposal: proposal('CONTENT_STRATEGY', 'DEVELOP_CONTENT'), fingerprint: fingerprint('ACQUIRED_IP'), spendingRestricted: false }).route, 'ACQUIRE_CATALOGUE');

assert.equal(derivePlatformIntelligenceIntent({ proposal: proposal('CAPABILITY_GROWTH', 'RESEARCH_TECHNOLOGY'), spendingRestricted: false }).route, 'RESEARCH_TECHNOLOGY');
assert.equal(derivePlatformIntelligenceIntent({ proposal: proposal('CAPABILITY_GROWTH', 'RESEARCH_LOCALIZATION'), spendingRestricted: false }).route, 'RESEARCH_LOCALIZATION');
assert.equal(derivePlatformIntelligenceIntent({ proposal: proposal('MARKET_EXPANSION', 'ENTER_MARKET'), spendingRestricted: false }).route, 'ENTER_MARKET');
assert.equal(derivePlatformIntelligenceIntent({ proposal: proposal('MARKET_EXPANSION', 'LOCALIZE_CATALOGUE'), spendingRestricted: false }).route, 'LOCALIZE_COMMITTED_CONTENT');
assert.equal(derivePlatformIntelligenceIntent({ proposal: proposal('FINANCE_REVIEW', 'HOLD'), spendingRestricted: false }).route, 'HOLD');

const missing = derivePlatformIntelligenceIntent({ proposal: proposal('CONTENT_STRATEGY', 'DEVELOP_CONTENT'), spendingRestricted: false });
assert.equal(missing.route, 'HOLD');
assert.equal(missing.blockReason, 'MISSING_FINGERPRINT');
const restricted = derivePlatformIntelligenceIntent({ proposal: proposal('CONTENT_STRATEGY', 'DEVELOP_CONTENT'), fingerprint: fingerprint('PLATFORM_ORIGINAL'), spendingRestricted: true });
assert.equal(restricted.route, 'HOLD');
assert.equal(restricted.blockReason, 'SPENDING_RESTRICTED');

const replay = derivePlatformIntelligenceIntent({ proposal: proposal('CONTENT_STRATEGY', 'DEVELOP_CONTENT'), fingerprint: fingerprint('PLATFORM_ORIGINAL'), spendingRestricted: false });
assert.deepEqual(replay, original, 'identical saved facts must replay to an identical intent');
console.log('Platform Intelligence B4 intent audit passed.');
