import assert from 'node:assert/strict';
import type { NpcVentureState, Player, WorldState } from '../types';
import { migrateNpcVentureToStudio } from '../services/studioAi/studioAiMigration';
import { normalizeWorldStudioAiForSave } from '../services/studioAi/studioAiSave';
import { processNpcVentures, syncNpcVenturesToStudios } from '../services/npcVentureLogic';

const legacy: NpcVentureState = { id: 'venture-reload', name: 'Retained Pictures', ownerNpcId: 'founder', ownerName: 'Founder',
    archetype: 'GENRE_HOUSE', status: 'ACTIVE', valuation: .18, cashReserve: 32, hype: 45, reputation: 51, creativeQuality: 68,
    risk: 62, foundedWeek: 5, foundedYear: 22, lastProjectWeek: 20, nextProjectWeek: 33, projectsReleased: 3, hits: 1, flops: 2, history: [] };
const migrated = migrateNpcVentureToStudio(legacy, undefined, 1250);
const canonical = { ...migrated, cashReserve: 35.123456789, valuation: .23, reputation: 63, hits: 2, lifetimeBoxOffice: 123456789 };
const world = { projects: [], studios: { [legacy.id]: canonical }, npcVentures: { [legacy.id]: structuredClone(legacy) } } as unknown as WorldState;
const original = structuredClone(world);
const synced = syncNpcVenturesToStudios(world, 1251);
assert.deepEqual(synced.studios![legacy.id], canonical, 'Stale legacy cache cannot reset canonical receipts, spend, valuation or reputation');
const p = { id: 'reload-player', businesses: [], world } as unknown as Player;
const normalized = normalizeWorldStudioAiForSave(p, world, 1251);
assert.equal(normalized.studios![legacy.id].cashReserve, canonical.cashReserve, 'Save/load normalization cannot reverse an already credited producer receipt');
assert.equal(normalizeWorldStudioAiForSave(p, normalized, 1251).studios![legacy.id].cashReserve, canonical.cashReserve);
const spent = { ...canonical, cashReserve: 6.25 };
assert.equal(migrateNpcVentureToStudio(legacy, spent, 1251).cashReserve, 6.25, 'Canonical spending must not be reimbursed from a stale richer cache');
assert.deepEqual(world, original, 'Migration and normalization cannot mutate their source world');
// Only the actual weekly legacy processor may submit its newly calculated changes.
// This compatibility processor retains its original year*52+week clock.
const currentAbs = 25 * 52 + 2;
const alreadyProcessed = { ...structuredClone(world), npcVentureLastProcessedAbsoluteWeek: currentAbs };
const replay = processNpcVentures({ ...p, age: 25, currentWeek: 2 } as Player, alreadyProcessed);
assert.equal(replay.world.studios![legacy.id].cashReserve, canonical.cashReserve, 'Same-week replay adds or deducts nothing');
const next = processNpcVentures({ ...p, age: 25, currentWeek: 3 } as Player, replay.world);
assert.ok(next.world.studios![legacy.id].cashReserve > canonical.cashReserve, 'Legitimate weekly venture progress still settles');
const after = structuredClone(next.world);
assert.deepEqual(syncNpcVenturesToStudios(after, currentAbs + 1).studios![legacy.id], after.studios![legacy.id]);
console.log(JSON.stringify({ ventureReloadChecks: 8, preservesCanonicalReceiptsAndSpend: true, sameWeekPaysOnce: true, actualWeeklyProgressPreserved: true }));
