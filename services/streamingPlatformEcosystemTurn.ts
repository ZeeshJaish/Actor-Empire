import type {
    NewsItem,
    Player,
    StreamingEcosystemEvent,
    StreamingEcosystemOperator,
    StreamingEcosystemOrigin,
    StreamingEcosystemStartingClass,
    StreamingPlatformEcosystemState,
    WorldState,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { generateStreamingOperatorBrand } from './streamingPlatformBrandGenerator';
import { resolveStreamingOperatorBrand } from './streamingPlatformBrandRegistry';
import { STREAMING_DAY_ONE_MARKETS } from './streamingDayOneMarkets';
import {
    normalizeStreamingPlatformEcosystem,
    repairStreamingEcosystemMarketShares,
} from './streamingPlatformEcosystem';
import {
    calculateStreamingCompetitionHealth,
    chooseStreamingEcosystemLaunchClass,
} from './streamingPlatformCompetitionHealth';
import { processIndustryIntelligenceShadowCompany } from './industryIntelligence/industryIntelligenceCoordinator';
import { adaptStreamingEcosystemIntelligenceContext } from './industryIntelligence/streamingEcosystemIntelligenceAdapter';
import type { IndustryContentFingerprint } from '../types';

const ORIGINS: StreamingEcosystemOrigin[] = ['BOOTSTRAPPED', 'VENTURE_BACKED', 'TELECOM_BACKED', 'BROADCASTER_BACKED', 'STUDIO_SPINOFF', 'TECH_BACKED', 'CONGLOMERATE_BACKED', 'CELEBRITY_FOUNDED'];
const NAME_PREFIXES: Record<string, string[]> = {
    NORTH_AMERICA: ['Northline', 'Signal', 'Vista', 'Cobalt'],
    SOUTH_AMERICA: ['Luma', 'Sol', 'Canela', 'Viva'],
    EUROPE: ['Arc', 'Mosaic', 'Northstar', 'Velvet'],
    AFRICA: ['Baobab', 'Kora', 'Ubuntu', 'Savanna'],
    ASIA: ['Nova', 'Lotus', 'Pulse', 'Orbit'],
    OCEANIA: ['Southern', 'Harbour', 'Koru', 'Bluewave'],
};
const NAME_SUFFIXES = ['Play', 'Stream', 'View', 'Plus', 'Screen', 'Now'];
const STREAMING_ECOSYSTEM_GENERATION_VERSION = 1;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const roundTwo = (value: number): number => Math.round(value * 100) / 100;
const pick = <T>(items: T[], rng: () => number): T => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

interface OriginProfile {
    cash: [number, number];
    valuation: [number, number];
    subscribers: [number, number];
    technology: [number, number];
    catalogue: [number, number];
    localization: [number, number];
    brand: [number, number];
    prestige: [number, number];
    efficiency: [number, number];
    risk: [number, number];
    startingMarkets: number;
}

const ORIGIN_PROFILES: Record<StreamingEcosystemOrigin, OriginProfile> = {
    BOOTSTRAPPED: { cash: [12, 45], valuation: [0.03, 0.18], subscribers: [0.08, 0.45], technology: [38, 58], catalogue: [30, 55], localization: [25, 48], brand: [28, 58], prestige: [25, 62], efficiency: [40, 64], risk: [68, 90], startingMarkets: 1 },
    VENTURE_BACKED: { cash: [120, 420], valuation: [0.35, 1.4], subscribers: [0.3, 1.4], technology: [58, 78], catalogue: [38, 64], localization: [42, 68], brand: [48, 72], prestige: [38, 65], efficiency: [55, 76], risk: [58, 80], startingMarkets: 1 },
    TELECOM_BACKED: { cash: [450, 1100], valuation: [1.2, 4], subscribers: [1.2, 5], technology: [72, 88], catalogue: [48, 72], localization: [58, 78], brand: [64, 84], prestige: [42, 65], efficiency: [68, 84], risk: [42, 64], startingMarkets: 2 },
    BROADCASTER_BACKED: { cash: [280, 850], valuation: [0.8, 3.2], subscribers: [0.8, 4], technology: [55, 76], catalogue: [70, 91], localization: [62, 84], brand: [68, 90], prestige: [58, 82], efficiency: [55, 76], risk: [42, 66], startingMarkets: 1 },
    STUDIO_SPINOFF: { cash: [220, 700], valuation: [0.65, 2.8], subscribers: [0.4, 2.2], technology: [48, 70], catalogue: [74, 94], localization: [48, 72], brand: [58, 82], prestige: [70, 92], efficiency: [48, 70], risk: [50, 72], startingMarkets: 1 },
    TECH_BACKED: { cash: [700, 1800], valuation: [2, 7], subscribers: [0.8, 4], technology: [82, 96], catalogue: [38, 65], localization: [62, 84], brand: [64, 86], prestige: [38, 68], efficiency: [78, 92], risk: [45, 68], startingMarkets: 2 },
    CONGLOMERATE_BACKED: { cash: [1200, 3200], valuation: [4, 14], subscribers: [2, 9], technology: [76, 92], catalogue: [68, 90], localization: [68, 90], brand: [76, 94], prestige: [62, 84], efficiency: [68, 84], risk: [35, 58], startingMarkets: 3 },
    CELEBRITY_FOUNDED: { cash: [90, 500], valuation: [0.25, 1.8], subscribers: [0.2, 1.5], technology: [42, 68], catalogue: [48, 72], localization: [35, 62], brand: [72, 94], prestige: [52, 82], efficiency: [38, 65], risk: [65, 90], startingMarkets: 1 },
};

const STARTING_CLASS_PROFILES: Record<StreamingEcosystemStartingClass, {
    scale: [number, number];
    startingMarkets: [number, number];
    scoreBoost: number;
    eligibleOrigins: StreamingEcosystemOrigin[];
}> = {
    LOCAL_STARTUP: {
        scale: [0.8, 1], startingMarkets: [1, 1], scoreBoost: 0, eligibleOrigins: ORIGINS,
    },
    REGIONAL_CHALLENGER: {
        scale: [1, 1.35], startingMarkets: [2, 3], scoreBoost: 4,
        eligibleOrigins: ['VENTURE_BACKED', 'BROADCASTER_BACKED', 'STUDIO_SPINOFF', 'TELECOM_BACKED'],
    },
    CORPORATE_ENTRANT: {
        scale: [1.25, 1.75], startingMarkets: [2, 4], scoreBoost: 8,
        eligibleOrigins: ['TELECOM_BACKED', 'BROADCASTER_BACKED', 'TECH_BACKED', 'CONGLOMERATE_BACKED'],
    },
    GLOBAL_ENTRANT: {
        scale: [1.75, 2.5], startingMarkets: [3, 6], scoreBoost: 12,
        eligibleOrigins: ['TECH_BACKED', 'CONGLOMERATE_BACKED'],
    },
};

const ranged = (range: [number, number], rng: () => number): number => roundTwo(range[0] + (range[1] - range[0]) * rng());

export interface CreateDynamicStreamingOperatorInput {
    playerId: string;
    state: StreamingPlatformEcosystemState;
    absoluteWeek: number;
    homeCountryId: string;
    origin: StreamingEcosystemOrigin;
    startingClass?: StreamingEcosystemStartingClass;
}

export const createDynamicStreamingOperator = (
    input: CreateDynamicStreamingOperatorInput,
): StreamingEcosystemOperator => {
    const market = STREAMING_DAY_ONE_MARKETS.find(item => item.id === input.homeCountryId) || STREAMING_DAY_ONE_MARKETS[0];
    const requestedClass = input.startingClass || 'LOCAL_STARTUP';
    const classProfile = STARTING_CLASS_PROFILES[requestedClass];
    const startingClass = classProfile.eligibleOrigins.includes(input.origin) ? requestedClass : 'LOCAL_STARTUP';
    const appliedClassProfile = STARTING_CLASS_PROFILES[startingClass];
    const seed = `${input.playerId}:streaming-ecosystem:${STREAMING_ECOSYSTEM_GENERATION_VERSION}:${input.state.launchSequence}:${input.absoluteWeek}:${market.id}:${input.origin}:${startingClass}`;
    const rng = createDeterministicRng(seed);
    const prefixes = NAME_PREFIXES[market.regionId] || NAME_PREFIXES.NORTH_AMERICA;
    const existingNames = new Set(Object.values(input.state.operators).map(operator => operator.name.toLowerCase()));
    let name = `${pick(prefixes, rng)} ${pick(NAME_SUFFIXES, rng)}`;
    if (existingNames.has(name.toLowerCase())) name = `${name} ${input.state.launchSequence + 1}`;
    const profile = ORIGIN_PROFILES[input.origin];
    const regionalMarkets = STREAMING_DAY_ONE_MARKETS.filter(item => item.regionId === market.regionId && item.id !== market.id);
    const internationalMarkets = STREAMING_DAY_ONE_MARKETS.filter(item => item.regionId !== market.regionId && item.id !== market.id);
    const activeCountryIds = [market.id];
    const classMarketTarget = Math.round(ranged(appliedClassProfile.startingMarkets, rng));
    const startingMarketTarget = Math.max(profile.startingMarkets, classMarketTarget);
    const marketCandidates = startingClass === 'GLOBAL_ENTRANT'
        ? [...regionalMarkets, ...internationalMarkets]
        : [...regionalMarkets, ...internationalMarkets].sort((left, right) => (
            Number(left.regionId !== market.regionId) - Number(right.regionId !== market.regionId)
            || left.id.localeCompare(right.id)
        ));
    while (activeCountryIds.length < startingMarketTarget && marketCandidates.length) {
        const poolSize = startingClass === 'GLOBAL_ENTRANT'
            ? marketCandidates.length
            : Math.min(Math.max(1, regionalMarkets.length), marketCandidates.length);
        const candidate = pick(marketCandidates.slice(0, poolSize), rng);
        activeCountryIds.push(candidate.id);
        marketCandidates.splice(marketCandidates.findIndex(item => item.id === candidate.id), 1);
    }
    activeCountryIds.sort();
    const id = createDeterministicId('streaming_operator', input.playerId, input.state.launchSequence, input.absoluteWeek, market.id, input.origin).toUpperCase();
    const occupiedBrands = Object.values(input.state.operators)
        .filter(operator => operator.lifecycle !== 'CLOSED')
        .map(operator => resolveStreamingOperatorBrand(operator.id, operator.name, operator.brand));
    const brand = {
        source: 'GENERATED' as const,
        identity: generateStreamingOperatorBrand({
            operatorId: id,
            name,
            homeCountryId: market.id,
            origin: input.origin,
            operatorIndex: input.state.launchSequence,
            occupiedBrands,
        }),
    };
    const scale = ranged(appliedClassProfile.scale, rng);
    const boost = appliedClassProfile.scoreBoost;
    const languageLimit = startingClass === 'GLOBAL_ENTRANT' ? 4
        : startingClass === 'CORPORATE_ENTRANT' ? 3
            : startingClass === 'REGIONAL_CHALLENGER' ? 2 : 1;
    const languageIds = Array.from(new Set(activeCountryIds.flatMap(countryId => (
        STREAMING_DAY_ONE_MARKETS.find(item => item.id === countryId)?.languages || []
    )).map(language => language.toLocaleLowerCase('en')))).slice(0, languageLimit);
    const languageTier = startingClass === 'GLOBAL_ENTRANT' ? 2 : startingClass === 'LOCAL_STARTUP' ? 1 : 2;
    return {
        id, name, kind: 'DYNAMIC_FICTIONAL', corePlatformId: null, brand, origin: input.origin,
        startingClass,
        homeCountryId: market.id, lifecycle: 'ACTIVE', foundedAtAbsoluteWeek: input.absoluteWeek,
        cashMillions: roundTwo(ranged(profile.cash, rng) * scale),
        valuationBillions: roundTwo(ranged(profile.valuation, rng) * scale),
        subscriberMillions: roundTwo(ranged(profile.subscribers, rng) * scale),
        technology: roundTwo(clamp(ranged(profile.technology, rng) + boost, 0, 98)),
        cataloguePower: roundTwo(clamp(ranged(profile.catalogue, rng) + boost, 0, 96)),
        localization: roundTwo(clamp(ranged(profile.localization, rng) + boost, 0, 96)),
        brandPower: roundTwo(clamp(ranged(profile.brand, rng) + boost, 0, 96)),
        prestige: roundTwo(clamp(ranged(profile.prestige, rng) + boost * 0.7, 0, 96)),
        efficiency: roundTwo(clamp(ranged(profile.efficiency, rng) + boost * 0.75, 0, 96)),
        risk: roundTwo(clamp(ranged(profile.risk, rng) - boost * 0.65, 20, 95)),
        preferredGenres: [pick(['DRAMA', 'COMEDY', 'THRILLER', 'ACTION', 'ROMANCE', 'DOCUMENTARY'] as const, rng)],
        languageCapabilities: languageIds.map(languageId => ({
            languageId,
            subtitleLevel: languageTier as 1 | 2,
            dubbingLevel: (startingClass === 'LOCAL_STARTUP' ? 0 : Math.max(1, languageTier - 1)) as 0 | 1,
        })),
        activeCountryIds,
        marketMomentum: Object.fromEntries(activeCountryIds.map(idValue => [idValue, roundTwo(2 + rng() * 6)])),
        visibilityQualifyingWeeks: {}, belowVisibilityWeeks: {}, consecutiveStressWeeks: 0,
        lastMaterialChangeAtAbsoluteWeek: input.absoluteWeek,
        lastProcessedAbsoluteWeek: input.absoluteWeek,
    };
};

const addEvent = (
    state: StreamingPlatformEcosystemState,
    event: StreamingEcosystemEvent,
): void => {
    if (state.eventHistory.some(item => item.id === event.id)) return;
    state.eventHistory = [...state.eventHistory, event]
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id))
        .slice(-120);
};

