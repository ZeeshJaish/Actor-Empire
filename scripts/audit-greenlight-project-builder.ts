import { strict as assert } from 'node:assert';
import type {
    BackgroundCastingPlan,
    Business,
    Commitment,
    Player,
    Script,
} from '../types';
import { buildGreenlightBuzz } from '../views/lifestyle/business/greenlightBuzz';
import {
    buildGreenlightProject,
    prepareGreenlightFunding,
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

const project = buildGreenlightProject({
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
});

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
