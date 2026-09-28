import type { Player } from '../types';
import { verifyArchiveRoot, type CareerArchiveRoot } from './careerArchive';
import { verifyCareerArchiveRootChunks } from './careerArchiveStore';
import {
    SAVE_INTEGRITY_FORMAT_VERSION,
    type SaveIntegrityManifest,
    verifySaveIntegrity,
} from './saveIntegrity';

export interface SaveGenerationKeys {
    current: string;
    candidate: string;
    previous: string;
    integrity: string;
    quarantine: string;
    archiveRoot: string;
}

export interface StoredArchiveRoot {
    kind: 'ACTOR_EMPIRE_ARCHIVE_ROOT';
    root: CareerArchiveRoot;
    manifestDigest: string;
}

export interface StoredSaveGeneration {
    kind: 'ACTOR_EMPIRE_SAVE_GENERATION';
    formatVersion: typeof SAVE_INTEGRITY_FORMAT_VERSION;
    player: Player;
    manifest: SaveIntegrityManifest;
    needsRecoveryCheckpoint: boolean;
    archiveRoot?: CareerArchiveRoot;
}

export interface PromoteSaveGenerationInput {
    keys: SaveGenerationKeys;
    retainPrevious: boolean;
}

export interface RecoverSaveGenerationInput {
    keys: SaveGenerationKeys;
}

export interface PromoteSaveGenerationBatchInput {
    keys: SaveGenerationKeys[];
}

export interface SaveGenerationStore {
    read(key: string): Promise<unknown | null>;
    write(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
    promoteGeneration(input: PromoteSaveGenerationInput): Promise<void>;
    recoverGeneration(input: RecoverSaveGenerationInput): Promise<void>;
    promoteGenerationBatch(input: PromoteSaveGenerationBatchInput): Promise<void>;
}

export interface VerifiedSaveBatchEntry {
    currentKey: string;
    player: Player;
    manifest: SaveIntegrityManifest;
    archiveRoot?: CareerArchiveRoot;
}

export interface StagedSaveBatch {
    keys: SaveGenerationKeys[];
}

export type VerifiedGameLoad =
    | { status: 'MISSING'; player: null; previous: null; violations: string[] }
    | { status: 'CURRENT'; player: Player; previous: null; violations: string[]; needsRecoveryCheckpoint: boolean; archiveRoot?: CareerArchiveRoot }
    | { status: 'LEGACY_UNVERIFIED'; player: Player; previous: null; violations: string[] }
    | { status: 'RECOVERY_AVAILABLE'; player: null; previous: Player; violations: string[]; previousArchiveRoot?: CareerArchiveRoot }
    | { status: 'UNRECOVERABLE'; player: null; previous: null; violations: string[] };

export const getSaveGenerationKeys = (currentKey: string): SaveGenerationKeys => ({
    current: currentKey,
    candidate: `${currentKey}__candidate`,
    previous: `${currentKey}__previous`,
    integrity: `${currentKey}__integrity`,
    quarantine: `${currentKey}__quarantine`,
    archiveRoot: `${currentKey}__archiveRoot`,
});

const saveQueues = new WeakMap<SaveGenerationStore, Map<string, Promise<void>>>();

const runExclusiveSave = async <T>(
    store: SaveGenerationStore,
    currentKey: string,
    operation: () => Promise<T>,
): Promise<T> => {
    let queues = saveQueues.get(store);
    if (!queues) {
        queues = new Map();
        saveQueues.set(store, queues);
    }
    const previous = queues.get(currentKey) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    const marker = current.then(() => undefined, () => undefined);
    queues.set(currentKey, marker);
    try {
        return await current;
    } finally {
        if (queues.get(currentKey) === marker) queues.delete(currentKey);
    }
};

const isPlayer = (value: unknown): value is Player => Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).id === 'string'
    && typeof (value as Record<string, unknown>).name === 'string',
);

const isManifest = (value: unknown): value is SaveIntegrityManifest => Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Number((value as Record<string, unknown>).formatVersion) === SAVE_INTEGRITY_FORMAT_VERSION
    && typeof (value as Record<string, unknown>).digest === 'string',
);

const isStoredGeneration = (value: unknown): value is StoredSaveGeneration => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return record.kind === 'ACTOR_EMPIRE_SAVE_GENERATION'
        && Number(record.formatVersion) === SAVE_INTEGRITY_FORMAT_VERSION
        && isPlayer(record.player)
        && isManifest(record.manifest);
};

const verifyGeneration = (value: unknown) => {
    if (!isStoredGeneration(value)) {
        return { ok: false as const, violations: ['stored generation structure is invalid'] };
    }
    const verified = verifySaveIntegrity(value.player, value.manifest);
    return 'violations' in verified
        ? { ok: false as const, violations: verified.violations }
        : { ok: true as const, generation: value };
};