const updateMarketVisibilityStreaks = (
    operator: StreamingEcosystemOperator,
    state: StreamingPlatformEcosystemState,
): void => {
    for (const countryId of operator.activeCountryIds) {
        const market = state.markets[countryId];
        if (!market) continue;
        const share = market.shares.find(item => item.operatorId === operator.id)?.sharePercent || 0;
        operator.visibilityQualifyingWeeks[countryId] = share >= 2.5
            ? (operator.visibilityQualifyingWeeks[countryId] || 0) + 1 : 0;
        operator.belowVisibilityWeeks[countryId] = share < 1.5
            ? (operator.belowVisibilityWeeks[countryId] || 0) + 1 : 0;
        const qualifies = (share >= 4 && operator.visibilityQualifyingWeeks[countryId] >= 4)
            || (share >= 2.5 && (operator.marketMomentum[countryId] || 0) >= 3 && operator.visibilityQualifyingWeeks[countryId] >= 8);
        if (qualifies && !market.visibleOperatorIds.includes(operator.id)) market.visibleOperatorIds.push(operator.id);
        if (share < 1.5 && operator.belowVisibilityWeeks[countryId] >= 12) {
            market.visibleOperatorIds = market.visibleOperatorIds.filter(id => id !== operator.id);
        }
        market.visibleOperatorIds.sort();
    }
};

