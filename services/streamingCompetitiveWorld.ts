import type {
    OwnedStreamingAwardResult,
    OwnedStreamingAwardSeason,
    OwnedStreamingCinematicEvent,
    OwnedStreamingCompetitiveWorldState,
    OwnedStreamingLedgerEntry,
    OwnedStreamingMarketShareSnapshot,
    OwnedStreamingPlatformState,
    OwnedStreamingRegionalLaunch,
    OwnedStreamingRivalMove,
    OwnedStreamingRivalProfile,
    OwnedStreamingRivalWeeklySnapshot,
    PlatformId,
    Player,
    StreamingAwardCategoryId,
    StreamingRegionId,
    StreamingTechnologyBranch,
    StreamingWarBattlefront,
    StreamingRegionalLaunchApproach,
    StreamingRivalMoveType,
    StreamingRivalResponseId,
    StreamingRivalStrategy,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { resolveOwnedStreamingReach } from './streamingProgression';
import { getStreamingCountryMarketProfile } from './streamingDayOneMarkets';
import { isStreamingLicenseActiveAt } from './streamingRightsCore';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

export interface StreamingRivalTemplate {
    platformId: PlatformId;
    ceoName: string;
    ceoPersonality: string;
    strategy: StreamingRivalStrategy;
    technology: number;
    catalogPower: number;
    prestige: number;
    aggression: number;
    preferredGenres: string[];
    preferredRegions: StreamingRegionId[];
}

export interface StreamingRegionDefinition {
    id: StreamingRegionId;
    name: string;
    code: string;
    mapX: number;
    mapY: number;
    capitalCost: number;
    weeklyOperatingCost: number;
    developmentWeeks: number;
    addressableAudienceMillions: number;
    acquisitionRateDelta: number;
    peakLoadPercent: number;
    requiredReachLevel: number;
    contentOperationsRequired: number;
    securityRequired: number;
    culturalNote: string;
}

export interface StreamingRegionalLaunchPreview {
    capitalCost: number;
    weeklyOperatingCost: number;
    developmentWeeks: number;
    acquisitionRateDelta: number;
    peakLoadPercent: number;
    localizationDepth: number;
}

export interface StreamingCompetitiveWeeklyEffects {
    acquisitionRateDelta: number;
    churnRateDelta: number;
    prestigeDelta: number;
    peakLoadPercent: number;
    weeklyOperatingCost: number;
    activePressureMoves: OwnedStreamingRivalMove[];
    activeRegions: OwnedStreamingRegionalLaunch[];
}

export interface StreamingCompetitiveWorldView {
    available: boolean;
    world: OwnedStreamingCompetitiveWorldState;
    rivals: OwnedStreamingRivalProfile[];
    latestMoves: OwnedStreamingRivalMove[];
    openMoves: OwnedStreamingRivalMove[];
    activeRegions: OwnedStreamingRegionalLaunch[];
    inProgressRegion: OwnedStreamingRegionalLaunch | null;
    latestMarketShare: OwnedStreamingMarketShareSnapshot | null;
    playerMarketSharePercent: number | null;
    nextAwardsInWeeks: number | null;
    latestAwardSeason: OwnedStreamingAwardSeason | null;
    worldRank: number | null;
}

export interface StreamingCompetitiveActionResult {
    player: Player;
    changed: boolean;
    reason?: string;
}

export const STREAMING_RIVAL_TEMPLATES: Record<PlatformId, StreamingRivalTemplate> = {
    NETFLIX: {
        platformId: 'NETFLIX',
        ceoName: 'Mara Voss',
        ceoPersonality: 'Relentless scale operator who treats every quiet week as empty territory.',
        strategy: 'SCALE_DOMINANCE',
        technology: 84,
        catalogPower: 94,
        prestige: 73,
        aggression: 88,
        preferredGenres: ['THRILLER', 'ACTION', 'CRIME'],
        preferredRegions: ['NORTH_AMERICA', 'EUROPE', 'SOUTH_ASIA'],
    },
    APPLE_TV: {
        platformId: 'APPLE_TV',
        ceoName: 'Elias Sterling',
        ceoPersonality: 'Patient prestige architect who prefers one immaculate strike to five noisy moves.',
        strategy: 'PRESTIGE_FIRST',
        technology: 96,
        catalogPower: 68,
        prestige: 96,
        aggression: 48,
        preferredGenres: ['DRAMA', 'SCI_FI', 'BIOPIC'],
        preferredRegions: ['NORTH_AMERICA', 'EUROPE', 'EAST_ASIA'],
    },
    DISNEY_PLUS: {
        platformId: 'DISNEY_PLUS',
        ceoName: 'Celeste Grant',
        ceoPersonality: 'Franchise steward who protects family loyalty and defends every branded universe.',
        strategy: 'FRANCHISE_FORTRESS',
        technology: 82,
        catalogPower: 92,
        prestige: 84,
        aggression: 70,
        preferredGenres: ['FANTASY', 'SUPERHERO', 'ANIMATION'],
        preferredRegions: ['NORTH_AMERICA', 'EUROPE', 'LATIN_AMERICA'],
    },
    HULU: {
        platformId: 'HULU',
        ceoName: 'Nadia Brooks',
        ceoPersonality: 'Fast curator who survives by finding gaps before larger rivals notice them.',
        strategy: 'AGILE_CURATOR',
        technology: 72,
        catalogPower: 76,
        prestige: 79,
        aggression: 62,
        preferredGenres: ['DRAMA', 'COMEDY', 'MYSTERY'],
        preferredRegions: ['NORTH_AMERICA', 'LATIN_AMERICA'],
    },
    YOUTUBE: {
        platformId: 'YOUTUBE',
        ceoName: 'Kai Moreno',
        ceoPersonality: 'Attention-system tactician who bundles creators, live moments and free reach.',
        strategy: 'ATTENTION_ECOSYSTEM',
        technology: 94,
        catalogPower: 64,
        prestige: 58,
        aggression: 81,
        preferredGenres: ['DOCUMENTARY', 'MUSICAL', 'HORROR'],
        preferredRegions: ['SOUTH_ASIA', 'LATIN_AMERICA', 'MIDDLE_EAST_AFRICA'],
    },
};

export const STREAMING_REGION_DEFINITIONS: StreamingRegionDefinition[] = [
    { id: 'HOME_MARKET', name: 'Home Market', code: 'HOME', mapX: 53, mapY: 59, capitalCost: 0, weeklyOperatingCost: 0, developmentWeeks: 0, addressableAudienceMillions: 35, acquisitionRateDelta: 0, peakLoadPercent: 0, requiredReachLevel: 1, contentOperationsRequired: 0, securityRequired: 0, culturalNote: 'The operating base that proved the platform can serve a real audience.' },
    { id: 'NORTH_AMERICA', name: 'North America', code: 'NA', mapX: 21, mapY: 35, capitalCost: 72_000_000, weeklyOperatingCost: 2_400_000, developmentWeeks: 8, addressableAudienceMillions: 190, acquisitionRateDelta: 0.0048, peakLoadPercent: 13, requiredReachLevel: 3, contentOperationsRequired: 18, securityRequired: 14, culturalNote: 'Expensive discovery, mature competition and enormous premium upside.' },
    { id: 'LATIN_AMERICA', name: 'Latin America', code: 'LATAM', mapX: 31, mapY: 68, capitalCost: 42_000_000, weeklyOperatingCost: 1_450_000, developmentWeeks: 6, addressableAudienceMillions: 115, acquisitionRateDelta: 0.0041, peakLoadPercent: 10, requiredReachLevel: 2, contentOperationsRequired: 12, securityRequired: 10, culturalNote: 'Mobile-first growth rewards dubbing depth and regional storytelling.' },
    { id: 'EUROPE', name: 'Europe', code: 'EU', mapX: 50, mapY: 31, capitalCost: 64_000_000, weeklyOperatingCost: 2_050_000, developmentWeeks: 8, addressableAudienceMillions: 155, acquisitionRateDelta: 0.0044, peakLoadPercent: 12, requiredReachLevel: 3, contentOperationsRequired: 20, securityRequired: 18, culturalNote: 'High-value audiences, fragmented languages and strict trust expectations.' },
    { id: 'SOUTH_ASIA', name: 'South Asia', code: 'SA', mapX: 66, mapY: 54, capitalCost: 38_000_000, weeklyOperatingCost: 1_300_000, developmentWeeks: 6, addressableAudienceMillions: 230, acquisitionRateDelta: 0.0052, peakLoadPercent: 15, requiredReachLevel: 2, contentOperationsRequired: 14, securityRequired: 10, culturalNote: 'Massive audience depth with sharp price sensitivity and language diversity.' },
    { id: 'EAST_ASIA', name: 'East Asia', code: 'EA', mapX: 79, mapY: 43, capitalCost: 78_000_000, weeklyOperatingCost: 2_650_000, developmentWeeks: 9, addressableAudienceMillions: 205, acquisitionRateDelta: 0.0049, peakLoadPercent: 14, requiredReachLevel: 4, contentOperationsRequired: 25, securityRequired: 22, culturalNote: 'Deep local competition makes cultural precision non-negotiable.' },
    { id: 'MIDDLE_EAST_AFRICA', name: 'Middle East & Africa', code: 'MEA', mapX: 55, mapY: 66, capitalCost: 48_000_000, weeklyOperatingCost: 1_600_000, developmentWeeks: 7, addressableAudienceMillions: 135, acquisitionRateDelta: 0.0043, peakLoadPercent: 11, requiredReachLevel: 3, contentOperationsRequired: 18, securityRequired: 16, culturalNote: 'Fast-growing connected audiences reward local trust and flexible delivery.' },
];

const STREAMING_RIVAL_MOVE_COST_MILLIONS_V1: Readonly<Record<StreamingRivalMoveType, number>> = Object.freeze({
    COUNTER_PROGRAM: 38,
    RIGHTS_OVERBID: 52,
    EXECUTIVE_POACH: 18,
    PRICE_CUT: 64,
    BUNDLE_LAUNCH: 46,
    RESCUE_CANCELLED_SHOW: 34,
    ALLIANCE_SIGNAL: 28,
    REGIONAL_ORIGINAL: 44,
    MARKETING_BLITZ: 31,
    TECH_COPY: 58,
    SABOTAGE_ATTEMPT: 26,
    OUTAGE_EXPLOITATION: 22,
    REGION_EXPANSION: 67,
    REGION_WITHDRAWAL: 4,
});

export const STREAMING_RIVAL_MOVE_COST_VERSION = 1 as const;
export const STREAMING_RIVAL_MOVE_COSTS_BY_VERSION: Readonly<Record<number, Readonly<Record<StreamingRivalMoveType, number>>>> = Object.freeze({
    1: STREAMING_RIVAL_MOVE_COST_MILLIONS_V1,
});
export const STREAMING_RIVAL_MOVE_COST_MILLIONS = STREAMING_RIVAL_MOVE_COST_MILLIONS_V1;

export const getStreamingRivalMoveCostMillions = (
    type: StreamingRivalMoveType,
): number => STREAMING_RIVAL_MOVE_COST_MILLIONS[type];

export const getStreamingRivalMoveCostMillionsForVersion = (
    type: StreamingRivalMoveType,
    pricingVersion: number,
): number | null => STREAMING_RIVAL_MOVE_COSTS_BY_VERSION[pricingVersion]?.[type] ?? null;

const MOVE_DEFINITIONS: Record<StreamingRivalMoveType, {
    title: (rival: OwnedStreamingRivalProfile, target: string | null) => string;
    detail: string;
    acquisitionRateDelta: number;
    churnRateDelta: number;
    prestigeDelta: number;
    cooldownWeeks: number;
    battlefront: StreamingWarBattlefront;
    playerImpact: string;
}> = {
    COUNTER_PROGRAM: { title: rival => `${rival.platformName} schedules a collision`, detail: 'A rival premiere is landing against the strongest visible programming window.', acquisitionRateDelta: -0.003, churnRateDelta: 0.001, prestigeDelta: 0, cooldownWeeks: 7, battlefront: 'CONTENT', playerImpact: 'Discovery is split during your strongest release window.' },
    RIGHTS_OVERBID: { title: rival => `${rival.platformName} raises the rights table`, detail: 'The rival spent into the same content lane, increasing scarcity and audience noise.', acquisitionRateDelta: -0.002, churnRateDelta: 0.0007, prestigeDelta: -1, cooldownWeeks: 8, battlefront: 'RIGHTS', playerImpact: 'Comparable rights become more expensive and harder to close.' },
    EXECUTIVE_POACH: { title: (rival, target) => `${rival.ceoName} calls ${target || 'your leadership team'}`, detail: 'A real executive received an outside mandate. Loyalty and the founder relationship now matter.', acquisitionRateDelta: 0, churnRateDelta: 0, prestigeDelta: -1, cooldownWeeks: 10, battlefront: 'TALENT', playerImpact: 'An important company seat may leave if the offer is ignored.' },
    PRICE_CUT: { title: rival => `${rival.platformName} cuts its entry price`, detail: 'A funded price move is testing whether households see enough value in both subscriptions.', acquisitionRateDelta: -0.004, churnRateDelta: 0.0012, prestigeDelta: 0, cooldownWeeks: 12, battlefront: 'PRICE', playerImpact: 'Value-sensitive households hesitate or switch for four weeks.' },
    BUNDLE_LAUNCH: { title: rival => `${rival.platformName} signs a telecom bundle`, detail: 'The rival is using ecosystem reach and a carrier partner to enter more household bills.', acquisitionRateDelta: -0.0032, churnRateDelta: 0.0008, prestigeDelta: 1, cooldownWeeks: 10, battlefront: 'DISTRIBUTION', playerImpact: 'The rival becomes easier to buy and harder to cancel.' },
    RESCUE_CANCELLED_SHOW: { title: rival => `${rival.platformName} rescues a cancelled show`, detail: 'A discarded audience promise has become a rival retention story instead.', acquisitionRateDelta: -0.0015, churnRateDelta: 0.0014, prestigeDelta: -2, cooldownWeeks: 9, battlefront: 'CONTENT', playerImpact: 'A vocal fandom now treats the rival as its new home.' },
    ALLIANCE_SIGNAL: { title: rival => `${rival.ceoName} forms a distribution alliance`, detail: 'The rival traded independence for broader reach and a stronger regional position.', acquisitionRateDelta: -0.0022, churnRateDelta: 0.0005, prestigeDelta: 1, cooldownWeeks: 8, battlefront: 'DISTRIBUTION', playerImpact: 'Local access improves while your acquisition costs rise.' },
    REGIONAL_ORIGINAL: { title: rival => `${rival.platformName} orders a regional Original`, detail: 'A local-language commission is built around a market where audience loyalty is still movable.', acquisitionRateDelta: -0.0026, churnRateDelta: 0.001, prestigeDelta: -1, cooldownWeeks: 9, battlefront: 'CONTENT', playerImpact: 'Local viewers gain a culturally specific reason to choose the rival.' },
    MARKETING_BLITZ: { title: rival => `${rival.platformName} floods the launch window`, detail: 'Trailers, outdoor media, creators and home-screen placements are converging on one message.', acquisitionRateDelta: -0.0028, churnRateDelta: 0.0004, prestigeDelta: 0, cooldownWeeks: 6, battlefront: 'MARKETING', playerImpact: 'Your titles lose attention unless the campaign is answered.' },
    TECH_COPY: { title: rival => `${rival.platformName} reverse-engineers your advantage`, detail: 'A rival engineering group is attempting a legal fast-follow of a visible product capability.', acquisitionRateDelta: -0.0012, churnRateDelta: 0.0006, prestigeDelta: -1, cooldownWeeks: 14, battlefront: 'TECHNOLOGY', playerImpact: 'An exclusive technology advantage may stop differentiating the platform.' },
    SABOTAGE_ATTEMPT: { title: rival => `A proxy campaign targets ${rival.platformName}'s challenger`, detail: 'A suspicious outside operation is probing confidence around your launch. Attribution is uncertain; the operational risk is real.', acquisitionRateDelta: -0.0015, churnRateDelta: 0.0017, prestigeDelta: -2, cooldownWeeks: 16, battlefront: 'OPERATIONS', playerImpact: 'Trust and service confidence weaken if security is not visibly defended.' },
    OUTAGE_EXPLOITATION: { title: rival => `${rival.platformName} turns your outage into an advert`, detail: 'The rival is promising dependable viewing while your reliability story is vulnerable.', acquisitionRateDelta: -0.0024, churnRateDelta: 0.0018, prestigeDelta: -2, cooldownWeeks: 7, battlefront: 'OPERATIONS', playerImpact: 'Reputation damage now converts directly into switching pressure.' },
    REGION_EXPANSION: { title: rival => `${rival.platformName} enters a new market`, detail: 'Local distribution, compliance and programming are being funded in a region you also need.', acquisitionRateDelta: -0.002, churnRateDelta: 0.0007, prestigeDelta: 0, cooldownWeeks: 12, battlefront: 'TERRITORY', playerImpact: 'The regional audience becomes more contested before your next expansion.' },
    REGION_WITHDRAWAL: { title: rival => `${rival.platformName} retreats from a market`, detail: 'Weak economics forced a rival withdrawal. Its audience is now available, but confidence in the region has fallen.', acquisitionRateDelta: 0.0012, churnRateDelta: -0.0004, prestigeDelta: 1, cooldownWeeks: 8, battlefront: 'TERRITORY', playerImpact: 'A rare opening appears, with a warning about local economics.' },
};

const DEFAULT_RIVAL_PRICES: Record<PlatformId, number> = {
    NETFLIX: 17.99,
    APPLE_TV: 9.99,
    DISNEY_PLUS: 15.99,
    HULU: 11.99,
    YOUTUBE: 13.99,
};

const TECHNOLOGY_BRANCHES: StreamingTechnologyBranch[] = [
    'DELIVERY_CAPACITY',
    'PLAYBACK_QUALITY',
    'RELIABILITY',
    'DATA_RECOMMENDATIONS',
    'SECURITY',
    'CONTENT_OPERATIONS',
    'ADVERTISING_COMMERCE',
    'PRODUCT_EXPERIENCE',
];

const canonicalRegionForCountry = (countryId: string): StreamingRegionId | null => {
    const regionId = getStreamingCountryMarketProfile(countryId)?.regionId;
    if (regionId === 'NORTH_AMERICA') return 'NORTH_AMERICA';
    if (regionId === 'SOUTH_AMERICA') return 'LATIN_AMERICA';
    if (regionId === 'EUROPE') return 'EUROPE';
    if (regionId === 'AFRICA') return 'MIDDLE_EAST_AFRICA';
    if (regionId === 'ASIA') return countryId === 'IN' ? 'SOUTH_ASIA' : 'EAST_ASIA';
    if (regionId === 'OCEANIA') return 'EAST_ASIA';
    return null;
};

const canonicalTechnology = (player: Player, platformId: PlatformId): number => {
    const ai = player.world.platforms?.[platformId]?.ai;
    if (!ai) return STREAMING_RIVAL_TEMPLATES[platformId].technology;
    const levels = Object.values(ai.capabilities.technologyLevels);
    const averageLevel = levels.length ? levels.reduce((sum, value) => sum + value, 0) / levels.length : 0;
    return Math.round(clamp(ai.competence.technology * 7 + averageLevel * 0.4, 0, 100));
};

const canonicalCataloguePower = (
    player: Player,
    platformId: PlatformId,
    observedAbsoluteWeek: number,
): number => {
    const ai = player.world.platforms?.[platformId]?.ai;
    if (!ai) return STREAMING_RIVAL_TEMPLATES[platformId].catalogPower;
    const projectsById = new Map(player.world.projects.map(project => [project.id, project]));
    const validWindowIds = new Set<string>();
    for (const plan of ai.slate) {
        for (const entry of plan.releaseEntries) {
            if (entry.status !== 'RELEASED' || (entry.releasedAtAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) > observedAbsoluteWeek) continue;
            if (plan.source !== 'COMMISSIONED_ORIGINAL') {
                const contract = entry.rightsContractId
                    ? ai.rightsContracts.find(candidate => candidate.id === entry.rightsContractId)
                    : null;
                if (
                    !contract
                    || contract.status !== 'ACTIVE'
                    || !isStreamingLicenseActiveAt(contract, observedAbsoluteWeek)
                    || contract.sourceProjectId !== entry.canonicalProjectId
                    || contract.platformContentPlanId !== plan.id
                ) continue;
            }
            const project = projectsById.get(entry.canonicalProjectId);
            const window = project?.streamingWindows?.find(candidate => (
                candidate.id === entry.streamingWindowId
                && candidate.platformId === platformId
                && candidate.platformContentPlanId === plan.id
                && candidate.startsAtAbsoluteWeek <= observedAbsoluteWeek
                && candidate.expiresAtAbsoluteWeek >= observedAbsoluteWeek
            ));
            if (window) validWindowIds.add(window.id);
        }
    }
    const averageCommercialScore = ai.releaseMemory.length
        ? ai.releaseMemory.reduce((sum, memory) => sum + memory.commercialScore, 0) / ai.releaseMemory.length
        : 50;
    return Math.round(clamp(20 + validWindowIds.size * 4 + averageCommercialScore * 0.45, 0, 100));
};

const canonicalPrestige = (player: Player, platformId: PlatformId): number => {
    const platform = player.world.platforms?.[platformId];
    if (!platform?.ai?.releaseMemory.length) return Math.round(clamp(platform?.reputation ?? STREAMING_RIVAL_TEMPLATES[platformId].prestige, 0, 100));
    const averagePrestige = platform.ai.releaseMemory.reduce((sum, memory) => sum + memory.prestigeScore, 0)
        / platform.ai.releaseMemory.length;
    return Math.round(clamp(platform.reputation * 0.7 + averagePrestige * 0.3, 0, 100));
};

export const projectStreamingRivalsFromCanonicalWorld = (
    player: Player,
    existingRivals: OwnedStreamingRivalProfile[] = [],
    observedAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek),
): OwnedStreamingRivalProfile[] => {
    const existingById = new Map(existingRivals.map(rival => [rival.platformId, rival]));
    return (Object.keys(STREAMING_RIVAL_TEMPLATES) as PlatformId[])
        .filter(platformId => !player.ownedStreamingPlatform.corporateDevelopment?.acquiredPlatformIds?.includes(platformId))
        .map(platformId => {
            const template = STREAMING_RIVAL_TEMPLATES[platformId];
            const previous = existingById.get(platformId);
            const worldPlatform = player.world.platforms?.[platformId];
            const ai = worldPlatform?.ai;
            const technology = canonicalTechnology(player, platformId);
            const catalogPower = canonicalCataloguePower(player, platformId, observedAbsoluteWeek);
            const prestige = canonicalPrestige(player, platformId);
            const canonicalRegions = ai
                ? ai.capabilities.activeCountryIds.flatMap(countryId => {
                    const region = canonicalRegionForCountry(countryId);
                    return region ? [region] : [];
                })
                : template.preferredRegions.slice(0, 2);
            return {
                platformId,
                platformName: worldPlatform?.name ?? platformId.replaceAll('_', ' '),
                ceoName: previous?.ceoName ?? template.ceoName,
                ceoPersonality: previous?.ceoPersonality ?? template.ceoPersonality,
                strategy: previous?.strategy ?? template.strategy,
                cashReserveMillions: Math.max(0, worldPlatform?.cashReserve ?? 0),
                subscribersMillions: Math.max(0, worldPlatform?.subscribers ?? 0),
                standaloneValuationBillions: Math.max(0, ai?.standaloneValuationBillions ?? worldPlatform?.valuation ?? 0),
                technology,
                catalogPower,
                prestige,
                aggression: previous?.aggression ?? template.aggression,
                baseMonthlyPrice: previous?.baseMonthlyPrice ?? DEFAULT_RIVAL_PRICES[platformId],
                perceivedValue: Math.round(clamp((catalogPower + technology + prestige) / 3, 0, 100)),
                activeRegionIds: Array.from(new Set<StreamingRegionId>(['HOME_MARKET', ...canonicalRegions])),
                copiedTechnologyBranches: [...(previous?.copiedTechnologyBranches ?? [])],
                preferredGenres: [...(previous?.preferredGenres ?? template.preferredGenres)],
                preferredRegions: [...(previous?.preferredRegions ?? template.preferredRegions)],
                cooldownUntilAbsoluteWeek: previous?.cooldownUntilAbsoluteWeek ?? 0,
                lastMoveAbsoluteWeek: previous?.lastMoveAbsoluteWeek ?? null,
                mistakes: previous?.mistakes ?? 0,
                memory: {
                    ...(previous?.memory ?? { respect: 35, resentment: 20, encounters: 0, rivalWins: 0, playerDefences: 0, lastMoveType: null }),
                },
            };
        });
};

