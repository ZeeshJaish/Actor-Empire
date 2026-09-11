import assert from 'node:assert/strict';
import {
    buildStreamingPlatformRunsForProject,
    summarizeStreamingPlatformRuns,
} from '../services/streamingReleaseRuns';
import { INITIAL_PLAYER, type Player } from '../types';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.world.streamingRightsContracts = Object.fromEntries(
    ['ALPHA', 'BETA', 'GAMMA'].map((platformId, index) => [
        `contract-${platformId}`,
        {
            id: `contract-${platformId}`,
            sourceProjectId: 'shared-project',
            status: 'ACTIVE',
            startsAtAbsoluteWeek: 2_010,
            buyer: { platformId },
            licensorRevenueShare: 5 + index,
        },
    ]),
) as Player['world']['streamingRightsContracts'];

const runs = buildStreamingPlatformRunsForProject(player, 'shared-project');
assert.equal(runs.length, 3);
assert.deepEqual(runs.map(run => run.platformId), ['ALPHA', 'BETA', 'GAMMA']);
assert.ok(runs.every(run => run.startWeekAbsolute === 2_010), 'shared buyers must co-premiere');
assert.deepEqual(runs.map(run => run.contractId), ['contract-ALPHA', 'contract-BETA', 'contract-GAMMA']);

const summary = summarizeStreamingPlatformRuns(runs.map((run, index) => ({
    ...run,
    totalViews: (index + 1) * 1_000,
    weeklyViews: [(index + 1) * 1_000],
})));
assert.equal(summary.totalViews, 6_000);
assert.equal(summary.latestWeeklyViews, 6_000);
assert.equal(summary.allLeaving, false);

console.log('Streaming release runs audit passed.');
