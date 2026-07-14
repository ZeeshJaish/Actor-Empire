import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildLegacyStudioInheritance, getInheritedStudioProjects } from '../services/legacyLogic';
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
        }
    ],
    activeReleases: [],
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

assert.equal(deceasedInheritance.legacyProjects.length, 1, 'studio-owned past project should move into hidden inherited studio history');
assert.equal(deceasedInheritance.legacyProjects[0].castList[0].actorId, deceasedInheritance.parentActor.id, 'old player acting credit should point to parent actor, not child');
assert.equal((deceasedInheritance.world as any).universes.U_OATH.roster[0].actorId, deceasedInheritance.parentActor.id, 'old universe roster should point to parent actor');
assert.ok(!deceasedJson.includes('"PLAYER_SELF"'), 'inherited studio/world history must not keep PLAYER_SELF credits');
assert.ok(!deceasedInheritance.flags.extraNPCs.some((npc: any) => npc.id === deceasedInheritance.parentActor.id), 'deceased parent should not be castable');

const livingInheritance = buildLegacyStudioInheritance(makeParent(false), { isDeceased: false });
assert.ok(livingInheritance.flags.extraNPCs.some((npc: any) => npc.id === livingInheritance.parentActor.id), 'living parent should be available as an actor connection');

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
assert.equal(inheritedProjects.length, 1, 'child should see inherited studio projects by studio id');
assert.equal(inheritedProjects[0].franchiseId, 'franchise_oath', 'franchise id should survive the handoff');
assert.equal(inheritedProjects[0].castList[0].actorId, livingInheritance.parentActor.id, 'child should not become the old character actor');

const universeProjects = getUniverseDashboardProjects(childLikePlayer, 'U_OATH' as any, []);
assert.ok(universeProjects.some(project => project.id === 'legacy_movie_1'), 'universe dashboard should include inherited studio projects');

const uiFiles = [
    'views/lifestyle/business/DevelopmentLab.tsx',
    'views/lifestyle/business/GreenlightWizard.tsx',
    'views/mobile/ForbesApp.tsx'
];

for (const file of uiFiles) {
    const contents = fs.readFileSync(file, 'utf8');
    assert.ok(!/family legacy franchise/i.test(contents), `${file} must not expose a special family legacy franchise label`);
}

console.log('Legacy inheritance audit passed.');
