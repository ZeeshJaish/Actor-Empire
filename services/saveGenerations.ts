import type { Player } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { getMissingContractActorIds, recoverNpcProfilesFromPrevious, restoreContractActorProfiles } from './npcRetention';
import {
    SAVE_INTEGRITY_FORMAT_VERSION,
    type SaveIntegrityManifest,
    verifySaveIntegrity,
    wasManifestIssuedFor,
} from './saveIntegrity';
import { APP_DISPLAY_VERSION } from './appVersion';
import { NewerSaveFormatError, createSlotFormatMarker, isSlotFormatMarker, slotFormatKey, thisBuildCanOpen, type SlotFormatMarker } from './saveFormatGuard';

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
    expectedCandidateDigest?: string;
}

export interface WriteVerifiedGenerationInput {
    keys: SaveGenerationKeys;
    generation: StoredSaveGeneration;
    retainPrevious: boolean;
    expectedCandidateDigest: string;
    /** Phase 1 (2026-11-17), Week Ahead's tap-time write: written only on top of this exact live copy (same digest,
     *  same head token); if anything was written since, nothing is written and the write fails. */
    requireLive?: { digest: string; token: string | null };
    /** Phase 1 (2026-11-17): small records written in the same transaction (a slot's first format marker). */
    alsoPut?: Array<{ key: string; value: unknown }>;
}

/** Week Ahead (2026-11-12): a generation written ahead into the older slot, not live yet. */
export interface StagedSaveGeneration {
    slot: 'CURRENT' | 'PREVIOUS';
    digest: string;
    /** The head token when it was staged; any later write changes or removes it. */
    token: string | null;
}

export interface StageVerifiedGenerationInput {
    keys: SaveGenerationKeys;
    generation: StoredSaveGeneration;
    expectedCandidateDigest: string;
    /** The live copy this session verified: it must still be the live one, with the same head token. */
    live: { digest: string; token: string | null };
}

export interface PromoteStagedGenerationInput {
    keys: SaveGenerationKeys;
    staged: StagedSaveGeneration;
}

export interface RecoverSaveGenerationInput {
    keys: SaveGenerationKeys;
}

export interface PromoteSaveGenerationBatchInput {
    keys: SaveGenerationKeys[];
    expectedCandidateDigests?: Record<string, string>;
}

export interface SaveGenerationStore {
    read(key: string): Promise<unknown | null>;
    /** One consistent transaction snapshot, including across other tab writers. */
    readMany?(keys: readonly string[]): Promise<Array<unknown | null>>;
    write(key: string, value: unknown): Promise<void>;
    /** Optional atomic backend: verify the actual stored current/header before
     * committing either current or previous; reject a different requested digest.
     * Older backends retain the independently staged/read-back/promoted path. */
    writeVerifiedGeneration?(input: WriteVerifiedGenerationInput): Promise<void>;
    /** Optional: tells an A/B backend that this session just verified the live copy on load,
     * so its next write need not read that copy back and check it again. */
    rememberVerifiedCurrent?(currentKey: string, digest: string): void;
    /** Optional (Week Ahead): what this session verified about the live copy, to hand to another thread. */
    exportVerifiedLive?(currentKey: string): { digest: string; token: string | null } | null;
    /** Optional (Week Ahead): take over what another thread of this session verified or committed. */
    importVerifiedLive?(currentKey: string, info: { digest: string; token: string | null } | null): void;
    /** Optional (Week Ahead): write a verified generation ahead into the older slot without making it live. */
    stageVerifiedGeneration?(input: StageVerifiedGenerationInput): Promise<StagedSaveGeneration>;
    /** Optional (Week Ahead): make a staged generation live (head only), if nothing was written since. */
    promoteStagedGeneration?(input: PromoteStagedGenerationInput): Promise<{ digest: string; token: string }>;
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
    expectedCandidateDigests?: Record<string, string>;
}

