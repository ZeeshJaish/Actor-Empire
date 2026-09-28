import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createArchiveChunk } from '../services/careerArchive';
import { stageCareerArchiveChunks } from '../services/careerArchiveStore';
import { prepareArchiveMigration } from '../services/careerArchiveMigration';
import { createSaveIntegrityManifest } from '../services/saveIntegrity';
import { loadVerifiedGameData, saveVerifiedGameData, type SaveGenerationStore, type StoredSaveGeneration } from '../services/saveGenerations';

const slotKey = 'actorEmpireSave_1';
const original = structuredClone(INITIAL_PLAYER) as Player;
original.id = 'legacy-migration-player';
original.pastProjects = [{ id: 'project-1', name: 'First Film' } as Player['pastProjects'][number]];
original.x = { ...original.x, posts: [{ id: 'x-1', text: 'First post' } as unknown as Player['x']['posts'][number]] };
original.instagram = { ...original.instagram, posts: [{ id: 'ig-1', caption: 'First post' } as Player['instagram']['posts'][number]] };
const before = JSON.stringify(original);

const legacy = await prepareArchiveMigration(original, slotKey);
assert.equal(legacy.player, original, 'migration is disabled by default');
assert.equal(legacy.archiveRoot, undefined);
assert.equal(JSON.stringify(original), before, 'legacy save must remain untouched');

const optedIn = await prepareArchiveMigration(original, slotKey, undefined, { enableEmptyArchive: true });
assert.notEqual(optedIn.player, original);
assert.equal(optedIn.archiveRoot?.chunks.length, 0);
assert.equal(optedIn.player.flags.careerArchiveRootDigest, optedIn.archiveRoot?.digest);
assert.equal(optedIn.player.pastProjects, original.pastProjects, 'no filmography records may move');
assert.equal(optedIn.player.x.posts, original.x.posts, 'no X records may move');
assert.equal(optedIn.player.instagram.posts, original.instagram.posts, 'no Instagram records may move');
assert.equal(JSON.stringify(original), before);
const repeated = await prepareArchiveMigration(optedIn.player, slotKey, optedIn.archiveRoot, { enableEmptyArchive: true });
assert.equal(repeated.player, optedIn.player, 'repeated migration must be idempotent');
assert.equal(repeated.archiveRoot, optedIn.archiveRoot);
await assert.rejects(
  prepareArchiveMigration(optedIn.player, slotKey, undefined, { enableEmptyArchive: true }),
  /archive root/i,
  'a downgraded or damaged archive-backed save must not be silently opened as legacy',
);

const records = new Map<string, unknown>();
const read = async (key: string) => structuredClone(records.get(key) ?? null);
const write = async (key: string, value: unknown) => { records.set(key, structuredClone(value)); };
const store: SaveGenerationStore = {
  read,
  write,
  remove: async key => { records.delete(key); },
  promoteGeneration: async ({ keys }) => {
    const candidate = await read(keys.candidate) as StoredSaveGeneration;
    await write(keys.current, candidate.player);
    await write(keys.integrity, candidate.manifest);
    records.delete(keys.candidate);
  },
  recoverGeneration: async () => { throw new Error('unused'); },
  promoteGenerationBatch: async () => { throw new Error('unused'); },
};
await saveVerifiedGameData(store, slotKey, original, createSaveIntegrityManifest(original, 'MANUAL'));
const chunk = await createArchiveChunk('X_POST', [{ id: 'archived-x', value: { text: 'preserve' } }]);
const failedStore = {
  read,
  write: async (_key: string, _value: unknown) => { throw new Error('simulated quota failure'); },
};
await assert.rejects(stageCareerArchiveChunks(failedStore, slotKey, [chunk]), /quota failure/);
const afterFailedStage = await loadVerifiedGameData(store, slotKey);
assert.equal(afterFailedStage.status, 'CURRENT');
if (afterFailedStage.status === 'CURRENT') assert.equal(JSON.stringify(afterFailedStage.player), before);

console.log('Career archive migration audit passed. No history domain is activated.');
