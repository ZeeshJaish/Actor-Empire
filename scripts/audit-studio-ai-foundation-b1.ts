import assert from 'node:assert/strict';
import {
    migrateNpcVentureToStudio,
    normalizeStudioAiState,
    projectStudioToNpcVenture,
    STUDIO_AI_SCHEMA_VERSION,
} from '../services/studioAi';
import type { NPCStudioState, NpcVentureState } from '../types';

const major: NPCStudioState = {
    id: 'WARNER_BROS',
    name: 'Warner Bros.',
    valuation: 74,
    reputation: 86,
    cashReserve: 8880,
    recentHits: 3,
    archetype: 'LEGACY',
};

const regional: NPCStudioState = {
    id: 'REGIONAL_FIXTURE',
    name: 'Regional Fixture Films',
    valuation: 0.22,
    reputation: 44,
    cashReserve: 32,
    recentHits: 0,
    archetype: 'EMERGENT',
};

const majorFirst = normalizeStudioAiState(major, { absoluteWeek: 520 });
const majorSecond = normalizeStudioAiState(structuredClone(major), { absoluteWeek: 520 });
const regionalState = normalizeStudioAiState(regional, { absoluteWeek: 520 });

assert.equal(majorFirst.schemaVersion, STUDIO_AI_SCHEMA_VERSION, 'every canonical runtime must carry the current schema version');
assert.deepEqual(majorFirst, majorSecond, 'normalizing the same studio facts must be deterministic');
assert.equal(majorFirst.studioId, major.id, 'the runtime must retain the canonical studio ID');
assert.equal(majorFirst.controller, 'AI', 'an unowned established studio should default to AI control');
assert.equal(majorFirst.origin, 'ESTABLISHED', 'catalogued studios should retain an established origin');
assert.ok(majorFirst.capacity.productionSlots > regionalState.capacity.productionSlots, 'a mature major must not start at the same production capacity as a small regional studio');
assert.ok(majorFirst.competence.distribution > regionalState.competence.distribution, 'maturity must create a persisted distribution advantage rather than a hidden weekly bonus');
assert.ok(Object.values(majorFirst.competence).every(value => Number.isFinite(value) && value >= 1 && value <= 100), 'competence must remain finite and bounded');
assert.ok(Number.isFinite(majorFirst.finance.weeklyOperatingCostMillions), 'operating cost must be finite');
assert.ok(Number.isFinite(majorFirst.finance.runwayWeeks), 'runway must be finite');
assert.equal(majorFirst.ledger.length, 0, 'normalization must not invent weekly transactions');

const malformed = normalizeStudioAiState({
    ...regional,
    cashReserve: Number.NaN,
    ai: {
        schemaVersion: -8,
        studioId: '',
        controller: 'BROKEN',
        status: 'BROKEN',
        finance: { debtPrincipalMillions: Number.POSITIVE_INFINITY },
        ledger: Array.from({ length: 500 }, (_, index) => ({ id: `bad_${index}`, amountMillions: Number.NaN })),
    } as any,
}, { absoluteWeek: 520 });
assert.equal(malformed.studioId, regional.id, 'malformed runtime identity must fall back to the canonical studio record');
assert.ok(Number.isFinite(malformed.finance.debtPrincipalMillions), 'malformed debt must normalize to a finite value');
assert.ok(malformed.ledger.length <= 104, 'ledger history must be bounded during normalization');

const venture: NpcVentureState = {
    id: 'venture_silverline',
    name: 'Silverline Pictures',
    ownerNpcId: 'npc_founder',
    ownerName: 'Ava Stone',
    archetype: 'PRESTIGE_LABEL',
    status: 'ACTIVE',
    valuation: 0.42,
    cashReserve: 86,
    hype: 71,
    reputation: 68,
    creativeQuality: 79,
    risk: 36,
    foundedWeek: 12,
    foundedYear: 25,
    lastProjectWeek: 39,
    nextProjectWeek: 48,
    projectsReleased: 2,
    hits: 1,
    flops: 0,
    history: [{
        id: 'silverline_project_1',
        title: 'A Quiet Crown',
        week: 39,
        year: 26,
        budgetTier: 'MID',
        quality: 82,
        revenue: 140_000_000,
        profit: 54_000_000,
        outcome: 'HIT',
    }],
};

const migrated = migrateNpcVentureToStudio(venture, undefined, 26 * 52 + 40);
assert.equal(migrated.id, venture.id, 'venture migration must preserve the stable company id');
assert.equal(migrated.ownerNpcId, venture.ownerNpcId, 'venture migration must preserve founder identity');
assert.equal(migrated.ai?.origin, 'GENERATED');
assert.equal(migrated.ai?.legacyVenture?.history[0]?.id, 'silverline_project_1', 'venture project history must survive migration');
assert.ok(migrated.ai?.migrationKeys.includes(`npc-venture:${venture.id}`), 'venture migration must be idempotently recorded');

const projected = projectStudioToNpcVenture(migrated);
assert.equal(projected?.id, venture.id);
assert.equal(projected?.history[0]?.title, 'A Quiet Crown');
assert.equal(projected?.cashReserve, migrated.cashReserve, 'compatibility projection must read canonical studio cash');

const closed = migrateNpcVentureToStudio({ ...venture, status: 'CLOSED', closureReason: 'Slate losses' }, migrated, 26 * 52 + 41);
assert.equal(closed.ai?.status, 'CLOSED');
assert.equal(closed.ai?.legacyVenture?.closureReason, 'Slate losses');

console.log('Studio AI B1 foundation audit passed.');
