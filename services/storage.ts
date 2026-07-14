
import { addBreadcrumb, markTraceAction, recordNonFatal, startPerformanceTrace, stopPerformanceTrace } from './firebaseService';

const DB_NAME = 'ActorEmpireDB';
const STORE_NAME = 'saves';
const DB_VERSION = 1;

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
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
        console.error("IndexedDB Error:", request.error);
        reject(request.error);
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
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
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        // IndexedDB already performs a structured clone. Avoid an extra JSON
        // stringify/parse here because large long-running saves can stutter
        // mobile WebViews when autosave runs.
        const request = store.put(data, key);
        
        request.onerror = () => {
            console.error("Error saving game:", request.error);
            markTraceAction('save_write_failed', { save_key: key, save_slot: data?.flags?.lastLoadedSlot || key });
            recordNonFatal(request.error, 'indexeddb_save_request_failed', { key, ...getSaveStats(data) });
            reject(request.error);
        };
        request.onsuccess = () => {
            markTraceAction('save_write_completed', { save_key: key, save_slot: data?.flags?.lastLoadedSlot || key });
            addBreadcrumb('save_game:success', { key, ...getSaveStats(data) });
            resolve();
        };
      });
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
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onerror = () => {
            markTraceAction('save_load_failed', { save_key: key, save_slot: key });
            recordNonFatal(request.error, 'indexeddb_load_request_failed', { key });
            reject(request.error);
        };
        request.onsuccess = () => {
            markTraceAction('save_load_completed', { save_key: key, save_slot: request.result?.flags?.lastLoadedSlot || key });
            addBreadcrumb('load_game:success', { key, found: !!request.result, ...getSaveStats(request.result) });
            resolve(request.result);
        };
      });
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
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);
        
        request.onerror = () => {
            recordNonFatal(request.error, 'indexeddb_delete_request_failed', { key });
            reject(request.error);
        };
        request.onsuccess = () => {
            addBreadcrumb('delete_game:success', { key });
            resolve();
        };
      });
  } catch (err) {
      console.error("Failed to delete game data", err);
      recordNonFatal(err, 'delete_game_failed', { key });
  }
};

export const exportAllGameData = async (): Promise<Array<{ key: string; value: any }>> => {
  try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onerror = () => {
            recordNonFatal(request.error, 'indexeddb_export_keys_failed');
            reject(request.error);
        };
        request.onsuccess = async () => {
            try {
                const keys = request.result.map(key => String(key));
                const entries = await Promise.all(keys.map(async key => ({
                    key,
                    value: await loadGameData(key),
                })));
                resolve(entries.filter(entry => entry.value !== undefined && entry.value !== null));
            } catch (error) {
                reject(error);
            }
        };
      });
  } catch (err) {
      console.error("Failed to export game data", err);
      recordNonFatal(err, 'export_game_data_failed');
      return [];
  }
};

export const replaceAllGameData = async (entries: Array<{ key: string; value: any }>): Promise<void> => {
  try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const clearRequest = store.clear();

        clearRequest.onerror = () => {
            recordNonFatal(clearRequest.error, 'indexeddb_import_clear_failed');
            reject(clearRequest.error);
        };
        clearRequest.onsuccess = () => resolve();
      });

      for (const entry of entries) {
        await saveGameData(entry.key, entry.value);
      }
  } catch (err) {
      console.error("Failed to import game data", err);
      recordNonFatal(err, 'import_game_data_failed');
      throw err;
  }
};
