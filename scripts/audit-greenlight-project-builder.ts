import { createContract } from '../services/talentService';
import { talentAmountOutstanding } from '../services/talentRoster';
import { strict as assert } from 'node:assert';
import type {
    BackgroundCastingPlan,
    Business,
    Commitment,
    Player,
    Script,
    StudioContract,
} from '../types';
import { buildGreenlightBuzz } from '../views/lifestyle/business/greenlightBuzz';
import {
    buildGreenlightProject,
    prepareGreenlightFunding,
    type BuildGreenlightProjectInput,
} from '../views/lifestyle/business/greenlightProjectBuilder';

const script: Script = {
    id: 'script_builder_audit',
    title: 'Builder Audit',
    genres: ['DRAMA'],
    status: 'READY',
    quality: 80,
    options: [],
    writerId: null,
    weeksInDevelopment: 0,
    totalDevelopmentWeeks: 0,
    isOriginal: true,
    projectType: 'MOVIE',
    sourceMaterial: 'ORIGINAL',
};

const backgroundCastingPlan: BackgroundCastingPlan = {
    version: 1,
    scale: 'LEAN',
    source: 'AGENCY',
    payStandard: 'COMPLIANT',
    control: 'DEPARTMENT',
    performerCount: 20,
    recurringDayPlayers: 2,
    specialistRoles: [],
    estimatedCost: 100_000,
    authenticity: 55,
    reliability: 60,
    setCare: 50,
    localGoodwill: 20,
    discoveryPotential: 10,
};

const player = {
    name: 'Audit Player',
    gender: 'MALE',
    age: 30,
    currentWeek: 12,
    flags: { extraNPCs: [] },
    relationships: [],
    stats: { fame: 50 },
    commitments: [],
    activeReleases: [],
    world: { universes: {}, platforms: {} },
    studio: {
        talentRoster: [{ npcId: 'npc_unused', moviesRemaining: 2 }],
    },
    businesses: [],
    news: [],
    logs: [],
    x: { feed: [] },
} as unknown as Player;

const studio = {
    id: 'studio_audit',
    name: 'Audit Pictures',
    balance: 20_000_000,
    studioState: {
        writers: [],
        scripts: [script],
        concepts: [{ scriptId: script.id }],
        productionFund: 1_000_000,
        lockedStreamingFunds: [],
        financeLedger: [],
    },
} as unknown as Business;

const projectInput: BuildGreenlightProjectInput = {
    player,
    studio,
    selectedScript: script,
    selectedScriptId: script.id,
    selectedLocations: ['location_a'],
    castList: [{
        id: 'lead',
        role: 'Lead',
        roleType: 'LEAD',
        actorId: 'PLAYER_SELF',
        actorName: 'Audit Player',
    }],
    crewModes: {
        director: 'SELF',
        cinematographer: 'IN_HOUSE',
        composer: 'IN_HOUSE',
        lineProducer: 'IN_HOUSE',
        vfx: 'IN_HOUSE',
    },
    selectedCrew: {
        director: null,
        cinematographer: null,
        composer: null,
        lineProducer: null,
        vfx: null,
    },
    currentReturningTalent: [],
    budgetBreakdown: { total: 5_000_000 },
    reservedMarketingBudget: 1_000_000,
    musicPreviewProject: null,
    effectiveMusicStrategy: 'COMPOSER_ONLY',
    selectedMusicArtistIds: [],
    effectiveMusicArtistCount: 0,
    activeMusicCreditRoles: [],
    isStudioDecidedMusicPlan: false,
    musicCatalogArtists: [],
    currentCastingStrength: 75,
    currentEstimatedQuality: 80,
    currentEstimatedBuzz: 40,
    playerActingTalent: 70,
    selectedUniverseId: null,
    selectedFranchiseId: null,
    newUniverseName: '',
    previousFranchiseInstallments: [],
    selectedStoryCompass: null,
    effectiveConnectedIntent: 'SOLO',
    studioPrestigeScore: 50,
    tone: 50,
    linkedUniverseCastCount: 0,
    backgroundCastingPlan,
    studioFranchises: [],
    visualStyle: 'REALISTIC',
    pacing: 'MODERATE',
    equipmentChoices: {},
    isPrimaryStudio: true,
    studioTalentRoster: [],
    findLocation: () => ({ name: 'Audit Stage', quality: 70 }),
    getCrewData: role => ({
        name: role === 'director' ? 'Audit Player' : `In-House ${role}`,
        tier: role === 'director' ? 'Player' : 'In-House',
        quality: 65,
        fame: 0,
        cost: 0,
    }),
    getInHouseFame: () => 10,
    getInHouseQuality: () => 60,
    getDefaultCharacterName: () => 'Audit Lead',
    getCastableActorById: () => undefined,
    now: () => 1_234,
    random: () => 0.5,
};
const project = buildGreenlightProject(projectInput);

