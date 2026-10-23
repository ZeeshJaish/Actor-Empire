import type { Script, BackgroundCastingPlan } from '../../types';
import type { BuildGreenlightProjectInput } from '../../views/lifestyle/business/greenlightProjectBuilder';
import { createBusiness } from '../../services/businessLogic';
import { makeCinemaFixture } from './boxOfficeScenarios';

/** Isolated standard greenlight inputs; no player save access. */
export const scriptVariationProjectInput = (script: Script): BuildGreenlightProjectInput => {
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

    const player = makeCinemaFixture(406).player;
    const studio = createBusiness('Variation Pictures', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', player.currentWeek);
    studio.balance = 1_000_000_000;
    studio.studioState!.scripts = [script];
    player.businesses = [studio];
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
    return projectInput;
};
