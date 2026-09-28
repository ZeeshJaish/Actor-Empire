import type { SaveTransferV2RecordDescriptor } from './saveTransferV2';
import { throwIfSaveTransferCancelled } from './saveTransferExperience';

// 128 KiB of raw data becomes at most 174,764 base64 characters. Keeping the
// encoded value below 256 KiB leaves room for Capacitor's JSON envelope.
export const SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES = 128 * 1024;
export const SAVE_TRANSFER_STREAM_BASE64_CHARS = 4 * Math.ceil(SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES / 3);

type ChunkSink = (chunk: Uint8Array) => void | Promise<void>;

const textEncoder = new TextEncoder();

export const bytesToBridgeBase64 = (bytes: Uint8Array): string => {
  if (bytes.byteLength > SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES) {
    throw new Error('Save-transfer chunk exceeds the raw chunk limit.');
  }
  let binary = '';
  for (let index = 0; index < bytes.byteLength; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
};

export const bridgeBase64ToBytes = (
  value: string,
  maxBytes = SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
): Uint8Array => {
  if (typeof value !== 'string' || value.length > 4 * Math.ceil(maxBytes / 3)) {
    throw new Error('Save-transfer chunk exceeds the encoded chunk limit.');
  }
  const binary = atob(value);
  if (binary.length > maxBytes) throw new Error('Save-transfer chunk exceeds the raw chunk limit.');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

class BoundedChunkWriter {
  private readonly buffer: Uint8Array;

  private used = 0;

  constructor(
    private readonly sink: ChunkSink,
    readonly chunkBytes: number,
  ) {
    if (!Number.isSafeInteger(chunkBytes) || chunkBytes <= 0 || chunkBytes > SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES) {
      throw new Error('Save-transfer chunk limit is invalid.');
    }
    this.buffer = new Uint8Array(chunkBytes);
  }

  private async flush() {
    if (this.used === 0) return;
    await this.sink(this.buffer.slice(0, this.used));
    this.used = 0;
  }

  async writeBytes(source: Uint8Array) {
    let offset = 0;
    while (offset < source.byteLength) {
      const writable = Math.min(this.chunkBytes - this.used, source.byteLength - offset);
      this.buffer.set(source.subarray(offset, offset + writable), this.used);
      this.used += writable;
      offset += writable;
      if (this.used === this.chunkBytes) await this.flush();
    }
  }

  async writeText(value: string) {
    let offset = 0;
    while (offset < value.length) {
      let end = Math.min(value.length, offset + this.chunkBytes);
      if (end < value.length && end > offset) {
        const last = value.charCodeAt(end - 1);
        if (last >= 0xd800 && last <= 0xdbff) end -= 1;
      }
      let encoded = textEncoder.encode(value.slice(offset, end));
      while (encoded.byteLength > this.chunkBytes && end > offset + 1) {
        end = offset + Math.max(1, Math.floor((end - offset) * this.chunkBytes / encoded.byteLength));
        if (end < value.length) {
          const last = value.charCodeAt(end - 1);
          if (last >= 0xd800 && last <= 0xdbff) end -= 1;
        }
        encoded = textEncoder.encode(value.slice(offset, end));
      }
      if (encoded.byteLength > this.chunkBytes) {
        throw new Error('A UTF-8 code point exceeds the transfer chunk limit.');
      }
      await this.writeBytes(encoded);
      offset = end;
    }
  }

  async close() {
    await this.flush();
  }
}

export const streamTextAsBoundedChunks = async (
  value: string,
  sink: ChunkSink,
  chunkBytes = SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
): Promise<void> => {
  const writer = new BoundedChunkWriter(sink, chunkBytes);
  await writer.writeText(value);
  await writer.close();
};

const writeJsonValue = async (
  source: unknown,
  writer: BoundedChunkWriter,
  ancestors: Set<object>,
  position: 'ROOT' | 'ARRAY' | 'OBJECT',
  key = '',
  alreadyAppliedToJson = false,
): Promise<boolean> => {
  let value = source;
  if (!alreadyAppliedToJson && value && typeof value === 'object' && typeof (value as { toJSON?: unknown }).toJSON === 'function') {
    value = (value as { toJSON: (key: string) => unknown }).toJSON(key);
  }
  if (value === null) {
    await writer.writeText('null');
    return true;
  }
  if (typeof value === 'string') {
    await writer.writeText(JSON.stringify(value));
    return true;
  }
  if (typeof value === 'number') {
    await writer.writeText(Number.isFinite(value) ? String(value) : 'null');
    return true;
  }
  if (typeof value === 'boolean') {
    await writer.writeText(value ? 'true' : 'false');
    return true;
  }
  if (typeof value === 'bigint') throw new TypeError('Do not know how to serialize a BigInt');
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    if (position === 'ARRAY') {
      await writer.writeText('null');
      return true;
    }
    return false;
  }
  if (typeof value !== 'object') return false;
  if (ancestors.has(value as object)) throw new TypeError('Converting circular structure to JSON');
  ancestors.add(value as object);
  try {
    if (Array.isArray(value)) {
      await writer.writeText('[');
      for (let index = 0; index < value.length; index += 1) {
        if (index > 0) await writer.writeText(',');
        await writeJsonValue(value[index], writer, ancestors, 'ARRAY', String(index));
      }
      await writer.writeText(']');
      return true;
    }

    await writer.writeText('{');
    let written = 0;
    for (const key of Object.keys(value as Record<string, unknown>)) {
      let propertyValue = (value as Record<string, unknown>)[key];
      if (propertyValue && typeof propertyValue === 'object' && typeof (propertyValue as { toJSON?: unknown }).toJSON === 'function') {
        propertyValue = (propertyValue as { toJSON: (key: string) => unknown }).toJSON(key);
      }
      if (propertyValue === undefined || typeof propertyValue === 'function' || typeof propertyValue === 'symbol') continue;
      if (written > 0) await writer.writeText(',');
      await writer.writeText(JSON.stringify(key));
      await writer.writeText(':');
      await writeJsonValue(propertyValue, writer, ancestors, 'OBJECT', key, true);
      written += 1;
    }
    await writer.writeText('}');
    return true;
  } finally {
    ancestors.delete(value as object);
  }
};

export const streamJsonAsBoundedChunks = async (
  value: unknown,
  sink: ChunkSink,
  chunkBytes = SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
): Promise<void> => {
  const writer = new BoundedChunkWriter(sink, chunkBytes);
  const written = await writeJsonValue(value, writer, new Set(), 'ROOT');
  if (!written) throw new TypeError('Save-transfer record is not JSON serializable.');
  await writer.close();
};

export const streamBlobAsBoundedChunks = async (
  blob: Blob,
  sink: ChunkSink,
  chunkBytes = SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
): Promise<void> => {
  if (!Number.isSafeInteger(chunkBytes) || chunkBytes <= 0 || chunkBytes > SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES) {
    throw new Error('Save-transfer chunk limit is invalid.');
  }
  for (let offset = 0; offset < blob.size; offset += chunkBytes) {
    const chunk = new Uint8Array(await blob.slice(offset, Math.min(blob.size, offset + chunkBytes)).arrayBuffer());
    if (chunk.byteLength > chunkBytes) throw new Error('Blob reader exceeded the transfer chunk limit.');
    await sink(chunk);
  }
};

const descriptorKeys: Array<keyof SaveTransferV2RecordDescriptor> = [
  'id', 'kind', 'byteLength', 'sha256', 'encoding', 'logicalKey', 'archiveRootDigest', 'mimeType',
];

export const assertSaveTransferV2RecordMatch = (
  actual: SaveTransferV2RecordDescriptor,
  signed: SaveTransferV2RecordDescriptor,
): void => {
  for (const key of descriptorKeys) {
    if (actual[key] !== signed[key]) {
      throw new Error('Transfer record does not match the signed manifest.');
    }
  }
  const actualMedia = actual.media;
  const signedMedia = signed.media;
  if (Boolean(actualMedia) !== Boolean(signedMedia)) throw new Error('Transfer record does not match the signed manifest.');
  if (actualMedia && signedMedia && (
    actualMedia.kind !== signedMedia.kind
    || actualMedia.createdAt !== signedMedia.createdAt
    || actualMedia.width !== signedMedia.width
    || actualMedia.height !== signedMedia.height
  )) throw new Error('Transfer record does not match the signed manifest.');
};

export const decodeBoundedUtf8Chunks = async (
  encodedChunks: Iterable<string> | AsyncIterable<string>,
  declaredBytes: number,
): Promise<string> => {
  if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0) {
    throw new Error('Transfer declared byte limit is invalid.');
  }
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let total = 0;
  let text = '';
  for await (const encoded of encodedChunks) {
    const bytes = bridgeBase64ToBytes(encoded);
    total += bytes.byteLength;
    if (total > declaredBytes) throw new Error('Transfer exceeded its declared byte limit.');
    text += decoder.decode(bytes, { stream: true });
  }
  text += decoder.decode();
  if (total !== declaredBytes) throw new Error('Transfer ended before its declared byte limit.');
  return text;
};

