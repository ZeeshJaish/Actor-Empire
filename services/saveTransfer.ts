import { Capacitor, registerPlugin } from '@capacitor/core';
import { APP_DISPLAY_VERSION } from './appVersion';
import {
  discardStagedVerifiedGameDataReplacement,
  exportPublicGameData,
  loadVerifiedGameData,
  loadVerifiedCareerArchiveChunk,
  careerArchiveTransferStore,
  promoteStagedVerifiedGameDataReplacement,
  replaceAllVerifiedGameData,
  stageVerifiedGameDataReplacement,
} from './storage';
import { buildCareerArchiveExportPlan, createArchiveTransferRecordSources, createCareerArchiveImportSession } from './careerArchiveTransfer';
import { migratePlayerSave } from './saveMigration';
import { grantMigrationCarePackageIfEligible, markSaveTransferImported } from './migrationCarePackage';
import { compactPlayerForTransfer, FULL_LOCAL_MIRROR_BUDGET_BYTES } from './saveCompaction';
import { estimateSaveJsonBytes, prepareVerifiedPlayerForPersistence } from './savePreparation';
import type { StagedSaveBatch, VerifiedSaveBatchEntry } from './saveGenerations';
import {
  exportMediaTransferRecords,
  importMediaTransferRecords,
  discardStagedMediaTransferBatch,
  deleteMediaBlob,
  listMediaTransferBlobs,
  promoteStagedMediaTransferBatch,
  stageMediaTransferBlob,
  type BinaryMediaTransferRecord,
  type MediaTransferInventory,
  type TransferMediaRecord,
} from './mediaStorage';
import { readAndroidDeviceCapabilities } from './nativeDeviceCapabilities';
import {
  SaveTransferSafetyError,
  assertLegacyAndroidBridgeSafety,
  evaluateLegacyAndroidBridgeSafety,
  measureSaveTransferFootprint,
  toSaveTransferSafetyTelemetry,
  type LegacyAndroidBridgeSafetyDecision,
  type SaveTransferFootprint,
} from './saveTransferSafety';
import {
  SAVE_TRANSFER_V2_LIMITS,
  createSaveTransferV2RecordDescriptor,
  createSignedSaveTransferV2Manifest,
  verifySignedSaveTransferV2Manifest,
  type SaveTransferV2RecordDescriptor,
  type SignedSaveTransferV2Manifest,
} from './saveTransferV2';
import {
  SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
  bridgeBase64ToBytes,
  bytesToBridgeBase64,
  readNativeSaveTransferV2Record,
  remapTransferMediaReferences,
  spoolNativeSaveTransferV2Record,
  streamBlobAsBoundedChunks,
  streamJsonAsBoundedChunks,
  streamTextAsBoundedChunks,
  type NativeSaveTransferV2ExportRecordPort,
  type NativeSaveTransferV2ImportRecordPort,
} from './saveTransferV2Stream';
import type { Player } from '../types';
import { verifyArchiveRoot, type CareerArchiveRoot } from './careerArchive';
import { assertNativeSaveTransferShared, selectNativeSaveTransferPort } from './nativeSaveTransferPort';
import {
  throwIfSaveTransferCancelled,
  type SaveTransferDirection,
  type SaveTransferProgress,
  type SaveTransferProgressStage,
} from './saveTransferExperience';

export type { SaveTransferProgress, SaveTransferProgressStage } from './saveTransferExperience';

const ARCHIVE_FORMAT = 'actor-empire-save-transfer';
const ARCHIVE_FORMAT_VERSION = 1;
const SIGNATURE_ALGORITHM = 'HMAC-SHA256';
const TRANSFER_SECRET = 'actor-empire-android-transfer-v1:7e74c91f4f2b4a2d9e0b0a8b2c1d6f35';
const ACTOR_EMPIRE_KEY_PREFIX = 'actorEmpire';

interface NativeSaveTransferPlugin {
  shareExport(options: { filename: string; content: string }): Promise<{ shared?: boolean }>;
  beginExport(options: { filename: string }): Promise<{ sessionId: string; maxChunkBytes: number; maxBase64Chars: number }>;
  beginExportRecord(options: { sessionId: string; recordId: string }): Promise<void>;
  appendExportChunk(options: { sessionId: string; dataBase64: string }): Promise<{ acceptedBytes: number }>;
  finishExportRecord(options: { sessionId: string }): Promise<{ recordId: string; byteLength: number; sha256: string }>;
  beginExportManifest(options: { sessionId: string; byteLength: number }): Promise<void>;
  appendExportManifestChunk(options: { sessionId: string; dataBase64: string }): Promise<{ acceptedBytes: number }>;
  finalizeExport(options: { sessionId: string }): Promise<{ byteLength: number; sha256: string }>;
  shareStreamedExport(options: { sessionId: string }): Promise<{ shared?: boolean }>;
  cancelExport(options: { sessionId: string }): Promise<void>;
  beginImport(): Promise<{ sessionId: string; formatVersion: 1 | 2; totalBytes: number; maxChunkBytes: number }>;
  prepareImportManifest(options: { sessionId: string }): Promise<{ byteLength: number }>;
  readImportManifestChunk(options: { sessionId: string; maxBytes: number }): Promise<NativeChunkResult>;
  beginImportRecord(options: { sessionId: string }): Promise<{ headerJson: string; byteLength: number }>;
  readImportRecordChunk(options: { sessionId: string; maxBytes: number }): Promise<NativeChunkResult>;
  finishImportRecord(options: { sessionId: string }): Promise<{ byteLength: number; sha256: string }>;
  readLegacyImportChunk(options: { sessionId: string; maxBytes: number }): Promise<NativeChunkResult>;
  finishImport(options: { sessionId: string }): Promise<{ recordCount: number; recordBytes: number }>;
  cancelImport(options: { sessionId: string }): Promise<void>;
}

