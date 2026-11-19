import type { CinemaAudienceCell } from './boxOfficeTypes';

/* 19 Nov 2026 (debt plan v2, Zeesh: "Pehle save fix"): how the cinema's audience cells are stored on disk.

   A running film keeps one cell per audience group (2,363 in a late career). Most of them hold nothing: no one in
   that group has heard of a rival's film (98% of a late career's cells). Many others hold one number: how many
   people in the group have heard of it and nothing else (most cells of a player's own film, which its marketing takes
   to every group). Rivals that are no longer broke keep more films running, so these cells made a late save about 4%
   bigger. On disk such a cell is now kept as at most its one number, and it is rebuilt exactly when the save is read.
   The game itself always sees every cell, with the same keys in the same order and the same values.

   - Storage only. indexedDbSaveGenerations.ts packs a player just before it is written, and savePayloadBlocks.ts
     expands it right after it is read, before the stored copy is checked. The save's integrity hash is taken on the
     complete cells, so a cell rebuilt in any other way fails that check and the copy is not trusted.
   - A cell is packed only when it has exactly one of the two shapes below, holds nothing but its group and
     awarePeople, and has the same lastChoiceWeek as that film's first such cell. Every other cell, and any film or
     market in an unexpected shape, is stored as it is.
   - The groups' order is stored once per save (the films run in the same week share it). Each film stores the
     positions of the cells it keeps whole, and the position and awarePeople of each packed cell whose awarePeople
     is not 0.
   - Exports, the Week Ahead hand-over and the game's memory never see the packed form.
   - Zeesh, 19 Nov ("Pehle sirf padhna"): 1.0.30 ships the reader only and still writes cells whole. Writing is turned
     on in 1.0.31 (CINEMA_CELL_PACKING_WRITES below), so any rollback build from 1.0.30 on can open what 1.0.31 writes.
     1.0.29 and older cannot read the packed form: they would fail its integrity check. */

/** Off in 1.0.30, the reader-only release; turn on from 1.0.31. Reading is always on, whatever this says, so a build
 *  that stops writing the packed form can still open the saves an earlier build wrote. */
export const CINEMA_CELL_PACKING_WRITES = false;

const ORDERS_KEY = '$packedCellOrders';
const TITLE_KEY = '$packedCells';

const CELL_SHAPES: readonly (readonly string[])[] = [
    /* as built each week (boxOfficeAudience.ts), with its two unset fields present */
    ['cohortId', 'awarePeople', 'seenBands', 'deferredPeople', 'pendingLocalFootfall', 'lastAppliedLocalFootfallWeek',
        'lastDiscoveryWeek', 'lastChoiceWeek', 'discoveryContactsUsed'],
    /* the same cell after a plain JSON copy (an imported save), which drops unset fields */
    ['cohortId', 'awarePeople', 'seenBands', 'deferredPeople', 'lastDiscoveryWeek', 'lastChoiceWeek', 'discoveryContactsUsed'],
];

/** keep: positions of the cells stored whole; aware: [position, awarePeople] pairs, flattened, for packed cells
 *  whose awarePeople is not 0. Both run in position order. */
interface PackedCells { order: number; shape: number; week: number; keep: number[]; aware: number[] }
type Row = Record<string, unknown>;

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const isPlainObject = (value: unknown): value is Row => Boolean(value) && typeof value === 'object'
    && Object.getPrototypeOf(value) === Object.prototype;
/** A dense, ordinary array with no extra named properties: stored exactly as its items. */
const isPlainArray = (value: unknown): value is unknown[] => {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
    for (let index = 0; index < value.length; index++) if (!(index in value)) return false;
    return Object.keys(value).length === value.length;
};
const isZero = (value: unknown) => value === 0 && !Object.is(value, -0);
const isAmount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0);
const isWeek = (value: unknown): value is number => Number.isSafeInteger(value) && !Object.is(value, -0);

/** The shape this cell has exactly (its index in CELL_SHAPES) when it holds nothing but its group and awarePeople;
 *  otherwise -1. */
