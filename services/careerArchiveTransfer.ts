import type { Player } from '../types';
import { verifyArchiveChunk, verifyArchiveRoot, type CareerArchiveChunk, type CareerArchiveChunkRef, type CareerArchiveRoot } from './careerArchive';
import { archiveChunkStorageKey, stageCareerArchiveChunks, verifyCareerArchiveRootChunks, type CareerArchiveKeyValueStore } from './careerArchiveStore';
import type { VerifiedGameLoad } from './saveGenerations';
import { streamJsonAsBoundedChunks } from './saveTransferV2Stream';
import type { SaveTransferV2RecordDescriptor } from './saveTransferV2';

export type CareerArchiveExportItem =
  | { kind: 'ARCHIVE_ROOT'; logicalKey: string; rootDigest: string; root: CareerArchiveRoot }
  | { kind: 'ARCHIVE_CHUNK'; logicalKey: string; rootDigest: string; slotKey: string; reference: CareerArchiveChunkRef };

/** Create only small descriptors; chunk bodies are loaded one at a time by the writer. */
export const buildCareerArchiveExportPlan = async (
  entries: Array<{ key: string; value: unknown }>,
  loadVerified: (slotKey: string) => Promise<VerifiedGameLoad>,
  onVerifiedPlayer?: (slotKey: string, player: Player) => void,
): Promise<CareerArchiveExportItem[]> => {
  const plan: CareerArchiveExportItem[] = [];
  const seenSlots = new Set<string>();
  for (const entry of entries) {
    const player = entry.value as Player | null;
    if (!/^actorEmpireSave_[1-3]$/.test(entry.key)) {
      if (typeof player?.flags?.careerArchiveRootDigest === 'string') {
        throw new Error('Archive export has an invalid save slot.');
      }
      continue;
    }
    if (seenSlots.has(entry.key)) {
      throw new Error('Archive export has an invalid or duplicate save slot.');
    }
    seenSlots.add(entry.key);
    const loaded = await loadVerified(entry.key);
    if (loaded.status === 'LEGACY_UNVERIFIED') {
      if (typeof player?.flags?.careerArchiveRootDigest === 'string'
        || typeof loaded.player.flags?.careerArchiveRootDigest === 'string') {
        throw new Error('Archive export requires a verified current save.');
      }
      continue;
    }
    if (loaded.status !== 'CURRENT') throw new Error('Archive export requires a verified current save.');
    const root = loaded.archiveRoot;
    const rootDigest = loaded.player.flags?.careerArchiveRootDigest;
    if (!root && typeof rootDigest !== 'string') {
      if (typeof player?.flags?.careerArchiveRootDigest === 'string') {
        throw new Error('Archive export root does not match the current save.');
      }
      onVerifiedPlayer?.(entry.key, loaded.player);
      continue;
    }
    if (!root || root.digest !== rootDigest || root.playerId !== loaded.player.id
      || root.slotKey !== entry.key
      || !(await verifyArchiveRoot(root))) {
      throw new Error('Archive export root does not match the current save.');
    }
    onVerifiedPlayer?.(entry.key, loaded.player);
    plan.push({ kind: 'ARCHIVE_ROOT', logicalKey: `${entry.key}__archiveRoot`, rootDigest, root });
    for (const reference of root.chunks) {
      plan.push({
        kind: 'ARCHIVE_CHUNK',
        logicalKey: archiveChunkStorageKey(entry.key, reference),
        rootDigest,
        slotKey: entry.key,
        reference,
      });
    }
  }
  return plan;
};

export const createArchiveTransferRecordSources = (
  plan: CareerArchiveExportItem[],
  readChunk: (root: CareerArchiveRoot, reference: CareerArchiveChunkRef) => Promise<CareerArchiveChunk>,
) => {
  const roots = new Map(plan.filter(item => item.kind === 'ARCHIVE_ROOT')
    .map(item => [item.root.slotKey, item.root]));
  return plan.map(item => {
    const slotNumber = item.logicalKey.match(/^actorEmpireSave_([1-3])/)?.[1];
    if (!slotNumber) throw new Error('Archive transfer has an invalid slot.');
    if (item.kind === 'ARCHIVE_ROOT') {
      return {
        id: `archive-root-${slotNumber}`,
        kind: item.kind,
        logicalKey: item.logicalKey,
        archiveRootDigest: item.rootDigest,
        estimatedBytes: new TextEncoder().encode(JSON.stringify(item.root)).byteLength,
        write: (sink: (chunk: Uint8Array) => void | Promise<void>) => streamJsonAsBoundedChunks(item.root, sink),
      };
    }
    const root = roots.get(item.slotKey);
    if (!root || root.digest !== item.rootDigest) throw new Error('Archive transfer chunk has no matching root.');
    return {
      id: `archive-chunk-${slotNumber}-${item.reference.sequence}-${item.reference.digest.slice(0, 12)}`,
      kind: item.kind,
      logicalKey: item.logicalKey,
      estimatedBytes: 320 * 1024,
      write: async (sink: (chunk: Uint8Array) => void | Promise<void>) => {
        const chunk = await readChunk(root, item.reference);
        if (!(await verifyArchiveChunk(chunk)) || chunk.id !== item.reference.id
          || chunk.records.length !== item.reference.recordCount) {
          throw new Error('Archive transfer chunk is missing or corrupt.');
        }
        await streamJsonAsBoundedChunks(chunk, sink);
      },
    };
  });
};

