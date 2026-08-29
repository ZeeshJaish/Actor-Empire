import assert from 'node:assert/strict';
import type {
    IndustryProductionCommitment,
    IndustryTalentBooking,
    PlatformAiContentPlan,
    PlatformId,
    Player,
    StudioId,
    WorldState,
} from '../types';
import { PLATFORM_AI_RUNTIME_SCHEMA_VERSION } from '../types';
import * as platformAi from '../services/platformAi';
import { STUDIO_CATALOG } from '../services/studioLogic';
import { NPC_DATABASE } from '../services/npcLogic';
import { resolveStudioController } from '../services/platformAi/platformAiState';
import { normalizeIndustryProductions } from '../services/industryProductions';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const ABSOLUTE_WEEK = 2_092;
const roundMillions = (value: number): number => Math.round(value * 100) / 100;

type CommissionResult = {
    world: WorldState;
    changed: boolean;
    plan: PlatformAiContentPlan | null;
    production: IndustryProductionCommitment | null;
    reason?: string;
};

type ProgressResult = CommissionResult;

assert.equal(
    typeof (platformAi as Record<string, unknown>).commissionPlatformAiOriginal,
    'function',
    'Phase 3B must expose deterministic original commissioning.',
);
assert.equal(
    typeof (platformAi as Record<string, unknown>).progressPlatformAiProduction,
    'function',
    'Phase 3B must expose producer-owned production progression.',
);

const {
    buildPlatformContentCandidates,
    commitPlatformContentCandidate,
    commissionPlatformAiOriginal,
    normalizeWorldPlatformAi,
    progressPlatformAiProduction,
    selectPlatformAiProducer,
    selectPlatformAiTalent,
} = platformAi as typeof platformAi & {
    commissionPlatformAiOriginal(input: {
        player: Player;
        world: WorldState;
        platformId: PlatformId;
        planId: string;
        absoluteWeek: number;
    }): CommissionResult;
    progressPlatformAiProduction(input: {
        player: Player;
        world: WorldState;
        platformId: PlatformId;
        planId: string;
        absoluteWeek: number;
    }): ProgressResult;
};

const createWorld = (player: Player): WorldState => normalizeWorldPlatformAi(
    player,
    structuredClone(player.world),
    ABSOLUTE_WEEK,
);

const createOriginalBrief = (
    player: Player,
    platformId: PlatformId,
    productionSkill: number,
): { world: WorldState; plan: PlatformAiContentPlan } => {
    const world = createWorld(player);
    world.platforms![platformId].ai!.competence.production = productionSkill;
    const candidates = buildPlatformContentCandidates({ player, world, platformId, absoluteWeek: ABSOLUTE_WEEK });
    const original = candidates.find(candidate => candidate.source === 'COMMISSIONED_ORIGINAL');
    assert.ok(original, `${platformId} should produce an original candidate.`);
    const committed = commitPlatformContentCandidate({
        player,
        world,
        platformId,
        absoluteWeek: ABSOLUTE_WEEK,
        candidate: original,
    });
    assert.equal(committed.changed, true, `${platformId} should commit its original brief.`);
    assert.ok(committed.plan);
    return { world: committed.world, plan: committed.plan! };
};

const getProduction = (world: WorldState, id: string): IndustryProductionCommitment => {
    const production = world.industryProductions?.[id];
    assert.ok(production, `Expected industry production ${id}.`);
    return production;
};

const getPlan = (world: WorldState, platformId: PlatformId, id: string): PlatformAiContentPlan => {
    const plan = world.platforms?.[platformId].ai?.slate.find(item => item.id === id);
    assert.ok(plan, `Expected platform plan ${id}.`);
    return plan;
};

const commission = (
    player: Player,
    world: WorldState,
    platformId: PlatformId,
    planId: string,
    absoluteWeek = ABSOLUTE_WEEK,
): CommissionResult => commissionPlatformAiOriginal({
    player,
    world,
    platformId,
    planId,
    absoluteWeek,
});

const fixture = createPlatformAiFixture();
const dynamicProducerPlayer = structuredClone(fixture);
const dynamicProducerId = 'npc_venture_audit_producer';
dynamicProducerPlayer.world.npcVentures = {
    ...(dynamicProducerPlayer.world.npcVentures || {}),
    [dynamicProducerId]: {
        id: dynamicProducerId,
        name: 'Northstar Storyworks',
        ownerNpcId: 'npc_dynamic_producer_owner',
        ownerName: 'Dynamic Producer Owner',
        archetype: 'PRESTIGE_LABEL',
        status: 'ACTIVE',
        valuation: 0.42,
        cashReserve: 220,
        hype: 78,
        reputation: 86,
        creativeQuality: 91,
        risk: 32,
        foundedWeek: 4,
        foundedYear: 14,
        lastProjectWeek: 38,
        nextProjectWeek: 50,
        projectsReleased: 5,
        hits: 3,
        flops: 0,
        history: [],
    },
};
dynamicProducerPlayer.world.studios = {
    ...(dynamicProducerPlayer.world.studios || {}),
    [dynamicProducerId]: {
        id: dynamicProducerId,
        name: 'Northstar Storyworks',
        valuation: 0.42,
        reputation: 86,
        cashReserve: 220,
        recentHits: 3,
        archetype: 'PRESTIGE LABEL',
        ownerNpcId: 'npc_dynamic_producer_owner',
        ownerName: 'Dynamic Producer Owner',
        isNpcVenture: true,
    },
};
assert.equal(selectPlatformAiProducer({
    player: dynamicProducerPlayer,
    platformId: 'HULU',
    planId: 'audit-dynamic-producer-selection',
    preferredStudioId: dynamicProducerId,
    genre: 'DRAMA',
    budgetMillions: 55,
}), dynamicProducerId, 'A proven active NPC venture must be eligible for a matching platform production mandate.');
dynamicProducerPlayer.world.npcVentures[dynamicProducerId].status = 'CLOSED';
assert.notEqual(selectPlatformAiProducer({
    player: dynamicProducerPlayer,
    platformId: 'HULU',
    planId: 'audit-closed-dynamic-producer-selection',
    preferredStudioId: dynamicProducerId,
    genre: 'DRAMA',
    budgetMillions: 55,
}), dynamicProducerId, 'Closed NPC ventures must never receive new platform production mandates.');
dynamicProducerPlayer.world.npcVentures[dynamicProducerId].status = 'ACTIVE';
const selectDynamicAuditProducer = (player: Player, planId: string) => selectPlatformAiProducer({
    player,
    platformId: 'HULU',
    planId,
    preferredStudioId: dynamicProducerId,
    genre: 'DRAMA',
    budgetMillions: 55,
});
const insolventDynamicProducer = structuredClone(dynamicProducerPlayer);
insolventDynamicProducer.world.npcVentures![dynamicProducerId].cashReserve = 4;
assert.notEqual(selectDynamicAuditProducer(insolventDynamicProducer, 'audit-insolvent-dynamic-producer'), dynamicProducerId);
const overloadedDynamicProducer = structuredClone(dynamicProducerPlayer);
overloadedDynamicProducer.world.industryProductions = Object.fromEntries([0, 1, 2].map(index => ([
    `audit-overload-${index}`,
    { id: `audit-overload-${index}`, producerStudioId: dynamicProducerId, status: 'PRODUCTION' },
]))) as Record<string, IndustryProductionCommitment>;
assert.notEqual(selectDynamicAuditProducer(overloadedDynamicProducer, 'audit-overloaded-dynamic-producer'), dynamicProducerId);
const playerControlledDynamicProducer = structuredClone(dynamicProducerPlayer);
playerControlledDynamicProducer.businesses.push({
    id: dynamicProducerId,
    type: 'PRODUCTION_HOUSE',
} as any);
assert.notEqual(selectDynamicAuditProducer(playerControlledDynamicProducer, 'audit-player-controlled-dynamic-producer'), dynamicProducerId);
assert.equal(
    selectDynamicAuditProducer(dynamicProducerPlayer, 'audit-repeat-dynamic-producer'),
    selectDynamicAuditProducer(structuredClone(dynamicProducerPlayer), 'audit-repeat-dynamic-producer'),
    'Dynamic producer ranking must be deterministic across save/reload clones.',
);
const dynamicProducerBrief = createOriginalBrief(dynamicProducerPlayer, 'HULU', 7);
const dynamicProducerPlan = dynamicProducerBrief.world.platforms!.HULU.ai!.slate
    .find(item => item.id === dynamicProducerBrief.plan.id)!;
