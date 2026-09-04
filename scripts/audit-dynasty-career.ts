import assert from 'node:assert/strict';
import * as dynastyCareer from '../services/dynastyCareer';
import * as healthConditions from '../services/healthConditions';
import { isPlayerCastInProject } from '../services/ownedProductionCareer';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { createSaveIntegrityManifest, verifySaveIntegrity } from '../services/saveIntegrity';
import type { DynastyCareerMember, Player } from '../types';

const member: DynastyCareerMember = {
    id: 'legacy_parent_actor_parent',
    playerId: 'parent',
    npcId: 'legacy_parent_actor_parent',
    name: 'Asha Empire',
    avatar: 'asha-avatar',
    gender: 'FEMALE',
    generation: 1,
    ageAtSuccession: 48,
    successionAbsoluteWeek: 900,
    health: 78,
    fame: 88,
    talent: 91,
    ambition: 84,
    selectivity: 62,
    familyLoyalty: 90,
    status: 'ACTIVE',
    currentProjectIds: [],
    completedProjectIds: [],
    lastDecisionAbsoluteWeek: 900,
    nextDecisionAbsoluteWeek: 904,
    history: [],
};

const player = {
    id: 'heir',
    name: 'Ira Empire',
    age: 18,
    currentWeek: 5,
    flags: {
        dynastyCareer: {
            schemaVersion: 1,
            members: { [member.npcId]: member },
            lastProcessedAbsoluteWeek: 899,
        },
        extraNPCs: [{
            id: member.npcId,
            name: member.name,
            avatar: member.avatar,
            gender: member.gender,
            occupation: 'ACTOR',
            openness: 82,
            tier: 'A_LIST',
            netWorth: 100_000_000,
            stats: { fame: member.fame, talent: member.talent },
        }],
    },
    relationships: [{
        id: member.npcId,
        npcId: member.npcId,
        name: member.name,
        relation: 'Parent',
        closeness: 100,
        age: 48,
        gender: member.gender,
        image: member.avatar,
        lastInteractionWeek: 1,
    }],
    world: {
        talentBookings: [{
            id: `talent:project_rival:ACTOR:${member.npcId}`,
            npcId: member.npcId,
            role: 'ACTOR',
            projectId: 'project_rival',
            projectOwner: 'INDUSTRY_PRODUCTION',
            producerStudioId: 'LIONSGATE',
            startAbsoluteWeek: 903,
            endAbsoluteWeek: 910,
            status: 'BOOKED',
        }],
        industryProductions: {
            production_rival: {
                id: 'production_rival',
                canonicalProjectId: 'project_rival',
                title: 'The Last Horizon',
                projectType: 'MOVIE',
                genre: 'DRAMA',
                producerStudioId: 'LIONSGATE',
                status: 'PRODUCTION',
                productionCalendar: { preProductionWeeks: 2, productionWeeks: 8, postProductionWeeks: 4, totalWeeks: 14, startedAbsoluteWeek: 901 },
                budgetMillions: 60,
                paidMillions: 15,
                talentBookingIds: [`talent:project_rival:ACTOR:${member.npcId}`],
                writerSource: 'IN_HOUSE_TEAM',
                writerId: null,
                writerName: 'Lionsgate Story Department',
                writerSkill: 75,
                createdAtAbsoluteWeek: 901,
                updatedAtAbsoluteWeek: 903,
            },
        },
    },
    news: [],
    logs: [],
} as unknown as Player;

assert.equal(
    typeof (dynastyCareer as any).processDynastyCareerWeek,
    'function',
    'the dynasty service must expose one canonical weekly processor',
);

const first = (dynastyCareer as any).processDynastyCareerWeek(player, 904);
const working = first.player.flags.dynastyCareer.members[member.npcId];
assert.deepEqual(working.currentProjectIds, ['project_rival'], 'a real booked production should become the former character current project');
assert.equal(working.status, 'ACTIVE', 'working on a project must not force retirement or hiatus');
assert.equal(working.history.filter((event: any) => event.type === 'PROJECT_JOINED').length, 1, 'a joined project should create one career event');
assert.ok(first.news.some((item: any) => item.headline.includes('The Last Horizon')), 'outside work should surface through existing news output');

