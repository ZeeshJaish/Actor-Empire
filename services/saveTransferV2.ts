export const SAVE_TRANSFER_V2_MAGIC = 'AESAVE2';
export const SAVE_TRANSFER_V2_FORMAT = 'actor-empire-save-transfer';
export const SAVE_TRANSFER_V2_FORMAT_VERSION = 2;
export const SAVE_TRANSFER_V2_CHUNK_BYTES = 128 * 1024;

export const SAVE_TRANSFER_V2_LIMITS = {
  maxSaveRecords: 3,
  maxLocalStorageRecords: 128,
  maxMediaRecords: 512,
  maxRecords: 643,
  maxSaveRecordBytes: 128 * 1024 * 1024,
  maxLocalStorageRecordBytes: 4 * 1024 * 1024,
  maxMediaRecordBytes: 32 * 1024 * 1024,
  maxUncompressedBytes: 512 * 1024 * 1024,
  maxManifestBytes: 512 * 1024,
} as const;

const SIGNATURE_ALGORITHM = 'HMAC-SHA256' as const;
const TRANSFER_V2_SECRET = 'actor-empire-save-transfer-v2:2f64a7b9b11944baa3e2515e23d37f70';
const SHA256_BASE64URL_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ARCHIVE_DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const SLOT_PATTERN = /^actorEmpireSave_[1-3]$/;

export type SaveTransferV2RecordKind = 'SAVE' | 'LOCAL_STORAGE' | 'MEDIA' | 'ARCHIVE_ROOT' | 'ARCHIVE_CHUNK';

export type SaveTransferV2RecordDescriptor = {
  id: string;
  kind: SaveTransferV2RecordKind;
  byteLength: number;
  sha256: string;
  encoding: 'UTF8_JSON' | 'UTF8_TEXT' | 'BINARY';
  logicalKey?: string;
  archiveRootDigest?: string;
  mimeType?: string;
  media?: {
    kind: 'youtube_thumbnail' | 'instagram_post' | 'x_post' | 'profile_image' | 'production_poster' | 'other';
    createdAt: number;
    width?: number;
    height?: number;
  };
};

export type SaveTransferV2ManifestBody = {
  format: typeof SAVE_TRANSFER_V2_FORMAT;
  formatVersion: typeof SAVE_TRANSFER_V2_FORMAT_VERSION;
  container: 'FRAMED_RECORDS_V1';
  appVersion: string;
  createdAt: string;
  sourcePlatform: string;
  chunkSizeBytes: typeof SAVE_TRANSFER_V2_CHUNK_BYTES;
  compatibility: {
    minimumReaderVersion: 2 | 3;
    importsLegacyV1: true;
  };
  limits: typeof SAVE_TRANSFER_V2_LIMITS;
  totals: {
    records: number;
    saveRecords: number;
    localStorageRecords: number;
    mediaRecords: number;
    archiveRootRecords?: number;
    archiveChunkRecords?: number;
    uncompressedBytes: number;
  };
  records: SaveTransferV2RecordDescriptor[];
  aggregateSha256: string;
};

export type SignedSaveTransferV2Manifest = SaveTransferV2ManifestBody & {
  signature: {
    algorithm: typeof SIGNATURE_ALGORITHM;
    value: string;
  };
};

const textEncoder = new TextEncoder();

const base64UrlEncode = (bytes: ArrayBuffer): string => {
  const values = new Uint8Array(bytes);
  let binary = '';
  for (let index = 0; index < values.length; index += 0x8000) {
    binary += String.fromCharCode(...values.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const stableStringify = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item)).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().filter(key => record[key] !== undefined)
      .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return 'null';
};

export const digestSaveTransferV2Bytes = async (bytes: Uint8Array): Promise<string> => (
  base64UrlEncode(await crypto.subtle.digest('SHA-256', bytes))
);

const digestText = async (value: string): Promise<string> => (
  digestSaveTransferV2Bytes(textEncoder.encode(value))
);

const requireShortText = (value: string, label: string, maxLength: number): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || normalized.length > maxLength) throw new Error(`${label} is invalid.`);
  return normalized;
};

const recordLimit = (kind: SaveTransferV2RecordKind): number => {
  if (kind === 'SAVE') return SAVE_TRANSFER_V2_LIMITS.maxSaveRecordBytes;
  if (kind === 'LOCAL_STORAGE') return SAVE_TRANSFER_V2_LIMITS.maxLocalStorageRecordBytes;
  if (kind === 'ARCHIVE_ROOT') return 640 * 1024;
  if (kind === 'ARCHIVE_CHUNK') return 320 * 1024;
  return SAVE_TRANSFER_V2_LIMITS.maxMediaRecordBytes;
};