const verifyGenerationWithArchive = async (
    store: SaveGenerationStore,
    value: unknown,
    currentKey: string,
) => {
    const verified = verifyGeneration(value);
    if (!verified.ok) return verified;
    const root = verified.generation.archiveRoot;
    if (verified.generation.player.flags?.careerArchiveRootDigest !== root?.digest
        && (verified.generation.player.flags?.careerArchiveRootDigest !== undefined || root !== undefined)) {
        return { ok: false as const, violations: ['archive root marker does not match previous generation'] };
    }
    if (root && (root.slotKey !== currentKey || root.playerId !== verified.generation.player.id
        || !(await verifyCareerArchiveRootChunks(store, root)))) {
        return { ok: false as const, violations: ['archive root or referenced chunk is missing or corrupt'] };
    }
    return verified;
};

const isStoredArchiveRoot = (value: unknown): value is StoredArchiveRoot => Boolean(
    value && typeof value === 'object' && !Array.isArray(value)
    && (value as StoredArchiveRoot).kind === 'ACTOR_EMPIRE_ARCHIVE_ROOT'
    && typeof (value as StoredArchiveRoot).manifestDigest === 'string'
    && (value as StoredArchiveRoot).root,
);

/** Reject live runtime callbacks without making another full-sized save copy. */
const assertCloneableSaveValues = (value: unknown): void => {
    const seen = new WeakSet<object>();
    const visit = (item: unknown, path: string): void => {
        if (typeof item === 'function' || typeof item === 'symbol') {
            throw new Error(`Save contains an uncloneable ${typeof item} at ${path}. Prepare the persisted player before writing.`);
        }
        if (item === null || typeof item !== 'object' || seen.has(item)) return;
        seen.add(item);
        if (item instanceof Map) {
            item.forEach((entryValue, entryKey) => {
                visit(entryKey, `${path}.<map key>`);
                visit(entryValue, `${path}.<map value>`);
            });
            return;
        }
        if (item instanceof Set) {
            item.forEach(entry => visit(entry, `${path}.<set item>`));
            return;
        }
        Object.keys(item).forEach(key => visit((item as Record<string, unknown>)[key], `${path}.${key}`));
    };
    visit(value, 'player');
};

const verifyCurrentArchivePair = async (
    store: SaveGenerationStore,
    currentKey: string,
    player: Player,
    manifest: SaveIntegrityManifest,
    rawCompanion: unknown,
): Promise<{ ok: true; root?: CareerArchiveRoot } | { ok: false; violations: string[] }> => {
    if (rawCompanion === null) return { ok: true };
    if (!isStoredArchiveRoot(rawCompanion)) return { ok: false, violations: ['archive root companion is invalid'] };
    const { root, manifestDigest } = rawCompanion;
    if (manifestDigest !== manifest.digest || player.flags?.careerArchiveRootDigest !== root.digest
        || root.slotKey !== currentKey || root.playerId !== player.id
        || !(await verifyCareerArchiveRootChunks(store, root))) {
        return { ok: false, violations: ['archive root or referenced chunk is missing or corrupt'] };
    }
    return { ok: true, root };
};