export type VerifiedGameLoad =
    | { status: 'MISSING'; player: null; previous: null; violations: string[] }
    | {
        status: 'CURRENT'; player: Player; previous: null; violations: string[]; needsRecoveryCheckpoint: boolean;
        /** Phase 1 (2026-11-17): when this copy was saved (its manifest), for the purchase ledger. */
        savedAt: number | null;
        /** Phase 1 (2026-11-17): the head record was not recognised; which copy was loaded instead. */
        headFallback?: 'CURRENT' | 'PREVIOUS_NEWER';
        /** Phase 2a (2026-11-17): the app version that wrote this copy (null before 2a), for the recovery list. */
        appVersion: string | null;
    }
    | { status: 'LEGACY_UNVERIFIED'; player: Player; previous: null; violations: string[] }
    | {
        status: 'RECOVERY_AVAILABLE'; player: null; previous: Player; violations: string[];
        /** Phase 2a (2026-11-17): the backup copy's save time and writer, for the recovery list. */
        previousSavedAt?: number | null; previousAppVersion?: string | null;
    }
    | { status: 'UNRECOVERABLE'; player: null; previous: null; violations: string[] }
    /** Phase 1 (2026-11-17), the format guard: a newer version wrote this slot in a format this build cannot read. */
    | { status: 'NEWER_FORMAT'; player: null; previous: null; violations: string[] };

export const getSaveGenerationKeys = (currentKey: string): SaveGenerationKeys => ({
    current: currentKey,
    candidate: `${currentKey}__candidate`,
    previous: `${currentKey}__previous`,
    integrity: `${currentKey}__integrity`,
    quarantine: `${currentKey}__quarantine`,
});

const databaseNpcIds = new Set(NPC_DATABASE.map(npc => npc.id));

/* Phase 1 (2026-11-17), the format guard (services/saveFormatGuard.ts). A slot's marker is read once per store and
   key (no newer build can write while this one runs) and written once, with the slot's first save by this build. */
const slotMarkers = new WeakMap<SaveGenerationStore, Map<string, SlotFormatMarker | null>>();
const slotMarkerCache = (store: SaveGenerationStore) => {
    let cache = slotMarkers.get(store);
    if (!cache) { cache = new Map(); slotMarkers.set(store, cache); }
    return cache;
};
export const readSlotFormatMarker = async (store: SaveGenerationStore, currentKey: string): Promise<SlotFormatMarker | null> => {
    const cache = slotMarkerCache(store);
    if (cache.has(currentKey)) return cache.get(currentKey) ?? null;
    const raw = await store.read(slotFormatKey(currentKey));
    const marker = isSlotFormatMarker(raw) ? raw : null;
    cache.set(currentKey, marker);
    return marker;
};
/** Throws NewerSaveFormatError when a newer version owns this slot; otherwise returns its marker (null: none yet). */
const guardSlotWrite = async (store: SaveGenerationStore, currentKey: string): Promise<SlotFormatMarker | null> => {
    const marker = await readSlotFormatMarker(store, currentKey);
    if (!thisBuildCanOpen(marker)) throw new NewerSaveFormatError(currentKey);
    return marker;
};
/** After a slot's first write by this build: its marker (a failed marker write is tried again with the next save). */
const markSlotFormat = async (store: SaveGenerationStore, currentKey: string, marker: SlotFormatMarker | null): Promise<void> => {
    if (marker) return;
    const next = createSlotFormatMarker(APP_DISPLAY_VERSION);
    try {
        await store.write(slotFormatKey(currentKey), next);
        slotMarkerCache(store).set(currentKey, next);
    } catch { /* optional now: written with the next save */ }
};

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

/** Week Ahead (2026-11-12): writes a prepared next week ahead (not live). Same candidate rule as a save. */
export const stageVerifiedGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
    player: Player,
    manifest: SaveIntegrityManifest,
    live: { digest: string; token: string | null },
    options: { needsRecoveryCheckpoint?: boolean } = {},
): Promise<StagedSaveGeneration> => runExclusiveSave(store, currentKey, async () => {
    await guardSlotWrite(store, currentKey);
    if (!store.stageVerifiedGeneration) throw new Error('This save store cannot stage a generation.');
    if (!wasManifestIssuedFor(player, manifest)) {
        const initialVerification = verifySaveIntegrity(player, manifest);
        if ('violations' in initialVerification) throw new Error(`Candidate integrity failed before staging: ${initialVerification.violations.join('; ')}`);
    }
    return store.stageVerifiedGeneration({
        keys: getSaveGenerationKeys(currentKey),
        generation: { kind: 'ACTOR_EMPIRE_SAVE_GENERATION', formatVersion: SAVE_INTEGRITY_FORMAT_VERSION, player, manifest, needsRecoveryCheckpoint: options.needsRecoveryCheckpoint === true },
        expectedCandidateDigest: manifest.digest,
        live,
    });
});

