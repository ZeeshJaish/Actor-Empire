import assert from 'node:assert/strict';
import { normalizeStudioAiState } from '../services/studioAi';
import { consumeStudioGreenlightForLegacyRelease } from '../services/studioAi/studioAiCommissionBridge';
import { processNpcVentures } from '../services/npcVentureLogic';
import type { NPCStudioState, NpcVentureState, Player, StudioAiSlateCommitment, WorldState } from '../types';

const WEEK = 900;
const studio: NPCStudioState = {
    id: 'LEGACY_GATE_STUDIO', name: 'Legacy Gate Studio', valuation: 0.8, reputation: 65,
    cashReserve: 190, recentHits: 1, archetype: 'GENRE', isNpcVenture: true,
};
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: WEEK });
const commitment: StudioAiSlateCommitment = {
    id: 'legacy_greenlight', proposalId: 'legacy_proposal', proposalKey: 'legacy_proposal_key', fingerprintId: 'legacy_fingerprint',
    source: 'INDEPENDENT', status: 'GREENLIT', createdAtAbsoluteWeek: WEEK - 8, updatedAtAbsoluteWeek: WEEK - 3,
    nextReviewAbsoluteWeek: null, developmentSpendMillions: 2, rewriteCount: 0, proposedBudgetMillions: 35,
    greenlightBudgetMillions: 38, greenlitAtAbsoluteWeek: WEEK - 3,
};
studio.ai.slate!.commitments = [commitment];
const consumed = consumeStudioGreenlightForLegacyRelease(studio, WEEK);
assert.equal(consumed.commitment?.id, commitment.id);
assert.equal(consumed.commitment?.status, 'HANDED_OFF');
assert.equal(consumed.studio.ai?.slate?.commitments[0].legacyReleaseConsumedAtAbsoluteWeek, WEEK);
assert.equal(consumeStudioGreenlightForLegacyRelease(consumed.studio, WEEK).commitment, null, 'one greenlight can be consumed only once');

const venture: NpcVentureState = {
    id: studio.id, name: studio.name, ownerNpcId: 'npc_owner', ownerName: 'Owner', archetype: 'GENRE_HOUSE', status: 'ACTIVE',
    valuation: studio.valuation, cashReserve: studio.cashReserve, hype: 60, reputation: studio.reputation, creativeQuality: 70, risk: 45,
    foundedWeek: 1, foundedYear: 20, lastProjectWeek: 1, nextProjectWeek: 2, projectsReleased: 0, hits: 0, flops: 0, history: [],
};
const world = {
    projects: [],
    studios: { [studio.id]: { ...studio, ai: { ...studio.ai!, slate: { ...studio.ai!.slate!, commitments: [commitment] } } } },
    npcVentures: { [venture.id]: venture },
    npcVentureLastProcessedAbsoluteWeek: WEEK - 1,
} as unknown as WorldState;
const player = { id: 'legacy_gate_player', age: 18, currentWeek: 20, businesses: [], stockTakeovers: [], flags: {}, world } as unknown as Player;
const blocked = processNpcVentures(player, world);
assert.equal(blocked.world.projects.length, 0, 'legacy venture must not originate an instant project without a B5 greenlight');
assert.equal(blocked.world.npcVentures![venture.id].projectsReleased, 0);
assert.equal(blocked.world.studios![studio.id].ai!.slate!.commitments[0].status, 'GREENLIT', 'B6 owns greenlight handoff; the venture bridge must not consume it');

console.log('Studio AI B5 legacy project gate audit passed.');