assert.ok(project.newCommitment.projectDetails?.cinemaExposure, 'Greenlight must distinguish attention potential from actual public exposure');
assert.equal(project.newCommitment.projectDetails.cinemaExposure.events.length, 0, 'A private package build must not announce itself');
assert.deepEqual(buildGreenlightProject({...projectInput,currentEstimatedBuzz:100,random:()=>0.99}).newCommitment.projectDetails!.cinemaExposure,
    project.newCommitment.projectDetails.cinemaExposure,'Legacy buzz and hidden quality variance cannot leak into package attention or exposure');

assert.equal(project.newCommitment.id, 'proj_1234');
assert.equal(project.newCommitment.projectPhase, 'PRE_PRODUCTION');
assert.equal(project.newCommitment.phaseWeeksLeft, 7);
assert.equal(project.greenlightPackageBudget, 6_000_000);
assert.equal(project.studioCashRequirement, 6_000_000);
assert.equal(project.newCommitment.projectDetails?.location?.name, 'Audit Stage');
assert.equal(project.newCommitment.projectDetails?.hiddenStats?.qualityScore, 80);
assert.equal(project.newCommitment.projectDetails?.castList?.[0]?.actorId, 'PLAYER_SELF');
assert.equal(project.updatedScripts[0].status, 'PRODUCED');
assert.equal(project.updatedConcepts.length, 0);

const firstFilmWithPoints = buildGreenlightProject({
    ...projectInput,
    player: { ...player, flags: { ...player.flags, extraNPCs: [{ id: 'actor_alpha', name: 'Actor Alpha', occupation: 'ACTOR', stats: { fame: 60, talent: 80 } }] } } as Player,
    studio: {
        ...studio,
        studioState: {
            ...studio.studioState!,
            writers: [{ id: 'writer_npc_mira_sen', name: 'Mira Sen', skill: 92, fee: 500_000, speed: 0.7, tier: 'A_LIST', stats: { creativity: 92, dialogue: 94, structure: 90, pacing: 92 } }],
        },
    },
    selectedScript: { ...script, writerId: 'writer_npc_mira_sen' },
    castList: [{ id: 'lead', role: 'Lead', roleType: 'LEAD', actorId: 'actor_alpha', actorName: 'Actor Alpha', salary: 1_000_000 }],
    crewModes: { ...projectInput.crewModes, director: 'HIRE' },
    selectedCrew: { ...projectInput.selectedCrew, director: 'director_alpha' },
    getCrewData: role => ({ name: role === 'director' ? 'Director Alpha' : 'In-House', tier: 'ESTABLISHED', quality: 80, cost: role === 'director' ? 2_000_000 : 0 }),
    getCastableActorById: () => ({ stats: { talent: 80, fame: 60 } }),
    talentBackendDraft: {
        'ACTOR:lead:actor_alpha': 3,
        'DIRECTOR:director:director_alpha': 2,
        'WRITER:script_writer:writer_npc_mira_sen': 1,
    },
});
assert.equal(firstFilmWithPoints.newCommitment.projectDetails?.talentParticipation?.contracts.length, 3, `First films must save all agreed participant points: ${JSON.stringify(firstFilmWithPoints.newCommitment.projectDetails?.talentParticipation?.contracts)}`);
assert.equal(firstFilmWithPoints.newCommitment.projectDetails?.talentParticipation?.contracts.find(item => item.role === 'ACTOR')?.backendPoints, 3);
assert.equal(firstFilmWithPoints.newCommitment.projectDetails?.talentParticipation?.processedReceiptKeys.length, 0, 'Phases 1-2 must not pay backend at Greenlight.');

const funding = prepareGreenlightFunding({
    player,
    studio,
    studioCashRequirement: 2_000_000,
    newCommitment: project.newCommitment,
    finalInvestorRaised: 0,
    greenlightPackageBudget: project.greenlightPackageBudget,
    isCreatingNewUniverse: false,
    normalizedWorldUniverses: {},
    finalUniverseId: undefined,
    newUniverseName: '',
    randomUniverseColor: '#2563eb',
});

