import {
  verifyArchiveChunk,
  verifyArchiveRoot,
  type CareerArchiveChunk,
  type CareerArchiveChunkRef,
  type CareerArchiveDomain,
  type CareerArchiveRecord,
  type CareerArchiveRoot,
} from './careerArchive';

export type CareerArchiveKeyValueStore = {
  read(key: string): Promise<unknown | null>;
  write(key: string, value: unknown): Promise<void>;
};

const SLOT_PATTERN = /^actorEmpireSave_[1-3]$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

export const archiveChunkStorageKey = (
  slotKey: string,
  chunk: Pick<CareerArchiveChunkRef, 'digest'>,
): string => {
  if (!SLOT_PATTERN.test(slotKey) || !DIGEST_PATTERN.test(chunk.digest)) {
    throw new Error('Archive storage key is invalid.');
  }
  return `${slotKey}__archive_chunk__${chunk.digest}`;
};

/** Stage immutable content-addressed chunks, verifying each read-back before returning. */
export const stageCareerArchiveChunks = async (
  store: CareerArchiveKeyValueStore,
  slotKey: string,
  chunks: CareerArchiveChunk[],
): Promise<void> => {
  if (!Array.isArray(chunks)) throw new Error('Archive chunks are invalid.');
  for (const chunk of chunks) {
    if (!(await verifyArchiveChunk(chunk))) throw new Error('Archive chunk is corrupt.');
    const key = archiveChunkStorageKey(slotKey, chunk);
    const existing = await store.read(key);
    if (existing !== null) {
      if (!(await verifyArchiveChunk(existing as CareerArchiveChunk))
        || (existing as CareerArchiveChunk).id !== chunk.id) {
        throw new Error('Archive chunk collision or corrupt existing data.');
      }
      continue;
    }
    await store.write(key, chunk);
    const saved = await store.read(key);
    if (!saved || !(await verifyArchiveChunk(saved as CareerArchiveChunk))
      || (saved as CareerArchiveChunk).id !== chunk.id) {
      throw new Error('Archive chunk read-back verification failed.');
    }
  }
};

/** Bounded verification: only one archive chunk is read and hashed at a time. */
export const verifyCareerArchiveRootChunks = async (
  store: Pick<CareerArchiveKeyValueStore, 'read'>,
  root: CareerArchiveRoot,
): Promise<boolean> => {
  if (!(await verifyArchiveRoot(root))) return false;
  try {
    for (const reference of root.chunks) {
      const raw = await store.read(archiveChunkStorageKey(root.slotKey, reference));
      if (!raw) return false;
      const chunk = raw as CareerArchiveChunk;
      if (!(await verifyArchiveChunk(chunk)) || chunk.id !== reference.id
        || chunk.domain !== reference.domain || chunk.digest !== reference.digest
        || chunk.records.length !== reference.recordCount) return false;
    }
    return true;
  } catch { return false; }
};

export const readVerifiedCareerArchiveChunk = async (
  store: Pick<CareerArchiveKeyValueStore, 'read'>,
  root: CareerArchiveRoot,
  reference: CareerArchiveChunkRef,
): Promise<CareerArchiveChunk> => {
  if (!(await verifyArchiveRoot(root)) || !root.chunks.some(item => item.id === reference.id
    && item.digest === reference.digest && item.domain === reference.domain
    && item.recordCount === reference.recordCount && item.sequence === reference.sequence)) {
    throw new Error('Archive root or chunk reference is corrupt.');
  }
  const raw = await store.read(archiveChunkStorageKey(root.slotKey, reference));
  const chunk = raw as CareerArchiveChunk | null;
  if (!chunk || !(await verifyArchiveChunk(chunk)) || chunk.id !== reference.id
    || chunk.domain !== reference.domain || chunk.digest !== reference.digest
    || chunk.records.length !== reference.recordCount) {
    throw new Error('Archive chunk is missing or corrupt.');
  }
  return chunk;
};

export type CareerArchivePageCursor = {
  rootDigest: string;
  chunkIndex: number;
  recordOffset: number;
};

export type CareerArchivePage = {
  records: CareerArchiveRecord[];
  next: CareerArchivePageCursor | null;
};

/** Read one small page in domain sequence order, never loading the full career history. */
export const readCareerArchivePage = async (
  store: Pick<CareerArchiveKeyValueStore, 'read'>,
  root: CareerArchiveRoot,
  domain: CareerArchiveDomain,
  pageSize: number,
  cursor: CareerArchivePageCursor | null = null,
): Promise<CareerArchivePage> => {
  if (!(await verifyArchiveRoot(root))) throw new Error('Career archive root is corrupt.');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 64) {
    throw new Error('Career archive page size must be between 1 and 64.');
  }
  const references = root.chunks.filter(ref => ref.domain === domain);
  const startIndex = cursor?.chunkIndex ?? 0;
  const startOffset = cursor?.recordOffset ?? 0;
  if (cursor && (cursor.rootDigest !== root.digest
    || !Number.isSafeInteger(startIndex) || startIndex < 0 || startIndex >= references.length
    || !Number.isSafeInteger(startOffset) || startOffset < 0)) {
    throw new Error('Career archive cursor is stale or invalid.');
  }
  const records: CareerArchiveRecord[] = [];
  for (let index = startIndex; index < references.length; index += 1) {
    const reference = references[index];
    const raw = await store.read(archiveChunkStorageKey(root.slotKey, reference));
    const chunk = raw as CareerArchiveChunk | null;
    if (!chunk || !(await verifyArchiveChunk(chunk)) || chunk.id !== reference.id
      || chunk.records.length !== reference.recordCount) {
      throw new Error('Career archive chunk is missing or corrupt.');
    }
    const offset = index === startIndex ? startOffset : 0;
    if (offset >= chunk.records.length) throw new Error('Career archive cursor is invalid.');
    const take = Math.min(pageSize - records.length, chunk.records.length - offset);
    records.push(...chunk.records.slice(offset, offset + take));
    if (records.length === pageSize) {
      const nextOffset = offset + take;
      const next = nextOffset < chunk.records.length
        ? { rootDigest: root.digest, chunkIndex: index, recordOffset: nextOffset }
        : index + 1 < references.length
          ? { rootDigest: root.digest, chunkIndex: index + 1, recordOffset: 0 }
          : null;
      return { records, next };
    }
  }
  return { records, next: null };
};
