import {
    INITIAL_PLAYER,
    type NPCStudioState,
    type Player,
    type PlatformState,
} from '../../types';
import { createDeterministicRng } from '../../services/deterministicRandom';
import { normalizePlatformAiState } from '../../services/platformAi';
import { normalizeStudioAiState } from '../../services/studioAi';
import type { SharedIndustryB8Regime } from './sharedIndustryB8Types';

export const SHARED_INDUSTRY_B8_SCENARIO_SEEDS: Record<SharedIndustryB8Regime, string> = {
    BASELINE: 'b8-baseline-01',
    LEAN: 'b8-lean-01',
    BOOM: 'b8-boom-01',
    CROWDED: 'b8-crowded-01',
    ADVERSE: 'b8-adverse-01',
};

const REGIME_PROFILE: Record<SharedIndustryB8Regime, {
    cash: number;
    demand: number;
    entrantSlots: number;
    distressShare: number;
}> = {
    BASELINE: { cash: 1, demand: 1, entrantSlots: 0, distressShare: 0 },
    LEAN: { cash: 0.68, demand: 0.76, entrantSlots: 0, distressShare: 0.18 },
    BOOM: { cash: 1.42, demand: 1.28, entrantSlots: 2, distressShare: 0 },
    CROWDED: { cash: 1.05, demand: 1.02, entrantSlots: 6, distressShare: 0.04 },
    ADVERSE: { cash: 0.52, demand: 0.64, entrantSlots: 1, distressShare: 0.32 },
};

const round = (value: number, places = 2): number => {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
};

const seedSlug = (seed: string): string => seed.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 24);

const createEntrant = (
    regime: SharedIndustryB8Regime,
    seed: string,
    index: number,
    rng: () => number,
): NPCStudioState => {
    const designatedChallenger = (regime === 'BOOM' || regime === 'CROWDED') && index === 0;
    const potential = designatedChallenger ? 0.99 : rng();
    const scale = potential > 0.94 ? 4 : potential > 0.72 ? 3 : potential > 0.36 ? 2 : 1;
    const valuations = [0.18, 0.75, 4.5, 64];
    const cash = [28, 110, 680, 12_000];
    const archetypes = ['GENRE', 'PRESTIGE', 'COMMERCIAL', 'FRANCHISE', 'CREATOR'] as const;
    return {
        id: `B8_${regime}_${seedSlug(seed)}_${index + 1}`,
        name: `${['Aurora', 'Blue Lantern', 'Crescent', 'Mosaic', 'Northstar', 'Silver Frame'][index % 6]} ${index % 2 ? 'Studios' : 'Pictures'}`,
        valuation: round(valuations[scale - 1] * (0.8 + rng() * 0.5)),
        reputation: Math.round(36 + scale * 10 + rng() * 18),
        cashReserve: round(cash[scale - 1] * REGIME_PROFILE[regime].cash * (0.82 + rng() * 0.36)),
        recentHits: scale >= 3 ? 1 : 0,
        archetype: archetypes[index % archetypes.length],
        isNpcVenture: true,
        ownerNpcId: `b8_owner_${seedSlug(seed).toLowerCase()}_${index + 1}`,
        ownerName: `B8 Founder ${index + 1}`,
    };
};

const seededStudio = (
    source: NPCStudioState,
    profile: typeof REGIME_PROFILE[SharedIndustryB8Regime],
    seed: string,
    index: number,
): NPCStudioState => {
    const rng = createDeterministicRng(`b8-studio:${seed}:${source.id}`);
    const potentialFactor = 0.92 + rng() * 0.16;
    const distress = index > 3 && rng() < profile.distressShare;
    const studio: NPCStudioState = {
        ...source,
        valuation: round(source.valuation * potentialFactor * (0.92 + profile.demand * 0.08)),
        reputation: Math.max(20, Math.min(99, Math.round(source.reputation + (rng() - 0.5) * 8))),
        cashReserve: round(source.cashReserve * profile.cash * potentialFactor * (distress ? 0.28 : 1)),
    };
    return {
        ...studio,
        ai: normalizeStudioAiState(studio, {
            absoluteWeek: 0,
            controller: 'AI',
            status: distress ? 'DISTRESSED' : 'ACTIVE',
        }),
    };
};

