import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Script } from '../types';
import { SCRIPT_STORY_CASES, storyCaseOptions } from './fixtures/scriptStoryCombinations';
import { scriptVariationProjectInput } from './fixtures/scriptVariationProject';
import { calculateConceptAttributes, calculateConceptQuality, suggestScriptPremise } from '../services/scriptConcept';
import { inferStoryCompass } from '../services/characterIdentityLogic';
import { processBusinessWeek } from '../services/businessLogic';
import { buildGreenlightProject, prepareGreenlightFunding } from '../views/lifestyle/business/greenlightProjectBuilder';
import { processGameWeek } from '../services/gameLoop';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../services/saveGenerations';
import { migratePlayerSave } from '../services/saveMigration';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { resolveStreamingProductionReadiness } from '../services/streamingProductionReadiness';
import { initializeStocks } from '../services/stockLogic';
import { NPC_DATABASE, isCastableActor } from '../services/npcLogic';

const scripts: Script[] = SCRIPT_STORY_CASES.map(story => {
    const options = storyCaseOptions(story);
    const format = story.format || 'LIVE_ACTION';
    const attributes = calculateConceptAttributes(story.genres[0], format, 'PUBLIC_FIGURE', options, story.genres.length > 1);
    const script: Script = {
        id: `broad-${story.id}`, title: story.title, genres: story.genres, format,
        projectType: story.projectType || 'MOVIE', options, attributes,
        quality: calculateConceptQuality(attributes), baseQuality: calculateConceptQuality(attributes),
        status: 'CONCEPT', writerId: null, weeksInDevelopment: 0, totalDevelopmentWeeks: 0, isOriginal: true,
        logline: suggestScriptPremise(story.genres, options, 'A new story.'),
    };
    script.storyCompass = inferStoryCompass(script);
    return script;
});
if (process.env.SCRIPT_BROAD_UI_RESULT) {
    const uiScript: Script = JSON.parse(readFileSync(process.env.SCRIPT_BROAD_UI_RESULT, 'utf8'));
    assert.ok(uiScript.options.some(o => o.choiceId === 'professional-thief'));
    assert.ok(uiScript.options.some(o => o.choiceId === 'future-warning'));
    scripts.push({ ...uiScript, id: 'broad-browser-concept' });
}
let player = scriptVariationProjectInput(scripts[0]).player;
player.money = 123_456_789.25;
const legacy: Script = {
    ...scripts[0], id: 'pre-expansion-legacy-script', title: 'Existing Story', genres: ['ADVENTURE'], projectType: 'MOVIE',
    logline: 'An explorer searches the jungle for an ancient artifact.',
    options: [{ questionId: 'goal', choiceId: 'ancient-artifact' }, { questionId: 'location', choiceId: 'jungle' }],
    status: 'READY', quality: 87, baseQuality: 85,
    attributes: { plot: 91, characters: 83, pacing: 82, dialogue: 89, action: 78, originality: 88 },
    developmentCost: 123_456, purchaseCost: 654_321,
};
legacy.storyCompass = inferStoryCompass(legacy);
const studioId = player.businesses[0].id;
const store = new CinemaMemorySaveStore();
const expected = new Map<string, Script>();
const phases = new Map<string, Set<string>>();
const houseActor = NPC_DATABASE.find(isCastableActor)!;
assert.ok(houseActor, 'Production QA needs a real castable actor.');
player.businesses[0].studioState!.scripts = [legacy];

async function reload(label: string) {
    const money = player.money;
    const balance = player.businesses[0].balance;
    const shares = structuredClone(player.portfolio);
    const commitments = structuredClone(player.commitments);
    const allScripts = structuredClone(player.businesses[0].studioState!.scripts);
    const prepared = prepareVerifiedPlayerForPersistence(player, 'MANUAL');
    await saveVerifiedGameData(store, 'broad-story-isolated-qa', prepared.player, prepared.manifest);
    const loaded = await loadVerifiedGameData(store, 'broad-story-isolated-qa');
    assert.equal(loaded.status, 'CURRENT', label);
    player = migratePlayerSave(loaded.player!);
    assert.equal(player.money, money, `${label}: cash`);
    assert.equal(player.businesses[0].balance, balance, `${label}: corporate cash`);
    assert.equal(player.businesses[0].id, studioId, `${label}: ownership`);
    assert.deepEqual(player.portfolio, shares, `${label}: shares`);
    assert.deepEqual(player.businesses[0].studioState!.scripts, allScripts, `${label}: scripts`);
    for (const before of commitments) {
        const after = player.commitments.find(c => c.id === before.id)!;
        assert.ok(after, `${label}: missing project ${before.id}`);
        assert.equal(after.projectPhase, before.projectPhase);
        assert.equal(after.phaseWeeksLeft, before.phaseWeeksLeft);
        assert.deepEqual(after.productionCalendar, before.productionCalendar);
        assert.deepEqual(after.projectDetails!.storyCompass, before.projectDetails!.storyCompass);
        assert.equal(after.projectDetails!.description, before.projectDetails!.description);
    }
}

