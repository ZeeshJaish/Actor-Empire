import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type WorldState } from '../types';
import { processStudioAiWeek } from '../services/studioAi';
import { processIndustryWorldWeek } from '../services/industryWorld';

const absoluteWeek = 1_600;
const player = {
    id: 'player_b1',
    age: 30,
    currentWeek: 40,
    businesses: [{ id: 'PLAYER_STUDIO', type: 'PRODUCTION_HOUSE' }],
    stockTakeovers: [],
    flags: {},
} as unknown as Player;
const world = {
    projects: [],
    studios: {
        SIGNAL_STUDIO: {
            id: 'SIGNAL_STUDIO',
            name: 'Signal House',
            valuation: 0.08,
            reputation: 31,
            cashReserve: 0.01,
            recentHits: 0,
            archetype: 'EMERGENT',
        },
        PLAYER_STUDIO: {
            id: 'PLAYER_STUDIO',
            name: 'Player Studio',
            valuation: 2,
            reputation: 60,
            cashReserve: 120,
            recentHits: 1,
            archetype: 'COMMERCIAL',
        },
    },
} as unknown as WorldState;

const result = processStudioAiWeek(player, world, absoluteWeek);
assert.equal(result.world.studios?.SIGNAL_STUDIO.ai?.lastProcessedAbsoluteWeek, absoluteWeek);
assert.equal(result.world.studios?.PLAYER_STUDIO.ai?.controller, 'PLAYER');
assert.equal(result.world.studios?.PLAYER_STUDIO.ai?.ledger.length, 0, 'weekly coordinator must not operate the player studio');
assert.equal(result.news.length, 1, 'a material condition change should generate one bounded news signal');
assert.equal(result.socialPosts.length, 1, 'the same material change should be visible through the world social feed');
const publicCopy = [...result.news.map(item => `${item.headline} ${item.subtext || ''}`), ...result.socialPosts.map(item => item.content)].join(' ');
assert.equal(/\b(active|distressed|restructuring|dormant|closed)\b/i.test(publicCopy), false, 'public copy must show consequences instead of exposing internal status labels');

const repeated = processStudioAiWeek(player, result.world, absoluteWeek);
assert.deepEqual(repeated.world, result.world, 'same-week world processing must be idempotent');
assert.equal(repeated.news.length, 0);
assert.equal(repeated.socialPosts.length, 0);

const integratedPlayer = structuredClone(INITIAL_PLAYER) as Player;
const integratedAbsoluteWeek = ((integratedPlayer.age - 1) * 52) + (integratedPlayer.currentWeek - 1);
const integrated = processIndustryWorldWeek(integratedPlayer, integratedPlayer.world, integratedAbsoluteWeek);
assert.ok(Object.values(integrated.world.studios || {}).every(studio => (
    studio.ai?.controller === 'PLAYER' || studio.ai?.lastProcessedAbsoluteWeek === integratedAbsoluteWeek
)), 'the canonical B7 entered-week path must run the studio coordinator exactly once');
assert.ok(Array.isArray(integrated.socialPosts), 'world turn must return bounded studio social signals for the existing X feed');

console.log('Studio AI B1 weekly integration audit passed.');
