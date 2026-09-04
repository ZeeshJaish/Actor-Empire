import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createSaveIntegrityManifest, type SaveIntegrityManifest } from '../services/saveIntegrity';
import {
    getSaveGenerationKeys,
    loadVerifiedGameData,
    recoverPreviousGameData,
    saveVerifiedGameData,
    stageVerifiedGameDataBatch,
    promoteStagedGameDataBatch,
    deleteSaveGenerationFamily,
    type SaveGenerationStore,
    type StoredSaveGeneration,
} from '../services/saveGenerations';

class MemoryGenerationStore implements SaveGenerationStore {
    records = new Map<string, unknown>();
    failCandidateWrite = false;
    corruptCandidateRead = false;
    failPromotion = false;
    failBatchPromotion = false;

    async read(key: string) {
        const value = this.records.get(key);
        if (this.corruptCandidateRead && key.endsWith('__candidate') && value) {
            const record = structuredClone(value) as StoredSaveGeneration;
            record.player.money += 1;
            return record;
        }
        return value === undefined ? null : structuredClone(value);
    }

    async write(key: string, value: unknown) {
        if (this.failCandidateWrite && key.endsWith('__candidate')) throw new Error('candidate write failed');
        this.records.set(key, structuredClone(value));
    }

    async remove(key: string) {
        this.records.delete(key);
    }

    async promoteGeneration(input: Parameters<SaveGenerationStore['promoteGeneration']>[0]) {
        if (this.failPromotion) throw new Error('promotion failed');
        const current = this.records.get(input.keys.current);
        const currentManifest = this.records.get(input.keys.integrity);
        const candidate = this.records.get(input.keys.candidate) as StoredSaveGeneration | undefined;
        if (!candidate) throw new Error('missing candidate');
        const next = new Map(this.records);
        if (input.retainPrevious && current && currentManifest) {
            next.set(input.keys.previous, {
                kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
                formatVersion: 1,
                player: structuredClone(current) as Player,
                manifest: structuredClone(currentManifest) as SaveIntegrityManifest,
                needsRecoveryCheckpoint: false,
            } satisfies StoredSaveGeneration);
        }
        next.set(input.keys.current, structuredClone(candidate.player));
        next.set(input.keys.integrity, structuredClone(candidate.manifest));
        next.delete(input.keys.candidate);
        this.records = next;
    }

    async recoverGeneration(input: Parameters<SaveGenerationStore['recoverGeneration']>[0]) {
        const previous = this.records.get(input.keys.previous) as StoredSaveGeneration | undefined;
        if (!previous) throw new Error('missing previous');
        const next = new Map(this.records);
        next.set(input.keys.quarantine, {
            player: structuredClone(this.records.get(input.keys.current)),
            manifest: structuredClone(this.records.get(input.keys.integrity) || null),
        });
        next.set(input.keys.current, structuredClone(previous.player));
        next.set(input.keys.integrity, structuredClone(previous.manifest));
        this.records = next;
    }

    async promoteGenerationBatch(input: Parameters<SaveGenerationStore['promoteGenerationBatch']>[0]) {
        if (this.failBatchPromotion) throw new Error('batch promotion failed');
        const next = new Map(this.records);
        for (const keys of input.keys) {
            const candidate = this.records.get(keys.candidate) as StoredSaveGeneration | undefined;
            if (!candidate) throw new Error(`missing candidate for ${keys.current}`);
            const current = this.records.get(keys.current);
            const currentManifest = this.records.get(keys.integrity);
            if (current && currentManifest) {
                next.set(keys.previous, {
                    kind: 'ACTOR_EMPIRE_SAVE_GENERATION',
                    formatVersion: 1,
                    player: structuredClone(current) as Player,
                    manifest: structuredClone(currentManifest) as SaveIntegrityManifest,
                    needsRecoveryCheckpoint: false,
                } satisfies StoredSaveGeneration);
            }
            next.set(keys.current, structuredClone(candidate.player));
            next.set(keys.integrity, structuredClone(candidate.manifest));
            next.delete(keys.candidate);
        }
        this.records = next;
    }
}

const slotKey = 'actorEmpireSave_1';
const keys = getSaveGenerationKeys(slotKey);
const oldPlayer = structuredClone(INITIAL_PLAYER) as Player;
oldPlayer.id = 'generation-player';
oldPlayer.age = 61;
oldPlayer.currentWeek = 12;
oldPlayer.money = 500;
const oldManifest = createSaveIntegrityManifest(oldPlayer, 'AUTOSAVE', 100);

const nextPlayer = structuredClone(oldPlayer) as Player;
nextPlayer.currentWeek = 13;
nextPlayer.money = 650;
const nextManifest = createSaveIntegrityManifest(nextPlayer, 'PROCESS_WEEK', 200);

const successful = new MemoryGenerationStore();
successful.records.set(keys.current, oldPlayer);
successful.records.set(keys.integrity, oldManifest);
await saveVerifiedGameData(successful, slotKey, nextPlayer, nextManifest);
assert.deepEqual(successful.records.get(keys.current), nextPlayer);
assert.equal((successful.records.get(keys.previous) as StoredSaveGeneration).player.currentWeek, 12);
assert.equal(successful.records.has(keys.candidate), false);

