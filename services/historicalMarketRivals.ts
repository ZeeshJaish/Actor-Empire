import {getStreamingBuyerBackendCapability, streamingBackendPercentForBuyer, validateNewStreamingBackendTerms} from './streamingBackendPolicy';
import type { Player, StreamingRightsContractRegistry } from '../types';
import { createDeterministicId, hashDeterministicSeed } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    getStreamingLicenseCandidatePool,
    getStreamingLicenseOpportunities,
    getStreamingLicenseQuote,
    getActiveStreamingQuoteVersion,
    type StreamingCatalogTitle,
} from './streamingCatalog';
import { getStreamingContentAvailability } from './streamingContentAvailability';
import { resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { createStreamingLicenseContract, createStreamingRightsContractFromLicense,
    fullCurrencyToMillions, registerStreamingRightsContract } from './streamingRightsCore';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';

const OPENING_RIVAL_CLAIMS = 24;
const GRACE_WEEKS = 12;
const PLAYABLE_TITLE_TARGET = 25;
const RIVAL_CYCLE_WEEKS = 3;

const rankedTitles = (player: Player, titles: StreamingCatalogTitle[], salt: string) => titles.slice()
    .sort((left, right) => hashDeterministicSeed(`${player.id}:${salt}:${right.id}`)
        - hashDeterministicSeed(`${player.id}:${salt}:${left.id}`) || left.id.localeCompare(right.id));

const rankedBidTitles = (player: Player, titles: StreamingCatalogTitle[], cycle: number) => {
    const marqueeCycle = cycle % 3 === 0;
    const score = (title: StreamingCatalogTitle) => (
        (Number(title.catalogueTier === 'MARQUEE') === Number(marqueeCycle) ? 1_000_000 : 0)
        + Math.max(0, title.quality || (title.rating || 0) * 10) * 1_000
        + Math.max(0, title.rating || 0) * 100
        + hashDeterministicSeed(`${player.id}:bid:${cycle}:${title.id}`) % 500
    );
    return titles.slice().sort((left, right) => score(right) - score(left) || left.id.localeCompare(right.id));
};

const eligiblePlatforms = (player: Player) => Object.values(player.world.platforms || {})
    .filter(platform => Number.isFinite(platform.cashReserve) && platform.cashReserve >= 0)
    .sort((left, right) => left.id.localeCompare(right.id));

const registerRivalClaim = (
    player: Player,
    registry: StreamingRightsContractRegistry,
    title: StreamingCatalogTitle,
    platformId: string,
    absoluteWeek: number,
    guarantee: number,
    phase: 'opening' | 'bid',
) => {
    const platform = player.world.platforms[platformId];
    if (!platform) return null;
    const world = { ...player.world, streamingRightsContracts: registry };
    const compatible = resolveStreamingRightsCompatibility({
        world, sourceProjectId: title.id, buyerPlatformId: platformId,
        sellerPartyId: title.studioId, territory: 'GLOBAL', countryIds: [],
        startsAtAbsoluteWeek: absoluteWeek, expiresAtAbsoluteWeek: absoluteWeek + 104,
        windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
    });
    if (!compatible.available) return null;
    const id = createDeterministicId('historical_rival_right', player.id, phase, absoluteWeek, title.id, platformId);
    const license = createStreamingLicenseContract({
        backendBasis: phase === 'opening' ? 'ADJUSTED_GROSS_RECEIPTS' : 'ADS_RENTAL_RECEIPTS',
        id, sourceProject: { id: title.id, title: title.title, mediaType: title.projectType, genre: title.genre },
        buyerPlatformId: platformId, platformContentPlanId: null, cataloguePackageId: null,
        contentSource: 'LICENSED_RELEASED_TITLE', licensorName: title.studioName,
        territory: 'GLOBAL', countryIds: [], durationWeeks: 104, exclusivity: 'EXCLUSIVE',
        minimumGuarantee: guarantee, platformRevenueShare: phase === 'opening' ? 70 : 100-streamingBackendPercentForBuyer(player,platformId,absoluteWeek,10),
        signedAtAbsoluteWeek: absoluteWeek, startsAtAbsoluteWeek: absoluteWeek,
        origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
        windowType: 'FIRST_WINDOW', accessGrant: { schemaVersion: 1,
            modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
            purchaseFulfillment: 'NONE', source: 'EXPLICIT' },
    });
    const result = registerStreamingRightsContract(registry, createStreamingRightsContractFromLicense({
        license,
        seller: { type: 'NPC_STUDIO', id: title.studioId, name: title.studioName, platformId: null },
        buyer: { type: 'AI_PLATFORM', id: platformId, name: platform.name, platformId },
        guaranteeDisposition: phase === 'opening' ? 'INTERNAL' : 'PAID',
        settledAtAbsoluteWeek: phase === 'opening' ? null : absoluteWeek,
        idempotencyKey: `historical-rival:${player.id}:${phase}:${absoluteWeek}:${title.id}`,
    }));
    return result.changed && result.contract ? result : null;
};

/** Starts once, without gifting licences or retroactively charging rival treasuries. */
export const initializeHistoricalMarketPacing = (player: Player): Player => {
    const library = player.world.historicalCatalogue;
    const lifecycle = player.ownedStreamingPlatform?.lifecycle;
    if (!library?.marqueeVersion || library.marketPacing || !['FOUNDING', 'ACTIVE'].includes(lifecycle)) return player;
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const incorporation = Number(player.ownedStreamingPlatform.foundingProfile?.incorporatedAtAbsoluteWeek);
    const anchorAbsoluteWeek = Math.min(now, Math.max(library.marqueeActivatedAtAbsoluteWeek || now,
        Number.isFinite(incorporation) ? incorporation : now));
    const protectedTitleIds = getStreamingLicenseOpportunities(player).slice(0, 12).map(title => title.id);
    const protectedIds = new Set(protectedTitleIds);
    let registry = player.world.streamingRightsContracts || {};
    const rivalOpeningContractIds: string[] = [];
    const rivals = eligiblePlatforms(player);
    const candidates = rankedTitles(player, getStreamingLicenseCandidatePool(player)
        .filter(title => !protectedIds.has(title.id) && title.catalogueTier !== 'MARQUEE'), 'opening');
    for (const title of candidates) {
        if (rivalOpeningContractIds.length >= OPENING_RIVAL_CLAIMS || !rivals.length) break;
        const platformId = rivals[rivalOpeningContractIds.length % rivals.length].id;
        const claim = registerRivalClaim(player, registry, title, platformId, now, 0, 'opening');
        if (!claim) continue;
        registry = claim.registry;
        rivalOpeningContractIds.push(claim.contract!.id);
    }
    return {
        ...player,
        world: {
            ...player.world,
            streamingRightsContracts: registry,
            historicalCatalogue: { ...library, marketPacing: {
                anchorAbsoluteWeek, protectedTitleIds, rivalOpeningContractIds, lastRivalCycle: null,
            } },
        },
    };
};

/** A title counts only when viewers can actually play it in an active entered country. */
export const countActuallyPlayableMarketTitles = (player: Player): number => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const countryIds = Array.from(new Set((platform.marketOperations || [])
        .filter(operation => operation.scope === 'COUNTRY' && operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId!)));
    if (platform.lifecycle !== 'ACTIVE' || !countryIds.length) return 0;
    let count = 0;
    const programmeIds = new Set([
        ...platform.catalogProjectIds,
        ...platform.originalCommissions.map(commission => commission.canonicalProjectId).filter((id): id is string => Boolean(id)),
    ]);
    for (const titleId of programmeIds) {
        const availability = getStreamingContentAvailability(player, titleId, countryIds);
        if (availability.status !== 'LIVE') continue;
        if (countryIds.some(countryId => Object.values(availability.routesByCountry[countryId] || {})
            .some(route => route.allowed))) count += 1;
    }
    return count;
};