assert.equal(funding.fundingResult.productionFundApplied, 1_000_000);
assert.equal(funding.fundingResult.studioSpend, 1_000_000);
assert.equal(funding.newProductionFund, 0);
assert.equal(funding.newStudioBalance, 19_000_000);
assert.equal(funding.fundedCommitment.projectDetails?.hiddenStats?.studioCashAtRisk, 1_000_000);
assert.equal(funding.fundedCommitment.projectDetails?.cinemaExposure?.events.length,1,'Actual public Greenlight creates one identified announcement');

const buzz = buildGreenlightBuzz({
    player,
    studio,
    selectedScript: script,
    directorName: 'Audit Director',
    castCount: 1,
    equipmentChoices: {},
    estimatedBudget: 5_000_000,
    estimatedQuality: 90,
    finalizedCastList: [],
    isCreatingNewUniverse: false,
    normalizedWorldUniverses: {},
    isPlayerDirector: false,
    now: () => 2_000,
    random: () => 0.5,
});

assert.equal(buzz.newsItem.headline, 'Must-See: Audit Pictures Bets Big on "Builder Audit"');
assert.equal(buzz.generatedBuzz.filter(item => item.type === 'HEADLINE').length, 1);
assert.equal(buzz.generatedBuzz.filter(item => item.type === 'TWEET').length, 8);
const firstTweet = buzz.generatedBuzz.find(item => item.type === 'TWEET');
assert(firstTweet);
assert.match(firstTweet.data.content, /Audit Director/);

console.log('Greenlight project builder audit passed: package, funding, and launch buzz preserve their core outputs.');

// A contracted performer stays financially payable after the final Greenlight use.
const contractActor = { id: 'actor_contract_qa', name: 'Contract Actor', occupation: 'ACTOR', tier: 'ESTABLISHED', stats: { talent: 80, fame: 60 } };
let contractRoster: StudioContract[] = [{ ...createContract(contractActor.id, 'MOVIE_DEAL', 'WEEKLY_INSTALLMENTS', 3, 52_000_007, 5000, 12), studioId: studio.id }];
const untouched = createContract('unused_actor', 'MOVIE_DEAL', 'UPFRONT', 2, 1000, 500, 12);
for (let index = 0; index < 3; index++) {
    const contractPlayer = { ...player, flags: { ...player.flags, extraNPCs: [contractActor] }, studio: { ...player.studio, talentRoster: contractRoster } } as Player;
    const built = buildGreenlightProject({ ...projectInput,
        player: contractPlayer, studioTalentRoster: [...contractRoster, untouched], isPrimaryStudio: true,
        castList: [
            { id: 'lead', role: 'Lead', roleType: 'LEAD', actorId: contractActor.id, actorName: contractActor.name, salary: 0 },
            { id: 'support', role: 'Supporting', roleType: 'SUPPORTING', actorId: contractActor.id, actorName: contractActor.name, salary: 0 },
        ], now: () => 5000 + index,
    });
    assert.equal(built.safeMovieCastList[0].salary, 0);
    assert.equal(built.updatedStudioTalentRoster.find(c => c.npcId === 'unused_actor')?.moviesRemaining, 2);
    contractRoster = built.updatedStudioTalentRoster.filter(c => c.npcId === contractActor.id);
    assert.equal(contractRoster[0].moviesRemaining, 2 - index);
    assert.deepEqual(built.updatedPlayerTalentRoster, built.updatedStudioTalentRoster);
}
assert.equal(contractRoster[0].status, 'EXPIRED');
assert.equal(talentAmountOutstanding(contractRoster[0]), 52_000_007);
console.log('Greenlight contract lifecycle passed: one use per project, zero extra salary, last use retains unpaid EMI.');