export type NativeSaveTransferV2ExportRecordPort = {
  beginExportRecord(options: { sessionId: string; recordId: string }): Promise<void>;
  appendExportChunk(options: { sessionId: string; dataBase64: string }): Promise<{ acceptedBytes: number }>;
  finishExportRecord(options: { sessionId: string }): Promise<{ recordId: string; byteLength: number; sha256: string }>;
};

export const spoolNativeSaveTransferV2Record = async (input: {
  sessionId: string;
  recordId: string;
  native: NativeSaveTransferV2ExportRecordPort;
  write: (sink: ChunkSink) => Promise<void>;
  signal?: AbortSignal;
  onChunk?: (byteLength: number) => void;
}): Promise<{ recordId: string; byteLength: number; sha256: string }> => {
  throwIfSaveTransferCancelled(input.signal);
  await input.native.beginExportRecord({ sessionId: input.sessionId, recordId: input.recordId });
  throwIfSaveTransferCancelled(input.signal);
  await input.write(async chunk => {
    throwIfSaveTransferCancelled(input.signal);
    if (chunk.byteLength <= 0 || chunk.byteLength > SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES) {
      throw new Error('Save-transfer producer emitted an invalid chunk.');
    }
    const result = await input.native.appendExportChunk({
      sessionId: input.sessionId,
      dataBase64: bytesToBridgeBase64(chunk),
    });
    throwIfSaveTransferCancelled(input.signal);
    if (result.acceptedBytes !== chunk.byteLength) throw new Error('Native save-transfer writer accepted an incomplete chunk.');
    input.onChunk?.(chunk.byteLength);
  });
  throwIfSaveTransferCancelled(input.signal);
  const result = await input.native.finishExportRecord({ sessionId: input.sessionId });
  throwIfSaveTransferCancelled(input.signal);
  if (result.recordId !== input.recordId || !Number.isSafeInteger(result.byteLength) || result.byteLength < 0) {
    throw new Error('Native save-transfer writer returned invalid record metadata.');
  }
  return result;
};