const progressOperator = (
    player: Player,
    state: StreamingPlatformEcosystemState,
    operator: StreamingEcosystemOperator,
    absoluteWeek: number,
    globalRecentFingerprints: IndustryContentFingerprint[],
): void => {
    if (operator.kind === 'CORE_GLOBAL' || operator.lifecycle === 'CLOSED' || operator.lifecycle === 'ACQUIRED') return;
    if ((operator.lastProcessedAbsoluteWeek ?? -1) >= absoluteWeek) return;
    const rng = createDeterministicRng(`${player.id}:streaming-ecosystem-turn:${absoluteWeek}:${operator.id}`);
    const weeklyRevenue = operator.subscriberMillions * (0.42 + operator.brandPower / 400);
    const weeklyCost = 0.8 + operator.activeCountryIds.length * 0.42 + operator.cataloguePower / 38 + operator.technology / 90;
    const cashDelta = roundTwo(weeklyRevenue - weeklyCost + (rng() - 0.48) * Math.max(0.4, operator.risk / 65));
    operator.cashMillions = roundTwo(operator.cashMillions + cashDelta);
    const operatingSignal = clamp((cashDelta / Math.max(4, weeklyCost)) + (operator.efficiency - 55) / 180 + (rng() - 0.5) * 0.18, -0.35, 0.35);
    operator.subscriberMillions = roundTwo(Math.max(0, operator.subscriberMillions * (1 + operatingSignal * 0.006)));
    operator.valuationBillions = Math.round(Math.max(0.001, operator.valuationBillions * (1 + operatingSignal * 0.004)) * 1000) / 1000;
    operator.consecutiveStressWeeks = operator.cashMillions < weeklyCost * 10 ? operator.consecutiveStressWeeks + 1 : 0;
    if (operator.consecutiveStressWeeks >= 8 && operator.lifecycle === 'ACTIVE') {
        operator.lifecycle = 'DISTRESSED';
        operator.lastMaterialChangeAtAbsoluteWeek = absoluteWeek;
        addEvent(state, {
            id: createDeterministicId('streaming_ecosystem_event', operator.id, absoluteWeek, 'DISTRESS'),
            absoluteWeek, operatorId: operator.id, type: 'DISTRESS', countryId: operator.homeCountryId,
            headline: `${operator.name} enters a difficult operating stretch.`,
            detail: 'Runway pressure is forcing a narrower strategy.',
        });
    } else if (operator.lifecycle === 'DISTRESSED' && operator.consecutiveStressWeeks === 0 && operator.cashMillions > weeklyCost * 20) {
        operator.lifecycle = 'ACTIVE';
        operator.lastMaterialChangeAtAbsoluteWeek = absoluteWeek;
        addEvent(state, {
            id: createDeterministicId('streaming_ecosystem_event', operator.id, absoluteWeek, 'RECOVERY'),
            absoluteWeek, operatorId: operator.id, type: 'RECOVERY', countryId: operator.homeCountryId,
            headline: `${operator.name} stabilizes its streaming business.`, detail: 'A healthier runway restores strategic freedom.',
        });
    }
    if (operator.consecutiveStressWeeks >= 30 && operator.cashMillions < 0) {
        operator.lifecycle = 'CLOSED';
        operator.lastMaterialChangeAtAbsoluteWeek = absoluteWeek;
        addEvent(state, {
            id: createDeterministicId('streaming_ecosystem_event', operator.id, absoluteWeek, 'CLOSED'),
            absoluteWeek, operatorId: operator.id, type: 'CLOSED', countryId: operator.homeCountryId,
            headline: `${operator.name} shuts down.`, detail: 'Its remaining audience returns to the wider market.',
        });
    }
    for (const countryId of operator.activeCountryIds) {
        const market = state.markets[countryId];
        if (!market) continue;
        const index = market.shares.findIndex(item => item.operatorId === operator.id);
        const existingShare = index >= 0 ? market.shares[index].sharePercent : 0;
        const delta = operator.lifecycle === 'CLOSED' ? -existingShare
            : clamp(operatingSignal * 0.22 + (operator.marketMomentum[countryId] || 0) / 180 + (rng() - 0.5) * 0.08, -0.18, 0.24);
        const nextShare = roundTwo(Math.max(0, existingShare + delta));
        const nextShares = index >= 0
            ? market.shares.map((item, itemIndex) => itemIndex === index ? { ...item, sharePercent: nextShare } : item)
            : nextShare > 0 ? [...market.shares, { operatorId: operator.id, sharePercent: nextShare }] : market.shares;
        const repaired = repairStreamingEcosystemMarketShares(nextShares);
        state.markets[countryId] = { ...market, ...repaired, lastRebalancedAtAbsoluteWeek: absoluteWeek };
    }
    updateMarketVisibilityStreaks(operator, state);
    if (operator.intelligence) {
        const intelligence = processIndustryIntelligenceShadowCompany({
            context: adaptStreamingEcosystemIntelligenceContext(operator, absoluteWeek),
            state: operator.intelligence,
            globalRecentFingerprints,
        });
        if (intelligence.changed) operator.intelligence = intelligence.state;
    }
    operator.lastProcessedAbsoluteWeek = absoluteWeek;
};

