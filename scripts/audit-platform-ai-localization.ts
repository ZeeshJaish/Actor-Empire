import assert from 'node:assert/strict';
import type { PlatformAiContentPlan, PlatformState, WorldState } from '../types';
import { createDeterministicId } from '../services/deterministicRandom';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    calculatePlatformAiWeeklyEconomy,
    normalizePlatformAiState,
    normalizeWorldPlatformAi,
    planPlatformAiLocalization,
    progressPlatformAiLocalization,
} from '../services/platformAi';
import { reconcilePlatformAiLocalizationObligations } from '../services/platformAi/platformAiState';
import {
    getPlatformAiLocalizationJobId,
    getPlatformAiLocalizationObligationId,
    getPlatformAiLocalizationRequirements,
} from '../services/platformAi/platformAiLocalizationCore';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const player = createPlatformAiFixture();
const week = getAbsoluteWeek(player.age, player.currentWeek);
const base = normalizePlatformAiState(player.world.platforms!.NETFLIX, player.id, week);
const plan: PlatformAiContentPlan = {
    id: 'phase4-localization-plan',
    platformId: 'NETFLIX',
    controllerAtCommitment: 'AI',
    source: 'LICENSED_RELEASED_TITLE',
    status: 'RIGHTS_READY',
    title: 'Canonical Localization Plan',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    targetAudience: 'PG-13',
    sourceProjectIds: ['phase4-localization-project'],
    rightsContractIds: [],
    cataloguePackageId: null,
    commissionId: null,
    sourceStudioId: 'UNIVERSAL',
    streamingWindow: 'POST_THEATRICAL_WINDOW',
    localizationLevel: 'SUBTITLES',
    releaseCountryIds: ['JP', 'US'],
    minimumGuaranteeMillions: 0,
    rightsCostMillions: 0,
    productionFundingMillions: 0,
    paidSpendMillions: 0,
    marketingReserveMillions: 0,
    contingencyMillions: 0,
    committedAtAbsoluteWeek: week,
    rightsReadyAtAbsoluteWeek: week,
    localizationReadyAtAbsoluteWeek: null,
    premiereAtAbsoluteWeek: null,
    releasePattern: null,
    releaseEntries: [],
    scheduledAtAbsoluteWeek: null,
    releasedAtAbsoluteWeek: null,
    industryProductionId: null,
    forecast: { strategic: 80, creative: 80, commercial: 80, prestige: 80, risk: 20 },
};
base.ai!.slate = [plan];
const worldFor = (platform: PlatformState): WorldState => ({
    ...player.world,
    platforms: { ...player.world.platforms!, NETFLIX: platform },
});

const requirements = getPlatformAiLocalizationRequirements(base, plan, { originalLanguageId: 'english' });
assert.deepEqual(requirements.map(item => ({
    languageId: item.languageId,
    mode: item.mode,
    countryIds: item.countryIds,
    tier: item.capabilityTier,
    supported: item.supported,
})), [
    { languageId: 'japanese', mode: 'SUBTITLE', countryIds: ['JP'], tier: 3, supported: true },
    { languageId: 'spanish', mode: 'SUBTITLE', countryIds: ['US'], tier: 3, supported: true },
]);

const planned = planPlatformAiLocalization({
    player,
    world: worldFor(base),
    platform: base,
    absoluteWeek: week,
    contentPlanId: plan.id,
    projectId: plan.sourceProjectIds[0],
    countryIds: ['JP'],
    languageId: 'japanese',
    mode: 'SUBTITLE',
});
assert.equal(planned.reason, 'PLANNED');
assert.equal(planned.changed, true);
assert.equal(planned.job?.languageId, 'japanese');
assert.equal(planned.job?.mode, 'SUBTITLE');
assert.equal(planned.job?.capabilityTierAtPlanning, 3);
assert.deepEqual(planned.job?.countryIds, ['JP']);
assert.equal(planned.job?.quoteVersion, 1);
assert.ok(planned.job?.qualityForecast && planned.job.qualityForecast > 0);
assert.ok(planned.job?.efficiencySnapshot);
assert.equal(planned.job?.costMillions, planned.job?.efficiencySnapshot?.appliedCostMillions);
assert.equal(planned.job?.leadWeeks, planned.job?.efficiencySnapshot?.appliedLeadWeeks);
assert.equal(planned.platform.ai!.pendingOneTimeObligations.filter(item => item.id === planned.job?.obligationId).length, 1);

