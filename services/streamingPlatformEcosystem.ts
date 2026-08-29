import type {
    Genre,
    PlatformId,
    Player,
    StreamingCompanySummary,
    StreamingEcosystemEvent,
    StreamingEcosystemLanguageCapability,
    StreamingEcosystemLifecycle,
    StreamingEcosystemMarket,
    StreamingEcosystemMarketShare,
    StreamingEcosystemOperator,
    StreamingEcosystemOperatorKind,
    StreamingEcosystemOrigin,
    StreamingEcosystemStartingClass,
    StreamingPlatformBrandPresentation,
    StreamingPlatformEcosystemState,
} from '../types';
import { STREAMING_DAY_ONE_MARKETS } from './streamingDayOneMarkets';
import {
    STREAMING_DAY_ONE_RIVAL_TO_ECOSYSTEM_ID,
    STREAMING_ECOSYSTEM_LOCAL_SHARE_SEEDS,
    STREAMING_ECOSYSTEM_OPERATOR_SEEDS,
    type StreamingEcosystemOperatorSeed,
} from './streamingPlatformEcosystemSeeds';
import {
    normalizeGeneratedStreamingBrand,
} from './streamingPlatformBrandGenerator';
import {
    getStreamingOthersBrand,
    resolveStreamingOperatorBrand,
} from './streamingPlatformBrandRegistry';

export const STREAMING_ECOSYSTEM_SCHEMA_VERSION = 2;

const OPERATOR_KINDS = new Set<StreamingEcosystemOperatorKind>(['CORE_GLOBAL', 'GLOBAL_REAL', 'REGIONAL_REAL', 'DYNAMIC_FICTIONAL']);
const ORIGINS = new Set<StreamingEcosystemOrigin>(['BOOTSTRAPPED', 'VENTURE_BACKED', 'TELECOM_BACKED', 'BROADCASTER_BACKED', 'STUDIO_SPINOFF', 'TECH_BACKED', 'CONGLOMERATE_BACKED', 'CELEBRITY_FOUNDED']);
const STARTING_CLASSES = new Set<StreamingEcosystemStartingClass>(['LOCAL_STARTUP', 'REGIONAL_CHALLENGER', 'CORPORATE_ENTRANT', 'GLOBAL_ENTRANT']);
const LIFECYCLES = new Set<StreamingEcosystemLifecycle>(['ACTIVE', 'DISTRESSED', 'ACQUIRED', 'CLOSED']);
const CORE_PLATFORM_IDS = new Set<PlatformId>(['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE']);
const MARKET_IDS = new Set(STREAMING_DAY_ONE_MARKETS.map(market => market.id));
const GENRES = new Set<Genre>(['ACTION', 'COMEDY', 'DRAMA', 'HORROR', 'ROMANCE', 'SCI_FI', 'THRILLER', 'FANTASY', 'SUPERHERO', 'ANIMATION', 'MUSICAL', 'CRIME', 'DOCUMENTARY', 'ADVENTURE', 'MYSTERY', 'BIOPIC', 'SPORTS']);

const asRecord = (value: unknown): Record<string, any> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
);
const finite = (value: unknown, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value: unknown, min: number, max: number, fallback = min): number => Math.max(min, Math.min(max, finite(value, fallback)));
const clean = (value: unknown, fallback = '', max = 120): string => (typeof value === 'string' && value.trim() ? value.trim() : fallback).slice(0, max);
const uniqueStrings = (value: unknown, allowed?: Set<string>): string[] => Array.from(new Set(
    (Array.isArray(value) ? value : [])
        .map(item => clean(item).toUpperCase())
        .filter(item => item && (!allowed || allowed.has(item))),
)).sort();

const normalizeLanguages = (
    value: unknown,
    fallback: StreamingEcosystemLanguageCapability[],
): StreamingEcosystemLanguageCapability[] => {
    const byId = new Map<string, StreamingEcosystemLanguageCapability>();
    for (const item of Array.isArray(value) ? value : fallback) {
        const source = asRecord(item);
        const languageId = clean(source.languageId).toLowerCase();
        if (!languageId) continue;
        byId.set(languageId, {
            languageId,
            subtitleLevel: Math.round(clamp(source.subtitleLevel, 0, 3)) as 0 | 1 | 2 | 3,
            dubbingLevel: Math.round(clamp(source.dubbingLevel, 0, 3)) as 0 | 1 | 2 | 3,
        });
    }
    return [...byId.values()].sort((left, right) => left.languageId.localeCompare(right.languageId));
};