/** Week Ahead (2026-11-12): makes a staged week live, if nothing was written since it was staged. */
export const promoteStagedGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
    staged: StagedSaveGeneration,
): Promise<{ digest: string; token: string }> => runExclusiveSave(store, currentKey, async () => {
    const marker = await guardSlotWrite(store, currentKey);
    if (!store.promoteStagedGeneration) throw new Error('This save store cannot promote a staged generation.');
    const committed = await store.promoteStagedGeneration({ keys: getSaveGenerationKeys(currentKey), staged });
    await markSlotFormat(store, currentKey, marker);
    return committed;
});

/** Week Ahead (2026-11-12): work on this key's save done elsewhere (the worker writes the week) waits its turn
 *  behind saves already started here, and saves started here meanwhile wait for it. */
export const runInSaveQueue = <T>(store: SaveGenerationStore, currentKey: string, operation: () => Promise<T>): Promise<T> =>
    runExclusiveSave(store, currentKey, operation);

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

/** Phase 1 (2026-11-17): the same test as the A/B store's own head check (indexedDbSaveGenerations.ts isHead). */
const isRecognisedHead = (value: unknown): boolean => Boolean(value && typeof value === 'object'
    && (value as { kind?: unknown }).kind === 'ACTOR_EMPIRE_SAVE_HEAD' && (value as { formatVersion?: unknown }).formatVersion === 1
    && ((value as { newest?: unknown }).newest === 'CURRENT' || (value as { newest?: unknown }).newest === 'PREVIOUS'));
const weekIndexOf = (player: Player): number => (Number(player.age) || 0) * 100 + (Number(player.currentWeek) || 0);

export const saveVerifiedGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
    player: Player,
    manifest: SaveIntegrityManifest,
    options: { retainPrevious?: boolean; needsRecoveryCheckpoint?: boolean; requireLive?: { digest: string; token: string | null } } = {},
): Promise<void> => runExclusiveSave(store, currentKey, async () => {
    const formatMarker = await guardSlotWrite(store, currentKey);
    // Lag round (2026-11-09): a manifest just issued for this exact object needs no second hash
    // here; the copy actually stored is read back and verified before it can become current.
    if (!wasManifestIssuedFor(player, manifest)) {
        const initialVerification = verifySaveIntegrity(player, manifest);
        if ('violations' in initialVerification) {
            throw new Error(`Candidate integrity failed before write: ${initialVerification.violations.join('; ')}`);
        }
    }
    const keys = getSaveGenerationKeys(currentKey);
    const candidate: StoredSaveGeneration = {
        kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
        formatVersion: SAVE_INTEGRITY_FORMAT_VERSION,
        player,
        manifest,
        needsRecoveryCheckpoint: options.needsRecoveryCheckpoint === true,
    };
    if (store.writeVerifiedGeneration) {
        // A slot's first save by this build carries its format marker in the same transaction.
        const newMarker = formatMarker ? null : createSlotFormatMarker(APP_DISPLAY_VERSION);
        await store.writeVerifiedGeneration({
            keys,
            generation: candidate,
            retainPrevious: options.retainPrevious !== false,
            expectedCandidateDigest: manifest.digest,
            ...(options.requireLive ? { requireLive: options.requireLive } : {}),
            ...(newMarker ? { alsoPut: [{ key: slotFormatKey(currentKey), value: newMarker }] } : {}),
        });
        if (newMarker) slotMarkerCache(store).set(currentKey, newMarker);
        return;
    }
    if (options.requireLive) throw new Error('This save store cannot check the live copy before writing.');
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
        expectedCandidateDigest: manifest.digest,
    });
    await markSlotFormat(store, currentKey, formatMarker);
});