const buildRivals = (player: Player): OwnedStreamingRivalProfile[] => (
    projectStreamingRivalsFromCanonicalWorld(player)
);

const createHomeRegion = (absoluteWeek: number, seed: string): OwnedStreamingRegionalLaunch => ({
    id: createDeterministicId('streaming_region', seed, 'HOME_MARKET'),
    idempotencyKey: 'regional-launch:HOME_MARKET',
    regionId: 'HOME_MARKET',
    regionName: 'Home Market',
    approach: 'LOCAL_PARTNERSHIP',
    status: 'ACTIVE',
    capitalCost: 0,
    weeklyOperatingCost: 0,
    addressableAudienceMillions: 35,
    acquisitionRateDelta: 0,
    peakLoadPercent: 0,
    localizationDepth: 100,
    startedAtAbsoluteWeek: absoluteWeek,
    readyAtAbsoluteWeek: absoluteWeek,
    launchedAtAbsoluteWeek: absoluteWeek,
});

const initializeCompetitiveWorld = (
    platform: OwnedStreamingPlatformState,
    player: Player,
    absoluteWeek: number,
): OwnedStreamingPlatformState => {
    if (platform.competitiveWorld.initializedAtAbsoluteWeek !== null) return platform;
    return {
        ...platform,
        competitiveWorld: {
            ...platform.competitiveWorld,
            initializedAtAbsoluteWeek: absoluteWeek,
            rivals: buildRivals(player),
            regionalLaunches: platform.competitiveWorld.regionalLaunches.length
                ? platform.competitiveWorld.regionalLaunches
                : [createHomeRegion(absoluteWeek, platform.simulationSeed)],
        },
    };
};