const seedToOperator = (seed: StreamingEcosystemOperatorSeed): StreamingEcosystemOperator => {
    const { brandRegistryKey, ...operatorSeed } = seed;
    return {
        ...operatorSeed,
        brand: { source: 'REAL_REGISTRY', registryKey: brandRegistryKey },
        lifecycle: 'ACTIVE',
        foundedAtAbsoluteWeek: 0,
        activeCountryIds: [...seed.activeCountryIds].filter(id => MARKET_IDS.has(id)).sort(),
        preferredGenres: [...seed.preferredGenres],
        languageCapabilities: normalizeLanguages(seed.languageCapabilities, []),
        marketMomentum: {},
        visibilityQualifyingWeeks: {},
        belowVisibilityWeeks: {},
        consecutiveStressWeeks: 0,
        lastMaterialChangeAtAbsoluteWeek: 0,
    };
};

const normalizeNumberMap = (value: unknown, allowed?: Set<string>): Record<string, number> => Object.fromEntries(
    Object.entries(asRecord(value))
        .filter(([id]) => !allowed || allowed.has(id))
        .map(([id, amount]): [string, number] => [id, Math.round(clamp(amount, -100, 100) * 100) / 100])
        .sort(([left], [right]) => left.localeCompare(right)),
);

const normalizeWeekMap = (value: unknown): Record<string, number> => Object.fromEntries(
    Object.entries(asRecord(value))
        .filter(([id]) => MARKET_IDS.has(id))
        .map(([id, amount]): [string, number] => [id, Math.max(0, Math.round(finite(amount)))])
        .sort(([left], [right]) => left.localeCompare(right)),
);

const normalizeOperator = (
    value: unknown,
    seed: StreamingEcosystemOperatorSeed | null,
    fallbackId: string,
    occupiedBrands: StreamingPlatformBrandPresentation[],
    operatorIndex: number,
): StreamingEcosystemOperator | null => {
    const source = asRecord(value);
    const base = seed ? seedToOperator(seed) : null;
    const id = clean(source.id, base?.id || fallbackId).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const name = clean(source.name, base?.name || '', 80);
    const homeCountryId = clean(source.homeCountryId, base?.homeCountryId || '').toUpperCase();
    if (!id || !name || !MARKET_IDS.has(homeCountryId)) return null;
    const kind = OPERATOR_KINDS.has(source.kind) ? source.kind as StreamingEcosystemOperatorKind : base?.kind || 'DYNAMIC_FICTIONAL';
    const corePlatformId = CORE_PLATFORM_IDS.has(source.corePlatformId as PlatformId)
        ? source.corePlatformId as PlatformId
        : base?.corePlatformId || null;
    const origin = ORIGINS.has(source.origin) ? source.origin as StreamingEcosystemOrigin : base?.origin || 'BOOTSTRAPPED';
    const startingClass = STARTING_CLASSES.has(source.startingClass)
        ? source.startingClass as StreamingEcosystemStartingClass
        : base?.startingClass || 'LOCAL_STARTUP';
    const sourceBrand = asRecord(source.brand);
    const brand = seed
        ? { source: 'REAL_REGISTRY' as const, registryKey: seed.brandRegistryKey }
        : {
            source: 'GENERATED' as const,
            identity: normalizeGeneratedStreamingBrand(
                sourceBrand.source === 'GENERATED' ? sourceBrand.identity : undefined,
                { operatorId: id, name, homeCountryId, origin, occupiedBrands, operatorIndex },
            ),
        };
    const preferredGenres = Array.from(new Set(
        (Array.isArray(source.preferredGenres) ? source.preferredGenres : base?.preferredGenres || [])
            .filter((genre): genre is Genre => GENRES.has(genre as Genre)),
    )).slice(0, 6);
    const activeCountryIds = uniqueStrings(source.activeCountryIds ?? base?.activeCountryIds, MARKET_IDS);
    if (!activeCountryIds.includes(homeCountryId)) activeCountryIds.push(homeCountryId);
    activeCountryIds.sort();
    return {
        id, name, kind, corePlatformId, brand, origin, startingClass,
        homeCountryId,
        lifecycle: LIFECYCLES.has(source.lifecycle) ? source.lifecycle as StreamingEcosystemLifecycle : 'ACTIVE',
        foundedAtAbsoluteWeek: Math.max(0, Math.round(finite(source.foundedAtAbsoluteWeek, base?.foundedAtAbsoluteWeek || 0))),
        cashMillions: Math.round(clamp(source.cashMillions, -500, 100_000, base?.cashMillions || 0) * 100) / 100,
        valuationBillions: Math.round(clamp(source.valuationBillions, 0, 10_000, base?.valuationBillions || 0) * 1000) / 1000,
        subscriberMillions: Math.round(clamp(source.subscriberMillions, 0, 10_000, base?.subscriberMillions || 0) * 100) / 100,
        technology: Math.round(clamp(source.technology, 0, 100, base?.technology || 0) * 100) / 100,
        cataloguePower: Math.round(clamp(source.cataloguePower, 0, 100, base?.cataloguePower || 0) * 100) / 100,
        localization: Math.round(clamp(source.localization, 0, 100, base?.localization || 0) * 100) / 100,
        brandPower: Math.round(clamp(source.brandPower, 0, 100, base?.brandPower || 0) * 100) / 100,
        prestige: Math.round(clamp(source.prestige, 0, 100, base?.prestige || 0) * 100) / 100,
        efficiency: Math.round(clamp(source.efficiency, 0, 100, base?.efficiency || 0) * 100) / 100,
        risk: Math.round(clamp(source.risk, 0, 100, base?.risk || 50) * 100) / 100,
        preferredGenres,
        languageCapabilities: normalizeLanguages(source.languageCapabilities, base?.languageCapabilities || []),
        activeCountryIds,
        marketMomentum: normalizeNumberMap(source.marketMomentum, MARKET_IDS),
        visibilityQualifyingWeeks: normalizeWeekMap(source.visibilityQualifyingWeeks),
        belowVisibilityWeeks: normalizeWeekMap(source.belowVisibilityWeeks),
        consecutiveStressWeeks: Math.max(0, Math.round(finite(source.consecutiveStressWeeks))),
        lastMaterialChangeAtAbsoluteWeek: Math.max(0, Math.round(finite(source.lastMaterialChangeAtAbsoluteWeek))),
    };
};

