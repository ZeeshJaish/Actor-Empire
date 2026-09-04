import { Capacitor, registerPlugin } from '@capacitor/core';
import { APP_DISPLAY_VERSION } from './appVersion';
import { exportPublicGameData, replaceAllVerifiedGameData } from './storage';
import { migratePlayerSave } from './saveMigration';
import { grantMigrationCarePackageIfEligible, markSaveTransferImported } from './migrationCarePackage';
import { compactPlayerForTransfer, FULL_LOCAL_MIRROR_BUDGET_BYTES } from './saveCompaction';
import { prepareVerifiedPlayerForPersistence } from './savePreparation';
import type { VerifiedSaveBatchEntry } from './saveGenerations';
import {
  exportMediaTransferRecords,
  importMediaTransferRecords,
  type TransferMediaRecord,
} from './mediaStorage';
import type { Player } from '../types';

const ARCHIVE_FORMAT = 'actor-empire-save-transfer';
const ARCHIVE_FORMAT_VERSION = 1;
const SIGNATURE_ALGORITHM = 'HMAC-SHA256';
const TRANSFER_SECRET = 'actor-empire-android-transfer-v1:7e74c91f4f2b4a2d9e0b0a8b2c1d6f35';
const ACTOR_EMPIRE_KEY_PREFIX = 'actorEmpire';

interface AndroidSaveTransferPlugin {
  shareExport(options: { filename: string; content: string }): Promise<{ shared?: boolean }>;
}

export interface SaveTransferEntry {
  key: string;
  value: unknown;
}

interface SaveTransferBody {
  format: typeof ARCHIVE_FORMAT;
  formatVersion: typeof ARCHIVE_FORMAT_VERSION;
  appVersion: string;
  exportedAt: string;
  platform: string;
  payload: {
    indexedDb: {
      database: 'ActorEmpireDB';
      store: 'saves';
      entries: SaveTransferEntry[];
    };
    localStorage: SaveTransferEntry[];
    media?: {
      database: 'ActorEmpireMediaDB';
      store: 'media';
      records: TransferMediaRecord[];
    };
    summary: {
      saveSlots: number;
      playerNames: string[];
      mediaRecords?: number;
    };
  };
}

interface SaveTransferArchive extends SaveTransferBody {
  signature: {
    algorithm: typeof SIGNATURE_ALGORITHM;
    value: string;
  };
}

export interface SaveTransferResult {
  saveSlots: number;
  playerNames: string[];
  carePackageGranted?: boolean;
  mediaRecords?: number;
}

export type SaveTransferProgressStage =
  | 'WAITING_FOR_FILE'
  | 'READING'
  | 'VERIFYING'
  | 'COMPACTING'
  | 'WRITING'
  | 'MEDIA'
  | 'DONE';

export interface SaveTransferProgress {
  stage: SaveTransferProgressStage;
  message: string;
}

export interface SaveTransferImportOptions {
  onProgress?: (progress: SaveTransferProgress) => void;
}

const AndroidSaveTransfer = registerPlugin<AndroidSaveTransferPlugin>('AndroidSaveTransfer');

export const isAndroidSaveTransferSurface = () => (
  Capacitor.getPlatform() === 'android'
);

const textEncoder = new TextEncoder();

const base64UrlEncode = (bytes: ArrayBuffer) => {
  const binary = Array.from(new Uint8Array(bytes), byte => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const stableStringify = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item === undefined ? null : item)).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .filter(key => record[key] !== undefined && typeof record[key] !== 'function')
      .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return 'null';
};

const signBody = async (body: SaveTransferBody) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(TRANSFER_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(stableStringify(body)));
  return base64UrlEncode(signature);
};

const hashTransferValue = async (value: unknown) => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(stableStringify(value)));
  return base64UrlEncode(digest);
};

const constantTimeEquals = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
};

const yieldToMainThread = () => new Promise(resolve => setTimeout(resolve, 0));

const reportProgress = (
  options: SaveTransferImportOptions | undefined,
  stage: SaveTransferProgressStage,
  message: string
) => {
  options?.onProgress?.({ stage, message });
};

const isSaveMirrorKey = (key: string) => key === 'actorEmpireSave' || /^actorEmpireSave_\d+$/.test(key);