export const previewStreamingRegionalLaunch = (
    definition: StreamingRegionDefinition,
    approach: StreamingRegionalLaunchApproach,
): StreamingRegionalLaunchPreview => {
    const modifier = approach === 'LOCAL_PARTNERSHIP'
        ? { capital: 0.86, weekly: 0.9, weeks: 1, acquisition: 0.92, load: 0.86, localization: 88 }
        : approach === 'PREMIUM_ENTRY'
            ? { capital: 1.14, weekly: 1.1, weeks: 0, acquisition: 0.82, load: 0.92, localization: 78 }
            : { capital: 1.25, weekly: 1.24, weeks: -1, acquisition: 1.28, load: 1.42, localization: 66 };
    return {
        capitalCost: Math.round(definition.capitalCost * modifier.capital),
        weeklyOperatingCost: Math.round(definition.weeklyOperatingCost * modifier.weekly),
        developmentWeeks: Math.max(2, definition.developmentWeeks + modifier.weeks),
        acquisitionRateDelta: definition.acquisitionRateDelta * modifier.acquisition,
        peakLoadPercent: Math.round(definition.peakLoadPercent * modifier.load * 10) / 10,
        localizationDepth: modifier.localization,
    };
};

export const getStreamingRegionBlockers = (
    player: Player,
    definition: StreamingRegionDefinition,
): string[] => {
    if (definition.id === 'HOME_MARKET') return [];
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const reach = resolveOwnedStreamingReach({ ...player, ownedStreamingPlatform: platform });
    const blockers: string[] = [];
    const reachLabel = definition.requiredReachLevel >= 4
        ? 'Global'
        : definition.requiredReachLevel >= 3
            ? 'Multi-region'
            : 'National';
    if (reach.level < definition.requiredReachLevel) blockers.push(`${reachLabel} reach (Level ${definition.requiredReachLevel}) is required.`);
    if (platform.technologyLevels.CONTENT_OPERATIONS < definition.contentOperationsRequired) blockers.push(`Content Operations ${definition.contentOperationsRequired} is required.`);
    if (platform.technologyLevels.SECURITY < definition.securityRequired) blockers.push(`Security ${definition.securityRequired} is required.`);
    return blockers;
};

