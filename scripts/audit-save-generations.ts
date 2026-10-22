import assert from 'node:assert/strict';
import { frozenStockSchema3 } from './fixtures/stockSaveSchema3';
import { peekVerifiedPreviousGameData } from '../services/saveGenerations';
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
    candidateWriteAttempts = 0;
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
        if (key.endsWith('__candidate')) this.candidateWriteAttempts += 1;
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

const v1Serialize = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `[${value.map(v1Serialize).join(',')}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${v1Serialize(record[key])}`).join(',')}}`;
};
const v1Hash = (value: unknown): string => {
    const serialized = v1Serialize(value);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < serialized.length; index += 1) {
        const code = serialized.charCodeAt(index);
        first ^= code;
        first = Math.imul(first, 0x01000193);
        second ^= code + index;
        second = Math.imul(second, 0x85ebca6b);
    }
    return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
};
const { digest: _v2Digest, createdAt: _v2CreatedAt, digestSchemaVersion: _v2Schema, ...v1Core } = oldManifest;
const rolloutV1Manifest: SaveIntegrityManifest = {
    ...v1Core,
    createdAt: oldManifest.createdAt,
    digest: v1Hash(v1Core),
};
const upgraded = new MemoryGenerationStore();
upgraded.records.set(keys.current, oldPlayer);
upgraded.records.set(keys.integrity, rolloutV1Manifest);
assert.equal((await loadVerifiedGameData(upgraded, slotKey)).status, 'CURRENT',
    'a signed current-rollout v1 save must open without rewriting it');
assert.deepEqual(upgraded.records.get(keys.integrity), rolloutV1Manifest,
    'verification alone must leave the old generation untouched');
await saveVerifiedGameData(upgraded, slotKey, nextPlayer, nextManifest);
assert.equal((await loadVerifiedGameData(upgraded, slotKey)).status, 'CURRENT');
assert.deepEqual((upgraded.records.get(keys.previous) as StoredSaveGeneration).manifest, rolloutV1Manifest,
    'the first v2 save must retain the signed v1 recovery generation');
upgraded.failCandidateWrite = true;
await assert.rejects(() => saveVerifiedGameData(upgraded, slotKey, oldPlayer, createSaveIntegrityManifest(oldPlayer, 'AUTOSAVE')));
assert.deepEqual(upgraded.records.get(keys.current), nextPlayer,
    'a failed later write must not discard the verified upgraded generation');

const schemaThree = new MemoryGenerationStore();
const schemaThreePlayer = structuredClone(frozenStockSchema3.player) as unknown as Player;
const schemaThreeManifest = structuredClone(frozenStockSchema3.manifest) as unknown as SaveIntegrityManifest;
schemaThree.records.set(keys.current, schemaThreePlayer);
schemaThree.records.set(keys.integrity, schemaThreeManifest);
assert.equal((await loadVerifiedGameData(schemaThree, slotKey)).status, 'CURRENT', 'Shipped schema3 must open before migration without re-signing it.');
const schemaFourPlayer = structuredClone(schemaThreePlayer); schemaFourPlayer.currentWeek++;
await saveVerifiedGameData(schemaThree, slotKey, schemaFourPlayer, createSaveIntegrityManifest(schemaFourPlayer, 'MIGRATION'));
assert.deepEqual((schemaThree.records.get(keys.previous) as StoredSaveGeneration).manifest, schemaThreeManifest, 'First schema4 promotion retains its original signed schema3 recovery generation.');
const tamperedCorporate = structuredClone(schemaFourPlayer);delete tamperedCorporate.portfolio[0].equityFunding;
schemaThree.records.set(keys.current, tamperedCorporate);
assert.equal((await loadVerifiedGameData(schemaThree, slotKey)).status, 'RECOVERY_AVAILABLE', 'Lost corporate ownership must select verified recovery instead of trusting a schema4 current generation.');

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

const peekPrevious = peekVerifiedPreviousGameData;
const peekStore = new MemoryGenerationStore();
peekStore.records.set(keys.previous, { kind: 'ACTOR_EMPIRE_SAVE_GENERATION', formatVersion: 1,
    player: oldPlayer, manifest: oldManifest, needsRecoveryCheckpoint: false } satisfies StoredSaveGeneration);
const peekBefore = structuredClone(peekStore.records);
assert.deepEqual(await peekPrevious(peekStore, slotKey), oldPlayer);
assert.deepEqual(peekStore.records, peekBefore, 'Preview must not promote, quarantine or change the previous generation.');
(peekStore.records.get(keys.previous) as StoredSaveGeneration).player = { ...oldPlayer, money: oldPlayer.money + 1 };
assert.equal(await peekPrevious(peekStore, slotKey), null, 'An invalid previous manifest must never become a recovery preview.');
assert.equal(await peekPrevious(new MemoryGenerationStore(), slotKey), null);

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

// An atomic promotion can occur between two separate read transactions. Reading
// the old player and the new manifest must not falsely report save corruption.
const reading = new MemoryGenerationStore();
reading.records.set(keys.current, oldPlayer);
reading.records.set(keys.integrity, oldManifest);
const originalRead = reading.read.bind(reading);
reading.read = async key => {
    const value = await originalRead(key);
    if (key === keys.current) {
        reading.records.set(keys.current, nextPlayer);
        reading.records.set(keys.integrity, nextManifest);
    }
    return value;
};
Object.assign(reading, { readMany: async (requested: readonly string[]) => requested.map(key => structuredClone(reading.records.get(key) ?? null)) });
const consistent = await loadVerifiedGameData(reading, slotKey);
assert.equal(consistent.status, 'CURRENT', 'A generation read must use one atomic player/manifest snapshot when the store supports it.');
if (consistent.status === 'CURRENT') assert.equal(consistent.player.currentWeek, oldPlayer.currentWeek);

console.log('Save generation audit passed.');