export const repairStreamingEcosystemMarketShares = (
    shares: StreamingEcosystemMarketShare[],
): { shares: StreamingEcosystemMarketShare[]; othersSharePercent: number } => {
    const byId = new Map<string, number>();
    for (const item of shares) {
        const id = clean(item?.operatorId).toUpperCase();
        if (!id) continue;
        byId.set(id, Math.max(0, finite(item.sharePercent)) + (byId.get(id) || 0));
    }
    const entries = [...byId.entries()].sort(([left], [right]) => left.localeCompare(right));
    const rawCents = entries.map(([id, share]) => ({ id, exact: share * 100 }));
    const totalExact = rawCents.reduce((sum, item) => sum + item.exact, 0);
    const scaled = totalExact > 10_000
        ? rawCents.map(item => ({ ...item, exact: item.exact * (10_000 / totalExact) }))
        : rawCents;
    const cents = scaled.map(item => ({ id: item.id, cents: Math.floor(item.exact), remainder: item.exact - Math.floor(item.exact) }));
    const targetNamed = Math.min(10_000, Math.round(scaled.reduce((sum, item) => sum + item.exact, 0)));
    let remaining = targetNamed - cents.reduce((sum, item) => sum + item.cents, 0);
    [...cents].sort((left, right) => right.remainder - left.remainder || left.id.localeCompare(right.id))
        .forEach(item => {
            if (remaining <= 0) return;
            const target = cents.find(entry => entry.id === item.id)!;
            target.cents += 1;
            remaining -= 1;
        });
    const normalizedShares = cents
        .filter(item => item.cents > 0)
        .map(item => ({ operatorId: item.id, sharePercent: item.cents / 100 }))
        .sort((left, right) => right.sharePercent - left.sharePercent || left.operatorId.localeCompare(right.operatorId));
    const namedCents = normalizedShares.reduce((sum, item) => sum + Math.round(item.sharePercent * 100), 0);
    return { shares: normalizedShares, othersSharePercent: (10_000 - namedCents) / 100 };
};

