import assert from 'node:assert/strict';
import { type Player, type Script } from '../types';
import { scriptVariationProjectInput } from './fixtures/scriptVariationProject';
import { generateNewUnknowns, GLOBAL_ACTOR_PACKS, createGlobalActorPackNPCs, NPC_DATABASE } from '../services/npcLogic';
import { calculateNPCAsk } from '../services/talentService';
import { negotiateTalentContract } from '../services/talentNegotiation';
import { mergeParentStudioTalentRosters } from '../services/talentRoster';
import { buildGreenlightProject, prepareGreenlightFunding } from '../views/lifestyle/business/greenlightProjectBuilder';
import { buildSeriesStreamingSessionInput, getSeriesPerformanceEvidence } from '../services/seriesStreamingValue';
import { buildStreamingBiddingRightsLot } from '../services/streamingRightsCompatibility';
import { createStreamingBiddingSession, advanceStreamingBiddingSession, getStreamingBiddingClosingOffers } from '../services/streamingBidding';
import { getAbsoluteWeek, getLegacyInheritancePreview } from '../services/legacyLogic';
import { processGameWeek } from '../services/gameLoop';
import { createContinuationScript } from '../services/sequelFlow';
import { processBusinessWeek } from '../services/businessLogic';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../services/saveGenerations';
import { migratePlayerSave } from '../services/saveMigration';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { signThroughReleaseHandler } from './fixtures/seriesReleaseHandler';
import { continueThroughAppHandler } from './fixtures/legacySuccessionHandler';
import { getEnabledGlobalCreatorProfiles } from '../services/youtubeLogic';
import { initializeStocks } from '../services/stockLogic';
const script: Script = { id: 'series-one-script', title: 'Workshop Days', genres: ['DRAMA'], options: [], quality: 75, baseQuality: 75,
    status: 'READY', writerId: null, weeksInDevelopment: 0, totalDevelopmentWeeks: 0, isOriginal: true, projectType: 'SERIES', episodes: 4 };
let player = scriptVariationProjectInput(script).player;
player.money = 50e9 + .25; player.businesses[0].balance = 50e9; player.stats.fame = 100;
player.stocks = initializeStocks(); player.portfolio = [{ stockId: 'stk_nke', shares: 1357, averageCost: 23.5, totalInvested: 31889.5 }];
const studioId = player.businesses[0].id, pack = GLOBAL_ACTOR_PACKS[0];
player.flags.enabledGlobalActorPacks = [pack.id];
player.flags.modHistory = [{ id: 'series-mod', type: 'GLOBAL_ACTOR_PACK', packId: pack.id, enabledAtAge: player.age, enabledAtWeek: player.currentWeek }];
const actor = { ...generateNewUnknowns(1)[0], id: 'series-flow-actor', name: 'Returning Series Actor', tier: 'RISING' as const,
    stats: { talent: 70, fame: 10, looks: 70, professionalism: 80 } };