dynamicProducerPlan.sourceStudioId = dynamicProducerId;
const dynamicProducerCashBefore = dynamicProducerBrief.world.npcVentures![dynamicProducerId].cashReserve;
const dynamicProducerCommission = commission(
    dynamicProducerPlayer,
    dynamicProducerBrief.world,
    'HULU',
    dynamicProducerBrief.plan.id,
);
assert.equal(dynamicProducerCommission.production?.producerStudioId, dynamicProducerId);
assert.equal(dynamicProducerCommission.production?.writerName, 'Northstar Storyworks Story Department');
assert.equal(
    dynamicProducerCommission.world.npcVentures?.[dynamicProducerId].cashReserve,
    roundMillions(dynamicProducerCashBefore + dynamicProducerBrief.plan.productionFundingMillions * 0.05),
    'A dynamic producer must retain its commissioning payment in the canonical NPC venture ledger.',
);
assert.equal(
    dynamicProducerCommission.world.studios?.[dynamicProducerId].cashReserve,
    dynamicProducerCommission.world.npcVentures?.[dynamicProducerId].cashReserve,
    'The NPC venture and studio compatibility projection must agree after commissioning.',
);

const skillSevenBrief = createOriginalBrief(fixture, 'HULU', 7);
assert.equal(skillSevenBrief.plan.marketingReserveMillions, 9.13, 'Original briefs must disclose a ten-percent marketing reserve.');
assert.equal(skillSevenBrief.plan.contingencyMillions, 7.3, 'Original briefs must disclose an eight-percent contingency reserve.');
const inactiveCommissionWorld = structuredClone(skillSevenBrief.world);
inactiveCommissionWorld.platforms!.HULU.ai!.status = 'DISTRESSED';
const inactiveCommissionBefore = structuredClone(inactiveCommissionWorld);
const inactiveCommission = commission(fixture, inactiveCommissionWorld, 'HULU', skillSevenBrief.plan.id);
assert.equal(inactiveCommission.changed, false);
assert.equal(inactiveCommission.reason, 'COMPANY_INACTIVE');
assert.deepEqual(inactiveCommission.world, inactiveCommissionBefore, 'Inactive commissioning must reserve no talent, spend no cash, and create no production.');

const hundredCommissionDecisions = Array.from({ length: 100 }, (_, index) => ({
    id: `commission-history-${index}`,
    absoluteWeek: index,
    type: 'AUDIT_HISTORY',
    summary: `Decision ${index}`,
    reason: 'Fixture',
    cashImpactMillions: 0,
}));
const boundedCommissionWorld = structuredClone(skillSevenBrief.world);
boundedCommissionWorld.platforms!.HULU.ai!.decisionHistory = hundredCommissionDecisions;
const boundedCommission = commission(fixture, boundedCommissionWorld, 'HULU', skillSevenBrief.plan.id);
assert.equal(boundedCommission.changed, true);
assert.equal(boundedCommission.world.platforms!.HULU.ai!.decisionHistory.length, 40);
assert.equal(boundedCommission.world.platforms!.HULU.ai!.decisionHistory[0].id, 'commission-history-61');
assert.equal(boundedCommission.world.platforms!.HULU.ai!.decisionHistory.at(-1)?.type, 'ORIGINAL_COMMISSION');

const firstCommission = commission(fixture, skillSevenBrief.world, 'HULU', skillSevenBrief.plan.id);
const secondCommissionFromSameInput = commission(fixture, skillSevenBrief.world, 'HULU', skillSevenBrief.plan.id);

assert.equal(firstCommission.changed, true);
assert.deepEqual(firstCommission, secondCommissionFromSameInput, 'Commissioning and talent selection must be deterministic.');
assert.ok(firstCommission.production);
assert.ok(firstCommission.plan?.industryProductionId);
assert.equal('production' in firstCommission.plan!, false, 'Platform plans must never nest production state.');
assert.equal(firstCommission.world.projects.length, skillSevenBrief.world.projects.length, 'Commissioning reserves a canonical ID without creating a released project.');
assert.equal(Object.keys(firstCommission.world.industryProductions || {}).length, 1);
assert.equal(
    Math.round((skillSevenBrief.world.platforms!.HULU.cashReserve - firstCommission.world.platforms!.HULU.cashReserve) * 100) / 100,
    16.43,
    'Commissioning must fund the disclosed marketing and contingency reserves exactly once.',
);
assert.equal(firstCommission.plan?.paidSpendMillions, 20.99, 'The plan ledger must include its deposit and both funded reserves.');
const fundedEscrow = (firstCommission.plan as unknown as Record<string, any>)?.productionEscrow;
assert.equal(
    firstCommission.world.platforms!.HULU.ai!.schemaVersion,
    PLATFORM_AI_RUNTIME_SCHEMA_VERSION,
    'Funded escrow provenance must survive the current Platform AI schema migration.',
);
assert.equal(fundedEscrow?.status, 'FUNDED', 'Commissioning must persist explicit funded escrow provenance.');
assert.equal(fundedEscrow?.marketingCampaignMillions, 9.13);
assert.equal(fundedEscrow?.marketingBalanceMillions, 9.13);
assert.equal(fundedEscrow?.contingencyBalanceMillions, 7.3);
assert.equal(typeof fundedEscrow?.fundingId, 'string');
assert.equal(fundedEscrow?.fundedAtAbsoluteWeek, ABSOLUTE_WEEK);

const actorTemplate = NPC_DATABASE.find(npc => npc.occupation === 'ACTOR')!;
const directorTemplate = NPC_DATABASE.find(npc => npc.occupation === 'DIRECTOR')!;
const memoryPlayer = structuredClone(fixture);
memoryPlayer.flags.extraNPCs = [
    { ...actorTemplate, id: 'audit-memory-actor-a', name: 'Memory Actor A', tier: 'ICON', prestigeBias: 'PRESTIGE' },
    { ...actorTemplate, id: 'audit-memory-actor-b', name: 'Memory Actor B', tier: 'ICON', prestigeBias: 'PRESTIGE' },
    { ...directorTemplate, id: 'audit-memory-director-a', name: 'Memory Director A', tier: 'ICON', prestigeBias: 'PRESTIGE' },
    { ...directorTemplate, id: 'audit-memory-director-b', name: 'Memory Director B', tier: 'ICON', prestigeBias: 'PRESTIGE' },
];
const memorySelectionInput = {
    player: memoryPlayer,
    platformId: 'HULU' as const,
    canonicalProjectId: 'audit-memory-next-project',
    genre: 'DRAMA' as const,
    productionCalendar: firstCommission.production!.productionCalendar,
    bookings: [],
};
const baselineMemorySelection = selectPlatformAiTalent(memorySelectionInput)!;
const rewardedActorId = baselineMemorySelection.leadActor.id === 'audit-memory-actor-a'
    ? 'audit-memory-actor-b'
    : 'audit-memory-actor-a';
const rewardedDirectorId = baselineMemorySelection.director.id === 'audit-memory-director-a'
    ? 'audit-memory-director-b'
    : 'audit-memory-director-a';
const learnedMemorySelection = selectPlatformAiTalent({
    ...memorySelectionInput,
    releaseMemory: [0, 1].map(index => ({
        projectId: `audit-memory-hit-${index}`,
        releasedAtAbsoluteWeek: ABSOLUTE_WEEK - index,
        genre: 'DRAMA' as const,
        targetAudience: 'PG-13' as const,
        leadActorId: rewardedActorId,
        directorId: rewardedDirectorId,
        quality: 90,
        commercialScore: 92,
        prestigeScore: 88,
        subscriberImpactMillions: 1.2,
        outcome: 'HIT' as const,
        awardWins: 0,
        observedAwardKeys: [],
    })),
} as any)!;
assert.equal(learnedMemorySelection.leadActor.id, rewardedActorId, 'Recent hit memory must be able to change the next actor choice.');
assert.equal(learnedMemorySelection.director.id, rewardedDirectorId, 'Recent hit memory must be able to change the next director choice.');

// Legacy and malformed saves must never turn disclosure estimates into cash.
const legacyReserveWorld = structuredClone(firstCommission.world);
const legacyReservePlatform = legacyReserveWorld.platforms!.HULU;
(legacyReservePlatform.ai as unknown as Record<string, any>).schemaVersion = 5;
const legacyReservePlan = getPlan(legacyReserveWorld, 'HULU', skillSevenBrief.plan.id);
legacyReservePlan.marketingReserveMillions = 900;
legacyReservePlan.contingencyMillions = 800;
(legacyReservePlan as unknown as Record<string, any>).productionEscrow = {
    status: 'FUNDED',
    fundingId: 'forged-legacy-funding',
    marketingCampaignMillions: 900,
    marketingBalanceMillions: 900,
    contingencyBalanceMillions: 800,
    fundedAtAbsoluteWeek: ABSOLUTE_WEEK,
    settledAtAbsoluteWeek: null,
    settlementReason: null,
};
legacyReserveWorld.industryProductions![firstCommission.production!.id].status = 'CANCELLED';
const normalizedLegacyReserveWorld = normalizeWorldPlatformAi(fixture, legacyReserveWorld, ABSOLUTE_WEEK + 1);
const normalizedLegacyReservePlan = getPlan(normalizedLegacyReserveWorld, 'HULU', skillSevenBrief.plan.id);
assert.equal((normalizedLegacyReservePlan as unknown as Record<string, any>).productionEscrow?.status, 'UNFUNDED');
assert.equal(normalizedLegacyReservePlan.marketingReserveMillions, 0);
assert.equal(normalizedLegacyReservePlan.contingencyMillions, 0);
const legacyReserveCash = normalizedLegacyReserveWorld.platforms!.HULU.cashReserve;
const legacyReserveCancellation = progressPlatformAiProduction({
    player: fixture,
    world: normalizedLegacyReserveWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 2,
});
assert.equal(legacyReserveCancellation.world.platforms!.HULU.cashReserve, legacyReserveCash, 'Unfunded legacy reserve estimates must refund zero cash.');