const createSeedMarket = (countryId: string): StreamingEcosystemMarket => {
    const market = STREAMING_DAY_ONE_MARKETS.find(item => item.id === countryId)!;
    const globalShares = market.rivals.map(rival => ({
        operatorId: STREAMING_DAY_ONE_RIVAL_TO_ECOSYSTEM_ID[rival.id],
        sharePercent: rival.watchSharePercent,
    })).filter(item => item.operatorId);
    const localShares = Object.entries(STREAMING_ECOSYSTEM_LOCAL_SHARE_SEEDS[countryId] || {})
        .map(([operatorId, sharePercent]) => ({ operatorId, sharePercent }));
    const repaired = repairStreamingEcosystemMarketShares([...globalShares, ...localShares]);
    const visibleOperatorIds = repaired.shares
        .filter(item => {
            const operator = STREAMING_ECOSYSTEM_OPERATOR_SEEDS.find(seed => seed.id === item.operatorId);
            return operator?.kind === 'CORE_GLOBAL' || operator?.kind === 'GLOBAL_REAL' || item.sharePercent >= 4;
        })
        .map(item => item.operatorId);
    return { countryId, ...repaired, visibleOperatorIds, lastRebalancedAtAbsoluteWeek: 0 };
};

const normalizeMarket = (
    value: unknown,
    countryId: string,
    validOperatorIds: Set<string>,
): StreamingEcosystemMarket => {
    const source = asRecord(value);
    const seedMarket = createSeedMarket(countryId);
    const incomingShares = Array.isArray(source.shares)
        ? source.shares.map(item => asRecord(item)).map(item => ({
            operatorId: clean(item.operatorId).toUpperCase(),
            sharePercent: finite(item.sharePercent),
        }))
        : seedMarket.shares;
    const byId = new Map(incomingShares.filter(item => validOperatorIds.has(item.operatorId)).map(item => [item.operatorId, item.sharePercent]));
    const repaired = repairStreamingEcosystemMarketShares([...byId].map(([operatorId, sharePercent]) => ({ operatorId, sharePercent })));
    const visibleOperatorIds = uniqueStrings(source.visibleOperatorIds ?? seedMarket.visibleOperatorIds)
        .filter(id => validOperatorIds.has(id) && repaired.shares.some(item => item.operatorId === id));
    return {
        countryId,
        ...repaired,
        visibleOperatorIds,
        lastRebalancedAtAbsoluteWeek: Math.max(0, Math.round(finite(source.lastRebalancedAtAbsoluteWeek))),
    };
};

const normalizeEvents = (value: unknown, validOperatorIds: Set<string>): StreamingEcosystemEvent[] => (
    (Array.isArray(value) ? value : [])
        .map(item => asRecord(item))
        .filter(item => validOperatorIds.has(clean(item.operatorId).toUpperCase()))
        .map(item => ({
            id: clean(item.id, '', 160),
            absoluteWeek: Math.max(0, Math.round(finite(item.absoluteWeek))),
            operatorId: clean(item.operatorId).toUpperCase(),
            type: ['LAUNCH', 'PROMOTED', 'EXPANSION', 'DISTRESS', 'RECOVERY', 'ACQUIRED', 'CLOSED'].includes(item.type)
                ? item.type as StreamingEcosystemEvent['type'] : 'LAUNCH',
            headline: clean(item.headline, 'Streaming company update', 160),
            detail: clean(item.detail, '', 260),
            countryId: MARKET_IDS.has(clean(item.countryId).toUpperCase()) ? clean(item.countryId).toUpperCase() : null,
        }))
        .filter(item => item.id)
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id))
        .slice(-120)
);

export const normalizeStreamingPlatformEcosystem = (
    value: unknown,
    absoluteWeek: number,
): StreamingPlatformEcosystemState => {
    const source = asRecord(value);
    const sourceOperators = asRecord(source.operators);
    const seedById = new Map(STREAMING_ECOSYSTEM_OPERATOR_SEEDS.map(seed => [seed.id, seed]));
    const operatorIds = new Set([...seedById.keys(), ...Object.keys(sourceOperators).map(id => id.toUpperCase())]);
    const operators: Record<string, StreamingEcosystemOperator> = {};
    const occupiedBrands: StreamingPlatformBrandPresentation[] = [];
    for (const [operatorIndex, id] of [...operatorIds].sort().entries()) {
        const normalized = normalizeOperator(sourceOperators[id], seedById.get(id) || null, id, occupiedBrands, operatorIndex);
        if (normalized) {
            operators[normalized.id] = normalized;
            occupiedBrands.push(resolveStreamingOperatorBrand(normalized.id, normalized.name, normalized.brand));
        }
    }
    const validOperatorIds = new Set(Object.keys(operators));
    const sourceMarkets = asRecord(source.markets);
    const markets = Object.fromEntries([...MARKET_IDS].sort().map(countryId => [
        countryId,
        normalizeMarket(sourceMarkets[countryId], countryId, validOperatorIds),
    ]));
    return {
        schemaVersion: STREAMING_ECOSYSTEM_SCHEMA_VERSION,
        lastProcessedAbsoluteWeek: Math.max(-1, Math.min(Math.round(finite(absoluteWeek)), Math.round(finite(source.lastProcessedAbsoluteWeek, -1)))),
        launchSequence: Math.max(0, Math.round(finite(source.launchSequence))),
        operators,
        markets,
        eventHistory: normalizeEvents(source.eventHistory, validOperatorIds),
    };
};