const seededPlatform = (
    source: PlatformState,
    playerId: string,
    profile: typeof REGIME_PROFILE[SharedIndustryB8Regime],
    seed: string,
): PlatformState => {
    const rng = createDeterministicRng(`b8-platform:${seed}:${source.id}`);
    const potentialFactor = 0.94 + rng() * 0.12;
    const adjusted: PlatformState = {
        ...source,
        subscribers: round(Math.max(1, source.subscribers * profile.demand * potentialFactor)),
        valuation: round(source.valuation * (0.9 + profile.demand * 0.1) * potentialFactor),
        reputation: Math.max(20, Math.min(99, Math.round(source.reputation + (rng() - 0.5) * 6))),
        cashReserve: round(source.cashReserve * profile.cash * potentialFactor),
        ai: undefined,
    };
    const normalized = normalizePlatformAiState(adjusted, playerId, 0);
    if (rng() >= profile.distressShare || !normalized.ai) return normalized;
    return {
        ...normalized,
        ai: {
            ...normalized.ai,
            status: 'DISTRESSED',
            healthyOperatingWeeks: 0,
        },
    };
};

export const buildSharedIndustryB8Scenario = (
    regime: SharedIndustryB8Regime,
    seed: string,
): Player => {
    const profile = REGIME_PROFILE[regime];
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = `shared-industry-b8-${regime.toLowerCase()}-${seedSlug(seed).toLowerCase()}`;
    player.age = 18;
    player.currentWeek = 1;
    player.news = [];
    player.x = { ...player.x, feed: [] };
    player.instagram = { ...player.instagram, feed: [] };
    player.world = {
        ...player.world,
        projects: [],
        upcomingRivals: [],
        talentBookings: [],
        industryProductions: {},
        industryEvents: {
            schemaVersion: 1,
            lastProcessedAbsoluteWeek: -1,
            lastProjectedAbsoluteWeek: -1,
            events: [],
            publishedEventKeys: [],
        },
        streamingRightsContracts: {},
        streamingRightsTransactions: {},
        platformAiPlayerCommissionOffers: {},
    };

    const baseStudios = Object.values(player.world.studios || {});
    const studios = Object.fromEntries(baseStudios.map((studio, index) => {
        const normalized = seededStudio(studio, profile, seed, index);
        return [normalized.id, normalized];
    }));
    const entrantRng = createDeterministicRng(`b8-entrants:${regime}:${seed}`);
    for (let index = 0; index < profile.entrantSlots; index += 1) {
        const entrant = createEntrant(regime, seed, index, entrantRng);
        studios[entrant.id] = {
            ...entrant,
            ai: normalizeStudioAiState(entrant, { absoluteWeek: 0, controller: 'AI', status: 'ACTIVE' }),
        };
    }
    player.world.studios = studios;

    player.world.platforms = Object.fromEntries(
        Object.values(player.world.platforms || {}).map(platform => {
            const normalized = seededPlatform(platform, player.id, profile, seed);
            return [normalized.id, normalized];
        }),
    ) as Player['world']['platforms'];
    return player;
};

export interface SharedIndustryB8ScenarioDescription {
    activeCompanyCount: number;
    studioCount: number;
    platformCount: number;
    aggregateCompanyCashMillions: number;
    aggregateSubscribersMillions: number;
    companyPotentialDigest: string;
}

export const describeSharedIndustryB8Scenario = (
    player: Player,
): SharedIndustryB8ScenarioDescription => {
    const studios = Object.values(player.world.studios || {});
    const platforms = Object.values(player.world.platforms || {});
    const activeStudios = studios.filter(studio => !['CLOSED', 'SOLD_MERGED'].includes(studio.ai?.status || 'ACTIVE'));
    const activePlatforms = platforms.filter(platform => platform.ai?.status !== 'DORMANT');
    return {
        activeCompanyCount: activeStudios.length + activePlatforms.length,
        studioCount: studios.length,
        platformCount: platforms.length,
        aggregateCompanyCashMillions: round(
            studios.reduce((sum, studio) => sum + studio.cashReserve, 0)
            + platforms.reduce((sum, platform) => sum + platform.cashReserve, 0),
        ),
        aggregateSubscribersMillions: round(platforms.reduce((sum, platform) => sum + platform.subscribers, 0)),
        companyPotentialDigest: [
            ...studios.map(studio => `${studio.id}:${studio.valuation}:${studio.reputation}:${studio.cashReserve}`),
            ...platforms.map(platform => `${platform.id}:${platform.valuation}:${platform.reputation}:${platform.cashReserve}:${platform.subscribers}`),
        ].sort().join('|'),
    };
};