const replay = planPlatformAiLocalization({
    player,
    world: worldFor(planned.platform),
    platform: planned.platform,
    absoluteWeek: week,
    contentPlanId: plan.id,
    projectId: plan.sourceProjectIds[0],
    countryIds: ['JP'],
    languageId: 'japanese',
    mode: 'SUBTITLE',
});
assert.equal(replay.reason, 'DUPLICATE');
assert.equal(replay.platform.ai!.localizationJobs.length, 1);

assert.equal(planPlatformAiLocalization({
    player,
    world: worldFor(planned.platform),
    platform: planned.platform,
    absoluteWeek: week,
    contentPlanId: plan.id,
    projectId: plan.sourceProjectIds[0],
    countryIds: ['US'],
    languageId: 'japanese',
    mode: 'SUBTITLE',
}).reason, 'INVALID_SCOPE', 'A language job cannot be attached to an unrelated release country.');

const unsupported = structuredClone(base);
unsupported.ai!.languageCapabilities = [];
const unsupportedCanonical = normalizePlatformAiState(unsupported, player.id, week + 1);
unsupportedCanonical.ai!.slate = [plan];
assert.equal(planPlatformAiLocalization({
    player,
    world: worldFor(unsupportedCanonical),
    platform: unsupportedCanonical,
    absoluteWeek: week + 1,
    contentPlanId: plan.id,
    projectId: plan.sourceProjectIds[0],
    countryIds: ['JP'],
    languageId: 'japanese',
    mode: 'SUBTITLE',
}).reason, 'CAPABILITY_INSUFFICIENT');

const missingObligation = structuredClone(planned.platform);
missingObligation.ai!.pendingOneTimeObligations = [];
const repairedMissing = normalizePlatformAiState(missingObligation, player.id, week + 1);
assert.equal(repairedMissing.ai!.localizationJobs[0].status, 'WAITING_FOR_FUNDS');
assert.equal(repairedMissing.ai!.pendingOneTimeObligations.filter(item => item.category === 'LOCALIZATION' && item.status === 'HELD').length, 1);

const poorCash = structuredClone(planned.platform);
poorCash.cashReserve = 0;
poorCash.subscribers = 0;
const poorEconomy = calculatePlatformAiWeeklyEconomy({
    player: { ...player, world: worldFor(poorCash) },
    platform: poorCash,
    absoluteWeek: week + 1,
});
assert.equal(progressPlatformAiLocalization({ player, platform: poorEconomy.platform, absoluteWeek: week + 1 }).platform.ai!.localizationJobs[0].status, 'WAITING_FOR_FUNDS');

