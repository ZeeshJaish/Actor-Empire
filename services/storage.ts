
import { addBreadcrumb, markTraceAction, recordNonFatal, startPerformanceTrace, stopPerformanceTrace } from './firebaseService';
import type { Player } from '../types';
import { verifySaveIntegrity, type SaveIntegrityManifest } from './saveIntegrity';
import { waitForIndexedDbOpen, waitForIndexedDbTransaction } from './indexedDbResilience';
import {
  loadVerifiedGameData as loadVerifiedGeneration,
  recoverPreviousGameData as recoverPreviousGeneration,
  saveVerifiedGameData as saveVerifiedGeneration,
  stageVerifiedGameDataBatch as stageVerifiedGenerationBatch,
  promoteStagedGameDataBatch as promoteStagedGenerationBatch,
  deleteSaveGenerationFamily,
  type PromoteSaveGenerationInput,
  type PromoteSaveGenerationBatchInput,
  type RecoverSaveGenerationInput,
  type SaveGenerationStore,
  type StoredSaveGeneration,
  type VerifiedGameLoad,
  type VerifiedSaveBatchEntry,
} from './saveGenerations';

const DB_NAME = 'ActorEmpireDB';
const STORE_NAME = 'saves';
const DB_VERSION = 1;
const SAVE_SUMMARY_PREFIX = 'actorEmpire.saveSummary.v1.';

export type SaveSlotSummary = {
  name: string;
  age: number;
  week: number;
  fame: number;
  totalPlayTimeMs: number;
  savedAt: number;
  isPendingSummary?: boolean;
  storageKey?: string;
  storageKind?: 'indexeddb' | 'localstorage';
};

export const createSaveSlotSummary = (data: any): SaveSlotSummary => ({
  name: String(data?.name || 'Actor'),
  age: Math.max(0, Math.round(Number(data?.age) || 0)),
  week: Math.max(1, Math.round(Number(data?.currentWeek) || 1)),
  fame: Math.max(0, Number(data?.stats?.fame) || 0),
  totalPlayTimeMs: Math.max(0, Math.round(Number(data?.totalPlayTimeMs) || 0)),
  savedAt: Date.now(),
});

export const writeGameSaveSummary = (key: string, data: any) => {
  try {
    localStorage.setItem(`${SAVE_SUMMARY_PREFIX}${key}`, JSON.stringify(createSaveSlotSummary(data)));
  } catch {
    // Summary caching is optional; the full IndexedDB save remains authoritative.
  }
};

