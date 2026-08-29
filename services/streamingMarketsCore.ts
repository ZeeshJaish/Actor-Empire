import type {
    OwnedStreamingCountryMarketProfile,
    OwnedStreamingMarketClearanceState,
    OwnedStreamingMarketCostBreakdown,
    OwnedStreamingMarketOperation,
    OwnedStreamingMarketPolicySnapshot,
    StreamingMarketClearanceOutcome,
    StreamingMarketClearanceStage,
    StreamingMarketEntryKind,
    StreamingMarketOperationSource,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getStreamingCountryMarketProfile } from './streamingDayOneMarkets';

const CLEARANCE_STAGES: StreamingMarketClearanceStage[] = [
    'APPLICATION_FILED',
    'RIGHTS_VERIFICATION',
    'REGULATORY_REVIEW',
    'CONSUMER_DATA_COMPLIANCE',
    'FINAL_APPROVAL',
];

export const createZeroStreamingMarketCosts = (): OwnedStreamingMarketCostBreakdown => ({
    rights: 0,
    compliance: 0,
    localization: 0,
    infrastructure: 0,
    other: 0,
    total: 0,
});

export const getStreamingMarketPolicySnapshot = (
    profile: OwnedStreamingCountryMarketProfile,
    absoluteWeek: number,
    revision = 0,
): OwnedStreamingMarketPolicySnapshot => {
    const rng = createDeterministicRng(`market-election:${profile.countryId}:${absoluteWeek}:${revision}`);
    return {
        effectiveTaxPercent: profile.taxBaselinePercent,
        streamingLevyPercent: profile.streamingLevyBaselinePercent,
        localContentObligationPercent: profile.localContentObligationPercent,
        privacyComplianceLevel: profile.privacyComplianceLevel,
        policyClimate: profile.taxBaselinePercent >= 24 || profile.localContentObligationPercent >= 20
            ? 'PROTECTIVE'
            : profile.taxBaselinePercent <= 12
                ? 'OPEN'
                : 'BALANCED',
        revision,
        nextElectionAtAbsoluteWeek: absoluteWeek + 52 + Math.floor(rng() * 53),
        capturedAtAbsoluteWeek: absoluteWeek,
    };
};

export const getStreamingMarketWeeklyOperatingCost = (profile: OwnedStreamingCountryMarketProfile): number => (
    Math.max(55_000, Math.round(profile.audienceSize * (profile.privacyComplianceLevel === 'STRICT' ? 0.0048 : 0.0034)))
);

export const getStreamingMarketClearanceDuration = (
    profile: OwnedStreamingCountryMarketProfile,
    operationId: string,
): number => {
    const rng = createDeterministicRng(`market-clearance-duration:${operationId}`);
    const range = Math.max(0, profile.approvalPeriodWeeks.maximum - profile.approvalPeriodWeeks.minimum);
    return profile.approvalPeriodWeeks.minimum + Math.floor(rng() * (range + 1));
};

export const createStreamingMarketClearance = (
    absoluteWeek: number,
    reviewAttempt = 1,
): OwnedStreamingMarketClearanceState => ({
    stage: 'APPLICATION_FILED',
    progressPercent: 8,
    outcome: 'PENDING',
    condition: null,
    additionalPayment: 0,
    submittedAtAbsoluteWeek: absoluteWeek,
    stageStartedAtAbsoluteWeek: absoluteWeek,
    nextReviewAtAbsoluteWeek: absoluteWeek + 1,
    resumeAllowedAtAbsoluteWeek: null,
    reviewAttempt,
    history: [{
        absoluteWeek,
        stage: 'APPLICATION_FILED',
        outcome: 'PENDING',
        summary: 'Application filed and assigned to a government review desk.',
    }],
});

export const getStreamingMarketClearanceOutcome = (
    operation: OwnedStreamingMarketOperation,
    attempt: number,
): StreamingMarketClearanceOutcome => {
    const profile = operation.countryProfile;
    if (!profile) return 'APPROVED';
    const roll = createDeterministicRng(`market-clearance-outcome:${operation.id}:${attempt}`)();
    const strictPenalty = profile.privacyComplianceLevel === 'STRICT' ? 0.08 : profile.privacyComplianceLevel === 'ENHANCED' ? 0.03 : 0;
    const tightPenalty = profile.rightsAvailability === 'TIGHT' ? 0.05 : profile.rightsAvailability === 'LIMITED' ? 0.02 : 0;
    const risk = Math.max(0, strictPenalty + tightPenalty - Math.max(0, attempt - 1) * 0.12);
    if (roll < Math.max(0.02, 0.05 + risk * 0.45)) return 'TEMPORARILY_REJECTED';
    if (roll < Math.max(0.08, 0.12 + risk)) return 'ADDITIONAL_REQUIREMENT';
    if (roll < Math.max(0.16, 0.22 + risk)) return 'DELAYED';
    if (roll < Math.max(0.37, 0.45 + risk)) return 'APPROVED_WITH_CONDITIONS';
    return 'APPROVED';
};

