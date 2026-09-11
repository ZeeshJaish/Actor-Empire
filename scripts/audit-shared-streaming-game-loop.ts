import assert from 'node:assert/strict';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { registerProductionStreamingRightsContract } from '../services/streamingRightsCore';
import { INITIAL_PLAYER, type ActiveRelease, type Player } from '../types';

let player = structuredClone(INITIAL_PLAYER) as Player;
player.age = 30;
player.currentWeek = 10;
player.commitments = [];
player.activeReleases = [{
    id: 'shared-runtime-project',
    name: 'Shared Runtime Project',
    type: 'MOVIE',
    roleType: 'LEAD',
    projectDetails: {
        title: 'Shared Runtime Project',
        type: 'MOVIE',
        studioId: 'shared-runtime-studio',
        genre: 'DRAMA',
        budgetTier: 'MID',
        estimatedBudget: 30_000_000,
        hiddenStats: { qualityScore: 80, rawHype: 70, backendPct: 8 },
        castList: [],
        reviews: [],
    },
    distributionPhase: 'STREAMING',
    weekNum: 1,
    weeklyGross: [],
    totalGross: 0,
    budget: 30_000_000,
    status: 'RUNNING',
    productionPerformance: 80,
    streamingRevenue: 60_000_000,
    streamingUpfrontFee: 60_000_000,
    streamingRoyaltyRevenue: 0,
    streaming: { platformId: 'NETFLIX', weekOnPlatform: 1, totalViews: 0, weeklyViews: [], isLeaving: false },
} as ActiveRelease];

const premiereWeek = getAbsoluteWeek(player.age, player.currentWeek);
for (const platformId of ['NETFLIX', 'HULU', 'APPLE_TV'] as const) {
    const registration = registerProductionStreamingRightsContract(player, {
        sourceProjectId: 'shared-runtime-project',
        title: 'Shared Runtime Project',
        projectType: 'MOVIE',
        genre: 'DRAMA',
        sellerStudioId: 'shared-runtime-studio',
        sellerStudioName: 'Shared Runtime Studio',
        sellerPartyType: 'PLAYER_STUDIO',
        buyerPlatformId: platformId,
        minimumGuarantee: 20_000_000,
        platformRevenueShare: 92,
        territory: 'GLOBAL',
        exclusivity: 'NON_EXCLUSIVE',
        signedAtAbsoluteWeek: premiereWeek - 1,
        startsAtAbsoluteWeek: premiereWeek,
        durationWeeks: 52,
    });
    assert.ok(registration.contract, `${platformId} shared contract should register`);
    player = registration.player;
}

const result = await processGameWeek(player);
const release = result.player.activeReleases.find(candidate => candidate.id === 'shared-runtime-project');
assert.ok(release, 'shared release should remain active after its first platform week');
assert.equal(release.streamingRuns?.length, 3, `all signed shared contracts need independent runtime runs: ${JSON.stringify({ phase: release.distributionPhase, streaming: release.streaming, contracts: Object.keys(result.player.world.streamingRightsContracts || {}) })}`);
assert.ok(release.streamingRuns?.every(run => run.weeklyViews.length === 1 && run.totalViews > 0));
assert.ok(new Set(release.streamingRuns?.map(run => run.weeklyViews[0])).size > 1, 'buyers need distinct platform performance rather than duplicated totals');
assert.equal(
    release.streaming?.totalViews,
    release.streamingRuns?.reduce((sum, run) => sum + run.totalViews, 0),
    'legacy project totals must aggregate every buyer run',
);

let archivedPlayer = result.player;
for (let week = 0; week < 60 && archivedPlayer.activeReleases.some(candidate => candidate.id === 'shared-runtime-project'); week += 1) {
    archivedPlayer = (await processGameWeek(archivedPlayer)).player;
}
const archivedRelease = archivedPlayer.pastProjects.find(candidate => candidate.id === 'shared-runtime-project');
assert.ok(archivedRelease, 'shared release should eventually archive');
assert.equal(archivedRelease.streamingRuns?.length, 3, 'archive must preserve every signed platform run');
assert.deepEqual(
    archivedRelease.streamingRuns?.map(run => run.platformId).sort(),
    ['APPLE_TV', 'HULU', 'NETFLIX'],
    'archive must preserve the exact shared-platform lineup',
);

console.log('Shared streaming game-loop audit passed.');
