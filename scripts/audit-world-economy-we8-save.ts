import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { createSaveIntegrityManifest, verifySaveIntegrity } from '../services/saveIntegrity';
import { migratePlayerSave, SAVE_MIGRATION_VERSION } from '../services/saveMigration';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';

const makePlayer = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = 'we8-save-audit';
    player.age = 45;
    player.currentWeek = 8;
    return migratePlayerSave(player);
};

const canonical = makePlayer();
const manifest = createSaveIntegrityManifest(canonical, 'MANUAL', 1234);
const tampered = structuredClone(canonical) as Player;
tampered.world.worldStreamingPlatformEconomy!.global.endingPaidAccounts += 10;
assert.equal(verifySaveIntegrity(tampered, manifest).ok, false, 'manifest protects the compact canonical WE fingerprint');

const bloated = structuredClone(canonical) as Player;
const economy = bloated.world.worldStreamingPlatformEconomy!;
const snapshot = economy.snapshots.at(-1)!;
economy.snapshots = Array.from({ length: 100 }, (_, index) => ({ ...snapshot, absoluteWeek: index }));
economy.historyByPlatform = Object.fromEntries(Object.entries(economy.platforms).map(([platformId, summary]) => [
    platformId,
    Array.from({ length: 100 }, (_, index) => ({
        absoluteWeek: index,
        controller: summary.controller,
        endingPaidAccounts: summary.endingPaidAccounts,
        viewingAccounts: summary.viewingAccounts,
        hoursViewed: summary.hoursViewed,
        weeklyRevenue: summary.weeklyRevenue,
        weeklyOperatingResult: summary.weeklyOperatingResult,
    })),
]));
const compacted = compactPlayerForPersistence(bloated);
assert.ok(compacted.world.worldStreamingPlatformEconomy!.snapshots.length <= 52);
assert.ok(Object.values(compacted.world.worldStreamingPlatformEconomy!.historyByPlatform).every(history => history.length <= 52));
assert.equal(compacted.pastProjects.length, bloated.pastProjects.length, 'WE history trimming preserves project identities');

for (const estimatedBytes of [24 * 1024 * 1024 + 1, 50 * 1024 * 1024, 400 * 1024 * 1024]) {
    const prepared = prepareVerifiedPlayerForPersistence(canonical, 'IMPORT', {
        currentIsUnverified: true,
        sourceByteEstimate: estimatedBytes,
    });
    assert.equal(prepared.needsRecoveryCheckpoint, true, `${estimatedBytes} bytes requests a recovery checkpoint`);
    assert.equal(prepared.retainPrevious, false);
}

const malformed = structuredClone(canonical) as Player;
malformed.world.worldStreamingPlatformEconomy!.global.weeklyRevenue = Number.NaN;
const repaired = migratePlayerSave(malformed);
assert.ok(Number.isFinite(repaired.world.worldStreamingPlatformEconomy!.global.weeklyRevenue));
assert.equal(repaired.world.worldEconomyHealth?.schemaVersion, 1);
assert.equal(repaired.world.worldEconomyHealth?.lastSuccessfulMigrationVersion, SAVE_MIGRATION_VERSION);
assert.deepEqual(migratePlayerSave(repaired), repaired, 'WE8 migration is idempotent');

console.log('World economy WE8 save integrity, compaction, and migration audit passed.');
