import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import {
    prepareExternalPlayerUpdateForUi,
    prepareProcessedWeekForUi,
} from '../services/playerUiState';

const canonical = migratePlayerSave(JSON.parse(JSON.stringify(INITIAL_PLAYER)) as Player);
const trusted = prepareProcessedWeekForUi(canonical);
const external = prepareExternalPlayerUpdateForUi(canonical);
assert.equal(
    JSON.stringify(trusted),
    JSON.stringify(external),
    'A canonical processed week must retain the same serializable UI state on both preparation paths.',
);
assert.strictEqual(
    trusted.world.projects,
    canonical.world.projects,
    'Trusted processed-week preparation must not deep-clone the canonical world catalogue.',
);

const legacy = structuredClone(INITIAL_PLAYER) as Player;
delete legacy.world.streamingRightsContracts;
delete legacy.world.streamingRightsTransactions;
const migratedLegacy = prepareExternalPlayerUpdateForUi(legacy);
assert.deepEqual(migratedLegacy.world.streamingRightsContracts, {});
assert.deepEqual(migratedLegacy.world.streamingRightsTransactions, {});

console.log('Player UI state audit passed.');