export type NativeSaveTransferV2ImportRecordPort = {
  beginImportRecord(options: { sessionId: string }): Promise<{ headerJson: string; byteLength: number }>;
  readImportRecordChunk(options: { sessionId: string; maxBytes: number }): Promise<{
    dataBase64: string;
    byteLength: number;
    done: boolean;
  }>;
  finishImportRecord(options: { sessionId: string }): Promise<{ byteLength: number; sha256: string }>;
};

export const readNativeSaveTransferV2Record = async (input: {
  sessionId: string;
  descriptor: SaveTransferV2RecordDescriptor;
  native: NativeSaveTransferV2ImportRecordPort;
  consume: (chunks: AsyncIterable<Uint8Array>) => Promise<void>;
  signal?: AbortSignal;
  onChunk?: (byteLength: number) => void;
}): Promise<void> => {
  throwIfSaveTransferCancelled(input.signal);
  const started = await input.native.beginImportRecord({ sessionId: input.sessionId });
  throwIfSaveTransferCancelled(input.signal);
  if (!Number.isSafeInteger(started.byteLength) || started.byteLength !== input.descriptor.byteLength) {
    throw new Error('Transfer record does not match the signed manifest.');
  }
  let header: SaveTransferV2RecordDescriptor;
  try {
    header = JSON.parse(started.headerJson) as SaveTransferV2RecordDescriptor;
  } catch {
    throw new Error('Transfer record header is invalid.');
  }
  assertSaveTransferV2RecordMatch(header, input.descriptor);

  let received = 0;
  const chunks = (async function* () {
    while (true) {
      throwIfSaveTransferCancelled(input.signal);
      const result = await input.native.readImportRecordChunk({
        sessionId: input.sessionId,
        maxBytes: SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
      });
      throwIfSaveTransferCancelled(input.signal);
      if (result.done) {
        if (result.byteLength !== 0 || result.dataBase64 !== '') throw new Error('Native transfer returned an invalid terminal chunk.');
        break;
      }
      const bytes = bridgeBase64ToBytes(result.dataBase64);
      if (bytes.byteLength !== result.byteLength || bytes.byteLength <= 0) {
        throw new Error('Native transfer returned an invalid record chunk.');
      }
      received += bytes.byteLength;
      if (received > input.descriptor.byteLength) throw new Error('Transfer exceeded its declared byte limit.');
      input.onChunk?.(bytes.byteLength);
      yield bytes;
    }
  })();

  await input.consume(chunks);
  throwIfSaveTransferCancelled(input.signal);
  if (received !== input.descriptor.byteLength) throw new Error('Transfer ended before its declared byte limit.');
  const verified = await input.native.finishImportRecord({ sessionId: input.sessionId });
  throwIfSaveTransferCancelled(input.signal);
  if (verified.byteLength !== input.descriptor.byteLength || verified.sha256 !== input.descriptor.sha256) {
    throw new Error('Transfer record does not match the signed manifest.');
  }
};

export const remapTransferMediaReferences = <T>(
  value: T,
  mediaIds: ReadonlyMap<string, string>,
): T => {
  const seen = new WeakMap<object, unknown>();
  const visit = (source: unknown): unknown => {
    if (typeof source === 'string') return mediaIds.get(source) ?? source;
    if (source === null || typeof source !== 'object') return source;
    const existing = seen.get(source as object);
    if (existing) return existing;
    if (Array.isArray(source)) {
      const target: unknown[] = [];
      seen.set(source, target);
      source.forEach(item => target.push(visit(item)));
      return target;
    }
    const target: Record<string, unknown> = {};
    seen.set(source as object, target);
    for (const [key, item] of Object.entries(source as Record<string, unknown>)) target[key] = visit(item);
    return target;
  };
  return visit(value) as T;
};
