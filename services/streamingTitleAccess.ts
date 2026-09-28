import type { StreamingRightsAccessGrant, StreamingTitleAccessMode } from '../types';
import type { StreamingCommercialOfferProjection } from './streamingCommercialOffers';

export type StreamingTitleAccessRoute =
    | { kind: 'SUBSCRIPTION'; planId: string }
    | { kind: 'AD_SUPPORTED' }
    | { kind: 'RENTAL' }
    | { kind: 'PURCHASE' };

export type StreamingViewerProof =
    | { kind: 'SUBSCRIPTION'; planId: string; adFreePassActive?: boolean }
    | { kind: 'AD_SUPPORTED'; adFreePassActive?: boolean }
    | { kind: 'RENTAL'; purchasedAtAbsoluteWeek: number; adFreePassActive?: boolean }
    | { kind: 'PURCHASE'; purchasedAtAbsoluteWeek: number; adFreePassActive?: boolean };

export interface StreamingTitleAccessInput {
    titleId: string;
    countryId: string;
    absoluteWeek: number;
    productionReadyAtAbsoluteWeek: number;
    generalReleaseAtAbsoluteWeek: number;
    marketActive: boolean;
    offer: StreamingCommercialOfferProjection;
    route: StreamingTitleAccessRoute;
    position: {
        contractId: string;
        territory: 'DOMESTIC' | 'MULTI_REGION' | 'GLOBAL';
        countryIds: readonly string[];
        startsAtAbsoluteWeek: number;
        expiresAtAbsoluteWeek: number;
        status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'TRANSFERRED_OUT';
        transferredAtAbsoluteWeek?: number | null;
        accessGrant: StreamingRightsAccessGrant;
    } | null;
    viewerProof?: StreamingViewerProof;
}

export interface StreamingTitleAccessDecision {
    allowed: boolean;
    reasonCode: string;
    contractId: string | null;
    earliestPlayableWeek: number | null;
    latestPermittedWeek: number | null;
    priceSource: string | null;
    adEligible: boolean;
}

/** Viewer permission to make a NEW store transaction, independent of publisher rights. */
export const evaluateStreamingStoreBuyer = (
    storeOffer: StreamingCommercialOfferProjection['storeOffer'],
    buyer: { planId: string | null; membershipActive: boolean } | null,
): { allowed: boolean; reasonCode: string } => {
    if (!storeOffer) return { allowed: false, reasonCode: 'STORE_OFFER_DISABLED' };
    if (storeOffer.eligibility.kind === 'PUBLIC') return { allowed: true, reasonCode: 'ALLOWED' };
    if (!buyer?.membershipActive) return { allowed: false, reasonCode: 'MEMBERSHIP_REQUIRED' };
    return storeOffer.eligibility.planIds.includes(buyer.planId || '')
        ? { allowed: true, reasonCode: 'ALLOWED' }
        : { allowed: false, reasonCode: 'PLAN_NOT_ELIGIBLE' };
};

const decide = (
    input: StreamingTitleAccessInput,
    allowed: boolean,
    reasonCode: string,
    earliestPlayableWeek: number | null = null,
    priceSource: string | null = null,
    adEligible = false,
): StreamingTitleAccessDecision => ({
    allowed,
    reasonCode,
    contractId: input.position?.contractId || null,
    earliestPlayableWeek,
    latestPermittedWeek: input.position?.expiresAtAbsoluteWeek ?? null,
    priceSource,
    adEligible,
});

const modeForRoute = (route: StreamingTitleAccessRoute): StreamingTitleAccessMode => route.kind;