export const loadVerifiedGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
): Promise<VerifiedGameLoad> => {
    const formatMarker = await readSlotFormatMarker(store, currentKey);
    if (!thisBuildCanOpen(formatMarker)) {
        return { status: 'NEWER_FORMAT', player: null, previous: null, violations: ['saved by a newer version of the game'] };
    }
    const keys = getSaveGenerationKeys(currentKey);
    const [current, manifest] = store.readMany
        ? await store.readMany([keys.current, keys.integrity])
        : [await store.read(keys.current), await store.read(keys.integrity)];
    if (current === null || current === undefined) {
        const previous = verifyGeneration(await store.read(keys.previous));
        return previous.ok
            ? { status: 'RECOVERY_AVAILABLE', player: null, previous: previous.generation.player, violations: ['current save is missing'], ...describePreviousCopy(previous.generation) }
            : { status: 'MISSING', player: null, previous: null, violations: [] };
    }
    if (!isPlayer(current)) {
        const previous = verifyGeneration(await store.read(keys.previous));
        return previous.ok
            ? { status: 'RECOVERY_AVAILABLE', player: null, previous: previous.generation.player, violations: ['current save structure is invalid'], ...describePreviousCopy(previous.generation) }
            : { status: 'UNRECOVERABLE', player: null, previous: null, violations: ['current save structure is invalid'] };
    }
    if (!isManifest(manifest)) {
        return { status: 'LEGACY_UNVERIFIED', player: current, previous: null, violations: [] };
    }
    /* Crash fix (19 Nov 2026), FIX-PLAN item 2.1: one frame between reading the copy and checking it, so the logo,
       the loading bar and the loading screen keep moving during a big career's load. Nothing is read or written in
       between: the check runs on the copy already read, and what it remembers is tied to the head seen by the read. */
    await new Promise(resolve => setTimeout(resolve, 0));
    const currentVerification = verifySaveIntegrity(current, manifest);
    /* Phase 1 (2026-11-17), plan item 4: a head record that is there but not recognised used to fall back to the
       CURRENT slot without a word, even when the other copy was the newer week. Now the newer verified copy is
       loaded (the older one stays as the backup) and the caller is told, so it records a non-fatal. */
    let headFallback: 'CURRENT' | 'PREVIOUS_NEWER' | undefined;
    if (!('violations' in currentVerification)) {
        const rawHead = await store.read(`${currentKey}__head`);
        if (rawHead !== null && rawHead !== undefined && !isRecognisedHead(rawHead)) {
            headFallback = 'CURRENT';
            const other = verifyGeneration(await store.read(keys.previous));
            if (other.ok && weekIndexOf(other.generation.player) > weekIndexOf(current)) {
                try {
                    await recoverPreviousGameData(store, currentKey);
                    const recovered = await loadVerifiedGameData(store, currentKey);
                    if (recovered.status === 'CURRENT') return { ...recovered, headFallback: 'PREVIOUS_NEWER' };
                } catch { /* the newer copy could not be made live: the CURRENT copy opens, as before */ }
            }
        }
    }
    if (!('violations' in currentVerification)) {
        store.rememberVerifiedCurrent?.(currentKey, manifest.digest);
        let player = restoreContractActorProfiles(current);
        const missingIds = getMissingContractActorIds(player, databaseNpcIds);
        if (missingIds.size > 0) {
            // Optional profile-only repair must never make a valid current save
            // depend on the availability of its previous generation.
            try {
                const previous = verifyGeneration(await store.read(keys.previous));
                if (previous.ok) player = recoverNpcProfilesFromPrevious(player, previous.generation.player, missingIds);
            } catch { /* Keep the verified current career and its visible recovery state. */ }
        }
        return {
            status: 'CURRENT',
            player,
            previous: null,
            violations: [],
            needsRecoveryCheckpoint: manifest.needsRecoveryCheckpoint === true,
            savedAt: Number.isFinite(Number(manifest.createdAt)) ? Number(manifest.createdAt) : null,
            ...(headFallback ? { headFallback } : {}),
            appVersion: typeof manifest.appVersion === 'string' ? manifest.appVersion : null,
        };
    }
    const previous = verifyGeneration(await store.read(keys.previous));
    if (previous.ok) {
        return {
            status: 'RECOVERY_AVAILABLE',
            player: null,
            previous: previous.generation.player,
            violations: currentVerification.violations,
            ...describePreviousCopy(previous.generation),
        };
    }
    return {
        status: 'UNRECOVERABLE',
        player: null,
        previous: null,
        violations: currentVerification.violations,
    };
};

