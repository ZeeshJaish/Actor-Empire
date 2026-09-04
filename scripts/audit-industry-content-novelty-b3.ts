import assert from 'node:assert/strict';
import { scoreIndustryContentNovelty, selectIndustryContentCandidate } from '../services/industryIntelligence';
import type { IndustryContentFingerprint } from '../types';

const make = (id: string, overrides: Partial<IndustryContentFingerprint> = {}): IndustryContentFingerprint => ({
    id, seed: id, ownerCompanyId: 'STUDIO', ownerCompanyKind: 'PRODUCTION_STUDIO', format: 'MOVIE',
    primaryGenre: 'DRAMA', secondaryGenre: 'THRILLER', subgenre: 'CONSPIRACY', tone: 'TENSE', theme: 'LOYALTY',
    setting: 'METROPOLIS', period: 'CONTEMPORARY', targetAudience: 'ADULT_MAINSTREAM', originalLanguage: 'ENGLISH',
    priorityMarket: 'NORTH_AMERICA', commercialIntent: 65, prestigeIntent: 60, creativeRisk: 50, starPowerTarget: 55,
    releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL', relationship: 'STANDALONE',
    budgetSuitability: { minimumMillions: 10, idealLowMillions: 20, idealHighMillions: 35, ambitiousMaximumMillions: 55 },
    noveltySignature: `${id}_signature`, noveltyScore: 50, createdAtAbsoluteWeek: 100, decisionCycle: 1, lifecycle: 'SELECTED',
    ...overrides,
});

const prior = make('prior', { noveltySignature: 'exact', createdAtAbsoluteWeek: 195 });
const exact = make('exact', { noveltySignature: 'exact', createdAtAbsoluteWeek: 200 });
const exactScore = scoreIndustryContentNovelty(exact, { companyRecent: [prior], globalRecent: [], currentAbsoluteWeek: 200, franchiseFatigue: 0 });
assert.equal(exactScore.eligible, false);
assert.ok(exactScore.reasonCodes.includes('EXACT_DUPLICATE'));

const near = make('near', { noveltySignature: 'near', setting: 'SMALL_TOWN', createdAtAbsoluteWeek: 200 });
const independent = make('independent', {
    noveltySignature: 'independent', format: 'LIMITED_SERIES', primaryGenre: 'SCI_FI', secondaryGenre: 'ADVENTURE',
    subgenre: 'SURVIVAL', tone: 'HOPEFUL', theme: 'IDENTITY', setting: 'DEEP_SPACE', period: 'DISTANT_FUTURE',
    targetAudience: 'GLOBAL_FOUR_QUADRANT', originalLanguage: 'KOREAN', releasePath: 'STREAMING_FIRST', createdAtAbsoluteWeek: 200,
});
const nearScore = scoreIndustryContentNovelty(near, { companyRecent: [prior], globalRecent: [], currentAbsoluteWeek: 200, franchiseFatigue: 0 });
const independentScore = scoreIndustryContentNovelty(independent, { companyRecent: [prior], globalRecent: [], currentAbsoluteWeek: 200, franchiseFatigue: 0 });
assert.ok(nearScore.score < independentScore.score, 'a recent near-copy must score below an independent idea');

const oldScore = scoreIndustryContentNovelty(near, { companyRecent: [{ ...prior, createdAtAbsoluteWeek: 20 }], globalRecent: [], currentAbsoluteWeek: 200, franchiseFatigue: 0 });
assert.ok(oldScore.score > nearScore.score, 'repetition pressure must decay with age');

const sequel = make('sequel', { noveltySignature: 'sequel', relationship: 'SEQUEL', sourceIntent: 'SEQUEL', relatedFingerprintId: 'prior', createdAtAbsoluteWeek: 200 });
const sequelScore = scoreIndustryContentNovelty(sequel, { companyRecent: [prior], globalRecent: [], currentAbsoluteWeek: 200, franchiseFatigue: 30 });
assert.equal(sequelScore.eligible, true, 'continuity remains possible');
assert.ok(sequelScore.reasonCodes.includes('CONTINUITY_FATIGUE'));

const candidates = [near, independent, sequel];
const selected = selectIndustryContentCandidate(candidates, { companyRecent: [prior], globalRecent: [], currentAbsoluteWeek: 200, franchiseFatigue: 0 });
const reordered = selectIndustryContentCandidate([...candidates].reverse(), { companyRecent: [prior], globalRecent: [], currentAbsoluteWeek: 200, franchiseFatigue: 0 });
assert.equal(selected?.id, reordered?.id, 'winner selection must not depend on input array order');
assert.equal(selected?.id, 'independent');
assert.ok((selected?.noveltyScore || 0) > 50);

console.log('Industry Content B3 novelty audit passed.');
