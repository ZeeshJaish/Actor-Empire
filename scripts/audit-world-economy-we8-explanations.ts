import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { buildWorldEconomyWe8Scenario } from './fixtures/worldEconomyWe8Scenarios';
import { buildWorldEconomyExplanations } from '../services/worldEconomy/worldEconomyExplanations';

const quiet = migratePlayerSave(structuredClone(INITIAL_PLAYER) as Player);
assert.deepEqual(buildWorldEconomyExplanations(quiet, 1_000), [], 'an unlaunched platform creates no routine explanation noise');

const scenario = buildWorldEconomyWe8Scenario('PIRACY', 2_400);
const first = buildWorldEconomyExplanations(scenario, 2_400);
const repeated = buildWorldEconomyExplanations(structuredClone(scenario), 2_400);
assert.deepEqual(first, repeated, 'explanations are deterministic from committed facts');
assert.ok(first.length > 0 && first.length <= 3, 'only the top three material explanations are returned');
assert.ok(first.every(item => item.sourceIds.every(source => /^WE[567]:/.test(source))), 'every explanation points to committed WE5-WE7 sources');
assert.ok(first.every(item => !/cohort control|slider|tune persona/i.test(`${item.title} ${item.reason}`)), 'the adapter never exposes simulation controls');

const sharing = buildWorldEconomyWe8Scenario('SHARING', 2_400);
const sharingRows = Object.values(sharing.world.worldStreamingCustomers!.countries)
    .flatMap(country => country.platformSummaries.filter(summary => summary.platformId === 'PLAYER'));
sharingRows.forEach(row => { row.sharedActiveViewers = Math.max(row.sharedActiveViewers, row.endingPaidAccounts); });
const sharingResult = buildWorldEconomyExplanations(sharing, 2_400);
assert.ok(sharingResult.some(item => item.id && item.title.includes('Sharing')), 'material sharing receives a concise audience explanation');

console.log('World economy WE8 explanation adapter audit passed.');