player.flags.extraNPCs = [...createGlobalActorPackNPCs(pack.id), actor];
const roster = () => mergeParentStudioTalentRosters(studioId, player.studio.talentRoster, player.businesses.find(b => b.id === studioId)!.studioState!.talentRoster);
const store = new CinemaMemorySaveStore(); let saves = 0, weeks = 0, serial = 0;
async function reload(label: string) {
    const before = { money: player.money, businesses: player.businesses.map(b => ({ id: b.id, balance: b.balance, roster: b.studioState?.talentRoster })),
        shares: structuredClone(player.portfolio), contracts: structuredClone(player.world.streamingRightsContracts), mods: structuredClone(player.flags.enabledGlobalActorPacks) };
    const prepared = prepareVerifiedPlayerForPersistence(player, 'MANUAL');
    await saveVerifiedGameData(store, 'series-mod-flow', prepared.player, prepared.manifest);
    const loaded = await loadVerifiedGameData(store, 'series-mod-flow'); assert.equal(loaded.status, 'CURRENT'); player = migratePlayerSave(loaded.player!);
    assert.equal(player.money, before.money, label);
    assert.deepEqual(player.businesses.map(b => ({ id: b.id, balance: b.balance, roster: b.studioState?.talentRoster })), before.businesses, label);
    assert.deepEqual(player.portfolio, before.shares, label); assert.deepEqual(player.flags.enabledGlobalActorPacks, before.mods, label);
    assert.deepEqual(JSON.parse(JSON.stringify(player.world.streamingRightsContracts || {})), JSON.parse(JSON.stringify(before.contracts || {})), label);
    assert(player.flags.extraNPCs.some(n => n.id === actor.id)); saves++;
}
async function tick() { player = (await processGameWeek(player)).player; weeks++; assert(player.flags.extraNPCs.some(n => n.id === actor.id)); }
function hire(mode: 'UPFRONT' | 'WEEKLY_INSTALLMENTS', duration: number) {
    const current = player.flags.extraNPCs.find(n => n.id === actor.id)!;
    const ask = calculateNPCAsk(current, duration);
    const offer = Math.ceil((mode === 'UPFRONT' ? ask.totalAmount : ask.weeklyInstallment) * 2);
    const result = negotiateTalentContract(player, studioId, current, duration, offer, mode);
    assert(result.result.success, result.result.message); player = result.player;
    return roster().find(c => c.npcId === actor.id && c.moviesRemaining > 0)!;
}
function greenlight(ready: Script) {
    const studio = player.businesses.find(b => b.id === studioId)!;
    if (!studio.studioState!.scripts.some(s => s.id === ready.id)) studio.studioState!.scripts.push(ready);
    const input = scriptVariationProjectInput(ready); input.player = player; input.studio = studio;
    input.studioTalentRoster = roster(); input.now = () => 8000000 + serial++;
    input.castList = [{ id: 'series-lead', role: 'Lead', roleType: 'LEAD', actorId: actor.id, actorName: actor.name, salary: 0 }];
    input.crewModes.director = 'IN_HOUSE'; input.getCrewData = role => ({ name: `In-House ${role}`, tier: 'In-House', quality: 70, fame: 0, cost: 0 });
    input.getCastableActorById = id => player.flags.extraNPCs.find(n => n.id === id) || NPC_DATABASE.find(n => n.id === id);
    const built = buildGreenlightProject(input);
    const funding = prepareGreenlightFunding({ player, studio, studioCashRequirement: built.studioCashRequirement,
        newCommitment: built.newCommitment, finalInvestorRaised: 0, greenlightPackageBudget: built.greenlightPackageBudget,
        isCreatingNewUniverse: false, normalizedWorldUniverses: {}, newUniverseName: '', randomUniverseColor: '#2563eb' });
    studio.balance = funding.newStudioBalance; studio.studioState!.scripts = built.updatedScripts;
    studio.studioState!.concepts = built.updatedConcepts; studio.studioState!.talentRoster = built.updatedStudioTalentRoster;
    player.studio.talentRoster = built.updatedPlayerTalentRoster; player.commitments = [...funding.updatedCommitments, funding.fundedCommitment];
    assert.equal(funding.fundedCommitment.projectDetails!.type, 'SERIES'); return funding.fundedCommitment.id;
}
async function produce(id: string) {
    let n = 0, last = '';
    while (player.commitments.find(c => c.id === id)?.projectPhase !== 'AWAITING_RELEASE') {
        await tick(); assert(++n < 90); const phase = player.commitments.find(c => c.id === id)?.projectPhase;
        assert(phase, 'Project must remain in production until delivered');
        if (phase !== last || n % 8 === 0) { await reload(`production-${id}-${n}`); console.log(`PASS production ${id} ${n} ${phase}`); last = phase!; }
    }
    assert.equal(player.commitments.find(c => c.id === id)!.productionCalendar!.elapsedWeeks,
        player.commitments.find(c => c.id === id)!.productionCalendar!.totalWeeks);
}
async function license(id: string) {
    const commitment = player.commitments.find(c => c.id === id)!; const now = getAbsoluteWeek(player.age, player.currentWeek);
    const lot = buildStreamingBiddingRightsLot({ world: player.world, sourceProjectId: id, sellerPartyId: studioId,
        startsAtAbsoluteWeek: now + 1, maximumDurationWeeks: 52, windowType: 'FIRST_WINDOW' }).lot!;
    const room = advanceStreamingBiddingSession(createStreamingBiddingSession(buildSeriesStreamingSessionInput(player, commitment.projectDetails!, id, lot)), 45);
    const offer = getStreamingBiddingClosingOffers(room).sort((a, b) => b.minimumGuarantee - a.minimumGuarantee)[0]; assert(offer);
    const studio = player.businesses.find(b => b.id === studioId)!, cash = studio.balance, money = player.money;
    const funds = studio.studioState!.productionFund || 0, locked = (studio.studioState!.lockedStreamingFunds || []).reduce((sum, f) => sum + f.amount, 0);
    const outcome = signThroughReleaseHandler(player, commitment, room, offer); assert(outcome.player, outcome.message); player = outcome.player!;
    const signedStudio = player.businesses.find(b => b.id === studioId)!;
    assert.equal(player.money, money); assert.equal(signedStudio.balance, cash + offer.minimumGuarantee);
    assert.equal(signedStudio.studioState!.productionFund || 0, funds + offer.productionFunding);
    assert.equal((signedStudio.studioState!.lockedStreamingFunds || []).reduce((sum, f) => sum + f.amount, 0), locked + offer.futureSeasonFunding);
    const signed = Object.values(player.world.streamingRightsContracts || {}).find(c => c.sourceOfferId === offer.id)!; assert(signed);
    const beforeRetry = player.money, beforeBalance = signedStudio.balance;
    assert(!signThroughReleaseHandler(player, commitment, room, offer).player); assert.equal(player.money, beforeRetry); assert.equal(signedStudio.balance, beforeBalance);
    await reload(`signed-${id}`);
    let wait = 0; while (!player.activeReleases.some(r => r.id === id) && !player.pastProjects.some(r => r.id === id)) { await tick(); assert(++wait < 25); }
    console.log(`PASS signed ${id}: guarantee ${offer.minimumGuarantee}, production fund ${offer.productionFunding}, locked next-season fund ${offer.futureSeasonFunding}; one payment`);
}
const firstDeal = hire('UPFRONT', 1); const originalAmount = firstDeal.totalAmount;
await reload('hired'); const firstId = greenlight(script); assert.equal(roster().find(c => c.id === firstDeal.id)!.moviesRemaining, 0);
await produce(firstId); await license(firstId);
for (let i = 0; i < 8; i++) await tick(); await reload('season-one-viewing');
const source = player.activeReleases.find(r => r.id === firstId) || player.pastProjects.find(r => r.id === firstId); assert(source);
const studio = player.businesses.find(b => b.id === studioId)!;
const continuation = createContinuationScript({ player, studioScripts: studio.studioState!.scripts, project: source, mode: 'SEQUEL', title: 'Workshop Days: Season Two' });
assert(continuation.ok, continuation.eligibility.message);
const workshop = structuredClone(studio); workshop.studioState!.writers = [{ id: 'series-writer', name: 'Writer', skill: 75, fee: 0, speed: 1, tier: 'COMMON', stats: { creativity: 75, dialogue: 75, structure: 75, pacing: 75 } }];
workshop.studioState!.scripts = [{ ...continuation.script!, status: 'IN_DEVELOPMENT', writerId: 'series-writer', totalDevelopmentWeeks: 1 }];
const nextScript = processBusinessWeek(workshop, 100, player.currentWeek + 1, 'en', player.age).updated.studioState!.scripts[0]; assert.equal(nextScript.status, 'READY');
const star = player.flags.extraNPCs.find(n => n.id === actor.id)!; star.tier = 'A_LIST'; star.stats.fame = 95;
const nextDeal = hire('WEEKLY_INSTALLMENTS', 2); assert(nextDeal.totalAmount > originalAmount, 'A breakout actor can demand more for a new contract');
const priorDeal = roster().find(c => c.id === firstDeal.id);
if (priorDeal) assert.equal(priorDeal.totalAmount, originalAmount, 'Old signed terms are immutable');
else assert.equal(firstDeal.amountPaid, originalAmount, 'The retired one-film deal was already paid in full');
assert(getSeriesPerformanceEvidence(player, { ...((source as any).projectDetails || source), ...nextScript, type: 'SERIES' } as any, 'next-season'), 'Observed first-season evidence informs renewal');
const secondId = greenlight(nextScript); await produce(secondId); await license(secondId);
for (let i = 0; i < 5; i++) { await tick(); await reload(`after-series-${i}`); }
const parent = structuredClone(player), creatorCount = getEnabledGlobalCreatorProfiles(parent).length;
for (const isDead of [false, true]) for (const gender of ['MALE', 'FEMALE']) {
    const career = structuredClone(parent); career.flags.isDead = isDead;
    const child = { id: `heir-${gender}`, name: 'Series Heir', relation: 'Child', age: 22, gender, closeness: 100, image: 'avatar' };
    career.relationships = [child as any]; const expected = getLegacyInheritancePreview(career);
    player = continueThroughAppHandler(career, child);
    assert.equal(player.money, expected.inheritedMoney); assert.deepEqual(player.portfolio, expected.inheritedPortfolio);
    assert.deepEqual(player.flags.enabledGlobalActorPacks, parent.flags.enabledGlobalActorPacks); assert.deepEqual(player.flags.modHistory, parent.flags.modHistory);
    assert.equal(getEnabledGlobalCreatorProfiles(player).length, creatorCount);
    assert.equal(player.businesses.find(b => b.id === studioId)!.balance, parent.businesses.find(b => b.id === studioId)!.balance);
    for (const contract of Object.values(parent.world.streamingRightsContracts || {})) {
        const inherited = player.world.streamingRightsContracts![contract.id]; assert(inherited); assert.equal(inherited.minimumGuarantee, contract.minimumGuarantee);
        assert.deepEqual(inherited.settlement, contract.settlement);
    }
    await reload(`heir-${gender}-${isDead}`);
    for (let n = 0; n < 3; n++) { await tick(); await reload(`heir-week-${gender}-${isDead}-${n}`); }
    assert.equal(getEnabledGlobalCreatorProfiles(player).length, creatorCount);
    console.log(`PASS ${isDead ? 'deceased' : 'living'} parent → ${gender === 'MALE' ? 'son' : 'daughter'} → 3 weeks/reloads: mods, actors, contracts and inheritance preserved`);
}
console.log(`PASS full series production → exact release signing → observed first season → higher actor demand/new contract → season two production/signing → next weeks → four succession paths; ${weeks} actual game weeks, ${saves} verified save/reloads.`);
