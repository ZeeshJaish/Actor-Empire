import assert from 'node:assert/strict';
import { processStudioAiWeek, normalizeStudioAiState } from '../services/studioAi';
import type { NPCStudioState, Player, WorldState } from '../types';

const WEEK = 1_950;
const studio: NPCStudioState = {
    id: 'LIVE_B5_STUDIO', name: 'Live B5 Studio', valuation: 42, reputation: 82,
    cashReserve: 1_500, recentHits: 2, archetype: 'COMMERCIAL',
};
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: WEEK });
studio.ai.lastProcessedAbsoluteWeek = WEEK - 1;
studio.ai.intelligence!.nextDueAbsoluteWeek = {
    CONTENT_STRATEGY: WEEK,
    PRODUCTION_REVIEW: WEEK + 100,
    RELEASE_REVIEW: WEEK + 100,
    FINANCE_REVIEW: WEEK + 100,
    MARKET_EXPANSION: WEEK + 100,
    CAPABILITY_GROWTH: WEEK + 100,
};
const world = { projects: [], studios: { [studio.id]: studio }, industryProductions: {} } as unknown as WorldState;
const player = { id: 'live_b5_player', age: 38, currentWeek: 26, businesses: [], stockTakeovers: [], flags: {}, world } as unknown as Player;

const due = processStudioAiWeek(player, world, WEEK);
const dueStudio = due.world.studios![studio.id];
const proposal = dueStudio.ai?.intelligence?.proposals.find(item => item.absoluteWeek === WEEK && item.lane === 'CONTENT_STRATEGY');
assert.equal(proposal?.actionFamily, 'DEVELOP_CONTENT');
assert.ok(proposal?.contentFingerprintId);
assert.ok(dueStudio.ai?.slate?.processedProposalKeys.includes(proposal!.idempotencyKey));
assert.equal(dueStudio.ai?.slate?.commitments.length, 1, 'a due B2/B3 intention must reach the B5 development slate');
assert.equal(due.world.projects.length, 0, 'B5 live turn must stop before public production/release');

const replay = processStudioAiWeek({ ...player, world: due.world }, due.world, WEEK);
assert.deepEqual(replay.world.studios![studio.id], dueStudio, 'same-week studio processing must remain idempotent');

console.log('Studio AI B5 live cutover audit passed.');
