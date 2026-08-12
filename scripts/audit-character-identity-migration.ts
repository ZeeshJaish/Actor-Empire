import { strict as assert } from 'node:assert';
import { INITIAL_PLAYER, type Player } from '../types';
import { migrateLegacyCharacterIdentity } from '../services/characterIdentityMigration';
import { migratePlayerSave } from '../services/saveMigration';

const legacyProject = {
    title: 'Clockwork Crown',
    type: 'MOVIE',
    description: 'A disgraced inventor fights the machine ruler of a divided city.',
    studioId: 'legacy_studio',
    subtype: 'ORIGINAL',
    genre: 'SCI_FI',
    budgetTier: 'MID',
    estimatedBudget: 28_000_000,
    visibleHype: 'MID',
    hiddenStats: {
        qualityScore: 74,
        scriptQuality: 78,
        directorQuality: 70,
        castingStrength: 73,
        distributionPower: 60,
        rawHype: 55,
        prestigeBonus: 0,
    },
    directorName: 'Legacy Director',
    visibleDirectorTier: 'PROFESSIONAL',
    visibleScriptBuzz: 'Strong',
    visibleCastStrength: 'Solid',
    castList: [
        { id: 'player', name: 'Legacy Star', role: 'Lead Actor', isPlayer: true, actorId: 'PLAYER_SELF', type: 'ACTOR' },
        { id: 'villain', name: 'Old Rival', role: 'Supporting Actor', actorId: 'npc_villain', type: 'ACTOR' },
    ],
} as any;

const legacyPlayer: Player = {
    ...INITIAL_PLAYER,
    name: 'Legacy Star',
    businesses: [{
        id: 'legacy_studio',
        name: 'Northlight House',
        type: 'PRODUCTION_HOUSE',
        subtype: 'INDIE_STUDIO',
        level: 1,
        revenue: 0,
        expenses: 0,
        employees: 0,
        staff: [],
        products: [],
        stats: { reputation: 50, quality: 50, efficiency: 50, marketing: 50 },
        studioState: {
            scripts: [{
                id: 'legacy_script',
                title: 'Clockwork Crown',
                genres: ['SCI_FI'],
                status: 'READY',
                quality: 76,
                options: [],
                writerId: null,
                weeksInDevelopment: 0,
                totalDevelopmentWeeks: 0,
                isOriginal: true,
                projectType: 'MOVIE',
                logline: legacyProject.description,
            }],
            concepts: [{
                id: 'legacy_concept',
                scriptId: 'legacy_script',
                lastUpdated: 1,
                crewModes: {},
                selectedCrew: {},
                castList: legacyProject.castList,
                selectedLocations: [],
                tone: 50,
            }],
            writers: [],
            ipMarket: [],
            lastMarketRefreshWeek: 1,
            lastWriterRefreshWeek: 1,
        },
    } as any],
    commitments: [{
        id: 'legacy_commitment',
        name: 'Clockwork Crown',
        type: 'ACTING_GIG',
        roleType: 'LEAD',
        energyCost: 10,
        income: 1_000_000,
        payoutType: 'LUMPSUM',
        projectDetails: legacyProject,
    }],
    activeReleases: [{
        id: 'legacy_release',
        name: 'Clockwork Crown',
        type: 'MOVIE',
        roleType: 'LEAD',
        projectDetails: legacyProject,
        distributionPhase: 'THEATRICAL',
        weekNum: 2,
        weeklyGross: [10_000_000],
        totalGross: 10_000_000,
        budget: 28_000_000,
        status: 'RUNNING',
        productionPerformance: 88,
    }],
    pastProjects: [{
        id: 'legacy_archive',
        name: 'Clockwork Crown',
        type: 'ACTING_GIG',
        roleType: 'LEAD',
        year: 24,
        earnings: 1_000_000,
        rating: 8,
        reception: 'HIT',
        projectQuality: 82,
        boxOfficeResult: '$80M',
        outcomeTier: 'HIT',
        subtype: 'ORIGINAL',
        futurePotential: {
            sequelChance: 20,
            franchiseChance: 10,
            rebootChance: 0,
            renewalChance: 0,
            isFranchiseStarter: false,
            isSequelGreenlit: false,
            isRenewed: false,
            seriesStatus: 'N/A',
        },
        studioId: 'legacy_studio',
        castList: legacyProject.castList,
    } as any],
    world: {
        ...INITIAL_PLAYER.world,
        universes: {
            ...INITIAL_PLAYER.world.universes,
            LEGACY_UNIVERSE: {
                id: 'LEGACY_UNIVERSE',
                name: 'Clockwork Universe',
                studioId: 'legacy_studio',
                currentPhase: 'PHASE_1',
                saga: 1,
                momentum: 50,
                brandPower: 50,
                marketShare: 10,
                color: '#54d2ff',
                roster: [{
                    name: 'The Inventor',
                    actorId: 'PLAYER_SELF',
                    actorName: 'Legacy Star',
                    status: 'ACTIVE',
                    fanApproval: 80,
                }],
                slate: [{ ...legacyProject, universeId: 'LEGACY_UNIVERSE' }],
                weeksUntilNextPhase: 20,
            },
        },
    },
    weeklyOpportunities: {
        jobs: [],
        auditions: [{
            id: 'legacy_offer',
            roleType: 'LEAD',
            projectName: 'Clockwork Crown',
            genre: 'SCI_FI',
            config: { label: 'Lead', difficulty: 40, energyCost: 20, baseIncome: 100_000, expGain: 10 },
            project: legacyProject,
            estimatedIncome: 1_000_000,
            source: 'AGENT',
        }],
    },
};

const migrated = migrateLegacyCharacterIdentity(legacyPlayer);
const studioState = migrated.businesses[0].studioState!;
assert(studioState.scripts[0].storyCompass, 'Legacy scripts should receive a Story Compass.');
assert(studioState.concepts[0].storyCompass, 'Legacy Greenlight drafts should receive a Story Compass.');
assert(studioState.concepts[0].castList.every(member => member.storyRole && member.storyFunction), 'Legacy draft cast should receive identities.');
assert(migrated.commitments[0].projectDetails?.castList?.every(member => member.storyRole), 'Active projects should receive cast identities.');
assert(migrated.pastProjects[0].playerCharacterProfile, 'Archived player credits should receive a player character profile.');
assert.equal(migrated.world.universes.LEGACY_UNIVERSE.roster[0].identitySource, 'CANON');
assert.equal(migrated.world.universes.LEGACY_UNIVERSE.slate[0].storyCompass?.flexibility, 'PROTECTED');
assert(migrated.weeklyOpportunities.auditions[0].characterProfile, 'Existing offers should receive character details.');
assert(migrated.weeklyOpportunities.auditions[0].roleFit, 'Existing offers should receive role fit.');

const migratedTwice = migrateLegacyCharacterIdentity(migrated);
assert.deepEqual(migratedTwice, migrated, 'Role identity migration must be idempotent.');

const throughSavePipeline = migratePlayerSave(legacyPlayer);
assert.equal(throughSavePipeline.flags.saveMigrationVersion, 23);
assert(throughSavePipeline.pastProjects[0].playerCharacterProfile, 'Central save migration should apply role identity repair.');

console.log('Character identity migration audit passed: coverage, canon protection, and idempotence.');
