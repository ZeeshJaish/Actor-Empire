export const CAREER_ARCHIVE_SCHEMA_VERSION = 1;
export const CAREER_ARCHIVE_CHUNK_MAX_RECORDS = 64;
export const CAREER_ARCHIVE_CHUNK_MAX_BYTES = 256 * 1024;
const CAREER_ARCHIVE_ROOT_MAX_BYTES = 512 * 1024;

export type CareerArchiveDomain = 'X_POST' | 'INSTAGRAM_POST' | 'YOUTUBE_VIDEO' | 'PAST_PROJECT' | 'WORLD_PROJECT' | 'INDUSTRY_PRODUCTION';

export type CareerArchiveRecord = { id: string; value: unknown };

export type CareerArchiveChunk = {
  schemaVersion: typeof CAREER_ARCHIVE_SCHEMA_VERSION;
  id: string;
  domain: CareerArchiveDomain;
  digest: string;
  byteLength: number;
  records: CareerArchiveRecord[];
};

export type CareerArchiveChunkRef = {
  id: string;
  domain: CareerArchiveDomain;
  digest: string;
  recordCount: number;
  sequence: number;
};

export type CareerArchiveRoot = {
  schemaVersion: typeof CAREER_ARCHIVE_SCHEMA_VERSION;
  slotKey: string;
  playerId: string;
  chunks: CareerArchiveChunkRef[];
  digest: string;
};

const encoder = new TextEncoder();
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const SLOT_PATTERN = /^actorEmpireSave_[1-3]$/;

/** Strict canonical JSON: reject values that a later signed JSON transfer would lose. */
const canonicalJson = (value: unknown, ancestors = new Set<object>()): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Archive contains a non-finite number.');
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error('Archive contains a cyclic value.');
    ancestors.add(value);
    try { return `[${value.map(item => canonicalJson(item, ancestors)).join(',')}]`; }
    finally { ancestors.delete(value); }
  }
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Archive records must contain plain JSON values.');
    }
    if (ancestors.has(value)) throw new Error('Archive contains a cyclic value.');
    ancestors.add(value);
    try {
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalJson(record[key], ancestors)}`).join(',')}}`;
    } finally { ancestors.delete(value); }
  }
  throw new Error('Archive contains a value that cannot be serialized.');
};

const sha256 = async (text: string): Promise<string> => {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

const requireDomain = (domain: string): CareerArchiveDomain => {
  if (!['X_POST', 'INSTAGRAM_POST', 'YOUTUBE_VIDEO', 'PAST_PROJECT', 'WORLD_PROJECT', 'INDUSTRY_PRODUCTION'].includes(domain)) {
    throw new Error('Archive domain is invalid.');
  }
  return domain as CareerArchiveDomain;
};

const requireUniqueRecords = (records: CareerArchiveRecord[]): void => {
  if (!Array.isArray(records) || records.length === 0 || records.length > CAREER_ARCHIVE_CHUNK_MAX_RECORDS) {
    throw new Error('Archive chunk record limit exceeded.');
  }
  const ids = new Set<string>();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id || record.id.length > 180) {
      throw new Error('Archive record id is invalid.');
    }
    if (ids.has(record.id)) throw new Error('Archive chunk has a duplicate record id.');
    ids.add(record.id);
  }
};

export const createArchiveChunk = async (
  domain: CareerArchiveDomain,
  records: CareerArchiveRecord[],
): Promise<CareerArchiveChunk> => {
  requireDomain(domain);
  requireUniqueRecords(records);
  const body = { schemaVersion: CAREER_ARCHIVE_SCHEMA_VERSION as typeof CAREER_ARCHIVE_SCHEMA_VERSION, domain, records };
  const serialized = canonicalJson(body);
  const byteLength = encoder.encode(serialized).byteLength;
  if (byteLength > CAREER_ARCHIVE_CHUNK_MAX_BYTES) throw new Error('Archive chunk byte limit exceeded.');
  const digest = await sha256(serialized);
  return { ...body, id: `${domain}:${digest}`, digest, byteLength };
};

export const verifyArchiveChunk = async (chunk: CareerArchiveChunk): Promise<boolean> => {
  try {
    if (chunk.schemaVersion !== CAREER_ARCHIVE_SCHEMA_VERSION || !DIGEST_PATTERN.test(chunk.digest)) return false;
    const rebuilt = await createArchiveChunk(chunk.domain, chunk.records);
    return rebuilt.id === chunk.id && rebuilt.digest === chunk.digest && rebuilt.byteLength === chunk.byteLength;
  } catch { return false; }
};

export const createArchiveRoot = async (
  slotKey: string,
  playerId: string,
  chunks: CareerArchiveChunkRef[],
): Promise<CareerArchiveRoot> => {
  if (!SLOT_PATTERN.test(slotKey) || !playerId || playerId.length > 180) throw new Error('Archive owner is invalid.');
  if (!Array.isArray(chunks)) throw new Error('Archive chunk references are invalid.');
  const ids = new Set<string>();
  const positions = new Set<string>();
  for (const chunk of chunks) {
    requireDomain(chunk.domain);
    if (chunk.id !== `${chunk.domain}:${chunk.digest}` || !DIGEST_PATTERN.test(chunk.digest)
      || !Number.isSafeInteger(chunk.recordCount) || chunk.recordCount < 1
      || chunk.recordCount > CAREER_ARCHIVE_CHUNK_MAX_RECORDS
      || !Number.isSafeInteger(chunk.sequence) || chunk.sequence < 0) {
      throw new Error('Archive chunk reference is invalid.');
    }
    if (ids.has(chunk.id)) throw new Error('Archive root has a duplicate chunk.');
    ids.add(chunk.id);
    const position = `${chunk.domain}:${chunk.sequence}`;
    if (positions.has(position)) throw new Error('Archive root has a duplicate domain sequence.');
    positions.add(position);
  }
  const sorted = [...chunks].sort((left, right) => left.domain.localeCompare(right.domain)
    || left.sequence - right.sequence || left.id.localeCompare(right.id));
  const body = { schemaVersion: CAREER_ARCHIVE_SCHEMA_VERSION as typeof CAREER_ARCHIVE_SCHEMA_VERSION, slotKey, playerId, chunks: sorted };
  const serialized = canonicalJson(body);
  if (encoder.encode(serialized).byteLength > CAREER_ARCHIVE_ROOT_MAX_BYTES) throw new Error('Archive root byte limit exceeded.');
  return { ...body, digest: await sha256(serialized) };
};

export const verifyArchiveRoot = async (root: CareerArchiveRoot): Promise<boolean> => {
  try {
    if (root.schemaVersion !== CAREER_ARCHIVE_SCHEMA_VERSION || !DIGEST_PATTERN.test(root.digest)) return false;
    const rebuilt = await createArchiveRoot(root.slotKey, root.playerId, root.chunks);
    return rebuilt.digest === root.digest && canonicalJson(root.chunks) === canonicalJson(rebuilt.chunks);
  } catch { return false; }
};