const tamperedReserveWorld = structuredClone(firstCommission.world);
const tamperedReservePlan = getPlan(tamperedReserveWorld, 'HULU', skillSevenBrief.plan.id);
tamperedReservePlan.marketingReserveMillions = 999;
tamperedReservePlan.contingencyMillions = 999;
const tamperedEscrow = (tamperedReservePlan as unknown as Record<string, any>).productionEscrow;
tamperedEscrow.marketingBalanceMillions = 999;
tamperedEscrow.contingencyBalanceMillions = 999;
const normalizedTamperedReserveWorld = normalizeWorldPlatformAi(fixture, tamperedReserveWorld, ABSOLUTE_WEEK + 1);
const normalizedTamperedReservePlan = getPlan(normalizedTamperedReserveWorld, 'HULU', skillSevenBrief.plan.id);
assert.equal(normalizedTamperedReservePlan.marketingReserveMillions, 9.13, 'Tampered balances must be clamped to the funded receipt.');
assert.equal(normalizedTamperedReservePlan.contingencyMillions, 7.3, 'Tampered contingency must be clamped to the funded receipt.');

const production = firstCommission.production!;
const boundedProductionWorld = structuredClone(firstCommission.world);
boundedProductionWorld.platforms!.HULU.ai!.decisionHistory = hundredCommissionDecisions.map(decision => ({ ...decision, id: decision.id.replace('commission', 'production') }));
const boundedProductionRecord = boundedProductionWorld.industryProductions![production.id];
boundedProductionRecord.status = 'POST_PRODUCTION';
boundedProductionRecord.productionCalendar.elapsedWeeks = boundedProductionRecord.productionCalendar.totalWeeks - 1;
const boundedProduction = progressPlatformAiProduction({
    player: fixture,
    world: boundedProductionWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 100,
});
assert.equal(boundedProduction.changed, true);
assert.equal(boundedProduction.world.platforms!.HULU.ai!.decisionHistory.length, 40, 'Production decisions retain only the newest 40 events.');
assert.ok(boundedProduction.world.platforms!.HULU.ai!.decisionHistory.at(-1)?.type.startsWith('PRODUCTION_'));
const execution = production.aiExecution;
assert.ok(execution, 'AI production results must live on the producer-owned production record.');
assert.equal(execution.standardDurationWeeks, 20);
assert.equal(execution.effectiveDurationWeeks, 18, 'Skill 7 AI production should use the 18-week threshold.');
assert.equal(production.writerSource, 'IN_HOUSE_TEAM');
assert.equal(production.writerId, null, 'Writers remain a virtual in-house team, not a fake NPC.');
assert.ok(execution.leadActorId?.startsWith('celeb_act_'), 'Commissioning must select a real stable actor NPC.');
assert.ok(execution.directorId?.startsWith('celeb_dir_'), 'Commissioning must select a real stable director NPC.');
assert.ok(STUDIO_CATALOG[production.producerStudioId]);
assert.notEqual(STUDIO_CATALOG[production.producerStudioId].archetype, 'PLATFORM');
assert.equal(resolveStudioController(fixture, production.producerStudioId), 'AI');
assert.deepEqual(
    Object.keys(execution).filter(key => key.endsWith('Roll')).sort(),
    ['delayRoll', 'executionRoll', 'failureRoll', 'overrunRoll'],
    'All deterministic risk rolls must be persisted.',
);
assert.ok(Number.isFinite(execution.delayWeeks));
assert.ok(Number.isFinite(execution.overrunMillions));
assert.ok(execution.failureDecision);
assert.deepEqual(
    normalizeIndustryProductions(firstCommission.world.industryProductions)[production.id]?.aiExecution,
    execution,
    'Save normalization must preserve deterministic production execution results.',
);

const conflictingLegacyProduction = structuredClone(production) as IndustryProductionCommitment & {
    aiExecution: Record<string, unknown>;
};
Object.assign(conflictingLegacyProduction.aiExecution, {
    id: 'legacy-conflicting-production-id',
    canonicalProjectId: 'legacy-conflicting-project-id',
    physicalProducerStudioId: 'PARAMOUNT',
    physicalProducerStudioName: 'Legacy Producer',
    budgetMillions: 999,
    paidMillions: 888,
    elapsedWeeks: 17,
});
const canonicalAuthority = normalizeIndustryProductions({
    [production.id]: conflictingLegacyProduction,
})[production.id];
assert.ok(canonicalAuthority);
assert.equal(canonicalAuthority.id, production.id, 'Valid canonical production ID must beat conflicting legacy execution data.');
assert.equal(canonicalAuthority.canonicalProjectId, production.canonicalProjectId);
assert.equal(canonicalAuthority.producerStudioId, production.producerStudioId);
assert.equal(canonicalAuthority.budgetMillions, production.budgetMillions);
assert.equal(canonicalAuthority.paidMillions, production.paidMillions);
assert.equal(canonicalAuthority.productionCalendar.elapsedWeeks, production.productionCalendar.elapsedWeeks);
const forbiddenExecutionKeys = [
    'id',
    'canonicalProjectId',
    'physicalProducerStudioId',
    'physicalProducerStudioName',
    'budgetMillions',
    'paidMillions',
    'elapsedWeeks',
];
assert.deepEqual(
    forbiddenExecutionKeys.filter(key => Object.hasOwn(canonicalAuthority.aiExecution || {}, key)),
    [],
    'Normalized execution metadata must not emit duplicated canonical production state.',
);

const missingCanonicalLegacy = structuredClone(production) as unknown as Record<string, any>;
missingCanonicalLegacy.id = '';
missingCanonicalLegacy.canonicalProjectId = '';
missingCanonicalLegacy.producerStudioId = '';
missingCanonicalLegacy.budgetMillions = Number.NaN;
missingCanonicalLegacy.paidMillions = -1;
missingCanonicalLegacy.productionCalendar.elapsedWeeks = Number.NaN;
Object.assign(missingCanonicalLegacy.aiExecution, {
    id: 'legacy-backfilled-production',
    canonicalProjectId: 'legacy-backfilled-project',
    physicalProducerStudioId: 'PARAMOUNT',
    physicalProducerStudioName: 'Paramount Pictures',
    budgetMillions: 77,
    paidMillions: 22,
    elapsedWeeks: 5,
});
const backfilledLegacy = normalizeIndustryProductions({ legacy: missingCanonicalLegacy })['legacy-backfilled-production'];
assert.ok(backfilledLegacy, 'Missing canonical fields must be backfilled from the old execution shape.');
assert.equal(backfilledLegacy.canonicalProjectId, 'legacy-backfilled-project');
assert.equal(backfilledLegacy.producerStudioId, 'PARAMOUNT');
assert.equal(backfilledLegacy.budgetMillions, 77);
assert.equal(backfilledLegacy.paidMillions, 22);
assert.equal(backfilledLegacy.productionCalendar.elapsedWeeks, 5);
assert.deepEqual(
    normalizeIndustryProductions(normalizeIndustryProductions({ legacy: missingCanonicalLegacy })),
    normalizeIndustryProductions({ legacy: missingCanonicalLegacy }),
    'Legacy normalization must be idempotent.',
);