const packableShapeOf = (cell: Row): number => {
    if (!isAmount(cell.awarePeople) || !isZero(cell.deferredPeople) || cell.lastDiscoveryWeek !== -1 || !isZero(cell.discoveryContactsUsed)
        || !isWeek(cell.lastChoiceWeek) || cell.pendingLocalFootfall !== undefined || cell.lastAppliedLocalFootfallWeek !== undefined) return -1;
    const bands = cell.seenBands;
    if (!Array.isArray(bands) || bands.length !== 0 || Object.getPrototypeOf(bands) !== Array.prototype || Object.keys(bands).length !== 0) return -1;
    const keys = Object.keys(cell);
    for (let shape = 0; shape < CELL_SHAPES.length; shape++) {
        const expected = CELL_SHAPES[shape];
        if (keys.length === expected.length && keys.every((key, index) => key === expected[index])) return shape;
    }
    return -1;
};

const rebuiltCell = (shape: number, cohortId: string, awarePeople: number, week: number): CinemaAudienceCell => shape === 0
    ? { cohortId, awarePeople, seenBands: [], deferredPeople: 0, pendingLocalFootfall: undefined, lastAppliedLocalFootfallWeek: undefined,
        lastDiscoveryWeek: -1, lastChoiceWeek: week, discoveryContactsUsed: 0 }
    : { cohortId, awarePeople, seenBands: [], deferredPeople: 0, lastDiscoveryWeek: -1, lastChoiceWeek: week, discoveryContactsUsed: 0 };

const packTitle = (title: unknown, orderOf: (ids: string[]) => number): unknown => {
    if (!isPlainObject(title) || hasOwn(title, TITLE_KEY) || !isPlainArray(title.cells)) return title;
    const cells = title.cells, ids: string[] = new Array(cells.length), shapes = new Int8Array(cells.length);
    let shape = -1, week = 0;
    for (let index = 0; index < cells.length; index++) {
        const cell = cells[index];
        if (!isPlainObject(cell) || typeof cell.cohortId !== 'string') return title;
        ids[index] = cell.cohortId;
        shapes[index] = packableShapeOf(cell);
        if (shape < 0 && shapes[index] >= 0) { shape = shapes[index]; week = cell.lastChoiceWeek as number; }
    }
    if (shape < 0) return title;
    const kept: unknown[] = [], keep: number[] = [], aware: number[] = [];
    for (let index = 0; index < cells.length; index++) {
        const cell = cells[index] as Row;
        if (shapes[index] === shape && cell.lastChoiceWeek === week) {
            if (cell.awarePeople !== 0) aware.push(index, cell.awarePeople as number);
        } else { kept.push(cell); keep.push(index); }
    }
    const packed: PackedCells = { order: orderOf(ids), shape, week, keep, aware };
    return { ...title, cells: kept, [TITLE_KEY]: packed };
};

const sameIds = (left: readonly string[], right: readonly string[]) => {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return false;
    return true;
};

/** The cinema state as it is stored: the same object when nothing can be packed. */
export const packCinemaCellsForStorage = <T>(state: T): T => {
    if (!isPlainObject(state) || !isPlainObject(state.market)) return state;
    const market = state.market;
    if (hasOwn(market, ORDERS_KEY) || !isPlainArray(market.titles)) return state;
    const orders: string[][] = [], byEnds = new Map<string, number[]>();
    const orderOf = (ids: string[]) => {
        const ends = `${ids.length}|${ids[0] ?? ''}|${ids[ids.length - 1] ?? ''}`;
        const candidates = byEnds.get(ends) || [];
        for (const index of candidates) if (sameIds(orders[index], ids)) return index;
        orders.push(ids); candidates.push(orders.length - 1); byEnds.set(ends, candidates);
        return orders.length - 1;
    };
    let changed = false;
    const titles = market.titles.map(title => {
        const packed = packTitle(title, orderOf);
        if (packed !== title) changed = true;
        return packed;
    });
    if (!changed) return state;
    return { ...state, market: { ...market, titles, [ORDERS_KEY]: orders } } as T;
};

