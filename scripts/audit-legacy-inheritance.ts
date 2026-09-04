import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    buildLegacyStudioInheritance,
    getAbsoluteWeek,
    getInheritedStudioProjects,
    getStreamingWeeksUntilStart,
    inferStreamingStartWeekAbsolute,
} from '../services/legacyLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { getUniverseDashboardProjects } from '../services/universeLogic';
import { Player } from '../types';

const makeParent = (isDead: boolean): Player => ({
    id: 'parent_player',
    name: 'Arjun Jaish',
    age: 62,
    currentWeek: 28,
    gender: 'MALE',
    avatar: 'parent-avatar',
    money: 900_000_000,
    stats: {
        fame: 91,
        reputation: 84,
        talent: 88,
        looks: 70,
        body: 63,
        health: isDead ? 0 : 72,
        happiness: 66,
        followers: 24_000_000,
        mood: 70,
        energy: 70,
        skills: {},
        genreXP: {}
    },
    businesses: [
        {
            id: 'studio_parent',
            name: 'Jaish Pictures',
            type: 'PRODUCTION_HOUSE',
            balance: 250_000_000,
            staff: [],
            stats: { valuation: 1_400_000_000, brandHealth: 78, customerSatisfaction: 72 },
            config: { quality: 'PRESTIGE' },
            studioState: {
                concepts: [],
                scripts: [],
                departments: {},
                equipment: {},
                financeLedger: [],
                talentRoster: [],
                ownedRights: []
            }
        }
    ],
    studio: { isUnlocked: true, baseType: 'STUDIO_LOT', talentRoster: [], lastTalentRefreshWeek: 1 },
    pastProjects: [
        {
            id: 'legacy_movie_1',
            name: 'Iron Oath',
            studioId: 'studio_parent',
            franchiseId: 'franchise_oath',
            universeId: 'U_OATH',
            projectType: 'MOVIE',
            genre: 'Action',
            year: 60,
            releaseYear: 60,
            gross: 850_000_000,
            imdbRating: 8.4,
            budget: 180_000_000,
            castList: [
                { actorId: 'PLAYER_SELF', actorName: 'Arjun Jaish', name: 'Arjun Jaish', characterName: 'Iron Oath', roleType: 'LEAD' }
            ]
        },
        {
            id: 'parent_external_credit',
            name: 'Harbor Glass',
            studioId: 'outside_studio',
            projectType: 'MOVIE',
            genre: 'Drama',
            year: 58,
            releaseYear: 58,
            gross: 280_000_000,
            imdbRating: 7.8,
            budget: 45_000_000,
            castList: [
                { actorId: 'PLAYER_SELF', actorName: 'Arjun Jaish', name: 'Arjun Jaish', characterName: 'Mohan', roleType: 'LEAD' }
            ]
        }
    ],
    activeReleases: [
        {
            id: 'legacy_live_studio_release',
            name: 'Oath Returns',
            type: 'MOVIE',
            roleType: 'LEAD',
            projectDetails: { studioId: 'studio_parent', title: 'Oath Returns', type: 'MOVIE', castList: [{ actorId: 'PLAYER_SELF', actorName: 'Arjun Jaish', name: 'Arjun Jaish', characterName: 'Iron Oath', roleType: 'LEAD' }], genre: 'Action' },
            distributionPhase: 'THEATRICAL', weekNum: 2, weeklyGross: [45_000_000], totalGross: 45_000_000, budget: 180_000_000, status: 'RUNNING', productionPerformance: 82,
            streaming: {
                platformId: 'HULU',
                weekOnPlatform: 1,
                totalViews: 0,
                weeklyViews: [],
                isLeaving: false,
                startWeek: 31,
                startWeekAbsolute: getAbsoluteWeek(62, 28) + 3,
            },
        }
    ],
    commitments: [
        { id: 'legacy_studio_commitment', name: 'Oath: Genesis', type: 'ACTING_GIG', energyCost: 0, income: 0, payoutType: 'LUMPSUM', projectPhase: 'PRE_PRODUCTION', projectDetails: { studioId: 'studio_parent', title: 'Oath: Genesis', type: 'MOVIE', genre: 'Action', castList: [{ actorId: 'PLAYER_SELF', actorName: 'Arjun Jaish', name: 'Arjun Jaish', characterName: 'Iron Oath', roleType: 'LEAD' }] } }
    ],
    awards: [
        { id: 'legacy_award', name: 'Oscar', category: 'Best Actor', year: 60, outcome: 'WON', projectId: 'legacy_movie_1', projectName: 'Iron Oath', type: 'OSCAR' }
    ],
    world: {
        universes: {
            U_OATH: {
                id: 'U_OATH',
                name: 'Oath Universe',
                studioId: 'studio_parent',
                roster: [
                    { id: 'iron_oath', characterId: 'iron_oath', name: 'Iron Oath', actorId: 'PLAYER_SELF', actorName: 'Arjun Jaish', status: 'ACTIVE' }
                ],
                slate: [],
                currentPhase: 'PHASE_1_ORIGINS',
                saga: 1,
                momentum: 75,
                brandPower: 80,
                marketShare: 12,
                color: '#facc15'
            }
        },
        studios: {},
        projects: [],
        platforms: {},
        npcVentures: {}
    },
    flags: {
        isDead,
        extraNPCs: [
            {
                id: 'npc_existing_friend',
                name: 'Existing Friend',
                gender: 'FEMALE',
                tier: 'ESTABLISHED',
                occupation: 'ACTOR',
                netWorth: 20_000_000,
                stats: { fame: 60, talent: 70 }
            }
        ]
    }
} as unknown as Player);

