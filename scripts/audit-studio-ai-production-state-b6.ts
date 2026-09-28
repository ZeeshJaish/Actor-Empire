// @ts-nocheck - executable fixture intentionally exercises malformed legacy payloads.
import assert from 'node:assert/strict';
import {
    STUDIO_AI_PRODUCTION_KEY_LIMIT,
    STUDIO_AI_PRODUCTION_PROBLEM_LIMIT,
    normalizeStudioAiProductionRecord,
} from '../services/studioAi/studioAiProductionState';
import { normalizeIndustryProductions } from '../services/industryProductions';
import { INITIAL_PLAYER, type Player } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';

const problems = Array.from({ length: 7 }, (_, index) => ({
    id: `problem_${index}`,
    checkpoint: index % 2 ? 'PRODUCTION_35' : 'PRODUCTION_START',
    type: index % 2 ? 'OVERRUN' : 'DELAY',
    severity: 20 + index,
    occurredAtAbsoluteWeek: 100 + index,
    delayWeeks: index % 2,
    overrunMillions: index,
    qualityImpact: -index,
    response: index % 2 ? 'CONTINGENCY_SPEND' : 'SCHEDULE_EXTENSION',
    responseAppliedAtAbsoluteWeek: 101 + index,
}));

const normalized = normalizeStudioAiProductionRecord({
    schemaVersion: 999,
    source: 'STUDIO_INDEPENDENT',
    slateCommitmentId: 'commitment_1',
    fingerprintId: 'fingerprint_1',
    controllerAtLastProgression: 'AI',
    selectedReleaseMode: null,
    publicReleaseStrategy: null,
    talentSelected: false,
    talent: null,
    finalQuality: null,
    result: null,
    problems,
    processedKeys: Array.from({ length: 90 }, (_, index) => `key_${index}`),
    lastProgressedAbsoluteWeek: 900,
}, 500);

assert.ok(normalized);
assert.equal(normalized.schemaVersion, 1);
assert.equal(normalized.source, 'STUDIO_INDEPENDENT');
assert.equal(normalized.processedKeys.length, STUDIO_AI_PRODUCTION_KEY_LIMIT);
assert.equal(new Set(normalized.processedKeys).size, STUDIO_AI_PRODUCTION_KEY_LIMIT);
assert.equal(normalized.problems.length, STUDIO_AI_PRODUCTION_PROBLEM_LIMIT);
assert.deepEqual(normalized.problems.map(problem => problem.id), ['problem_4', 'problem_5', 'problem_6']);
assert.equal(normalized.lastProgressedAbsoluteWeek, 500);

assert.equal(normalizeStudioAiProductionRecord({
    source: 'PLATFORM_COMMISSION',
    slateCommitmentId: 'commitment_1',
    fingerprintId: 'fingerprint_1',
}, 50), null, 'the independent normalizer must not adopt platform execution records');
assert.equal(normalizeStudioAiProductionRecord({
    source: 'STUDIO_INDEPENDENT',
    slateCommitmentId: '',
    fingerprintId: 'fingerprint_1',
}, 50), null, 'malformed lineage must fail closed');