const getCanonicalSaveKey = (key: string) => (
  key === 'actorEmpireSave' ? 'actorEmpireSave_1' : key
);

export const selectPublicSaveTransferEntries = (entries: SaveTransferEntry[]): SaveTransferEntry[] => (
  entries.filter(entry => getSaveSlotNumber(entry.key) !== null)
);

const compactPlayerValueForTransfer = async (value: unknown): Promise<Player> => {
  const migrated = migratePlayerSave(value as any);
  return compactPlayerForTransfer(migrated);
};

const compactSaveTransferEntry = async (entry: SaveTransferEntry): Promise<SaveTransferEntry> => {
  if (getSaveSlotNumber(entry.key) === null) return entry;
  return {
    key: getCanonicalSaveKey(entry.key),
    value: await compactPlayerValueForTransfer(entry.value),
  };
};

const compactTransferEntries = async (entries: SaveTransferEntry[]): Promise<SaveTransferEntry[]> => {
  const compactedByKey = new Map<string, SaveTransferEntry>();
  let processed = 0;
  for (const entry of entries) {
    const compacted = await compactSaveTransferEntry(entry);
    compactedByKey.set(compacted.key, compacted);
    processed += 1;
    if (processed % 2 === 0) await yieldToMainThread();
  }
  return Array.from(compactedByKey.values());
};

const compactLocalStorageValue = async (key: string, value: string): Promise<string> => {
  if (!isSaveMirrorKey(key)) return value;
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(await compactPlayerValueForTransfer(parsed));
  } catch {
    return value;
  }
};

const readActorEmpireLocalStorage = async (): Promise<SaveTransferEntry[]> => {
  const entries: SaveTransferEntry[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(ACTOR_EMPIRE_KEY_PREFIX)) continue;
      const value = localStorage.getItem(key) || '';
      entries.push({ key, value: await compactLocalStorageValue(key, value) });
    }
  } catch {
    return entries;
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key));
};

const getSaveSlotNumber = (key: string) => {
  if (key === 'actorEmpireSave') return 1;
  const match = key.match(/^actorEmpireSave_(\d+)$/);
  if (!match) return null;
  const slot = Number(match[1]);
  return Number.isInteger(slot) && slot >= 1 && slot <= 3 ? slot : null;
};

const getArchiveSummary = (entries: SaveTransferEntry[]) => {
  const saveEntries = entries.filter(entry => getSaveSlotNumber(entry.key) !== null);
  const playerNames = saveEntries
    .map(entry => {
      const value = entry.value as any;
      return typeof value?.name === 'string' ? value.name : null;
    })
    .filter((name): name is string => Boolean(name));
  return {
    saveSlots: saveEntries.length,
    playerNames,
  };
};

const buildArchive = async (): Promise<SaveTransferArchive> => {
  const indexedDbEntries = await compactTransferEntries(selectPublicSaveTransferEntries(await exportPublicGameData()));
  const localStorageEntries = await readActorEmpireLocalStorage();
  let mediaRecords: TransferMediaRecord[] = [];
  try {
    mediaRecords = await exportMediaTransferRecords();
  } catch {
    mediaRecords = [];
  }
  const body: SaveTransferBody = {
    format: ARCHIVE_FORMAT,
    formatVersion: ARCHIVE_FORMAT_VERSION,
    appVersion: APP_DISPLAY_VERSION,
    exportedAt: new Date().toISOString(),
    platform: Capacitor.getPlatform(),
    payload: {
      indexedDb: {
        database: 'ActorEmpireDB',
        store: 'saves',
        entries: indexedDbEntries,
      },
      localStorage: localStorageEntries,
      media: {
        database: 'ActorEmpireMediaDB',
        store: 'media',
        records: mediaRecords,
      },
      summary: {
        ...getArchiveSummary(indexedDbEntries),
        mediaRecords: mediaRecords.length,
      },
    },
  };

  return {
    ...body,
    signature: {
      algorithm: SIGNATURE_ALGORITHM,
      value: await signBody(body),
    },
  };
};

const downloadArchiveInBrowser = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const shareArchive = async (filename: string, content: string) => {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('AndroidSaveTransfer')) {
    await AndroidSaveTransfer.shareExport({ filename, content });
    return;
  }

  const file = new File([content], filename, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({
      title: 'Actor Empire Save Transfer',
      text: 'Actor Empire save transfer file',
      files: [file],
    });
    return;
  }

  downloadArchiveInBrowser(filename, content);
};