export const createStreamingCountryMarketOperation = (input: {
    seed: string;
    countryId: string;
    entryKind: StreamingMarketEntryKind;
    absoluteWeek: number;
    source: StreamingMarketOperationSource;
}): OwnedStreamingMarketOperation | null => {
    const profile = getStreamingCountryMarketProfile(input.countryId);
    if (!profile) return null;
    const id = createDeterministicId('streaming_market', input.seed, profile.countryId.toLowerCase());
    return {
        id,
        idempotencyKey: `market:country:${profile.countryId.toLowerCase()}`,
        scope: 'COUNTRY',
        scopeId: profile.countryId,
        countryId: profile.countryId,
        regionId: profile.regionId,
        entryKind: input.entryKind,
        status: 'PLANNED',
        plannedCosts: profile.entryCosts,
        committedCosts: createZeroStreamingMarketCosts(),
        weeklyOperatingCost: getStreamingMarketWeeklyOperatingCost(profile),
        countryProfile: profile,
        policySnapshot: null,
        policyHistory: [],
        clearance: null,
        plannedAtAbsoluteWeek: input.absoluteWeek,
        committedAtAbsoluteWeek: null,
        approvalReadyAtAbsoluteWeek: null,
        activatedAtAbsoluteWeek: null,
        suspendedAtAbsoluteWeek: null,
        exitedAtAbsoluteWeek: null,
        source: input.source,
    };
};

export const startStreamingMarketOperation = (
    operation: OwnedStreamingMarketOperation,
    absoluteWeek: number,
): OwnedStreamingMarketOperation => {
    if (!operation.countryProfile || !['PLANNED', 'AWAITING_FUNDING'].includes(operation.status)) return operation;
    return {
        ...operation,
        status: 'CLEARANCE',
        committedCosts: operation.plannedCosts,
        committedAtAbsoluteWeek: absoluteWeek,
        approvalReadyAtAbsoluteWeek: absoluteWeek + getStreamingMarketClearanceDuration(operation.countryProfile, operation.id),
        weeklyOperatingCost: getStreamingMarketWeeklyOperatingCost(operation.countryProfile),
        policySnapshot: getStreamingMarketPolicySnapshot(operation.countryProfile, absoluteWeek),
        policyHistory: operation.policyHistory || [],
        clearance: createStreamingMarketClearance(absoluteWeek),
        lastProcessedAbsoluteWeek: absoluteWeek,
    };
};

const infrastructureWeeksFor = (operation: OwnedStreamingMarketOperation): number => (
    Math.max(1, Math.ceil((operation.countryProfile?.recommendedNetworkFootprint.edgeSites || 1) / 3))
);

export type StreamingMarketProgressKind =
    | 'UNCHANGED'
    | 'CLEARANCE_PROGRESS'
    | 'DELAYED'
    | 'ADDITIONAL_REQUIREMENT'
    | 'TEMPORARILY_REJECTED'
    | 'APPROVED'
    | 'INFRASTRUCTURE_READY';

export interface StreamingMarketProgressResult {
    operation: OwnedStreamingMarketOperation;
    kind: StreamingMarketProgressKind;
    additionalPayment: number;
}