/** Checks whether the platform can promise this title/route at this country and week. */
export const evaluateStreamingTitleRoute = (input: StreamingTitleAccessInput): StreamingTitleAccessDecision => {
    const position = input.position;
    if (!position) return decide(input, false, 'RIGHTS_MISSING');
    if (!input.marketActive) return decide(input, false, 'MARKET_INACTIVE');
    if (position.territory !== 'GLOBAL' && !position.countryIds.includes(input.countryId)) {
        return decide(input, false, 'TERRITORY_DENIED');
    }
    if (input.absoluteWeek < input.productionReadyAtAbsoluteWeek) return decide(input, false, 'PRODUCTION_NOT_READY');
    if (position.status === 'TRANSFERRED_OUT') return decide(input, false, 'RIGHTS_TRANSFERRED');
    if (position.status === 'TERMINATED') return decide(input, false, 'RIGHTS_TERMINATED');
    if (input.absoluteWeek < position.startsAtAbsoluteWeek) return decide(input, false, 'RIGHTS_NOT_STARTED');
    if (input.absoluteWeek >= position.expiresAtAbsoluteWeek || position.status === 'EXPIRED') {
        return decide(input, false, 'RIGHTS_EXPIRED');
    }
    if (!position.accessGrant.modes.includes(modeForRoute(input.route))) {
        return decide(input, false, 'MODE_NOT_GRANTED');
    }
    const route = input.route;
    const offer = input.offer;
    const plan = route.kind === 'SUBSCRIPTION'
        ? offer.subscriptions.find(candidate => candidate.id === route.planId)
        : null;
    const benefits = route.kind === 'SUBSCRIPTION' ? plan?.benefits
        : route.kind === 'AD_SUPPORTED' ? offer.freeAdOffer?.benefits
            : offer.storeOffer?.benefits;
    if (route.kind === 'SUBSCRIPTION' && !plan) return decide(input, false, 'PLAN_NOT_OFFERED');
    if (route.kind === 'AD_SUPPORTED' && !offer.freeAdOffer) return decide(input, false, 'AD_OFFER_DISABLED');
    if ((route.kind === 'RENTAL' || route.kind === 'PURCHASE') && !offer.storeOffer) {
        return decide(input, false, 'STORE_OFFER_DISABLED');
    }
    const earlyWeeks = benefits?.premiumAccess
        ? Math.min(4, benefits.earlyAccessWeeks, position.accessGrant.earlyWindowWeeks) : 0;
    const earliestPlayableWeek = Math.max(
        input.productionReadyAtAbsoluteWeek,
        position.startsAtAbsoluteWeek,
        input.generalReleaseAtAbsoluteWeek - earlyWeeks,
    );
    if (input.absoluteWeek < earliestPlayableWeek) {
        return decide(input, false,
            input.absoluteWeek < input.generalReleaseAtAbsoluteWeek && position.accessGrant.earlyWindowWeeks > 0
                ? 'EARLY_WINDOW_DENIED' : 'NOT_RELEASED', earliestPlayableWeek);
    }
    if (route.kind === 'RENTAL'
        && input.absoluteWeek + (offer.storeOffer?.windowWeeks || 0) > position.expiresAtAbsoluteWeek) {
        return decide(input, false, 'RENTAL_WINDOW_TOO_SHORT', earliestPlayableWeek);
    }
    if (route.kind === 'PURCHASE' && position.accessGrant.purchaseFulfillment !== 'PERPETUAL') {
        return decide(input, false, 'PURCHASE_FULFILLMENT_MISSING', earliestPlayableWeek);
    }
    const priceSource = route.kind === 'SUBSCRIPTION' ? `PLAN:${plan!.id}`
        : route.kind === 'AD_SUPPORTED' ? 'FREE_AD_OFFER'
            : route.kind === 'RENTAL' ? 'STORE_RENT' : 'STORE_BUY';
    const adEligible = route.kind === 'AD_SUPPORTED' || (route.kind === 'SUBSCRIPTION' && Boolean(plan?.ads));
    return decide(input, true, 'ALLOWED', earliestPlayableWeek, priceSource, adEligible);
};

