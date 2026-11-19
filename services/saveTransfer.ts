import { Capacitor, registerPlugin } from '@capacitor/core';
import { resolveSaveFaceTable } from './saveFaceTable';
import { APP_DISPLAY_VERSION } from './appVersion';
import { BRIDGE_CHUNK_CHARS, splitForBridge } from './bridgeChunks';
import { exportPublicGameData, loadGameData, replaceAllVerifiedGameData } from './storage';
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
import { hasWebCryptoSubtle, hmacSha256Fallback, sha256Fallback } from './sha256Fallback';

const ARCHIVE_FORMAT = 'actor-empire-save-transfer';
const ARCHIVE_FORMAT_VERSION = 1;
/* Week-speed Phase 2a (2026-11-17), the transfer reader: from 2b, an export whose saves hold a 2b shape (the face table,
   cinema receipt v2) is written as version 2. This build already reads versions 1 and 2 (the save readers handle the
   shapes), and answers anything newer with an update message instead of "not a valid file". It still writes 1. */
const ARCHIVE_FORMAT_VERSIONS_READ: readonly number[] = [1, 2];
const SIGNATURE_ALGORITHM = 'HMAC-SHA256';
const TRANSFER_SECRET = 'actor-empire-android-transfer-v1:7e74c91f4f2b4a2d9e0b0a8b2c1d6f35';
const ACTOR_EMPIRE_KEY_PREFIX = 'actorEmpire';

interface AndroidSaveTransferPlugin {
  shareExport(options: { filename: string; content: string }): Promise<{ shared?: boolean }>;
  beginExport(options: { filename: string }): Promise<{ id: string }>;
  appendExport(options: { id: string; chunk: string }): Promise<void>;
  finishExport(options: { id: string; chars: number }): Promise<{ shared?: boolean }>;
  cancelExport(options: { id: string }): Promise<void>;
}

/* Perf plan (2026-11-08): a big career reaches the Android export file in pieces (see bridgeChunks).
   A build whose native side cannot take pieces falls back to the single call.
   19 Nov 2026: iPhone has the same calls (ios/.../AeSaveTransferPlugin.swift), so both phones export the same way. */
const shareNativeExport = async (plugin: AndroidSaveTransferPlugin, filename: string, content: string) => {
  if (content.length <= BRIDGE_CHUNK_CHARS) {
    await plugin.shareExport({ filename, content });
    return;
  }
  let exportId: string | null = null;
  try {
    exportId = (await plugin.beginExport({ filename })).id;
  } catch {
    await plugin.shareExport({ filename, content });
    return;
  }
  try {
    for (const chunk of splitForBridge(content)) {
      await plugin.appendExport({ id: exportId, chunk });
    }
    await plugin.finishExport({ id: exportId, chars: content.length });
  } catch (error) {
    await plugin.cancelExport({ id: exportId }).catch(() => undefined);
    throw error;
  }
};

export interface SaveTransferEntry {
  key: string;
  value: unknown;
}

