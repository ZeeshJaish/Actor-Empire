import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createArchiveChunk, createArchiveRoot } from '../services/careerArchive';
import { archiveChunkStorageKey } from '../services/careerArchiveStore';
import { createSaveIntegrityManifest } from '../services/saveIntegrity';
import {
  getSaveGenerationKeys,
  loadVerifiedGameData,
  recoverPreviousGameData,
  saveVerifiedGameData,
  type SaveGenerationStore,
  type StoredSaveGeneration,
} from '../services/saveGenerations';

const records = new Map<string, unknown>();
const read = async (key: string) => structuredClone(records.get(key) ?? null);
const write = async (key: string, value: unknown) => { records.set(key, structuredClone(value)); };
const slot = 'actorEmpireSave_1';
const keys = getSaveGenerationKeys(slot);
const store: SaveGenerationStore = {
  read,
  write,
  remove: async key => { records.delete(key); },
  promoteGeneration: async ({ keys: k, retainPrevious }) => {
    const candidate = await read(k.candidate) as StoredSaveGeneration;
    const oldPlayer = await read(k.current);
    const oldManifest = await read(k.integrity);
    const oldRoot = await read(k.archiveRoot) as { root?: StoredSaveGeneration['archiveRoot'] } | null;
    if (retainPrevious && oldPlayer && oldManifest) {
      await write(k.previous, {
        kind: 'ACTOR_EMPIRE_SAVE_GENERATION', formatVersion: 1,
        player: oldPlayer, manifest: oldManifest, archiveRoot: oldRoot?.root,
        needsRecoveryCheckpoint: false,
      });
    }
    await write(k.current, candidate.player);
    await write(k.integrity, candidate.manifest);
    if (candidate.archiveRoot) {
      await write(k.archiveRoot, { kind: 'ACTOR_EMPIRE_ARCHIVE_ROOT', root: candidate.archiveRoot, manifestDigest: candidate.manifest.digest });
    } else records.delete(k.archiveRoot);
    records.delete(k.candidate);
  },
  recoverGeneration: async ({ keys: k }) => {
    const previous = await read(k.previous) as StoredSaveGeneration;
    await write(k.current, previous.player);
    await write(k.integrity, previous.manifest);
    if (previous.archiveRoot) await write(k.archiveRoot, {
      kind: 'ACTOR_EMPIRE_ARCHIVE_ROOT', root: previous.archiveRoot,
      manifestDigest: previous.manifest.digest,
    });
    else records.delete(k.archiveRoot);
  },
  promoteGenerationBatch: async () => { throw new Error('unused'); },
};
const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'archive-player';
player.name = 'Archive Player';
const initialManifest = createSaveIntegrityManifest(player, 'MANUAL');
await saveVerifiedGameData(store, slot, player, initialManifest);
assert.equal((await loadVerifiedGameData(store, slot)).status, 'CURRENT', 'v1 saves must still load');

const chunk = await createArchiveChunk('X_POST', [{ id: 'post-1', value: { text: 'hello' } }]);
const root = await createArchiveRoot(slot, player.id, [
  { id: chunk.id, domain: chunk.domain, digest: chunk.digest, recordCount: 1, sequence: 0 },
]);
const archivedPlayer = structuredClone(player) as Player;
archivedPlayer.flags = { ...archivedPlayer.flags, careerArchiveRootDigest: root.digest };
const archivedManifest = createSaveIntegrityManifest(archivedPlayer, 'MANUAL');
await assert.rejects(
  saveVerifiedGameData(store, slot, archivedPlayer, archivedManifest, { archiveRoot: root }),
  /missing|archive|chunk/i,
  'a root cannot promote without its staged chunks',
);
assert.equal((await loadVerifiedGameData(store, slot)).status, 'CURRENT');
await write(archiveChunkStorageKey(slot, chunk), chunk);
const next = structuredClone(archivedPlayer) as Player;
next.currentWeek = 2;
const nextManifest = createSaveIntegrityManifest(next, 'MANUAL');
await saveVerifiedGameData(store, slot, next, nextManifest, { archiveRoot: root });
const loaded = await loadVerifiedGameData(store, slot);
assert.equal(loaded.status, 'CURRENT');
if (loaded.status === 'CURRENT') assert.equal(loaded.archiveRoot?.digest, root.digest);
const continued = structuredClone(next) as Player;
continued.currentWeek = 3;
const continuedManifest = createSaveIntegrityManifest(continued, 'AUTOSAVE');
await saveVerifiedGameData(store, slot, continued, continuedManifest, { retainPrevious: false });
const continuedLoad = await loadVerifiedGameData(store, slot);
assert.equal(continuedLoad.status, 'CURRENT', 'a normal autosave must continue an archive-backed career');
if (continuedLoad.status === 'CURRENT') {
  assert.equal(continuedLoad.player.currentWeek, 3);
  assert.equal(continuedLoad.archiveRoot?.digest, root.digest, 'autosave must keep the exact archive root');
}
const missingMarker = structuredClone(continued) as Player;
delete missingMarker.flags.careerArchiveRootDigest;
await assert.rejects(
  saveVerifiedGameData(store, slot, missingMarker, createSaveIntegrityManifest(missingMarker, 'AUTOSAVE')),
  /archive root/i,
  'an autosave must not drop the archive marker',
);
const changedMarker = structuredClone(continued) as Player;
changedMarker.flags.careerArchiveRootDigest = '0'.repeat(64);
await assert.rejects(
  saveVerifiedGameData(store, slot, changedMarker, createSaveIntegrityManifest(changedMarker, 'AUTOSAVE')),
  /archive root/i,
  'an autosave must not carry forward a root after its marker changes',
);
const currentManifest = await read(keys.integrity);
records.delete(keys.integrity);
assert.equal((await loadVerifiedGameData(store, slot)).status, 'RECOVERY_AVAILABLE', 'missing manifest must not downgrade an archived save to legacy');
await write(keys.integrity, currentManifest);
const companion = await read(keys.archiveRoot);
records.delete(keys.archiveRoot);
assert.equal((await loadVerifiedGameData(store, slot)).status, 'RECOVERY_AVAILABLE', 'missing root pointer must not appear complete');
await write(keys.archiveRoot, companion);
records.delete(archiveChunkStorageKey(slot, chunk));
assert.equal((await loadVerifiedGameData(store, slot)).status, 'RECOVERY_AVAILABLE', 'missing archive chunk must trigger recovery');
const recovered = await recoverPreviousGameData(store, slot);
assert.equal(recovered.currentWeek, player.currentWeek);
assert.equal((await loadVerifiedGameData(store, slot)).status, 'CURRENT');
assert.equal(await read(keys.archiveRoot), null, 'recovery must restore the old unarchived generation');
console.log('Career archive generation audit passed.');
