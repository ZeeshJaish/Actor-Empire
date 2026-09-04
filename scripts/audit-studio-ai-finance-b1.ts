import assert from 'node:assert/strict';
import type { NPCStudioState } from '../types';
import { attachNormalizedStudioAiState, processStudioAiFinanceWeek } from '../services/studioAi';
import { getLegacyStudioValuationFloor } from '../services/studioEcosystem';

const base: NPCStudioState = {
    id: 'FINANCE_FIXTURE',
    name: 'Finance Fixture Films',
    valuation: 0.35,
    reputation: 58,
    cashReserve: 45,
    recentHits: 1,
    archetype: 'EMERGENT',
};
const normalized = attachNormalizedStudioAiState(base, { absoluteWeek: 899 });
const week = processStudioAiFinanceWeek(normalized, 900, { operatingRevenueMillions: 1.2 });
assert.equal(week.ai?.lastProcessedAbsoluteWeek, 900);
assert.ok(week.ai?.ledger.some(entry => entry.category === 'CATALOGUE_OPERATIONS'));
assert.ok(week.ai?.ledger.some(entry => entry.category === 'OPERATING_COST'));
assert.ok(Number.isFinite(week.cashReserve));
assert.ok(Number.isFinite(week.valuation));
assert.notEqual(week.cashReserve, normalized.cashReserve, 'a processed AI week must settle real cash movement');

const repeated = processStudioAiFinanceWeek(week, 900, { operatingRevenueMillions: 999 });
assert.deepEqual(repeated, week, 'weekly finance settlement must be idempotent');

const playerControlled = attachNormalizedStudioAiState(base, { absoluteWeek: 899, controller: 'PLAYER' });
const playerWeek = processStudioAiFinanceWeek(playerControlled, 900, { operatingRevenueMillions: 999 });
assert.deepEqual(playerWeek, playerControlled, 'the NPC engine must never operate a player-controlled studio');

let failing = attachNormalizedStudioAiState({ ...base, cashReserve: 0.15, recentHits: 0 }, { absoluteWeek: 999 });
const firstShortfallWeek = processStudioAiFinanceWeek(failing, 1_000, { operatingRevenueMillions: 0 });
assert.ok(firstShortfallWeek.ai!.finance.debtPrincipalMillions > 0, 'unpaid operating cost must become explicit debt instead of invisible money');
assert.ok(firstShortfallWeek.ai!.ledger.some(entry => entry.category === 'SHORTFALL_BORROWING'), 'shortfall debt must be visible in the ledger');
assert.equal(firstShortfallWeek.ai!.ledger.at(-1)?.balanceAfterMillions, firstShortfallWeek.cashReserve, 'ledger closing balance must reconcile to canonical cash');
for (let absoluteWeek = 1_000; absoluteWeek < 1_030; absoluteWeek += 1) {
    failing = processStudioAiFinanceWeek(failing, absoluteWeek, { operatingRevenueMillions: 0 });
}
assert.ok(['DISTRESSED', 'RESTRUCTURING', 'CLOSED'].includes(failing.ai?.status || ''), 'persistent losses must have a persisted internal consequence');
const statusEvents = failing.ai?.events.filter(event => event.type === 'STATUS_CHANGED') || [];
assert.ok(statusEvents.length <= 2, 'distress and restructuring may each emit once, but unchanged weeks must not spam events');
assert.equal(new Set(statusEvents.map(event => event.id)).size, statusEvents.length, 'status transition event ids must be unique');
assert.equal(failing.ai?.ledger.some(entry => entry.amountMillions > 0 && entry.description.toLowerCase().includes('rescue')), false, 'B1 must not create hidden bailout money');

let restructuring = attachNormalizedStudioAiState({ ...base, reputation: 0, recentHits: 0, cashReserve: 80 }, { absoluteWeek: 1_999 });
restructuring = {
    ...restructuring,
    ai: {
        ...restructuring.ai!,
        status: 'RESTRUCTURING',
        finance: { ...restructuring.ai!.finance, consecutiveLossWeeks: 60 },
        events: [{
            id: 'entered_restructuring',
            absoluteWeek: 2_000,
            type: 'STATUS_CHANGED',
            summary: 'Finance Fixture Films entered restructuring.',
        }],
        lastProcessedAbsoluteWeek: 1_999,
    },
};
for (let absoluteWeek = 2_000; absoluteWeek <= 2_012; absoluteWeek += 1) {
    restructuring = processStudioAiFinanceWeek(restructuring, absoluteWeek);
}
assert.equal(
    restructuring.ai!.status,
    'ACTIVE',
    'A solvent restructuring studio must reduce its operating base and regain active status instead of remaining unavailable forever.',
);
assert.ok(restructuring.cashReserve > 0, 'restructuring recovery must come from explicit cost control, not a hidden cash injection');

const appleFloor = getLegacyStudioValuationFloor('APPLE_TV');
const floorStudio = attachNormalizedStudioAiState({
    ...base,
    id: 'APPLE_TV',
    valuation: appleFloor,
    cashReserve: 1,
    reputation: 0,
    recentHits: 0,
}, { absoluteWeek: 2_099 });
const floorWeek = processStudioAiFinanceWeek(floorStudio, 2_100, { operatingRevenueMillions: 0 });
assert.equal(
    floorWeek.valuation,
    appleFloor,
    'weekly finance must preserve the same canonical legacy valuation floor that save migration applies.',
);

console.log('Studio AI B1 finance audit passed.');
