import type {OwnedStreamingPricingConfiguration, Player, StreamingRightsAccessGrant, StreamingBackendBasis} from '../types';
import {normalizeOwnedStreamingPlatformState} from './ownedStreamingPlatform';
import {normalizeStreamingPricingConfiguration} from './streamingPricingEconomy';
import {getOwnedPlatformPackageCountryIds} from './streamingContentAvailability';
import {getWorldStreamingBuyerCommercialOffer} from './worldEconomy/worldStreamingOffers';

export const NEW_STREAMING_BACKEND_BASIS: StreamingBackendBasis = 'ADS_RENTAL_RECEIPTS';
export const MAX_NEW_STREAMING_BACKEND_PERCENT = 20;
/** Matches the existing seller quote's 62% cash negotiation floor; contingent income cannot replace it. */
export const minimumStreamingLicenseFee = (reference: number): number =>
    Number.isFinite(reference) && reference > 0 ? Math.max(1, Math.ceil(reference * .62)) : 1;
export interface StreamingBackendCapability {advertising: boolean; rental: boolean; eligibleRevenueFraction: number}
export const streamingBackendCapability = (pricing: OwnedStreamingPricingConfiguration, grant?: StreamingRightsAccessGrant | null,
    available = true): StreamingBackendCapability => {
    const modes = grant?.modes;
    const advertising = available && pricing.streams.includes('ads') && pricing.ads.minutesPerHour > 0
        && (!modes || modes.includes('AD_SUPPORTED') || modes.includes('SUBSCRIPTION') && pricing.plans.some(plan => plan.ads));
    const rental = available && pricing.streams.includes('rentals') && pricing.rentals.rent > 0 && (!modes || modes.includes('RENTAL'));
    // A bid estimate only: subscription-heavy services cannot promise their entire membership pool.
    // Actual payment always uses exact receipts, never this fraction.
    const eligibleRevenueFraction = Math.min(1, (advertising ? .25 : 0) + (rental ? .35 : 0))
        / (pricing.streams.includes('subs') ? 1 : .6);
    return {advertising, rental, eligibleRevenueFraction: Math.min(1, eligibleRevenueFraction)};
};
export const getStreamingBuyerBackendCapability = (player: Pick<Player,'world'> & Partial<Pick<Player,'ownedStreamingPlatform'|'id'>>,
    platformId: string | null, week: number, countryIds: string[] = [], grant?: StreamingRightsAccessGrant | null): StreamingBackendCapability => {
    if (platformId && platformId !== 'PLAYER') {
        const offer = getWorldStreamingBuyerCommercialOffer(player as Player, platformId, week);
        if (!offer) return {advertising:false,rental:false,eligibleRevenueFraction:0};
        return streamingBackendCapability(offer.commercialConfiguration, grant,
            !countryIds.length || countryIds.some(id=>offer.activeCountryIds.includes(id)));
    }
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const active = getOwnedPlatformPackageCountryIds(platform);
    return streamingBackendCapability(normalizeStreamingPricingConfiguration(platform.serviceConfiguration.pricing), grant,
        ['ACTIVE','FOUNDING'].includes(platform.lifecycle) && active.length > 0
        && (!countryIds.length || countryIds.some(id=>active.includes(id))));
};
export const validateNewStreamingBackendTerms = (input: {minimumGuarantee:number;licensorRevenueShare:number;referenceFee?:number;
    capability:StreamingBackendCapability;permanentPurchase?:boolean}): string | null => {
    if (!Number.isSafeInteger(input.minimumGuarantee) || input.minimumGuarantee < minimumStreamingLicenseFee(input.referenceFee || 0))
        return 'A meaningful fixed upfront license fee is required independently of backend.';
    if (!Number.isFinite(input.licensorRevenueShare) || input.licensorRevenueShare < 0 || input.licensorRevenueShare > MAX_NEW_STREAMING_BACKEND_PERCENT)
        return 'Seller backend must be between 0% and 20%.';
    if (input.licensorRevenueShare > 0 && (input.permanentPurchase || !input.capability.advertising && !input.capability.rental))
        return 'Backend requires enabled advertising or rental and matching title rights.';
    return null;
};

/** Generated offers fail closed when there is no eligible running business. */
export const streamingBackendPercentForBuyer = (player: Pick<Player,'world'> & Partial<Pick<Player,'ownedStreamingPlatform'|'id'>>,
    platformId:string|null, week:number, proposed:number, countries:string[]=[], grant?:StreamingRightsAccessGrant|null):number => {
    const capability=getStreamingBuyerBackendCapability(player,platformId,week,countries,grant);
    return capability.advertising || capability.rental ? Math.max(0,Math.min(MAX_NEW_STREAMING_BACKEND_PERCENT,Math.round(proposed))) : 0;
};
