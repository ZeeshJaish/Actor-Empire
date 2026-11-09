import { INITIAL_PLAYER, type Player } from '../../types';
import { createIndexedDbSaveGenerationStore } from '../../services/indexedDbSaveGenerations';
import { saveVerifiedGameData, loadVerifiedGameData, getSaveGenerationKeys, recoverPreviousGameData } from '../../services/saveGenerations';
import { createSaveIntegrityManifest, verifySaveIntegrity } from '../../services/saveIntegrity';

const dbName = 'ActorEmpireAtomicSaveQA';
const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
const store = createIndexedDbSaveGenerationStore(open, 'saves');
const assert = (value: unknown, message: string) => { if (!value) throw Error(message); };
const sign = (p: Player) => createSaveIntegrityManifest(p, 'AUTOSAVE', 100);
const fresh = () => {
    const p = structuredClone(INITIAL_PLAYER) as Player;
    p.id = 'atomic-career'; p.name = 'Existing Career'; p.money = 100;
    (p.flags as any).dynastyCareerArchives = { ancestor: { name: 'Archived Actor', authoredNote: 'Keep my whole history 🦊'.repeat(1000) } };
    (p.flags as any).nativeArchive = { date: new Date('2020-02-03T04:05:06Z'), sparse: [1, , undefined, 4], negativeZero: -0, notANumber: NaN, optional: undefined };
    return p;
};
const raw = async (key: string) => {
    const db = await open();
    try { return await new Promise<any>((resolve, reject) => {
        const tx = db.transaction('saves', 'readonly'), request = tx.objectStore('saves').get(key);
        tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error);
    }); } finally { db.close(); }
};
const seed = async (key: string, p: Player, manifest: unknown = sign(p)) => {
    const db = await open();
    try { await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('saves', 'readwrite'), objectStore = tx.objectStore('saves');
        objectStore.put(p, key);
        if (manifest) objectStore.put(manifest, key + '__integrity'); else objectStore.delete(key + '__integrity');
        // A raw seed makes this copy the live one (A/B saves, 2026-11-09).
        objectStore.delete(key + '__head');
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); } finally { db.close(); }
};
/** The logical generations: with an A/B head pointing at PREVIOUS, the newest copy is that record. */
const snapshot = async (key: string) => {
    const physical = { current: await raw(key), integrity: await raw(key + '__integrity'), previous: await raw(key + '__previous') };
    const head = await raw(key + '__head');
    if (head?.kind === 'ACTOR_EMPIRE_SAVE_HEAD' && head.newest === 'PREVIOUS' && physical.previous?.kind === 'ACTOR_EMPIRE_SAVE_GENERATION') {
        return { current: physical.previous.player, integrity: physical.previous.manifest, previous: { kind: 'ACTOR_EMPIRE_SAVE_GENERATION', player: physical.current, manifest: physical.integrity } };
    }
    return physical;
};
/** The backup copy on disk right now, wherever the head put it; a raw seed of `key` never touches it. */
const backupMoney = async (key: string) => (await raw(key + '__previous'))?.player?.money;
const verifySnapshot = (value: Awaited<ReturnType<typeof snapshot>>) => {
    assert(verifySaveIntegrity(value.current, value.integrity).ok, 'Current signature must verify');
    if (value.previous) assert(verifySaveIntegrity(value.previous.player, value.previous.manifest).ok, 'Previous signature must verify');
};