const maybeLaunchOperator = (
    player: Player,
    state: StreamingPlatformEcosystemState,
    absoluteWeek: number,
): StreamingEcosystemOperator | null => {
    const activeGeneratedOperators = Object.values(state.operators).filter(operator => (
        operator.kind === 'DYNAMIC_FICTIONAL' && !['CLOSED', 'ACQUIRED'].includes(operator.lifecycle)
    ));
    if (activeGeneratedOperators.length >= 23) return null;
    const lastLaunchWeek = Math.max(-1_000, ...state.eventHistory.filter(event => event.type === 'LAUNCH').map(event => event.absoluteWeek));
    if (absoluteWeek - lastLaunchWeek < 26) return null;
    const health = calculateStreamingCompetitionHealth(player, state);
    const rng = createDeterministicRng(`${player.id}:streaming-ecosystem-launch-opportunity:${state.launchSequence}:${absoluteWeek}`);
    if (rng() >= 0.18 + health.launchPressure * 0.38) return null;
    const startingClass = chooseStreamingEcosystemLaunchClass({
        playerId: player.id,
        state,
        health,
        absoluteWeek,
    });
    const homeCandidates = STREAMING_DAY_ONE_MARKETS
        .map(market => ({
            market,
            activeCount: Object.values(state.operators).filter(operator => operator.lifecycle !== 'CLOSED' && operator.activeCountryIds.includes(market.id)).length,
        }))
        .sort((left, right) => left.activeCount - right.activeCount || left.market.id.localeCompare(right.market.id));
    const underserved = new Set(health.underservedCountryIds);
    const preferredHomes = homeCandidates.filter(candidate => underserved.has(candidate.market.id));
    const homePool = (preferredHomes.length ? preferredHomes : homeCandidates).slice(0, Math.min(8, homeCandidates.length));
    const homeCountryId = pick(homePool, rng).market.id;
    const origin = pick(STARTING_CLASS_PROFILES[startingClass].eligibleOrigins, rng);
    return createDynamicStreamingOperator({ playerId: player.id, state, absoluteWeek, homeCountryId, origin, startingClass });
};