export const saveVerifiedGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
    player: Player,
    manifest: SaveIntegrityManifest,
    options: { retainPrevious?: boolean; needsRecoveryCheckpoint?: boolean; archiveRoot?: CareerArchiveRoot } = {},
): Promise<void> => runExclusiveSave(store, currentKey, async () => {
    assertCloneableSaveValues(player);
    const initialVerification = verifySaveIntegrity(player, manifest);
    if ('violations' in initialVerification) {
        throw new Error(`Candidate integrity failed before write: ${initialVerification.violations.join('; ')}`);
    }
    const keys = getSaveGenerationKeys(currentKey);
    const playerRootDigest = player.flags?.careerArchiveRootDigest;
    const existingRoot = await store.read(keys.archiveRoot);
    let archiveRoot = options.archiveRoot;
    if (existingRoot !== null && archiveRoot === undefined) {
        const currentManifest = await store.read(keys.integrity);
        if (!isStoredArchiveRoot(existingRoot) || !isManifest(currentManifest)
            || existingRoot.manifestDigest !== currentManifest.digest
            || playerRootDigest !== existingRoot.root.digest) {
            throw new Error('An intact archive root is required to update an archive-backed save.');
        }
        archiveRoot = existingRoot.root;
    }
    if (playerRootDigest !== undefined && playerRootDigest !== archiveRoot?.digest) {
        throw new Error('Player archive root marker does not match the requested archive root.');
    }
    if (archiveRoot && playerRootDigest !== archiveRoot.digest) {
        throw new Error('Archive-backed player is missing its archive root marker.');
    }
    if (archiveRoot && (archiveRoot.slotKey !== currentKey
        || archiveRoot.playerId !== player.id
        || !(await verifyArchiveRoot(archiveRoot))
        || !(await verifyCareerArchiveRootChunks(store, archiveRoot)))) {
        throw new Error('Archive root or staged chunks are missing or corrupt.');
    }
    const candidate: StoredSaveGeneration = {
        kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
        formatVersion: SAVE_INTEGRITY_FORMAT_VERSION,
        player,
        manifest,
        needsRecoveryCheckpoint: options.needsRecoveryCheckpoint === true,
        ...(archiveRoot ? { archiveRoot } : {}),
    };
    await store.write(keys.candidate, candidate);
    {
        // Do not keep the structured-cloned read-back reachable while IndexedDB
        // promotion reads the current and candidate generations again.
        const readBack = await verifyGenerationWithArchive(store, await store.read(keys.candidate), currentKey);
        if (!readBack.ok) {
            throw new Error(`Candidate integrity failed after read-back: ${readBack.violations.join('; ')}`);
        }
        if (readBack.generation.manifest.digest !== manifest.digest) {
            throw new Error('Candidate read-back does not match the requested save generation.');
        }
    }
    await store.promoteGeneration({
        keys,
        retainPrevious: options.retainPrevious !== false,
    });
});

export const loadVerifiedGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
): Promise<VerifiedGameLoad> => {
    const keys = getSaveGenerationKeys(currentKey);
    const current = await store.read(keys.current);
    const manifest = await store.read(keys.integrity);
    const rawArchiveRoot = await store.read(keys.archiveRoot);
    if (current === null || current === undefined) {
        const previous = await verifyGenerationWithArchive(store, await store.read(keys.previous), currentKey);
        return previous.ok
            ? { status: 'RECOVERY_AVAILABLE', player: null, previous: previous.generation.player, previousArchiveRoot: previous.generation.archiveRoot, violations: ['current save is missing'] }
            : rawArchiveRoot !== null
                ? { status: 'UNRECOVERABLE', player: null, previous: null, violations: ['hot save is missing but archive root remains'] }
                : { status: 'MISSING', player: null, previous: null, violations: [] };
    }
    if (!isPlayer(current)) {
        const previous = await verifyGenerationWithArchive(store, await store.read(keys.previous), currentKey);
        return previous.ok
            ? { status: 'RECOVERY_AVAILABLE', player: null, previous: previous.generation.player, previousArchiveRoot: previous.generation.archiveRoot, violations: ['current save structure is invalid'] }
            : { status: 'UNRECOVERABLE', player: null, previous: null, violations: ['current save structure is invalid'] };
    }
    if (!isManifest(manifest)) {
        if (rawArchiveRoot !== null || typeof current.flags?.careerArchiveRootDigest === 'string') {
            const previous = await verifyGenerationWithArchive(store, await store.read(keys.previous), currentKey);
            return previous.ok
                ? { status: 'RECOVERY_AVAILABLE', player: null, previous: previous.generation.player, previousArchiveRoot: previous.generation.archiveRoot, violations: ['archive-backed save has no valid manifest'] }
                : { status: 'UNRECOVERABLE', player: null, previous: null, violations: ['archive-backed save has no valid manifest'] };
        }
        return { status: 'LEGACY_UNVERIFIED', player: current, previous: null, violations: [] };
    }
    const currentVerification = verifySaveIntegrity(current, manifest);
    if (!('violations' in currentVerification)) {
        if (typeof current.flags?.careerArchiveRootDigest === 'string'
            && (!isStoredArchiveRoot(rawArchiveRoot)
                || rawArchiveRoot.root.digest !== current.flags.careerArchiveRootDigest)) {
            const previous = await verifyGenerationWithArchive(store, await store.read(keys.previous), currentKey);
            const violations = ['archive root companion is missing or does not match the hot save'];
            return previous.ok
                ? { status: 'RECOVERY_AVAILABLE', player: null, previous: previous.generation.player, previousArchiveRoot: previous.generation.archiveRoot, violations }
                : { status: 'UNRECOVERABLE', player: null, previous: null, violations };
        }
        const archiveVerification = await verifyCurrentArchivePair(store, currentKey, current, manifest, rawArchiveRoot);
        if (!('violations' in archiveVerification)) return {
            status: 'CURRENT',
            player: current,
            previous: null,
            violations: [],
            needsRecoveryCheckpoint: manifest.needsRecoveryCheckpoint === true,
            archiveRoot: archiveVerification.root,
        };
        const previous = await verifyGenerationWithArchive(store, await store.read(keys.previous), currentKey);
        return previous.ok
            ? { status: 'RECOVERY_AVAILABLE', player: null, previous: previous.generation.player, previousArchiveRoot: previous.generation.archiveRoot, violations: archiveVerification.violations }
            : { status: 'UNRECOVERABLE', player: null, previous: null, violations: archiveVerification.violations };
    }
    const previous = await verifyGenerationWithArchive(store, await store.read(keys.previous), currentKey);
    if (previous.ok) {
        return {
            status: 'RECOVERY_AVAILABLE',
            player: null,
            previous: previous.generation.player,
            previousArchiveRoot: previous.generation.archiveRoot,
            violations: currentVerification.violations,
        };
    }
    return {
        status: 'UNRECOVERABLE',
        player: null,
        previous: null,
        violations: currentVerification.violations,
    };
};

