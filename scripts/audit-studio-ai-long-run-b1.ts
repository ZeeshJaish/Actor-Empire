import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { INITIAL_PLAYER, type NpcVentureState, type Player, type WorldState } from '../types';
import { normalizeWorldStudioAiForSave, processStudioAiWeek } from '../services/studioAi';

const TOTAL_WEEKS = 400 * 52;
const ACQUISITION_WEEK = Math.floor(TOTAL_WEEKS / 2);

const venture = (id: string, status: 'ACTIVE' | 'CLOSED'): NpcVentureState => ({
    id,
    name: status === 'ACTIVE' ? 'Northstar Storyworks' : 'Archive House',
    ownerNpcId: `${id}_founder`,
    ownerName: status === 'ACTIVE' ? 'Mira Vale' : 'Jon Reed',
    archetype: status === 'ACTIVE' ? 'PRESTIGE_LABEL' : 'GENRE_HOUSE',
    status,
    valuation: status === 'ACTIVE' ? 0.7 : 0.02,
    cashReserve: status === 'ACTIVE' ? 90 : 0,
    hype: status === 'ACTIVE' ? 68 : 8,
    reputation: status === 'ACTIVE' ? 65 : 29,
    creativeQuality: 72,
    risk: 48,
    foundedWeek: 3,
    foundedYear: 22,
    lastProjectWeek: 30,
    nextProjectWeek: 46,
    projectsReleased: 3,
    hits: 1,
    flops: status === 'ACTIVE' ? 1 : 3,
    history: [],
    closureReason: status === 'CLOSED' ? 'The slate could not secure financing.' : undefined,
});

const createFixture = () => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = 'studio-ai-long-run';
    player.businesses = [];
    player.flags = { ...player.flags, studioAcquisitionCases: [] };
    player.world = {
        ...player.world,
        projects: [],
        studios: {
            REGIONAL_LONG_RUN: {
                id: 'REGIONAL_LONG_RUN',
                name: 'Regional Long Run Films',
                valuation: 0.25,
                reputation: 52,
                cashReserve: 40,
                recentHits: 0,
                archetype: 'EMERGENT',
            },
        },
        npcVentures: {
            venture_active: venture('venture_active', 'ACTIVE'),
            venture_closed: venture('venture_closed', 'CLOSED'),
        },
    } as WorldState;
    player.world = normalizeWorldStudioAiForSave(player, player.world, 0);
    return player;
};

const run = () => {
    const player = createFixture();
    const originalCompanyCount = Object.keys(player.world.studios || {}).length;
    let acquiredCash: number | null = null;
    for (let absoluteWeek = 1; absoluteWeek <= TOTAL_WEEKS; absoluteWeek += 1) {
        player.age = Math.floor(absoluteWeek / 52) + 18;
        player.currentWeek = (absoluteWeek % 52) + 1;
        if (absoluteWeek === ACQUISITION_WEEK) {
            player.businesses.push({ id: 'REGIONAL_LONG_RUN', type: 'PRODUCTION_HOUSE' } as Player['businesses'][number]);
        }
        const result = processStudioAiWeek(player, player.world, absoluteWeek);
        player.world = result.world;
        if (absoluteWeek === ACQUISITION_WEEK) acquiredCash = player.world.studios?.REGIONAL_LONG_RUN.cashReserve || 0;
        if (absoluteWeek > ACQUISITION_WEEK) {
            assert.equal(player.world.studios?.REGIONAL_LONG_RUN.cashReserve, acquiredCash, 'AI finance must stop after player acquisition');
        }
    }
    assert.equal(Object.keys(player.world.studios || {}).length, originalCompanyCount, 'B1 must not leak or duplicate companies over time');
    return player;
};

const started = performance.now();
const first = run();
const durationMs = performance.now() - started;
const second = run();
assert.deepEqual(second.world.studios, first.world.studios, '400-year B1 simulation must be deterministic');

for (const studio of Object.values(first.world.studios || {})) {
    assert.ok(Number.isFinite(studio.cashReserve) && studio.cashReserve >= 0, `${studio.id} cash must remain finite`);
    assert.ok(Number.isFinite(studio.valuation) && studio.valuation > 0, `${studio.id} valuation must remain finite`);
    assert.ok(Number.isFinite(studio.ai?.finance.debtPrincipalMillions), `${studio.id} debt must remain finite`);
    assert.ok(Number.isFinite(studio.ai?.finance.runwayWeeks), `${studio.id} runway must remain finite`);
    assert.ok((studio.ai?.ledger.length || 0) <= 104, `${studio.id} ledger must remain bounded`);
    assert.ok((studio.ai?.events.length || 0) <= 48, `${studio.id} event history must remain bounded`);
    assert.equal(new Set((studio.ai?.ledger || []).map(entry => entry.id)).size, studio.ai?.ledger.length || 0, `${studio.id} ledger IDs must remain unique`);
}
assert.equal(first.world.studios?.venture_closed.ai?.status, 'CLOSED', 'closed-company history must remain terminal and present');
assert.equal(first.world.studios?.REGIONAL_LONG_RUN.ai?.controller, 'PLAYER');
assert.ok(durationMs < 15_000, `400-year B1 foundation run exceeded the 15s budget (${durationMs.toFixed(0)}ms)`);

const serializedBytes = Buffer.byteLength(JSON.stringify(first.world.studios));
console.log(JSON.stringify({
    result: 'PASS',
    years: 400,
    weeks: TOTAL_WEEKS,
    companies: Object.keys(first.world.studios || {}).length,
    durationMs: Math.round(durationMs),
    serializedStudioBytes: serializedBytes,
    maxLedgerEntries: Math.max(...Object.values(first.world.studios || {}).map(studio => studio.ai?.ledger.length || 0)),
}, null, 2));
