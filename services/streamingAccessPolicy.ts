import type { OwnedStreamingPlatformLifecycle } from '../types';

export const STREAMING_CORE_ENTITLEMENT = 'streaming.core' as const;

export type StreamingCommercialPolicy =
    | 'DEVELOPMENT_FREE'
    | 'RELEASE_FREE'
    | 'REQUIRES_CORE_ENTITLEMENT';

export const DEFAULT_STREAMING_COMMERCIAL_POLICY: StreamingCommercialPolicy = 'DEVELOPMENT_FREE';

export type StreamingEligibilityStatus = 'LOCKED' | 'ELIGIBLE' | 'UNKNOWN';
export type StreamingEntitlementStatus = 'GRANTED' | 'MISSING' | 'PENDING' | 'ERROR' | 'OFFLINE';
export type StreamingAccessViewState =
    | 'CAREER_LOCKED'
    | 'AVAILABLE'
    | 'ACCESS_REQUIRED'
    | 'CHECKING_ACCESS'
    | 'ACCESS_ERROR'
    | 'FOUNDING'
    | 'ACTIVE'
    | 'SUSPENDED';

export interface StreamingAccessInput {
    commercialPolicy: StreamingCommercialPolicy;
    eligibilityStatus: StreamingEligibilityStatus;
    entitlementStatus: StreamingEntitlementStatus;
    platformLifecycle: OwnedStreamingPlatformLifecycle;
}

export interface StreamingAccessResolution {
    viewState: StreamingAccessViewState;
    canEnter: boolean;
    canBeginFounding: boolean;
    shouldOfferPurchase: boolean;
    reasonCode:
        | 'CAREER_REQUIREMENTS_NOT_MET'
        | 'CAREER_REQUIREMENTS_UNKNOWN'
        | 'FREE_ACCESS'
        | 'ENTITLEMENT_GRANTED'
        | 'ENTITLEMENT_REQUIRED'
        | 'ENTITLEMENT_PENDING'
        | 'ENTITLEMENT_ERROR'
        | 'ENTITLEMENT_OFFLINE'
        | 'FOUNDING_IN_PROGRESS'
        | 'PLATFORM_ACTIVE'
        | 'PLATFORM_SUSPENDED';
}

const FREE_POLICIES: StreamingCommercialPolicy[] = ['DEVELOPMENT_FREE', 'RELEASE_FREE'];

/**
 * Resolves navigation and messaging only. It never changes platform capacity,
 * technology levels, simulation results, or any other gameplay advantage.
 */
export const resolveStreamingAccess = (input: StreamingAccessInput): StreamingAccessResolution => {
    if (input.eligibilityStatus === 'UNKNOWN') {
        return {
            viewState: 'CHECKING_ACCESS',
            canEnter: false,
            canBeginFounding: false,
            shouldOfferPurchase: false,
            reasonCode: 'CAREER_REQUIREMENTS_UNKNOWN',
        };
    }
    if (input.eligibilityStatus === 'LOCKED' || input.platformLifecycle === 'LOCKED') {
        return {
            viewState: 'CAREER_LOCKED',
            canEnter: false,
            canBeginFounding: false,
            shouldOfferPurchase: false,
            reasonCode: 'CAREER_REQUIREMENTS_NOT_MET',
        };
    }

    const freeAccess = FREE_POLICIES.includes(input.commercialPolicy);
    if (!freeAccess && input.entitlementStatus !== 'GRANTED') {
        const stateByEntitlement: Record<Exclude<StreamingEntitlementStatus, 'GRANTED'>, StreamingAccessResolution> = {
            MISSING: {
                viewState: 'ACCESS_REQUIRED',
                canEnter: false,
                canBeginFounding: false,
                shouldOfferPurchase: true,
                reasonCode: 'ENTITLEMENT_REQUIRED',
            },
            PENDING: {
                viewState: 'CHECKING_ACCESS',
                canEnter: false,
                canBeginFounding: false,
                shouldOfferPurchase: false,
                reasonCode: 'ENTITLEMENT_PENDING',
            },
            ERROR: {
                viewState: 'ACCESS_ERROR',
                canEnter: false,
                canBeginFounding: false,
                shouldOfferPurchase: false,
                reasonCode: 'ENTITLEMENT_ERROR',
            },
            OFFLINE: {
                viewState: 'ACCESS_ERROR',
                canEnter: false,
                canBeginFounding: false,
                shouldOfferPurchase: false,
                reasonCode: 'ENTITLEMENT_OFFLINE',
            },
        };
        return stateByEntitlement[input.entitlementStatus];
    }

    if (input.platformLifecycle === 'FOUNDING') {
        return {
            viewState: 'FOUNDING',
            canEnter: true,
            canBeginFounding: false,
            shouldOfferPurchase: false,
            reasonCode: 'FOUNDING_IN_PROGRESS',
        };
    }
    if (input.platformLifecycle === 'ACTIVE') {
        return {
            viewState: 'ACTIVE',
            canEnter: true,
            canBeginFounding: false,
            shouldOfferPurchase: false,
            reasonCode: 'PLATFORM_ACTIVE',
        };
    }
    if (input.platformLifecycle === 'SUSPENDED') {
        return {
            viewState: 'SUSPENDED',
            canEnter: true,
            canBeginFounding: false,
            shouldOfferPurchase: false,
            reasonCode: 'PLATFORM_SUSPENDED',
        };
    }

    return {
        viewState: 'AVAILABLE',
        canEnter: true,
        canBeginFounding: true,
        shouldOfferPurchase: false,
        reasonCode: freeAccess ? 'FREE_ACCESS' : 'ENTITLEMENT_GRANTED',
    };
};