export const exportSignedSaveArchive = async (): Promise<SaveTransferResult> => {
  const archive = await buildArchive();
  if (archive.payload.summary.saveSlots <= 0) {
    throw new Error('No save slots found to export.');
  }
  const safeDate = new Date().toISOString().slice(0, 10);
  const filename = `actor-empire-save-transfer-${safeDate}.aesave`;
  await shareArchive(filename, JSON.stringify(archive));
  return archive.payload.summary;
};

const pickArchiveFileText = () => new Promise<string>((resolve, reject) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.aesave,application/json,text/json';
  input.style.position = 'fixed';
  input.style.left = '-9999px';

  input.onchange = async () => {
    const file = input.files?.[0];
    document.body.removeChild(input);
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }
    try {
      resolve(await file.text());
    } catch (error) {
      reject(error);
    }
  };

  document.body.appendChild(input);
  input.click();
});

const normalizeArchiveText = (rawText: string) => rawText.replace(/^\uFEFF/, '').trim();

const looksLikeLegacyRawSave = (value: unknown) => {
  const record = value as Record<string, unknown> | null;
  return Boolean(
    record &&
    typeof record === 'object' &&
    !Array.isArray(record) &&
    ('currentWeek' in record || 'stats' in record || 'money' in record) &&
    !('format' in record)
  );
};

const getParseFailureMessage = (text: string) => {
  if (!text) {
    return 'That transfer file is empty. Export again from the old build, then import the .aesave file here.';
  }
  if (/^</.test(text) || /^<!doctype/i.test(text) || /^<html/i.test(text)) {
    return 'That looks like a web page, not an Actor Empire transfer file. Download the .aesave file itself, then import it again.';
  }
  if (/^PK[\x03\x05\x07]/.test(text)) {
    return 'That looks like a compressed download. Extract it first, then choose the Actor Empire .aesave file inside.';
  }
  if (/^\[object Object\]/.test(text)) {
    return 'That file was exported incorrectly by the device. Export again from Actor Empire and choose the .aesave file.';
  }
  return 'Could not read this transfer file. Please choose the signed Actor Empire .aesave file exported by the game.';
};

const parseJsonTransfer = (rawText: string): unknown => {
  const cleaned = normalizeArchiveText(rawText);
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
      return JSON.parse(normalizeArchiveText(parsed));
    }
    return parsed;
  } catch {
    throw new Error(getParseFailureMessage(cleaned));
  }
};

const parseArchive = async (rawText: string): Promise<SaveTransferArchive> => {
  const archive = parseJsonTransfer(rawText) as SaveTransferArchive;
  if (looksLikeLegacyRawSave(archive)) {
    throw new Error('This looks like a raw save, not a signed transfer file. Open the old build, tap Export Game Data, then import the .aesave file here.');
  }
  if (archive?.format !== ARCHIVE_FORMAT || archive?.formatVersion !== ARCHIVE_FORMAT_VERSION) {
    throw new Error('This is not a valid Actor Empire transfer file.');
  }
  if (archive.signature?.algorithm !== SIGNATURE_ALGORITHM || typeof archive.signature.value !== 'string') {
    throw new Error('This transfer file is missing its security signature.');
  }

  const { signature, ...body } = archive;
  const expectedSignature = await signBody(body as SaveTransferBody);
  if (!constantTimeEquals(signature.value, expectedSignature)) {
    throw new Error('Transfer blocked: this save file was edited or is corrupted.');
  }
  if (!Array.isArray(archive.payload?.indexedDb?.entries)) {
    throw new Error('Transfer file has no saved game data.');
  }

  return archive;
};

export interface PrepareSaveTransferImportContext {
  archiveAppVersion: string;
  importedAt: string;
}

