// @ts-nocheck - executable integration fixture.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import { processIndustryWorldWeek } from '../services/industryWorld';

const fixture = structuredClone(INITIAL_PLAYER) as Player;
fixture.id = 'b7_coordinator_player';
fixture.age = 30;
fixture.currentWeek = 29;
fixture.world.platforms = {};
fixture.world.studios = {};
fixture.world.projects = [];
fixture.world.industryProductions = {};

const absoluteWeek = 1_537;
const once = processIndustryWorldWeek(fixture, fixture.world, absoluteWeek);
assert.equal(once.processed, true);
assert.deepEqual(once.executionOrder, [
    'PLATFORM_AI',
    'STREAMING_ECOSYSTEM',
    'STUDIO_AI',
    'PRESENTATION',
]);
assert.equal(once.world.industryEvents?.lastProcessedAbsoluteWeek, absoluteWeek);

const playerAfterOnce = { ...fixture, world: once.world };
const twice = processIndustryWorldWeek(playerAfterOnce, once.world, absoluteWeek);
assert.equal(twice.processed, false, 'same absolute week must not process twice');
assert.deepEqual(twice.world, once.world, 'same-week replay must preserve exact world state');
assert.deepEqual(twice.news, []);
assert.deepEqual(twice.socialPosts, []);
assert.deepEqual(twice.logs, []);

const next = processIndustryWorldWeek(playerAfterOnce, once.world, absoluteWeek + 1);
assert.equal(next.processed, true);
assert.equal(next.world.industryEvents?.lastProcessedAbsoluteWeek, absoluteWeek + 1);

const gameLoopSource = readFileSync('services/gameLoop.ts', 'utf8');
assert.match(
    gameLoopSource,
    /nextPlayer = streamingIndustryResult\.player;\s+nextPlayer\.world = streamingIndustryResult\.world;/,
    'game loop must retain the coordinator player containing News, X, and Instagram projections',
);
assert.doesNotMatch(
    gameLoopSource,
    /nextPlayer\.news = \[\.\.\.streamingIndustryResult\.news/,
    'game loop must not prepend coordinator news a second time',
);
assert.doesNotMatch(
    gameLoopSource,
    /nextPlayer\.x\.feed = \[\.\.\.streamingIndustryResult\.socialPosts/,
    'game loop must not prepend coordinator X posts a second time',
);

console.log('Industry world B7 weekly coordinator audit passed.');
