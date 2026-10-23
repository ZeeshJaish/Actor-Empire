import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { ActiveRelease, Script } from '../types';
import { scriptVariationProjectInput } from './fixtures/scriptVariationProject';
import { buildGreenlightProject, prepareGreenlightFunding } from '../views/lifestyle/business/greenlightProjectBuilder';
import { inferStoryCompass } from '../services/characterIdentityLogic';
import { calculateConceptAttributes, calculateConceptQuality } from '../services/scriptConcept';
import { processBusinessWeek } from '../services/businessLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../services/saveGenerations';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { normalizeCinemaTitle } from '../services/boxOffice/boxOfficeInputs';
import { migrateCinemaState } from '../services/boxOffice/boxOfficeMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildCinemaWeekInput } from '../services/boxOffice/boxOfficeWeek';
import { commitCinemaWeek } from '../services/boxOffice/boxOfficeLiveSettlement';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
import { resolveStreamingProductionReadiness } from '../services/streamingProductionReadiness';

const options = [{ questionId: 'goal', choiceId: 'cursed-treasure' }, { questionId: 'location', choiceId: 'high-seas' }];
const attributes = calculateConceptAttributes('ADVENTURE', 'LIVE_ACTION', 'PUBLIC_FIGURE', options, true);
const authoredScript: Script = {
    id: 'pirate-variation', title: 'Curse of the Open Sea', genres: ['ADVENTURE', 'FANTASY'],
    options, attributes, quality: calculateConceptQuality(attributes), baseQuality: calculateConceptQuality(attributes),
    status: 'READY', writerId: null, weeksInDevelopment: 0, totalDevelopmentWeeks: 0,
    isOriginal: true, projectType: 'MOVIE', format: 'LIVE_ACTION',
    logline: 'A pirate crew seeks cursed treasure across the high seas.',
};
let script: Script = process.env.SCRIPT_VARIATION_UI_RESULT
    ? JSON.parse(readFileSync(process.env.SCRIPT_VARIATION_UI_RESULT, 'utf8'))
    : authoredScript;
script.storyCompass = inferStoryCompass(script);
const input = scriptVariationProjectInput(script);
const draftStudio = structuredClone(input.studio);
draftStudio.studioState!.writers = [{ id: 'qa-writer', name: 'Writer', skill: 70, fee: 0, speed: 1, tier: 'COMMON', stats: { creativity: 70, dialogue: 70, structure: 70, pacing: 70 } }];
draftStudio.studioState!.scripts = [{ ...script, status: 'IN_DEVELOPMENT', writerId: 'qa-writer', totalDevelopmentWeeks: 1 }];
const developed = processBusinessWeek(draftStudio, 50, input.player.currentWeek + 1).updated.studioState!.scripts[0];
assert.equal(developed.status, 'READY');
assert.deepEqual(developed.options, options);
assert.equal(developed.logline, script.logline);
assert.deepEqual(developed.storyCompass, script.storyCompass);
assert.ok(Object.values(developed.attributes!).every(v => Number.isFinite(v) && v >= 10 && v <= 100));
console.log('PASS normal writer development retains selected answers and story intent.');

// Greenlight the normal writer's completed script, including a browser-created concept when supplied.
script = developed;
input.selectedScript = script;
input.studio.studioState!.scripts = [script];
const before = structuredClone(input.player);
const built = buildGreenlightProject(input);
const project = built.newCommitment.projectDetails!;
assert.equal(project.description, script.logline, 'The authored pirate premise must survive the real greenlight handoff.');
assert.equal(project.hiddenStats.scriptQuality, script.quality);
assert.equal(project.genre, 'ADVENTURE');
assert.deepEqual(project.storyCompass, script.storyCompass);
assert.deepEqual(input.player, before, 'Preparing the package must not mutate money, scripts, or ownership.');
console.log('PASS pirate script → real greenlight project preserves its story and canonical quality.');


// Series use the same concept and funding path; choices cannot bypass delivery.
const series = { ...script, id: 'pirate-series', projectType: 'SERIES' as const, episodes: 8 };
const seriesInput = scriptVariationProjectInput(series);
const seriesBuild = buildGreenlightProject(seriesInput);
assert.equal(seriesBuild.newCommitment.projectDetails!.type, 'SERIES');
assert.deepEqual(seriesBuild.newCommitment.projectDetails!.storyCompass, script.storyCompass);
seriesInput.player.commitments = [seriesBuild.newCommitment];
assert.equal(resolveStreamingProductionReadiness(seriesInput.player, seriesBuild.newCommitment.id).ready, false);
seriesInput.player.commitments[0].projectPhase = 'AWAITING_RELEASE';
assert.equal(resolveStreamingProductionReadiness(seriesInput.player, seriesBuild.newCommitment.id).ready, true);
console.log('PASS series greenlight shares the same story and retains the streaming delivery gate.');

