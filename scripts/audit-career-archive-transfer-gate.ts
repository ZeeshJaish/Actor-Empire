import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { prepareSaveTransferImportEntries } from '../services/saveTransfer';
import { createArchiveRoot } from '../services/careerArchive';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'archive-transfer-player';
player.flags = { ...player.flags, careerArchiveRootDigest: 'a'.repeat(64) };
await assert.rejects(
  prepareSaveTransferImportEntries([{ key: 'actorEmpireSave_1', value: player }], {
    archiveAppVersion: 'test', importedAt: '2026-09-25T00:00:00.000Z',
  }),
  /cannot restore without losing history/i,
);
console.log('Career archive transfer gate audit passed.');
const root = await createArchiveRoot('actorEmpireSave_1', player.id, []);
player.flags.careerArchiveRootDigest = root.digest;
const prepared = await prepareSaveTransferImportEntries([{ key: 'actorEmpireSave_1', value: player }], {
  archiveAppVersion: 'test', importedAt: '2026-09-25T00:00:00.000Z', archiveRoot: root,
});
assert.equal(prepared.entries[0].archiveRoot?.digest, root.digest);
