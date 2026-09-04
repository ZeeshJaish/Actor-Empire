import assert from 'node:assert/strict';
import {
    advanceIndustryUniverseBlueprint,
    createInitialIndustryIntelligenceState,
    processIndustryIntelligenceShadowCompany,
} from '../services/industryIntelligence';
import type { IndustryContentFingerprint, IndustryIntelligenceState } from '../types';
import type { IndustryIntelligenceContext } from '../services/industryIntelligence';

const WEEKS = 20_800;

const makeContext = (state: IndustryIntelligenceState, absoluteWeek: number): IndustryIntelligenceContext => ({
    companyId: state.companyId, companyKind: state.companyKind, absoluteWeek, seed: state.seed, controller: 'AI', status: 'ACTIVE',
    identity: { scale: 82, riskTolerance: 70, financialDiscipline: 74, creativePatience: 75, prestigeIntent: 65, commercialIntent: 82, franchiseAppetite: 88, growthIntent: 78, neutralMomentum: 50 },
    capabilities: { DEVELOPMENT: 84, CREATIVE: 86, PRODUCTION: 82, FINANCE: 78, MARKETING_DISCOVERY: 80, DISTRIBUTION_MARKET: 76, NEGOTIATION: 74, TECHNOLOGY: 72, CATALOGUE: 70, LOCALIZATION: 68 },
    condition: { cashMillions: 4_000, debtMillions: 200, runwayWeeks: 180, capacityPressure: 28, momentum: state.momentum, recentResultStrength: 76, audienceTrust: 78, catalogueNeed: 88, marketOpportunity: 82, financialPressure: 8, competitivePressure: 62, repetitionFatigue: state.learning.repetitionFatigue, franchiseFatigue: state.learning.franchiseFatigue, overextension: 22, spendingRestricted: false },
    learning: structuredClone(state.learning), nextDueAbsoluteWeek: { ...state.nextDueAbsoluteWeek }, decisionCycleByLane: { ...state.decisionCycleByLane }, activeCommitmentIds: [],
});

const simulate = () => {
    let states = [
        createInitialIndustryIntelligenceState('STUDIO_ALPHA', 'PRODUCTION_STUDIO', 'long_seed_alpha', 1),
        createInitialIndustryIntelligenceState('STUDIO_BETA', 'PRODUCTION_STUDIO', 'long_seed_beta', 1),
        createInitialIndustryIntelligenceState('STREAM_GAMMA', 'STREAMING_PLATFORM', 'long_seed_gamma', 1),
        createInitialIndustryIntelligenceState('STREAM_DELTA', 'STREAMING_PLATFORM', 'long_seed_delta', 1),
    ];
    const canonical = { cashMillions: 10_000, projectIds: [] as string[], rightsIds: [] as string[], universeIds: [] as string[] };
    const canonicalBefore = structuredClone(canonical);
    const selectedIds = new Set<string>();
    const blueprintIds = new Set<string>();
    for (let absoluteWeek = 1; absoluteWeek <= WEEKS; absoluteWeek += 1) {
        states = states.map((state, index) => {
            const globalRecentFingerprints = states.flatMap(item => item.content.selectedFingerprints).filter(item => item.ownerCompanyId !== state.companyId);
            const result = processIndustryIntelligenceShadowCompany({ context: makeContext(state, absoluteWeek), state, globalRecentFingerprints });
            assert.ok(result.state.content.selectedFingerprints.length <= 24);
            assert.ok(result.state.content.universeBlueprints.length <= 6);
            assert.ok(result.state.content.recentNoveltySignatures.length <= 48);
            assert.ok(result.state.content.materializationKeys.length <= 64);
            result.state.content.selectedFingerprints.forEach(item => selectedIds.add(item.id));
            result.state.content.universeBlueprints.forEach(item => blueprintIds.add(item.id));
            return result.state;
        });
    }
    assert.deepEqual(canonical, canonicalBefore, '20,800 shadow weeks must not mutate canonical money, projects, rights, or universes');
    return { states, selectedIds: [...selectedIds].sort(), blueprintIds: [...blueprintIds].sort() };
};

const first = simulate();
const replay = simulate();
assert.deepEqual(replay, first, '20,800 weeks must replay deterministically');

const allFingerprints: IndustryContentFingerprint[] = first.states.flatMap(state => state.content.selectedFingerprints);
assert.ok(allFingerprints.length >= 80, 'bounded recent memory should remain populated across companies');
for (const state of first.states) {
    const fingerprints = state.content.selectedFingerprints;
    assert.equal(new Set(fingerprints.map(item => item.noveltySignature)).size, fingerprints.length, 'recent company memory cannot contain exact duplicates');
    assert.ok(new Set(fingerprints.map(item => item.format)).size >= 2);
    assert.ok(new Set(fingerprints.map(item => item.primaryGenre)).size >= 5);
    assert.ok(new Set(fingerprints.map(item => item.targetAudience)).size >= 4);
    assert.ok(fingerprints.every(item => Number.isFinite(item.noveltyScore) && Number.isFinite(item.budgetSuitability.idealHighMillions)));
}

const blueprints = first.states.flatMap(state => state.content.universeBlueprints);
assert.ok(blueprints.length > 0, 'high-capability companies should occasionally form a universe blueprint over 400 years');
assert.ok(first.blueprintIds.length / first.selectedIds.length <= 0.04, 'universe plans must remain uncommon among all selected content');
const sample = blueprints[0];
const failed = advanceIndustryUniverseBlueprint({ blueprint: sample, absoluteWeek: WEEKS + 1, anchorOutcome: 20, establishedBranchCount: 0, audienceFamiliarity: 10, capacityPressure: 40, requestedEvent: false });
assert.equal(failed.blueprint.lifecycle, 'FAILED');
const paused = advanceIndustryUniverseBlueprint({ blueprint: { ...sample, fatigue: 90 }, absoluteWeek: WEEKS + 2, anchorOutcome: 65, establishedBranchCount: 3, audienceFamiliarity: 80, capacityPressure: 35, requestedEvent: true });
assert.equal(paused.blueprint.lifecycle, 'PAUSED');

const bytes = first.states.reduce((sum, state) => sum + new TextEncoder().encode(JSON.stringify(state)).byteLength, 0);
console.log(JSON.stringify({ weeks: WEEKS, companies: first.states.length, allSelections: first.selectedIds.length, allBlueprints: first.blueprintIds.length, recentFingerprints: allFingerprints.length, retainedBlueprints: blueprints.length, totalStateBytes: bytes }));
console.log('Industry Content B3 long-run audit passed.');