for (const [index, concept] of scripts.entries()) {
    const studio = player.businesses[0];
    studio.studioState!.writers = [{ id: 'qa-writer', name: 'Writer', skill: 70, fee: 0, speed: 1, tier: 'COMMON', stats: { creativity: 70, dialogue: 70, structure: 70, pacing: 70 } }];
    const draft = structuredClone(studio);
    draft.studioState!.scripts = [{ ...concept, status: 'IN_DEVELOPMENT', writerId: 'qa-writer', totalDevelopmentWeeks: 1 }];
    const developed = processBusinessWeek(draft, 50, player.currentWeek + 1).updated.studioState!.scripts[0];
    assert.equal(developed.status, 'READY');
    assert.deepEqual(developed.options, concept.options);
    assert.equal(developed.logline, concept.logline);
    assert.deepEqual(developed.storyCompass, concept.storyCompass);
    studio.studioState!.scripts.push(developed);
    const input = scriptVariationProjectInput(developed);
    input.player = player;
    input.studio = studio;
    input.now = () => 2_000_000 + index;
    // Exercise a studio slate with a real NPC actor and in-house director.
    input.castList[0] = { ...input.castList[0], actorId: houseActor.id, actorName: houseActor.name };
    input.getCastableActorById = id => NPC_DATABASE.find(actor => actor.id === id);
    input.crewModes.director = 'IN_HOUSE';
    input.getCrewData = role => ({ name: `In-House ${role}`, tier: 'In-House', quality: 65, fame: 0, cost: 0 });
    const before = structuredClone(player);
    const built = buildGreenlightProject(input);
    assert.deepEqual(player, before, 'Package preparation must not mutate the save.');
    assert.ok(built.newCommitment.projectDetails!.castList?.some(member => member.actorId === houseActor.id));
    assert.equal(built.newCommitment.projectDetails!.description, developed.logline);
    assert.deepEqual(built.newCommitment.projectDetails!.storyCompass, developed.storyCompass);
    assert.equal(built.newCommitment.projectDetails!.hiddenStats.scriptQuality, developed.quality);
    const funding = prepareGreenlightFunding({
        player, studio, studioCashRequirement: built.studioCashRequirement, newCommitment: built.newCommitment,
        finalInvestorRaised: 0, greenlightPackageBudget: built.greenlightPackageBudget,
        isCreatingNewUniverse: false, normalizedWorldUniverses: {}, newUniverseName: '', randomUniverseColor: '#2563eb',
    });
    studio.balance = funding.newStudioBalance;
    studio.studioState!.scripts = built.updatedScripts;
    studio.studioState!.concepts = built.updatedConcepts;
    player.commitments = [...funding.updatedCommitments, funding.fundedCommitment];
    expected.set(funding.fundedCommitment.id, developed);
    phases.set(funding.fundedCommitment.id, new Set([funding.fundedCommitment.projectPhase!]));
    assert.equal(resolveStreamingProductionReadiness(player, funding.fundedCommitment.id).ready, false);
}
// Nonempty pre-existing equity holding must survive a real generation reload too.
player.stocks = initializeStocks();
player.portfolio.push({ stockId: 'stk_nke', shares: 1357, averageCost: 23.5, totalInvested: 31889.5 });
await reload('greenlight');
console.log(`PASS ${scripts.length} concepts → writer development → real greenlight/funding → verified reload.`);

let elapsed = 0;
for (; elapsed < 100; elapsed++) {
    if ([...expected.keys()].every(id => player.commitments.find(c => c.id === id)?.projectPhase === 'AWAITING_RELEASE')) break;
    player = (await processGameWeek(player)).player;
    let transition = false;
    for (const [id, script] of expected) {
        const project = player.commitments.find(c => c.id === id);
        assert.ok(project, `Project lost during week ${elapsed + 1}: ${script.title}`);
        const visited = phases.get(id)!;
        if (!visited.has(project.projectPhase!)) transition = true;
        visited.add(project.projectPhase!);
        assert.equal(project.projectDetails!.description, script.logline);
        assert.deepEqual(project.projectDetails!.storyCompass, script.storyCompass);
        const saved = player.businesses[0].studioState!.scripts.find(s => s.id === script.id)!;
        assert.deepEqual(saved.options, script.options);
        assert.equal(saved.status, 'PRODUCED');
        assert.equal(resolveStreamingProductionReadiness(player, id).ready, project.projectPhase === 'AWAITING_RELEASE');
    }
    const preservedLegacy = player.businesses[0].studioState!.scripts.find(s => s.id === legacy.id)!;
    for (const [field, value] of Object.entries(legacy)) assert.deepEqual(preservedLegacy[field], value, `Legacy field ${field} changed`);
    if (transition || elapsed % 8 === 0) {
        await reload(`production-week-${elapsed + 1}`);
        console.log(`PASS weekly engine + save/reload at week ${elapsed + 1}; phases: ${[...new Set(player.commitments.filter(c => expected.has(c.id)).map(c => c.projectPhase))].join(', ')}.`);
    }
}
assert.ok(elapsed < 100, 'All projects must finish their real production calendars.');
for (const [id, visited] of phases) {
    for (const phase of ['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'AWAITING_RELEASE']) assert.ok(visited.has(phase), `${id}: missed ${phase}`);
    const project = player.commitments.find(c => c.id === id)!;
    assert.equal(project.productionCalendar!.elapsedWeeks, project.productionCalendar!.totalWeeks);
}
for (let i = 0; i < 3; i++) {
    player = (await processGameWeek(player)).player;
    await reload(`delivered-next-week-${i + 1}`);
    for (const [id, script] of expected) {
        const project = player.commitments.find(c => c.id === id)!;
        assert.equal(project.projectPhase, 'AWAITING_RELEASE');
        assert.equal(project.projectDetails!.description, script.logline);
        assert.deepEqual(project.projectDetails!.storyCompass, script.storyCompass);
    }
}
console.log(`PASS ${scripts.length} full production calendars (${elapsed} weeks), delivery gate, reloads and three subsequent weeks; legacy script, cash, equity and studio ownership persist.`);
