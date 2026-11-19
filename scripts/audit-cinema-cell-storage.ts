/**
 * 19 Nov 2026 (save fix): the cinema's empty and aware-only audience cells are packed when a save is stored and rebuilt
 * when it is read (services/boxOffice/boxOfficeCellStorage.ts). This audit holds the two promises that make that safe:
 * - exact: a packed state, stored (structured clone or the tagged JSON blocks) and rebuilt, is the original, with the
 *   same keys in the same order, the same values, unset fields included, and the original is never changed;
 * - strict: any other cell is stored whole, and a packed form that does not fit together is a damaged save
 *   (SavePayloadCorruptionError through materializeSaveRecord), never a quietly different one.
 * It also checks that the cells the game builds each week are still the shape the packer knows, so the saving cannot
 * silently stop if that shape changes. The codec is tested with packPlayerCinemaCells, which always packs; part 0 checks
 * the write switch (off in 1.0.30, the reader-only release).
 */
import assert from 'node:assert/strict';
import {
    CINEMA_CELL_PACKING_WRITES,
    expandCinemaCellsFromStorage,
    expandPlayerCinemaCellsFromStorage,
    packCinemaCellsForStorage,
    packPlayerCinemaCells,
    packPlayerCinemaCellsForStorage,
} from '../services/boxOffice/boxOfficeCellStorage';
import { materializeSaveRecord, parseSaveBlock, SavePayloadCorruptionError, serializeSaveBlock } from '../services/savePayloadBlocks';
import { buildCinemaAudienceSnapshot } from '../services/boxOffice/boxOfficeAudience';
import { CINEMA_MARKET_SCENARIOS, makeCinemaMarketFixture } from './fixtures/boxOfficeScenarios';

const pass = (label: string) => console.log(`✓ ${label}`);

/** Same keys in the same order (own, enumerable, unset ones included), same prototypes and the same values (-0 too). */
const sameExactly = (a: any, b: any, path = '$'): void => {
    if (Object.is(a, b)) return;
    assert.ok(a !== null && b !== null && typeof a === 'object' && typeof b === 'object', `${path}: ${String(a)} vs ${String(b)}`);
    assert.equal(Array.isArray(a), Array.isArray(b), `${path}: array or not`);
    assert.equal(Object.getPrototypeOf(a), Object.getPrototypeOf(b), `${path}: prototype`);
    assert.deepEqual(Object.keys(a), Object.keys(b), `${path}: keys`);
    for (const key of Object.keys(a)) sameExactly(a[key], b[key], `${path}.${key}`);
};

const WEEK = 2091;
const GROUPS = ['US:US:AFFLUENT:FANDOM_LOYALISTS', 'IN:IN:MASS:FAMILY', 'BR:BR:YOUTH:CASUAL', 'FR:FR:AFFLUENT:CINEPHILE', 'JP:JP:MASS:FANDOM_LOYALISTS', 'NG:NG:YOUTH:FAMILY'];
/* the cell as the week builds it (boxOfficeAudience.ts), with its two unset fields present */
const fresh = (cohortId: string, awarePeople = 0, week = WEEK) => ({ cohortId, awarePeople, seenBands: [], deferredPeople: 0, pendingLocalFootfall: undefined,
    lastAppliedLocalFootfallWeek: undefined, lastDiscoveryWeek: -1, lastChoiceWeek: week, discoveryContactsUsed: 0 });
/* the same cell after a plain JSON copy */
const imported = (cohortId: string, awarePeople = 0, week = WEEK) => ({ cohortId, awarePeople, seenBands: [], deferredPeople: 0, lastDiscoveryWeek: -1,
    lastChoiceWeek: week, discoveryContactsUsed: 0 });
const watched = (cohortId: string) => ({ cohortId, awarePeople: 5000, seenBands: [{ people: 300, satisfaction: 61, repeatAdmissions: 4, lastViewedWeek: WEEK }],
    deferredPeople: 20, pendingLocalFootfall: { absoluteWeek: WEEK, otherFilmAdmissions: 12 }, lastAppliedLocalFootfallWeek: WEEK - 1, lastDiscoveryWeek: WEEK,
    lastChoiceWeek: WEEK, discoveryContactsUsed: 40 });