const repeated = (dynastyCareer as any).processDynastyCareerWeek(first.player, 904);
assert.deepEqual(repeated.player.flags.dynastyCareer, first.player.flags.dynastyCareer, 'processing the same absolute week must be idempotent');
assert.equal(repeated.news.length, 0, 'idempotent reprocessing must not duplicate presentation');

const acceptedFutureBookingPlayer = structuredClone(player) as Player;
acceptedFutureBookingPlayer.world.talentBookings![0].startAbsoluteWeek = 910;
acceptedFutureBookingPlayer.world.talentBookings![0].endAbsoluteWeek = 917;
const acceptedFutureBooking = (dynastyCareer as any).processDynastyCareerWeek(acceptedFutureBookingPlayer, 904);
assert.deepEqual(
    acceptedFutureBooking.player.flags.dynastyCareer.members[member.npcId].currentProjectIds,
    ['project_rival'],
    'an accepted BOOKED role must enter the family career record before its physical work window begins',
);

const releasedPlayer = structuredClone(first.player) as Player;
releasedPlayer.world.talentBookings![0].status = 'RELEASED';
releasedPlayer.world.industryProductions!.production_rival.status = 'DELIVERED';
const completed = (dynastyCareer as any).processDynastyCareerWeek(releasedPlayer, 911);
const completedMember = completed.player.flags.dynastyCareer.members[member.npcId];
assert.deepEqual(completedMember.currentProjectIds, [], 'released bookings must leave the current slate');
assert.deepEqual(completedMember.completedProjectIds, ['project_rival'], 'completed canonical projects should be recorded once');
assert.equal(completedMember.history.filter((event: any) => event.type === 'PROJECT_COMPLETED').length, 1, 'completion should create one durable event');

assert.equal(
    typeof (healthConditions as any).getOldAgeIncidentChance,
    'function',
    'player and dynasty health must share one old-age incident curve',
);
assert.equal((healthConditions as any).getOldAgeIncidentChance(67), 0, 'old-age incidents should not start before age 68');
assert.equal((healthConditions as any).getOldAgeIncidentChance(68), 0.08, 'age 68 should use the existing eight-percent incident chance');
assert.equal((healthConditions as any).getOldAgeIncidentChance(90), 0.26, 'the shared old-age curve should retain its existing cap');

assert.equal(
    typeof (dynastyCareer as any).resolveDynastyCareerDecision,
    'function',
    'career decisions must be independently testable and deterministic',
);
const retirementCandidate: DynastyCareerMember = {
    ...member,
    ageAtSuccession: 74,
    health: 32,
    ambition: 5,
    selectivity: 96,
    nextDecisionAbsoluteWeek: 904,
};
assert.equal(
    (dynastyCareer as any).resolveDynastyCareerDecision(retirementCandidate, 74, 904, false),
    'RETIRED',
    'an older, unhealthy, low-ambition former character may choose retirement',
);
assert.equal(
    (dynastyCareer as any).resolveDynastyCareerDecision(member, 48, 904, true),
    'ACTIVE',
    'a healthy younger former character with a live contract must remain working',
);

const mortalityPlayer = structuredClone(player) as Player;
const mortalityMember = mortalityPlayer.flags.dynastyCareer.members[member.npcId] as DynastyCareerMember;
mortalityMember.ageAtSuccession = 92;
mortalityMember.health = 1;
mortalityMember.currentProjectIds = [];
mortalityMember.nextDecisionAbsoluteWeek = 904;
const fatalWeek = Array.from({ length: 260 }, (_, index) => 904 + index)
    .find(week => (dynastyCareer as any).shouldDynastyMemberDie(mortalityMember, 92 + Math.floor((week - 900) / 52), week, 0));