export const startStreamingRegionalLaunch = (
    player: Player,
    regionId: StreamingRegionId,
    approach: StreamingRegionalLaunchApproach,
): StreamingCompetitiveActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    let platform = initializeCompetitiveWorld(
        normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id),
        player,
        absoluteWeek,
    );
    if (platform.lifecycle !== 'ACTIVE') return { player, changed: false, reason: 'NOT_LIVE' };
    const definition = STREAMING_REGION_DEFINITIONS.find(item => item.id === regionId);
    if (!definition || regionId === 'HOME_MARKET') return { player, changed: false, reason: 'NOT_FOUND' };
    if (platform.competitiveWorld.regionalLaunches.some(item => item.regionId === regionId)) return { player, changed: false, reason: 'ALREADY_COMMITTED' };
    if (platform.competitiveWorld.regionalLaunches.some(item => item.status === 'IN_PROGRESS')) return { player, changed: false, reason: 'LAUNCH_ACTIVE' };
    const blockers = getStreamingRegionBlockers({ ...player, ownedStreamingPlatform: platform }, definition);
    if (blockers.length) return { player, changed: false, reason: blockers[0] };
    const preview = previewStreamingRegionalLaunch(definition, approach);
    if (platform.treasuryCash < preview.capitalCost) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    const idempotencyKey = `regional-launch:${regionId}`;
    const launch: OwnedStreamingRegionalLaunch = {
        id: createDeterministicId('streaming_region', platform.simulationSeed, regionId),
        idempotencyKey,
        regionId,
        regionName: definition.name,
        approach,
        status: 'IN_PROGRESS',
        capitalCost: preview.capitalCost,
        weeklyOperatingCost: preview.weeklyOperatingCost,
        addressableAudienceMillions: definition.addressableAudienceMillions,
        acquisitionRateDelta: preview.acquisitionRateDelta,
        peakLoadPercent: preview.peakLoadPercent,
        localizationDepth: preview.localizationDepth,
        startedAtAbsoluteWeek: absoluteWeek,
        readyAtAbsoluteWeek: absoluteWeek + preview.developmentWeeks,
        launchedAtAbsoluteWeek: null,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'REGIONAL_LAUNCH_STARTED',
        summary: `${definition.name} expansion entered localization and delivery preparation.`,
        source: 'PLAYER_ACTION',
        metadata: { regionId, approach, capitalCost: preview.capitalCost, readyAtAbsoluteWeek: launch.readyAtAbsoluteWeek },
    };
    platform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - preview.capitalCost,
        competitiveWorld: {
            ...platform.competitiveWorld,
            regionalLaunches: [...platform.competitiveWorld.regionalLaunches, launch],
        },
        eventLedger: [...platform.eventLedger, ledger],
    }, player.id);
    return { changed: true, player: { ...player, ownedStreamingPlatform: platform } };
};

export const getStreamingCompetitiveWeeklyEffects = (
    platformValue: OwnedStreamingPlatformState,
    absoluteWeek: number,
): StreamingCompetitiveWeeklyEffects => {
    const platform = normalizeOwnedStreamingPlatformState(platformValue);
    const activeRegions = platform.competitiveWorld.regionalLaunches.filter(item => item.status === 'ACTIVE');
    const activePressureMoves = platform.competitiveWorld.moves.filter(move => (
        ['OPEN', 'ACCEPTED_PRESSURE'].includes(move.status)
        && move.pressureStartsAbsoluteWeek <= absoluteWeek
        && move.expiresAtAbsoluteWeek >= absoluteWeek
    ));
    return {
        acquisitionRateDelta: clamp(
            activeRegions.reduce((sum, item) => sum + item.acquisitionRateDelta, 0)
            + activePressureMoves.reduce((sum, item) => sum + item.acquisitionRateDelta, 0),
            -0.025,
            0.035,
        ),
        churnRateDelta: clamp(activePressureMoves.reduce((sum, item) => sum + item.churnRateDelta, 0), -0.01, 0.02),
        prestigeDelta: activePressureMoves.reduce((sum, item) => sum + item.prestigeDelta, 0),
        peakLoadPercent: activeRegions.reduce((sum, item) => sum + item.peakLoadPercent, 0),
        weeklyOperatingCost: activeRegions.reduce((sum, item) => sum + item.weeklyOperatingCost, 0),
        activePressureMoves,
        activeRegions,
    };
};

const responseCost = (
    move: OwnedStreamingRivalMove,
    responseId: StreamingRivalResponseId,
    executiveWeeklyCompensation: number,
): number => {
    if (responseId === 'STAY_COURSE' || responseId === 'LET_DEPART') return 0;
    if (responseId === 'DEFEND_POSITION') return 8_000_000;
    if (responseId === 'COUNTER_PROGRAM') return 15_000_000;
    if (responseId === 'BACKCHANNEL') return 5_000_000;
    if (responseId === 'MATCH_PACKAGE') return Math.max(3_000_000, executiveWeeklyCompensation * 10);
    if (responseId === 'EXPAND_MANDATE') return 2_000_000;
    return Math.round(move.cashCostMillions * 100_000);
};

export const respondToStreamingRivalMove = (
    player: Player,
    moveId: string,
    responseId: StreamingRivalResponseId,
): StreamingCompetitiveActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    let platform = initializeCompetitiveWorld(
        normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id),
        player,
        absoluteWeek,
    );
    const move = platform.competitiveWorld.moves.find(item => item.id === moveId);
    if (!move || move.status !== 'OPEN' || move.responseId) return { player, changed: false, reason: 'NOT_OPEN' };
    const isPoach = move.type === 'EXECUTIVE_POACH';
    const poachResponses: StreamingRivalResponseId[] = ['MATCH_PACKAGE', 'EXPAND_MANDATE', 'LET_DEPART'];
    const warResponses: StreamingRivalResponseId[] = ['STAY_COURSE', 'DEFEND_POSITION', 'COUNTER_PROGRAM', 'BACKCHANNEL'];
    if (!(isPoach ? poachResponses : warResponses).includes(responseId)) return { player, changed: false, reason: 'INVALID_RESPONSE' };
    const executive = move.targetExecutiveId
        ? platform.leadership.appointments.find(item => item.executiveId === move.targetExecutiveId && item.status === 'ACTIVE')
        : null;
    if (isPoach && !executive) return { player, changed: false, reason: 'EXECUTIVE_UNAVAILABLE' };
    const cost = responseCost(move, responseId, executive?.weeklyCompensation || 0);
    if (platform.treasuryCash < cost) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    const status = responseId === 'STAY_COURSE' ? 'ACCEPTED_PRESSURE' as const : 'DEFENDED' as const;
    const outcomeNote = responseId === 'STAY_COURSE'
        ? 'The founder refused to spend. The rival pressure remains visible until expiry.'
        : responseId === 'DEFEND_POSITION'
            ? 'Audience defence neutralized the active pressure without creating fake subscribers.'
            : responseId === 'COUNTER_PROGRAM'
                ? 'The content team protected the release lane and raised industry respect.'
                : responseId === 'BACKCHANNEL'
                    ? 'A private commercial channel cooled the market without a public feud.'
                    : responseId === 'MATCH_PACKAGE'
                        ? `${executive!.nameAtAppointment} accepted a retention package and stayed.`
                        : responseId === 'EXPAND_MANDATE'
                            ? `${executive!.nameAtAppointment} stayed for a larger operating mandate.`
                            : `${executive!.nameAtAppointment} departed for the rival platform.`;
    const updatedMove: OwnedStreamingRivalMove = {
        ...move,
        status,
        responseId,
        responseCost: cost,
        responseAtAbsoluteWeek: absoluteWeek,
        outcomeNote,
    };
    const appointments = platform.leadership.appointments.map(item => {
        if (!executive || item.id !== executive.id) return item;
        if (responseId === 'LET_DEPART') return { ...item, status: 'RESIGNED' as const, endedAtAbsoluteWeek: absoluteWeek };
        if (responseId === 'MATCH_PACKAGE') return { ...item, loyalty: clamp(item.loyalty + 10, 0, 100), founderRelationship: clamp(item.founderRelationship + 6, 0, 100) };
        if (responseId === 'EXPAND_MANDATE') return { ...item, loyalty: clamp(item.loyalty + 6, 0, 100), ambition: clamp(item.ambition + 4, 0, 100), founderRelationship: clamp(item.founderRelationship + 5, 0, 100) };
        return item;
    });
    const rivals = platform.competitiveWorld.rivals.map(rival => rival.platformId === move.platformId ? {
        ...rival,
        memory: {
            ...rival.memory,
            respect: clamp(rival.memory.respect + (responseId === 'COUNTER_PROGRAM' ? 8 : responseId === 'STAY_COURSE' ? -2 : 3), 0, 100),
            resentment: clamp(rival.memory.resentment + (responseId === 'COUNTER_PROGRAM' ? 7 : responseId === 'BACKCHANNEL' ? -7 : 1), 0, 100),
            playerDefences: rival.memory.playerDefences + (status === 'DEFENDED' ? 1 : 0),
        },
    } : rival);
    const idempotencyKey = `${move.idempotencyKey}:response`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'RIVAL_MOVE_RESPONDED',
        summary: outcomeNote,
        source: 'PLAYER_ACTION',
        metadata: { moveId: move.id, responseId, cost, platformId: move.platformId },
    };
    platform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        leadership: { ...platform.leadership, appointments },
        competitiveWorld: {
            ...platform.competitiveWorld,
            rivalryHeat: clamp(platform.competitiveWorld.rivalryHeat + (responseId === 'COUNTER_PROGRAM' ? 8 : responseId === 'BACKCHANNEL' ? -6 : 0), 0, 100),
            globalPrestige: clamp(platform.competitiveWorld.globalPrestige + (responseId === 'COUNTER_PROGRAM' ? 2 : 0), 0, 100),
            rivals,
            moves: platform.competitiveWorld.moves.map(item => item.id === move.id ? updatedMove : item),
        },
        eventLedger: [...platform.eventLedger, ledger],
    }, player.id);
    return { changed: true, player: { ...player, ownedStreamingPlatform: platform } };
};

