/* Regression audit (24 Nov 2026): a commission the PLAYER'S studio makes for a platform must keep its dubbing / subtitle job.
   Players' commissions sat on "<platform> picks a week" for years (since 1.0.26, "platform AI through phase 6"): the platform plans the
   job with the production's project id (player_commission_project_..., made in platformAiPlayerCommissions), but the weekly state
   normalizer only accepted the id of the platform's OWN originals (platform_ai_project_...). So the job was dropped every week, planned
   and paid again, and never reached its lead weeks; until it is READY the platform never picks a premiere week.
   Only the platform's own originals were ever tested, which is why it went unseen.
   Checks: the job planned for a player's commission survives a weekly reload with its planning week, a second plan is a DUPLICATE (not
   a new job and a new payment), the platform's own originals still work, and a job for any other project is still dropped. */
import assert from 'node:assert/strict';
import type { IndustryProductionCommitment, PlatformAiContentPlan, PlatformState, WorldState } from '../types';
import { createDeterministicId } from '../services/deterministicRandom';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizePlatformAiState, planPlatformAiLocalization } from '../services/platformAi';
import {
    getPlatformAiLocalizationJobId,
    getPlatformAiLocalizationObligationId,
} from '../services/platformAi/platformAiLocalizationCore';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const player = createPlatformAiFixture();
const week = getAbsoluteWeek(player.age, player.currentWeek);
const base = normalizePlatformAiState(player.world.platforms!.NETFLIX, player.id, week);

const originalPlan = (id: string, productionId: string): PlatformAiContentPlan => ({
    id,
    platformId: 'NETFLIX',
    controllerAtCommitment: 'AI',
    source: 'COMMISSIONED_ORIGINAL',
    status: 'DELIVERED',
    title: `Original ${id}`,
    projectType: 'SERIES',
    genre: 'DRAMA',
    targetAudience: 'PG-13',
    sourceProjectIds: [],
    rightsContractIds: [],
    cataloguePackageId: null,
    commissionId: `commission-${id}`,
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
    committedAtAbsoluteWeek: week - 8,
    rightsReadyAtAbsoluteWeek: week,
    localizationReadyAtAbsoluteWeek: null,
    premiereAtAbsoluteWeek: null,
    releasePattern: null,
    releaseEntries: [],
    scheduledAtAbsoluteWeek: null,
    releasedAtAbsoluteWeek: null,
    industryProductionId: productionId,
    forecast: { strategic: 80, creative: 80, commercial: 80, prestige: 80, risk: 20 },
});

/* the same two project ids the game makes: the platform's own original, and a production the player's studio makes for the platform */
const playerPlan = originalPlan('player-commission-plan', 'player-production');
const ownPlan = originalPlan('platform-own-plan', 'platform-production');
const playerProjectId = createDeterministicId('player_commission_project', 'NETFLIX', playerPlan.id);
const ownProjectId = createDeterministicId('platform_ai_project', 'NETFLIX', ownPlan.id);
assert.notEqual(playerProjectId, ownProjectId);

const withSlate: PlatformState = structuredClone(base);
withSlate.ai!.slate = [playerPlan, ownPlan];
const world: WorldState = {
    ...player.world,
    platforms: { ...player.world.platforms!, NETFLIX: withSlate },
    industryProductions: {
        'player-production': { id: 'player-production', canonicalProjectId: playerProjectId } as unknown as IndustryProductionCommitment,
        'platform-production': { id: 'platform-production', canonicalProjectId: ownProjectId } as unknown as IndustryProductionCommitment,
    },
};
const planFor = (platform: PlatformState, plan: PlatformAiContentPlan, projectId: string, absoluteWeek: number) => planPlatformAiLocalization({
    player,
    world: { ...world, platforms: { ...world.platforms!, NETFLIX: platform } },
    platform,
    absoluteWeek,
    contentPlanId: plan.id,
    projectId,
    countryIds: ['JP'],
    languageId: 'japanese',
    mode: 'SUBTITLE',
});
const jobsOf = (platform: PlatformState, plan: PlatformAiContentPlan) => platform.ai!.localizationJobs.filter(job => job.contentPlanId === plan.id);

for (const [label, plan, projectId] of [
    ['a commission the player\'s studio makes for a platform', playerPlan, playerProjectId],
    ['a platform\'s own original', ownPlan, ownProjectId],
] as const) {
    const planned = planFor(withSlate, plan, projectId, week);
    assert.equal(planned.reason, 'PLANNED', `${label}: the dubbing job is planned`);
    assert.equal(jobsOf(planned.platform, plan).length, 1);

    /* every game week normalizes the platform's state: the job must come through it unchanged */
    const reloaded = normalizePlatformAiState(planned.platform, player.id, week + 1);
    const kept = jobsOf(reloaded, plan);
    assert.equal(kept.length, 1, `${label}: the dubbing job is dropped by the weekly reload (the platform never picks a premiere week)`);
    assert.equal(kept[0].projectId, projectId);
    assert.equal(kept[0].createdAtAbsoluteWeek, week, `${label}: the job keeps its planning week`);
    assert.equal(
        reloaded.ai!.pendingOneTimeObligations.filter(item => item.id === kept[0].obligationId).length,
        1,
        `${label}: the job keeps its one payment`,
    );

    /* planning it again is a duplicate, not a new job with a new payment */
    const again = planFor(reloaded, plan, projectId, week + 1);
    assert.equal(again.reason, 'DUPLICATE', `${label}: planned again after the reload (a new job, a new payment, every week)`);
    assert.equal(jobsOf(again.platform, plan).length, 1);
}

/* a job for any other project is still not the commission's: it is dropped */
const planned = planFor(withSlate, playerPlan, playerProjectId, week);
const job = planned.job!;
const strayProjectId = 'some-other-project';
const strayJobId = getPlatformAiLocalizationJobId({
    platformId: 'NETFLIX',
    contentPlanId: playerPlan.id,
    projectId: strayProjectId,
    languageId: job.languageId,
    mode: job.mode,
    countryIds: job.countryIds,
    capabilityTier: job.capabilityTierAtPlanning,
});
const stray = structuredClone(planned.platform);
stray.ai!.localizationJobs = [{ ...job, id: strayJobId, projectId: strayProjectId, obligationId: getPlatformAiLocalizationObligationId(strayJobId) }];
const strayReloaded = normalizePlatformAiState(stray, player.id, week + 1);
assert.equal(jobsOf(strayReloaded, playerPlan).length, 0, 'a dubbing job for a project that is not the commission must still be dropped');

console.log('Platform AI commission dubbing job audit passed.');