assert.ok(fatalWeek, 'a deterministic fatal week should exist for a critically unhealthy nonagenarian');
const mortality = (dynastyCareer as any).processDynastyCareerWeek(mortalityPlayer, fatalWeek);
const deceased = mortality.player.flags.dynastyCareer.members[member.npcId];
assert.equal(deceased.status, 'DECEASED', 'fatal old-age health must persist as a terminal dynasty state');
assert.ok(!mortality.player.flags.extraNPCs.some((npc: any) => npc.id === member.npcId), 'deceased dynasty members must leave the castable talent projection');
assert.equal(mortality.player.relationships[0].relation, 'Deceased Parent', 'the existing family relationship must reflect the death');
assert.equal(mortality.news.filter((item: any) => item.headline.includes('dies')).length, 1, 'death should produce one existing-news item');
assert.equal(mortality.player.world.talentBookings![0].status, 'CANCELLED', 'death must release the canonical talent booking immediately');
assert.equal(mortality.player.world.industryProductions!.production_rival.status, 'CANCELLED', 'a non-Platform-AI production without its lead must use the existing terminal cancellation state');

const aiMortalityPlayer = structuredClone(player) as Player;
const aiMortalityMember = aiMortalityPlayer.flags.dynastyCareer.members[member.npcId] as DynastyCareerMember;
aiMortalityMember.ageAtSuccession = 92;
aiMortalityMember.health = 1;
aiMortalityMember.currentProjectIds = [];
aiMortalityMember.nextDecisionAbsoluteWeek = 904;
const aiProduction = aiMortalityPlayer.world.industryProductions!.production_rival as any;
aiProduction.commissioningPlatformId = 'NETFLIX';
aiProduction.platformContentPlanId = 'plan_rival';
aiProduction.aiExecution = {
    standardDurationWeeks: 14, effectiveDurationWeeks: 14, qualityForecast: 75, executionRoll: 0.5, delayRoll: 0.5, overrunRoll: 0.5, failureRoll: 0.5,
    delayWeeks: 0, overrunMillions: 0, leadActorId: member.npcId, leadActorName: member.name, directorId: null, directorName: null,
    writerId: null, writerName: 'Story Department', finalQuality: null, failureDecision: 'NONE', failureResponse: 'NONE', failureResponseAmountMillions: 0,
    failureResponseAppliedAtAbsoluteWeek: null, paidMilestoneIds: ['COMMISSIONING'], controllerAtLastProgression: 'AI', lastProgressedAbsoluteWeek: 903, holdReason: null,
};
aiMortalityPlayer.world.platforms = {
    NETFLIX: {
        id: 'NETFLIX', name: 'Netflix', cashReserve: 1000,
        ai: { slate: [{ id: 'plan_rival', title: 'The Last Horizon', source: 'COMMISSIONED_ORIGINAL', status: 'IN_PRODUCTION', industryProductionId: 'production_rival' }] },
    } as any,
} as any;
const aiMortality = (dynastyCareer as any).processDynastyCareerWeek(aiMortalityPlayer, fatalWeek);
assert.equal(aiMortality.player.world.industryProductions!.production_rival.status, 'ON_HOLD', 'a Platform AI production must enter its existing forced-hold recovery path');
assert.equal(aiMortality.player.world.industryProductions!.production_rival.aiExecution?.holdReason, 'TALENT_DECEASED', 'the persisted hold must explain why production cannot continue');
assert.equal(aiMortality.player.world.platforms!.NETFLIX.ai!.slate[0].status, 'ON_HOLD', 'the canonical platform slate must mirror the production hold');

assert.equal(
    typeof (dynastyCareer as any).evaluateDynastyTalentOffer,
    'function',
    'outside productions must consult the former character career state before casting',
);
const dynastyNpc = player.flags.extraNPCs[0];
const activeOffer = (dynastyCareer as any).evaluateDynastyTalentOffer(player, dynastyNpc, {
    platformId: 'NETFLIX',
    canonicalProjectId: 'project_offer_active',
    genre: 'DRAMA',
    absoluteWeek: 904,
});
assert.equal(activeOffer.eligible, true, 'an active healthy former character should be open to real outside work');