const legacy = { ...script, id: 'legacy-ready', options: [{ questionId: 'goal', choiceId: 'ancient-artifact' }, { questionId: 'location', choiceId: 'jungle' }], quality: 87, attributes: { plot: 91, characters: 83, pacing: 82, dialogue: 89, action: 78, originality: 88 }, developmentCost: 123456, purchaseCost: 654321 };
const funding = prepareGreenlightFunding({
    player: input.player, studio: input.studio, studioCashRequirement: built.studioCashRequirement,
    newCommitment: built.newCommitment, finalInvestorRaised: 0, greenlightPackageBudget: built.greenlightPackageBudget,
    isCreatingNewUniverse: false, normalizedWorldUniverses: {}, newUniverseName: '', randomUniverseColor: '#2563eb',
});
let player = structuredClone(input.player);
player.businesses[0].balance = funding.newStudioBalance;
player.businesses[0].studioState!.scripts = [...built.updatedScripts, legacy];
player.businesses[0].studioState!.concepts = built.updatedConcepts;
player.commitments = [funding.fundedCommitment];
const money = player.money, balance = player.businesses[0].balance, owner = player.businesses[0].id;
const store = new CinemaMemorySaveStore();
const prepared = prepareVerifiedPlayerForPersistence(player, 'MANUAL');
await saveVerifiedGameData(store, 'script-variation-qa-only', prepared.player, prepared.manifest);
const loaded = await loadVerifiedGameData(store, 'script-variation-qa-only');
assert.equal(loaded.status, 'CURRENT');
player = migratePlayerSave(loaded.player!);
assert.equal(player.money, money);
assert.equal(player.businesses[0].balance, balance);
assert.equal(player.businesses[0].id, owner);
assert.deepEqual(player.businesses[0].studioState!.scripts.find(s => s.id === 'legacy-ready'), legacy);
assert.equal(player.commitments[0].projectDetails!.description, script.logline);
assert.deepEqual(player.businesses[0].studioState!.scripts[0].options, options);
console.log('PASS verified save/reload preserves old script stats/costs, new choices, cash and studio ownership.');

const details = structuredClone(player.commitments[0].projectDetails!);
const title = normalizeCinemaTitle({ titleId: 'pirate-title', owner: { route: 'PLAYER_STUDIO', id: owner }, project: details, player });
const samePackage = normalizeCinemaTitle({ titleId: 'pirate-title', owner: { route: 'PLAYER_STUDIO', id: owner }, project: { ...details, description: 'Different descriptive wording', storyCompass: undefined }, player });
assert.deepEqual(title, samePackage, 'Story labels must not mint demand, quality or earnings outside the canonical cinema inputs.');
let week = getAbsoluteWeek(player.age, player.currentWeek) + 1;
player.commitments = [];
player.activeReleases = [{ id: 'pirate-title', name: script.title, type: 'MOVIE', roleType: 'LEAD', projectDetails: { ...details, releaseStrategy: 'THEATRICAL', releaseRegionIds: ['NORTH_AMERICA'], releaseChainSelections: { NORTH_AMERICA: ['NOVA_CIRCUIT'] } }, weekNum: 1, weeklyGross: [], totalGross: 0, budget: details.estimatedBudget, status: 'RUNNING', productionPerformance: 75, imdbRating: 7.5, distributionPhase: 'THEATRICAL', sequelDecisionMade: true } as ActiveRelease];
player = migrateCinemaState(player, week - 1).player;
for (let i = 0; i < 3; i++, week++) {
    const input = buildCinemaWeekInput(player, week);
    assert.ok(input.titles.some(t => t.id === 'pirate-title'));
    const result = simulateCinemaWeek(input);
    const committed = commitCinemaWeek(player, result);
    assert.equal(committed.applied, true);
    assert.equal(commitCinemaWeek(JSON.parse(JSON.stringify(committed.player)), JSON.parse(JSON.stringify(result))).applied, false);
    const next = prepareVerifiedPlayerForPersistence(committed.player, 'PROCESS_WEEK');
    await saveVerifiedGameData(store, 'script-variation-qa-only', next.player, next.manifest);
    const reloaded = await loadVerifiedGameData(store, 'script-variation-qa-only');
    assert.equal(reloaded.status, 'CURRENT');
    player = reloaded.player!;
    assert.equal(player.businesses[0].id, owner);
    assert.equal(player.businesses[0].studioState!.scripts.find(s => s.id === 'legacy-ready')!.quality, 87);
}
assert.equal(player.world.cinemaMarket!.weeks.length, 3);
console.log('PASS canonical cinema settlement → verified reload → three weeks retains receipts without duplicate payment.');