export const isHistoricalMarketGraceActive = (player: Player): boolean => {
    const pacing = player.world.historicalCatalogue?.marketPacing;
    if (!pacing) return false;
    return getAbsoluteWeek(player.age, player.currentWeek) - pacing.anchorAbsoluteWeek < GRACE_WEEKS
        && countActuallyPlayableMarketTitles(player) < PLAYABLE_TITLE_TARGET;
};

/** One paid, rights-compatible AI bid per three-week cycle after first-look ends. */
export const processHistoricalMarketRivalWeek = (player: Player): Player => {
    player = initializeHistoricalMarketPacing(player);
    const pacing = player.world.historicalCatalogue?.marketPacing;
    if (!pacing || isHistoricalMarketGraceActive(player)) return player;
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const cycle = Math.floor(now / RIVAL_CYCLE_WEEKS);
    if (pacing.lastRivalCycle !== null && pacing.lastRivalCycle >= cycle) return player;
    let registry = player.world.streamingRightsContracts || {};
    let winner: { platformId: string; guarantee: number } | null = null;
    const rivals = eligiblePlatforms(player).sort((left, right) => (
        hashDeterministicSeed(`${player.id}:rival:${cycle}:${right.id}`)
        - hashDeterministicSeed(`${player.id}:rival:${cycle}:${left.id}`)
        || left.id.localeCompare(right.id)
    ));
    for (const title of rankedBidTitles(player, getStreamingLicenseCandidatePool(player), cycle)) {
        for (const rival of rivals) {
            const guarantee = getStreamingLicenseQuote(title, 'GLOBAL', 104, 'EXCLUSIVE',
                getActiveStreamingQuoteVersion(player.ownedStreamingPlatform.marketQuotePolicy, now), 'FIRST_WINDOW', player.age).suggestedGuarantee;
            if (rival.cashReserve < fullCurrencyToMillions(guarantee)) continue;
            const claim = registerRivalClaim(player, registry, title, rival.id, now, guarantee, 'bid');
            if (!claim) continue;
            registry = claim.registry;
            winner = { platformId: rival.id, guarantee };
            break;
        }
        if (winner) break;
    }
    const updatedPlatform = winner ? player.world.platforms[winner.platformId] : null;
    return {
        ...player,
        world: {
            ...player.world,
            streamingRightsContracts: registry,
            platforms: updatedPlatform ? { ...player.world.platforms, [winner!.platformId]: {
                ...updatedPlatform,
                cashReserve: Math.max(0, updatedPlatform.cashReserve - fullCurrencyToMillions(winner!.guarantee)),
            } } : player.world.platforms,
            historicalCatalogue: { ...player.world.historicalCatalogue!, marketPacing: {
                ...pacing, lastRivalCycle: cycle,
            } },
        },
    };
};
