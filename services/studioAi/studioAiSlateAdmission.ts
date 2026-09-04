import type {
    IndustryContentFingerprint,
    IndustryIntelligenceProposal,
    NPCStudioState,
    StudioAiLedgerCategory,
    StudioAiSlateCommitment,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { attachNormalizedStudioAiState, STUDIO_AI_LEDGER_LIMIT } from './studioAiState';

export type StudioAiSlateAdmissionReason =
    | 'ADMITTED'
    | 'PLAYER_CONTROLLED'
    | 'STUDIO_UNAVAILABLE'
    | 'INVALID_PROPOSAL'
    | 'MISSING_FINGERPRINT'
    | 'FINGERPRINT_OWNERSHIP'
    | 'DUPLICATE_COMMITMENT'
    | 'NO_DEVELOPMENT_CAPACITY'
    | 'INSUFFICIENT_RUNWAY'
    | 'INSUFFICIENT_AFFORDABILITY'
    | 'MISSING_SOURCE_RIGHT';

export interface StudioAiDevelopmentTransaction {
    id: string;
    commitmentId: string;
    absoluteWeek: number;
    category: Extract<StudioAiLedgerCategory, 'DEVELOPMENT' | 'REWRITE'>;
    amountMillions: number;
    description: string;
}

export interface StudioAiSlateAdmissionResult {
    accepted: boolean;
    reason: StudioAiSlateAdmissionReason;
    commitment?: StudioAiSlateCommitment;
    transaction?: StudioAiDevelopmentTransaction;
}

interface AdmitStudioContentProposalInput {
    studio: NPCStudioState;
    proposal: IndustryIntelligenceProposal;
    fingerprint?: IndustryContentFingerprint;
    absoluteWeek: number;
}

const money = (value: number): number => Math.round(Math.max(0, value) * 1000) / 1000;
const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const RESTRICTED_STATUSES = new Set(['DISTRESSED', 'RESTRUCTURING', 'DORMANT', 'SOLD_MERGED', 'CLOSED']);
const EXTERNAL_RIGHT_SOURCES = new Set(['LICENSED_WORK', 'ACQUIRED_IP']);

export const admitStudioContentProposal = (input: AdmitStudioContentProposalInput): StudioAiSlateAdmissionResult => {
    const studio = attachNormalizedStudioAiState(input.studio, { absoluteWeek: input.absoluteWeek });
    const ai = studio.ai!;
    const slate = ai.slate!;
    const proposal = input.proposal;
    const fingerprint = input.fingerprint;
    if (ai.controller === 'PLAYER') return { accepted: false, reason: 'PLAYER_CONTROLLED' };
    if (RESTRICTED_STATUSES.has(ai.status)) return { accepted: false, reason: 'STUDIO_UNAVAILABLE' };
    if (proposal.companyId !== studio.id || proposal.companyKind !== 'PRODUCTION_STUDIO' || proposal.lane !== 'CONTENT_STRATEGY' || proposal.actionFamily === 'HOLD') {
        return { accepted: false, reason: 'INVALID_PROPOSAL' };
    }
    if (!fingerprint) return { accepted: false, reason: 'MISSING_FINGERPRINT' };
    if (fingerprint.ownerCompanyId !== studio.id || fingerprint.ownerCompanyKind !== 'PRODUCTION_STUDIO') {
        return { accepted: false, reason: 'FINGERPRINT_OWNERSHIP' };
    }
    if (EXTERNAL_RIGHT_SOURCES.has(fingerprint.sourceIntent) && !fingerprint.sourceRightId) {
        return { accepted: false, reason: 'MISSING_SOURCE_RIGHT' };
    }
    if (slate.processedProposalKeys.includes(proposal.idempotencyKey) || slate.commitments.some(item => (
        item.proposalKey === proposal.idempotencyKey || item.fingerprintId === fingerprint.id
    ))) return { accepted: false, reason: 'DUPLICATE_COMMITMENT' };
    if (ai.capacity.committedDevelopmentSlots >= ai.capacity.developmentSlots) {
        return { accepted: false, reason: 'NO_DEVELOPMENT_CAPACITY' };
    }
    if (ai.finance.runwayWeeks < 12 || studio.cashReserve <= 0) return { accepted: false, reason: 'INSUFFICIENT_RUNWAY' };

    const protectedWeeks = 8 + ai.profile.financialDiscipline / 8;
    const protectedCash = ai.finance.weeklyOperatingCostMillions * protectedWeeks;
    const spendableCash = Math.max(0, studio.cashReserve - protectedCash - ai.finance.committedSpendMillions);
    const affordability = Math.max(0, Math.min(proposal.affordabilityCeilingMillions, spendableCash * 0.72));
    const suitability = fingerprint.budgetSuitability;
    if (affordability < suitability.minimumMillions * 0.5) return { accepted: false, reason: 'INSUFFICIENT_AFFORDABILITY' };

    const rng = createDeterministicRng(`${ai.seed}:b5:admit:${proposal.idempotencyKey}:${fingerprint.id}`);
    const appetite = clamp((ai.profile.budgetAppetite + proposal.urgency + proposal.score.expectedUpside) / 300, 0.15, 0.92);
    const ideal = suitability.idealLowMillions + (suitability.idealHighMillions - suitability.idealLowMillions) * appetite;
    const proposedBudgetMillions = money(clamp(
        ideal * (0.94 + rng() * 0.14),
        Math.min(suitability.minimumMillions, affordability),
        Math.min(suitability.ambitiousMaximumMillions, affordability),
    ));
    if (proposedBudgetMillions <= 0) return { accepted: false, reason: 'INSUFFICIENT_AFFORDABILITY' };

    const developmentRate = fingerprint.format === 'MOVIE' ? 0.032 : 0.038;
    const patienceMultiplier = 0.82 + ai.profile.creativePatience / 280;
    const developmentSpendMillions = money(Math.max(0.25, Math.min(
        proposedBudgetMillions * developmentRate * patienceMultiplier,
        proposal.affordabilityCeilingMillions * 0.12,
        spendableCash * 0.16,
    )));
    if (developmentSpendMillions > studio.cashReserve || developmentSpendMillions <= 0) {
        return { accepted: false, reason: 'INSUFFICIENT_AFFORDABILITY' };
    }
    const commitmentId = createDeterministicId('studio_ai_slate', studio.id, proposal.idempotencyKey, fingerprint.id);
    const reviewDelay = 2 + Math.round((100 - ai.profile.creativePatience) / 28) + (fingerprint.format === 'MOVIE' ? 0 : 1);
    const commitment: StudioAiSlateCommitment = {
        id: commitmentId,
        proposalId: proposal.id,
        proposalKey: proposal.idempotencyKey,
        fingerprintId: fingerprint.id,
        source: 'INDEPENDENT',
        status: 'DEVELOPING',
        createdAtAbsoluteWeek: input.absoluteWeek,
        updatedAtAbsoluteWeek: input.absoluteWeek,
        nextReviewAbsoluteWeek: input.absoluteWeek + Math.max(2, reviewDelay),
        developmentSpendMillions,
        rewriteCount: 0,
        proposedBudgetMillions,
        proposalSnapshot: {
            confidence: proposal.confidence,
            affordabilityCeilingMillions: proposal.affordabilityCeilingMillions,
            score: { ...proposal.score },
            uncertaintyKey: proposal.uncertaintyKey,
        },
    };
    return {
        accepted: true,
        reason: 'ADMITTED',
        commitment,
        transaction: {
            id: createDeterministicId('studio_ai_development', commitmentId, input.absoluteWeek),
            commitmentId,
            absoluteWeek: input.absoluteWeek,
            category: 'DEVELOPMENT',
            amountMillions: developmentSpendMillions,
            description: `Development commitment for ${fingerprint.primaryGenre} ${fingerprint.format.toLowerCase()}`,
        },
    };
};

export const applyStudioAiDevelopmentTransaction = (
    inputStudio: NPCStudioState,
    transaction: StudioAiDevelopmentTransaction,
): NPCStudioState => {
    const studio = attachNormalizedStudioAiState(inputStudio, { absoluteWeek: transaction.absoluteWeek });
    const ai = studio.ai!;
    if (ai.ledger.some(item => item.id === transaction.id)) return studio;
    const amount = money(Math.min(studio.cashReserve, transaction.amountMillions));
    if (amount <= 0) return studio;
    const cashReserve = money(studio.cashReserve - amount);
    return {
        ...studio,
        cashReserve,
        ai: {
            ...ai,
            finance: {
                ...ai.finance,
                runwayWeeks: Math.round(cashReserve / Math.max(0.01, ai.finance.weeklyOperatingCostMillions) * 100) / 100,
            },
            ledger: [...ai.ledger, {
                id: transaction.id,
                absoluteWeek: transaction.absoluteWeek,
                category: transaction.category,
                amountMillions: -amount,
                balanceAfterMillions: cashReserve,
                description: transaction.description,
            }].slice(-STUDIO_AI_LEDGER_LIMIT),
        },
    };
};