interface RivalMoveSelection {
    type: StreamingRivalMoveType;
    reason: string;
    targetRegionId: StreamingRegionId | null;
    targetTechnologyBranch: StreamingTechnologyBranch | null;
}

const selectMoveType = (
    rival: OwnedStreamingRivalProfile,
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
): RivalMoveSelection => {
    const activeExecutives = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    const paidPrices = Object.values(platform.subscriptionPrices).filter(price => price > 0);
    const playerEntryPrice = paidPrices.length ? Math.min(...paidPrices) : 9.99;
    const latestWeek = platform.weeklyHistory.at(-1);
    const playback = latestWeek?.operations?.playbackSuccessRate ?? platform.metrics.technologyHealth;
    const activeOriginals = platform.originalCommissions.filter(item => ['GREENLIT', 'IN_PRODUCTION', 'RELEASED'].includes(item.status)).length;
    const rightsHeat = platform.rightsNegotiations.filter(item => ['OFFER_SENT', 'COUNTER_RECEIVED', 'SIGNED'].includes(item.status)).length;
    const strongestTechnology = TECHNOLOGY_BRANCHES
        .map(branch => ({ branch, value: platform.technologyLevels[branch] }))
        .sort((left, right) => right.value - left.value)[0];
    const expansionRegionId = rival.preferredRegions.find(region => !rival.activeRegionIds.includes(region))
        || rival.preferredRegions[0]
        || null;
    const withdrawalRegionId = rival.activeRegionIds.find(region => region !== 'HOME_MARKET') || null;
    const scores = new Map<StreamingRivalMoveType, { score: number; reason: string }>();
    const offer = (type: StreamingRivalMoveType, score: number, reason: string) => scores.set(type, { score, reason });

    offer('MARKETING_BLITZ', 42 + rival.aggression * 0.25, 'Your platform is still fighting for habitual attention, so the rival is buying visibility instead of changing the product.');
    offer('REGIONAL_ORIGINAL', 35 + activeOriginals * 5 + (expansionRegionId ? 12 : 0), `Your Original slate is creating demand; ${rival.platformName} wants a local-language answer in ${STREAMING_REGION_DEFINITIONS.find(item => item.id === expansionRegionId)?.name || 'a contested market'}.`);
    offer('COUNTER_PROGRAM', 36 + activeOriginals * 7, 'Your release calendar has become visible enough to counter-program directly.');
    offer('RIGHTS_OVERBID', 34 + rightsHeat * 9 + rival.cashReserveMillions / 1_000, 'You are active at the rights table, so the rival is raising scarcity in the same buying window.');
    offer('BUNDLE_LAUNCH', 39 + (playerEntryPrice <= 7 ? 28 : 8) + (rival.strategy === 'ATTENTION_ECOSYSTEM' ? 22 : 0), playerEntryPrice <= 7
        ? `Your $${playerEntryPrice.toFixed(2)} entry tier is already very cheap. ${rival.platformName} will defend convenience and bundled value instead of chasing it downward.`
        : 'Households are holding multiple subscriptions, so the rival is using a telecom bundle to become harder to cancel.');
    offer('PRICE_CUT', 28 + (playerEntryPrice > rival.baseMonthlyPrice * 0.82 ? 30 : -18) + (rival.strategy === 'SCALE_DOMINANCE' ? 18 : 0), playerEntryPrice <= 7
        ? `Your $${playerEntryPrice.toFixed(2)} price is below the rival's sustainable floor; a direct match would damage its value story.`
        : `Your entry tier is vulnerable at $${playerEntryPrice.toFixed(2)}, so the rival can afford a temporary price attack.`);
    offer('TECH_COPY', 26 + Math.max(0, strongestTechnology.value - rival.technology) * 2.4, `Your ${strongestTechnology.branch.toLowerCase().replaceAll('_', ' ')} capability is visibly ahead, making a fast-follow worth funding.`);
    offer('OUTAGE_EXPLOITATION', playback < 98 ? 86 + (98 - playback) * 4 : 4, `Playback reliability fell to ${playback.toFixed(1)}%, giving the rival a credible dependability message.`);
    offer('SABOTAGE_ATTEMPT', 8 + rival.aggression * 0.18 + rival.memory.resentment * 0.32 - platform.technologyLevels.SECURITY * 0.15, 'High rivalry heat and a visible security gap make an unattributed disruption campaign tempting.');
    offer('REGION_EXPANSION', expansionRegionId ? 38 + rival.cashReserveMillions / 1_200 : 0, `${STREAMING_REGION_DEFINITIONS.find(item => item.id === expansionRegionId)?.name || 'A growth market'} is still open enough for the rival to build a local position.`);
    offer('REGION_WITHDRAWAL', withdrawalRegionId && rival.cashReserveMillions < 120 ? 78 : 0, 'Weak local economics are forcing the rival to concentrate its capital elsewhere.');
    offer('RESCUE_CANCELLED_SHOW', 24 + (rival.strategy === 'AGILE_CURATOR' ? 25 : 0), 'A vocal abandoned fandom offers a cheaper retention story than creating a new franchise.');
    offer('ALLIANCE_SIGNAL', 30 + (rival.strategy === 'ATTENTION_ECOSYSTEM' ? 18 : 0), 'A distribution partner can widen reach without forcing an unsustainable price cut.');
    if (activeExecutives.length) offer('EXECUTIVE_POACH', 20 + rival.memory.resentment * 0.28, 'Your leadership team has proven valuable enough to become a competitive target.');

    const rng = createDeterministicRng(`${platform.simulationSeed}:rival-move-type:${rival.platformId}:${absoluteWeek}`);
    const ranked = [...scores.entries()]
        .map(([type, signal]) => ({ type, reason: signal.reason, score: signal.score + rng() * 9 }))
        .sort((left, right) => right.score - left.score || left.type.localeCompare(right.type));
    const selected = ranked[0] || { type: 'COUNTER_PROGRAM' as const, reason: 'A visible programming window invited a direct competitive response.' };
    return {
        type: selected.type,
        reason: selected.reason,
        targetRegionId: selected.type === 'REGION_WITHDRAWAL'
            ? withdrawalRegionId
            : ['REGIONAL_ORIGINAL', 'REGION_EXPANSION'].includes(selected.type) ? expansionRegionId : null,
        targetTechnologyBranch: selected.type === 'TECH_COPY' ? strongestTechnology.branch : null,
    };
};