interface SaveTransferBody {
  format: typeof ARCHIVE_FORMAT;
  formatVersion: number;
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
const IosSaveTransfer = registerPlugin<AndroidSaveTransferPlugin>('AeSaveTransfer');

/** The phone's own export (a file and the system share sheet), or null where there is none (web, an older iOS app). */
const nativeSaveTransfer = (): AndroidSaveTransferPlugin | null => {
  if (!Capacitor.isNativePlatform()) return null;
  const platform = Capacitor.getPlatform();
  if (platform === 'android' && Capacitor.isPluginAvailable('AndroidSaveTransfer')) return AndroidSaveTransfer;
  if (platform === 'ios' && Capacitor.isPluginAvailable('AeSaveTransfer')) return IosSaveTransfer;
  return null;
};

/** 19 Nov 2026: save transfer (export and import) on Android, and on iPhone wherever the app has its export plugin. */
export const isSaveTransferSurface = () => (
  Capacitor.getPlatform() === 'android'
  || (Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('AeSaveTransfer'))
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

/* 19 Nov 2026: Web Crypto only exists on a page the web view counts as secure; without it (an iPhone web view loaded
   over plain http, for one) the same signature comes from services/sha256Fallback.ts. */
const toArrayBuffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const signBody = async (body: SaveTransferBody) => {
  const message = textEncoder.encode(stableStringify(body));
  if (!hasWebCryptoSubtle()) return base64UrlEncode(toArrayBuffer(hmacSha256Fallback(textEncoder.encode(TRANSFER_SECRET), message)));
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(TRANSFER_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, message);
  return base64UrlEncode(signature);
};

const hashTransferValue = async (value: unknown) => {
  const bytes = textEncoder.encode(stableStringify(value));
  if (!hasWebCryptoSubtle()) return base64UrlEncode(toArrayBuffer(sha256Fallback(bytes)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
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
  const native = nativeSaveTransfer();
  if (native) {
    await shareNativeExport(native, filename, content);
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

/* --- Send to developer (2026-11-12) ---------------------------------------------------------------
   One slot, exactly as stored (never opened, migrated or repaired, so a career that cannot open can
   still be sent), gzip-compressed where the web view can and written as base64 text so it travels the
   proven text share paths (Android bridge, Web Share, download). A late career of 70–80 MB becomes a
   file small enough for Discord. It is a support file, not a transfer: it never imports in the game. */
export const SUPPORT_SAVE_HEADER = 'ACTOR-EMPIRE-SUPPORT 1';

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
};

export const encodeSupportSave = async (payload: unknown): Promise<string> => {
  const json = JSON.stringify(payload);
  if (typeof CompressionStream === 'undefined' || typeof Blob === 'undefined' || typeof Response === 'undefined') {
    return `${SUPPORT_SAVE_HEADER} json\n${json}`;
  }
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return `${SUPPORT_SAVE_HEADER} gzip-base64\n${bytesToBase64(bytes)}`;
};

export const exportSaveSlotForSupport = async (storageKey: string, slotNumber: number): Promise<{ ok: boolean; message: string }> => {
  const raw = await loadGameData(storageKey).catch(() => null);
  if (!raw) return { ok: false, message: 'This slot has no save that could be read.' };
  const content = await encodeSupportSave({
    format: 'actor-empire-support', formatVersion: 1, appVersion: APP_DISPLAY_VERSION, storageKey,
    exportedAt: new Date().toISOString(), player: raw,
  });
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  await shareArchive(`actor-empire-slot${slotNumber}-${stamp}.aesupport.txt`, content);
  const megabytes = Math.max(0.1, Math.round(content.length / 104_857.6) / 10);
  return { ok: true, message: `Save file ready (${megabytes} MB). Send it to the developer on Discord or by email.` };
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
  /* iPhone greys out files whose type it does not know, and .aesave is the game's own: there the picker shows every
     file, and the signature check below still refuses anything that is not a transfer file. */
  if (Capacitor.getPlatform() !== 'ios') input.accept = '.aesave,application/json,text/json';
  input.style.position = 'fixed';
  input.style.left = '-9999px';

  let changed = false;
  let closeTimer: number | null = null;
  /* 19 Nov 2026: the picker's 'cancel' event only exists from iOS 16.4 (the game runs from iOS 15). On older web views
     closing the picker without a file sent nothing at all, so the import button stayed on "Importing" until a restart.
     The picker covers the whole screen, so a touch on the page means it is closed: if no file came in by then (plus a
     moment for a late change event), it was closed without one. */
  const onPageTouch = () => {
    if (changed || closeTimer !== null) return;
    closeTimer = window.setTimeout(() => {
      closeTimer = null;
      if (changed || (input.files && input.files.length > 0)) return;
      remove();
      reject(new Error('No file selected.'));
    }, 1500);
  };
  const remove = () => {
    document.removeEventListener('pointerdown', onPageTouch, true);
    if (closeTimer !== null) { window.clearTimeout(closeTimer); closeTimer = null; }
    if (input.parentNode) input.parentNode.removeChild(input);
  };
  input.onchange = async () => {
    changed = true;
    const file = input.files?.[0];
    remove();
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
  // 19 Nov 2026: closing the picker without a file used to leave the import button on "Importing" until a restart
  input.addEventListener('cancel', () => { remove(); reject(new Error('No file selected.')); });

  document.body.appendChild(input);
  input.click();
  document.addEventListener('pointerdown', onPageTouch, true);
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
  if (archive?.format === ARCHIVE_FORMAT && Number.isInteger(archive?.formatVersion)
    && archive.formatVersion > Math.max(...ARCHIVE_FORMAT_VERSIONS_READ)) {
    throw new Error('This transfer file was made by a newer version of Actor Empire. Please update the game, then import it again.');
  }
  if (archive?.format !== ARCHIVE_FORMAT || !ARCHIVE_FORMAT_VERSIONS_READ.includes(archive?.formatVersion)) {
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
      // Phase 2a: a version 2 export can hold 2b's face table; the pictures go back before the career is migrated
      migratePlayerSave(resolveSaveFaceTable(entry.value) as any),
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
