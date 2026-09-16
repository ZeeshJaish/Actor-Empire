import { INITIAL_PLAYER, type Player, type WorldAudienceEconomyState, type WorldPopulationState } from '../../types';
import { createWorldAudienceEconomyState } from '../../services/worldEconomy/worldAudienceCohorts';
import { createWorldAudienceParticipationState } from '../../services/worldEconomy/worldAudienceParticipation';
import { createWorldPopulationState } from '../../services/worldEconomy/worldPopulation';
import { createWorldStreamingCompetitionState } from '../../services/worldEconomy/worldStreamingCompetition';
import { createWorldStreamingCustomerState } from '../../services/worldEconomy/worldStreamingCustomers';
import { createWorldStreamingViewingState } from '../../services/worldEconomy/worldStreamingViewing';
import { createWorldStreamingPlatformEconomyState } from '../../services/worldEconomy/worldStreamingPlatformEconomy';
import { migratePlayerSave } from '../../services/saveMigration';

export const WORLD_ECONOMY_WE8_SCENARIOS = [
    'BASELINE', 'RECESSION', 'INFLATION', 'BOOM', 'AGEING', 'CONNECTIVITY_GROWTH',
    'REGIONAL_AFFORDABILITY', 'PREMIUM_FIT', 'PRICE_WAR', 'SUBSCRIPTION_FATIGUE',
    'SHARING', 'PIRACY', 'CONTENT_DROUGHT', 'LOCAL_HIT', 'FRANCHISE_HIT',
    'WEAK_CATALOGUE_MARKETING', 'LOCALIZATION_ADVANTAGE', 'DISTRESS', 'EMERGENCY_FUNDING',
    'ENTRANT', 'GIANT_ENTRANT', 'ACQUISITION', 'RIGHTS_EXPIRY', 'TERRITORIAL_LOSS',
] as const;

export type WorldEconomyWe8ScenarioId = typeof WORLD_ECONOMY_WE8_SCENARIOS[number];

const clamp = (value: number): number => Math.max(0, Math.min(100, value));

const configurePlayerPlatform = (player: Player, scenario: WorldEconomyWe8ScenarioId): void => {
    player.ownedStreamingPlatform.lifecycle = 'ACTIVE';
    player.ownedStreamingPlatform.metrics.subscribers = 1_000_000;
    player.ownedStreamingPlatform.identity = {
        name: 'Empire+', slug: 'empire-plus', primaryColor: '#6d4aff', secondaryColor: '#111827',
        logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Cinema worth staying home for.',
        dayOneMarketIds: scenario === 'TERRITORIAL_LOSS' ? ['US'] : ['US', 'IN'],
        launchServerCityId: null, foundedAtAbsoluteWeek: 100,
    };
    player.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
    const monthly = scenario === 'PRICE_WAR' ? 3 : scenario === 'PREMIUM_FIT' ? 24 : 10;
    player.ownedStreamingPlatform.serviceConfiguration.pricing = {
        ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
        streams: ['subs'],
        annualDiscount: scenario === 'SUBSCRIPTION_FATIGUE' ? 0 : 12,
        introOffer: scenario === 'PRICE_WAR' ? 35 : 0,
        plans: [{
            id: 'STANDARD', name: 'Standard', monthly,
            featureIds: scenario === 'PREMIUM_FIT' ? ['uhd', 'streams4', 'downloads', 'noads'] : ['hd'],
            ads: false, colorId: 'magenta',
        }],
    };
    if (scenario === 'ACQUISITION') {
        player.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
    }
};