const legacyPaymentRaw = structuredClone(production) as unknown as Record<string, any>;
legacyPaymentRaw.status = 'POST_PRODUCTION';
legacyPaymentRaw.productionCalendar.elapsedWeeks = legacyPaymentRaw.productionCalendar.totalWeeks - 1;
legacyPaymentRaw.paidMillions = Number.NaN;
legacyPaymentRaw.aiExecution.paidMillions = 59.32;
legacyPaymentRaw.aiExecution.paidMilestoneIds = ['COMMISSIONING', 'PROGRESS_35', 'PROGRESS_70'];
legacyPaymentRaw.aiExecution.overrunMillions = 1.11;
legacyPaymentRaw.aiExecution.failureDecision = 'NONE';
legacyPaymentRaw.aiExecution.failureResponse = 'NONE';
const normalizedLegacyPayment = normalizeIndustryProductions({ [production.id]: legacyPaymentRaw })[production.id];
assert.equal(normalizedLegacyPayment.paidMillions, 59.32, 'Legacy paid principal must backfill the canonical field to prevent replay.');
const legacyPaymentWorld = structuredClone(firstCommission.world);
legacyPaymentWorld.industryProductions![production.id] = normalizedLegacyPayment;
const legacyPaymentPlan = getPlan(legacyPaymentWorld, 'HULU', skillSevenBrief.plan.id);
legacyPaymentPlan.paidSpendMillions = 59.32;
legacyPaymentPlan.marketingReserveMillions = 0;
legacyPaymentPlan.contingencyMillions = 0;
(legacyPaymentPlan.productionEscrow as any).marketingBalanceMillions = 0;
(legacyPaymentPlan.productionEscrow as any).contingencyBalanceMillions = 0;
legacyPaymentWorld.platforms!.HULU.cashReserve = 1_000;
const legacyPaymentBuyerCash = legacyPaymentWorld.platforms!.HULU.cashReserve;
const legacyPaidOnce = progressPlatformAiProduction({
    player: fixture,
    world: legacyPaymentWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 500,
});
assert.equal(
    Math.round((legacyPaymentBuyerCash - legacyPaidOnce.world.platforms!.HULU.cashReserve) * 100) / 100,
    33.04,
    'Legacy delivery must pay only remaining principal plus overrun.',
);
const legacyPaidAgain = progressPlatformAiProduction({
    player: fixture,
    world: legacyPaidOnce.world,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 501,
});
assert.equal(legacyPaidAgain.changed, false);
assert.equal(legacyPaidAgain.reason, 'DELIVERED');
assert.equal(legacyPaidAgain.world.platforms!.HULU.cashReserve, legacyPaidOnce.world.platforms!.HULU.cashReserve, 'Normalized legacy delivery must not replay payment.');

const createdBookings = (firstCommission.world.talentBookings || []).filter(booking => (
    booking.projectId === production.canonicalProjectId
));
assert.equal(createdBookings.length, 2, 'The real actor and director must be booked through the shared registry.');
assert.deepEqual(createdBookings.map(booking => booking.id).sort(), production.talentBookingIds.slice().sort());

const duplicateCommission = commission(fixture, firstCommission.world, 'HULU', skillSevenBrief.plan.id);
assert.equal(duplicateCommission.changed, false);
assert.equal(duplicateCommission.reason, 'DUPLICATE');
assert.deepEqual(duplicateCommission.world, firstCommission.world, 'A rerun must not duplicate production, project, booking, or cash effects.');

const conflictBooking: IndustryTalentBooking = {
    id: 'audit-conflict-booking',
    npcId: execution.leadActorId!,
    role: 'ACTOR',
    projectId: 'already-booked-project',
    projectOwner: 'INDUSTRY_PRODUCTION',
    producerStudioId: 'PARAMOUNT',
    startAbsoluteWeek: ABSOLUTE_WEEK,
    endAbsoluteWeek: ABSOLUTE_WEEK + 100,
    status: 'BOOKED',
};
const conflictWorld: WorldState = {
    ...skillSevenBrief.world,
    talentBookings: [...(skillSevenBrief.world.talentBookings || []), conflictBooking],
};
const conflictSafeCommission = commission(fixture, conflictWorld, 'HULU', skillSevenBrief.plan.id);
assert.equal(conflictSafeCommission.changed, true);
assert.equal(
    conflictSafeCommission.production?.aiExecution?.leadActorId,
    execution.leadActorId,
    'Phase 3 keeps the deterministic preferred actor even when another canonical project overlaps.',
);
assert.equal(
    (conflictSafeCommission.world.talentBookings || []).filter(booking => booking.npcId === execution.leadActorId).length,
    2,
    'Both overlapping NPC workloads must remain recorded for future schedule/law systems.',
);

const playerOwningPreferredProducer = structuredClone(fixture);
playerOwningPreferredProducer.businesses.push({
    id: skillSevenBrief.plan.sourceStudioId,
    type: 'PRODUCTION_HOUSE',
} as never);
const producerSafeCommission = commission(
    playerOwningPreferredProducer,
    skillSevenBrief.world,
    'HULU',
    skillSevenBrief.plan.id,
);
assert.equal(producerSafeCommission.changed, true);
assert.notEqual(producerSafeCommission.production?.producerStudioId, skillSevenBrief.plan.sourceStudioId);
assert.equal(resolveStudioController(playerOwningPreferredProducer, producerSafeCommission.production!.producerStudioId), 'AI');