export const advanceStreamingMarketOperation = (
    operation: OwnedStreamingMarketOperation,
    absoluteWeek: number,
): StreamingMarketProgressResult => {
    if (operation.lastProcessedAbsoluteWeek === absoluteWeek) {
        return { operation, kind: 'UNCHANGED', additionalPayment: 0 };
    }
    if (operation.status === 'INFRASTRUCTURE_PREPARATION') {
        if ((operation.approvalReadyAtAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) > absoluteWeek) {
            return { operation, kind: 'UNCHANGED', additionalPayment: 0 };
        }
        return {
            operation: { ...operation, status: 'READY', lastProcessedAbsoluteWeek: absoluteWeek },
            kind: 'INFRASTRUCTURE_READY',
            additionalPayment: 0,
        };
    }
    const clearance = operation.clearance;
    if (!clearance || operation.status !== 'CLEARANCE' || clearance.nextReviewAtAbsoluteWeek > absoluteWeek) {
        return { operation, kind: 'UNCHANGED', additionalPayment: 0 };
    }
    const readyForDecision = operation.approvalReadyAtAbsoluteWeek !== null && operation.approvalReadyAtAbsoluteWeek <= absoluteWeek;
    if (!readyForDecision) {
        const elapsed = Math.max(1, absoluteWeek - clearance.submittedAtAbsoluteWeek);
        const duration = Math.max(4, (operation.approvalReadyAtAbsoluteWeek || absoluteWeek + 1) - clearance.submittedAtAbsoluteWeek);
        const stage = CLEARANCE_STAGES[Math.max(1, Math.min(CLEARANCE_STAGES.length - 2, Math.floor(elapsed / duration * (CLEARANCE_STAGES.length - 1))))];
        const updatedClearance: OwnedStreamingMarketClearanceState = {
            ...clearance,
            stage,
            progressPercent: Math.min(88, Math.round(elapsed / duration * 88)),
            outcome: 'PENDING',
            stageStartedAtAbsoluteWeek: stage === clearance.stage ? clearance.stageStartedAtAbsoluteWeek : absoluteWeek,
            nextReviewAtAbsoluteWeek: absoluteWeek + 1,
            history: stage === clearance.stage ? clearance.history : [...clearance.history, {
                absoluteWeek,
                stage,
                outcome: 'PENDING',
                summary: `${stage.replaceAll('_', ' ').toLowerCase()} began.`,
            }],
        };
        return {
            operation: { ...operation, clearance: updatedClearance, lastProcessedAbsoluteWeek: absoluteWeek },
            kind: 'CLEARANCE_PROGRESS',
            additionalPayment: 0,
        };
    }
    const outcome = clearance.outcome === 'DELAYED'
        ? clearance.reviewAttempt > 1 ? 'APPROVED' : 'APPROVED_WITH_CONDITIONS'
        : getStreamingMarketClearanceOutcome(operation, clearance.reviewAttempt);
    if (outcome === 'DELAYED') {
        return {
            operation: {
                ...operation,
                approvalReadyAtAbsoluteWeek: absoluteWeek + 1,
                lastProcessedAbsoluteWeek: absoluteWeek,
                clearance: {
                    ...clearance,
                    stage: 'FINAL_APPROVAL',
                    progressPercent: 92,
                    outcome,
                    condition: 'The review calendar was extended while the final ministry sign-off is completed.',
                    nextReviewAtAbsoluteWeek: absoluteWeek + 1,
                    history: [...clearance.history, { absoluteWeek, stage: 'FINAL_APPROVAL', outcome, summary: 'Final approval was delayed by one review week.' }],
                },
            },
            kind: 'DELAYED',
            additionalPayment: 0,
        };
    }
    if (outcome === 'ADDITIONAL_REQUIREMENT') {
        const payment = Math.max(250_000, Math.round((operation.plannedCosts.compliance || 1_000_000) * 0.18));
        return {
            operation: {
                ...operation,
                status: 'AWAITING_FUNDING',
                lastProcessedAbsoluteWeek: absoluteWeek,
                clearance: {
                    ...clearance,
                    stage: 'REGULATORY_REVIEW',
                    progressPercent: 64,
                    outcome,
                    condition: 'Submit an enhanced consumer-data filing and fund the independent compliance review.',
                    additionalPayment: payment,
                    nextReviewAtAbsoluteWeek: absoluteWeek,
                    history: [...clearance.history, { absoluteWeek, stage: 'REGULATORY_REVIEW', outcome, summary: 'Regulators requested an enhanced compliance filing.' }],
                },
            },
            kind: 'ADDITIONAL_REQUIREMENT',
            additionalPayment: payment,
        };
    }
    if (outcome === 'TEMPORARILY_REJECTED') {
        return {
            operation: {
                ...operation,
                status: 'SUSPENDED',
                suspendedAtAbsoluteWeek: absoluteWeek,
                lastProcessedAbsoluteWeek: absoluteWeek,
                clearance: {
                    ...clearance,
                    stage: 'FINAL_APPROVAL',
                    progressPercent: 100,
                    outcome,
                    condition: 'The current application was declined. A revised filing can return after a two-week cooling period.',
                    resumeAllowedAtAbsoluteWeek: absoluteWeek + 2,
                    nextReviewAtAbsoluteWeek: absoluteWeek + 2,
                    history: [...clearance.history, { absoluteWeek, stage: 'FINAL_APPROVAL', outcome, summary: 'The application was rejected temporarily.' }],
                },
            },
            kind: 'TEMPORARILY_REJECTED',
            additionalPayment: 0,
        };
    }
    const conditional = outcome === 'APPROVED_WITH_CONDITIONS';
    const expansion = operation.entryKind === 'EXPANSION';
    return {
        operation: {
            ...operation,
            status: expansion ? 'INFRASTRUCTURE_PREPARATION' : 'READY',
            approvalReadyAtAbsoluteWeek: expansion ? absoluteWeek + infrastructureWeeksFor(operation) : absoluteWeek,
            lastProcessedAbsoluteWeek: absoluteWeek,
            clearance: {
                ...clearance,
                stage: 'FINAL_APPROVAL',
                progressPercent: 100,
                outcome,
                condition: conditional ? 'Approval requires quarterly compliance reporting and the saved local-content commitment.' : null,
                additionalPayment: 0,
                nextReviewAtAbsoluteWeek: absoluteWeek,
                history: [...clearance.history, {
                    absoluteWeek,
                    stage: 'FINAL_APPROVAL',
                    outcome,
                    summary: conditional ? 'Approved with operating conditions.' : 'Final market approval granted.',
                }],
            },
        },
        kind: 'APPROVED',
        additionalPayment: 0,
    };
};