/** Phase 2a (2026-11-17): a verified backup copy's save time and writer, for the recovery list. */
const describePreviousCopy = (generation: StoredSaveGeneration): { previousSavedAt: number | null; previousAppVersion: string | null } => ({
    previousSavedAt: Number.isFinite(Number(generation.manifest.createdAt)) ? Number(generation.manifest.createdAt) : null,
    previousAppVersion: typeof generation.manifest.appVersion === 'string' ? generation.manifest.appVersion : null,
});

/** Phase 2a (2026-11-17): the verified backup copy with its save time and writer (read only), or null. */
export const peekVerifiedPreviousCopy = async (
    store: SaveGenerationStore,
    currentKey: string,
): Promise<{ player: Player; savedAt: number | null; appVersion: string | null } | null> => {
    const previous = verifyGeneration(await store.read(getSaveGenerationKeys(currentKey).previous));
    if (!previous.ok) return null;
    const described = describePreviousCopy(previous.generation);
    return { player: previous.generation.player, savedAt: described.previousSavedAt, appVersion: described.previousAppVersion };
};

/** Read-only recovery preview. A valid current signature can still precede an incompatible migration. */
export const peekVerifiedPreviousGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
): Promise<Player | null> => {
    const previous = verifyGeneration(await store.read(getSaveGenerationKeys(currentKey).previous));
    return previous.ok ? previous.generation.player : null;
};

export const recoverPreviousGameData = async (
    store: SaveGenerationStore,
    currentKey: string,
): Promise<Player> => runExclusiveSave(store, currentKey, async () => {
    const formatMarker = await guardSlotWrite(store, currentKey);
    const keys = getSaveGenerationKeys(currentKey);
    const previous = verifyGeneration(await store.read(keys.previous));
    if (!previous.ok) throw new Error(`Previous generation is not recoverable: ${previous.violations.join('; ')}`);
    await store.recoverGeneration({ keys });
    await markSlotFormat(store, currentKey, formatMarker);
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
    // Phase 1 (2026-11-17), the format guard: an import never replaces a slot a newer version owns.
    for (const entry of entries) await guardSlotWrite(store, entry.currentKey);
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
            if (readBack.generation.manifest.digest !== entry.manifest.digest) throw new Error('Import candidate read-back does not match the requested generation.');
            stagedKeys.push(keys);
        }
        return { keys: stagedKeys, expectedCandidateDigests: Object.fromEntries(entries.map(entry => [entry.currentKey, entry.manifest.digest])) };
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
    const markers = await Promise.all(batch.keys.map(keys => guardSlotWrite(store, keys.current)));
    await store.promoteGenerationBatch({ keys: batch.keys, expectedCandidateDigests: batch.expectedCandidateDigests });
    await Promise.all(batch.keys.map((keys, index) => markSlotFormat(store, keys.current, markers[index])));
};

export const deleteSaveGenerationFamily = async (
    store: SaveGenerationStore,
    currentKey: string,
): Promise<void> => {
    await guardSlotWrite(store, currentKey);
    const keys = getSaveGenerationKeys(currentKey);
    await Promise.all(Object.values(keys).map(key => store.remove(key)));
    // Phase 1 (2026-11-17): the marker goes with the slot, so startup never lists a deleted slot.
    await store.remove(slotFormatKey(currentKey));
    slotMarkerCache(store).set(currentKey, null);
};