const calendar = {
    preProductionWeeks: 4,
    productionWeeks: 8,
    postProductionWeeks: 4,
    totalWeeks: 16,
    focusWindowWeeks: 12,
    elapsedWeeks: 0,
    startedAbsoluteWeek: 50,
};
const platformExecution = {
    standardDurationWeeks: 20,
    effectiveDurationWeeks: 18,
    qualityForecast: 70,
    executionRoll: 0.5,
    delayRoll: 0.4,
    overrunRoll: 0.3,
    failureRoll: 0.2,
    delayWeeks: 0,
    overrunMillions: 0,
    leadActorId: null,
    leadActorName: null,
    directorId: null,
    directorName: null,
    writerId: null,
    writerName: 'Commissioner Story Department',
    finalQuality: null,
    failureDecision: 'NONE',
    failureResponse: 'NONE',
    failureResponseAmountMillions: 0,
    failureResponseAppliedAtAbsoluteWeek: null,
    paidMilestoneIds: [],
    controllerAtLastProgression: 'AI',
    lastProgressedAbsoluteWeek: 50,
    holdReason: null,
};
const registry = normalizeIndustryProductions({
    independent: {
        id: 'independent',
        canonicalProjectId: 'project_independent',
        title: 'Glass Horizon',
        projectType: 'MOVIE',
        genre: 'DRAMA',
        producerStudioId: 'UNIVERSAL',
        source: 'STUDIO_INDEPENDENT',
        status: 'PLANNED',
        productionCalendar: calendar,
        budgetMillions: 80,
        paidMillions: 0,
        talentBookingIds: [],
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: 'Universal Story Department',
        writerSkill: 72,
        studioAiSlateCommitmentId: 'commitment_1',
        industryContentFingerprintId: 'fingerprint_1',
        studioAiExecution: normalized,
        createdAtAbsoluteWeek: 50,
        updatedAtAbsoluteWeek: 50,
    },
    commission: {
        id: 'commission',
        canonicalProjectId: 'project_commission',
        title: 'Signal Line',
        projectType: 'MOVIE',
        genre: 'THRILLER',
        producerStudioId: 'WARNER_BROS',
        commissioningPlatformId: 'NETFLIX',
        source: 'PLATFORM_COMMISSION',
        status: 'PRE_PRODUCTION',
        productionCalendar: calendar,
        budgetMillions: 100,
        paidMillions: 5,
        talentBookingIds: [],
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: 'Warner Story Department',
        writerSkill: 74,
        aiExecution: platformExecution,
        createdAtAbsoluteWeek: 50,
        updatedAtAbsoluteWeek: 50,
    },
}, 60);

assert.equal(registry.independent.source, 'STUDIO_INDEPENDENT');
const namedWriterProduction = normalizeIndustryProductions({ named: {
    ...registry.independent, id: 'named', canonicalProjectId: 'named_project', writerSource: 'NPC_WRITER',
    writerId: 'writer_npc_mira_sen', writerName: 'Mira Sen',
    studioAiExecution: { ...registry.independent.studioAiExecution, talentSelected: true,
        talent: { leadActorId: 'lead', leadActorName: 'Lead', directorId: 'director', directorName: 'Director',
            writerId: 'writer_npc_mira_sen', writerName: 'Mira Sen', packageScore: 80, estimatedCostMillions: 4,
            upfrontFeesMillions: { actor: 2, director: 1, writer: 1 },
            talentParticipation: { schemaVersion: 1, contracts: [{ contractId: 'writer', role: 'WRITER', roleId: 'writer',
                talentId: 'writer_npc_mira_sen', talentName: 'Mira Sen', upfrontFee: 1_000_000, backendPoints: 1,
                receiptsBasis: 'STUDIO_COLLECTED_TITLE_RECEIPTS' }], processedReceiptKeys: ['release:1'], lastSettledAbsoluteWeek: 55 },
        },
    },
} }, 60).named;
assert.equal(namedWriterProduction.writerId, 'writer_npc_mira_sen', 'Migration must retain an NPC writer ID.');
assert.equal(namedWriterProduction.studioAiExecution?.talent?.upfrontFeesMillions?.writer, 1);
assert.deepEqual(namedWriterProduction.studioAiExecution?.talent?.talentParticipation?.processedReceiptKeys, ['release:1'],
    'Migration must retain paid receipt keys to prevent duplicate backend.');
assert.equal(registry.independent.studioAiExecution?.slateCommitmentId, 'commitment_1');
assert.equal(registry.commission.source, 'PLATFORM_COMMISSION');
assert.deepEqual(registry.commission.aiExecution, platformExecution);

const saveFixture = structuredClone(INITIAL_PLAYER) as Player;
saveFixture.age = 20;
saveFixture.currentWeek = 10;
saveFixture.world.projects = [];
saveFixture.world.platforms = {};
saveFixture.world.industryProductions = Object.fromEntries([
    ...Array.from({ length: 110 }, (_, index) => [`released_${index}`, {
        ...registry.independent,
        id: `released_${index}`,
        canonicalProjectId: `released_project_${index}`,
        status: 'RELEASED',
        updatedAtAbsoluteWeek: index,
    }]),
    ['active_production', {
        ...registry.independent,
        id: 'active_production',
        canonicalProjectId: 'active_project',
        status: 'PRODUCTION',
        updatedAtAbsoluteWeek: 999,
    }],
]);
const compacted = compactPlayerForPersistence(saveFixture);
assert.equal(Object.keys(compacted.world.industryProductions || {}).length, 105);
assert.ok(compacted.world.industryProductions?.active_production, 'active B6 work must survive terminal compaction');

console.log('Studio AI B6 production state audit passed.');