const mutatePopulation = (population: WorldPopulationState, scenario: WorldEconomyWe8ScenarioId): void => {
    const countries = Object.values(population.countries);
    countries.forEach((country, index) => {
        const smallNudge = (WORLD_ECONOMY_WE8_SCENARIOS.indexOf(scenario) % 5) * .1;
        country.macro.consumerConfidence = clamp(country.macro.consumerConfidence + smallNudge);
        if (scenario === 'RECESSION' || scenario === 'DISTRESS') {
            country.macro.purchasingPowerIndex = clamp(country.macro.purchasingPowerIndex - 24);
            country.macro.consumerConfidence = clamp(country.macro.consumerConfidence - 28);
            country.macro.unemploymentPressure = clamp(country.macro.unemploymentPressure + 22);
        }
        if (scenario === 'INFLATION') country.macro.inflationPressure = clamp(country.macro.inflationPressure + 35);
        if (scenario === 'BOOM' || scenario === 'EMERGENCY_FUNDING') {
            country.macro.purchasingPowerIndex = clamp(country.macro.purchasingPowerIndex + 18);
            country.macro.consumerConfidence = clamp(country.macro.consumerConfidence + 20);
            country.macro.unemploymentPressure = clamp(country.macro.unemploymentPressure - 12);
        }
        if (scenario === 'CONNECTIVITY_GROWTH' || scenario === 'ENTRANT' || scenario === 'GIANT_ENTRANT') {
            country.reliableInternetPercent = clamp(country.reliableInternetPercent + 20);
            country.smartphoneAccessPercent = clamp(country.smartphoneAccessPercent + 18);
            country.digitalPaymentAccessPercent = clamp(country.digitalPaymentAccessPercent + 12);
        }
        if (scenario === 'REGIONAL_AFFORDABILITY' && (country.id === 'IN' || index % 3 === 0)) {
            country.macro.purchasingPowerIndex = clamp(country.macro.purchasingPowerIndex - 16);
        }
        if (scenario === 'AGEING') {
            const shift = Math.min(country.ageBands.ADULT, Math.round(country.population * .02));
            country.ageBands.ADULT -= shift;
            country.ageBands.OLDER += shift;
        }
    });
};

const mutateAudience = (audience: WorldAudienceEconomyState, scenario: WorldEconomyWe8ScenarioId): void => {
    Object.values(audience.countries).forEach(country => country.cohorts.forEach(cohort => {
        if (scenario === 'SHARING') cohort.sharingTendencyIndex = clamp(cohort.sharingTendencyIndex + 35);
        if (scenario === 'PIRACY') cohort.piracyTendencyIndex = clamp(cohort.piracyTendencyIndex + 40);
        if (scenario === 'SUBSCRIPTION_FATIGUE' || scenario === 'CONTENT_DROUGHT') {
            cohort.entertainmentAppetiteIndex = clamp(cohort.entertainmentAppetiteIndex - 20);
        }
        if (scenario === 'LOCAL_HIT' || scenario === 'LOCALIZATION_ADVANTAGE') {
            cohort.localLanguageAffinityIndex = clamp(cohort.localLanguageAffinityIndex + 20);
        }
        if (scenario === 'FRANCHISE_HIT') cohort.entertainmentAppetiteIndex = clamp(cohort.entertainmentAppetiteIndex + 15);
        if (scenario === 'WEAK_CATALOGUE_MARKETING') cohort.entertainmentAppetiteIndex = clamp(cohort.entertainmentAppetiteIndex - 8);
        if (scenario === 'RIGHTS_EXPIRY') cohort.entertainmentAppetiteIndex = clamp(cohort.entertainmentAppetiteIndex - 5);
    }));
};

export const buildWorldEconomyWe8Scenario = (scenario: WorldEconomyWe8ScenarioId, absoluteWeek = 2_400): Player => {
    const player = migratePlayerSave(structuredClone(INITIAL_PLAYER) as Player);
    player.id = `we8-scenario-${scenario.toLowerCase()}`;
    configurePlayerPlatform(player, scenario);
    const population = createWorldPopulationState(absoluteWeek);
    mutatePopulation(population, scenario);
    const audience = createWorldAudienceEconomyState(population, absoluteWeek);
    mutateAudience(audience, scenario);
    const participation = createWorldAudienceParticipationState(population, audience, absoluteWeek);
    player.world.worldPopulation = population;
    player.world.worldAudienceEconomy = audience;
    player.world.worldAudienceParticipation = participation;
    player.world.worldStreamingCompetition = createWorldStreamingCompetitionState(player, absoluteWeek);
    player.world.worldStreamingCustomers = createWorldStreamingCustomerState(player, absoluteWeek);
    player.world.worldStreamingViewing = createWorldStreamingViewingState(player, absoluteWeek);
    player.world.worldStreamingPlatformEconomy = createWorldStreamingPlatformEconomyState(player, absoluteWeek);
    return player;
};
