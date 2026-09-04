import assert from 'node:assert/strict';
import { createCanonicalUniverseDraft, createIndustryContentMaterializationDraft, evaluateIndustryContentMaterialization } from '../services/industryIntelligence';
import type { IndustryContentFingerprint, IndustryUniverseBlueprint, Universe } from '../types';

const fingerprint: IndustryContentFingerprint = {
    id: 'fp_material', seed: 'material_seed', ownerCompanyId: 'NETFLIX', ownerCompanyKind: 'STREAMING_PLATFORM', format: 'SERIES', primaryGenre: 'SCI_FI', secondaryGenre: 'DRAMA', subgenre: 'CONSPIRACY', tone: 'TENSE', theme: 'TRUTH', setting: 'FUTURE_COLONY', period: 'NEAR_FUTURE', targetAudience: 'ADULT_MAINSTREAM', originalLanguage: 'ENGLISH', priorityMarket: 'GLOBAL', commercialIntent: 80, prestigeIntent: 65, creativeRisk: 60, starPowerTarget: 70, releasePath: 'STREAMING_FIRST', sourceIntent: 'PLATFORM_ORIGINAL', relationship: 'FOUND_UNIVERSE', budgetSuitability: { minimumMillions: 40, idealLowMillions: 70, idealHighMillions: 110, ambitiousMaximumMillions: 170 }, noveltySignature: 'material_signature', noveltyScore: 85, createdAtAbsoluteWeek: 700, decisionCycle: 5, lifecycle: 'SELECTED',
};
const blueprint: IndustryUniverseBlueprint = {
    id: 'bp_material', seed: 'bp_seed', ownerCompanyId: 'NETFLIX', ownerCompanyKind: 'STREAMING_PLATFORM', anchorFingerprintId: fingerprint.id, coreWorldSignature: 'FUTURE_COLONY|NEAR_FUTURE|TRUTH|SCI_FI', creativePillars: ['TRUTH', 'TENSE'], supportedFormats: ['SERIES', 'MOVIE'], branchFamilies: ['CORE'], currentSagaLabel: 'Origins', currentPhaseLabel: 'Foundation', plannedCadenceWeeks: 52, financialScale: 78, crossoverPotential: 70, confidence: 80, momentum: 60, fatigue: 5, lifecycle: 'PLANNED', createdAtAbsoluteWeek: 700, updatedAtAbsoluteWeek: 700,
};

assert.equal(evaluateIndustryContentMaterialization({ fingerprint, boundary: 'PRIVATE_SELECTION', sourceRightsEligible: false }).eligible, true, 'private selection requires no canonical rights transaction');
const licensed = { ...fingerprint, id: 'licensed', sourceIntent: 'LICENSED_WORK' as const, sourceRightId: undefined };
const denied = evaluateIndustryContentMaterialization({ fingerprint: licensed, boundary: 'PUBLIC_ANNOUNCEMENT', sourceRightsEligible: false });
assert.equal(denied.eligible, false);
assert.equal(denied.reason, 'MISSING_ELIGIBLE_SOURCE_RIGHT');

const eligibility = evaluateIndustryContentMaterialization({ fingerprint, boundary: 'PUBLIC_ANNOUNCEMENT', sourceRightsEligible: true });
assert.equal(eligibility.eligible, true);
const first = createIndustryContentMaterializationDraft({ fingerprint, eligibility });
const replay = createIndustryContentMaterializationDraft({ fingerprint: structuredClone(fingerprint), eligibility: structuredClone(eligibility) });
assert.deepEqual(replay, first, 'materialization drafts must replay exactly');
assert.equal(createIndustryContentMaterializationDraft({ fingerprint: { ...fingerprint, canonicalProjectId: 'project_existing' }, eligibility }).projectId, 'project_existing');

const registry: Record<string, Universe> = {};
const before = structuredClone(registry);
assert.throws(() => createCanonicalUniverseDraft({
    blueprint,
    fingerprint: { ...fingerprint, sourceIntent: 'LICENSED_WORK', sourceRightId: undefined },
    studioId: 'NETFLIX',
    sourceRightsEligible: false,
}), /eligible source right/i, 'universe materialization cannot bypass Project A rights eligibility');
const universe = createCanonicalUniverseDraft({ blueprint, fingerprint, studioId: 'NETFLIX', sourceRightsEligible: true, existingCanonicalUniverseId: undefined });
const universeReplay = createCanonicalUniverseDraft({ blueprint: structuredClone(blueprint), fingerprint: structuredClone(fingerprint), studioId: 'NETFLIX', sourceRightsEligible: true, existingCanonicalUniverseId: undefined });
assert.deepEqual(universeReplay, universe);
assert.deepEqual(registry, before, 'pure bridge must not insert into WorldState.universes');
assert.equal(universe.studioId, 'NETFLIX');
assert.equal(universe.ownerCompanyId, 'NETFLIX');
assert.equal(universe.ownerCompanyKind, 'STREAMING_PLATFORM');
assert.equal(universe.blueprintId, 'bp_material');
assert.equal(universe.originFingerprintId, 'fp_material');
assert.equal(createCanonicalUniverseDraft({ blueprint, fingerprint, studioId: 'NETFLIX', sourceRightsEligible: true, existingCanonicalUniverseId: 'existing_universe' }).id, 'existing_universe');

console.log('Industry Content B3 materialization audit passed.');