/** A viewer proof must match the offered route; passes only change ad exposure. */
export const evaluateStreamingTitlePlayback = (input: StreamingTitleAccessInput): StreamingTitleAccessDecision => {
    const proof = input.viewerProof;
    const position = input.position;
    if (input.route.kind === 'RENTAL' && proof?.kind === 'RENTAL') {
        const windowWeeks = input.offer.storeOffer?.windowWeeks || 0;
        const sale = evaluateStreamingTitleRoute({ ...input, absoluteWeek: proof.purchasedAtAbsoluteWeek });
        if (!sale.allowed) return decide(input, false, 'RENTAL_ENTITLEMENT_MISSING');
        if (input.absoluteWeek >= (position?.expiresAtAbsoluteWeek ?? 0)) {
            return decide(input, false, 'RIGHTS_EXPIRED');
        }
        if (input.absoluteWeek < proof.purchasedAtAbsoluteWeek) {
            return decide(input, false, 'RENTAL_ENTITLEMENT_MISSING');
        }
        if (input.absoluteWeek >= proof.purchasedAtAbsoluteWeek + windowWeeks) {
            return decide(input, false, 'RENTAL_EXPIRED');
        }
        const remainingWeeks = proof.purchasedAtAbsoluteWeek + windowWeeks - input.absoluteWeek;
        const current = evaluateStreamingTitleRoute({
            ...input,
            offer: {
                ...input.offer,
                storeOffer: input.offer.storeOffer ? { ...input.offer.storeOffer, windowWeeks: remainingWeeks } : null,
            },
        });
        return current.allowed
            ? { ...current, adEligible: current.adEligible && !proof.adFreePassActive }
            : current;
    }
    const validPurchaseAtSale = input.route.kind === 'PURCHASE' && proof?.kind === 'PURCHASE' && position
        ? evaluateStreamingTitleRoute({
            ...input,
            absoluteWeek: proof.purchasedAtAbsoluteWeek,
            position: { ...position, status: 'ACTIVE' },
        }).allowed
        : false;
    const vestedPurchase = input.route.kind === 'PURCHASE'
        && proof?.kind === 'PURCHASE'
        && Boolean(position)
        && position!.status !== 'TERMINATED'
        && position!.accessGrant.modes.includes('PURCHASE')
        && position!.accessGrant.purchaseFulfillment === 'PERPETUAL'
        && validPurchaseAtSale
        && proof.purchasedAtAbsoluteWeek >= position!.startsAtAbsoluteWeek
        && proof.purchasedAtAbsoluteWeek < position!.expiresAtAbsoluteWeek
        && (position!.transferredAtAbsoluteWeek == null
            || proof.purchasedAtAbsoluteWeek < position!.transferredAtAbsoluteWeek)
        && input.absoluteWeek >= proof.purchasedAtAbsoluteWeek
        && (position!.territory === 'GLOBAL' || position!.countryIds.includes(input.countryId))
        && input.marketActive;
    const offered = vestedPurchase
        ? decide(input, true, 'ALLOWED', Math.max(input.productionReadyAtAbsoluteWeek, input.generalReleaseAtAbsoluteWeek), 'VESTED_PURCHASE')
        : evaluateStreamingTitleRoute(input);
    if (!offered.allowed) return offered;
    if (!proof || proof.kind !== input.route.kind) return decide(input, false, 'VIEWER_ENTITLEMENT_MISSING');
    if (input.route.kind === 'SUBSCRIPTION' && (proof.kind !== 'SUBSCRIPTION' || proof.planId !== input.route.planId)) {
        return decide(input, false, 'PLAN_ENTITLEMENT_MISSING');
    }
    if (input.route.kind === 'RENTAL') {
        const windowWeeks = input.offer.storeOffer?.windowWeeks || 0;
        if (proof.kind !== 'RENTAL' || proof.purchasedAtAbsoluteWeek > input.absoluteWeek) {
            return decide(input, false, 'RENTAL_ENTITLEMENT_MISSING');
        }
        if (input.absoluteWeek >= proof.purchasedAtAbsoluteWeek + windowWeeks) {
            return decide(input, false, 'RENTAL_EXPIRED');
        }
    }
    if (input.route.kind === 'PURCHASE' && (proof.kind !== 'PURCHASE' || proof.purchasedAtAbsoluteWeek > input.absoluteWeek)) {
        return decide(input, false, 'PURCHASE_ENTITLEMENT_MISSING');
    }
    return { ...offered, adEligible: offered.adEligible && !proof.adFreePassActive };
};
