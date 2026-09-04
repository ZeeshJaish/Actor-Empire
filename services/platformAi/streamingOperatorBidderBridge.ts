import type { StreamingEcosystemOperator } from '../../types';

export type StreamingOperatorBidderIneligibility =
    | 'OPERATOR_NOT_ACTIVE'
    | 'MISSING_STABLE_IDENTITY'
    | 'OUTSIDE_ACTIVE_MARKET'
    | 'INSUFFICIENT_RUNWAY'
    | 'UNSUPPORTED_SETTLEMENT_IDENTITY';

export interface StreamingOperatorBidderEligibilityInput {
    countryIds: string[];
    commitmentMillions: number;
    externalSettlementIdentitySupported: boolean;
}

export interface StreamingOperatorBidderEligibility {
    eligible: boolean;
    reason: StreamingOperatorBidderIneligibility | null;
    settlementIdentity: string | null;
    affordabilityCeilingMillions: number;
}

export const evaluateStreamingOperatorCanonicalBidderEligibility = (
    operator: StreamingEcosystemOperator,
    input: StreamingOperatorBidderEligibilityInput,
): StreamingOperatorBidderEligibility => {
    const weeklyBurn = Math.max(0.5, 0.8 + operator.activeCountryIds.length * 0.42 + operator.cataloguePower / 38 + operator.technology / 90);
    const affordabilityCeilingMillions = Math.max(0, Math.round((operator.cashMillions - weeklyBurn * 12) * 100) / 100);
    const failure = (reason: StreamingOperatorBidderIneligibility): StreamingOperatorBidderEligibility => ({
        eligible: false, reason, settlementIdentity: null, affordabilityCeilingMillions,
    });
    if (operator.lifecycle !== 'ACTIVE') return failure('OPERATOR_NOT_ACTIVE');
    if (!operator.id.trim() || !operator.name.trim() || !operator.brand) return failure('MISSING_STABLE_IDENTITY');
    if (!input.countryIds.length || input.countryIds.some(countryId => !operator.activeCountryIds.includes(countryId))) {
        return failure('OUTSIDE_ACTIVE_MARKET');
    }
    if (!Number.isFinite(input.commitmentMillions) || input.commitmentMillions <= 0
        || input.commitmentMillions > affordabilityCeilingMillions) return failure('INSUFFICIENT_RUNWAY');
    if (!operator.corePlatformId && !input.externalSettlementIdentitySupported) {
        return failure('UNSUPPORTED_SETTLEMENT_IDENTITY');
    }
    return {
        eligible: true,
        reason: null,
        settlementIdentity: operator.corePlatformId || operator.id,
        affordabilityCeilingMillions,
    };
};
