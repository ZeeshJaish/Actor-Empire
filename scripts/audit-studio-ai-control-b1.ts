import assert from 'node:assert/strict';
import type { NPCStudioState, Player } from '../types';
import { reconcileStudioAiController, resolveStudioAiController } from '../services/studioAi';

const studio: NPCStudioState = {
    id: 'WARNER_BROS',
    name: 'Warner Bros.',
    valuation: 70,
    reputation: 82,
    cashReserve: 8_400,
    recentHits: 2,
    archetype: 'LEGACY',
};
const unowned = { businesses: [], flags: {}, stockTakeovers: [] } as unknown as Player;
assert.equal(resolveStudioAiController(unowned, studio.id), 'AI');

const directOwner = {
    businesses: [{ id: studio.id, type: 'PRODUCTION_HOUSE' }],
    flags: {},
    stockTakeovers: [],
} as unknown as Player;
assert.equal(resolveStudioAiController(directOwner, studio.id), 'PLAYER');

const acquiredOwner = {
    businesses: [{ id: 'acquired_warner', type: 'PRODUCTION_HOUSE' }],
    flags: {
        studioAcquisitionCases: [{
            studioId: studio.id,
            status: 'ACQUIRED',
            closing: { outcome: 'CONTROL', acquiredBusinessId: 'acquired_warner' },
        }],
    },
    stockTakeovers: [],
} as unknown as Player;
assert.equal(resolveStudioAiController(acquiredOwner, studio.id), 'PLAYER');

const aiState = reconcileStudioAiController(studio, unowned, 700);
const cashBeforeHandoff = aiState.cashReserve;
const playerState = reconcileStudioAiController(aiState, acquiredOwner, 701);
assert.equal(playerState.ai?.controller, 'PLAYER');
assert.equal(playerState.cashReserve, cashBeforeHandoff, 'ownership handoff must preserve cash');
assert.ok(playerState.ai?.handoffKeys.includes(`AI:PLAYER:${studio.id}:701`));
assert.equal(playerState.ai?.events.filter(event => event.type === 'OWNERSHIP_CHANGED').length, 1);

const repeated = reconcileStudioAiController(playerState, acquiredOwner, 701);
assert.deepEqual(repeated, playerState, 'same ownership reconciliation must be idempotent');

console.log('Studio AI B1 ownership audit passed.');