const retiredOfferPlayer = structuredClone(player) as Player;
retiredOfferPlayer.flags.dynastyCareer.members[member.npcId].status = 'RETIRED';
const retiredOffer = (dynastyCareer as any).evaluateDynastyTalentOffer(retiredOfferPlayer, dynastyNpc, {
    platformId: 'NETFLIX',
    canonicalProjectId: 'project_offer_retired',
    genre: 'DRAMA',
    absoluteWeek: 904,
});
assert.equal(retiredOffer.eligible, false, 'a retired dynasty actor cannot be selected for a normal outside production');

const ordinaryNpc = { ...dynastyNpc, id: 'ordinary_npc' };
const ordinaryOffer = (dynastyCareer as any).evaluateDynastyTalentOffer(retiredOfferPlayer, ordinaryNpc, {
    platformId: 'NETFLIX',
    canonicalProjectId: 'project_offer_ordinary',
    genre: 'DRAMA',
    absoluteWeek: 904,
});
assert.equal(ordinaryOffer.eligible, true, 'non-dynasty talent must retain the existing Platform AI behavior');

const inheritedAncestorCommitment = {
    id: 'inherited_ancestor_project',
    name: 'Family Banner',
    type: 'ACTING_GIG',
    roleType: 'LEAD',
    projectPhase: 'PRODUCTION',
    projectDetails: {
        studioId: 'empire_studios',
        castList: [{ actorId: member.npcId, actorName: member.name, roleType: 'LEAD', isPlayer: false }],
    },
} as any;
assert.equal(
    isPlayerCastInProject(inheritedAncestorCommitment),
    false,
    'a roleType left on an inherited commitment must not turn the ancestor role into the heir role',
);

const legacyOnlySave = structuredClone(player) as Player;
delete legacyOnlySave.flags.dynastyCareer;
delete legacyOnlySave.flags.dynastyCareerArchives;
legacyOnlySave.flags.legacyParent = {
    playerId: member.playerId,
    actorId: member.npcId,
    name: member.name,
    gender: member.gender,
    avatar: member.avatar,
    isDeceased: false,
    inheritedAtAge: 48,
    inheritedAtWeek: 1,
    studioIds: [], franchiseIds: [], universeIds: [], projectCount: 1,
};
legacyOnlySave.flags.legacyCareerArchive = {
    parent: legacyOnlySave.flags.legacyParent,
    pastProjects: [{ id: 'legacy_recorded_film', name: 'Recorded Film' }],
    activeReleases: [],
    awards: [],
};
const migratedLegacy = migratePlayerSave(legacyOnlySave);
assert.ok(migratedLegacy.flags.dynastyCareer?.members?.[member.npcId], 'older immediate-parent saves must backfill the canonical dynasty member');
assert.ok(migratedLegacy.flags.dynastyCareerArchives?.[member.npcId], 'older parent archives must backfill the multi-generation archive registry');

const compactionFixture = structuredClone(player) as Player;
compactionFixture.relationships = [];
compactionFixture.flags.extraNPCs = [
    compactionFixture.flags.extraNPCs[0],
    ...Array.from({ length: 400 }, (_, index) => ({ id: `generated_${index}`, name: `Generated ${index}`, occupation: 'ACTOR', tier: 'UNKNOWN', gender: 'NON_BINARY', avatar: '', netWorth: 0, stats: { fame: 0, talent: 30 } })),
];
const compacted = compactPlayerForPersistence(compactionFixture);
assert.ok(compacted.flags.extraNPCs.some((npc: any) => npc.id === member.npcId), 'save compaction must protect a dynasty actor even when no immediate relationship points to them');

const integrityPlayer = structuredClone(player) as Player;
const integrityManifest = createSaveIntegrityManifest(integrityPlayer, 'MANUAL', 1);
const missingDynastyMember = structuredClone(integrityPlayer) as Player;
delete missingDynastyMember.flags.dynastyCareer.members[member.npcId];
assert.equal(verifySaveIntegrity(missingDynastyMember, integrityManifest).ok, false, 'save integrity must detect a silently lost dynasty career member');

console.log('Dynasty career audit passed.');