export const createSaveTransferV2RecordDescriptor = (input: {
  id: string;
  kind: SaveTransferV2RecordKind;
  byteLength: number;
  sha256: string;
  logicalKey?: string;
  archiveRootDigest?: string;
  mimeType?: string;
  mediaKind?: SaveTransferV2RecordDescriptor['media']['kind'];
  createdAt?: number;
  width?: number;
  height?: number;
  media?: SaveTransferV2RecordDescriptor['media'];
}): SaveTransferV2RecordDescriptor => {
  const id = requireShortText(input.id, 'Record id', 160);
  if (!['SAVE', 'LOCAL_STORAGE', 'MEDIA', 'ARCHIVE_ROOT', 'ARCHIVE_CHUNK'].includes(input.kind)) {
    throw new Error('Transfer record kind is unsupported.');
  }
  if (!Number.isSafeInteger(input.byteLength) || input.byteLength < 0 || input.byteLength > recordLimit(input.kind)) {
    throw new Error(`${input.kind.toLowerCase()} record exceeds its byte limit.`);
  }
  if (!SHA256_BASE64URL_PATTERN.test(input.sha256)) throw new Error('Record digest is invalid.');
  const logicalKey = input.logicalKey ? requireShortText(input.logicalKey, 'Logical key', 180) : undefined;
  const archiveRootDigest = input.archiveRootDigest;
  if (archiveRootDigest !== undefined && !ARCHIVE_DIGEST_PATTERN.test(archiveRootDigest)) {
    throw new Error('Archive root digest is invalid.');
  }
  const mimeType = input.mimeType ? requireShortText(input.mimeType, 'MIME type', 120) : undefined;
  if (input.kind === 'SAVE' && !/^actorEmpireSave_[1-3]$/.test(logicalKey || '')) {
    throw new Error('Save record must target a public save slot.');
  }
  if (input.kind === 'LOCAL_STORAGE' && !logicalKey?.startsWith('actorEmpire')) {
    throw new Error('Local-storage record must use an Actor Empire key.');
  }
  if (input.kind === 'ARCHIVE_ROOT'
    && (!/^actorEmpireSave_[1-3]__archiveRoot$/.test(logicalKey || '') || !archiveRootDigest)) {
    throw new Error('Archive root record must identify a public slot and root digest.');
  }
  if (input.kind === 'ARCHIVE_CHUNK'
    && (!/^actorEmpireSave_[1-3]__archive_chunk__[0-9a-f]{64}$/.test(logicalKey || '') || archiveRootDigest)) {
    throw new Error('Archive chunk record must have a valid slot and chunk digest.');
  }
  if (input.kind !== 'SAVE' && input.kind !== 'ARCHIVE_ROOT' && archiveRootDigest) {
    throw new Error('Archive root digest is not permitted on this record.');
  }
  if ((input.kind === 'ARCHIVE_ROOT' || input.kind === 'ARCHIVE_CHUNK')
    && (mimeType || input.media || input.mediaKind)) {
    throw new Error('Archive records cannot include media metadata.');
  }
  if (input.kind === 'MEDIA' && (!mimeType || !logicalKey)) throw new Error('Media record must declare a MIME type and logical key.');
  const mediaKinds = new Set(['youtube_thumbnail', 'instagram_post', 'x_post', 'profile_image', 'production_poster', 'other']);
  const finiteDimension = (value?: number) => value === undefined || (Number.isSafeInteger(value) && value > 0 && value <= 100_000);
  let media: SaveTransferV2RecordDescriptor['media'];
  if (input.kind === 'MEDIA') {
    const mediaKind = input.mediaKind ?? input.media?.kind;
    const createdAt = input.createdAt ?? input.media?.createdAt;
    const width = input.width ?? input.media?.width;
    const height = input.height ?? input.media?.height;
    if (!mediaKind || !mediaKinds.has(mediaKind)) throw new Error('Media record kind is invalid.');
    if (!Number.isSafeInteger(createdAt) || (createdAt ?? -1) < 0) throw new Error('Media record creation time is invalid.');
    if (!finiteDimension(width) || !finiteDimension(height)) throw new Error('Media record dimensions are invalid.');
    media = {
      kind: mediaKind,
      createdAt: createdAt as number,
      ...(width === undefined ? {} : { width }),
      ...(height === undefined ? {} : { height }),
    };
  }
  return {
    id,
    kind: input.kind,
    byteLength: input.byteLength,
    sha256: input.sha256,
    encoding: input.kind === 'SAVE' || input.kind === 'ARCHIVE_ROOT' || input.kind === 'ARCHIVE_CHUNK'
      ? 'UTF8_JSON' : input.kind === 'MEDIA' ? 'BINARY' : 'UTF8_TEXT',
    ...(logicalKey ? { logicalKey } : {}),
    ...(archiveRootDigest ? { archiveRootDigest } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(media ? { media } : {}),
  };
};

const validateRecords = (records: SaveTransferV2RecordDescriptor[]) => {
  if (!Array.isArray(records) || records.length === 0) throw new Error('Transfer manifest has no records.');
  if (records.length > SAVE_TRANSFER_V2_LIMITS.maxRecords) throw new Error('Transfer manifest exceeds the record limit.');
  const ids = new Set<string>();
  const logicalTargets = new Set<string>();
  let saveRecords = 0;
  let localStorageRecords = 0;
  let mediaRecords = 0;
  let archiveRootRecords = 0;
  let archiveChunkRecords = 0;
  let uncompressedBytes = 0;
  for (const source of records) {
    const record = createSaveTransferV2RecordDescriptor(source);
    if (source.encoding !== record.encoding) throw new Error('Transfer record encoding is invalid.');
    if (ids.has(record.id)) throw new Error(`Transfer manifest contains duplicate record id: ${record.id}`);
    ids.add(record.id);
    const logicalTarget = `${record.kind}:${record.logicalKey || record.id}`;
    if (logicalTargets.has(logicalTarget)) throw new Error(`Transfer manifest contains duplicate logical target: ${logicalTarget}`);
    logicalTargets.add(logicalTarget);
    saveRecords += Number(record.kind === 'SAVE');
    localStorageRecords += Number(record.kind === 'LOCAL_STORAGE');
    mediaRecords += Number(record.kind === 'MEDIA');
    archiveRootRecords += Number(record.kind === 'ARCHIVE_ROOT');
    archiveChunkRecords += Number(record.kind === 'ARCHIVE_CHUNK');
    uncompressedBytes += record.byteLength;
    if (!Number.isSafeInteger(uncompressedBytes) || uncompressedBytes > SAVE_TRANSFER_V2_LIMITS.maxUncompressedBytes) {
      throw new Error('Transfer manifest exceeds the total byte limit.');
    }
  }
  if (saveRecords < 1 || saveRecords > SAVE_TRANSFER_V2_LIMITS.maxSaveRecords) {
    throw new Error('Transfer manifest has an invalid save-record count.');
  }
  if (localStorageRecords > SAVE_TRANSFER_V2_LIMITS.maxLocalStorageRecords) {
    throw new Error('Transfer manifest exceeds the local-storage record limit.');
  }
  if (mediaRecords > SAVE_TRANSFER_V2_LIMITS.maxMediaRecords) {
    throw new Error('Transfer manifest exceeds the media-record limit.');
  }
  return {
    records: records.length, saveRecords, localStorageRecords, mediaRecords, uncompressedBytes,
    ...(archiveRootRecords || archiveChunkRecords ? { archiveRootRecords, archiveChunkRecords } : {}),
  };
};

/** Descriptor-level pairing; root payload/chunk completeness is checked while importing. */
export const assertCompleteArchiveTransferManifest = (
  manifest: Pick<SignedSaveTransferV2Manifest, 'records'>,
): void => {
  const saves = new Map<string, SaveTransferV2RecordDescriptor>();
  const roots = new Map<string, SaveTransferV2RecordDescriptor>();
  for (const record of manifest.records) {
    if (record.kind === 'SAVE' && record.logicalKey) saves.set(record.logicalKey, record);
    if (record.kind === 'ARCHIVE_ROOT' && record.logicalKey) {
      roots.set(record.logicalKey.slice(0, -'__archiveRoot'.length), record);
    }
  }
  for (const [slot, save] of saves) {
    const root = roots.get(slot);
    if (Boolean(save.archiveRootDigest) !== Boolean(root)
      || (root && save.archiveRootDigest !== root.archiveRootDigest)) {
      throw new Error(`Archive root is missing or does not match save ${slot}.`);
    }
    if (root) {
      const rootIndex = manifest.records.indexOf(root);
      const saveIndex = manifest.records.indexOf(save);
      const chunkIndexes = manifest.records.flatMap((record, index) => record.kind === 'ARCHIVE_CHUNK'
        && record.logicalKey?.startsWith(`${slot}__archive_chunk__`) ? [index] : []);
      if (rootIndex < 0 || rootIndex >= saveIndex
        || chunkIndexes.some(index => index <= rootIndex || index >= saveIndex)) {
        throw new Error(`Archive transfer record order is invalid for ${slot}.`);
      }
    }
  }
  for (const slot of roots.keys()) {
    if (!SLOT_PATTERN.test(slot) || !saves.get(slot)?.archiveRootDigest) {
      throw new Error(`Archive root has no matching save slot ${slot}.`);
    }
  }
  for (const record of manifest.records) {
    if (record.kind === 'ARCHIVE_CHUNK') {
      const slot = record.logicalKey?.split('__archive_chunk__')[0];
      if (!slot || !roots.has(slot)) throw new Error('Archive chunk has no matching archive root.');
    }
  }
};

const signBody = async (body: SaveTransferV2ManifestBody): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(TRANSFER_V2_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64UrlEncode(await crypto.subtle.sign('HMAC', key, textEncoder.encode(stableStringify(body))));
};

const constantTimeEquals = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

export const createSignedSaveTransferV2Manifest = async (input: {
  appVersion: string;
  createdAt: string;
  sourcePlatform: string;
  records: SaveTransferV2RecordDescriptor[];
}): Promise<SignedSaveTransferV2Manifest> => {
  const totals = validateRecords(input.records);
  assertCompleteArchiveTransferManifest({ records: input.records });
  const records = input.records.map(record => ({ ...record }));
  const aggregateSha256 = await digestText(stableStringify(records));
  const body: SaveTransferV2ManifestBody = {
    format: SAVE_TRANSFER_V2_FORMAT,
    formatVersion: SAVE_TRANSFER_V2_FORMAT_VERSION,
    container: 'FRAMED_RECORDS_V1',
    appVersion: requireShortText(input.appVersion, 'App version', 64),
    createdAt: requireShortText(input.createdAt, 'Creation time', 64),
    sourcePlatform: requireShortText(input.sourcePlatform, 'Source platform', 32),
    chunkSizeBytes: SAVE_TRANSFER_V2_CHUNK_BYTES,
    compatibility: {
      minimumReaderVersion: input.records.some(record => record.kind === 'ARCHIVE_ROOT') ? 3 : 2,
      importsLegacyV1: true,
    },
    limits: SAVE_TRANSFER_V2_LIMITS,
    totals,
    records,
    aggregateSha256,
  };
  return {
    ...body,
    signature: { algorithm: SIGNATURE_ALGORITHM, value: await signBody(body) },
  };
};

export const verifySignedSaveTransferV2Manifest = async (
  manifest: SignedSaveTransferV2Manifest,
): Promise<boolean> => {
  try {
    if (manifest.format !== SAVE_TRANSFER_V2_FORMAT || manifest.formatVersion !== SAVE_TRANSFER_V2_FORMAT_VERSION) return false;
    if (manifest.container !== 'FRAMED_RECORDS_V1' || manifest.chunkSizeBytes !== SAVE_TRANSFER_V2_CHUNK_BYTES) return false;
    if (manifest.signature?.algorithm !== SIGNATURE_ALGORITHM || !SHA256_BASE64URL_PATTERN.test(manifest.signature.value)) return false;
    const totals = validateRecords(manifest.records);
    assertCompleteArchiveTransferManifest(manifest);
    if (stableStringify(totals) !== stableStringify(manifest.totals)) return false;
    if (await digestText(stableStringify(manifest.records)) !== manifest.aggregateSha256) return false;
    const { signature, ...body } = manifest;
    return constantTimeEquals(signature.value, await signBody(body));
  } catch {
    return false;
  }
};

export const serializeSaveTransferV2ManifestEnvelope = (
  manifest: SignedSaveTransferV2Manifest,
): string => {
  const json = JSON.stringify(manifest);
  const byteLength = textEncoder.encode(json).byteLength;
  if (byteLength > SAVE_TRANSFER_V2_LIMITS.maxManifestBytes) {
    throw new Error('Transfer manifest exceeds the manifest byte limit.');
  }
  return `${SAVE_TRANSFER_V2_MAGIC}\n${byteLength}\n${json}\n`;
};

export const serializeSaveTransferV2RecordHeader = (
  source: SaveTransferV2RecordDescriptor,
): string => {
  const record = createSaveTransferV2RecordDescriptor(source);
  const json = JSON.stringify(record);
  const headerBytes = textEncoder.encode(json).byteLength;
  return `RECORD\n${headerBytes}\n${json}\n${record.byteLength}\n`;
};

export const detectSaveTransferFormat = (value: string): 1 | 2 | null => {
  const normalized = typeof value === 'string' ? value.replace(/^\uFEFF/, '').trimStart() : '';
  if (normalized.startsWith(`${SAVE_TRANSFER_V2_MAGIC}\n`)) return 2;
  try {
    const parsed = JSON.parse(normalized) as { format?: unknown; formatVersion?: unknown };
    return parsed?.format === SAVE_TRANSFER_V2_FORMAT && parsed?.formatVersion === 1 ? 1 : null;
  } catch {
    return null;
  }
};
