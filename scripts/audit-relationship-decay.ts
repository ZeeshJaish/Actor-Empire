import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type Relationship } from '../types';
import { getAbsoluteWeek, getInteractionAgeInWeeks } from '../services/legacyLogic';
import { processGameWeek } from '../services/gameLoop';
import { migratePlayerSave } from '../services/saveMigration';

function fixture(age = 49, week = 48): Player {
    const p = structuredClone(INITIAL_PLAYER);
    Object.assign(p, { id: 'relationship-decay-audit', age, currentWeek: week, money: 100_000_000,
        flags: {}, commitments: [], activeReleases: [], pastProjects: [], pendingEvents: [],
        scheduledEvents: [], news: [], inbox: [], logs: [] });
    p.stats.fame = 0;
    p.relationships = [{ id: 'friend', name: 'Audit Friend', relation: 'Friend', closeness: 100,
        image: '', lastInteractionWeek: week, lastInteractionAbsolute: getAbsoluteWeek(age, week) }];
    return p;
}
const bond = (p: Player): Relationship => p.relationships.find(r => r.id === 'friend')!;
async function advance(p: Player, weeks: number): Promise<Player> {
    for (let i = 0; i < weeks; i++) p = (await processGameWeek(p)).player;
    return p;
}
let checks = 0;
let failures = 0;
async function check(name: string, run: () => void | Promise<void>) {
    try { await run(); checks++; console.log('PASS', name); }
    catch (error) { failures++; console.error('FAIL', name, String(error)); }
}

await check('late-year contact decays after the existing four-week grace across rollover', async () => {
    let p = await advance(fixture(), 5);
    assert.equal(bond(p).closeness, 100);
    p = await advance(p, 1);
    assert.equal(bond(p).closeness, 98);
    assert.equal(getInteractionAgeInWeeks(bond(p), p.age, p.currentWeek), 6);
});
await check('same-year and year-end inactivity receive equal weekly decay', async () => {
    const sameYear = await advance(fixture(49, 10), 15);
    const rolled = await advance(fixture(49, 48), 15);
    assert.equal(bond(sameYear).closeness, 80);
    assert.equal(bond(rolled).closeness, 80);
});
await check('maintaining maximum closeness does not unlock permanent decay immunity', async () => {
    let p = fixture(49, 44);
    for (let i = 0; i < 6; i++) {
        Object.assign(bond(p), { closeness: 100, lastInteractionWeek: p.currentWeek,
            lastInteractionAbsolute: getAbsoluteWeek(p.age, p.currentWeek) });
        p = await advance(p, 1);
        assert.equal(bond(p).closeness, 100);
    }
    p = await advance(p, 15);
    assert.equal(bond(p).closeness, 78);
});
await check('known old contact receives one weekly decrement, never a backlog deduction', async () => {
    const p = fixture(50, 10);
    bond(p).lastInteractionWeek = 48;
    bond(p).lastInteractionAbsolute = getAbsoluteWeek(49, 48);
    const next = await advance(p, 1);
    assert.equal(bond(next).closeness, 98);
});
await check('a real new contact restarts grace even after long inactivity', async () => {
    let p = await advance(fixture(), 10);
    Object.assign(bond(p), { lastInteractionWeek: p.currentWeek,
        lastInteractionAbsolute: getAbsoluteWeek(p.age, p.currentWeek) });
    const closeness = bond(p).closeness;
    p = await advance(p, 5);
    assert.equal(bond(p).closeness, closeness);
    p = await advance(p, 1);
    assert.equal(bond(p).closeness, closeness - 2);
});
await check('missing legacy absolute date is anchored once and survives reload', () => {
    const p = fixture(49, 10);
    delete bond(p).lastInteractionAbsolute;
    bond(p).lastInteractionWeek = 8;
    const migrated = migratePlayerSave(p);
    assert.equal(bond(migrated).lastInteractionAbsolute, getAbsoluteWeek(49, 8));
    assert.equal(bond(migrated).closeness, 100);
    const loaded = migratePlayerSave(JSON.parse(JSON.stringify(migrated)));
    assert.equal(bond(loaded).lastInteractionAbsolute, getAbsoluteWeek(49, 8));
    assert.equal(loaded.money, p.money);
});
await check('ambiguous yearless legacy contact starts grace instead of guessing years of neglect', async () => {
    const p = fixture(50, 10);
    delete bond(p).lastInteractionAbsolute;
    bond(p).lastInteractionWeek = 48;
    let loaded = migratePlayerSave(p);
    assert.equal(bond(loaded).lastInteractionAbsolute, getAbsoluteWeek(50, 10));
    loaded = await advance(loaded, 6);
    assert.equal(bond(loaded).closeness, 98);
});
await check('default zero clock is not interpreted as decades of neglect', () => {
    const p = fixture(49, 10);
    bond(p).lastInteractionAbsolute = 0;
    bond(p).lastInteractionWeek = 0;
    const loaded = migratePlayerSave(p);
    assert.equal(getInteractionAgeInWeeks(bond(loaded), loaded.age, loaded.currentWeek), 0);
    assert.equal(bond(loaded).lastInteractionAbsolute, getAbsoluteWeek(49, 10));
    assert.equal(bond(loaded).closeness, 100);
});
await check('inherited future-dated contact cannot prevent decay for years', async () => {
    const p = fixture(18, 10);
    bond(p).lastInteractionAbsolute = getAbsoluteWeek(72, 10);
    let loaded = migratePlayerSave(p);
    assert.equal(bond(loaded).lastInteractionAbsolute, getAbsoluteWeek(18, 10));
    loaded = await advance(loaded, 6);
    assert.equal(bond(loaded).closeness, 98);
});
await check('direct weekly processing repairs a legacy clock without requiring a save reload', async () => {
    const p = fixture(50, 10);
    delete bond(p).lastInteractionAbsolute;
    bond(p).lastInteractionWeek = 48;
    const next = await advance(p, 6);
    assert.equal(bond(next).closeness, 98);
    assert.equal(bond(next).lastInteractionAbsolute, getAbsoluteWeek(50, 10));
});
await check('deceased parent bonds remain preserved while living contacts decay', async () => {
    const p = fixture(50, 10);
    bond(p).lastInteractionAbsolute = getAbsoluteWeek(49, 48);
    bond(p).lastInteractionWeek = 48;
    p.relationships.push({ ...bond(p), id: 'legacy-parent', relation: 'Deceased Parent' });
    const next = await advance(p, 1);
    assert.equal(bond(next).closeness, 98);
    assert.equal(next.relationships.find(r => r.id === 'legacy-parent')!.closeness, 100);
});
await check('decay remains bounded at zero', async () => {
    const p = fixture(50, 10);
    bond(p).closeness = 1;
    bond(p).lastInteractionAbsolute = getAbsoluteWeek(49, 48);
    bond(p).lastInteractionWeek = 48;
    assert.equal(bond(await advance(p, 1)).closeness, 0);
});
assert.equal(failures, 0, `${failures} relationship checks failed (${checks} passed)`);
console.log(`Relationship decay audit passed (${checks} checks).`);