export const getStreamingEcosystemOperator = (
    state: StreamingPlatformEcosystemState,
    operatorId: string,
): StreamingEcosystemOperator | null => state.operators[operatorId] || null;

const toSummaryKind = (operator: StreamingEcosystemOperator): StreamingCompanySummary['kind'] => (
    operator.kind === 'CORE_GLOBAL' ? 'CORE'
        : operator.kind === 'GLOBAL_REAL' ? 'GLOBAL'
            : operator.kind === 'DYNAMIC_FICTIONAL' ? 'DYNAMIC'
                : 'REGIONAL'
);

const toCompanySummary = (
    player: Pick<Player, 'world'>,
    operator: StreamingEcosystemOperator,
    countryId?: string,
    sharePercent?: number,
): StreamingCompanySummary => {
    const authoritative = operator.corePlatformId ? player.world.platforms?.[operator.corePlatformId] : null;
    return {
        id: operator.id,
        name: authoritative?.name || operator.name,
        kind: toSummaryKind(operator),
        brand: resolveStreamingOperatorBrand(operator.id, authoritative?.name || operator.name, operator.brand),
        homeCountryId: operator.homeCountryId,
        ...(countryId ? { countryId } : {}),
        ...(sharePercent === undefined ? {} : { sharePercent }),
        subscribersMillions: authoritative?.subscribers ?? operator.subscriberMillions,
        valuationBillions: authoritative?.valuation ?? operator.valuationBillions,
        momentum: countryId ? operator.marketMomentum[countryId] || 0 : Math.max(0, ...Object.values(operator.marketMomentum)),
        lifecycle: operator.lifecycle,
        ...(operator.corePlatformId ? { corePlatformId: operator.corePlatformId } : {}),
    };
};

const qualifiesForLocalVisibility = (
    operator: StreamingEcosystemOperator,
    market: StreamingEcosystemMarket,
    sharePercent: number,
): boolean => {
    if (operator.lifecycle === 'CLOSED' || operator.lifecycle === 'ACQUIRED') return false;
    if (operator.kind === 'CORE_GLOBAL' || operator.kind === 'GLOBAL_REAL') return true;
    const belowWeeks = operator.belowVisibilityWeeks[market.countryId] || 0;
    if (sharePercent < 1.5 && belowWeeks >= 12) return false;
    if (market.visibleOperatorIds.includes(operator.id)) return true;
    const qualifyingWeeks = operator.visibilityQualifyingWeeks[market.countryId] || 0;
    const momentum = operator.marketMomentum[market.countryId] || 0;
    return (sharePercent >= 4 && qualifyingWeeks >= 4)
        || (sharePercent >= 2.5 && momentum >= 3 && qualifyingWeeks >= 8);
};