const createRivalMove = (
    platform: OwnedStreamingPlatformState,
    rival: OwnedStreamingRivalProfile,
    absoluteWeek: number,
): { move: OwnedStreamingRivalMove; rival: OwnedStreamingRivalProfile; ledger: OwnedStreamingLedgerEntry } | null => {
    const selection = selectMoveType(rival, platform, absoluteWeek);
    const type = selection.type;
    const definition = MOVE_DEFINITIONS[type];
    const cashCostMillions = getStreamingRivalMoveCostMillions(type);
    if (rival.cashReserveMillions < cashCostMillions) return null;
    const rng = createDeterministicRng(`${platform.simulationSeed}:rival-move:${rival.platformId}:${type}:${absoluteWeek}`);
    const executives = platform.leadership.appointments
        .filter(item => item.status === 'ACTIVE')
        .sort((left, right) => right.performance + right.ambition - left.performance - left.ambition);
    const target = type === 'EXECUTIVE_POACH' ? executives[Math.floor(rng() * Math.max(1, executives.length))] || null : null;
    const mistakeChance = clamp(0.08 + (100 - rival.technology) / 300 + (100 - rival.catalogPower) / 500, 0.08, 0.34);
    const misfired = rng() < mistakeChance;
    const idempotencyKey = `rival-move:${rival.platformId}:${absoluteWeek}`;
    const cashAfter = Math.max(0, rival.cashReserveMillions - cashCostMillions);
    const move: OwnedStreamingRivalMove = {
        id: createDeterministicId('streaming_rival_move', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        platformId: rival.platformId,
        platformName: rival.platformName,
        ceoName: rival.ceoName,
        type,
        battlefront: definition.battlefront,
        targetRegionId: selection.targetRegionId,
        targetTechnologyBranch: selection.targetTechnologyBranch,
        strategyReason: selection.reason,
        playerImpact: definition.playerImpact,
        rivalPriceBefore: type === 'PRICE_CUT' ? rival.baseMonthlyPrice : null,
        rivalPriceAfter: type === 'PRICE_CUT' ? Math.round(Math.max(2.99, rival.baseMonthlyPrice * 0.86) * 100) / 100 : null,
        title: misfired ? `${definition.title(rival, target?.nameAtAppointment || null)} — and misses` : definition.title(rival, target?.nameAtAppointment || null),
        detail: definition.detail,
        status: misfired ? 'MISFIRED' : 'OPEN',
        pricingVersion: STREAMING_RIVAL_MOVE_COST_VERSION,
        cashCostMillions,
        rivalCashBeforeMillions: rival.cashReserveMillions,
        rivalCashAfterMillions: cashAfter,
        createdAtAbsoluteWeek: absoluteWeek,
        pressureStartsAbsoluteWeek: absoluteWeek + 1,
        expiresAtAbsoluteWeek: absoluteWeek + (type === 'EXECUTIVE_POACH' ? 1 : 4),
        acquisitionRateDelta: misfired ? 0 : definition.acquisitionRateDelta,
        churnRateDelta: misfired ? 0 : definition.churnRateDelta,
        prestigeDelta: misfired ? 0 : definition.prestigeDelta,
        targetExecutiveId: target?.executiveId || null,
        targetExecutiveName: target?.nameAtAppointment || null,
        responseId: null,
        responseCost: 0,
        responseAtAbsoluteWeek: null,
        outcomeNote: misfired
            ? `${rival.platformName} spent the resources, but execution failed to create player pressure.`
            : type === 'EXECUTIVE_POACH'
                ? 'The executive has one game week to receive a founder response.'
                : 'The market move is active. The founder may answer or carry the pressure.',
    };
    const updatedRival: OwnedStreamingRivalProfile = {
        ...rival,
        // Rival economics are authoritative in world.platforms. The move keeps
        // its disclosed cost, while this read model remains a canonical projection.
        cashReserveMillions: rival.cashReserveMillions,
        baseMonthlyPrice: type === 'PRICE_CUT' ? move.rivalPriceAfter || rival.baseMonthlyPrice : rival.baseMonthlyPrice,
        perceivedValue: clamp(rival.perceivedValue + (type === 'BUNDLE_LAUNCH' ? 3 : type === 'REGIONAL_ORIGINAL' ? 2 : type === 'PRICE_CUT' ? 1 : 0), 0, 100),
        cooldownUntilAbsoluteWeek: absoluteWeek + definition.cooldownWeeks,
        lastMoveAbsoluteWeek: absoluteWeek,
        mistakes: rival.mistakes + (misfired ? 1 : 0),
        memory: {
            ...rival.memory,
            resentment: clamp(rival.memory.resentment + 3, 0, 100),
            encounters: rival.memory.encounters + 1,
            rivalWins: rival.memory.rivalWins + (misfired ? 0 : 1),
            lastMoveType: type,
        },
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'RIVAL_MOVE_COMMITTED',
        summary: move.title,
        source: 'WEEK_PROCESSOR',
        metadata: {
            platformId: rival.platformId,
            moveType: type,
            cashCostMillions,
            misfired,
            targetExecutiveId: target?.executiveId || null,
        },
    };
    return { move, rival: updatedRival, ledger };
};

const settleExpiredMoves = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
): OwnedStreamingPlatformState => {
    let appointments = platform.leadership.appointments;
    let rivals = platform.competitiveWorld.rivals;
    const moves = platform.competitiveWorld.moves.map(move => {
        if (!['OPEN', 'ACCEPTED_PRESSURE'].includes(move.status) || move.expiresAtAbsoluteWeek >= absoluteWeek) return move;
        if (move.type === 'TECH_COPY' && move.targetTechnologyBranch) {
            rivals = rivals.map(rival => rival.platformId === move.platformId ? {
                ...rival,
                technology: clamp(rival.technology + 2, 0, 100),
                copiedTechnologyBranches: Array.from(new Set([...rival.copiedTechnologyBranches, move.targetTechnologyBranch!])),
            } : rival);
            return { ...move, status: 'EXPIRED' as const, outcomeNote: `${move.platformName} shipped a credible fast-follow of ${move.targetTechnologyBranch.toLowerCase().replaceAll('_', ' ')}.` };
        }
        if (move.type === 'REGION_EXPANSION' && move.targetRegionId) {
            rivals = rivals.map(rival => rival.platformId === move.platformId ? {
                ...rival,
                activeRegionIds: Array.from(new Set([...rival.activeRegionIds, move.targetRegionId!])),
            } : rival);
            return { ...move, status: 'EXPIRED' as const, outcomeNote: `${move.platformName} completed its ${STREAMING_REGION_DEFINITIONS.find(item => item.id === move.targetRegionId)?.name || 'regional'} entry.` };
        }
        if (move.type === 'REGION_WITHDRAWAL' && move.targetRegionId) {
            rivals = rivals.map(rival => rival.platformId === move.platformId ? {
                ...rival,
                activeRegionIds: rival.activeRegionIds.filter(regionId => regionId !== move.targetRegionId),
            } : rival);
            return { ...move, status: 'EXPIRED' as const, outcomeNote: `${move.platformName} exited ${STREAMING_REGION_DEFINITIONS.find(item => item.id === move.targetRegionId)?.name || 'the market'} after weak economics.` };
        }
        if (move.type !== 'EXECUTIVE_POACH' || !move.targetExecutiveId) return {
            ...move,
            status: 'EXPIRED' as const,
            outcomeNote: 'The rival pressure completed its four-week market window.',
        };
        const executive = appointments.find(item => item.executiveId === move.targetExecutiveId && item.status === 'ACTIVE');
        if (!executive) return { ...move, status: 'EXPIRED' as const, outcomeNote: 'The targeted seat was no longer active.' };
        const rng = createDeterministicRng(`${platform.simulationSeed}:poach-expiry:${move.id}:${absoluteWeek}`);
        const stayed = executive.loyalty + executive.founderRelationship + rng() * 35 >= 132;
        if (!stayed) {
            appointments = appointments.map(item => item.id === executive.id ? {
                ...item,
                status: 'RESIGNED' as const,
                endedAtAbsoluteWeek: absoluteWeek,
            } : item);
        }
        return {
            ...move,
            status: stayed ? 'DEFENDED' as const : 'EXPIRED' as const,
            outcomeNote: stayed
                ? `${executive.nameAtAppointment} rejected the offer because the relationship was strong enough.`
                : `${executive.nameAtAppointment} left after the founder allowed the offer to expire.`,
        };
    });
    return {
        ...platform,
        leadership: { ...platform.leadership, appointments },
        competitiveWorld: { ...platform.competitiveWorld, rivals, moves },
    };
};

const completeDueRegions = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
): { platform: OwnedStreamingPlatformState; ledger: OwnedStreamingLedgerEntry[] } => {
    const ledger: OwnedStreamingLedgerEntry[] = [];
    const regionalLaunches = platform.competitiveWorld.regionalLaunches.map(region => {
        if (region.status !== 'IN_PROGRESS' || absoluteWeek < region.readyAtAbsoluteWeek) return region;
        const idempotencyKey = `${region.idempotencyKey}:completed`;
        if (!platform.eventLedger.some(item => item.idempotencyKey === idempotencyKey)) {
            ledger.push({
                id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
                idempotencyKey,
                absoluteWeek,
                type: 'REGIONAL_LAUNCH_COMPLETED',
                summary: `${region.regionName} entered live service.`,
                source: 'WEEK_PROCESSOR',
                metadata: { regionId: region.regionId, weeklyOperatingCost: region.weeklyOperatingCost },
            });
        }
        return { ...region, status: 'ACTIVE' as const, launchedAtAbsoluteWeek: absoluteWeek };
    });
    return {
        platform: { ...platform, competitiveWorld: { ...platform.competitiveWorld, regionalLaunches } },
        ledger,
    };
};

