import type { Player } from '../types';
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
}

export interface StoredSaveGeneration {
    kind: 'ACTOR_EMPIRE_SAVE_GENERATION';
    formatVersion: typeof SAVE_INTEGRITY_FORMAT_VERSION;
    player: Player;
    manifest: SaveIntegrityManifest;
    needsRecoveryCheckpoint: boolean;
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
}

export interface StagedSaveBatch {
    keys: SaveGenerationKeys[];
}

export type VerifiedGameLoad =
    | { status: 'MISSING'; player: null; previous: null; violations: string[] }
    | { status: 'CURRENT'; player: Player; previous: null; violations: string[]; needsRecoveryCheckpoint: boolean }
    | { status: 'LEGACY_UNVERIFIED'; player: Player; previous: null; violations: string[] }
    | { status: 'RECOVERY_AVAILABLE'; player: null; previous: Player; violations: string[] }
    | { status: 'UNRECOVERABLE'; player: null; previous: null; violations: string[] };

export const getSaveGenerationKeys = (currentKey: string): SaveGenerationKeys => ({
    current: currentKey,
    candidate: `${currentKey}__candidate`,
    previous: `${currentKey}__previous`,
    integrity: `${currentKey}__integrity`,
    quarantine: `${currentKey}__quarantine`,
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

export const saveVerifiedGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
    player: Player,
    manifest: SaveIntegrityManifest,
    options: { retainPrevious?: boolean; needsRecoveryCheckpoint?: boolean } = {},
): Promise<void> => runExclusiveSave(store, currentKey, async () => {
    const initialVerification = verifySaveIntegrity(player, manifest);
    if ('violations' in initialVerification) {
        throw new Error(`Candidate integrity failed before write: ${initialVerification.violations.join('; ')}`);
    }
    const keys = getSaveGenerationKeys(currentKey);
    const candidate: StoredSaveGeneration = {
        kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
        formatVersion: SAVE_INTEGRITY_FORMAT_VERSION,
        player,
        manifest,
        needsRecoveryCheckpoint: options.needsRecoveryCheckpoint === true,
    };
    await store.write(keys.candidate, candidate);
    const readBack = verifyGeneration(await store.read(keys.candidate));
    if (!readBack.ok) {
        throw new Error(`Candidate integrity failed after read-back: ${readBack.violations.join('; ')}`);
    }
    if (readBack.generation.manifest.digest !== manifest.digest) {
        throw new Error('Candidate read-back does not match the requested save generation.');
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
    if (current === null || current === undefined) {
        const previous = verifyGeneration(await store.read(keys.previous));
        return previous.ok
            ? { status: 'RECOVERY_AVAILABLE', player: null, previous: previous.generation.player, violations: ['current save is missing'] }
            : { status: 'MISSING', player: null, previous: null, violations: [] };
    }
    if (!isPlayer(current)) {
        const previous = verifyGeneration(await store.read(keys.previous));
        return previous.ok
            ? { status: 'RECOVERY_AVAILABLE', player: null, previous: previous.generation.player, violations: ['current save structure is invalid'] }
            : { status: 'UNRECOVERABLE', player: null, previous: null, violations: ['current save structure is invalid'] };
    }
    if (!isManifest(manifest)) {
        return { status: 'LEGACY_UNVERIFIED', player: current, previous: null, violations: [] };
    }
    const currentVerification = verifySaveIntegrity(current, manifest);
    if (!('violations' in currentVerification)) {
        return {
            status: 'CURRENT',
            player: current,
            previous: null,
            violations: [],
            needsRecoveryCheckpoint: manifest.needsRecoveryCheckpoint === true,
        };
    }
    const previous = verifyGeneration(await store.read(keys.previous));
    if (previous.ok) {
        return {
            status: 'RECOVERY_AVAILABLE',
            player: null,
            previous: previous.generation.player,
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
    const previous = verifyGeneration(await store.read(keys.previous));
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
            const verification = verifySaveIntegrity(entry.player, entry.manifest);
            if ('violations' in verification) throw new Error(`Import candidate integrity failed: ${verification.violations.join('; ')}`);
            const keys = getSaveGenerationKeys(entry.currentKey);
            const generation: StoredSaveGeneration = {
                kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
                formatVersion: SAVE_INTEGRITY_FORMAT_VERSION,
                player: entry.player,
                manifest: entry.manifest,
                needsRecoveryCheckpoint: false,
            };
            await store.write(keys.candidate, generation);
            const readBack = verifyGeneration(await store.read(keys.candidate));
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

export const deleteSaveGenerationFamily = async (
    store: SaveGenerationStore,
    currentKey: string,
): Promise<void> => {
    const keys = getSaveGenerationKeys(currentKey);
    await Promise.all(Object.values(keys).map(key => store.remove(key)));
};