const title = (titleId: string, cells: unknown[]) => ({ titleId, ownerId: 'WARNER_BROS', cast: [{ personId: 'p1', roleWeight: 1, characterIds: [] }],
    universeId: undefined, releaseWeek: WEEK - 3, appliedExposureIds: ['e1'], cells });

const holey: unknown[] = [fresh(GROUPS[0]), fresh(GROUPS[1])];
delete holey[1];
const makeState = () => {
    const [us, inn, br, fr, jp, ng] = GROUPS;
    return {
        bookingContracts: {}, schemaVersion: 1, tuningVersion: 3, clockEpoch: 0, activationWeek: 2000, lastProcessedAbsoluteWeek: WEEK,
        market: {
            schemaVersion: 1, tuningVersion: 3, lastProcessedAbsoluteWeek: WEEK, cohortPopulations: { [us]: 1_000_000 },
            titles: [
                /* a rival's film: empty, aware-only (whole and fractional) and one watched cell */
                title('rival', [fresh(us), fresh(inn, 1605), watched(br), fresh(fr), fresh(jp, 0.5), fresh(ng)]),
                /* imported shape, with cells that must stay whole: -0, another week, an extra key, other key order, a set field */
                title('imported', [imported(us), imported(inn, -0), imported(br, 0, WEEK - 1), { ...imported(fr), extra: 1 },
                    { awarePeople: 0, cohortId: jp, seenBands: [], deferredPeople: 0, lastDiscoveryWeek: -1, lastChoiceWeek: WEEK, discoveryContactsUsed: 0 },
                    { ...imported(ng), lastAppliedLocalFootfallWeek: WEEK - 2 }]),
                /* the same groups in another order: a second stored order */
                title('reversed', GROUPS.slice().reverse().map(id => fresh(id, id === fr ? 12 : 0))),
                /* the first order again: reuses order 0 */
                title('again', GROUPS.map(id => fresh(id))),
                /* nothing to pack */
                title('all-watched', GROUPS.map(id => watched(id))),
                title('no-cells', []),
                title('holey', holey),
            ],
            affinities: [], runs: [{ titleId: 'rival', poolId: 'p', quietWeeks: 0, closed: false }],
        },
        titles: {}, weeks: [],
    };
};
const makePlayer = () => ({ id: 'p', name: 'Audit', age: 40, currentWeek: 12, world: { before: 1, cinemaMarket: makeState(), after: 2 }, flags: {} });

/* 0. The switch: the store writes the packed form only while CINEMA_CELL_PACKING_WRITES is on (off in 1.0.30, the
   reader-only release; on from 1.0.31). Reading never depends on it. */
{
    const player = makePlayer();
    const written: any = packPlayerCinemaCellsForStorage(player);
    if (CINEMA_CELL_PACKING_WRITES) sameExactly(written, packPlayerCinemaCells(player));
    else assert.equal(written, player);
    sameExactly(expandPlayerCinemaCellsFromStorage(structuredClone(packPlayerCinemaCells(player))), player);
    pass(`the store ${CINEMA_CELL_PACKING_WRITES ? 'writes the packed form' : 'writes cells whole (reader-only release)'}, and reads the packed form either way`);
}

