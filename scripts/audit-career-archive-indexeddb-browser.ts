import { INITIAL_PLAYER, type Player } from '../types';
import { createArchiveChunk, createArchiveRoot } from '../services/careerArchive';
import { createSaveIntegrityManifest } from '../services/saveIntegrity';
import {
  discardStagedVerifiedGameDataReplacement,
  loadVerifiedGameData,
  promoteStagedVerifiedGameDataReplacement,
  saveVerifiedGameData,
  stageVerifiedCareerArchiveChunks,
  stageVerifiedGameDataReplacement,
} from '../services/storage';

const expect = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const putRawRecord = async (key: string, value: unknown): Promise<void> => {
  const request = indexedDB.open('ActorEmpireDB', 1);
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    const transaction = db.transaction('saves', 'readwrite');
    transaction.objectStore('saves').put(value, key);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
};

const audit = async (): Promise<void> => {
  const slot = 'actorEmpireSave_3';
  const player = structuredClone(INITIAL_PLAYER) as Player;
  player.id = 'browser-archive-atomicity';
  player.currentWeek = 4;
  const chunk = await createArchiveChunk('X_POST', [{ id: 'old-post', value: { text: 'kept offline' } }]);
  const root = await createArchiveRoot(slot, player.id, [{
    id: chunk.id, domain: chunk.domain, digest: chunk.digest, recordCount: 1, sequence: 0,
  }]);
  player.flags = { ...player.flags, careerArchiveRootDigest: root.digest };
  await stageVerifiedCareerArchiveChunks(slot, [chunk]);
  await saveVerifiedGameData(slot, player, createSaveIntegrityManifest(player, 'MANUAL'), { archiveRoot: root });

  const carried = structuredClone(player) as Player;
  carried.currentWeek = 5;
  await saveVerifiedGameData(slot, carried, createSaveIntegrityManifest(carried, 'AUTOSAVE'), { retainPrevious: false });
  const carriedLoad = await loadVerifiedGameData(slot);
  expect(carriedLoad.status === 'CURRENT', 'archive-backed autosave must remain readable');
  if (carriedLoad.status === 'CURRENT') {
    expect(carriedLoad.player.currentWeek === 5, 'ordinary autosave must advance the hot player');
    expect(carriedLoad.archiveRoot?.digest === root.digest, 'ordinary autosave must carry the verified archive root');
  }

  const next = structuredClone(carried) as Player;
  next.currentWeek = 6;
  const manifest = createSaveIntegrityManifest(next, 'AUTOSAVE');
  const staged = await stageVerifiedGameDataReplacement([{ currentKey: slot, player: next, manifest, archiveRoot: root }]);
  try {
    await putRawRecord(`${slot}__candidate`, {
      kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
      formatVersion: 1,
      player: next,
      manifest: { ...manifest, digest: 'invalid-digest' },
      needsRecoveryCheckpoint: false,
      archiveRoot: root,
    });
    let rejected = false;
    try { await promoteStagedVerifiedGameDataReplacement(staged); }
    catch { rejected = true; }
    expect(rejected, 'corrupt candidate must abort IndexedDB promotion');
    const loaded = await loadVerifiedGameData(slot);
    expect(loaded.status === 'CURRENT', 'previous complete generation must remain readable');
    if (loaded.status !== 'CURRENT') return;
    expect(loaded.player.currentWeek === 5, 'aborted promotion must not replace the hot player');
    expect(loaded.archiveRoot?.digest === root.digest, 'aborted promotion must not change the archive root');
  } finally {
    await discardStagedVerifiedGameDataReplacement(staged);
  }

  const validStage = await stageVerifiedGameDataReplacement([{ currentKey: slot, player: next, manifest, archiveRoot: root }]);
  const originalPut = IDBObjectStore.prototype.put;
  let abortedAtRootWrite = false;
  IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
    const request = originalPut.call(this, value, key!);
    if (!abortedAtRootWrite && key === `${slot}__archiveRoot`) {
      abortedAtRootWrite = true;
      const transaction = this.transaction;
      queueMicrotask(() => transaction.abort());
    }
    return request;
  };
  try {
    let rejected = false;
    try { await promoteStagedVerifiedGameDataReplacement(validStage); }
    catch { rejected = true; }
    expect(abortedAtRootWrite, 'test must abort after hot and integrity writes are queued');
    expect(rejected, 'mid-promotion IndexedDB abort must reject');
  } finally {
    IDBObjectStore.prototype.put = originalPut;
    await discardStagedVerifiedGameDataReplacement(validStage);
  }
  const afterAbort = await loadVerifiedGameData(slot);
  expect(afterAbort.status === 'CURRENT', 'mid-promotion abort must leave the prior generation readable');
  if (afterAbort.status === 'CURRENT') {
    expect(afterAbort.player.currentWeek === 5, 'mid-promotion abort must roll back hot player writes');
    expect(afterAbort.archiveRoot?.digest === root.digest, 'mid-promotion abort must roll back archive root writes');
  }
};

audit().then(
  () => { (globalThis as any).__careerArchiveIndexedDbAudit = { ok: true }; },
  error => { (globalThis as any).__careerArchiveIndexedDbAudit = { ok: false, error: String(error) }; },
);