type NativeChunkResult = { dataBase64: string; byteLength: number; done: boolean };

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

export interface SaveTransferImportOptions {
  onProgress?: (progress: SaveTransferProgress) => void;
  onDiagnostic?: SaveTransferDiagnosticHandler;
  signal?: AbortSignal;
}

export interface SaveTransferExportOptions {
  onProgress?: (progress: SaveTransferProgress) => void;
  onDiagnostic?: SaveTransferDiagnosticHandler;
  signal?: AbortSignal;
}

export type SaveTransferDiagnosticHandler = (
  telemetry: Record<string, string | number | boolean>,
) => void;

type SaveTransferSafetyContext = {
  footprint: SaveTransferFootprint;
  decision: LegacyAndroidBridgeSafetyDecision;
  memoryClassMb?: number;
  availableMemoryMb?: number;
  lowMemory?: boolean;
};

const AndroidSaveTransfer = registerPlugin<NativeSaveTransferPlugin>('AndroidSaveTransfer');
const IOSSaveTransfer = registerPlugin<NativeSaveTransferPlugin>('IOSSaveTransfer');

const nativeStreamedTransferPort = (): NativeSaveTransferPlugin | null => {
  const platform = Capacitor.getPlatform();
  const pluginName = platform === 'ios' ? 'IOSSaveTransfer' : 'AndroidSaveTransfer';
  return selectNativeSaveTransferPort(
    platform,
    Capacitor.isNativePlatform(),
    Capacitor.isPluginAvailable(pluginName),
    { android: AndroidSaveTransfer, ios: IOSSaveTransfer },
  );
};

export const isAndroidSaveTransferSurface = () => (
  Capacitor.getPlatform() === 'android'
);

const textEncoder = new TextEncoder();

const reportSafetyDiagnostic = (
  handler: SaveTransferDiagnosticHandler | undefined,
  direction: 'EXPORT' | 'IMPORT',
  stage: 'MEASURED' | 'BLOCKED' | 'BRIDGE_STARTED' | 'COMPLETED' | 'FAILED',
  context: SaveTransferSafetyContext,
) => {
  handler?.(toSaveTransferSafetyTelemetry({
    direction,
    stage,
    ...context,
  }));
};

const readAndroidTransferMemory = async () => {
  if (!(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android')) {
    return { isAndroid: false, memoryClassMb: undefined, availableMemoryMb: undefined, lowMemory: false };
  }
  const result = await readAndroidDeviceCapabilities();
  if (result.status !== 'AVAILABLE') {
    return { isAndroid: true, memoryClassMb: undefined, availableMemoryMb: undefined, lowMemory: false };
  }
  return {
    isAndroid: true,
    memoryClassMb: result.snapshot.memoryClassMb,
    availableMemoryMb: result.snapshot.availableMemoryMb,
    lowMemory: result.snapshot.lowMemory,
  };
};

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
  options: SaveTransferImportOptions | SaveTransferExportOptions | undefined,
  direction: SaveTransferDirection,
  stage: SaveTransferProgressStage,
  message: string,
  detail: Partial<Omit<SaveTransferProgress, 'direction' | 'stage' | 'message' | 'cancelable'>> = {},
  cancelable = true,
) => {
  options?.onProgress?.({ direction, stage, message, cancelable, ...detail });
};

const isSaveMirrorKey = (key: string) => key === 'actorEmpireSave' || /^actorEmpireSave_\d+$/.test(key);

const getCanonicalSaveKey = (key: string) => (
  key === 'actorEmpireSave' ? 'actorEmpireSave_1' : key
);

export const selectPublicSaveTransferEntries = (entries: SaveTransferEntry[]): SaveTransferEntry[] => (
  entries.filter(entry => getSaveSlotNumber(entry.key) !== null)
);

const compactPlayerValueForTransfer = async (value: unknown, archiveAware = false): Promise<Player> => {
  if (!archiveAware && typeof (value as Player | null)?.flags?.careerArchiveRootDigest === 'string') {
    throw new Error('This career uses a history archive. Device transfer is not available until the archive can be included safely. Your save remains on this device.');
  }
  const migrated = migratePlayerSave(value as any);
  return compactPlayerForTransfer(migrated);
};

const compactSaveTransferEntry = async (entry: SaveTransferEntry, archiveAware = false): Promise<SaveTransferEntry> => {
  if (getSaveSlotNumber(entry.key) === null) return entry;
  return {
    key: getCanonicalSaveKey(entry.key),
    value: await compactPlayerValueForTransfer(entry.value, archiveAware),
  };
};

const compactTransferEntries = async (entries: SaveTransferEntry[], archiveAware = false): Promise<SaveTransferEntry[]> => {
  const compactedByKey = new Map<string, SaveTransferEntry>();
  let processed = 0;
  for (const entry of entries) {
    const compacted = await compactSaveTransferEntry(entry, archiveAware);
    compactedByKey.set(compacted.key, compacted);
    processed += 1;
    if (processed % 2 === 0) await yieldToMainThread();
  }
  return Array.from(compactedByKey.values());
};

const compactLocalStorageValue = async (key: string, value: string): Promise<string> => {
  if (!isSaveMirrorKey(key)) return value;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return value;
  }
  return JSON.stringify(await compactPlayerValueForTransfer(parsed));
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