const fail: (why: string) => never = why => { throw new Error(`Stored cinema cells are damaged: ${why}`); };

const expandTitle = (title: unknown, orders: readonly string[][]): unknown => {
    if (!isPlainObject(title) || !hasOwn(title, TITLE_KEY)) return title;
    const { [TITLE_KEY]: pack, ...rest } = title as Row & { [TITLE_KEY]: PackedCells };
    if (!isPlainObject(pack) || !Number.isSafeInteger(pack.order) || pack.order < 0 || pack.order >= orders.length) fail('order');
    if (pack.shape !== 0 && pack.shape !== 1) fail('shape');
    if (!isWeek(pack.week)) fail('week');
    const ids = orders[pack.order], kept = rest.cells, keep = pack.keep, aware = pack.aware;
    if (!isPlainArray(kept) || !isPlainArray(keep) || keep.length !== kept.length) fail('kept cells');
    if (!isPlainArray(aware) || aware.length % 2 !== 0) fail('aware cells');
    const cells: unknown[] = [];
    let next = 0, nextAware = 0;
    for (let index = 0; index < ids.length; index++) {
        if (next < keep.length && keep[next] === index) {
            const cell = kept[next];
            if (!isPlainObject(cell) || cell.cohortId !== ids[index]) fail('kept cell group');
            cells.push(cell); next++;
        } else if (nextAware < aware.length && aware[nextAware] === index) {
            const people = aware[nextAware + 1];
            if (!isAmount(people) || people === 0) fail('aware people');
            cells.push(rebuiltCell(pack.shape, ids[index], people, pack.week)); nextAware += 2;
        } else cells.push(rebuiltCell(pack.shape, ids[index], 0, pack.week));
    }
    if (next !== keep.length || nextAware !== aware.length) fail('cell positions');
    rest.cells = cells;
    return rest;
};

/** The cinema state the game uses, rebuilt from its stored form: the same object when it was not packed. */
export const expandCinemaCellsFromStorage = <T>(state: T): T => {
    if (!isPlainObject(state) || !isPlainObject(state.market) || !hasOwn(state.market, ORDERS_KEY)) return state;
    const { [ORDERS_KEY]: orders, ...market } = state.market;
    if (!isPlainArray(orders) || !orders.every(ids => isPlainArray(ids) && ids.every(id => typeof id === 'string'))) fail('group orders');
    if (!isPlainArray(market.titles)) fail('titles');
    market.titles = (market.titles as unknown[]).map(title => expandTitle(title, orders as string[][]));
    return { ...state, market } as T;
};

const cinemaOf = (player: unknown): unknown => isPlainObject(player) && isPlainObject(player.world) ? player.world.cinemaMarket : undefined;

/** The player in the packed form (a shallow copy along world.cinemaMarket), or the same object when nothing packs.
 *  Always packs: the store goes through packPlayerCinemaCellsForStorage, which honours the switch. */
export const packPlayerCinemaCells = <T>(player: T): T => {
    const state = cinemaOf(player);
    if (state === undefined) return player;
    const packed = packCinemaCellsForStorage(state);
    if (packed === state) return player;
    const row = player as unknown as Row;
    return { ...row, world: { ...(row.world as Row), cinemaMarket: packed } } as T;
};

/** The player as the store writes it: packed when CINEMA_CELL_PACKING_WRITES is on, otherwise the same object. */
export const packPlayerCinemaCellsForStorage = <T>(player: T): T => (CINEMA_CELL_PACKING_WRITES ? packPlayerCinemaCells(player) : player);

/** The player the game uses, from a stored copy: the same object when its cells were stored whole. */
export const expandPlayerCinemaCellsFromStorage = <T>(player: T): T => {
    const state = cinemaOf(player);
    if (state === undefined) return player;
    const expanded = expandCinemaCellsFromStorage(state);
    if (expanded === state) return player;
    const row = player as unknown as Row;
    return { ...row, world: { ...(row.world as Row), cinemaMarket: expanded } } as T;
};