export interface StreamingPlatformEcosystemTurnResult {
    world: WorldState;
    news: NewsItem[];
    logs: string[];
    changed: boolean;
}

export const processStreamingPlatformEcosystemTurn = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): StreamingPlatformEcosystemTurnResult => {
    const normalized = normalizeStreamingPlatformEcosystem(world.streamingPlatformEcosystem, absoluteWeek);
    if (normalized.lastProcessedAbsoluteWeek >= absoluteWeek) {
        return { world: { ...world, streamingPlatformEcosystem: normalized }, news: [], logs: [], changed: false };
    }
    const state = structuredClone(normalized);
    const previousEventIds = new Set(state.eventHistory.map(event => event.id));
    const coreRecent = Object.values(world.platforms || {}).flatMap(platform => (
        (platform.ai?.intelligence?.content.selectedFingerprints || []).map(fingerprint => ({
            fingerprint,
            ecosystemOwnerId: null as string | null,
        }))
    ));
    const ecosystemRecent = Object.values(state.operators).flatMap(item => (
        (item.intelligence?.content.selectedFingerprints || []).map(fingerprint => ({
            fingerprint,
            ecosystemOwnerId: item.id as string | null,
        }))
    ));
    const orderRecent = (left: typeof ecosystemRecent[number], right: typeof ecosystemRecent[number]) => (
        right.fingerprint.createdAtAbsoluteWeek - left.fingerprint.createdAtAbsoluteWeek
        || left.fingerprint.id.localeCompare(right.fingerprint.id)
    );
    let orderedRecent = [...ecosystemRecent, ...coreRecent].sort(orderRecent);
    for (const operator of Object.values(state.operators).sort((left, right) => left.id.localeCompare(right.id))) {
        const globalRecentFingerprints = orderedRecent
            .filter(item => item.ecosystemOwnerId !== operator.id)
            .map(item => item.fingerprint)
            .slice(0, 96);
        const previousFingerprintIds = (state.operators[operator.id]?.intelligence?.content.selectedFingerprints || [])
            .map(fingerprint => fingerprint.id);
        progressOperator(player, state, operator, absoluteWeek, globalRecentFingerprints);
        const currentFingerprints = state.operators[operator.id]?.intelligence?.content.selectedFingerprints || [];
        const fingerprintSetChanged = currentFingerprints.length !== previousFingerprintIds.length
            || currentFingerprints.some((fingerprint, index) => fingerprint.id !== previousFingerprintIds[index]);
        if (fingerprintSetChanged) {
            orderedRecent = [
                ...orderedRecent.filter(item => item.ecosystemOwnerId !== operator.id),
                ...currentFingerprints.map(fingerprint => ({
                fingerprint,
                ecosystemOwnerId: operator.id as string | null,
                })),
            ].sort(orderRecent);
        }
    }
    const launched = maybeLaunchOperator(player, state, absoluteWeek);
    if (launched) {
        state.operators[launched.id] = launched;
        for (const countryId of launched.activeCountryIds) {
            const market = state.markets[countryId];
            if (!market) continue;
            const rng = createDeterministicRng(`${player.id}:streaming-ecosystem-launch-share:${launched.id}:${countryId}`);
            const shareFloor = launched.startingClass === 'GLOBAL_ENTRANT' ? 4
                : launched.startingClass === 'CORPORATE_ENTRANT' ? 3
                    : launched.startingClass === 'REGIONAL_CHALLENGER' ? 2 : 1.5;
            const repaired = repairStreamingEcosystemMarketShares([
                ...market.shares,
                { operatorId: launched.id, sharePercent: roundTwo(shareFloor + rng() * 3) },
            ]);
            state.markets[countryId] = { ...market, ...repaired, lastRebalancedAtAbsoluteWeek: absoluteWeek };
        }
        addEvent(state, {
            id: createDeterministicId('streaming_ecosystem_event', launched.id, absoluteWeek, 'LAUNCH'),
            absoluteWeek, operatorId: launched.id, type: 'LAUNCH', countryId: launched.homeCountryId,
            headline: `${launched.name} enters the streaming race.`,
            detail: `${launched.origin.toLowerCase().replaceAll('_', ' ')} backing launches it as a ${launched.startingClass.toLowerCase().replaceAll('_', ' ')}.`,
        });
        state.launchSequence += 1;
    }
    state.lastProcessedAbsoluteWeek = absoluteWeek;
    const canonical = normalizeStreamingPlatformEcosystem(state, absoluteWeek);
    const newEvents = canonical.eventHistory.filter(event => !previousEventIds.has(event.id));
    const news: NewsItem[] = newEvents.map(event => ({
        id: event.id,
        headline: event.headline,
        subtext: event.detail,
        category: event.type === 'CLOSED' || event.type === 'PROMOTED' ? 'TOP_STORY' : 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: event.type === 'CLOSED' || event.type === 'PROMOTED' ? 'HIGH' : 'MEDIUM',
    }));
    return {
        world: { ...world, streamingPlatformEcosystem: canonical },
        news,
        logs: newEvents.map(event => event.headline),
        changed: true,
    };
};