const buildArchive = async (
  options?: SaveTransferExportOptions,
): Promise<{ archive: SaveTransferArchive; safety: SaveTransferSafetyContext; isAndroid: boolean }> => {
  const rawIndexedDbEntries = selectPublicSaveTransferEntries(await exportPublicGameData());
  const archivePlan = await buildCareerArchiveExportPlan(rawIndexedDbEntries, loadVerifiedGameData);
  if (archivePlan.length > 0) {
    throw new Error('This career uses a history archive. The legacy transfer cannot include it safely. Use the native signed transfer.');
  }
  const indexedDbEntries = await compactTransferEntries(rawIndexedDbEntries);
  const localStorageEntries = await readActorEmpireLocalStorage();
  const memory = await readAndroidTransferMemory();
  const saveRecordBytes = indexedDbEntries.map(entry => estimateSaveJsonBytes(entry.value));
  const localStorageRecordBytes = localStorageEntries.map(entry => estimateSaveJsonBytes(entry.value));
  let safety: SaveTransferSafetyContext | null = null;
  const assessInventory = (inventory: MediaTransferInventory) => {
    const footprint = measureSaveTransferFootprint({
      saveRecordBytes,
      localStorageRecordBytes,
      mediaRecordBytes: inventory.recordBytes,
    });
    const decision = evaluateLegacyAndroidBridgeSafety(footprint, memory);
    safety = {
      footprint,
      decision,
      memoryClassMb: memory.memoryClassMb,
      availableMemoryMb: memory.availableMemoryMb,
      lowMemory: memory.lowMemory,
    };
    reportSafetyDiagnostic(options?.onDiagnostic, 'EXPORT', decision.allowed ? 'MEASURED' : 'BLOCKED', safety);
    if (memory.isAndroid) assertLegacyAndroidBridgeSafety(decision);
  };
  let mediaRecords: TransferMediaRecord[] = [];
  try {
    mediaRecords = await exportMediaTransferRecords({ beforeEncoding: assessInventory });
  } catch (error) {
    if (error instanceof SaveTransferSafetyError) throw error;
    mediaRecords = [];
    assessInventory({ count: 0, totalBytes: 0, largestRecordBytes: 0, recordBytes: [] });
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

  const archive: SaveTransferArchive = {
    ...body,
    signature: {
      algorithm: SIGNATURE_ALGORITHM,
      value: await signBody(body),
    },
  };
  if (!safety) {
    throw new Error('Save transfer safety measurement was not completed.');
  }
  return { archive, safety, isAndroid: memory.isAndroid };
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

type V2ExportRecordSource = {
  id: string;
  kind: SaveTransferV2RecordDescriptor['kind'];
  estimatedBytes: number;
  logicalKey?: string;
  archiveRootDigest?: string;
  mimeType?: string;
  media?: SaveTransferV2RecordDescriptor['media'];
  write: (sink: (chunk: Uint8Array) => void | Promise<void>) => Promise<void>;
};

const exportStreamedNativeV2Archive = async (
  native: NativeSaveTransferPlugin,
  options?: SaveTransferExportOptions,
): Promise<SaveTransferResult> => {
  throwIfSaveTransferCancelled(options?.signal);
  reportProgress(options, 'EXPORT', 'PREPARING', 'Preparing save records...');
  const rawIndexedDbEntries = selectPublicSaveTransferEntries(await exportPublicGameData());
  const archivePlan = await buildCareerArchiveExportPlan(rawIndexedDbEntries, loadVerifiedGameData,
    (slotKey, verifiedPlayer) => {
      const entry = rawIndexedDbEntries.find(item => item.key === slotKey);
      if (entry) entry.value = verifiedPlayer;
    });
  const indexedDbEntries = await compactTransferEntries(rawIndexedDbEntries, true);
  for (const source of rawIndexedDbEntries) {
    const originalDigest = (source.value as Player | null)?.flags?.careerArchiveRootDigest;
    if (typeof originalDigest !== 'string') continue;
    const compacted = indexedDbEntries.find(entry => entry.key === getCanonicalSaveKey(source.key));
    if ((compacted?.value as Player | null)?.flags?.careerArchiveRootDigest !== originalDigest) {
      throw new Error('Archive root marker changed while preparing the transfer save.');
    }
  }
  throwIfSaveTransferCancelled(options?.signal);
  if (indexedDbEntries.length <= 0) throw new Error('No save slots found to export.');
  const localStorageEntries = (await readActorEmpireLocalStorage()).filter(entry => !isSaveMirrorKey(entry.key));
  let mediaRecords: BinaryMediaTransferRecord[] = [];
  try {
    mediaRecords = await listMediaTransferBlobs();
  } catch {
    mediaRecords = [];
  }

  const sources: V2ExportRecordSource[] = [
    ...createArchiveTransferRecordSources(archivePlan, loadVerifiedCareerArchiveChunk),
    ...indexedDbEntries.map(entry => ({
      id: `save-slot-${getSaveSlotNumber(entry.key)}`,
      kind: 'SAVE' as const,
      estimatedBytes: estimateSaveJsonBytes(entry.value),
      logicalKey: getCanonicalSaveKey(entry.key),
      archiveRootDigest: (entry.value as Player)?.flags?.careerArchiveRootDigest,
      write: (sink: (chunk: Uint8Array) => void | Promise<void>) => streamJsonAsBoundedChunks(entry.value, sink),
    })),
    ...localStorageEntries.map((entry, index) => ({
      id: `local-${index + 1}`,
      kind: 'LOCAL_STORAGE' as const,
      estimatedBytes: textEncoder.encode(String(entry.value ?? '')).byteLength,
      logicalKey: entry.key,
      write: (sink: (chunk: Uint8Array) => void | Promise<void>) => streamTextAsBoundedChunks(String(entry.value ?? ''), sink),
    })),
    ...mediaRecords.map((record, index) => ({
      id: `media-${index + 1}`,
      kind: 'MEDIA' as const,
      estimatedBytes: record.blob.size,
      logicalKey: record.id,
      mimeType: record.mimeType,
      media: {
        kind: record.kind,
        createdAt: record.createdAt,
        ...(record.width === undefined ? {} : { width: record.width }),
        ...(record.height === undefined ? {} : { height: record.height }),
      },
      write: (sink: (chunk: Uint8Array) => void | Promise<void>) => streamBlobAsBoundedChunks(record.blob, sink),
    })),
  ];
  if (sources.length > SAVE_TRANSFER_V2_LIMITS.maxRecords) throw new Error('Save transfer contains too many records.');

  const safeDate = new Date().toISOString().slice(0, 10);
  const filename = `actor-empire-save-transfer-${safeDate}.aesave`;
  throwIfSaveTransferCancelled(options?.signal);
  const started = await native.beginExport({ filename });
  const sessionId = started.sessionId;
  if (!sessionId || started.maxChunkBytes < SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES) {
    if (sessionId) await native.cancelExport({ sessionId }).catch(() => undefined);
    throw new Error('Native save-transfer streaming protocol is incompatible with this build.');
  }
  try {
    throwIfSaveTransferCancelled(options?.signal);
    const descriptors: SaveTransferV2RecordDescriptor[] = [];
    const totalBytes = sources.reduce((sum, source) => sum + source.estimatedBytes, 0);
    let processedBytes = 0;
    let lastReportedBytes = 0;
    for (let index = 0; index < sources.length; index += 1) {
      const source = sources[index];
      throwIfSaveTransferCancelled(options?.signal);
      reportProgress(
        options,
        'EXPORT',
        source.kind === 'MEDIA' ? 'MEDIA' : 'WRITING',
        `Writing transfer record ${index + 1} of ${sources.length}...`,
        { processedBytes, totalBytes, processedRecords: index, totalRecords: sources.length },
      );
      const nativeRecord = await spoolNativeSaveTransferV2Record({
        sessionId,
        recordId: source.id,
        native: native as NativeSaveTransferV2ExportRecordPort,
        write: source.write,
        signal: options?.signal,
        onChunk: byteLength => {
          processedBytes += byteLength;
          if (processedBytes - lastReportedBytes < 1024 * 1024 && processedBytes < totalBytes) return;
          lastReportedBytes = processedBytes;
          reportProgress(
            options,
            'EXPORT',
            source.kind === 'MEDIA' ? 'MEDIA' : 'WRITING',
            `Writing transfer record ${index + 1} of ${sources.length}...`,
            { processedBytes, totalBytes, processedRecords: index, totalRecords: sources.length },
          );
        },
      });
      descriptors.push(createSaveTransferV2RecordDescriptor({
        id: source.id,
        kind: source.kind,
        logicalKey: source.logicalKey,
        archiveRootDigest: source.archiveRootDigest,
        mimeType: source.mimeType,
        media: source.media,
        byteLength: nativeRecord.byteLength,
        sha256: nativeRecord.sha256,
      }));
      reportProgress(
        options,
        'EXPORT',
        source.kind === 'MEDIA' ? 'MEDIA' : 'WRITING',
        `Finished transfer record ${index + 1} of ${sources.length}.`,
        { processedBytes, totalBytes, processedRecords: index + 1, totalRecords: sources.length },
      );
      await yieldToMainThread();
    }

    throwIfSaveTransferCancelled(options?.signal);
    reportProgress(options, 'EXPORT', 'FINALIZING', 'Signing and finalizing the transfer file...', {
      processedBytes,
      totalBytes,
      processedRecords: sources.length,
      totalRecords: sources.length,
    });
    const manifest = await createSignedSaveTransferV2Manifest({
      appVersion: APP_DISPLAY_VERSION,
      createdAt: new Date().toISOString(),
      sourcePlatform: Capacitor.getPlatform(),
      records: descriptors,
    });
    const manifestJson = JSON.stringify(manifest);
    const manifestBytes = textEncoder.encode(manifestJson).byteLength;
    await native.beginExportManifest({ sessionId, byteLength: manifestBytes });
    await streamTextAsBoundedChunks(manifestJson, async chunk => {
      throwIfSaveTransferCancelled(options?.signal);
      const result = await native.appendExportManifestChunk({
        sessionId,
        dataBase64: bytesToBridgeBase64(chunk),
      });
      throwIfSaveTransferCancelled(options?.signal);
      if (result.acceptedBytes !== chunk.byteLength) throw new Error('Native transfer accepted an incomplete manifest chunk.');
    });
    throwIfSaveTransferCancelled(options?.signal);
    await native.finalizeExport({ sessionId });
    throwIfSaveTransferCancelled(options?.signal);
    assertNativeSaveTransferShared(await native.shareStreamedExport({ sessionId }));
    reportProgress(options, 'EXPORT', 'DONE', 'Save transfer ready.', {
      processedBytes: totalBytes,
      totalBytes,
      processedRecords: sources.length,
      totalRecords: sources.length,
    }, false);
    options?.onDiagnostic?.({
      direction: 'export',
      stage: 'completed',
      transport: 'stream_v2',
      save_count: indexedDbEntries.length,
      local_storage_count: localStorageEntries.length,
      media_count: mediaRecords.length,
    });
    return {
      ...getArchiveSummary(indexedDbEntries),
      mediaRecords: mediaRecords.length,
    };
  } catch (error) {
    await native.cancelExport({ sessionId }).catch(() => undefined);
    options?.onDiagnostic?.({ direction: 'export', stage: 'failed', transport: 'stream_v2' });
    throw error;
  }
};

export const exportSignedSaveArchive = async (
  options?: SaveTransferExportOptions,
): Promise<SaveTransferResult> => {
  const native = nativeStreamedTransferPort();
  if (native) return exportStreamedNativeV2Archive(native, options);
  throwIfSaveTransferCancelled(options?.signal);
  reportProgress(options, 'EXPORT', 'PREPARING', 'Preparing and signing save data...');
  const prepared = await buildArchive(options);
  throwIfSaveTransferCancelled(options?.signal);
  const { archive } = prepared;
  if (archive.payload.summary.saveSlots <= 0) {
    throw new Error('No save slots found to export.');
  }
  const safeDate = new Date().toISOString().slice(0, 10);
  const filename = `actor-empire-save-transfer-${safeDate}.aesave`;
  const content = JSON.stringify(archive);
  reportProgress(options, 'EXPORT', 'FINALIZING', 'Finalizing the transfer file...', {
    processedBytes: 0,
    totalBytes: textEncoder.encode(content).byteLength,
  });
  if (prepared.isAndroid) {
    const actualArchiveBytes = textEncoder.encode(content).byteLength;
    const footprint = {
      ...prepared.safety.footprint,
      projectedArchiveBytes: Math.max(prepared.safety.footprint.projectedArchiveBytes, actualArchiveBytes),
    };
    const decision = evaluateLegacyAndroidBridgeSafety(footprint, {
      memoryClassMb: prepared.safety.memoryClassMb,
      availableMemoryMb: prepared.safety.availableMemoryMb,
      lowMemory: prepared.safety.lowMemory,
    });
    const finalSafety = {
      footprint,
      decision,
      memoryClassMb: prepared.safety.memoryClassMb,
      availableMemoryMb: prepared.safety.availableMemoryMb,
      lowMemory: prepared.safety.lowMemory,
    };
    if (!decision.allowed) {
      reportSafetyDiagnostic(options?.onDiagnostic, 'EXPORT', 'BLOCKED', finalSafety);
      assertLegacyAndroidBridgeSafety(decision);
    }
    reportSafetyDiagnostic(options?.onDiagnostic, 'EXPORT', 'BRIDGE_STARTED', finalSafety);
    await shareArchive(filename, content);
    reportSafetyDiagnostic(options?.onDiagnostic, 'EXPORT', 'COMPLETED', finalSafety);
  } else {
    throwIfSaveTransferCancelled(options?.signal);
    await shareArchive(filename, content);
  }
  reportProgress(options, 'EXPORT', 'DONE', 'Save transfer ready.', {}, false);
  return archive.payload.summary;
};

const pickArchiveFileText = (options?: {
  beforeRead?: (file: File) => void | Promise<void>;
}) => new Promise<string>((resolve, reject) => {
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
      await options?.beforeRead?.(file);
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
  archiveRoot?: CareerArchiveRoot;
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
    const playerRootDigest = (entry.value as Player | null)?.flags?.careerArchiveRootDigest;
    if (typeof playerRootDigest === 'string' && (!context.archiveRoot
      || context.archiveRoot.digest !== playerRootDigest
      || context.archiveRoot.slotKey !== getCanonicalSaveKey(entry.key)
      || context.archiveRoot.playerId !== (entry.value as Player).id
      || !(await verifyArchiveRoot(context.archiveRoot)))) {
      throw new Error('This transfer contains an archive-backed career that this version cannot restore without losing history. No save was replaced.');
    }
    if (context.archiveRoot && typeof playerRootDigest !== 'string') {
      throw new Error('Transfer archive root has no matching save marker. No save was replaced.');
    }

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
    if (context.archiveRoot && prepared.persistedPlayer.flags?.careerArchiveRootDigest !== context.archiveRoot.digest) {
      throw new Error('Transfer archive root marker changed while preparing the imported save.');
    }
    sanitizedEntries.push({
      currentKey: getCanonicalSaveKey(entry.key),
      player: prepared.persistedPlayer,
      manifest: prepared.manifest,
      ...(context.archiveRoot ? { archiveRoot: context.archiveRoot } : {}),
    });
    await yieldToMainThread();
  }

  return {
    entries: Array.from(new Map(sanitizedEntries.map(entry => [entry.currentKey, entry])).values()),
    carePackageGranted,
  };
};

const restoreActorEmpireLocalStorage = async (
  entries: SaveTransferEntry[],
  options: { preserveSaveMirrors?: boolean } = {},
) => {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(ACTOR_EMPIRE_KEY_PREFIX)) continue;
      if (options.preserveSaveMirrors && /^actorEmpireSave(?:_|$)/.test(key)) continue;
      keysToRemove.push(key);
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

const consumeUtf8RecordChunks = async (
  chunks: AsyncIterable<Uint8Array>,
  declaredBytes: number,
): Promise<string> => {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '';
  let received = 0;
  for await (const chunk of chunks) {
    received += chunk.byteLength;
    if (received > declaredBytes) throw new Error('Transfer record exceeded its declared byte limit.');
    text += decoder.decode(chunk, { stream: true });
  }
  text += decoder.decode();
  if (received !== declaredBytes) throw new Error('Transfer record ended before its declared byte limit.');
  return text;
};

const remapImportedLocalStorageValue = (
  value: string,
  mediaIds: ReadonlyMap<string, string>,
): string => {
  const direct = mediaIds.get(value);
  if (direct) return direct;
  try {
    return JSON.stringify(remapTransferMediaReferences(JSON.parse(value), mediaIds));
  } catch {
    return value;
  }
};

const readNativeManifest = async (
  native: NativeSaveTransferPlugin,
  sessionId: string,
  signal?: AbortSignal,
): Promise<SignedSaveTransferV2Manifest> => {
  throwIfSaveTransferCancelled(signal);
  const prepared = await native.prepareImportManifest({ sessionId });
  throwIfSaveTransferCancelled(signal);
  if (!Number.isSafeInteger(prepared.byteLength) || prepared.byteLength <= 0 || prepared.byteLength > SAVE_TRANSFER_V2_LIMITS.maxManifestBytes) {
    throw new Error('Transfer manifest exceeds its byte limit.');
  }
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '';
  let received = 0;
  while (true) {
    throwIfSaveTransferCancelled(signal);
    const result = await native.readImportManifestChunk({
      sessionId,
      maxBytes: SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
    });
    throwIfSaveTransferCancelled(signal);
    if (result.done) {
      if (result.byteLength !== 0 || result.dataBase64 !== '') throw new Error('Transfer manifest ended with an invalid chunk.');
      break;
    }
    const bytes = bridgeBase64ToBytes(result.dataBase64);
    if (bytes.byteLength !== result.byteLength || bytes.byteLength <= 0) throw new Error('Transfer manifest chunk is invalid.');
    received += bytes.byteLength;
    if (received > prepared.byteLength) throw new Error('Transfer manifest exceeded its declared byte limit.');
    text += decoder.decode(bytes, { stream: true });
  }
  text += decoder.decode();
  if (received !== prepared.byteLength) throw new Error('Transfer manifest ended before its declared byte limit.');
  let manifest: SignedSaveTransferV2Manifest;
  try {
    manifest = JSON.parse(text) as SignedSaveTransferV2Manifest;
  } catch {
    throw new Error('Transfer manifest is not valid JSON.');
  }
  if (!(await verifySignedSaveTransferV2Manifest(manifest))) {
    throw new Error('Transfer blocked: its signed manifest was edited or is corrupted.');
  }
  throwIfSaveTransferCancelled(signal);
  return manifest;
};

const importStreamedNativeV2Archive = async (
  native: NativeSaveTransferPlugin,
  sessionId: string,
  options?: SaveTransferImportOptions,
): Promise<SaveTransferResult> => {
  const stagedSaveBatches: StagedSaveBatch[] = [];
  const mediaBatchId = `save-transfer-${sessionId}`;
  const stagedMediaIds: string[] = [];
  const localStorageEntries: SaveTransferEntry[] = [];
  const playerNames: string[] = [];
  let carePackageGranted = false;
  let nativeFinished = false;
  let mediaPromoted = false;
  try {
    throwIfSaveTransferCancelled(options?.signal);
    reportProgress(options, 'IMPORT', 'VERIFYING', 'Verifying signed transfer manifest...');
    const manifest = await readNativeManifest(native, sessionId, options?.signal);
    const archiveSession = createCareerArchiveImportSession(manifest.records, careerArchiveTransferStore);
    const totalBytes = manifest.totals.uncompressedBytes;
    let processedBytes = 0;
    let lastReportedBytes = 0;
    const mediaIdMap = new Map<string, string>();
    manifest.records.filter(record => record.kind === 'MEDIA').forEach((record, index) => {
      if (!record.logicalKey) throw new Error('Signed media record is missing its logical key.');
      mediaIdMap.set(record.logicalKey, `ae_import_${record.sha256.slice(0, 20)}_${index + 1}`);
    });
    const importedAt = new Date().toISOString();
    for (let index = 0; index < manifest.records.length; index += 1) {
      throwIfSaveTransferCancelled(options?.signal);
      const descriptor = manifest.records[index];
      reportProgress(
        options,
        'IMPORT',
        descriptor.kind === 'MEDIA' ? 'MEDIA' : 'READING',
        `Reading transfer record ${index + 1} of ${manifest.records.length}...`,
        { processedBytes, totalBytes, processedRecords: index, totalRecords: manifest.records.length },
      );
      await readNativeSaveTransferV2Record({
        sessionId,
        descriptor,
        native: native as NativeSaveTransferV2ImportRecordPort,
        signal: options?.signal,
        onChunk: byteLength => {
          processedBytes += byteLength;
          if (processedBytes - lastReportedBytes < 1024 * 1024 && processedBytes < totalBytes) return;
          lastReportedBytes = processedBytes;
          reportProgress(
            options,
            'IMPORT',
            descriptor.kind === 'MEDIA' ? 'MEDIA' : 'READING',
            `Reading transfer record ${index + 1} of ${manifest.records.length}...`,
            { processedBytes, totalBytes, processedRecords: index, totalRecords: manifest.records.length },
          );
        },
        consume: async chunks => {
          if (descriptor.kind === 'ARCHIVE_ROOT' || descriptor.kind === 'ARCHIVE_CHUNK') {
            const valueText = await consumeUtf8RecordChunks(chunks, descriptor.byteLength);
            if (descriptor.kind === 'ARCHIVE_ROOT') await archiveSession.acceptRoot(descriptor, valueText);
            else await archiveSession.acceptChunk(descriptor, valueText);
            return;
          }
          if (descriptor.kind === 'SAVE') {
            const valueText = await consumeUtf8RecordChunks(chunks, descriptor.byteLength);
            let value: unknown;
            try {
              value = remapTransferMediaReferences(JSON.parse(valueText), mediaIdMap);
            } catch {
              throw new Error('Transfer save record is not valid JSON.');
            }
            const archiveRoot = await archiveSession.rootForSave(descriptor);
            const prepared = await prepareSaveTransferImportEntries(
              [{ key: descriptor.logicalKey as string, value }],
              { archiveAppVersion: manifest.appVersion, importedAt, ...(archiveRoot ? { archiveRoot } : {}) },
            );
            if (prepared.entries.length !== 1) throw new Error('Transfer save record does not target a public slot.');
            const staged = await stageVerifiedGameDataReplacement(prepared.entries);
            stagedSaveBatches.push(staged);
            carePackageGranted ||= prepared.carePackageGranted;
            playerNames.push(prepared.entries[0].player.name);
            return;
          }
          if (descriptor.kind === 'LOCAL_STORAGE') {
            const value = await consumeUtf8RecordChunks(chunks, descriptor.byteLength);
            localStorageEntries.push({
              key: descriptor.logicalKey as string,
              value: remapImportedLocalStorageValue(value, mediaIdMap),
            });
            return;
          }
          const blobParts: ArrayBuffer[] = [];
          let received = 0;
          for await (const chunk of chunks) {
            received += chunk.byteLength;
            if (received > descriptor.byteLength) throw new Error('Media record exceeded its declared byte limit.');
            blobParts.push(chunk.slice().buffer);
          }
          if (received !== descriptor.byteLength || !descriptor.logicalKey || !descriptor.media) {
            throw new Error('Transfer media record is incomplete.');
          }
          const importedMediaId = mediaIdMap.get(descriptor.logicalKey);
          if (!importedMediaId) throw new Error('Transfer media record has no isolated import id.');
          const blob = new Blob(blobParts, { type: descriptor.mimeType || 'application/octet-stream' });
          await stageMediaTransferBlob(mediaBatchId, {
            id: importedMediaId,
            kind: descriptor.media.kind,
            mimeType: descriptor.mimeType || blob.type || 'application/octet-stream',
            size: blob.size,
            createdAt: descriptor.media.createdAt,
            width: descriptor.media.width,
            height: descriptor.media.height,
            blob,
          });
          stagedMediaIds.push(importedMediaId);
        },
      });
      reportProgress(
        options,
        'IMPORT',
        descriptor.kind === 'MEDIA' ? 'MEDIA' : 'READING',
        `Verified transfer record ${index + 1} of ${manifest.records.length}.`,
        { processedBytes, totalBytes, processedRecords: index + 1, totalRecords: manifest.records.length },
      );
      await yieldToMainThread();
    }
    throwIfSaveTransferCancelled(options?.signal);
    reportProgress(options, 'IMPORT', 'FINALIZING', 'Finishing transfer verification...', {
      processedBytes,
      totalBytes,
      processedRecords: manifest.records.length,
      totalRecords: manifest.records.length,
    });
    await native.finishImport({ sessionId });
    nativeFinished = true;
    archiveSession.verifyComplete();
    if (stagedSaveBatches.length !== manifest.totals.saveRecords || stagedSaveBatches.length <= 0) {
      throw new Error('Transfer did not stage every signed save slot.');
    }
    if (stagedMediaIds.length !== manifest.totals.mediaRecords) {
      throw new Error('Transfer did not stage every signed media record.');
    }

    throwIfSaveTransferCancelled(options?.signal);
    reportProgress(options, 'IMPORT', 'WRITING', 'Safely replacing local save slots...', {
      processedBytes: totalBytes,
      totalBytes,
      processedRecords: manifest.records.length,
      totalRecords: manifest.records.length,
    }, false);
    if (stagedMediaIds.length > 0) {
      await promoteStagedMediaTransferBatch(mediaBatchId, stagedMediaIds);
      mediaPromoted = true;
    }
    const saveBatch: StagedSaveBatch = { keys: stagedSaveBatches.flatMap(batch => batch.keys) };
    await promoteStagedVerifiedGameDataReplacement(saveBatch);
    await restoreActorEmpireLocalStorage(localStorageEntries, { preserveSaveMirrors: true });
    reportProgress(options, 'IMPORT', 'DONE', 'Save transfer restored.', {
      processedBytes: totalBytes,
      totalBytes,
      processedRecords: manifest.records.length,
      totalRecords: manifest.records.length,
    }, false);
    options?.onDiagnostic?.({
      direction: 'import',
      stage: 'completed',
      transport: 'stream_v2',
      save_count: stagedSaveBatches.length,
      local_storage_count: localStorageEntries.length,
      media_count: stagedMediaIds.length,
    });
    return {
      saveSlots: stagedSaveBatches.length,
      playerNames,
      carePackageGranted,
      mediaRecords: stagedMediaIds.length,
    };
  } catch (error) {
    if (!nativeFinished) await native.cancelImport({ sessionId }).catch(() => undefined);
    const saveBatch: StagedSaveBatch = { keys: stagedSaveBatches.flatMap(batch => batch.keys) };
    if (saveBatch.keys.length > 0) await discardStagedVerifiedGameDataReplacement(saveBatch);
    await discardStagedMediaTransferBatch(mediaBatchId).catch(() => undefined);
    if (mediaPromoted) await Promise.allSettled(stagedMediaIds.map(id => deleteMediaBlob(id)));
    options?.onDiagnostic?.({ direction: 'import', stage: 'failed', transport: 'stream_v2' });
    throw error;
  }
};

const restoreLegacyArchiveText = async (
  rawText: string,
  options?: SaveTransferImportOptions,
): Promise<SaveTransferResult> => {
  throwIfSaveTransferCancelled(options?.signal);
  reportProgress(options, 'IMPORT', 'READING', 'Reading transfer file...');
  await yieldToMainThread();
  throwIfSaveTransferCancelled(options?.signal);
  reportProgress(options, 'IMPORT', 'VERIFYING', 'Verifying signed transfer file...');
  const archive = await parseArchive(rawText);
  await yieldToMainThread();
  throwIfSaveTransferCancelled(options?.signal);
  reportProgress(options, 'IMPORT', 'COMPACTING', 'Migrating and compacting save slots...');
  const importResult = await prepareSaveTransferImportEntries(archive.payload.indexedDb.entries, {
    archiveAppVersion: archive.appVersion,
    importedAt: new Date().toISOString(),
  });
  const entries = importResult.entries;
  if (entries.length <= 0) throw new Error('Transfer file does not contain any Actor Empire save slots.');
  throwIfSaveTransferCancelled(options?.signal);
  reportProgress(options, 'IMPORT', 'WRITING', 'Verifying and safely replacing save slots...', {}, false);
  await replaceAllVerifiedGameData(entries);
  reportProgress(options, 'IMPORT', 'MEDIA', 'Restoring compacted media...', {}, false);
  let mediaRecords = 0;
  try {
    mediaRecords = await importMediaTransferRecords(archive.payload.media?.records || []);
  } catch {
    mediaRecords = 0;
  }
  await restoreActorEmpireLocalStorage(archive.payload.localStorage);
  reportProgress(options, 'IMPORT', 'DONE', 'Save transfer restored.', {}, false);
  return {
    ...getArchiveSummary(entries.map(entry => ({ key: entry.currentKey, value: entry.player }))),
    carePackageGranted: importResult.carePackageGranted,
    mediaRecords,
  };
};

const importNativeArchive = async (
  native: NativeSaveTransferPlugin,
  options?: SaveTransferImportOptions,
): Promise<SaveTransferResult> => {
  throwIfSaveTransferCancelled(options?.signal);
  const started = await native.beginImport();
  try {
    throwIfSaveTransferCancelled(options?.signal);
  } catch (error) {
    await native.cancelImport({ sessionId: started.sessionId }).catch(() => undefined);
    throw error;
  }
  if (started.formatVersion === 2) return importStreamedNativeV2Archive(native, started.sessionId, options);
  const memory = await readAndroidTransferMemory();
  const initialBytes = started.totalBytes > 0 ? started.totalBytes : 0;
  const initialFootprint = measureSaveTransferFootprint({
    saveRecordBytes: [initialBytes],
    localStorageRecordBytes: [],
    mediaRecordBytes: [],
  });
  const initialDecision = evaluateLegacyAndroidBridgeSafety(initialFootprint, memory);
  const safety: SaveTransferSafetyContext = {
    footprint: initialFootprint,
    decision: initialDecision,
    memoryClassMb: memory.memoryClassMb,
    availableMemoryMb: memory.availableMemoryMb,
    lowMemory: memory.lowMemory,
  };
  reportSafetyDiagnostic(options?.onDiagnostic, 'IMPORT', initialDecision.allowed ? 'MEASURED' : 'BLOCKED', safety);
  try {
    assertLegacyAndroidBridgeSafety(initialDecision);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let text = '';
    let received = 0;
    while (true) {
      throwIfSaveTransferCancelled(options?.signal);
      const result = await native.readLegacyImportChunk({
        sessionId: started.sessionId,
        maxBytes: SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
      });
      throwIfSaveTransferCancelled(options?.signal);
      if (result.done) break;
      const bytes = bridgeBase64ToBytes(result.dataBase64);
      received += bytes.byteLength;
      if (received > initialDecision.maxPayloadBytes) throw new SaveTransferSafetyError('PAYLOAD_TOO_LARGE');
      text += decoder.decode(bytes, { stream: true });
      reportProgress(options, 'IMPORT', 'READING', 'Reading older V1 transfer...', {
        processedBytes: received,
        totalBytes: initialBytes || undefined,
      });
    }
    text += decoder.decode();
    await native.finishImport({ sessionId: started.sessionId });
    const result = await restoreLegacyArchiveText(text, options);
    reportSafetyDiagnostic(options?.onDiagnostic, 'IMPORT', 'COMPLETED', safety);
    return result;
  } catch (error) {
    await native.cancelImport({ sessionId: started.sessionId }).catch(() => undefined);
    throw error;
  }
};

export const importSignedSaveArchiveFromFile = async (options?: SaveTransferImportOptions): Promise<SaveTransferResult> => {
  throwIfSaveTransferCancelled(options?.signal);
  reportProgress(options, 'IMPORT', 'WAITING_FOR_FILE', 'Choose the Actor Empire .aesave transfer file.');
  const native = nativeStreamedTransferPort();
  if (native) return importNativeArchive(native, options);
  const memory = await readAndroidTransferMemory();
  let importSafety: SaveTransferSafetyContext | null = null;
  const rawText = await pickArchiveFileText({
    beforeRead: file => {
      throwIfSaveTransferCancelled(options?.signal);
      const measured = measureSaveTransferFootprint({
        saveRecordBytes: [file.size],
        localStorageRecordBytes: [],
        mediaRecordBytes: [],
      });
      const footprint = {
        ...measured,
        projectedArchiveBytes: Math.max(measured.projectedArchiveBytes, file.size),
      };
      const decision = evaluateLegacyAndroidBridgeSafety(footprint, memory);
      importSafety = {
        footprint,
        decision,
        memoryClassMb: memory.memoryClassMb,
        availableMemoryMb: memory.availableMemoryMb,
        lowMemory: memory.lowMemory,
      };
      reportSafetyDiagnostic(options?.onDiagnostic, 'IMPORT', decision.allowed ? 'MEASURED' : 'BLOCKED', importSafety);
      if (memory.isAndroid) assertLegacyAndroidBridgeSafety(decision);
    },
  });
  throwIfSaveTransferCancelled(options?.signal);
  const result = await restoreLegacyArchiveText(rawText, options);
  if (importSafety) reportSafetyDiagnostic(options?.onDiagnostic, 'IMPORT', 'COMPLETED', importSafety);
  return result;
};

export const __saveTransferTest = {
  normalizeArchiveText,
  parseJsonTransfer,
  parseArchive,
};
