import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { migratePlayerSave } from '../services/saveMigration';
import {
    repairDerivedWorldEconomyState,
    validateWorldEconomyCandidate,
} from '../services/worldEconomy/worldEconomyIntegrity';

const makeCanonicalPlayer = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = 'we8-integrity-audit';
    player.age = 34;
    player.currentWeek = 17;
    return migratePlayerSave(player);
};

const canonical = makeCanonicalPlayer();
const absoluteWeek = getAbsoluteWeek(canonical.age, canonical.currentWeek);
const before = JSON.stringify(canonical);

assert.deepEqual(
    validateWorldEconomyCandidate(canonical, absoluteWeek),
    { status: 'VALID', violations: [] },
    'a canonical WE1-WE7 state passes the bounded runtime integrity contract',
);
assert.equal(JSON.stringify(canonical), before, 'runtime validation never mutates the candidate');

const mismatchedWe7 = structuredClone(canonical) as Player;
mismatchedWe7.world.worldStreamingPlatformEconomy!.global.endingPaidAccounts += 2;
const mismatch = validateWorldEconomyCandidate(mismatchedWe7, absoluteWeek);
assert.equal(mismatch.status, 'REBUILD_DERIVED', 'a derived WE7 mismatch requests one deterministic rebuild');
assert.ok(mismatch.violations.some(item => item.code === 'WE7_PAID_ACCOUNTS_MISMATCH'));

const oversizedHistory = structuredClone(canonical) as Player;
const lastSnapshot = oversizedHistory.world.worldStreamingPlatformEconomy!.snapshots.at(-1)!;
oversizedHistory.world.worldStreamingPlatformEconomy!.snapshots = Array.from(
    { length: 53 },
    (_, index) => ({ ...lastSnapshot, absoluteWeek: absoluteWeek - index }),
);
const historyResult = validateWorldEconomyCandidate(oversizedHistory, absoluteWeek);
assert.equal(historyResult.status, 'REBUILD_DERIVED');
assert.ok(historyResult.violations.some(item => item.code === 'WE7_HISTORY_UNBOUNDED'));

const acquiredWithAiCosts = structuredClone(canonical) as Player;
acquiredWithAiCosts.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const acquiredNetflix = acquiredWithAiCosts.world.worldStreamingPlatformEconomy!.platforms.NETFLIX;
assert.ok(acquiredNetflix, 'fixture includes Netflix');
acquiredNetflix.controller = 'AI';
acquiredNetflix.operatingCostPolicy.controller = 'AI';
acquiredNetflix.operatingCostPolicy.aiAssistanceActive = true;
acquiredNetflix.operatingCostPolicy.appliedCostMultiplier = 0.82;
const acquiredResult = validateWorldEconomyCandidate(acquiredWithAiCosts, absoluteWeek);
assert.equal(acquiredResult.status, 'REBUILD_DERIVED');
assert.ok(acquiredResult.violations.some(item => item.code === 'WE7_ACQUIRED_AI_ASSISTANCE'));

const nonFiniteMoney = structuredClone(canonical) as Player;
nonFiniteMoney.money = Number.NaN;
const protectedResult = validateWorldEconomyCandidate(nonFiniteMoney, absoluteWeek);
assert.equal(protectedResult.status, 'ABORT_PROTECTED', 'non-finite player money aborts rather than being guessed');
assert.ok(protectedResult.violations.some(item => item.code === 'PLAYER_MONEY_NON_FINITE'));

const repaired = repairDerivedWorldEconomyState(mismatchedWe7, absoluteWeek);
assert.deepEqual(
    validateWorldEconomyCandidate(repaired, absoluteWeek),
    { status: 'VALID', violations: [] },
    'one dependency-ordered rebuild restores derived WE integrity',
);
assert.equal(repaired.money, canonical.money, 'derived repair leaves protected player money unchanged');
assert.equal(repaired.pastProjects.length, canonical.pastProjects.length, 'derived repair leaves project history unchanged');

console.log('World economy WE8 integrity audit passed.');