const acquiringProducerPlayer = structuredClone(fixture);
acquiringProducerPlayer.businesses.push({
    id: production.producerStudioId,
    type: 'PRODUCTION_HOUSE',
} as never);
const producerHandoffBuyerCash = firstCommission.world.platforms!.HULU.cashReserve;
const producerHandoffProducerCash = firstCommission.world.studios?.[production.producerStudioId]?.cashReserve || 0;
const producerHandoff = progressPlatformAiProduction({
    player: acquiringProducerPlayer,
    world: firstCommission.world,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal(producerHandoff.reason, 'PLAYER_HANDOFF', 'A player-controlled physical producer must trigger the same handoff as platform acquisition.');
assert.equal(producerHandoff.production?.productionCalendar.elapsedWeeks, production.productionCalendar.elapsedWeeks, 'Producer acquisition must stop automatic AI progress immediately.');
assert.equal(producerHandoff.production?.aiExecution?.effectiveDurationWeeks, 20, 'Producer acquisition must remove the AI speed advantage.');
assert.equal(producerHandoff.production?.paidMillions, production.paidMillions, 'Producer acquisition must not pay a production milestone.');
assert.equal(producerHandoff.world.platforms!.HULU.cashReserve, producerHandoffBuyerCash, 'Producer acquisition must not spend platform cash.');
assert.equal(producerHandoff.world.studios?.[production.producerStudioId]?.cashReserve || 0, producerHandoffProducerCash, 'Producer acquisition must not move producer cash.');
const producerHandoffAgain = progressPlatformAiProduction({
    player: acquiringProducerPlayer,
    world: producerHandoff.world,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 2,
});
assert.equal(producerHandoffAgain.changed, false);
assert.equal(producerHandoffAgain.reason, 'PLAYER_CONTROLLED');
assert.deepEqual(producerHandoffAgain.world, producerHandoff.world, 'A player-controlled producer must receive no further automatic AI changes.');

const externallyCancelledWorld = structuredClone(firstCommission.world);
externallyCancelledWorld.industryProductions![production.id].status = 'CANCELLED';
const externallyCancelledCash = externallyCancelledWorld.platforms!.HULU.cashReserve;
const cancelledResult = progressPlatformAiProduction({
    player: fixture,
    world: externallyCancelledWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal(cancelledResult.changed, true, 'An unsettled cancelled production must release its resources once.');
assert.equal(cancelledResult.reason, 'CANCELLED');
assert.equal(cancelledResult.plan?.status, 'CANCELLED');
assert.equal(cancelledResult.plan?.marketingReserveMillions, 0);
assert.equal(cancelledResult.plan?.contingencyMillions, 0);
assert.equal(cancelledResult.world.platforms!.HULU.cashReserve, roundMillions(externallyCancelledCash + 16.43), 'Cancellation must refund every unused funded reserve.');
assert.equal(
    (cancelledResult.world.talentBookings || []).filter(booking => booking.projectId === production.canonicalProjectId).every(booking => booking.status === 'CANCELLED'),
    true,
    'Cancellation must release every booked actor and director through the shared registry.',
);
const cancelledAgain = progressPlatformAiProduction({
    player: fixture,
    world: cancelledResult.world,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 2,
});
assert.equal(cancelledAgain.changed, false);
assert.equal(cancelledAgain.reason, 'CANCELLED');
assert.deepEqual(cancelledAgain.world, cancelledResult.world, 'Cancellation refunds and booking releases must never replay.');

let cashWorld = structuredClone(firstCommission.world);
const producerStudioId = production.producerStudioId;
const initialPaidMillions = 4.56;
assert.equal(production.paidMillions, initialPaidMillions, 'The commissioning milestone should recognize the rounded existing five-percent deposit.');
assert.ok(production.aiExecution?.paidMilestoneIds.includes('COMMISSIONING'));

const deliverySettlementWorld = structuredClone(firstCommission.world);
const settlementProduction = deliverySettlementWorld.industryProductions![production.id];
settlementProduction.status = 'POST_PRODUCTION';
settlementProduction.productionCalendar.elapsedWeeks = settlementProduction.productionCalendar.totalWeeks - 1;
settlementProduction.paidMillions = 59.32;
settlementProduction.aiExecution!.paidMilestoneIds = ['COMMISSIONING', 'PROGRESS_35', 'PROGRESS_70'];
settlementProduction.aiExecution!.overrunMillions = 3.21;
const settlementPlan = getPlan(deliverySettlementWorld, 'HULU', skillSevenBrief.plan.id);
settlementPlan.paidSpendMillions = 59.32;
settlementPlan.marketingReserveMillions = 0;
settlementPlan.contingencyMillions = 0;
(settlementPlan.productionEscrow as any).marketingBalanceMillions = 0;
(settlementPlan.productionEscrow as any).contingencyBalanceMillions = 0;
deliverySettlementWorld.platforms!.HULU.cashReserve = 1_000;
const settlementBuyerCash = deliverySettlementWorld.platforms!.HULU.cashReserve;
const settlementProducerCash = deliverySettlementWorld.studios?.[producerStudioId]?.cashReserve || 0;
const settledDelivery = progressPlatformAiProduction({
    player: fixture,
    world: deliverySettlementWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 500,
});
const exactDeliveryDue = 35.14;
assert.equal(settledDelivery.production?.status, 'DELIVERED');
assert.equal(settledDelivery.production?.paidMillions, settlementProduction.budgetMillions, 'Canonical paid principal must equal the budget exactly at delivery.');
assert.equal(settledDelivery.production?.aiExecution?.overrunMillions, 3.21, 'Overrun remains separately disclosed instead of inflating paid principal.');
assert.equal(
    Math.round((settlementBuyerCash - settledDelivery.world.platforms!.HULU.cashReserve) * 100) / 100,
    exactDeliveryDue,
    'Delivery must charge exact unpaid principal plus the persisted overrun.',
);
assert.equal(
    Math.round(((settledDelivery.world.studios?.[producerStudioId]?.cashReserve || 0) - settlementProducerCash) * 100) / 100,
    exactDeliveryDue,
    'The producer must receive exact unpaid principal plus overrun once.',
);

const contingencyResponseWorld = structuredClone(firstCommission.world);
const contingencyProduction = contingencyResponseWorld.industryProductions![production.id];
const contingencyExecution = contingencyProduction.aiExecution! as typeof contingencyProduction.aiExecution & Record<string, unknown>;
contingencyExecution.failureDecision = 'ADD_CONTINGENCY';
contingencyExecution.failureResponse = 'PENDING';
contingencyExecution.failureResponseAmountMillions = 0;
contingencyExecution.failureResponseAppliedAtAbsoluteWeek = null;
const contingencyPlan = getPlan(contingencyResponseWorld, 'HULU', skillSevenBrief.plan.id);
assert.equal(contingencyPlan.contingencyMillions, 7.3);
const contingencyBudgetBefore = contingencyProduction.budgetMillions;
const contingencyPaidBefore = contingencyProduction.paidMillions;
const contingencyBuyerCashBefore = contingencyResponseWorld.platforms!.HULU.cashReserve;
const contingencyProducerCashBefore = contingencyResponseWorld.studios?.[producerStudioId]?.cashReserve || 0;
const contingencyApplied = progressPlatformAiProduction({
    player: fixture,
    world: contingencyResponseWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal((contingencyApplied.production?.aiExecution as unknown as Record<string, unknown>)?.failureResponse, 'CONTINGENCY_TRANSFERRED');
assert.equal((contingencyApplied.production?.aiExecution as unknown as Record<string, unknown>)?.failureResponseAmountMillions, 7.3);
assert.equal(contingencyApplied.production?.budgetMillions, roundMillions(contingencyBudgetBefore + 7.3), 'Available contingency must become canonical production budget.');
assert.equal(contingencyApplied.production?.paidMillions, roundMillions(contingencyPaidBefore + 7.3), 'Funded contingency becomes paid canonical production principal once.');
assert.equal(contingencyApplied.plan?.contingencyMillions, 0);
assert.equal(contingencyApplied.plan?.paidSpendMillions, contingencyPlan.paidSpendMillions, 'Spending escrow must not count the same cash twice.');
assert.equal(contingencyApplied.world.platforms!.HULU.cashReserve, contingencyBuyerCashBefore, 'Funded contingency must not debit platform cash a second time.');
assert.equal(contingencyApplied.world.studios?.[producerStudioId]?.cashReserve || 0, roundMillions(contingencyProducerCashBefore + 7.3));
assert.equal(
    contingencyApplied.world.platforms!.HULU.ai!.decisionHistory.filter(decision => decision.type === 'PRODUCTION_FAILURE_RESPONSE').length,
    1,
    'Applied contingency must create one disclosed decision.',
);
assert.equal(typeof (contingencyApplied.production?.aiExecution as unknown as Record<string, unknown>)?.failureResponseAppliedAtAbsoluteWeek, 'number');
assert.equal(contingencyApplied.production?.productionCalendar.elapsedWeeks, contingencyProduction.productionCalendar.elapsedWeeks, 'Applying a failure response consumes the week without also progressing production.');
const contingencyAppliedAgain = progressPlatformAiProduction({
    player: fixture,
    world: contingencyApplied.world,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 2,
});
assert.equal(contingencyAppliedAgain.production?.budgetMillions, roundMillions(contingencyBudgetBefore + 7.3), 'A persisted failure response must not transfer contingency twice.');
assert.equal(contingencyAppliedAgain.production?.paidMillions, roundMillions(contingencyPaidBefore + 7.3));
assert.equal(contingencyAppliedAgain.world.studios?.[producerStudioId]?.cashReserve, contingencyApplied.world.studios?.[producerStudioId]?.cashReserve);
assert.equal(
    contingencyAppliedAgain.world.platforms!.HULU.ai!.decisionHistory.filter(decision => decision.type === 'PRODUCTION_FAILURE_RESPONSE').length,
    1,
    'Failure-response reruns must not duplicate decisions.',
);

const marketingResponseWorld = structuredClone(firstCommission.world);
const marketingProduction = marketingResponseWorld.industryProductions![production.id];
const marketingExecution = marketingProduction.aiExecution! as typeof marketingProduction.aiExecution & Record<string, unknown>;
marketingExecution.failureDecision = 'REDUCE_MARKETING';
marketingExecution.failureResponse = 'PENDING';
marketingExecution.failureResponseAmountMillions = 0;
marketingExecution.failureResponseAppliedAtAbsoluteWeek = null;
const marketingPlan = getPlan(marketingResponseWorld, 'HULU', skillSevenBrief.plan.id);
assert.equal(marketingPlan.marketingReserveMillions, 9.13);
const marketingBudgetBefore = marketingProduction.budgetMillions;
const marketingPaidBefore = marketingProduction.paidMillions;
const marketingBuyerCashBefore = marketingResponseWorld.platforms!.HULU.cashReserve;
const marketingProducerCashBefore = marketingResponseWorld.studios?.[producerStudioId]?.cashReserve || 0;
const marketingApplied = progressPlatformAiProduction({
    player: fixture,
    world: marketingResponseWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal((marketingApplied.production?.aiExecution as unknown as Record<string, unknown>)?.failureResponse, 'MARKETING_TRANSFERRED');
assert.equal((marketingApplied.production?.aiExecution as unknown as Record<string, unknown>)?.failureResponseAmountMillions, 9.13);
assert.equal(marketingApplied.production?.budgetMillions, roundMillions(marketingBudgetBefore + 9.13));
assert.equal(marketingApplied.plan?.marketingReserveMillions, 0);
assert.equal(marketingApplied.production?.paidMillions, roundMillions(marketingPaidBefore + 9.13), 'Funded marketing fallback must become paid production principal.');
assert.equal(marketingApplied.world.platforms!.HULU.cashReserve, marketingBuyerCashBefore, 'Marketing reserve reallocation must not debit cash immediately.');
assert.equal(marketingApplied.world.studios?.[producerStudioId]?.cashReserve || 0, roundMillions(marketingProducerCashBefore + 9.13), 'The producer receives the already-funded fallback once.');

const exhaustedFallbackWorld = structuredClone(firstCommission.world);
const exhaustedFallbackProduction = exhaustedFallbackWorld.industryProductions![production.id];
exhaustedFallbackProduction.aiExecution!.failureDecision = 'ADD_CONTINGENCY';
exhaustedFallbackProduction.aiExecution!.failureResponse = 'PENDING';
exhaustedFallbackProduction.aiExecution!.failureResponseAmountMillions = 0;
exhaustedFallbackProduction.aiExecution!.failureResponseAppliedAtAbsoluteWeek = null;
const exhaustedFallbackPlan = getPlan(exhaustedFallbackWorld, 'HULU', skillSevenBrief.plan.id);
exhaustedFallbackPlan.contingencyMillions = 0;
(exhaustedFallbackPlan.productionEscrow as any).contingencyBalanceMillions = 0;
const exhaustedFallbackCash = exhaustedFallbackWorld.platforms!.HULU.cashReserve;
const exhaustedFallback = progressPlatformAiProduction({
    player: fixture,
    world: exhaustedFallbackWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal(exhaustedFallback.reason, 'CANCELLED');
assert.equal(exhaustedFallback.production?.status, 'CANCELLED', 'An unfundable persisted fallback must cancel deterministically.');
assert.equal(exhaustedFallback.plan?.status, 'CANCELLED');
assert.equal(exhaustedFallback.world.platforms!.HULU.cashReserve, roundMillions(exhaustedFallbackCash + 9.13), 'Cancellation refunds the remaining marketing reserve.');
assert.equal(
    (exhaustedFallback.world.talentBookings || []).filter(booking => booking.projectId === production.canonicalProjectId).every(booking => booking.status === 'CANCELLED'),
    true,
);

const delayResponseWorld = structuredClone(firstCommission.world);
const delayProduction = delayResponseWorld.industryProductions![production.id];
const delayExecution = delayProduction.aiExecution! as typeof delayProduction.aiExecution & Record<string, unknown>;
delayExecution.failureDecision = 'DELAY_RELEASE';
delayExecution.failureResponse = 'PENDING';
delayExecution.failureResponseAmountMillions = 0;
delayExecution.failureResponseAppliedAtAbsoluteWeek = null;
const delayTotalBefore = delayProduction.productionCalendar.totalWeeks;
const delayApplied = progressPlatformAiProduction({
    player: fixture,
    world: delayResponseWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal((delayApplied.production?.aiExecution as unknown as Record<string, unknown>)?.failureResponse, 'SCHEDULE_EXTENDED');
assert.equal(delayApplied.production?.productionCalendar.totalWeeks, delayTotalBefore + 1, 'Delay response must extend the canonical calendar by exactly one week.');
assert.equal(delayApplied.production?.productionCalendar.elapsedWeeks, delayProduction.productionCalendar.elapsedWeeks);

const delayConflictWorld = structuredClone(firstCommission.world);
const delayConflictProduction = delayConflictWorld.industryProductions![production.id];
const delayConflictExecution = delayConflictProduction.aiExecution! as typeof delayConflictProduction.aiExecution & Record<string, unknown>;
delayConflictExecution.failureDecision = 'DELAY_RELEASE';
delayConflictExecution.failureResponse = 'PENDING';
delayConflictExecution.failureResponseAmountMillions = 0;
delayConflictExecution.failureResponseAppliedAtAbsoluteWeek = null;
const delayConflictDirectorBooking = (delayConflictWorld.talentBookings || []).find(booking => (
    booking.projectId === production.canonicalProjectId && booking.role === 'DIRECTOR'
));
assert.ok(delayConflictDirectorBooking);
const blockingDelayBooking: IndustryTalentBooking = {
    id: 'audit-failure-delay-conflict',
    npcId: delayConflictDirectorBooking.npcId,
    role: 'DIRECTOR',
    projectId: 'next-directing-job',
    projectOwner: 'INDUSTRY_PRODUCTION',
    producerStudioId: 'PARAMOUNT',
    startAbsoluteWeek: delayConflictDirectorBooking.endAbsoluteWeek + 1,
    endAbsoluteWeek: delayConflictDirectorBooking.endAbsoluteWeek + 4,
    status: 'BOOKED',
};
delayConflictWorld.talentBookings = [...(delayConflictWorld.talentBookings || []), blockingDelayBooking];
const delayConflictBookingsBefore = structuredClone(delayConflictWorld.talentBookings);
const delayConflict = progressPlatformAiProduction({
    player: fixture,
    world: delayConflictWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal(delayConflict.reason, 'FAILURE_RESPONSE_APPLIED');
assert.equal((delayConflict.production?.aiExecution as unknown as Record<string, unknown>)?.failureResponse, 'SCHEDULE_EXTENDED');
assert.equal(delayConflict.production?.aiExecution?.holdReason, null);
assert.equal(delayConflict.production?.productionCalendar.totalWeeks, delayConflictProduction.productionCalendar.totalWeeks + 1);
assert.notDeepEqual(delayConflict.world.talentBookings, delayConflictBookingsBefore, 'Allowed overlap extends the current production booking and preserves the other job.');

const blockedFailureWorld = structuredClone(firstCommission.world);
const blockedFailureProduction = blockedFailureWorld.industryProductions![production.id];
const blockedFailureExecution = blockedFailureProduction.aiExecution! as typeof blockedFailureProduction.aiExecution & Record<string, unknown>;
blockedFailureExecution.failureDecision = 'REPLACE_TALENT';
blockedFailureExecution.failureResponse = 'PENDING';
blockedFailureExecution.failureResponseAmountMillions = 0;
blockedFailureExecution.failureResponseAppliedAtAbsoluteWeek = null;
const blockedFailure = progressPlatformAiProduction({
    player: fixture,
    world: blockedFailureWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal(blockedFailure.production?.status, 'ON_HOLD', 'Unsupported failure systems must hold instead of inventing new mechanics.');
assert.equal(blockedFailure.plan?.status, 'ON_HOLD');
assert.equal((blockedFailure.production?.aiExecution as unknown as Record<string, unknown>)?.failureResponse, 'ON_HOLD');
assert.equal(blockedFailure.production?.aiExecution?.holdReason, 'FAILURE_RESPONSE_UNAVAILABLE');
assert.equal(typeof (blockedFailure.production?.aiExecution as unknown as Record<string, unknown>)?.failureResponseAppliedAtAbsoluteWeek, 'number');
const blockedFailureAgain = progressPlatformAiProduction({
    player: fixture,
    world: blockedFailure.world,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 2,
});
assert.equal(blockedFailureAgain.changed, true);
assert.equal(blockedFailureAgain.reason, 'CANCELLED');
assert.equal(blockedFailureAgain.production?.status, 'CANCELLED', 'An unavailable failure response must cancel after one bounded hold week.');
assert.equal(blockedFailureAgain.plan?.status, 'CANCELLED');

const sameWeekFailureWorld = structuredClone(skillSevenBrief.world);
sameWeekFailureWorld.platforms!.HULU.cashReserve = 0;
const sameWeekFailure = commission(fixture, sameWeekFailureWorld, 'HULU', skillSevenBrief.plan.id);
assert.equal(sameWeekFailure.changed, true);
const sameWeekReplay = commission(fixture, sameWeekFailure.world, 'HULU', skillSevenBrief.plan.id);
assert.equal(sameWeekReplay.changed, false, 'Commissioning retries may advance at most once per absolute week.');
assert.equal(
    sameWeekReplay.plan?.commissioningLifecycle?.attemptCount,
    sameWeekFailure.plan?.commissioningLifecycle?.attemptCount,
);
let boundedCommissionFailure = sameWeekFailure;
for (let offset = 1; offset <= 3 && boundedCommissionFailure.plan?.status !== 'CANCELLED'; offset += 1) {
    boundedCommissionFailure = commission(
        fixture,
        boundedCommissionFailure.world,
        'HULU',
        skillSevenBrief.plan.id,
        ABSOLUTE_WEEK + offset,
    );
}
assert.equal(boundedCommissionFailure.plan?.status, 'CANCELLED');
const cancelledCommissionReplay = commission(
    fixture,
    boundedCommissionFailure.world,
    'HULU',
    skillSevenBrief.plan.id,
    ABSOLUTE_WEEK + 5,
);
assert.equal(cancelledCommissionReplay.changed, false, 'A cancelled original must never be commissioned later.');
assert.equal(cancelledCommissionReplay.reason, 'CANCELLED');

const forgedMilestones = structuredClone(firstCommission.production!);
forgedMilestones.paidMillions = roundMillions(forgedMilestones.budgetMillions * 0.05);
forgedMilestones.aiExecution!.paidMilestoneIds = ['COMMISSIONING', 'PROGRESS_35', 'PROGRESS_70', 'DELIVERY'];
const repairedMilestones = normalizeIndustryProductions({ [forgedMilestones.id]: forgedMilestones })[forgedMilestones.id];
assert.deepEqual(repairedMilestones.aiExecution!.paidMilestoneIds, ['COMMISSIONING'], 'Saved milestone IDs cannot waive unpaid principal.');
const forgedDelivery = structuredClone(forgedMilestones);
forgedDelivery.status = 'DELIVERED';
forgedDelivery.productionCalendar.elapsedWeeks = forgedDelivery.productionCalendar.totalWeeks;
const repairedDelivery = normalizeIndustryProductions({ [forgedDelivery.id]: forgedDelivery })[forgedDelivery.id];
assert.equal(repairedDelivery.status, 'POST_PRODUCTION', 'An unpaid saved production cannot remain delivered.');

const futureTimestamps = structuredClone(firstCommission.production!);
futureTimestamps.updatedAtAbsoluteWeek = ABSOLUTE_WEEK + 500;
futureTimestamps.productionCalendar.startedAbsoluteWeek = ABSOLUTE_WEEK + 500;
futureTimestamps.aiExecution!.lastProgressedAbsoluteWeek = ABSOLUTE_WEEK + 500;
futureTimestamps.aiExecution!.failureResponseAppliedAtAbsoluteWeek = ABSOLUTE_WEEK + 500;
const repairedFutureTimestamps = normalizeIndustryProductions(
    { [futureTimestamps.id]: futureTimestamps },
    ABSOLUTE_WEEK + 1,
)[futureTimestamps.id];
assert.ok(repairedFutureTimestamps.updatedAtAbsoluteWeek <= ABSOLUTE_WEEK + 1);
assert.ok((repairedFutureTimestamps.productionCalendar.startedAbsoluteWeek || 0) <= ABSOLUTE_WEEK + 1);
assert.ok(repairedFutureTimestamps.aiExecution!.lastProgressedAbsoluteWeek <= ABSOLUTE_WEEK + 1);
assert.ok((repairedFutureTimestamps.aiExecution!.failureResponseAppliedAtAbsoluteWeek || 0) <= ABSOLUTE_WEEK + 1);

for (const decision of ['SELL_OR_COPRODUCE', 'CANCEL'] as const) {
    const decisionWorld = structuredClone(firstCommission.world);
    const decisionProduction = decisionWorld.industryProductions![production.id];
    decisionProduction.aiExecution!.failureDecision = decision;
    decisionProduction.aiExecution!.failureResponse = 'PENDING';
    decisionProduction.aiExecution!.failureResponseAppliedAtAbsoluteWeek = null;
    const firstDecisionResult = progressPlatformAiProduction({
        player: fixture,
        world: decisionWorld,
        platformId: 'HULU',
        planId: skillSevenBrief.plan.id,
        absoluteWeek: ABSOLUTE_WEEK + 1,
    });
    const terminalDecisionResult = decision === 'CANCEL'
        ? firstDecisionResult
        : progressPlatformAiProduction({
            player: fixture,
            world: firstDecisionResult.world,
            platformId: 'HULU',
            planId: skillSevenBrief.plan.id,
            absoluteWeek: ABSOLUTE_WEEK + 2,
        });
    assert.equal(terminalDecisionResult.reason, 'CANCELLED', `${decision} must reach a bounded terminal cancellation.`);
    assert.equal(terminalDecisionResult.production?.status, 'CANCELLED');
}

const threshold35 = Math.ceil(execution.effectiveDurationWeeks * 0.35);
let reserveMilestoneWorld = structuredClone(firstCommission.world);
for (let week = 0; week < threshold35 - 1; week += 1) {
    reserveMilestoneWorld = progressPlatformAiProduction({
        player: fixture,
        world: reserveMilestoneWorld,
        platformId: 'HULU',
        planId: skillSevenBrief.plan.id,
        absoluteWeek: ABSOLUTE_WEEK + week + 1,
    }).world;
}
reserveMilestoneWorld.platforms!.HULU.cashReserve = 20;
const reserveMilestoneProducerCash = reserveMilestoneWorld.studios?.[producerStudioId]?.cashReserve || 0;
const reserveMilestone = progressPlatformAiProduction({
    player: fixture,
    world: reserveMilestoneWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + threshold35,
});
assert.equal(reserveMilestone.reason, undefined, 'A funded reserve must keep an affordable milestone out of ON_HOLD.');
assert.ok(reserveMilestone.production?.aiExecution?.paidMilestoneIds.includes('PROGRESS_35'));
assert.equal(reserveMilestone.world.platforms!.HULU.cashReserve, 0);
assert.equal(reserveMilestone.plan?.contingencyMillions, 0, 'Contingency escrow must fund the first part of a milestone shortfall.');
assert.equal(reserveMilestone.plan?.marketingReserveMillions, 9.05, 'Marketing escrow must fund only the shortfall left after contingency.');
assert.equal(
    reserveMilestone.world.studios?.[producerStudioId]?.cashReserve || 0,
    roundMillions(reserveMilestoneProducerCash + 27.38),
    'The producer receives the full milestone from available cash plus escrow.',
);

for (let week = 0; week < threshold35 - 1; week += 1) {
    const progressed = progressPlatformAiProduction({
        player: fixture,
        world: cashWorld,
        platformId: 'HULU',
        planId: skillSevenBrief.plan.id,
        absoluteWeek: ABSOLUTE_WEEK + week + 1,
    });
    assert.equal(progressed.changed, true);
    cashWorld = progressed.world;
}

const beforeHoldProduction = getProduction(cashWorld, production.id);
const beforeHoldProducerCash = cashWorld.studios?.[producerStudioId]?.cashReserve || 0;
cashWorld.platforms!.HULU.cashReserve = 0;
const held = progressPlatformAiProduction({
    player: fixture,
    world: cashWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + threshold35,
});
assert.equal(held.changed, true);
assert.equal(held.reason, 'PAYMENT_HOLD');
assert.equal(held.world.platforms!.HULU.cashReserve, 0, 'A hold must never take platform cash negative.');
assert.equal(getProduction(held.world, production.id).productionCalendar.elapsedWeeks, beforeHoldProduction.productionCalendar.elapsedWeeks);
assert.equal(held.world.studios?.[producerStudioId]?.cashReserve || 0, beforeHoldProducerCash, 'A failed milestone must not mint producer cash.');
assert.equal(getProduction(held.world, production.id).status, 'ON_HOLD');
assert.equal(held.plan?.productionHoldStartedAtAbsoluteWeek, ABSOLUTE_WEEK + threshold35, 'The first unfundable week must be persisted.');

const cancelledAfterHold = progressPlatformAiProduction({
    player: fixture,
    world: held.world,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + threshold35 + 1,
});
assert.equal(cancelledAfterHold.reason, 'CANCELLED');
assert.equal(cancelledAfterHold.production?.status, 'CANCELLED', 'An unfundable held milestone must cancel on the next processed week.');
assert.equal(cancelledAfterHold.plan?.status, 'CANCELLED');
assert.equal(cancelledAfterHold.world.platforms!.HULU.cashReserve, 16.43, 'Cancellation returns all still-unused escrow.');
assert.equal(
    (cancelledAfterHold.world.talentBookings || []).filter(booking => booking.projectId === production.canonicalProjectId).every(booking => booking.status === 'CANCELLED'),
    true,
);

const capacityWorld = structuredClone(firstCommission.world);
const heldPlanTemplate = getPlan(capacityWorld, 'HULU', skillSevenBrief.plan.id);
capacityWorld.platforms!.HULU.ai!.slate = Array.from({ length: 10 }, (_, index) => ({
    ...structuredClone(heldPlanTemplate),
    id: `${heldPlanTemplate.id}:held:${index}`,
    industryProductionId: `${heldPlanTemplate.industryProductionId}:held:${index}`,
    status: 'ON_HOLD' as const,
}));
assert.equal(
    buildPlatformContentCandidates({ player: fixture, world: capacityWorld, platformId: 'HULU', absoluteWeek: ABSOLUTE_WEEK + 1 })
        .some(candidate => candidate.source === 'COMMISSIONED_ORIGINAL'),
    false,
    'ON_HOLD originals must continue occupying production capacity.',
);

const fundedWorld = structuredClone(held.world);
fundedWorld.platforms!.HULU.cashReserve = 1_000;
const buyerCashBefore35 = fundedWorld.platforms!.HULU.cashReserve;
const producerCashBefore35 = fundedWorld.studios?.[producerStudioId]?.cashReserve || 0;
const resumed = progressPlatformAiProduction({
    player: fixture,
    world: fundedWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + threshold35 + 1,
});
const resumedProduction = getProduction(resumed.world, production.id);
const milestone35Amount = 27.38;
assert.equal(resumed.reason, undefined);
assert.equal(
    Math.round((buyerCashBefore35 - resumed.world.platforms!.HULU.cashReserve) * 100) / 100,
    milestone35Amount,
);
assert.equal(
    Math.round(((resumed.world.studios?.[producerStudioId]?.cashReserve || 0) - producerCashBefore35) * 100) / 100,
    milestone35Amount,
);
assert.ok(resumedProduction.aiExecution?.paidMilestoneIds.includes('PROGRESS_35'));

let deliveredWorld = resumed.world;
for (let guard = 0; guard < 80; guard += 1) {
    const current = getProduction(deliveredWorld, production.id);
    if (current.status === 'DELIVERED') break;
    const progressed = progressPlatformAiProduction({
        player: fixture,
        world: deliveredWorld,
        platformId: 'HULU',
        planId: skillSevenBrief.plan.id,
        absoluteWeek: ABSOLUTE_WEEK + threshold35 + 2 + guard,
    });
    deliveredWorld = progressed.world;
}
const deliveredProduction = getProduction(deliveredWorld, production.id);
const deliveredPlan = getPlan(deliveredWorld, 'HULU', skillSevenBrief.plan.id);
assert.equal(deliveredProduction.status, 'DELIVERED');
assert.equal(deliveredPlan.status, 'DELIVERED');
assert.deepEqual(deliveredProduction.aiExecution?.paidMilestoneIds, [
    'COMMISSIONING',
    'PROGRESS_35',
    'PROGRESS_70',
    'DELIVERY',
]);
assert.equal(deliveredWorld.projects.length, 0, 'Delivery must not create a theatrical or released project before Phase 6.');
assert.equal((deliveredWorld.talentBookings || []).filter(booking => booking.projectId === production.canonicalProjectId).every(booking => booking.status === 'RELEASED'), true);

const reserveDeliveryWorld = structuredClone(firstCommission.world);
const reserveDeliveryProduction = reserveDeliveryWorld.industryProductions![production.id];
reserveDeliveryProduction.status = 'POST_PRODUCTION';
reserveDeliveryProduction.productionCalendar.elapsedWeeks = reserveDeliveryProduction.productionCalendar.totalWeeks - 1;
reserveDeliveryProduction.paidMillions = reserveDeliveryProduction.budgetMillions;
reserveDeliveryProduction.aiExecution!.paidMilestoneIds = ['COMMISSIONING', 'PROGRESS_35', 'PROGRESS_70', 'DELIVERY'];
reserveDeliveryProduction.aiExecution!.failureDecision = 'NONE';
reserveDeliveryProduction.aiExecution!.failureResponse = 'NONE';
const reserveDeliveryCash = reserveDeliveryWorld.platforms!.HULU.cashReserve;
const reserveDelivery = progressPlatformAiProduction({
    player: fixture,
    world: reserveDeliveryWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 200,
});
assert.equal(reserveDelivery.production?.status, 'DELIVERED');
assert.equal(reserveDelivery.world.platforms!.HULU.cashReserve, roundMillions(reserveDeliveryCash + 7.3), 'Delivery refunds contingency while preserving the funded release campaign.');
assert.equal(reserveDelivery.plan?.marketingReserveMillions, 9.13, 'Delivery must preserve funded marketing for release scoring.');
assert.equal(reserveDelivery.plan?.contingencyMillions, 0);
assert.equal((reserveDelivery.plan as unknown as Record<string, any>)?.productionEscrow?.status, 'FUNDED');
assert.equal((reserveDelivery.plan as unknown as Record<string, any>)?.productionEscrow?.marketingBalanceMillions, 9.13);
assert.equal(
    (reserveDelivery.world.talentBookings || []).filter(booking => booking.projectId === production.canonicalProjectId).every(booking => booking.status === 'RELEASED'),
    true,
);
const reserveDeliveryAgain = progressPlatformAiProduction({
    player: fixture,
    world: reserveDelivery.world,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 201,
});
assert.equal(reserveDeliveryAgain.changed, false);
assert.equal(reserveDeliveryAgain.reason, 'DELIVERED');
assert.deepEqual(reserveDeliveryAgain.world, reserveDelivery.world, 'Delivery refunds and talent releases must never replay.');

// Malformed and future hold timestamps normalize to a safe nullable value.
for (const badHold of ['never', ABSOLUTE_WEEK + 500]) {
    const badHoldWorld = structuredClone(firstCommission.world);
    const badHoldPlan = getPlan(badHoldWorld, 'HULU', skillSevenBrief.plan.id);
    (badHoldPlan as unknown as Record<string, any>).productionHoldStartedAtAbsoluteWeek = badHold;
    const normalizedBadHold = normalizeWorldPlatformAi(fixture, badHoldWorld, ABSOLUTE_WEEK + 1);
    assert.equal(
        getPlan(normalizedBadHold, 'HULU', skillSevenBrief.plan.id).productionHoldStartedAtAbsoluteWeek,
        null,
        'Malformed or future production holds must not survive save normalization.',
    );
}

const acquiringDeliveredPlayer = structuredClone(fixture);
acquiringDeliveredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds.push('HULU');
const deliveredAfterAcquisition = progressPlatformAiProduction({
    player: acquiringDeliveredPlayer,
    world: deliveredWorld,
    platformId: 'HULU',
    planId: skillSevenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 100,
});
assert.equal(deliveredAfterAcquisition.changed, false, 'Acquisition must not reopen a production that was already delivered.');
assert.equal(deliveredAfterAcquisition.reason, 'DELIVERED');
assert.equal(deliveredAfterAcquisition.production?.status, 'DELIVERED');

const skillTenBrief = createOriginalBrief(fixture, 'APPLE_TV', 10);
const skillTenCommission = commission(fixture, skillTenBrief.world, 'APPLE_TV', skillTenBrief.plan.id);
assert.equal(skillTenCommission.production?.aiExecution?.effectiveDurationWeeks, 15, 'Skill 10 AI production should use the 15-week threshold.');
const progressedAsAi = progressPlatformAiProduction({
    player: fixture,
    world: skillTenCommission.world,
    platformId: 'APPLE_TV',
    planId: skillTenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
const elapsedBeforeAcquisition = progressedAsAi.production!.productionCalendar.elapsedWeeks;

const acquiringPlayer = structuredClone(fixture);
acquiringPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds.push('APPLE_TV');
const preHandoffProduction = progressedAsAi.production!;
const preHandoffBookings = progressedAsAi.world.talentBookings || [];
const conflictingDirectorBooking: IndustryTalentBooking = {
    id: 'audit-player-handoff-schedule-conflict',
    npcId: preHandoffProduction.aiExecution!.directorId!,
    role: 'DIRECTOR',
    projectId: 'later-player-project',
    projectOwner: 'PLAYER_COMMITMENT',
    producerStudioId: 'PARAMOUNT',
    startAbsoluteWeek: (preHandoffProduction.productionCalendar.startedAbsoluteWeek || ABSOLUTE_WEEK)
        + preHandoffProduction.productionCalendar.totalWeeks,
    endAbsoluteWeek: (preHandoffProduction.productionCalendar.startedAbsoluteWeek || ABSOLUTE_WEEK)
        + preHandoffProduction.productionCalendar.totalWeeks + 8,
    status: 'BOOKED',
};
const conflictedHandoffWorld = {
    ...progressedAsAi.world,
    talentBookings: [...preHandoffBookings, conflictingDirectorBooking],
};
const conflictedHandoff = progressPlatformAiProduction({
    player: acquiringPlayer,
    world: conflictedHandoffWorld,
    platformId: 'APPLE_TV',
    planId: skillTenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 2,
});
assert.equal(conflictedHandoff.reason, 'PLAYER_HANDOFF');
assert.notEqual(conflictedHandoff.production?.status, 'ON_HOLD', 'Phase 3 player handoff permits overlapping NPC work.');
assert.equal(conflictedHandoff.production?.aiExecution?.holdReason, null);
assert.equal(conflictedHandoff.production?.productionCalendar.elapsedWeeks, elapsedBeforeAcquisition);
assert.equal(conflictedHandoff.production?.paidMillions, preHandoffProduction.paidMillions);
assert.equal(conflictedHandoff.world.platforms!.APPLE_TV.cashReserve, progressedAsAi.world.platforms!.APPLE_TV.cashReserve);
assert.notDeepEqual(conflictedHandoff.world.talentBookings, conflictedHandoffWorld.talentBookings, 'Handoff must resize this production booking while retaining the other job.');

const handedOff = progressPlatformAiProduction({
    player: acquiringPlayer,
    world: progressedAsAi.world,
    platformId: 'APPLE_TV',
    planId: skillTenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 2,
});
assert.equal(handedOff.production?.productionCalendar.elapsedWeeks, elapsedBeforeAcquisition, 'Acquisition must stop automatic AI progress immediately.');
assert.equal(handedOff.production?.aiExecution?.effectiveDurationWeeks, 20, 'Player control must restore the standard 20-week threshold.');
assert.equal(handedOff.production?.aiExecution?.controllerAtLastProgression, 'PLAYER');
assert.deepEqual(
    forbiddenExecutionKeys.filter(key => Object.hasOwn(handedOff.production?.aiExecution || {}, key)),
    [],
    'Player handoff must not reintroduce duplicated canonical production state into execution metadata.',
);
const handedOffAgain = progressPlatformAiProduction({
    player: acquiringPlayer,
    world: handedOff.world,
    platformId: 'APPLE_TV',
    planId: skillTenBrief.plan.id,
    absoluteWeek: ABSOLUTE_WEEK + 3,
});
assert.equal(handedOffAgain.changed, false);
assert.equal(handedOffAgain.reason, 'PLAYER_CONTROLLED');
assert.deepEqual(handedOffAgain.world, handedOff.world, 'Player-controlled productions must receive no further automatic AI changes.');

console.log('Platform AI production audit passed: commissioning, bookings, milestones, risk persistence, timing, and acquisition handoff are deterministic and conflict-safe.');