(window as any).atomicSaveQA = { run: async () => {
    const rows: string[] = [], key = 'actorEmpireSave_1', keys = getSaveGenerationKeys(key);
    const first = fresh(); await seed(key, first);
    const second = { ...first, money: 125 }, secondManifest = sign(second);
    const nativeTransaction = IDBDatabase.prototype.transaction;
    let writeTransactions = 0;
    IDBDatabase.prototype.transaction = function (...args: any[]) {
        if (this.name === dbName && args[1] === 'readwrite') writeTransactions++;
        return nativeTransaction.apply(this, args as any);
    } as typeof IDBDatabase.prototype.transaction;
    try { await saveVerifiedGameData(store, key, second, secondManifest); }
    finally { IDBDatabase.prototype.transaction = nativeTransaction; }
    assert(writeTransactions === 1, `Verified save must write/read-back/backup in one atomic transaction; received ${writeTransactions}`);
    let saved = await snapshot(key); verifySnapshot(saved);
    assert(saved.current.money === 125 && saved.previous.player.money === 100, 'Current and previous must be complete distinct generations');
    assert(await raw(keys.candidate) == null, 'No temporary candidate root remains after success');
    const archive = saved.current.flags.nativeArchive;
    assert(archive.date instanceof Date && archive.date.toISOString() === '2020-02-03T04:05:06.000Z', 'Native archive date preserved');
    assert(!(1 in archive.sparse) && 2 in archive.sparse && Object.hasOwn(archive, 'optional') && Object.is(archive.negativeZero, -0) && Number.isNaN(archive.notANumber), 'Native archive values preserved');
    assert(saved.current.flags.dynastyCareerArchives.ancestor.authoredNote === (first.flags as any).dynastyCareerArchives.ancestor.authoredNote, 'Full authored dynasty archive preserved');
    rows.push('one transaction, complete current/previous, exact native and authored archive data');

    const nativePut = IDBObjectStore.prototype.put;
    const beforeFailure = saved;
    const fault = new DOMException('Controlled quota failure', 'QuotaExceededError');
    IDBObjectStore.prototype.put = function (value: any, k: any) {
        if (this.transaction.db.name === dbName && k === key) throw fault;
        return nativePut.call(this, value, k);
    };
    let rejected = false;
    try { const next = { ...second, money: 150 }; await saveVerifiedGameData(store, key, next, sign(next)); } catch { rejected = true; }
    finally { IDBObjectStore.prototype.put = nativePut; }
    saved = await snapshot(key); verifySnapshot(saved);
    assert(rejected && saved.current.money === 125 && saved.previous.player.money === 100, 'Quota failure must roll back backup and current together');
    assert(saved.integrity.digest === beforeFailure.integrity.digest, 'Quota failure must preserve the previous committed signature');
    rows.push('late quota failure preserves both generations and signature');

    IDBObjectStore.prototype.put = function (value: any, k: any) {
        return nativePut.call(this, k === key ? { ...value, money: value.money + 1 } : value, k);
    };
    rejected = false;
    try { const next = { ...second, money: 150 }; await saveVerifiedGameData(store, key, next, sign(next)); } catch { rejected = true; }
    finally { IDBObjectStore.prototype.put = nativePut; }
    saved = await snapshot(key); verifySnapshot(saved);
    assert(rejected && saved.current.money === 125 && saved.previous.player.money === 100, 'Corrupted final stored payload must abort before publication');
    rows.push('actual stored-current corruption rejected before transaction commit');

    const foreign = { ...second, money: 999 }, foreignManifest = sign(foreign);
    IDBObjectStore.prototype.put = function (value: any, k: any) {
        return nativePut.call(this, k === key ? foreign : k === keys.integrity ? foreignManifest : value, k);
    };
    rejected = false;
    try { const next = { ...second, money: 150 }; await saveVerifiedGameData(store, key, next, sign(next)); } catch { rejected = true; }
    finally { IDBObjectStore.prototype.put = nativePut; }
    saved = await snapshot(key); verifySnapshot(saved);
    assert(rejected && saved.current.money === 125 && saved.previous.player.money === 100, 'A valid but different stored generation must not replace the requested generation');
    rows.push('matching foreign player/signature pair rejected by requested digest');

    let goodBackup = await backupMoney(key);
    await seed(key, { ...second, money: 126 }, secondManifest);
    const third = { ...second, money: 150 }; await saveVerifiedGameData(store, key, third, sign(third));
    saved = await snapshot(key); verifySnapshot(saved);
    assert(saved.current.money === 150 && saved.previous.player.money === goodBackup && goodBackup !== 126, 'Corrupt old current must not poison the good backup');
    rows.push('corrupt old current cannot overwrite previous-good backup');

    goodBackup = await backupMoney(key);
    await seed(key, first, null);
    assert((await loadVerifiedGameData(store, key)).status === 'LEGACY_UNVERIFIED', 'Unsigned old save remains readable');
    await saveVerifiedGameData(store, key, third, sign(third));
    saved = await snapshot(key); verifySnapshot(saved);
    assert(saved.current.money === 150 && saved.previous.player.money === goodBackup, 'Unsigned legacy promotion preserves existing good backup');
    rows.push('unsigned legacy save path and good backup preserved');

    goodBackup = (await snapshot(key)).previous?.player?.money;
    const fourth = { ...third, money: 175 }; await saveVerifiedGameData(store, key, fourth, sign(fourth), { retainPrevious: false });
    saved = await snapshot(key); verifySnapshot(saved);
    assert(saved.current.money === 175 && saved.previous.player.money === goodBackup, 'Explicit non-retention must leave existing good backup alone');
    rows.push('large unverified recovery-checkpoint retention policy preserved');

    const frozen = await (await fetch('/legacy.json')).json();
    const legacyKey = 'actorEmpireSave_4';
    await seed(legacyKey, frozen.player, frozen.manifest);
    const oldLoaded = await loadVerifiedGameData(store, legacyKey);
    assert(oldLoaded.status === 'CURRENT', 'Issued schema-4 save remains readable without re-signing it');
    const upgraded = { ...frozen.player, money: frozen.player.money + 25 } as Player;
    await saveVerifiedGameData(store, legacyKey, upgraded, sign(upgraded));
    const upgradedSnapshot = await snapshot(legacyKey); verifySnapshot(upgradedSnapshot);
    assert(upgradedSnapshot.integrity.digestSchemaVersion === 5 && upgradedSnapshot.previous.manifest.digest === frozen.manifest.digest, 'New current keeps the exact old issued previous signature');
    assert(JSON.stringify(upgradedSnapshot.previous.player) === JSON.stringify(frozen.player), 'Issued legacy body is retained without data rewriting');
    rows.push('frozen issued schema-4 current upgrades with exact old body/signature retained as backup');

    const otherStore = createIndexedDbSaveGenerationStore(open, 'saves');
    const a = { ...fourth, money: 200 }, b = { ...fourth, money: 225 };
    await Promise.all([saveVerifiedGameData(store, key, a, sign(a)), saveVerifiedGameData(otherStore, key, b, sign(b))]);
    saved = await snapshot(key); verifySnapshot(saved);
    assert(new Set([saved.current.money, saved.previous.player.money]).size === 2 && [200, 225].includes(saved.current.money) && [200, 225].includes(saved.previous.player.money), 'Independent writers serialize complete generations');
    rows.push('independent store instances preserve coherent current/previous generations');

    // A/B copies (2026-11-09): once this session has verified the live copy, a week writes one
    // slot and reads back only that slot; the other copy is never read or rewritten.
    const abKey = 'actorEmpireSave_2', p0 = { ...fresh(), money: 1000 };
    await seed(abKey, p0);
    const abStore = createIndexedDbSaveGenerationStore(open, 'saves');
    assert((await loadVerifiedGameData(abStore, abKey)).status === 'CURRENT', 'A/B seed loads as verified');
    const nativeGet = IDBObjectStore.prototype.get;
    const countGets = async (work: () => Promise<void>) => {
        const keysRead: string[] = [];
        IDBObjectStore.prototype.get = function (k: any) { if (this.transaction.db.name === dbName && typeof k === 'string' && k.startsWith(abKey)) keysRead.push(k); return nativeGet.call(this, k); };
        try { await work(); } finally { IDBObjectStore.prototype.get = nativeGet; }
        return keysRead;
    };
    const p1 = { ...p0, money: 1001 }, p2 = { ...p0, money: 1002 };
    const firstWeek = await countGets(() => saveVerifiedGameData(abStore, abKey, p1, sign(p1)));
    assert(!firstWeek.includes(abKey) && firstWeek.filter(k => k === abKey + '__previous').length === 1, 'A trusted week reads back only the slot it wrote: ' + firstWeek.join(','));
    const secondWeek = await countGets(() => saveVerifiedGameData(abStore, abKey, p2, sign(p2)));
    assert(!secondWeek.includes(abKey + '__previous') && secondWeek.filter(k => k === abKey).length === 1, 'The next week writes the other slot: ' + secondWeek.join(','));
    saved = await snapshot(abKey); verifySnapshot(saved);
    assert(saved.current.money === 1002 && saved.previous.player.money === 1001, 'A/B keeps the newest and the week before');
    const reloaded = await loadVerifiedGameData(createIndexedDbSaveGenerationStore(open, 'saves'), abKey);
    assert(reloaded.status === 'CURRENT' && reloaded.player!.money === 1002, 'A fresh session loads the newest A/B copy');
    rows.push('A/B: trusted weeks write one slot and read back only that slot; reload sees the newest');

    // The live copy goes bad on disk: recovery brings back the week before, and the next week
    // from a fresh session does not trust a copy it never verified.
    const corruptKey = (await raw(abKey + '__head'))?.newest === 'PREVIOUS' ? abKey + '__previous' : abKey;
    assert(corruptKey === abKey, 'After two weeks the newest copy is back in the CURRENT slot');
    const db2 = await open();
    await new Promise<void>((resolve, reject) => { const tx = db2.transaction('saves', 'readwrite'); tx.objectStore('saves').put({ ...p2, money: 5000 }, abKey); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    db2.close();
    const afterRot = await loadVerifiedGameData(createIndexedDbSaveGenerationStore(open, 'saves'), abKey);
    assert(afterRot.status === 'RECOVERY_AVAILABLE' && afterRot.previous!.money === 1001, 'A tampered live copy offers the week before');
    const recovered = await recoverPreviousGameData(createIndexedDbSaveGenerationStore(open, 'saves'), abKey);
    assert(recovered.money === 1001, 'Recovery restores the week before');
    saved = await snapshot(abKey); verifySnapshot(saved);
    assert(saved.current.money === 1001 && saved.previous.player.money === 1001, 'After recovery both copies hold the recovered week');
    rows.push('A/B: a bad live copy recovers to the week before, both copies then hold it');
    return rows;
} };