/* 1. Packing: the original is untouched, what can be packed is, the rest is the very same object */
{
    const player = makePlayer(), snapshot = structuredClone(player);
    const packed: any = packPlayerCinemaCells(player);
    sameExactly(player, snapshot);
    assert.notEqual(packed, player);
    assert.deepEqual(Object.keys(packed), Object.keys(player));
    assert.deepEqual(Object.keys(packed.world), Object.keys(player.world));
    const market = packed.world.cinemaMarket.market, titles = market.titles;
    assert.equal(market.$packedCellOrders.length, 2);
    assert.deepEqual(titles.map((t: any) => Boolean(t.$packedCells)), [true, true, true, true, false, false, false]);
    for (const index of [4, 5, 6]) assert.equal(titles[index], player.world.cinemaMarket.market.titles[index]);
    assert.deepEqual(titles[0].$packedCells, { order: 0, shape: 0, week: WEEK, keep: [2], aware: [1, 1605, 4, 0.5] });
    assert.deepEqual(titles[1].$packedCells.keep, [1, 2, 3, 4, 5]);
    assert.equal(titles[1].$packedCells.shape, 1);
    assert.equal(titles[2].$packedCells.order, 1);
    assert.equal(titles[3].$packedCells.order, 0);
    assert.equal(titles[3].cells.length, 0);
    pass('packing leaves the original untouched, keeps unusual cells whole and reuses group orders');
}

/* 2. Exact round trips through both stored forms */
{
    const player = makePlayer();
    const packed = packPlayerCinemaCells(player);
    const viaClone = expandPlayerCinemaCellsFromStorage(structuredClone(packed));
    sameExactly(viaClone, player);
    const blocks = expandPlayerCinemaCellsFromStorage(parseSaveBlock(serializeSaveBlock(packed)));
    sameExactly(blocks, parseSaveBlock(serializeSaveBlock(player)));
    const rival = (viaClone as any).world.cinemaMarket.market.titles[0].cells[0];
    assert.ok(Object.prototype.hasOwnProperty.call(rival, 'pendingLocalFootfall') && rival.pendingLocalFootfall === undefined);
    assert.ok(!Object.prototype.hasOwnProperty.call((viaClone as any).world.cinemaMarket.market.titles[1].cells[0], 'pendingLocalFootfall'));
    assert.ok(Object.is((viaClone as any).world.cinemaMarket.market.titles[1].cells[1].awarePeople, -0));
    assert.equal((viaClone as any).world.cinemaMarket.market.titles[6].cells.length, 2);
    assert.ok(!(1 in (viaClone as any).world.cinemaMarket.market.titles[6].cells));
    pass('a packed save, stored as a structured clone or as tagged JSON blocks, rebuilds exactly');
}

/* 3. Same object where there is nothing to do */
{
    const player = makePlayer();
    const packed = packPlayerCinemaCells(player);
    assert.equal(packPlayerCinemaCells(packed), packed);
    assert.equal(expandPlayerCinemaCellsFromStorage(player), player);
    const bare = { id: 'b', name: 'Bare', world: {} };
    assert.equal(packPlayerCinemaCells(bare), bare);
    assert.equal(expandPlayerCinemaCellsFromStorage(bare), bare);
    assert.equal(packCinemaCellsForStorage(null), null);
    assert.equal(expandCinemaCellsFromStorage(undefined), undefined);
    const watchedOnly = { ...makeState(), market: { ...makeState().market, titles: [title('w', GROUPS.map(id => watched(id)))] } };
    assert.equal(packCinemaCellsForStorage(watchedOnly), watchedOnly);
    pass('nothing to pack, already packed or not packed: the same object back');
}

/* 4. A packed form that does not fit together is a damaged save */
{
    const damage: Array<[string, (m: any) => void]> = [
        ['order out of range', m => { m.titles[0].$packedCells.order = 5; }],
        ['unknown shape', m => { m.titles[0].$packedCells.shape = 2; }],
        ['week not a whole number', m => { m.titles[0].$packedCells.week = 1.5; }],
        ['kept cell in another group', m => { m.titles[0].cells[0].cohortId = 'XX'; }],
        ['kept positions out of order', m => { m.titles[1].$packedCells.keep = [2, 1, 3, 4, 5]; }],
        ['fewer kept cells than positions', m => { m.titles[1].cells.pop(); }],
        ['aware people of 0', m => { m.titles[0].$packedCells.aware[1] = 0; }],
        ['aware position also kept', m => { m.titles[0].$packedCells.aware = [2, 7]; }],
        ['aware position past the end', m => { m.titles[0].$packedCells.aware = [1, 1605, 4, 0.5, 9, 3]; }],
        ['a group order with a number', m => { m.$packedCellOrders[0][2] = 7; }],
        ['titles not a list', m => { m.titles = {}; }],
    ];
    for (const [why, hurt] of damage) {
        const packed: any = structuredClone(packPlayerCinemaCells(makePlayer()));
        hurt(packed.world.cinemaMarket.market);
        assert.throws(() => expandPlayerCinemaCellsFromStorage(packed), /Stored cinema cells are damaged/, why);
    }
    pass(`${damage.length} kinds of damage are refused`);
}