const buildMarketShareSnapshot = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
): OwnedStreamingMarketShareSnapshot => {
    const base = [
        {
            id: 'PLAYER' as const,
            name: platform.identity?.name || 'EMPIRE+',
            subscribersMillions: platform.metrics.subscribers / 1_000_000,
        },
        ...platform.competitiveWorld.rivals.map(rival => ({
            id: rival.platformId,
            name: rival.platformName,
            subscribersMillions: rival.subscribersMillions,
        })),
    ];
    const total = Math.max(0.001, base.reduce((sum, item) => sum + item.subscribersMillions, 0));
    return {
        id: createDeterministicId('streaming_market_share', platform.simulationSeed, absoluteWeek),
        absoluteWeek,
        entries: base
            .map(item => ({ ...item, sharePercent: Math.round(item.subscribersMillions / total * 10_000) / 100 }))
            .sort((left, right) => right.sharePercent - left.sharePercent),
    };
};

const AWARD_NAMES: Record<StreamingAwardCategoryId, string> = {
    PLATFORM_OF_THE_YEAR: 'Platform of the Year',
    ORIGINAL_OF_THE_YEAR: 'Original of the Year',
    AUDIENCE_CHOICE: 'Audience Choice',
    TECHNICAL_EXCELLENCE: 'Technical Excellence',
    GLOBAL_BREAKTHROUGH: 'Global Breakthrough',
};

