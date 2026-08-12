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
    PlatformId,
    Player,
    StreamingAwardCategoryId,
    StreamingRegionId,
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

const MOVE_DEFINITIONS: Record<StreamingRivalMoveType, {
    title: (rival: OwnedStreamingRivalProfile, target: string | null) => string;
    detail: string;
    cashCostMillions: number;
    acquisitionRateDelta: number;
    churnRateDelta: number;
    prestigeDelta: number;
    cooldownWeeks: number;
}> = {
    COUNTER_PROGRAM: { title: rival => `${rival.platformName} schedules a collision`, detail: 'A rival premiere is landing against the strongest visible programming window.', cashCostMillions: 38, acquisitionRateDelta: -0.003, churnRateDelta: 0.001, prestigeDelta: 0, cooldownWeeks: 7 },
    RIGHTS_OVERBID: { title: rival => `${rival.platformName} raises the rights table`, detail: 'The rival spent into the same content lane, increasing scarcity and audience noise.', cashCostMillions: 52, acquisitionRateDelta: -0.002, churnRateDelta: 0.0007, prestigeDelta: -1, cooldownWeeks: 8 },
    EXECUTIVE_POACH: { title: (rival, target) => `${rival.ceoName} calls ${target || 'your leadership team'}`, detail: 'A real executive received an outside mandate. Loyalty and the founder relationship now matter.', cashCostMillions: 18, acquisitionRateDelta: 0, churnRateDelta: 0, prestigeDelta: -1, cooldownWeeks: 10 },
    PRICE_CUT: { title: rival => `${rival.platformName} cuts the opening price`, detail: 'A resource-backed price move is pressuring acquisition and value perception for four weeks.', cashCostMillions: 64, acquisitionRateDelta: -0.004, churnRateDelta: 0.0012, prestigeDelta: 0, cooldownWeeks: 12 },
    BUNDLE_LAUNCH: { title: rival => `${rival.platformName} launches a bundle`, detail: 'The rival is using ecosystem strength to reduce churn and crowd the household decision.', cashCostMillions: 46, acquisitionRateDelta: -0.0032, churnRateDelta: 0.0008, prestigeDelta: 1, cooldownWeeks: 10 },
    RESCUE_CANCELLED_SHOW: { title: rival => `${rival.platformName} rescues a cancelled show`, detail: 'A discarded audience promise has become a rival retention story instead.', cashCostMillions: 34, acquisitionRateDelta: -0.0015, churnRateDelta: 0.0014, prestigeDelta: -2, cooldownWeeks: 9 },
    ALLIANCE_SIGNAL: { title: rival => `${rival.ceoName} forms a distribution alliance`, detail: 'The rival traded independence for broader reach and a stronger regional position.', cashCostMillions: 28, acquisitionRateDelta: -0.0022, churnRateDelta: 0.0005, prestigeDelta: 1, cooldownWeeks: 8 },
};

const getWorldPlatform = (player: Player, platformId: PlatformId) => player.world.platforms?.[platformId];