const funded = structuredClone(planned.platform);
funded.cashReserve = 10_000;
const fundedEconomy = calculatePlatformAiWeeklyEconomy({
    player: { ...player, world: worldFor(funded) },
    platform: funded,
    absoluteWeek: week + 1,
});
const started = progressPlatformAiLocalization({ player, platform: fundedEconomy.platform, absoluteWeek: week + 1 });
assert.equal(started.platform.ai!.localizationJobs[0].status, 'IN_PROGRESS');
assert.equal(started.platform.ai!.localizationJobs[0].startedAtAbsoluteWeek, week + 1);
const repairedStartedObligations = reconcilePlatformAiLocalizationObligations(
    started.platform.ai!.pendingOneTimeObligations.filter(item => item.id !== planned.job!.obligationId),
    started.platform.ai!.localizationJobs,
);
assert.deepEqual(
    repairedStartedObligations.find(item => item.id === planned.job!.obligationId),
    {
        id: planned.job!.obligationId,
        category: 'LOCALIZATION',
        amountMillions: planned.job!.costMillions,
        createdWeek: week,
        status: 'SETTLED',
        settledWeek: week + 1,
    },
    'Internal reconciliation must restore the settlement evidence for a job that has already started.',
);
const saturatedLocalizationHistory = structuredClone(started.platform);
saturatedLocalizationHistory.ai!.pendingOneTimeObligations = [
    ...saturatedLocalizationHistory.ai!.pendingOneTimeObligations,
    ...Array.from({ length: 120 }, (_, index) => ({
        id: `localization-history-${index}`,
        category: 'DISCRETIONARY' as const,
        amountMillions: 1,
        createdWeek: week + 2 + index,
        status: 'SETTLED' as const,
        settledWeek: week + 2 + index,
    })),
];
const saturatedReloadOnce = normalizePlatformAiState(saturatedLocalizationHistory, player.id, week + 130);
const saturatedReloadTwice = normalizePlatformAiState(saturatedReloadOnce, player.id, week + 130);
assert.equal(
    saturatedReloadTwice.ai!.localizationJobs[0].status,
    'IN_PROGRESS',
    'A paid in-progress localization job must survive repeated normalization after obligation history saturation.',
);
assert.equal(
    saturatedReloadTwice.ai!.pendingOneTimeObligations.find(item => item.id === planned.job!.obligationId)?.status,
    'SETTLED',
    'The settlement backing an in-progress localization job must remain protected from history compaction.',
);
const lowerTierPlatform = structuredClone(base);
lowerTierPlatform.ai!.languageCapabilities = lowerTierPlatform.ai!.languageCapabilities.map(capability => (
    capability.languageId === 'japanese'
        ? { ...capability, subtitleLevel: 2 as const }
        : capability
));
const lowerTierPlanned = planPlatformAiLocalization({
    player,
    world: worldFor(lowerTierPlatform),
    platform: lowerTierPlatform,
    absoluteWeek: week,
    contentPlanId: plan.id,
    projectId: plan.sourceProjectIds[0],
    countryIds: ['JP'],
    languageId: 'japanese',
    mode: 'SUBTITLE',
});
assert.equal(lowerTierPlanned.job?.capabilityTierAtPlanning, 2);
const lowerTierFunded = structuredClone(lowerTierPlanned.platform);
lowerTierFunded.cashReserve = 10_000;
const lowerTierEconomy = calculatePlatformAiWeeklyEconomy({
    player: { ...player, world: worldFor(lowerTierFunded) },
    platform: lowerTierFunded,
    absoluteWeek: week + 1,
});
const lowerTierStarted = progressPlatformAiLocalization({
    player,
    platform: lowerTierEconomy.platform,
    absoluteWeek: week + 1,
});
const upgradedCapabilityPlatform = structuredClone(lowerTierStarted.platform);
upgradedCapabilityPlatform.ai!.languageCapabilities = upgradedCapabilityPlatform.ai!.languageCapabilities.map(capability => (
    capability.languageId === 'japanese'
        ? { ...capability, subtitleLevel: 3 as const }
        : capability
));
const upgradedCapabilityReload = normalizePlatformAiState(upgradedCapabilityPlatform, player.id, week + 2);
assert.equal(
    upgradedCapabilityReload.ai!.localizationJobs[0]?.status,
    'IN_PROGRESS',
    'Improving a language capability must not invalidate a paid job quoted at an earlier tier.',
);
assert.equal(
    upgradedCapabilityReload.ai!.localizationJobs[0]?.capabilityTierAtPlanning,
    2,
    'Persisted localization quotes must keep the capability tier captured at planning time.',
);
const readyWeek = week + 1 + started.platform.ai!.localizationJobs[0].leadWeeks;
const ready = progressPlatformAiLocalization({ player, platform: started.platform, absoluteWeek: readyWeek });
assert.equal(ready.platform.ai!.localizationJobs[0].status, 'READY');

const immutableQuote = structuredClone(started.platform);
immutableQuote.ai!.capabilities.technologyLevels.CONTENT_OPERATIONS = 100;
const reloadedImmutable = normalizePlatformAiState(immutableQuote, player.id, week + 2);
assert.equal(reloadedImmutable.ai!.localizationJobs[0].capabilityTierAtPlanning, 3);
assert.equal(reloadedImmutable.ai!.localizationJobs[0].costMillions, planned.job!.costMillions);
assert.equal(reloadedImmutable.ai!.localizationJobs[0].leadWeeks, planned.job!.leadWeeks);

const orphan = structuredClone(planned.platform);
orphan.ai!.localizationJobs[0].contentPlanId = 'missing-plan';
const repairedOrphan = normalizePlatformAiState(orphan, player.id, week + 1);
assert.equal(repairedOrphan.ai!.localizationJobs.length, 0);
assert.equal(repairedOrphan.ai!.pendingOneTimeObligations.filter(item => item.category === 'LOCALIZATION').length, 0);