const createAwardSeason = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    seasonNumber: number,
): OwnedStreamingAwardSeason => {
    const window = platform.weeklyHistory.slice(-52);
    const firstSubscribers = Math.max(1, window[0]?.subscribers || platform.launchCommit?.initialSubscribers || 1);
    const subscriberGrowth = (platform.metrics.subscribers - firstSubscribers) / firstSubscribers * 100;
    const averagePlayback = window.length
        ? window.reduce((sum, item) => sum + (item.operations?.playbackSuccessRate || item.technologyHealth), 0) / window.length
        : platform.metrics.technologyHealth;
    const originalRecords = window.flatMap(item => item.operations?.titlePerformance || []).filter(item => item.source === 'ORIGINAL');
    const bestOriginal = [...originalRecords].sort((left, right) => right.satisfactionScore - left.satisfactionScore || right.viewingAccounts - left.viewingAccounts)[0];
    const activeRegions = platform.competitiveWorld.regionalLaunches.filter(item => item.status === 'ACTIVE').length;
    const playerShare = platform.competitiveWorld.marketShareHistory.at(-1)?.entries.find(item => item.id === 'PLAYER')?.sharePercent || 0;
    const playerScores: Record<StreamingAwardCategoryId, { score: number; evidence: string }> = {
        PLATFORM_OF_THE_YEAR: {
            score: clamp(35 + subscriberGrowth * 0.7 + platform.metrics.engagementRate * 35 + playerShare * 1.6 + platform.competitiveWorld.globalPrestige * 0.2, 0, 140),
            evidence: `${subscriberGrowth >= 0 ? '+' : ''}${subscriberGrowth.toFixed(1)}% annual audience movement and ${playerShare.toFixed(1)}% modeled share.`,
        },
        ORIGINAL_OF_THE_YEAR: {
            score: bestOriginal ? clamp(bestOriginal.satisfactionScore + Math.log10(Math.max(10, bestOriginal.viewingAccounts)) * 3, 0, 140) : 0,
            evidence: bestOriginal ? `${bestOriginal.title}: ${bestOriginal.satisfactionScore.toFixed(0)}/100 satisfaction from canonical title reports.` : 'No eligible released Original in the annual evidence window.',
        },
        AUDIENCE_CHOICE: {
            score: clamp(platform.metrics.engagementRate * 100 + Math.max(0, subscriberGrowth) * 0.35 + playerShare, 0, 140),
            evidence: `${(platform.metrics.engagementRate * 100).toFixed(1)}% engagement with measured subscriber movement.`,
        },
        TECHNICAL_EXCELLENCE: {
            score: clamp(platform.metrics.technologyHealth * 0.58 + averagePlayback * 0.42, 0, 140),
            evidence: `${averagePlayback.toFixed(2)}% average playback success and ${platform.metrics.technologyHealth.toFixed(0)}/100 technology health.`,
        },
        GLOBAL_BREAKTHROUGH: {
            score: clamp(activeRegions * 13 + playerShare * 1.8 + Math.max(0, subscriberGrowth) * 0.45 + platform.competitiveWorld.globalPrestige * 0.25, 0, 140),
            evidence: `${activeRegions} active regions and ${playerShare.toFixed(1)}% modeled world share.`,
        },
    };
    const categories = Object.keys(AWARD_NAMES) as StreamingAwardCategoryId[];
    const results: OwnedStreamingAwardResult[] = categories.map(categoryId => {
        const nominees = [
            {
                id: 'PLAYER' as const,
                name: platform.identity?.name || 'EMPIRE+',
                score: Math.round(playerScores[categoryId].score * 10) / 10,
                evidence: playerScores[categoryId].evidence,
            },
            ...platform.competitiveWorld.rivals.map(rival => {
                const rng = createDeterministicRng(`${platform.simulationSeed}:awards:${seasonNumber}:${categoryId}:${rival.platformId}`);
                const base = categoryId === 'PLATFORM_OF_THE_YEAR'
                    ? rival.subscribersMillions / 8 + rival.catalogPower * 0.35 + rival.prestige * 0.35
                    : categoryId === 'ORIGINAL_OF_THE_YEAR'
                        ? rival.catalogPower * 0.62 + rival.prestige * 0.48
                        : categoryId === 'AUDIENCE_CHOICE'
                            ? rival.subscribersMillions / 9 + rival.catalogPower * 0.45
                            : categoryId === 'TECHNICAL_EXCELLENCE'
                                ? rival.technology * 0.92
                                : rival.subscribersMillions / 11 + rival.aggression * 0.25 + rival.prestige * 0.35;
                return {
                    id: rival.platformId,
                    name: rival.platformName,
                    score: Math.round(clamp(base + (rng() - 0.5) * 12, 0, 140) * 10) / 10,
                    evidence: `${rival.strategy.toLowerCase().replaceAll('_', ' ')} performance backed by ${rival.cashReserveMillions.toFixed(0)}M remaining rival cash.`,
                };
            }),
        ].sort((left, right) => right.score - left.score).slice(0, 3);
        const winner = nominees[0];
        return {
            categoryId,
            categoryName: AWARD_NAMES[categoryId],
            nominees,
            winnerId: winner.id,
            winnerName: winner.name,
            playerNominated: nominees.some(item => item.id === 'PLAYER'),
            playerWon: winner.id === 'PLAYER',
        };
    });
    const idempotencyKey = `streaming-awards:${seasonNumber}`;
    return {
        id: createDeterministicId('streaming_awards', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        seasonNumber,
        absoluteWeek,
        results,
        playerNominations: results.filter(item => item.playerNominated).length,
        playerWins: results.filter(item => item.playerWon).length,
    };
};

export const commitStreamingCompetitiveWorldWeek = (
    platformValue: OwnedStreamingPlatformState,
    player: Player,
    absoluteWeek: number,
): OwnedStreamingPlatformState => {
    let platform = initializeCompetitiveWorld(
        normalizeOwnedStreamingPlatformState(platformValue, player.id),
        player,
        absoluteWeek,
    );
    if (platform.competitiveWorld.lastSimulatedAbsoluteWeek === absoluteWeek) return platform;
    const previousRivals = platform.competitiveWorld.rivals;
    platform = settleExpiredMoves(platform, absoluteWeek);
    const completed = completeDueRegions(platform, absoluteWeek);
    platform = completed.platform;
    let rivals = projectStreamingRivalsFromCanonicalWorld(player, platform.competitiveWorld.rivals, absoluteWeek);
    const weeklyRivalHistory: OwnedStreamingRivalWeeklySnapshot[] = rivals.map(rival => {
        const previous = previousRivals.find(candidate => candidate.platformId === rival.platformId);
        const subscribersBeforeMillions = previous?.subscribersMillions ?? rival.subscribersMillions;
        return {
            id: createDeterministicId('streaming_rival_week', platform.simulationSeed, rival.platformId, absoluteWeek),
            absoluteWeek,
            platformId: rival.platformId,
            platformName: rival.platformName,
            subscribersBeforeMillions,
            subscribersAfterMillions: rival.subscribersMillions,
            netMovementMillions: Math.round((rival.subscribersMillions - subscribersBeforeMillions) * 100) / 100,
            driver: 'Canonical rival platform operations determined the weekly audience movement.',
        };
    });
    const launchWeek = platform.launchCommit?.committedAtAbsoluteWeek || absoluteWeek;
    const weeksLive = Math.max(0, absoluteWeek - launchWeek);
    const ledger: OwnedStreamingLedgerEntry[] = [...completed.ledger];
    const cinematics: OwnedStreamingCinematicEvent[] = [];
    let moves = platform.competitiveWorld.moves;
    if (weeksLive > 0 && weeksLive % 4 === 0) {
        const eligible = rivals
            .filter(rival => rival.cooldownUntilAbsoluteWeek <= absoluteWeek)
            .filter(rival => rival.cashReserveMillions >= 20)
            .sort((left, right) => (
                right.aggression + right.memory.resentment - left.aggression - left.memory.resentment
                || left.platformId.localeCompare(right.platformId)
            ));
        if (eligible.length) {
            const selected = eligible[0];
            const created = createRivalMove(platform, selected, absoluteWeek);
            if (created) {
                rivals = rivals.map(item => item.platformId === selected.platformId ? created.rival : item);
                moves = [...moves, created.move];
                ledger.push(created.ledger);
                if (!platform.milestoneKeys.includes('first-platform-war')) {
                    cinematics.push({
                        id: createDeterministicId('streaming_scene', platform.simulationSeed, 'first-platform-war'),
                        idempotencyKey: 'first-platform-war',
                        type: 'PLATFORM_WAR_DECLARATION',
                        status: 'QUEUED',
                        priority: 'IMPORTANT',
                        availableAtAbsoluteWeek: absoluteWeek,
                        title: created.move.title,
                        factIds: [created.ledger.id],
                    });
                }
            }
        }
    }
    rivals = projectStreamingRivalsFromCanonicalWorld(player, rivals, absoluteWeek);
    platform = {
        ...platform,
        competitiveWorld: {
            ...platform.competitiveWorld,
            lastSimulatedAbsoluteWeek: absoluteWeek,
            rivalryHeat: clamp(platform.competitiveWorld.rivalryHeat + (ledger.some(item => item.type === 'RIVAL_MOVE_COMMITTED') ? 4 : -1), 0, 100),
            rivals,
            moves,
            weeklyRivalHistory: [...platform.competitiveWorld.weeklyRivalHistory, ...weeklyRivalHistory],
        },
    };
    const marketShare = buildMarketShareSnapshot(platform, absoluteWeek);
    const playerEntry = marketShare.entries.find(item => item.id === 'PLAYER');
    const playerRank = marketShare.entries.findIndex(item => item.id === 'PLAYER') + 1;
    const marketKey = `streaming-market-share:${absoluteWeek}`;
    ledger.push({
        id: createDeterministicId('streaming_event', platform.simulationSeed, marketKey),
        idempotencyKey: marketKey,
        absoluteWeek,
        type: 'MARKET_SHARE_COMMITTED',
        summary: `${platform.identity?.name || 'EMPIRE+'} recorded ${marketShare.entries.find(item => item.id === 'PLAYER')?.sharePercent.toFixed(2) || '0.00'}% modeled world share.`,
        source: 'WEEK_PROCESSOR',
        metadata: { playerShare: marketShare.entries.find(item => item.id === 'PLAYER')?.sharePercent || 0 },
    });
    const shareMilestone = playerEntry && playerEntry.sharePercent >= 1 && !platform.milestoneKeys.includes('streaming-share-1');
    const podiumMilestone = playerRank > 0 && playerRank <= 3 && !platform.milestoneKeys.includes('streaming-world-podium');
    const dominanceMilestone = playerRank === 1 && !platform.milestoneKeys.includes('streaming-global-dominance');
    if (shareMilestone || podiumMilestone || dominanceMilestone) {
        const key = dominanceMilestone ? 'streaming-global-dominance' : podiumMilestone ? 'streaming-world-podium' : 'streaming-share-1';
        const milestoneLedger: OwnedStreamingLedgerEntry = {
            id: createDeterministicId('streaming_event', platform.simulationSeed, key),
            idempotencyKey: key,
            absoluteWeek,
            type: 'MILESTONE_REACHED',
            summary: dominanceMilestone
                ? `${platform.identity?.name || 'EMPIRE+'} became the modeled world streaming leader.`
                : podiumMilestone
                    ? `${platform.identity?.name || 'EMPIRE+'} entered the global top three.`
                    : `${platform.identity?.name || 'EMPIRE+'} crossed one percent modeled world share.`,
            source: 'WEEK_PROCESSOR',
            metadata: { playerShare: playerEntry?.sharePercent || 0, playerRank },
        };
        ledger.push(milestoneLedger);
        cinematics.push({
            id: createDeterministicId('streaming_scene', platform.simulationSeed, key),
            idempotencyKey: key,
            type: dominanceMilestone ? 'GLOBAL_DOMINANCE' : 'MARKET_SHARE_BREAKTHROUGH',
            status: 'QUEUED',
            priority: 'MAJOR',
            availableAtAbsoluteWeek: absoluteWeek,
            title: milestoneLedger.summary,
            factIds: [milestoneLedger.id],
        });
    }
    let awardSeasons = platform.competitiveWorld.awardSeasons;
    const seasonNumber = Math.floor(weeksLive / 52);
    if (seasonNumber >= 1 && !awardSeasons.some(item => item.seasonNumber === seasonNumber)) {
        const season = createAwardSeason({
            ...platform,
            competitiveWorld: {
                ...platform.competitiveWorld,
                marketShareHistory: [...platform.competitiveWorld.marketShareHistory, marketShare],
            },
        }, absoluteWeek, seasonNumber);
        awardSeasons = [...awardSeasons, season];
        const awardLedger: OwnedStreamingLedgerEntry = {
            id: createDeterministicId('streaming_event', platform.simulationSeed, season.idempotencyKey),
            idempotencyKey: season.idempotencyKey,
            absoluteWeek,
            type: 'STREAMING_AWARDS_RESOLVED',
            summary: `Streaming Awards Season ${seasonNumber}: ${season.playerNominations} nominations and ${season.playerWins} wins.`,
            source: 'WEEK_PROCESSOR',
            metadata: { seasonNumber, playerNominations: season.playerNominations, playerWins: season.playerWins },
        };
        ledger.push(awardLedger);
        cinematics.push({
            id: createDeterministicId('streaming_scene', platform.simulationSeed, `${season.idempotencyKey}:ceremony`),
            idempotencyKey: `${season.idempotencyKey}:ceremony`,
            type: 'STREAMING_AWARDS_CEREMONY',
            status: 'QUEUED',
            priority: 'MAJOR',
            availableAtAbsoluteWeek: absoluteWeek,
            title: `Streaming Awards • Season ${seasonNumber}`,
            factIds: [awardLedger.id],
        });
    }
    return compactOwnedStreamingPlatformForPersistence({
        ...platform,
        competitiveWorld: {
            ...platform.competitiveWorld,
            globalPrestige: clamp(platform.competitiveWorld.globalPrestige + (awardSeasons.at(-1)?.absoluteWeek === absoluteWeek ? awardSeasons.at(-1)!.playerWins * 5 + awardSeasons.at(-1)!.playerNominations : 0), 0, 100),
            marketShareHistory: [...platform.competitiveWorld.marketShareHistory, marketShare],
            awardSeasons,
        },
        eventLedger: [...platform.eventLedger, ...ledger],
        cinematicQueue: [...platform.cinematicQueue, ...cinematics],
        milestoneKeys: Array.from(new Set([
            ...platform.milestoneKeys,
            ...(ledger.some(item => item.type === 'RIVAL_MOVE_COMMITTED') ? ['first-platform-war'] : []),
            ...(awardSeasons.length ? ['streaming-awards-entered'] : []),
            ...(shareMilestone ? ['streaming-share-1'] : []),
            ...(podiumMilestone ? ['streaming-world-podium'] : []),
            ...(dominanceMilestone ? ['streaming-global-dominance'] : []),
        ])),
    }, player.id);
};

export const getStreamingCompetitiveWorld = (player: Player): StreamingCompetitiveWorldView => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = initializeCompetitiveWorld(
        normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id),
        player,
        absoluteWeek,
    );
    const world = platform.competitiveWorld;
    const latestMarketShare = world.marketShareHistory.at(-1) || (
        platform.lifecycle === 'ACTIVE' ? buildMarketShareSnapshot(platform, absoluteWeek) : null
    );
    const playerShare = latestMarketShare?.entries.find(item => item.id === 'PLAYER')?.sharePercent ?? null;
    const worldRank = latestMarketShare
        ? latestMarketShare.entries.findIndex(item => item.id === 'PLAYER') + 1
        : null;
    const weeksLive = platform.launchCommit
        ? Math.max(0, absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek)
        : 0;
    const nextAwardsInWeeks = platform.launchCommit ? 52 - (weeksLive % 52) : null;
    return {
        available: platform.lifecycle === 'ACTIVE',
        world,
        rivals: world.rivals,
        latestMoves: world.moves.slice(-12).reverse(),
        openMoves: world.moves.filter(item => item.status === 'OPEN'),
        activeRegions: world.regionalLaunches.filter(item => item.status === 'ACTIVE'),
        inProgressRegion: world.regionalLaunches.find(item => item.status === 'IN_PROGRESS') || null,
        latestMarketShare,
        playerMarketSharePercent: playerShare,
        nextAwardsInWeeks,
        latestAwardSeason: world.awardSeasons.at(-1) || null,
        worldRank: worldRank && worldRank > 0 ? worldRank : null,
    };
};
