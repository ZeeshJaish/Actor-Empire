import type {
    Player,
    StreamingRightsAccessGrant,
    StreamingRightsContract,
    StreamingRightsContractRegistry,
    StreamingTitleAccessMode,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeStreamingPricingConfiguration } from './streamingPricingEconomy';
import { getWorldStreamingOffers } from './worldEconomy/worldStreamingOffers';

const MODES: StreamingTitleAccessMode[] = ['SUBSCRIPTION', 'AD_SUPPORTED', 'RENTAL', 'PURCHASE'];

export const normalizeStreamingRightsAccessGrant = (value: unknown): StreamingRightsAccessGrant | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    if (source.schemaVersion !== 1) return null;
    const modes = MODES.filter(mode => Array.isArray(source.modes) && source.modes.includes(mode));
    const rawEarly = Number(source.earlyWindowWeeks);
    const earlyWindowWeeks = Number.isFinite(rawEarly) ? Math.max(0, Math.min(4, Math.floor(rawEarly))) : 0;
    return {
        schemaVersion: 1,
        modes,
        earlyWindowWeeks,
        purchaseFulfillment: source.purchaseFulfillment === 'PERPETUAL' && modes.includes('PURCHASE')
            ? 'PERPETUAL' : 'NONE',
        source: source.source === 'EXPLICIT' ? 'EXPLICIT' : 'LEGACY_SNAPSHOT',
    };
};

export const intersectStreamingRightsAccessGrants = (
    source: StreamingRightsAccessGrant,
    requested: StreamingRightsAccessGrant,
): StreamingRightsAccessGrant => {
    const modes = source.modes.filter(mode => requested.modes.includes(mode));
    return {
        schemaVersion: 1,
        modes,
        earlyWindowWeeks: Math.min(source.earlyWindowWeeks, requested.earlyWindowWeeks),
        purchaseFulfillment: modes.includes('PURCHASE')
            && source.purchaseFulfillment === 'PERPETUAL'
            && requested.purchaseFulfillment === 'PERPETUAL' ? 'PERPETUAL' : 'NONE',
        source: 'EXPLICIT',
    };
};

const modesFromStreams = (streams: string[]): StreamingTitleAccessMode[] => MODES.filter(mode => (
    mode === 'SUBSCRIPTION' ? streams.includes('subs')
        : mode === 'AD_SUPPORTED' ? streams.includes('ads')
            : mode === 'RENTAL' && streams.includes('rentals')
));

export const createStreamingRightsAccessGrantForOffer = (
    streams: string[],
    permanentWindow: boolean,
    earlyWindowWeeks = 0,
): StreamingRightsAccessGrant => {
    const modes = modesFromStreams(streams);
    if (permanentWindow && streams.includes('rentals')) modes.push('PURCHASE');
    return {
        schemaVersion: 1,
        modes,
        earlyWindowWeeks: Math.max(0, Math.min(4, Math.floor(Number.isFinite(earlyWindowWeeks) ? earlyWindowWeeks : 0))),
        purchaseFulfillment: modes.includes('PURCHASE') ? 'PERPETUAL' : 'NONE',
        source: 'EXPLICIT',
    };
};

const legacyGrantFor = (
    contract: StreamingRightsContract,
    playerStreams: string[],
    aiStreamsById: Map<string, string[]>,
): StreamingRightsAccessGrant => {
    const buyerId = contract.buyer.platformId || contract.buyerPlatformId || contract.buyer.id;
    const streams = contract.buyer.type === 'PLAYER_PLATFORM'
        ? playerStreams
        : aiStreamsById.get(buyerId) || ['subs'];
    const modes = contract.legacySource === 'PRODUCTION_RELEASE'
        ? ['SUBSCRIPTION'] as StreamingTitleAccessMode[]
        : modesFromStreams(streams);
    if (streams.includes('rentals') && (contract.permanentPurchase || contract.windowType === 'PERMANENT')) {
        modes.push('PURCHASE');
    }
    return {
        schemaVersion: 1,
        modes,
        earlyWindowWeeks: 0,
        purchaseFulfillment: contract.permanentPurchase || contract.windowType === 'PERMANENT'
            ? modes.includes('PURCHASE') ? 'PERPETUAL' : 'NONE'
            : 'NONE',
        source: 'LEGACY_SNAPSHOT',
    };
};

/** Save migration: freeze legacy access once, without changing finance or title windows. */
export const snapshotLegacyStreamingRightsAccessGrants = (
    player: Player,
    registry: StreamingRightsContractRegistry,
): StreamingRightsContractRegistry => {
    const missing = Object.values(registry).filter(contract => !normalizeStreamingRightsAccessGrant(contract.accessGrant));
    if (!missing.length) return registry;
    const playerStreams = normalizeStreamingPricingConfiguration(
        player.ownedStreamingPlatform.serviceConfiguration.pricing,
    ).streams;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const aiStreamsById = new Map<string, string[]>();
    for (const offer of getWorldStreamingOffers(player, absoluteWeek).offers) {
        if (offer.isPlayer) continue;
        aiStreamsById.set(offer.platformId, offer.commercialConfiguration.streams);
    }
    const next = { ...registry };
    for (const contract of missing) {
        next[contract.id] = {
            ...contract,
            accessGrant: legacyGrantFor(contract, playerStreams, aiStreamsById),
        };
    }
    return next;
};
