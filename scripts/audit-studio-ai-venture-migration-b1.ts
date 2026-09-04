import assert from 'node:assert/strict';
import type { NpcVentureState, WorldState } from '../types';
import { syncNpcVenturesToStudios } from '../services/npcVentureLogic';

const makeVenture = (status: 'ACTIVE' | 'CLOSED'): NpcVentureState => ({
    id: `venture_${status.toLowerCase()}`,
    name: `${status} Pictures`,
    ownerNpcId: `founder_${status.toLowerCase()}`,
    ownerName: `${status} Founder`,
    archetype: 'GENRE_HOUSE',
    status,
    valuation: status === 'ACTIVE' ? 0.18 : 0.02,
    cashReserve: status === 'ACTIVE' ? 32 : -4,
    hype: 45,
    reputation: 51,
    creativeQuality: 68,
    risk: 62,
    foundedWeek: 5,
    foundedYear: 22,
    lastProjectWeek: 20,
    nextProjectWeek: 33,
    projectsReleased: 3,
    hits: 1,
    flops: 2,
    history: [{
        id: `project_${status.toLowerCase()}`,
        title: `${status} Legacy`,
        week: 20,
        year: 23,
        budgetTier: 'LOW',
        quality: 55,
        revenue: 22_000_000,
        profit: -3_000_000,
        outcome: 'FLOP',
    }],
    closureReason: status === 'CLOSED' ? 'Financing collapsed' : undefined,
});

const active = makeVenture('ACTIVE');
const closed = makeVenture('CLOSED');
const world = {
    projects: [],
    studios: {},
    npcVentures: { [active.id]: active, [closed.id]: closed },
} as unknown as WorldState;

const synced = syncNpcVenturesToStudios(world, 1_250);
assert.equal(synced.studios?.[active.id]?.ai?.origin, 'GENERATED');
assert.equal(synced.studios?.[closed.id]?.ai?.status, 'CLOSED', 'closed companies must remain in history rather than being deleted');
assert.equal(synced.studios?.[closed.id]?.ai?.legacyVenture?.closureReason, 'Financing collapsed');

const repeated = syncNpcVenturesToStudios(synced, 1_250);
assert.deepEqual(repeated.studios?.[active.id], synced.studios?.[active.id], 'same-week synchronization must be idempotent');
assert.equal(repeated.studios?.[active.id]?.ai?.events.filter(event => event.type === 'MIGRATED').length, 1);

console.log('Studio AI B1 venture migration audit passed.');