for (const failure of ['write', 'read', 'promote'] as const) {
    const store = new MemoryGenerationStore();
    store.records.set(keys.current, oldPlayer);
    store.records.set(keys.integrity, oldManifest);
    if (failure === 'write') store.failCandidateWrite = true;
    if (failure === 'read') store.corruptCandidateRead = true;
    if (failure === 'promote') store.failPromotion = true;
    await assert.rejects(() => saveVerifiedGameData(store, slotKey, nextPlayer, nextManifest));
    assert.deepEqual(store.records.get(keys.current), oldPlayer, `${failure} failure must leave current untouched.`);
    assert.deepEqual(store.records.get(keys.integrity), oldManifest, `${failure} failure must leave its manifest untouched.`);
}

const legacy = new MemoryGenerationStore();
legacy.records.set(keys.current, oldPlayer);
const legacyLoad = await loadVerifiedGameData(legacy, slotKey);
assert.equal(legacyLoad.status, 'LEGACY_UNVERIFIED');

const recoverable = successful;
const corruptCurrent = structuredClone(nextPlayer) as Player;
corruptCurrent.money = 999_999;
recoverable.records.set(keys.current, corruptCurrent);
const recoveryLoad = await loadVerifiedGameData(recoverable, slotKey);
assert.equal(recoveryLoad.status, 'RECOVERY_AVAILABLE');
assert.equal(recoveryLoad.previous?.currentWeek, 12);
await recoverPreviousGameData(recoverable, slotKey);
assert.equal((recoverable.records.get(keys.current) as Player).currentWeek, 12);
assert.equal(recoverable.records.has(keys.quarantine), true);

const unrecoverable = new MemoryGenerationStore();
unrecoverable.records.set(keys.current, corruptCurrent);
unrecoverable.records.set(keys.integrity, nextManifest);
const unrecoverableLoad = await loadVerifiedGameData(unrecoverable, slotKey);
assert.equal(unrecoverableLoad.status, 'UNRECOVERABLE');

const batch = new MemoryGenerationStore();
const slotTwoKey = 'actorEmpireSave_2';
const slotTwoKeys = getSaveGenerationKeys(slotTwoKey);
const oldSlotTwo = { ...structuredClone(oldPlayer), id: 'second-player', name: 'Second Career' } as Player;
batch.records.set(keys.current, oldPlayer);
batch.records.set(keys.integrity, oldManifest);
batch.records.set(slotTwoKeys.current, oldSlotTwo);
batch.records.set(slotTwoKeys.integrity, createSaveIntegrityManifest(oldSlotTwo, 'AUTOSAVE', 101));
const importedOne = { ...structuredClone(nextPlayer), name: 'Imported One' } as Player;
const importedTwo = { ...structuredClone(oldSlotTwo), currentWeek: 20, name: 'Imported Two' } as Player;
const staged = await stageVerifiedGameDataBatch(batch, [
    { currentKey: slotKey, player: importedOne, manifest: createSaveIntegrityManifest(importedOne, 'IMPORT', 300) },
    { currentKey: slotTwoKey, player: importedTwo, manifest: createSaveIntegrityManifest(importedTwo, 'IMPORT', 301) },
]);
batch.failBatchPromotion = true;
await assert.rejects(() => promoteStagedGameDataBatch(batch, staged));
assert.equal((batch.records.get(keys.current) as Player).name, oldPlayer.name, 'Failed batch promotion must preserve slot one.');
assert.equal((batch.records.get(slotTwoKeys.current) as Player).name, oldSlotTwo.name, 'Failed batch promotion must preserve slot two.');
batch.failBatchPromotion = false;
await promoteStagedGameDataBatch(batch, staged);
assert.equal((batch.records.get(keys.current) as Player).name, 'Imported One');
assert.equal((batch.records.get(slotTwoKeys.current) as Player).name, 'Imported Two');

const concurrent = new MemoryGenerationStore();
concurrent.records.set(keys.current, oldPlayer);
concurrent.records.set(keys.integrity, oldManifest);
const concurrentOne = { ...structuredClone(nextPlayer), currentWeek: 14, money: 700 } as Player;
const concurrentTwo = { ...structuredClone(nextPlayer), currentWeek: 15, money: 800 } as Player;
await Promise.all([
    saveVerifiedGameData(concurrent, slotKey, concurrentOne, createSaveIntegrityManifest(concurrentOne, 'AUTOSAVE', 400)),
    saveVerifiedGameData(concurrent, slotKey, concurrentTwo, createSaveIntegrityManifest(concurrentTwo, 'AUTOSAVE', 401)),
]);
assert.equal((concurrent.records.get(keys.current) as Player).currentWeek, 15, 'Concurrent saves must serialize in request order.');
assert.equal(
    (concurrent.records.get(keys.previous) as StoredSaveGeneration).player.currentWeek,
    14,
    'The previous generation must be the save immediately before the concurrent winner.',
);

await deleteSaveGenerationFamily(concurrent, slotKey);
for (const key of Object.values(keys)) assert.equal(concurrent.records.has(key), false, `Delete must remove ${key}.`);

console.log('Save generation audit passed.');