export const prepareSaveTransferImportEntries = async (
  entries: SaveTransferEntry[],
  context: PrepareSaveTransferImportContext,
): Promise<{ entries: VerifiedSaveBatchEntry[]; carePackageGranted: boolean }> => {
  let carePackageGranted = false;
  const sanitizedEntries: VerifiedSaveBatchEntry[] = [];

  for (const entry of entries.filter(entry => typeof entry.key === 'string' && entry.key.startsWith('actorEmpireSave'))) {
    const slot = getSaveSlotNumber(entry.key);
    if (slot === null) continue;

    const sourceFingerprint = await hashTransferValue(entry.value);
    const importedPlayer = markSaveTransferImported(
      migratePlayerSave(entry.value as any),
      {
        sourceFingerprint,
        archiveAppVersion: context.archiveAppVersion,
        importedAt: context.importedAt,
      },
    );
    const carePackage = grantMigrationCarePackageIfEligible(importedPlayer, {
      source: 'save-transfer-import',
      sourceFingerprint,
    });
    if (carePackage.granted) carePackageGranted = true;
    const compactedPlayer = await compactPlayerForTransfer(carePackage.player);
    const prepared = prepareVerifiedPlayerForPersistence(compactedPlayer, 'IMPORT');
    sanitizedEntries.push({
      currentKey: getCanonicalSaveKey(entry.key),
      player: prepared.player,
      manifest: prepared.manifest,
    });
    await yieldToMainThread();
  }

  return {
    entries: Array.from(new Map(sanitizedEntries.map(entry => [entry.currentKey, entry])).values()),
    carePackageGranted,
  };
};

const restoreActorEmpireLocalStorage = async (entries: SaveTransferEntry[]) => {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(ACTOR_EMPIRE_KEY_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    for (const entry of entries.filter(entry => typeof entry.key === 'string' && entry.key.startsWith(ACTOR_EMPIRE_KEY_PREFIX))) {
      const value = await compactLocalStorageValue(entry.key, String(entry.value ?? ''));
      if (isSaveMirrorKey(entry.key) && value.length > FULL_LOCAL_MIRROR_BUDGET_BYTES) {
        const slot = getSaveSlotNumber(entry.key) || (entry.key === 'actorEmpireSave' ? 1 : null);
        localStorage.setItem(`${entry.key}_meta`, JSON.stringify({
          version: APP_DISPLAY_VERSION,
          slot,
          savedAt: Date.now(),
          storage: 'indexeddb',
          note: 'Full imported save restored in IndexedDB. Local mirror compacted to avoid mobile quota pressure.',
        }));
        continue;
      }
      localStorage.setItem(entry.key, value);
    }
  } catch {
    // IndexedDB is the source of truth for actual save slots. Local preferences can fail safely.
  }
};

export const importSignedSaveArchiveFromFile = async (options?: SaveTransferImportOptions): Promise<SaveTransferResult> => {
  reportProgress(options, 'WAITING_FOR_FILE', 'Choose the Actor Empire .aesave transfer file.');
  const rawText = await pickArchiveFileText();
  reportProgress(options, 'READING', 'Reading transfer file...');
  await yieldToMainThread();
  reportProgress(options, 'VERIFYING', 'Verifying signed transfer file...');
  const archive = await parseArchive(rawText);
  await yieldToMainThread();
  reportProgress(options, 'COMPACTING', 'Migrating and compacting save slots...');
  const importResult = await prepareSaveTransferImportEntries(archive.payload.indexedDb.entries, {
    archiveAppVersion: archive.appVersion,
    importedAt: new Date().toISOString(),
  });
  const entries = importResult.entries;
  if (entries.length <= 0) {
    throw new Error('Transfer file does not contain any Actor Empire save slots.');
  }

  reportProgress(options, 'WRITING', 'Verifying and safely replacing save slots...');
  await replaceAllVerifiedGameData(entries);
  reportProgress(options, 'MEDIA', 'Restoring compacted media...');
  let mediaRecords = 0;
  try {
    mediaRecords = await importMediaTransferRecords(archive.payload.media?.records || []);
  } catch {
    // Save generations are already verified and promoted. Missing optional poster
    // media must not misreport a successful career import as a destructive failure.
    mediaRecords = 0;
  }
  await restoreActorEmpireLocalStorage(archive.payload.localStorage);
  reportProgress(options, 'DONE', 'Save transfer restored.');
  return {
    ...getArchiveSummary(entries.map(entry => ({ key: entry.currentKey, value: entry.player }))),
    carePackageGranted: importResult.carePackageGranted,
    mediaRecords,
  };
};

export const __saveTransferTest = {
  normalizeArchiveText,
  parseJsonTransfer,
  parseArchive,
};