const deceasedInheritance = buildLegacyStudioInheritance(makeParent(true), { isDeceased: true });
const deceasedJson = JSON.stringify({
    businesses: deceasedInheritance.businesses,
    studio: deceasedInheritance.studio,
    world: deceasedInheritance.world,
    projects: deceasedInheritance.legacyProjects
});

assert.equal(deceasedInheritance.legacyProjects.length, 2, 'studio-owned past and live projects should move into inherited studio history');
assert.equal(deceasedInheritance.legacyProjects[0].castList[0].actorId, deceasedInheritance.parentActor.id, 'old player acting credit should point to parent actor, not child');
assert.equal(deceasedInheritance.activeReleases.length, 1, 'a live inherited studio release must keep processing after the handoff');
assert.equal(deceasedInheritance.commitments.length, 1, 'a studio production already in motion must remain on the inherited slate');
assert.equal(deceasedInheritance.flags.legacyCareerArchive.pastProjects.length, 2, 'the full parent filmography must survive, including outside acting work');
assert.equal(deceasedInheritance.flags.legacyCareerArchive.awards.length, 1, 'the parent award record must survive in the generation archive');
assert.equal(deceasedInheritance.flags.legacyCareerArchive.pastProjects[1].castList[0].actorId, deceasedInheritance.parentActor.id, 'parent-only credits must never become the child credit');
assert.equal((deceasedInheritance.world as any).universes.U_OATH.roster[0].actorId, deceasedInheritance.parentActor.id, 'old universe roster should point to parent actor');
assert.ok(!deceasedJson.includes('"PLAYER_SELF"'), 'inherited studio/world history must not keep PLAYER_SELF credits');
assert.ok(!deceasedInheritance.flags.extraNPCs.some((npc: any) => npc.id === deceasedInheritance.parentActor.id), 'deceased parent should not be castable');

const livingInheritance = buildLegacyStudioInheritance(makeParent(false), { isDeceased: false });
assert.ok(livingInheritance.flags.extraNPCs.some((npc: any) => npc.id === livingInheritance.parentActor.id), 'living parent should be available as an actor connection');
const livingDynastyMember = livingInheritance.flags.dynastyCareer?.members?.[livingInheritance.parentActor.id];
assert.ok(livingDynastyMember, 'living succession should create one canonical dynasty career member');
assert.equal(livingDynastyMember.status, 'ACTIVE', 'succession must not automatically retire a living former character');
assert.equal(livingDynastyMember.ageAtSuccession, 62, 'the former character must retain their real age when control moves to a younger heir');
assert.equal(
    livingInheritance.flags.dynastyCareerArchives?.[livingInheritance.parentActor.id]?.pastProjects?.length,
    2,
    'the parent filmography should be stored under its stable actor id for multi-generation retrieval',
);