const buildRivals = (player: Player): OwnedStreamingRivalProfile[] => (
    (Object.keys(STREAMING_RIVAL_TEMPLATES) as PlatformId[])
    .filter(platformId => !player.ownedStreamingPlatform.corporateDevelopment?.acquiredPlatformIds?.includes(platformId))
    .map(platformId => {
        const template = STREAMING_RIVAL_TEMPLATES[platformId];
        const worldPlatform = getWorldPlatform(player, platformId);
        return {
            platformId,
            platformName: worldPlatform?.name || platformId.replaceAll('_', ' '),
            ceoName: template.ceoName,
            ceoPersonality: template.ceoPersonality,
            strategy: template.strategy,
            cashReserveMillions: Math.max(0, worldPlatform?.cashReserve || 1_000),
            subscribersMillions: Math.max(0, worldPlatform?.subscribers || 1),
            technology: template.technology,
            catalogPower: template.catalogPower,
            prestige: Math.round(clamp((template.prestige + (worldPlatform?.reputation || template.prestige)) / 2, 0, 100)),
            aggression: template.aggression,
            preferredGenres: template.preferredGenres,
            preferredRegions: template.preferredRegions,
            cooldownUntilAbsoluteWeek: 0,
            lastMoveAbsoluteWeek: null,
            mistakes: 0,
            memory: { respect: 35, resentment: 20, encounters: 0, rivalWins: 0, playerDefences: 0, lastMoveType: null },
        };
    })
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

const selectMoveType = (
    rival: OwnedStreamingRivalProfile,
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
): StreamingRivalMoveType => {
    const activeExecutives = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    const pool: StreamingRivalMoveType[] = rival.strategy === 'PRESTIGE_FIRST'
        ? ['RIGHTS_OVERBID', 'EXECUTIVE_POACH', 'COUNTER_PROGRAM', 'RESCUE_CANCELLED_SHOW']
        : rival.strategy === 'FRANCHISE_FORTRESS'
            ? ['COUNTER_PROGRAM', 'BUNDLE_LAUNCH', 'RIGHTS_OVERBID', 'ALLIANCE_SIGNAL']
            : rival.strategy === 'ATTENTION_ECOSYSTEM'
                ? ['PRICE_CUT', 'BUNDLE_LAUNCH', 'COUNTER_PROGRAM', 'ALLIANCE_SIGNAL']
                : rival.strategy === 'AGILE_CURATOR'
                    ? ['RESCUE_CANCELLED_SHOW', 'RIGHTS_OVERBID', 'EXECUTIVE_POACH', 'COUNTER_PROGRAM']
                    : ['PRICE_CUT', 'COUNTER_PROGRAM', 'RIGHTS_OVERBID', 'BUNDLE_LAUNCH'];
    const validPool = activeExecutives.length ? pool : pool.filter(item => item !== 'EXECUTIVE_POACH');
    const rng = createDeterministicRng(`${platform.simulationSeed}:rival-move-type:${rival.platformId}:${absoluteWeek}`);
    return validPool[Math.floor(rng() * validPool.length)] || 'COUNTER_PROGRAM';
};

const createRivalMove = (
    platform: OwnedStreamingPlatformState,
    rival: OwnedStreamingRivalProfile,
    absoluteWeek: number,
): { move: OwnedStreamingRivalMove; rival: OwnedStreamingRivalProfile; ledger: OwnedStreamingLedgerEntry } | null => {
    const type = selectMoveType(rival, platform, absoluteWeek);
    const definition = MOVE_DEFINITIONS[type];
    if (rival.cashReserveMillions < definition.cashCostMillions) return null;
    const rng = createDeterministicRng(`${platform.simulationSeed}:rival-move:${rival.platformId}:${type}:${absoluteWeek}`);
    const executives = platform.leadership.appointments
        .filter(item => item.status === 'ACTIVE')
        .sort((left, right) => right.performance + right.ambition - left.performance - left.ambition);
    const target = type === 'EXECUTIVE_POACH' ? executives[Math.floor(rng() * Math.max(1, executives.length))] || null : null;
    const mistakeChance = clamp(0.08 + (100 - rival.technology) / 300 + (100 - rival.catalogPower) / 500, 0.08, 0.34);
    const misfired = rng() < mistakeChance;
    const idempotencyKey = `rival-move:${rival.platformId}:${absoluteWeek}`;
    const cashAfter = Math.max(0, rival.cashReserveMillions - definition.cashCostMillions);
    const move: OwnedStreamingRivalMove = {
        id: createDeterministicId('streaming_rival_move', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        platformId: rival.platformId,
        platformName: rival.platformName,
        ceoName: rival.ceoName,
        type,
        title: misfired ? `${definition.title(rival, target?.nameAtAppointment || null)} — and misses` : definition.title(rival, target?.nameAtAppointment || null),
        detail: definition.detail,
        status: misfired ? 'MISFIRED' : 'OPEN',
        cashCostMillions: definition.cashCostMillions,
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
        cashReserveMillions: cashAfter,
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
            cashCostMillions: definition.cashCostMillions,
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
    const moves = platform.competitiveWorld.moves.map(move => {
        if (!['OPEN', 'ACCEPTED_PRESSURE'].includes(move.status) || move.expiresAtAbsoluteWeek >= absoluteWeek) return move;
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
        competitiveWorld: { ...platform.competitiveWorld, moves },
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
    platform = settleExpiredMoves(platform, absoluteWeek);
    const completed = completeDueRegions(platform, absoluteWeek);
    platform = completed.platform;
    const rng = createDeterministicRng(`${platform.simulationSeed}:rival-economy:${absoluteWeek}`);
    let rivals = platform.competitiveWorld.rivals.map((rival, index) => {
        const weeklyCashGeneration = rival.subscribersMillions * (0.18 + rival.catalogPower / 1_000);
        const subscriberDrift = ((rival.catalogPower + rival.technology + rival.prestige) / 300 - 0.5) * 0.0035 + (rng() - 0.5) * 0.002;
        return {
            ...rival,
            cashReserveMillions: Math.round((rival.cashReserveMillions + weeklyCashGeneration) * 10) / 10,
            subscribersMillions: Math.round(Math.max(0.1, rival.subscribersMillions * (1 + subscriberDrift + index * 0.00003)) * 100) / 100,
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
            const selected = eligible[Math.floor(rng() * Math.min(3, eligible.length))];
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
    platform = {
        ...platform,
        competitiveWorld: {
            ...platform.competitiveWorld,
            lastSimulatedAbsoluteWeek: absoluteWeek,
            rivalryHeat: clamp(platform.competitiveWorld.rivalryHeat + (ledger.some(item => item.type === 'RIVAL_MOVE_COMMITTED') ? 4 : -1), 0, 100),
            rivals,
            moves,
        },
    };
    const marketShare = buildMarketShareSnapshot(platform, absoluteWeek);
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
