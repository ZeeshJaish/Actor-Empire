import {
    ActiveRelease,
    Business,
    CastMember,
    Player,
    Script,
    StoryCompass,
    UniverseId,
} from '../types';
import { getCastStoryRead } from './characterStoryFit';
import { getActorTalent } from './roleLogic';
import { normalizeUniverseForSave } from './universeLogic';

export const CANON_STORY_QA_PREFIX = 'cheat_canon_story_';

interface QaActor {
    id: string;
    name: string;
    avatar?: string;
    talent?: number;
    fame?: number;
}

const getQaActor = (actors: QaActor[], index: number, fallbackName: string): QaActor => (
    actors[index % Math.max(1, actors.length)] || {
        id: `${CANON_STORY_QA_PREFIX}actor_${index}`,
        name: fallbackName,
        talent: 74,
        fame: 28,
    }
);

export const buildCanonStoryQaFixture = (
    player: Player,
    studio: Business,
    actors: QaActor[] = [],
): Player => {
    const universeId = `${CANON_STORY_QA_PREFIX}universe` as UniverseId;
    const franchiseId = `${CANON_STORY_QA_PREFIX}franchise`;
    const firstProjectId = `${CANON_STORY_QA_PREFIX}project_origin`;
    const releaseId = `${CANON_STORY_QA_PREFIX}release_showdown`;
    const scriptId = `${CANON_STORY_QA_PREFIX}script_fracture`;
    const currentAge = Math.max(18, player.age || 18);
    const currentWeek = Math.max(1, player.currentWeek || 1);
    const knownHero = getQaActor(actors, 0, 'Maya Sterling');
    const breakoutVillain = getQaActor(actors, Math.max(1, actors.length - 1), 'Eli Voss');
    const mentorActor = getQaActor(actors, 1, 'Marcus Vale');
    const rivalActor = getQaActor(actors, 2, 'Noor Sayeed');

    const storyCompass: StoryCompass = {
        perspective: 'ENSEMBLE',
        conflictSource: 'ANTAGONIST',
        worldRule: 'MIXED',
        tone: 'MORALLY_GREY',
        castShape: 'ENSEMBLE',
        flexibility: 'PROTECTED',
        source: 'CANON',
        confidence: 96,
    };

    const cast: Array<CastMember & { talent?: number; fame?: number }> = [
        {
            id: `${CANON_STORY_QA_PREFIX}cast_player`,
            name: player.name,
            actorName: player.name,
            role: 'Lead',
            roleType: 'LEAD',
            isPlayer: true,
            image: player.avatar,
            type: 'ACTOR',
            actorId: 'PLAYER_SELF',
            characterId: `${CANON_STORY_QA_PREFIX}solar_crown`,
            characterName: 'Solar Crown',
            sourceUniverseId: universeId,
            storyFunction: 'PROTAGONIST',
            storyRole: 'HERO',
            abilityType: 'TECH',
            nature: 'HUMAN',
            identitySource: 'CANON',
            talent: Number(getActorTalent(player.stats.skills) || player.stats?.talent || 82),
            fame: Number(player.stats?.fame || 72),
        },
        {
            id: `${CANON_STORY_QA_PREFIX}cast_hero`,
            name: knownHero.name,
            actorName: knownHero.name,
            role: 'Co-Lead',
            roleType: 'LEAD',
            isPlayer: false,
            image: knownHero.avatar || '',
            type: 'ACTOR',
            actorId: knownHero.id,
            npcId: knownHero.id,
            characterId: `${CANON_STORY_QA_PREFIX}nova_guard`,
            characterName: 'Nova Guard',
            sourceUniverseId: universeId,
            storyFunction: 'DEUTERAGONIST',
            storyRole: 'HERO',
            abilityType: 'SUPERPOWERED',
            nature: 'ALIEN',
            identitySource: 'CANON',
            talent: knownHero.talent ?? 88,
            fame: knownHero.fame ?? 90,
        },
        {
            id: `${CANON_STORY_QA_PREFIX}cast_mentor`,
            name: mentorActor.name,
            actorName: mentorActor.name,
            role: 'Mentor',
            roleType: 'SUPPORTING',
            isPlayer: false,
            image: mentorActor.avatar || '',
            type: 'ACTOR',
            actorId: mentorActor.id,
            npcId: mentorActor.id,
            characterId: `${CANON_STORY_QA_PREFIX}warden_zero`,
            characterName: 'Warden Zero',
            sourceUniverseId: universeId,
            storyFunction: 'MENTOR',
            storyRole: 'HERO',
            abilityType: 'TRAINED',
            nature: 'HUMAN',
            identitySource: 'CANON',
            talent: mentorActor.talent ?? 79,
            fame: mentorActor.fame ?? 60,
        },
        {
            id: `${CANON_STORY_QA_PREFIX}cast_rival`,
            name: rivalActor.name,
            actorName: rivalActor.name,
            role: 'Rival',
            roleType: 'SUPPORTING',
            isPlayer: false,
            image: rivalActor.avatar || '',
            type: 'ACTOR',
            actorId: rivalActor.id,
            npcId: rivalActor.id,
            characterId: `${CANON_STORY_QA_PREFIX}grey_comet`,
            characterName: 'Grey Comet',
            sourceUniverseId: universeId,
            storyFunction: 'RIVAL',
            storyRole: 'ANTI_HERO',
            abilityType: 'MAGIC',
            nature: 'HUMAN',
            identitySource: 'CANON',
            talent: rivalActor.talent ?? 81,
            fame: rivalActor.fame ?? 54,
        },
        {
            id: `${CANON_STORY_QA_PREFIX}cast_villain`,
            name: breakoutVillain.name,
            actorName: breakoutVillain.name,
            role: 'Main Villain',
            roleType: 'SUPPORTING',
            isPlayer: false,
            image: breakoutVillain.avatar || '',
            type: 'ACTOR',
            actorId: breakoutVillain.id,
            npcId: breakoutVillain.id,
            characterId: `${CANON_STORY_QA_PREFIX}void_heir`,
            characterName: 'The Void Heir',
            sourceUniverseId: universeId,
            storyFunction: 'ANTAGONIST',
            storyRole: 'VILLAIN',
            abilityType: 'SUPERNATURAL',
            nature: 'SPIRIT',
            identitySource: 'CANON',
            talent: Math.max(breakoutVillain.talent ?? 86, 84),
            fame: Math.min(breakoutVillain.fame ?? 18, 24),
        },
    ];
    const castStoryRead = getCastStoryRead(storyCompass, cast);

    const firstProject = {
        id: firstProjectId,
        name: 'Nexus Accord: First Light',
        type: 'ACTING_GIG',
        roleType: 'LEAD',
        year: Math.max(16, currentAge - 1),
        releaseYear: Math.max(16, currentAge - 1),
        releaseWeek: 18,
        earnings: 22_000_000,
        rating: 8.3,
        imdbRating: 8.3,
        reception: 'Canon-defining breakout',
        projectQuality: 86,
        boxOfficeResult: 'BLOCKBUSTER',
        outcomeTier: 'BLOCKBUSTER',
        studioId: studio.id,
        castList: cast,
        reviews: [],
        budget: 165_000_000,
        gross: 790_000_000,
        genre: 'SUPERHERO',
        description: 'A fractured alliance creates the first chapter of the Nexus Accord.',
        projectType: 'MOVIE',
        subtype: 'UNIVERSE_ENTRY',
        franchiseId,
        installmentNumber: 1,
        universeId,
        universeSagaName: 'The Fracture Saga',
        universePhaseName: 'Phase 1: First Light',
        storyCompass,
        hiddenStats: {
            castStoryArchetype: castStoryRead.archetype,
            castStoryHeadline: castStoryRead.headline,
            castStorySummary: castStoryRead.summary,
            castStoryBalanceScore: castStoryRead.balanceScore,
        },
    } as any;

    const releaseDetails = {
        title: 'Nexus Accord: The Void Heir',
        type: 'MOVIE',
        description: 'The established heroes assemble against a gifted unknown villain.',
        studioId: studio.id,
        subtype: 'UNIVERSE_EVENT',
        genre: 'SUPERHERO',
        storyCompass,
        connectedProjectIntent: 'EVENT',
        budgetTier: 'BLOCKBUSTER',
        estimatedBudget: 210_000_000,
        visibleHype: 'HIGH',
        hiddenStats: {
            rawHype: 92,
            rawQuality: 88,
            castStoryArchetype: castStoryRead.archetype,
            castStoryHeadline: castStoryRead.headline,
            castStorySummary: castStoryRead.summary,
            castStoryBalanceScore: castStoryRead.balanceScore,
        },
        directorName: 'Mira Stone',
        visibleDirectorTier: 'AUTEUR',
        visibleScriptBuzz: 'EVENT',
        visibleCastStrength: 'ENSEMBLE',
        universeId,
        universeSagaName: 'The Fracture Saga',
        universePhaseName: 'Phase 2: Collision',
        franchiseId,
        installmentNumber: 2,
        castList: cast,
    } as any;

    const openingRelease: ActiveRelease = {
        id: releaseId,
        name: releaseDetails.title,
        type: 'MOVIE',
        roleType: 'LEAD',
        projectDetails: releaseDetails,
        distributionPhase: 'THEATRICAL',
        weekNum: 1,
        weeklyGross: [138_000_000],
        totalGross: 138_000_000,
        budget: 210_000_000,
        status: 'BLOCKBUSTER_TRACK',
        imdbRating: 8.5,
        productionPerformance: 91,
        maxTheatricalWeeks: 14,
        promotionalBuzz: 94,
        releaseYear: currentAge,
        releaseWeek: currentWeek,
        generatedNewsKeys: [],
    };

    const sequelScript: Script = {
        id: scriptId,
        title: 'Nexus Accord: Fracture Protocol',
        logline: 'The team must choose whether its rival can replace the fallen mentor before the Void Heir returns.',
        projectType: 'MOVIE',
        genres: ['SUPERHERO', 'SCI_FI'],
        quality: 91,
        status: 'READY',
        writerId: `${CANON_STORY_QA_PREFIX}writer`,
        author: 'Leona Hart',
        weeksInDevelopment: 8,
        totalDevelopmentWeeks: 8,
        isOriginal: false,
        options: [],
        sourceMaterial: 'SEQUEL',
        franchiseId,
        installmentNumber: 3,
        universeId,
        universeSagaName: 'The Fracture Saga',
        universePhaseName: 'Phase 2: Collision',
        connectedProjectIntent: 'EVENT',
        storyCompass,
        tags: ['CANON_STORY_QA', 'SEQUEL', 'UNIVERSE_EVENT'],
    };

    const roster = cast.map((member, index) => ({
        id: member.characterId!,
        characterId: member.characterId!,
        name: member.characterName!,
        actorId: member.actorId,
        actorName: member.actorName,
        status: 'ACTIVE',
        fanApproval: 78 + index * 3,
        appearances: 2,
        firstAppearanceTitle: firstProject.name,
        latestAppearanceTitle: openingRelease.name,
        description: `${member.characterName} is established canon in the Nexus Accord.`,
        storyFunction: member.storyFunction,
        storyRole: member.storyRole,
        abilityType: member.abilityType,
        nature: member.nature,
        identitySource: 'CANON',
    }));
    const universe = normalizeUniverseForSave({
        id: universeId,
        name: 'Nexus Accord',
        description: 'A connected franchise built around heroes, rivals, mentors, and one emerging central threat.',
        studioId: studio.id,
        currentPhase: 'PHASE_2_COLLISION',
        currentPhaseName: 'Phase 2: Collision',
        saga: 1,
        currentSagaName: 'The Fracture Saga',
        momentum: 89,
        brandPower: 87,
        marketShare: 0,
        color: '#22d3ee',
        roster,
        slate: [
            { id: firstProjectId, title: firstProject.name, status: 'RELEASED', year: firstProject.year, week: firstProject.releaseWeek },
            { id: releaseId, title: openingRelease.name, status: 'RELEASED', year: currentAge, week: currentWeek },
        ],
        products: [],
        stats: {
            weeklyRevenue: 12_000_000,
            lifetimeRevenue: firstProject.gross + openingRelease.totalGross,
        },
        weeksUntilNextPhase: 22,
    } as any, universeId);

    const cleanedUniverses = Object.fromEntries(
        Object.entries(player.world?.universes || {}).filter(([id]) => !id.startsWith(CANON_STORY_QA_PREFIX))
    );
    const studioState = studio.studioState || {
        scripts: [],
        concepts: [],
        writers: [],
        ipMarket: [],
        lastMarketRefreshWeek: currentWeek,
        lastWriterRefreshWeek: currentWeek,
    };
    const updatedStudio: Business = {
        ...studio,
        studioState: {
            ...studioState,
            scripts: [
                sequelScript,
                ...(studioState.scripts || []).filter(script => !String(script.id).startsWith(CANON_STORY_QA_PREFIX)),
            ],
            concepts: (studioState.concepts || []).filter(concept => !String(concept.id).startsWith(CANON_STORY_QA_PREFIX)),
        },
    };

    return {
        ...player,
        businesses: (player.businesses || []).map(business => (
            business.id === studio.id ? updatedStudio : business
        )),
        pastProjects: [
            firstProject,
            ...(player.pastProjects || []).filter(project => !String(project.id).startsWith(CANON_STORY_QA_PREFIX)),
        ],
        activeReleases: [
            openingRelease,
            ...(player.activeReleases || []).filter(release => !String(release.id).startsWith(CANON_STORY_QA_PREFIX)),
        ],
        world: {
            ...player.world,
            universes: {
                ...cleanedUniverses,
                [universeId]: universe,
            },
        },
        news: (player.news || []).filter(item => (
            !String(item.id).includes(CANON_STORY_QA_PREFIX)
            && item.universeId !== universeId
        )),
        logs: [{
            week: currentWeek,
            year: currentAge,
            message: 'CANON QA: Nexus Accord is ready. Test Development Lab, Greenlight, then Age Up once for News and X.',
            type: 'positive',
        }, ...(player.logs || [])].slice(0, 50),
    } as Player;
};