// Aggregate Phase 3 saves migrate to exact language jobs without adding or replaying spend.
const legacy = structuredClone(base);
const legacyId = getPlatformAiLocalizationJobId(
    'NETFLIX', plan.id, plan.sourceProjectIds[0], 'SUBTITLES', ['JP', 'US'], 22,
);
const legacyObligationId = getPlatformAiLocalizationObligationId(legacyId);
legacy.ai!.localizationJobs = [{
    id: legacyId,
    platformId: 'NETFLIX',
    contentPlanId: plan.id,
    projectId: plan.sourceProjectIds[0],
    countryIds: ['JP', 'US'],
    level: 'SUBTITLES',
    contentOperationsLevelAtPlanning: 22,
    costMillions: 0.12,
    leadWeeks: 3,
    obligationId: legacyObligationId,
    status: 'IN_PROGRESS',
    createdAtAbsoluteWeek: week,
    startedAtAbsoluteWeek: week + 1,
    readyAtAbsoluteWeek: null,
    cancelledAtAbsoluteWeek: null,
} as any];
legacy.ai!.pendingOneTimeObligations = [{
    id: legacyObligationId,
    category: 'LOCALIZATION',
    amountMillions: 0.12,
    createdWeek: week,
    status: 'SETTLED',
    settledWeek: week + 1,
}];
const migrated = normalizePlatformAiState(legacy, player.id, week + 2);
assert.equal(migrated.ai!.localizationJobs.length, 1);
assert.ok(migrated.ai!.localizationJobs.every(job => job.quoteVersion === 0));
assert.deepEqual(migrated.ai!.localizationJobs.map(job => `${job.languageId}:${job.mode}`), ['japanese:SUBTITLE']);
assert.equal(migrated.ai!.localizationJobs.reduce((sum, job) => sum + job.costMillions, 0), 0.12);
assert.ok(migrated.ai!.localizationJobs.every(job => job.status === 'IN_PROGRESS'));
assert.equal(migrated.ai!.pendingOneTimeObligations.filter(item => item.category === 'LOCALIZATION').length, 1);
assert.ok(migrated.ai!.pendingOneTimeObligations.filter(item => item.category === 'LOCALIZATION').every(item => item.status === 'SETTLED'));
assert.equal(migrated.ai!.pendingOneTimeObligations.some(item => item.id === legacyObligationId), false);

const acquiredPlayer = structuredClone(player);
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const unpaidHandoffWorld = normalizePlatformAiState(planned.platform, player.id, week);
const unpaidHandoff = normalizeWorldPlatformAi(
    acquiredPlayer,
    worldFor(unpaidHandoffWorld),
    week + 1,
).platforms!.NETFLIX;
assert.ok(unpaidHandoff.ai!.localizationJobs[0].costMillions >= planned.job!.costMillions);
assert.equal(
    unpaidHandoff.ai!.pendingOneTimeObligations.find(item => item.id === planned.job!.obligationId)?.amountMillions,
    unpaidHandoff.ai!.localizationJobs[0].costMillions,
    'An unpaid localization promise must convert its held obligation to the player-standard amount.',
);
const paidHandoff = normalizeWorldPlatformAi(
    acquiredPlayer,
    worldFor(started.platform),
    week + 2,
).platforms!.NETFLIX;
assert.equal(paidHandoff.ai!.localizationJobs[0].costMillions, started.platform.ai!.localizationJobs[0].costMillions);
assert.equal(paidHandoff.ai!.localizationJobs[0].leadWeeks, started.platform.ai!.localizationJobs[0].leadWeeks);
assert.deepEqual(planPlatformAiLocalization({
    player: acquiredPlayer,
    world: worldFor(base),
    platform: base,
    absoluteWeek: week,
    contentPlanId: plan.id,
    projectId: plan.sourceProjectIds[0],
    countryIds: ['JP'],
    languageId: 'japanese',
    mode: 'SUBTITLE',
}).platform, base);

assert.notEqual(
    planned.job!.id,
    createDeterministicId('platform_ai_localization_job', 'NETFLIX', plan.id, plan.sourceProjectIds[0], 'SUBTITLES'),
    'The canonical identity must include exact language, mode, countries and tier.',
);

console.log('Platform AI per-language localization audit passed.');