export const resolveStreamingMarketRequirementCore = (
    operation: OwnedStreamingMarketOperation,
    absoluteWeek: number,
): OwnedStreamingMarketOperation => {
    const clearance = operation.clearance;
    if (!clearance || operation.status !== 'AWAITING_FUNDING' || clearance.outcome !== 'ADDITIONAL_REQUIREMENT') return operation;
    return {
        ...operation,
        status: 'CLEARANCE',
        approvalReadyAtAbsoluteWeek: absoluteWeek + 2,
        lastProcessedAbsoluteWeek: absoluteWeek,
        clearance: {
            ...clearance,
            stage: 'REGULATORY_REVIEW',
            progressPercent: 56,
            outcome: 'PENDING',
            condition: null,
            additionalPayment: 0,
            stageStartedAtAbsoluteWeek: absoluteWeek,
            nextReviewAtAbsoluteWeek: absoluteWeek + 1,
            reviewAttempt: clearance.reviewAttempt + 1,
            history: [...clearance.history, { absoluteWeek, stage: 'REGULATORY_REVIEW', outcome: 'PENDING', summary: 'The requested filing and compliance payment were submitted.' }],
        },
    };
};

export const resumeStreamingMarketOperationCore = (
    operation: OwnedStreamingMarketOperation,
    absoluteWeek: number,
): OwnedStreamingMarketOperation => {
    const clearance = operation.clearance;
    if (!clearance || operation.status !== 'SUSPENDED' || clearance.outcome !== 'TEMPORARILY_REJECTED' || (clearance.resumeAllowedAtAbsoluteWeek || 0) > absoluteWeek) return operation;
    return {
        ...operation,
        status: 'CLEARANCE',
        suspendedAtAbsoluteWeek: null,
        approvalReadyAtAbsoluteWeek: absoluteWeek + 2,
        lastProcessedAbsoluteWeek: absoluteWeek,
        clearance: {
            ...clearance,
            stage: 'REGULATORY_REVIEW',
            progressPercent: 52,
            outcome: 'PENDING',
            condition: null,
            stageStartedAtAbsoluteWeek: absoluteWeek,
            nextReviewAtAbsoluteWeek: absoluteWeek + 1,
            resumeAllowedAtAbsoluteWeek: null,
            reviewAttempt: clearance.reviewAttempt + 1,
            history: [...clearance.history, { absoluteWeek, stage: 'REGULATORY_REVIEW', outcome: 'PENDING', summary: 'A revised application returned to regulatory review.' }],
        },
    };
};

/** Shared post-clearance activation used by both player expansion and rival AI. */
export const activateStreamingMarketOperation = (
    operation: OwnedStreamingMarketOperation,
    absoluteWeek: number,
): OwnedStreamingMarketOperation => operation.status !== 'READY' ? operation : ({
    ...operation,
    status: 'ACTIVE',
    activatedAtAbsoluteWeek: operation.activatedAtAbsoluteWeek ?? absoluteWeek,
    lastProcessedAbsoluteWeek: absoluteWeek,
});