export const recoverPreviousGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
): Promise<Player> => runExclusiveSave(store, currentKey, async () => {
    const keys = getSaveGenerationKeys(currentKey);
    const previous = await verifyGenerationWithArchive(store, await store.read(keys.previous), currentKey);
    if (!previous.ok) throw new Error(`Previous generation is not recoverable: ${previous.violations.join('; ')}`);
    await store.recoverGeneration({ keys });
    const recovered = await loadVerifiedGameData(store, currentKey);
    if (recovered.status !== 'CURRENT') throw new Error('Recovered generation failed post-promotion verification.');
    return recovered.player;
});

export const stageVerifiedGameDataBatch = async (
    store: SaveGenerationStore,
    entries: VerifiedSaveBatchEntry[],
): Promise<StagedSaveBatch> => {
    if (entries.length === 0) throw new Error('Cannot stage an empty save batch.');
    const uniqueKeys = new Set(entries.map(entry => entry.currentKey));
    if (uniqueKeys.size !== entries.length) throw new Error('Save batch contains duplicate public keys.');
    const stagedKeys: SaveGenerationKeys[] = [];
    try {
        for (const entry of entries) {
            assertCloneableSaveValues(entry.player);
            const verification = verifySaveIntegrity(entry.player, entry.manifest);
            if ('violations' in verification) throw new Error(`Import candidate integrity failed: ${verification.violations.join('; ')}`);
            const keys = getSaveGenerationKeys(entry.currentKey);
            const generation: StoredSaveGeneration = {
                kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
                formatVersion: SAVE_INTEGRITY_FORMAT_VERSION,
                player: entry.player,
                manifest: entry.manifest,
                needsRecoveryCheckpoint: false,
                ...(entry.archiveRoot ? { archiveRoot: entry.archiveRoot } : {}),
            };
            if (entry.archiveRoot && (entry.archiveRoot.slotKey !== entry.currentKey
                || entry.archiveRoot.playerId !== entry.player.id
                || !(await verifyCareerArchiveRootChunks(store, entry.archiveRoot)))) {
                throw new Error('Import archive root or chunks are missing or corrupt.');
            }
            await store.write(keys.candidate, generation);
            const readBack = await verifyGenerationWithArchive(store, await store.read(keys.candidate), entry.currentKey);
            if (!readBack.ok) throw new Error(`Import candidate read-back failed: ${readBack.violations.join('; ')}`);
            stagedKeys.push(keys);
        }
        return { keys: stagedKeys };
    } catch (error) {
        const candidateKeys = new Set([
            ...stagedKeys.map(keys => keys.candidate),
            ...entries.map(entry => getSaveGenerationKeys(entry.currentKey).candidate),
        ]);
        await Promise.allSettled(Array.from(candidateKeys).map(key => store.remove(key)));
        throw error;
    }
};

export const promoteStagedGameDataBatch = async (
    store: SaveGenerationStore,
    batch: StagedSaveBatch,
): Promise<void> => {
    if (batch.keys.length === 0) throw new Error('Cannot promote an empty save batch.');
  await store.promoteGenerationBatch({ keys: batch.keys });
};

export const discardStagedGameDataBatch = async (
    store: SaveGenerationStore,
    batch: StagedSaveBatch,
): Promise<void> => {
    await Promise.allSettled(batch.keys.map(keys => store.remove(keys.candidate)));
};

export const deleteSaveGenerationFamily = async (
    store: SaveGenerationStore,
    currentKey: string,
): Promise<void> => {
    const keys = getSaveGenerationKeys(currentKey);
    await Promise.all(Object.values(keys).map(key => store.remove(key)));
};
