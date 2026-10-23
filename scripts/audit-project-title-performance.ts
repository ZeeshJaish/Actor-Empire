import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { INITIAL_PLAYER, type IndustryProject } from '../types';
import { allocateProjectTitle, createProjectTitleReservations, initializeRecentProjectTitles, normalizeRecentProjectTitles, rememberProjectTitles, projectTitleKey } from '../services/projectTitleGeneration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createDeterministicRng } from '../services/deterministicRandom';
import { compareProtectedSaveState } from '../services/saveIntegrity';

const player = structuredClone(INITIAL_PLAYER);
player.age = 40; player.currentWeek = 12;
const now = getAbsoluteWeek(player.age, player.currentWeek);
const rawTitle = allocateProjectTitle(new Set(), () => 0);
let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log('PASS', name); }
check('recent names expire at 104 weeks while live projects and franchises remain reserved', () => {
    const p = structuredClone(player);
    p.world.recentProjectTitles = { schemaVersion: 1, entries: [{ title: rawTitle, week: now - 103 }] };
    assert.ok(createProjectTitleReservations(p, p.world, now).has(projectTitleKey(rawTitle)));
    assert.ok(!createProjectTitleReservations(p, p.world, now + 1).has(projectTitleKey(rawTitle)));
    p.commitments = [{ id: 'live', type: 'ACTING_GIG', name: rawTitle }] as any;
    assert.ok(createProjectTitleReservations(p, p.world, now + 500).has(projectTitleKey(rawTitle)));
    p.commitments = [];
    p.activeUniverseContract = { films: [{ title: rawTitle }] } as any;
    assert.ok(createProjectTitleReservations(p, p.world, now + 500).has(projectTitleKey(rawTitle)));
});
check('remembering an existing live name never refreshes its creation timestamp', () => {
    const p = structuredClone(player);
    p.world.recentProjectTitles = { schemaVersion: 1, entries: [{ title: rawTitle, week: now - 103 }] };
    const world = rememberProjectTitles(p.world, [rawTitle, rawTitle.toUpperCase()], now);
    assert.equal(world.recentProjectTitles!.entries[0].week, now - 103);
    assert.equal(normalizeRecentProjectTitles(world.recentProjectTitles, now + 1).entries.length, 0);
    assert.deepEqual(compareProtectedSaveState(p, { ...p, world }), { ok: true });
});
check('immutable world updates invalidate production-title indexes', () => {
    const p = structuredClone(player);
    p.world.industryProductions = {};
    assert.ok(!createProjectTitleReservations(p).has(projectTitleKey(rawTitle)));
    const world = { ...p.world, industryProductions: { live: { title: rawTitle, status: 'PRODUCTION' } as any } };
    assert.ok(createProjectTitleReservations(p, world).has(projectTitleKey(rawTitle)));
});
check('a legacy naming bootstrap inspects no more than 1024 archive entries', () => {
    const p = structuredClone(player);
    p.pastProjects = Array.from({ length: 5000 }, (_, i) => ({ id: `archive-${i}`, name: `Archive ${i}`, year: 39 })) as any;
    Object.defineProperty(p.pastProjects[0], 'name', { get() { throw Error('Unbounded archive bootstrap'); } });
    const memory = initializeRecentProjectTitles(p, now);
    assert.equal(memory.entries.length, 1024);
    assert.equal(memory.entries[0].title, 'Archive 3976');
});

// Crowded-world fixture: many retained old releases, live productions and a full recent buffer.
player.world.projects = Array.from({ length: 20_000 }, (_, i) => ({
    id: `world-${i}`, title: `Retained World ${i}`, year: i < 19_500 ? 20 : 40, weekReleased: 1,
} as IndustryProject));
player.world.industryProductions = Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [
    `production-${i}`, { id: `production-${i}`, title: `Active Production ${i}`, status: 'PRODUCTION' } as any,
]));
player.world.recentProjectTitles = { schemaVersion: 1, entries: Array.from({ length: 1024 }, (_, i) => ({ title: `Recently Reserved ${i}`, week: now - (i % 104) })) };
Object.defineProperty(player, 'pastProjects', { get() { throw Error('Naming must not scan the complete 100k-film career archive'); } });
Object.defineProperty(player.world, 'historicalCatalogue', { get() { throw Error('Naming must not materialize the virtual historical catalogue'); } });
const milliseconds: number[] = [];
let reservedCount = 0;
const coldStart = performance.now();
const first = createProjectTitleReservations(player);
const coldMilliseconds = performance.now() - coldStart;
reservedCount = first.size;
for (let run = 0; run < 100; run++) {
    const started = performance.now();
    const reserved = createProjectTitleReservations(player);
    const rng = createDeterministicRng(`crowded-title-batch:${run}`);
    const generated = Array.from({ length: 25 }, () => allocateProjectTitle(reserved, rng, 'SCI_FI'));
    assert.equal(new Set(generated).size, 25);
    const remembered = rememberProjectTitles(player.world, generated, now);
    assert.equal(remembered.recentProjectTitles!.entries.length, 1024);
    assert.ok(remembered.recentProjectTitles!.entries.slice(-25).every(row => row.week === now));
    milliseconds.push(performance.now() - started);
}
const ordered = [...milliseconds].sort((a, b) => a - b);
const report = {
    scope: 'Batch title allocation and bounded memory update only; not a full Next Week or mobile frame-time benchmark',
    worldProjects: 20_000, activeProductions: 5000, recentEntries: 1024, reservationKeys: reservedCount,
    runs: 100, generatedPerBatch: 25, coldMilliseconds,
    warmMedianMilliseconds: ordered[49], warmP95Milliseconds: ordered[94], warmMaxMilliseconds: ordered[99],
    namingMemoryBytes: Buffer.byteLength(JSON.stringify(player.world.recentProjectTitles)),
    noCareerArchiveOrHistoricalCatalogueReads: true, checks,
};
assert.ok(report.warmP95Milliseconds < 50, 'Naming 25 projects should stay within the local 50ms regression guard');
assert.ok(report.namingMemoryBytes < 150_000);
if (process.env.TITLE_PERFORMANCE_REPORT) writeFileSync(process.env.TITLE_PERFORMANCE_REPORT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