const heirInheritance = buildLegacyStudioInheritance(makeParent(true), {
    isDeceased: true,
    heirAge: 18,
    heirWeek: 28,
});
const inheritedStreaming = heirInheritance.activeReleases[0].streaming;
assert.equal(
    inheritedStreaming.startWeekAbsolute,
    getAbsoluteWeek(18, 28) + 3,
    'an inherited streaming presale must keep its three-week wait instead of retaining the parent age clock',
);
assert.equal(
    getStreamingWeeksUntilStart(inheritedStreaming, 18, 28),
    3,
    'the heir dashboard should show the preserved three-week streaming wait',
);

const brokenHeirSave = {
    ...makeParent(true),
    age: 18,
    activeReleases: [{
        ...makeParent(true).activeReleases[0],
        streaming: {
            ...makeParent(true).activeReleases[0].streaming,
            startWeek: 31,
            startWeekAbsolute: getAbsoluteWeek(18, 28) + 570,
        },
    }],
} as Player;
const repairedHeirSave = migratePlayerSave(brokenHeirSave);
assert.equal(
    repairedHeirSave.activeReleases[0].streaming?.startWeekAbsolute,
    getAbsoluteWeek(18, 28) + 3,
    'loading an affected heir save must repair a 570-week streaming delay from its calendar week',
);
assert.equal(
    inferStreamingStartWeekAbsolute({ startWeek: 2 }, 18, 50),
    getAbsoluteWeek(18, 50) + 4,
    'streaming rollout timing must survive the week-52 calendar rollover',
);

const childLikePlayer = {
    ...makeParent(false),
    name: 'Aarav Jaish',
    age: 19,
    pastProjects: [],
    activeReleases: [],
    flags: {
        legacyParent: livingInheritance.legacyParent,
        legacyStudioProjects: livingInheritance.legacyProjects,
        extraNPCs: livingInheritance.flags.extraNPCs
    }
} as unknown as Player;

const inheritedProjects = getInheritedStudioProjects(childLikePlayer, 'studio_parent');
assert.equal(inheritedProjects.length, 2, 'child should see inherited studio projects by studio id');
assert.equal(inheritedProjects[0].franchiseId, 'franchise_oath', 'franchise id should survive the handoff');
assert.equal(inheritedProjects[0].castList[0].actorId, livingInheritance.parentActor.id, 'child should not become the old character actor');

const universeProjects = getUniverseDashboardProjects(childLikePlayer, 'U_OATH' as any, []);
assert.ok(universeProjects.some(project => project.id === 'legacy_movie_1'), 'universe dashboard should include inherited studio projects');

const uiFiles = [
    'views/lifestyle/business/DevelopmentLab.tsx',
    'views/lifestyle/business/components/DevelopmentLabScriptVault.tsx',
    'views/lifestyle/business/components/DevelopmentLabFranchiseManager.tsx',
    'views/lifestyle/business/components/DevelopmentLabUniverseManager.tsx',
    'views/lifestyle/business/components/DevelopmentLabUniverseDashboard.tsx',
    'views/lifestyle/business/components/DevelopmentLabUniverseMerch.tsx',
    'views/lifestyle/business/GreenlightWizard.tsx',
    'views/mobile/ForbesApp.tsx',
    'views/mobile/ImdbApp.tsx',
    'views/mobile/BoxOfficeApp.tsx',
    'views/lifestyle/business/ProductionHouseGame.tsx'
];

for (const file of uiFiles) {
    const contents = fs.readFileSync(file, 'utf8');
    assert.ok(!/family legacy franchise/i.test(contents), `${file} must not expose a special family legacy franchise label`);
}

assert.ok(fs.readFileSync('views/mobile/ImdbApp.tsx', 'utf8').includes('legacyCareerArchive'), 'IMDb must expose a separate parent archive instead of merging credits into the child profile');
assert.ok(fs.readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8').includes('legacyCareerArchive'), 'Box Office must retain prior-generation historical totals');
assert.ok(fs.readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8').includes('getInheritedStudioProjects'), 'Inherited studio libraries must remain visible in the production house');
assert.ok(fs.readFileSync('services/gameLoop.ts', 'utf8').includes('isLegacyCareerProject'), 'A completed inherited release must return to the parent archive instead of becoming the child credit');

console.log('Legacy inheritance audit passed.');
