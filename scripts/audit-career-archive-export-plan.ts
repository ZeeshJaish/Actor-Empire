import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createArchiveChunk, createArchiveRoot } from '../services/careerArchive';
import { buildCareerArchiveExportPlan, createArchiveTransferRecordSources, verifyArchiveTransferRootCoverage } from '../services/careerArchiveTransfer';
import { createSaveTransferV2RecordDescriptor } from '../services/saveTransferV2';
import type { VerifiedGameLoad } from '../services/saveGenerations';

const slot = 'actorEmpireSave_1';
const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'transfer-player';
const chunk = await createArchiveChunk('X_POST', [{ id: 'post-1', value: { text: 'old post' } }]);
const root = await createArchiveRoot(slot, player.id, [{
  id: chunk.id, domain: chunk.domain, digest: chunk.digest, recordCount: 1, sequence: 0,
}]);
player.flags = { ...player.flags, careerArchiveRootDigest: root.digest };
const current: VerifiedGameLoad = {
  status: 'CURRENT', player, previous: null, archiveRoot: root,
  needsRecoveryCheckpoint: false, violations: [],
};
const plan = await buildCareerArchiveExportPlan([{ key: slot, value: player }], async () => current);
assert.deepEqual(plan.map(item => item.kind), ['ARCHIVE_ROOT', 'ARCHIVE_CHUNK']);
assert.equal(plan[1].logicalKey, `${slot}__archive_chunk__${chunk.digest}`);
assert.equal(plan[1].rootDigest, root.digest);
const stale = { ...player, currentWeek: 99 };
let verifiedForExport: Player | null = null;
await buildCareerArchiveExportPlan([{ key: slot, value: stale }], async () => current,
  (_slot, verified) => { verifiedForExport = verified; });
assert.equal(verifiedForExport?.currentWeek, player.currentWeek, 'export must use the verified hot generation, not an earlier public read');
const sources = createArchiveTransferRecordSources(plan, async () => chunk);
const serialized: string[] = [];
for (const source of sources) {
  const pieces: Uint8Array[] = [];
  await source.write(piece => { pieces.push(piece); });
  serialized.push(new TextDecoder().decode(Buffer.concat(pieces)));
}
assert.equal(JSON.parse(serialized[0]).digest, root.digest);
assert.equal(JSON.parse(serialized[1]).records[0].id, 'post-1');
const sha = 'A'.repeat(43);
const chunkDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'archive-chunk-1', kind: 'ARCHIVE_CHUNK', logicalKey: plan[1].logicalKey,
  byteLength: serialized[1].length, sha256: sha,
});
assert.equal(await verifyArchiveTransferRootCoverage(root, [chunkDescriptor]), true);
assert.equal(await verifyArchiveTransferRootCoverage(root, []), false, 'missing chunk descriptor must fail before import writes');
await assert.rejects(buildCareerArchiveExportPlan([{ key: slot, value: player }], async () => ({
  ...current, archiveRoot: undefined,
})), /root/i);
await assert.rejects(buildCareerArchiveExportPlan([{ key: slot, value: player }], async () => ({
  ...current, status: 'RECOVERY_AVAILABLE', player: null, previous: player,
} as VerifiedGameLoad)), /verified|current/i);
let repairedPublicPlayer: Player | null = null;
const repairedPlan = await buildCareerArchiveExportPlan(
  [{ key: slot, value: { ...player, flags: {} } }],
  async () => current,
  (_slot, verified) => { repairedPublicPlayer = verified; },
);
assert.equal(repairedPlan.length, 2, 'export must use the verified archived generation even if the public read lacks its marker');
assert.equal(repairedPublicPlayer, player);
await assert.rejects(buildCareerArchiveExportPlan(
  [{ key: slot, value: { ...player, flags: {} } }],
  async () => ({ status: 'RECOVERY_AVAILABLE', player: null, previous: player, violations: ['missing root'] }),
), /verified|current/i, 'damaged archived slots must not export as incomplete legacy saves');
assert.deepEqual(await buildCareerArchiveExportPlan(
  [{ key: slot, value: { ...player, flags: {} } }],
  async () => ({ status: 'LEGACY_UNVERIFIED', player: { ...player, flags: {} }, previous: null, violations: [] }),
), [], 'a true legacy slot may still use the legacy transfer path');

const secondChunk = await createArchiveChunk('INSTAGRAM_POST', [{ id: 'ig-1', value: { caption: 'kept' } }]);
const secondRoot = await createArchiveRoot(slot, player.id, [
  root.chunks[0],
  { id: secondChunk.id, domain: secondChunk.domain, digest: secondChunk.digest, recordCount: 1, sequence: 0 },
]);
const secondPlayer = { ...player, flags: { ...player.flags, careerArchiveRootDigest: secondRoot.digest } };
const secondSlot = 'actorEmpireSave_2';
const otherPlayer = { ...player, id: 'other-player' };
const otherRoot = await createArchiveRoot(secondSlot, otherPlayer.id, []);
otherPlayer.flags = { ...otherPlayer.flags, careerArchiveRootDigest: otherRoot.digest };
const multiPlan = await buildCareerArchiveExportPlan([
  { key: slot, value: secondPlayer },
  { key: secondSlot, value: otherPlayer },
], async key => key === slot
  ? { ...current, player: secondPlayer, archiveRoot: secondRoot }
  : { ...current, player: otherPlayer, archiveRoot: otherRoot });
assert.deepEqual(multiPlan.map(item => item.kind), ['ARCHIVE_ROOT', 'ARCHIVE_CHUNK', 'ARCHIVE_CHUNK', 'ARCHIVE_ROOT']);
const multiSources = createArchiveTransferRecordSources(multiPlan, async (_root, reference) => (
  reference.id === chunk.id ? chunk : secondChunk
));
assert.equal(new Set(multiSources.map(source => source.id)).size, 4, 'all signed record IDs must be unique');
assert.equal(await verifyArchiveTransferRootCoverage(secondRoot, [
  createSaveTransferV2RecordDescriptor({
    id: 'archive-chunk-1', kind: 'ARCHIVE_CHUNK', logicalKey: multiPlan[1].logicalKey,
    byteLength: 100, sha256: sha,
  }),
  createSaveTransferV2RecordDescriptor({
    id: 'archive-chunk-2', kind: 'ARCHIVE_CHUNK', logicalKey: multiPlan[2].logicalKey,
    byteLength: 100, sha256: sha,
  }),
]), true);
await assert.rejects(multiSources[2].write(() => { throw new Error('writer interrupted'); }), /writer interrupted/);
await assert.rejects(createArchiveTransferRecordSources(multiPlan, async () => chunk)[1].write(() => {}), /missing or corrupt/);
console.log('Career archive export plan audit passed.');
