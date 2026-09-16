import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { advanceWorldPopulationToWeek, normalizeWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { normalizeWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import { normalizeWorldStreamingCompetitionState } from '../services/worldEconomy/worldStreamingCompetition';
import { advanceWorldStreamingCustomersToWeek } from '../services/worldEconomy/worldStreamingCustomers';
import { advanceWorldStreamingViewingToWeek } from '../services/worldEconomy/worldStreamingViewing';
import { advanceWorldStreamingPlatformEconomyToWeek } from '../services/worldEconomy/worldStreamingPlatformEconomy';
import { validateWorldEconomyCandidate } from '../services/worldEconomy/worldEconomyIntegrity';

const percentile = (values: number[], percentileValue: number): number => {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileValue) - 1))] || 0;
};

let player = migratePlayerSave(structuredClone(INITIAL_PLAYER) as Player);
player.id = 'we8-400-year-engine-soak';
player.age = 30;
player.currentWeek = 1;
player = migratePlayerSave(player);
const startWeek = getAbsoluteWeek(player.age, player.currentWeek);
const samples: number[] = [];
let previousWeek = startWeek;

for (let year = 1; year <= 400; year += 1) {
    const started = performance.now();
    player = { ...player, age: 30 + year, currentWeek: 1 };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    assert.equal(absoluteWeek, startWeek + year * 52, `year ${year} reaches the exact absolute-week destination`);
    player.world.worldPopulation = advanceWorldPopulationToWeek(
        normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek),
        absoluteWeek,
    );
    player.world.worldAudienceEconomy = normalizeWorldAudienceEconomyState(
        player.world.worldAudienceEconomy,
        player.world.worldPopulation,
        absoluteWeek,
    );
    player.world.worldAudienceParticipation = normalizeWorldAudienceParticipationState(
        player.world.worldAudienceParticipation,
        player.world.worldPopulation,
        player.world.worldAudienceEconomy,
        absoluteWeek,
    );
    if (year === 200) {
        player.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
    }
    player.world.worldStreamingCompetition = normalizeWorldStreamingCompetitionState(
        player.world.worldStreamingCompetition,
        player,
        absoluteWeek,
    );
    player.world.worldStreamingCustomers = advanceWorldStreamingCustomersToWeek(
        player.world.worldStreamingCustomers,
        player,
        absoluteWeek,
    );
    player.world.worldStreamingViewing = advanceWorldStreamingViewingToWeek(
        player.world.worldStreamingViewing,
        player,
        absoluteWeek,
    );
    player.world.worldStreamingPlatformEconomy = advanceWorldStreamingPlatformEconomyToWeek(
        player.world.worldStreamingPlatformEconomy,
        player,
        absoluteWeek,
    );
    assert.ok(absoluteWeek > previousWeek);
    previousWeek = absoluteWeek;
    assert.deepEqual(validateWorldEconomyCandidate(player, absoluteWeek), { status: 'VALID', violations: [] });
    if (year % 25 === 0) {
        player = migratePlayerSave(JSON.parse(JSON.stringify(player)));
        assert.deepEqual(validateWorldEconomyCandidate(player, absoluteWeek), { status: 'VALID', violations: [] });
    }
    samples.push(performance.now() - started);
}

const economy = player.world.worldStreamingPlatformEconomy!;
const serializedBytes = Buffer.byteLength(JSON.stringify({
    population: player.world.worldPopulation,
    audience: player.world.worldAudienceEconomy,
    participation: player.world.worldAudienceParticipation,
    competition: player.world.worldStreamingCompetition,
    customers: player.world.worldStreamingCustomers,
    viewing: player.world.worldStreamingViewing,
    economy,
}));
assert.equal(previousWeek, startWeek + 20_800);
assert.ok(economy.snapshots.length <= 52);
assert.ok(Object.values(economy.historyByPlatform).every(history => history.length <= 52));
assert.ok(serializedBytes < 8 * 1024 * 1024, `WE1-WE7 state remains below 8 MiB (${serializedBytes} bytes)`);
const netflix = economy.platforms.NETFLIX;
if (netflix) {
    assert.equal(netflix.controller, 'PLAYER');
    assert.equal(netflix.operatingCostPolicy.aiAssistanceActive, false);
    assert.equal(netflix.operatingCostPolicy.appliedCostMultiplier, 1);
}

console.log(JSON.stringify({
    evidenceClass: 'node-engine-annual-checkpoint-soak',
    years: 400,
    destinationWeeks: 20_800,
    checkpoints: samples.length,
    p50Ms: Number(percentile(samples, .5).toFixed(2)),
    p95Ms: Number(percentile(samples, .95).toFixed(2)),
    maxMs: Number(Math.max(...samples).toFixed(2)),
    weStateKiB: Number((serializedBytes / 1024).toFixed(1)),
    heapUsedMiB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
}, null, 2));