// Exercise the real signing -> Greenlight builder -> week-engine transaction chain.
const { INITIAL_PLAYER } = await import('../types');
const { createBusiness } = await import('../services/businessLogic');
const { migratePlayerSave } = await import('../services/saveMigration');
const { negotiateTalentContract } = await import('../services/talentNegotiation');
const { calculateNPCAsk } = await import('../services/talentService');
const { processGameWeek } = await import('../services/gameLoop');
const { prepareVerifiedPlayerForPersistence } = await import('../services/savePreparation');
let live = structuredClone(INITIAL_PLAYER);
live.id = 'talent_full_flow_qa'; live.name = 'Talent QA'; live.age = 30; live.currentWeek = 49; live.money = 5_000_000_000;
live.pendingEvents = []; live.scheduledEvents = []; live.pendingEvent = null; live.commitments = []; live.activeReleases = [];
live.logs = []; live.news = []; live.inbox = []; live.studio.isUnlocked = true;
const liveStudio = createBusiness('QA Pictures', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, '🎬', 49);
liveStudio.id = 'ui_hq'; liveStudio.balance = 1_000_000_000;
liveStudio.studioState!.scripts = [script];
live.businesses = [liveStudio];
const liveActor = { ...contractActor, gender: 'FEMALE', handle: '@qa', avatar: '', prestigeBias: 'MIXED', openness: 50, netWorth: 100_000, traits: [], bio: 'Contract verification actor', potential: 80 } as any;
live = migratePlayerSave(live);
const fullAsk = calculateNPCAsk(liveActor, 1);
const signed = negotiateTalentContract(live, liveStudio.id, liveActor, 1, Math.ceil(fullAsk.weeklyInstallment * 1.5), 'WEEKLY_INSTALLMENTS');
assert.equal(signed.result.success, true);
assert.equal(signed.player.money, live.money);
live = signed.player;
const liveProject = buildGreenlightProject({ ...projectInput, player: live, studio: live.businesses[0],
    isPrimaryStudio: true, studioTalentRoster: live.studio.talentRoster,
    castList: [{ id: 'lead', role: 'Lead', roleType: 'LEAD', actorId: liveActor.id, actorName: liveActor.name, salary: 0 }], now: () => 90125 });
const liveFunding = prepareGreenlightFunding({ player: live, studio: live.businesses[0], studioCashRequirement: liveProject.studioCashRequirement,
    newCommitment: liveProject.newCommitment, finalInvestorRaised: 0, greenlightPackageBudget: liveProject.greenlightPackageBudget,
    isCreatingNewUniverse: false, normalizedWorldUniverses: {}, finalUniverseId: undefined, newUniverseName: '', randomUniverseColor: '#2563eb' });
live = { ...live, commitments: [liveFunding.fundedCommitment], studio: { ...live.studio, talentRoster: liveProject.updatedPlayerTalentRoster },
    businesses: live.businesses.map(b => ({ ...b, balance: liveFunding.newStudioBalance, studioState: { ...b.studioState!, talentRoster: liveProject.updatedStudioTalentRoster,
        scripts: liveProject.updatedScripts, concepts: liveProject.updatedConcepts, productionFund: liveFunding.newProductionFund } })) };
assert.equal(live.studio.talentRoster[0].moviesRemaining, 0);
assert.equal(live.studio.talentRoster[0].amountPaid, 0);
assert.equal(live.commitments[0].projectDetails!.castList![0].salary, 0);
const prepared = prepareVerifiedPlayerForPersistence(live, 'MANUAL');
assert.equal(prepared.player.studio.talentRoster[0].totalAmount, live.studio.talentRoster[0].totalAmount);
if (process.argv.includes('--write-ui-fixture')) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync('/tmp/talent-exhausted-ui-fixture.json', JSON.stringify(prepared.player));
}
let paidLive = (await processGameWeek(JSON.parse(JSON.stringify(prepared.player)))).player;
assert.equal(paidLive.studio.talentRoster[0].installmentsPaid, 1);
assert.equal(paidLive.studio.talentRoster[0].moviesRemaining, 0);
assert.equal(paidLive.studio.talentRoster[0].amountPaid, Math.ceil(fullAsk.weeklyInstallment * 1.5));
assert.equal(paidLive.finance.history.filter(tx => tx.description.startsWith('Talent Maintenance')).length, 0);
assert.equal(paidLive.businesses[0].studioState!.talentRoster![0].installmentsPaid, 1);
paidLive = migratePlayerSave(JSON.parse(JSON.stringify(paidLive)));
assert.equal(paidLive.studio.talentRoster[0].installmentsPaid, 1);
console.log('Full talent flow passed: immutable signing -> zero cast salary -> funded Greenlight -> last use -> verified save preparation -> EMI after exhaustion -> migration/reload.');