/* 5. The save reader rebuilds every stored player and refuses damage as a bad payload */
{
    const player = makePlayer();
    const packed = structuredClone(packPlayerCinemaCells(player));
    sameExactly(await materializeSaveRecord(packed), player);
    const record = await materializeSaveRecord({ kind: 'ACTOR_EMPIRE_SAVE_GENERATION', formatVersion: 1, player: packed, manifest: { digest: 'd' }, needsRecoveryCheckpoint: false });
    sameExactly(record.player, player);
    assert.deepEqual(record.manifest, { digest: 'd' });
    const manifest = { digest: 'x', fields: {} };
    assert.equal(await materializeSaveRecord(manifest), manifest);
    assert.equal(await materializeSaveRecord(null), null);
    const broken: any = structuredClone(packed);
    broken.world.cinemaMarket.market.titles[0].$packedCells.keep = [99];
    await assert.rejects(materializeSaveRecord(broken), SavePayloadCorruptionError);
    await assert.rejects(materializeSaveRecord({ kind: 'ACTOR_EMPIRE_SAVE_GENERATION', formatVersion: 1, player: broken, manifest }), SavePayloadCorruptionError);
    pass('materializeSaveRecord rebuilds stored players and turns damage into SavePayloadCorruptionError');
}

/* 6. The cells the game builds each week are the shape the packer knows */
{
    let allCells = 0, allPackable = 0;
    for (const scenario of CINEMA_MARKET_SCENARIOS) {
        const fixture = makeCinemaMarketFixture(scenario);
        let market: any = fixture.marketState || { schemaVersion: 1, tuningVersion: 1, lastProcessedAbsoluteWeek: 99, titles: [], affinities: [], runs: [] };
        for (let week = 0; week < 6; week++) {
            const snapshot = buildCinemaAudienceSnapshot({ ...fixture, absoluteWeek: 100 + week, marketState: market });
            market = { ...market, lastProcessedAbsoluteWeek: 100 + week, titles: snapshot.titles };
        }
        const cells = market.titles.flatMap((t: any) => t.cells);
        const packable = cells.filter((c: any) => c.seenBands.length === 0 && c.deferredPeople === 0 && c.lastDiscoveryWeek === -1 && !c.discoveryContactsUsed
            && c.pendingLocalFootfall === undefined && c.lastAppliedLocalFootfallWeek === undefined);
        const state = { schemaVersion: 1, tuningVersion: 1, clockEpoch: 0, activationWeek: 100, lastProcessedAbsoluteWeek: 105, market, titles: {}, weeks: [] };
        const packed: any = packCinemaCellsForStorage(state);
        const stored = packed.market.titles.reduce((n: number, t: any) => n + t.cells.length, 0);
        assert.equal(stored, cells.length - packable.length, `${scenario}: every cell the week builds with nothing but awareness is packed`);
        sameExactly(expandCinemaCellsFromStorage(structuredClone(packed)), state);
        allCells += cells.length; allPackable += packable.length;
    }
    assert.ok(allPackable > 0, `the fixtures should build cells with nothing but awareness (${allPackable}/${allCells})`);
    pass(`the week's own cells pack (${allPackable} of ${allCells} over ${CINEMA_MARKET_SCENARIOS.length} market scenarios) and rebuild exactly`);
}

console.log('Cinema cell storage audit passed.');
