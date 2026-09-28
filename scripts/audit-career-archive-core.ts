import assert from 'node:assert/strict';
import {
  createArchiveChunk,
  createArchiveRoot,
  verifyArchiveChunk,
  verifyArchiveRoot,
} from '../services/careerArchive';

const run = async () => {
  const chunk = await createArchiveChunk('X_POST', [
    { id: 'post-1', value: { text: 'hello', year: 20, week: 4 } },
    { id: 'post-2', value: { text: 'world', year: 20, week: 5 } },
  ]);
  assert.equal(chunk.records.length, 2);
  assert.equal(await verifyArchiveChunk(chunk), true);
  assert.match(chunk.digest, /^[0-9a-f]{64}$/);
  const same = await createArchiveChunk('X_POST', [
    { id: 'post-1', value: { week: 4, text: 'hello', year: 20 } },
    { id: 'post-2', value: { year: 20, week: 5, text: 'world' } },
  ]);
  assert.equal(same.digest, chunk.digest, 'object property order must not change chunk identity');
  assert.equal(await verifyArchiveChunk({ ...chunk, records: [{ id: 'post-1', value: { text: 'changed' } }, chunk.records[1]] }), false);
  await assert.rejects(createArchiveChunk('X_POST', [
    { id: 'duplicate', value: 1 }, { id: 'duplicate', value: 2 },
  ]), /duplicate/i);
  await assert.rejects(createArchiveChunk('X_POST', [
    { id: 'huge', value: 'x'.repeat(300_000) },
  ]), /limit/i);
  await assert.rejects(createArchiveChunk('X_POST', [
    { id: 'date-object', value: new Date('2026-09-25T00:00:00Z') },
  ]), /plain JSON/i);
  await assert.rejects(createArchiveChunk('X_POST', [
    { id: 'undefined-field', value: { text: 'hello', hidden: undefined } },
  ]), /cannot be serialized/i);
  await assert.rejects(createArchiveChunk('X_POST', [
    { id: 'non-finite-number', value: { score: Number.NaN } },
  ]), /non-finite/i);

  const empty = await createArchiveRoot('actorEmpireSave_1', 'player-1', []);
  assert.equal(await verifyArchiveRoot(empty), true);
  const root = await createArchiveRoot('actorEmpireSave_1', 'player-1', [
    { id: chunk.id, domain: chunk.domain, digest: chunk.digest, recordCount: chunk.records.length, sequence: 0 },
  ]);
  assert.equal(await verifyArchiveRoot(root), true);
  assert.equal(await verifyArchiveRoot({ ...root, playerId: 'someone-else' }), false);
  await assert.rejects(createArchiveRoot('actorEmpireSave_1', 'player-1', [
    { id: chunk.id, domain: chunk.domain, digest: chunk.digest, recordCount: chunk.records.length, sequence: 0 },
    { id: chunk.id, domain: chunk.domain, digest: chunk.digest, recordCount: chunk.records.length, sequence: 1 },
  ]), /duplicate/i);
};

await run();
console.log('Career archive core audit passed.');