export const getVisibleStreamingCompaniesForMarket = (
    player: Pick<Player, 'world'>,
    countryId: string,
): StreamingCompanySummary[] => {
    const normalizedCountryId = clean(countryId).toUpperCase();
    if (!MARKET_IDS.has(normalizedCountryId)) return [];
    const state = normalizeStreamingPlatformEcosystem(
        player.world.streamingPlatformEcosystem,
        player.world.streamingPlatformEcosystem?.lastProcessedAbsoluteWeek ?? 0,
    );
    const market = state.markets[normalizedCountryId];
    const global: Array<{ operator: StreamingEcosystemOperator; share: number }> = [];
    const local: Array<{ operator: StreamingEcosystemOperator; share: number }> = [];
    let hiddenShare = market.othersSharePercent;
    for (const share of market.shares) {
        const operator = state.operators[share.operatorId];
        if (!operator || !operator.activeCountryIds.includes(normalizedCountryId) || !qualifiesForLocalVisibility(operator, market, share.sharePercent)) {
            hiddenShare += share.sharePercent;
            continue;
        }
        if (operator.kind === 'CORE_GLOBAL' || operator.kind === 'GLOBAL_REAL') global.push({ operator, share: share.sharePercent });
        else local.push({ operator, share: share.sharePercent });
    }
    global.sort((left, right) => right.share - left.share || left.operator.id.localeCompare(right.operator.id));
    local.sort((left, right) => (
        right.share - left.share
        || (right.operator.marketMomentum[normalizedCountryId] || 0) - (left.operator.marketMomentum[normalizedCountryId] || 0)
        || left.operator.id.localeCompare(right.operator.id)
    ));
    const shownLocals = local.slice(0, 3);
    hiddenShare += local.slice(3).reduce((sum, item) => sum + item.share, 0);
    const summaries = [...global, ...shownLocals]
        .sort((left, right) => right.share - left.share || left.operator.id.localeCompare(right.operator.id))
        .map(item => toCompanySummary(player, item.operator, normalizedCountryId, item.share));
    const shownCents = summaries.reduce((sum, item) => sum + Math.round((item.sharePercent || 0) * 100), 0);
    const othersCents = Math.max(0, 10_000 - shownCents);
    summaries.push({
        id: `OTHERS_${normalizedCountryId}`,
        name: 'Others',
        kind: 'OTHERS',
        brand: getStreamingOthersBrand(`OTHERS_${normalizedCountryId}`),
        countryId: normalizedCountryId,
        sharePercent: othersCents / 100,
    });
    void hiddenShare;
    return summaries;
};

export const getStreamingOthersShare = (
    player: Pick<Player, 'world'>,
    countryId: string,
): number => getVisibleStreamingCompaniesForMarket(player, countryId)
    .find(item => item.kind === 'OTHERS')?.sharePercent || 0;

export const getVisibleGlobalStreamingCompanies = (
    player: Pick<Player, 'world'>,
): StreamingCompanySummary[] => {
    const state = normalizeStreamingPlatformEcosystem(
        player.world.streamingPlatformEcosystem,
        player.world.streamingPlatformEcosystem?.lastProcessedAbsoluteWeek ?? 0,
    );
    return Object.values(state.operators)
        .filter(operator => {
            if (operator.lifecycle === 'CLOSED' || operator.lifecycle === 'ACQUIRED') return false;
            if (operator.kind === 'CORE_GLOBAL' || operator.kind === 'GLOBAL_REAL') return true;
            if (operator.activeCountryIds.length < 3) return false;
            const topTwoMarkets = operator.activeCountryIds.filter(countryId => {
                const market = state.markets[countryId];
                if (!market) return false;
                const ranked = [...market.shares].sort((left, right) => right.sharePercent - left.sharePercent);
                return ranked.slice(0, 2).some(item => item.operatorId === operator.id);
            }).length;
            return operator.subscriberMillions >= 12 || operator.valuationBillions >= 2 || topTwoMarkets >= 2;
        })
        .map(operator => toCompanySummary(player, operator))
        .sort((left, right) => (
            (right.subscribersMillions || 0) - (left.subscribersMillions || 0)
            || (right.valuationBillions || 0) - (left.valuationBillions || 0)
            || left.id.localeCompare(right.id)
        ));
};

export const getForbesStreamingCompanies = (
    player: Pick<Player, 'world'>,
): StreamingCompanySummary[] => {
    const state = normalizeStreamingPlatformEcosystem(
        player.world.streamingPlatformEcosystem,
        player.world.streamingPlatformEcosystem?.lastProcessedAbsoluteWeek ?? 0,
    );
    const companiesById = new Map<string, StreamingCompanySummary>();

    for (const company of getVisibleGlobalStreamingCompanies(player)) {
        companiesById.set(company.id, company);
    }
    for (const countryId of Object.keys(state.markets).sort()) {
        for (const company of getVisibleStreamingCompaniesForMarket(player, countryId)) {
            if (company.kind === 'OTHERS') continue;
            if (!companiesById.has(company.id)) companiesById.set(company.id, company);
        }
    }

    return [...companiesById.values()].sort((left, right) => (
        (right.subscribersMillions || 0) - (left.subscribersMillions || 0)
        || (right.valuationBillions || 0) - (left.valuationBillions || 0)
        || left.id.localeCompare(right.id)
    ));
};