export const getGameSaveSummary = (key: string): SaveSlotSummary | null => {
  try {
    const raw = localStorage.getItem(`${SAVE_SUMMARY_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveSlotSummary>;
    if (!parsed || typeof parsed.name !== 'string' || !Number.isFinite(parsed.age)) return null;
    return {
      name: parsed.name,
      age: Math.max(0, Math.round(Number(parsed.age) || 0)),
      week: Math.max(1, Math.round(Number(parsed.week) || 1)),
      fame: Math.max(0, Number(parsed.fame) || 0),
      totalPlayTimeMs: Math.max(0, Math.round(Number(parsed.totalPlayTimeMs) || 0)),
      savedAt: Math.max(0, Math.round(Number(parsed.savedAt) || 0)),
      isPendingSummary: false,
      storageKey: key,
      storageKind: 'indexeddb',
    };
  } catch {
    return null;
  }
};

export const createDeferredSaveSlotSummary = (
  key: string,
  storageKind: 'indexeddb' | 'localstorage',
): SaveSlotSummary => {
  try {
    const raw = localStorage.getItem(`${key}_meta`);
    const metadata = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    return {
      name: String(metadata.playerName || 'Saved Career'),
      age: Math.max(0, Math.round(Number(metadata.age) || 0)),
      week: Math.max(1, Math.round(Number(metadata.week) || 1)),
      fame: Math.max(0, Number(metadata.fame) || 0),
      totalPlayTimeMs: Math.max(0, Math.round(Number(metadata.totalPlayTimeMs) || 0)),
      savedAt: Math.max(0, Math.round(Number(metadata.savedAt) || 0)),
      isPendingSummary: true,
      storageKey: key,
      storageKind,
    };
  } catch {
    return {
      name: 'Saved Career',
      age: 0,
      week: 1,
      fame: 0,
      totalPlayTimeMs: 0,
      savedAt: 0,
      isPendingSummary: true,
      storageKey: key,
      storageKind,
    };
  }
};

const getSaveStats = (data: any) => ({
  age: data?.age,
  week: data?.currentWeek,
  logs: data?.logs?.length || 0,
  news: data?.news?.length || 0,
  pendingEvents: data?.pendingEvents?.length || 0,
  commitments: data?.commitments?.length || 0,
  releases: data?.activeReleases?.length || 0,
});

// Open (or create) the database
const openDB = (): Promise<IDBDatabase> => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  };
  return waitForIndexedDbOpen(request, { operation: 'open Actor Empire saves' });
};

const readGameRecord = async (key: string): Promise<unknown | null> => {
  const db = await openDB();
  try {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    await waitForIndexedDbTransaction(transaction, { operation: `read save record ${key}` });
    return request.result ?? null;
  } finally {
    db.close();
  }
};

const writeGameRecord = async (key: string, value: unknown): Promise<void> => {
  const db = await openDB();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);
    await waitForIndexedDbTransaction(transaction, { operation: `write save record ${key}` });
  } finally {
    db.close();
  }
};

const removeGameRecord = async (key: string): Promise<void> => {
  const db = await openDB();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    await waitForIndexedDbTransaction(transaction, { operation: `delete save record ${key}` });
  } finally {
    db.close();
  }
};

const promoteIndexedDbGeneration = async ({ keys, retainPrevious }: PromoteSaveGenerationInput): Promise<void> => {
  const db = await openDB();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    let current: unknown = null;
    let currentManifest: unknown = null;
    let candidate: StoredSaveGeneration | null = null;
    let completedReads = 0;
    const promoteAfterReads = () => {
      completedReads += 1;
      if (completedReads !== 3) return;
      if (!candidate || !verifySaveIntegrity(candidate.player, candidate.manifest).ok) {
        transaction.abort();
        return;
      }
      if (
        retainPrevious
        && current
        && currentManifest
        && verifySaveIntegrity(current as Player, currentManifest as SaveIntegrityManifest).ok
      ) {
        store.put({
          kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
          formatVersion: 1,
          player: current as Player,
          manifest: currentManifest as SaveIntegrityManifest,
          needsRecoveryCheckpoint: false,
        } satisfies StoredSaveGeneration, keys.previous);
      }
      store.put(candidate.player, keys.current);
      store.put(candidate.manifest, keys.integrity);
      store.delete(keys.candidate);
    };
    const currentRequest = store.get(keys.current);
    currentRequest.onsuccess = () => { current = (currentRequest.result as unknown) ?? null; promoteAfterReads(); };
    const integrityRequest = store.get(keys.integrity);
    integrityRequest.onsuccess = () => { currentManifest = (integrityRequest.result as unknown) ?? null; promoteAfterReads(); };
    const candidateRequest = store.get(keys.candidate);
    candidateRequest.onsuccess = () => { candidate = (candidateRequest.result as StoredSaveGeneration | undefined) ?? null; promoteAfterReads(); };
    await waitForIndexedDbTransaction(transaction, { operation: `promote verified save ${keys.current}` });
  } finally {
    db.close();
  }
};

const recoverIndexedDbGeneration = async ({ keys }: RecoverSaveGenerationInput): Promise<void> => {
  const db = await openDB();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    let current: unknown = null;
    let currentManifest: unknown = null;
    let previous: StoredSaveGeneration | null = null;
    let completedReads = 0;
    const recoverAfterReads = () => {
      completedReads += 1;
      if (completedReads !== 3) return;
      if (!previous) {
        transaction.abort();
        return;
      }
      store.put({ player: current, manifest: currentManifest, quarantinedAt: Date.now() }, keys.quarantine);
      store.put(previous.player, keys.current);
      store.put(previous.manifest, keys.integrity);
    };
    const currentRequest = store.get(keys.current);
    currentRequest.onsuccess = () => { current = currentRequest.result ?? null; recoverAfterReads(); };
    const integrityRequest = store.get(keys.integrity);
    integrityRequest.onsuccess = () => { currentManifest = integrityRequest.result ?? null; recoverAfterReads(); };
    const previousRequest = store.get(keys.previous);
    previousRequest.onsuccess = () => { previous = previousRequest.result ?? null; recoverAfterReads(); };
    await waitForIndexedDbTransaction(transaction, { operation: `recover verified save ${keys.current}` });
  } finally {
    db.close();
  }
};

const promoteIndexedDbGenerationBatch = async ({ keys }: PromoteSaveGenerationBatchInput): Promise<void> => {
  const db = await openDB();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const snapshots = keys.map(generationKeys => ({
      keys: generationKeys,
      candidate: null as StoredSaveGeneration | null,
      current: null as Player | null,
      integrity: null as SaveIntegrityManifest | null,
    }));
    let pendingReads = snapshots.length * 3;
    let abortedForValidation = false;
    const finishRead = () => {
      pendingReads -= 1;
      if (pendingReads !== 0) return;
      for (const snapshot of snapshots) {
        if (!snapshot.candidate || !verifySaveIntegrity(snapshot.candidate.player, snapshot.candidate.manifest).ok) {
          abortedForValidation = true;
          transaction.abort();
          return;
        }
      }
      for (const snapshot of snapshots) {
        if (snapshot.current && snapshot.integrity && verifySaveIntegrity(snapshot.current, snapshot.integrity).ok) {
          store.put({
            kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
            formatVersion: 1,
            player: snapshot.current,
            manifest: snapshot.integrity,
            needsRecoveryCheckpoint: false,
          } satisfies StoredSaveGeneration, snapshot.keys.previous);
        }
        store.put(snapshot.candidate!.player, snapshot.keys.current);
        store.put(snapshot.candidate!.manifest, snapshot.keys.integrity);
        store.delete(snapshot.keys.candidate);
      }
    };
    snapshots.forEach(snapshot => {
      const candidateRequest = store.get(snapshot.keys.candidate);
      candidateRequest.onsuccess = () => { snapshot.candidate = candidateRequest.result ?? null; finishRead(); };
      const currentRequest = store.get(snapshot.keys.current);
      currentRequest.onsuccess = () => { snapshot.current = currentRequest.result ?? null; finishRead(); };
      const integrityRequest = store.get(snapshot.keys.integrity);
      integrityRequest.onsuccess = () => { snapshot.integrity = integrityRequest.result ?? null; finishRead(); };
    });
    await waitForIndexedDbTransaction(transaction, {
      operation: 'promote staged save batch',
      abortedError: new Error(
        abortedForValidation ? 'Staged save batch failed integrity validation.' : 'Staged save batch promotion aborted.',
      ),
    });
  } finally {
    db.close();
  }
};

const indexedDbGenerationStore: SaveGenerationStore = {
  read: readGameRecord,
  write: writeGameRecord,
  remove: removeGameRecord,
  promoteGeneration: promoteIndexedDbGeneration,
  recoverGeneration: recoverIndexedDbGeneration,
  promoteGenerationBatch: promoteIndexedDbGenerationBatch,
};

export const saveVerifiedGameData = async (
  key: string,
  player: Player,
  manifest: SaveIntegrityManifest,
  options: { retainPrevious?: boolean; needsRecoveryCheckpoint?: boolean } = {},
): Promise<void> => saveVerifiedGeneration(indexedDbGenerationStore, key, player, manifest, options);

export const loadVerifiedGameData = async (key: string): Promise<VerifiedGameLoad> => (
  loadVerifiedGeneration(indexedDbGenerationStore, key)
);

export const recoverPreviousGameData = async (key: string): Promise<Player> => (
  recoverPreviousGeneration(indexedDbGenerationStore, key)
);

export const replaceAllVerifiedGameData = async (entries: VerifiedSaveBatchEntry[]): Promise<void> => {
  const staged = await stageVerifiedGenerationBatch(indexedDbGenerationStore, entries);
  await promoteStagedGenerationBatch(indexedDbGenerationStore, staged);
};

export const deleteVerifiedGameData = async (key: string): Promise<void> => {
  await deleteSaveGenerationFamily(indexedDbGenerationStore, key);
  try {
    localStorage.removeItem(`${SAVE_SUMMARY_PREFIX}${key}`);
  } catch {
    // IndexedDB deletion remains authoritative.
  }
};

export const saveGameData = async (
  key: string,
  data: any,
  options: { rethrow?: boolean } = {}
): Promise<void> => {
  const traceName = 'save_game_data';
  markTraceAction('save_write_started', {
    save_key: key,
    save_slot: data?.flags?.lastLoadedSlot || key,
  });
  startPerformanceTrace(traceName, { key });
  const startedAt = performance.now();
  try {
      const db = await openDB();
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        // IndexedDB already performs a structured clone. Avoid an extra JSON
        // stringify/parse here because large long-running saves can stutter
        // mobile WebViews when autosave runs.
        store.put(data, key);
        await waitForIndexedDbTransaction(transaction, { operation: `save game data ${key}` });
        writeGameSaveSummary(key, data);
        markTraceAction('save_write_completed', { save_key: key, save_slot: data?.flags?.lastLoadedSlot || key });
        addBreadcrumb('save_game:success', { key, ...getSaveStats(data) });
      } finally {
        db.close();
      }
  } catch (err) {
      console.error("Failed to save game data", err);
      markTraceAction('save_write_failed', { save_key: key, save_slot: data?.flags?.lastLoadedSlot || key });
      recordNonFatal(err, 'save_game_failed', { key, ...getSaveStats(data) });
      if (options.rethrow) throw err;
  } finally {
      stopPerformanceTrace(traceName, { duration_ms: Math.round(performance.now() - startedAt) });
  }
};

export const loadGameData = async (key: string): Promise<any> => {
  const traceName = 'load_game_data';
  markTraceAction('save_load_started', {
    save_key: key,
    save_slot: key,
  });
  startPerformanceTrace(traceName, { key });
  const startedAt = performance.now();
  try {
      const db = await openDB();
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        await waitForIndexedDbTransaction(transaction, { operation: `load game data ${key}` });
        markTraceAction('save_load_completed', { save_key: key, save_slot: request.result?.flags?.lastLoadedSlot || key });
        addBreadcrumb('load_game:success', { key, found: !!request.result, ...getSaveStats(request.result) });
        return request.result;
      } finally {
        db.close();
      }
  } catch (err) {
      console.error("Failed to load game data", err);
      markTraceAction('save_load_failed', { save_key: key, save_slot: key });
      recordNonFatal(err, 'load_game_failed', { key });
      return null;
  } finally {
      stopPerformanceTrace(traceName, { duration_ms: Math.round(performance.now() - startedAt) });
  }
};

export const deleteGameData = async (key: string): Promise<void> => {
  try {
      const db = await openDB();
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(key);
        await waitForIndexedDbTransaction(transaction, { operation: `delete game data ${key}` });
        try {
          localStorage.removeItem(`${SAVE_SUMMARY_PREFIX}${key}`);
        } catch {
          // IndexedDB deletion already succeeded.
        }
        addBreadcrumb('delete_game:success', { key });
      } finally {
        db.close();
      }
  } catch (err) {
      console.error("Failed to delete game data", err);
      recordNonFatal(err, 'delete_game_failed', { key });
  }
};

export const listGameDataKeys = async (): Promise<string[]> => {
  try {
    const db = await openDB();
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAllKeys();
      await waitForIndexedDbTransaction(transaction, { operation: 'list game save keys' });
      return request.result.map(key => String(key));
    } finally {
      db.close();
    }
  } catch (error) {
    recordNonFatal(error, 'indexeddb_list_keys_failed');
    return [];
  }
};

export const exportPublicGameData = async (): Promise<Array<{ key: string; value: any }>> => {
  try {
      const keys = (await listGameDataKeys())
        .filter(key => key === 'actorEmpireSave' || /^actorEmpireSave_[1-3]$/.test(key));
      const entries = await Promise.all(keys.map(async key => ({
          key,
          value: await loadGameData(key),
      })));
      return entries.filter(entry => entry.value !== undefined && entry.value !== null);
  } catch (err) {
      console.error("Failed to export game data", err);
      recordNonFatal(err, 'export_game_data_failed');
      return [];
  }
};
