import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { compareProtectedSaveState, createSaveIntegrityManifest } from '../services/saveIntegrity';
import { compactPlayerForPersistence } from '../services/saveCompaction';

const legacy = structuredClone(INITIAL_PLAYER) as Player;
legacy.world.studios = {
    LEGACY_FIXTURE: {
        id: 'LEGACY_FIXTURE',
        name: 'Legacy Fixture Studios',
        valuation: 0.6,
        reputation: 57,
        cashReserve: 62,
        recentHits: 1,
        archetype: 'EMERGENT',
    },
};
legacy.world.npcVentures = {
    old_closed_venture: {
        id: 'old_closed_venture',
        name: 'Old Closed Venture',
        ownerNpcId: 'old_founder',
        ownerName: 'Old Founder',
        archetype: 'AWARDS_BOUTIQUE',
        status: 'CLOSED',
        valuation: 0.02,
        cashReserve: -9,
        hype: 12,
        reputation: 34,
        creativeQuality: 61,
        risk: 72,
        foundedWeek: 4,
        foundedYear: 20,
        lastProjectWeek: 28,
        nextProjectWeek: 44,
        projectsReleased: 2,
        hits: 0,
        flops: 2,
        history: [],
        closureReason: 'Financing collapsed',
    },
};

const migrated = migratePlayerSave(legacy);
assert.ok(Number(migrated.flags.saveMigrationVersion) >= 32, 'B1 studio runtime migration must advance the save schema');
assert.equal(migrated.world.studios?.LEGACY_FIXTURE.ai?.schemaVersion, 1, 'old studios must gain a normalized AI runtime on load');
assert.equal(migrated.world.studios?.old_closed_venture.ai?.status, 'CLOSED', 'closed generated companies must survive save migration');
assert.equal(migrated.world.studios?.old_closed_venture.ai?.legacyVenture?.closureReason, 'Financing collapsed');
const repeated = migratePlayerSave(structuredClone(migrated));
assert.deepEqual(repeated.world.studios, migrated.world.studios, 'studio migration must be idempotent across repeated loads');

const manifest = createSaveIntegrityManifest(migrated, 'MIGRATION');
assert.ok(manifest.protected.studioCompanies.count >= 2, 'canonical studio identities must be protected by save integrity');
const missingStudio = structuredClone(migrated);
delete missingStudio.world.studios?.LEGACY_FIXTURE;
const comparison = compareProtectedSaveState(migrated, missingStudio);
assert.equal(comparison.ok, false);
assert.ok(!comparison.ok && comparison.violations.includes('studio companies identities changed'));

const oversized = structuredClone(migrated);
const oversizedStudio = oversized.world.studios!.LEGACY_FIXTURE;
oversizedStudio.ai!.finance.debtPrincipalMillions = 77;
oversizedStudio.ai!.controller = 'PLAYER';
oversizedStudio.ai!.ledger = Array.from({ length: 400 }, (_, index) => ({
    id: `ledger_${index}`,
    absoluteWeek: index,
    category: 'OPERATING_COST' as const,
    amountMillions: -1,
    balanceAfterMillions: 400 - index,
    description: 'Operating cost',
}));
const compacted = compactPlayerForPersistence(oversized);
assert.equal(compacted.world.studios?.LEGACY_FIXTURE.ai?.ledger.length, 104, 'studio AI ledgers must remain bounded in persisted saves');
assert.equal(compacted.world.studios?.LEGACY_FIXTURE.ai?.ledger[0]?.id, 'ledger_296', 'compaction must retain the newest studio ledger history');
assert.equal(compacted.world.studios?.LEGACY_FIXTURE.ai?.finance.debtPrincipalMillions, 77, 'active debt must never be compacted away');
assert.equal(compacted.world.studios?.LEGACY_FIXTURE.ai?.controller, 'PLAYER', 'controller handoff state must survive compaction');

console.log('Studio AI B1 save migration audit passed.');
