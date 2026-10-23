import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../services/saveGenerations';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { compareProtectedSaveState } from '../services/saveIntegrity';

const fixture = () => { const p = structuredClone(INITIAL_PLAYER); p.age = 40; p.currentWeek = 12; return p; };
const memory = (p: Player): { schemaVersion: number; entries: { title: string; week: number }[] } => (p.world as any).recentProjectTitles;
const put = (p: Player, entries: { title: string; week: number }[]) => { (p.world as any).recentProjectTitles = { schemaVersion: 1, entries }; };
let passed = 0, failed = 0;
async function check(name: string, run: () => void | Promise<void>) {
    try { await run(); passed++; console.log('PASS', name); }
    catch (error) { failed++; console.error('FAIL', name, String(error)); }
}
async function main() {
    await check('save compaction expires only naming entries at 104 weeks, including invalid future dates', () => {
        const p = fixture(), now = getAbsoluteWeek(p.age, p.currentWeek);
        put(p, [{ title: 'Keep Recent', week: now - 103 }, { title: 'Expire Old', week: now - 104 }, { title: 'Future Clock', week: now + 1 }]);
        const next = compactPlayerForPersistence(p);
        assert.deepEqual(memory(next).entries, [{ title: 'Keep Recent', week: now - 103 }]);
        assert.equal(memory(p).entries.length, 3, 'never mutate the source save');
        assert.deepEqual(next.pastProjects, p.pastProjects);
        assert.equal(next.money, p.money);
    });
    await check('an oversized naming buffer retains at most the latest 1024 entries', () => {
        const p = fixture(), now = getAbsoluteWeek(p.age, p.currentWeek);
        put(p, Array.from({ length: 2000 }, (_, i) => ({ title: `Title ${i}`, week: now })));
        const next = compactPlayerForPersistence(p);
        assert.equal(memory(next).entries.length, 1024);
        assert.equal(memory(next).entries[0].title, 'Title 976');
        assert.equal(memory(next).entries[1023].title, 'Title 1999');
        assert.ok(JSON.stringify(memory(next)).length < 150_000);
    });
    await check('case and whitespace duplicates occupy one slot without refreshing the original creation week', () => {
        const p = fixture(), now = getAbsoluteWeek(p.age, p.currentWeek);
        put(p, [{ title: 'Night Ledger', week: now - 30 }, { title: '  NIGHT   LEDGER  ', week: now - 29 }]);
        const next = compactPlayerForPersistence(p);
        assert.deepEqual(memory(next).entries, [{ title: 'Night Ledger', week: now - 30 }]);
    });
    await check('old saves gain bounded naming memory without renaming or merging films', () => {
        const p = fixture();
        p.pastProjects = [{ id: 'old-film-a', name: 'Same Saved Name', year: 25 }, { id: 'old-film-b', name: 'Same Saved Name', year: 39 }] as any;
        const before = structuredClone(p);
        const next = migratePlayerSave(p);
        assert.equal(memory(next).schemaVersion, 1);
        assert.ok(memory(next).entries.length <= 1024);
        assert.deepEqual(next.pastProjects.map(f => ({ id: f.id, name: f.name })), before.pastProjects.map(f => ({ id: f.id, name: f.name })));
        assert.equal(next.money, before.money);
        assert.equal((p.world as any).recentProjectTitles, undefined);
    });
    await check('verified save/reload preserves the naming buffer and its exact expiry clock', async () => {
        const p = prepareVerifiedPlayerForPersistence(migratePlayerSave(fixture()), 'MANUAL').player;
        const now = getAbsoluteWeek(p.age, p.currentWeek);
        put(p, [{ title: 'Keep Across Reload', week: now - 103 }]);
        const ready = prepareVerifiedPlayerForPersistence(p, 'MANUAL');
        assert.deepEqual(ready.comparison, { ok: true });
        assert.deepEqual(compareProtectedSaveState(p, ready.player), { ok: true });
        const store = new CinemaMemorySaveStore();
        await saveVerifiedGameData(store, 'title-memory-audit', ready.player, ready.manifest);
        const loaded = await loadVerifiedGameData(store, 'title-memory-audit');
        assert.equal(loaded.status, 'CURRENT');
        const reloaded = migratePlayerSave(loaded.player!);
        assert.deepEqual(memory(reloaded), memory(p));
        reloaded.currentWeek++;
        const expired = compactPlayerForPersistence(reloaded);
        assert.equal(memory(expired).entries.length, 0, 'reload must not grant another 104 weeks');
        assert.equal(expired.money, p.money);
        assert.deepEqual(expired.relationships, reloaded.relationships);
    });
    console.log(`Project title memory audit: ${passed} passed, ${failed} failed.`);
    if (failed) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