/** Check the signed record inventory before staging a root or replacing a save. */
export const verifyArchiveTransferRootCoverage = async (
  root: CareerArchiveRoot,
  descriptors: SaveTransferV2RecordDescriptor[],
): Promise<boolean> => {
  if (!(await verifyArchiveRoot(root))) return false;
  const signedKeys = descriptors
    .filter(record => record.kind === 'ARCHIVE_CHUNK'
      && record.logicalKey?.startsWith(`${root.slotKey}__archive_chunk__`))
    .map(record => record.logicalKey as string);
  if (signedKeys.length !== root.chunks.length || new Set(signedKeys).size !== signedKeys.length) return false;
  const expected = new Set(root.chunks.map(ref => archiveChunkStorageKey(root.slotKey, ref)));
  return signedKeys.every(key => expected.has(key));
};

/** Stages bounded archive records; no hot save is promoted by this session. */
export const createCareerArchiveImportSession = (
  descriptors: SaveTransferV2RecordDescriptor[],
  store: CareerArchiveKeyValueStore,
) => {
  const roots = new Map<string, CareerArchiveRoot>();
  const acceptedChunks = new Set<string>();
  const expectedRoots = descriptors.filter(record => record.kind === 'ARCHIVE_ROOT');
  const expectedChunks = descriptors.filter(record => record.kind === 'ARCHIVE_CHUNK');
  return {
    acceptRoot: async (descriptor: SaveTransferV2RecordDescriptor, json: string) => {
      if (descriptor.kind !== 'ARCHIVE_ROOT' || !expectedRoots.includes(descriptor)) {
        throw new Error('Transfer archive root is not signed.');
      }
      let root: CareerArchiveRoot;
      try { root = JSON.parse(json) as CareerArchiveRoot; }
      catch { throw new Error('Transfer archive root is invalid JSON.'); }
      if (!(await verifyArchiveRoot(root)) || descriptor.logicalKey !== `${root.slotKey}__archiveRoot`
        || descriptor.archiveRootDigest !== root.digest
        || !(await verifyArchiveTransferRootCoverage(root, descriptors))) {
        throw new Error('Transfer archive root is corrupt or incomplete.');
      }
      if (roots.has(root.slotKey)) throw new Error('Transfer archive root is duplicated.');
      roots.set(root.slotKey, root);
    },
    acceptChunk: async (descriptor: SaveTransferV2RecordDescriptor, json: string) => {
      if (descriptor.kind !== 'ARCHIVE_CHUNK' || !expectedChunks.includes(descriptor)) {
        throw new Error('Transfer archive chunk is not signed.');
      }
      let chunk: CareerArchiveChunk;
      try { chunk = JSON.parse(json) as CareerArchiveChunk; }
      catch { throw new Error('Transfer archive chunk is invalid JSON.'); }
      const slotKey = descriptor.logicalKey?.split('__archive_chunk__')[0];
      const root = slotKey ? roots.get(slotKey) : null;
      if (!root || !(await verifyArchiveChunk(chunk))
        || descriptor.logicalKey !== archiveChunkStorageKey(slotKey!, chunk)
        || !root.chunks.some(ref => ref.id === chunk.id && ref.digest === chunk.digest
          && ref.domain === chunk.domain && ref.recordCount === chunk.records.length)) {
        throw new Error('Transfer archive chunk is missing its root or corrupt.');
      }
      if (acceptedChunks.has(descriptor.logicalKey!)) throw new Error('Transfer archive chunk is duplicated.');
      await stageCareerArchiveChunks(store, slotKey!, [chunk]);
      acceptedChunks.add(descriptor.logicalKey!);
    },
    rootForSave: async (descriptor: SaveTransferV2RecordDescriptor): Promise<CareerArchiveRoot | null> => {
      if (descriptor.kind !== 'SAVE' || !descriptor.logicalKey) throw new Error('Transfer save slot is invalid.');
      const root = roots.get(descriptor.logicalKey);
      if (!descriptor.archiveRootDigest && !root) return null;
      if (!root || root.digest !== descriptor.archiveRootDigest
        || root.chunks.some(ref => !acceptedChunks.has(archiveChunkStorageKey(root.slotKey, ref)))
        || !(await verifyCareerArchiveRootChunks(store, root))) {
        throw new Error('Transfer archive is incomplete or corrupt for this save.');
      }
      return root;
    },
    verifyComplete: () => {
      if (roots.size !== expectedRoots.length || acceptedChunks.size !== expectedChunks.length) {
        throw new Error('Transfer archive records are incomplete.');
      }
    },
  };
};
