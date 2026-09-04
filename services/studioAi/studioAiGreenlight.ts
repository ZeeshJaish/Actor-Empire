import type {
    IndustryContentFingerprint,
    IndustryIntelligenceProposal,
    NPCStudioState,
    StudioAiSlateCommitment,
    StudioAiSlateScores,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { normalizeStudioAiState } from './studioAiState';
import type { StudioAiDevelopmentTransaction } from './studioAiSlateAdmission';

interface ReviewStudioSlateCommitmentInput {
    studio: NPCStudioState;
    commitment: StudioAiSlateCommitment;
    fingerprint: IndustryContentFingerprint;
    proposal: IndustryIntelligenceProposal;
    absoluteWeek: number;
}

export interface StudioAiGreenlightReviewResult {
    reviewed: boolean;
    reason: 'REVIEWED' | 'NOT_DUE' | 'NOT_REVIEWABLE';
    commitment: StudioAiSlateCommitment;
    transaction?: StudioAiDevelopmentTransaction;
}

const clamp = (value: number, minimum = 0, maximum = 100): number => Math.max(minimum, Math.min(maximum, value));
const score = (value: number): number => Math.round(clamp(value) * 100) / 100;
const money = (value: number): number => Math.round(Math.max(0, value) * 1000) / 1000;
const REVIEWABLE = new Set(['DEVELOPING', 'REWRITE', 'ON_HOLD']);

const getBudgetFit = (fingerprint: IndustryContentFingerprint, budget: number): number => {
    const range = fingerprint.budgetSuitability;
    if (budget < range.minimumMillions) return clamp(35 + budget / Math.max(1, range.minimumMillions) * 35);
    if (budget <= range.idealHighMillions && budget >= range.idealLowMillions) return 100;
    if (budget < range.idealLowMillions) return clamp(72 + (budget - range.minimumMillions) / Math.max(1, range.idealLowMillions - range.minimumMillions) * 28);
    return clamp(100 - (budget - range.idealHighMillions) / Math.max(1, range.ambitiousMaximumMillions - range.idealHighMillions) * 28);
};

export const reviewStudioSlateCommitment = (input: ReviewStudioSlateCommitmentInput): StudioAiGreenlightReviewResult => {
    if (!REVIEWABLE.has(input.commitment.status)) return { reviewed: false, reason: 'NOT_REVIEWABLE', commitment: input.commitment };
    if (input.commitment.nextReviewAbsoluteWeek === null || input.absoluteWeek < input.commitment.nextReviewAbsoluteWeek) {
        return { reviewed: false, reason: 'NOT_DUE', commitment: input.commitment };
    }
    const ai = normalizeStudioAiState(input.studio, { absoluteWeek: input.absoluteWeek });
    const rng = createDeterministicRng(`${ai.seed}:b5:review:${input.commitment.id}:${input.commitment.rewriteCount}:${input.absoluteWeek}:${input.proposal.uncertaintyKey}`);
    const competenceMean = (ai.competence.development + ai.competence.creative + ai.competence.production + ai.competence.finance) / 4;
    const errorAmplitude = 15 - competenceMean * 0.09;
    const uncertainty = (rng() * 2 - 1) * Math.max(5, errorAmplitude);
    const budgetFit = getBudgetFit(input.fingerprint, input.commitment.proposedBudgetMillions);
    const strategyPrestige = ai.profile.strategy === 'PRESTIGE' || ai.profile.strategy === 'CREATOR_LED' ? 8 : 0;
    const strategyCommercial = ai.profile.strategy === 'COMMERCIAL' || ai.profile.strategy === 'FRANCHISE' ? 8 : 0;
    const creative = score(
        input.fingerprint.noveltyScore * 0.24
        + ai.competence.development * 0.26
        + ai.competence.creative * 0.28
        + input.proposal.score.strategyFit * 0.16
        + input.commitment.rewriteCount * 3
        + uncertainty,
    );
    const commercial = score(
        input.fingerprint.commercialIntent * 0.28
        + input.proposal.score.expectedUpside * 0.3
        + input.studio.reputation * 0.18
        + ai.competence.marketing * 0.18
        + strategyCommercial
        + uncertainty * 0.55,
    );
    const prestige = score(
        input.fingerprint.prestigeIntent * 0.34
        + creative * 0.3
        + ai.competence.creative * 0.2
        + ai.profile.prestigeAmbition * 0.1
        + strategyPrestige,
    );
    const capacityRatio = ai.capacity.committedProductionSlots / Math.max(1, ai.capacity.productionSlots);
    const execution = score(
        ai.competence.production * 0.34
        + ai.competence.development * 0.2
        + budgetFit * 0.3
        + input.proposal.confidence * 0.12
        - capacityRatio * 16
        + uncertainty * 0.5,
    );
    const cashExposure = input.commitment.proposedBudgetMillions / Math.max(1, input.studio.cashReserve) * 100;
    const runwayPressure = ai.finance.runwayWeeks >= 52 ? 0 : (52 - ai.finance.runwayWeeks) * 0.8;
    const financialRisk = score(
        input.proposal.score.financialRisk * 0.44
        + input.proposal.score.executionRisk * 0.18
        + cashExposure * 0.28
        + runwayPressure
        + capacityRatio * 12
        - ai.competence.finance * 0.12,
    );
    const strategicWeight = ai.profile.strategy === 'PRESTIGE' || ai.profile.strategy === 'CREATOR_LED'
        ? prestige
        : commercial;
    const greenlightConfidence = score(
        creative * 0.22
        + commercial * 0.2
        + prestige * 0.1
        + execution * 0.25
        + strategicWeight * 0.16
        - financialRisk * 0.34
        + input.proposal.score.total * 0.12,
    );
    const scores: StudioAiSlateScores = { creative, commercial, prestige, execution, financialRisk, greenlightConfidence };
    const base = {
        ...input.commitment,
        scores,
        updatedAtAbsoluteWeek: input.absoluteWeek,
    };

    if (ai.capacity.committedProductionSlots >= ai.capacity.productionSlots) {
        return {
            reviewed: true,
            reason: 'REVIEWED',
            commitment: { ...base, status: 'ON_HOLD', nextReviewAbsoluteWeek: input.absoluteWeek + 6 + Math.round(rng() * 6) },
        };
    }
    if (financialRisk >= 74 || greenlightConfidence < 35) {
        const status = greenlightConfidence >= 32 && input.commitment.proposedBudgetMillions > input.studio.cashReserve * 0.45
            ? 'TURNAROUND'
            : 'ABANDONED';
        return { reviewed: true, reason: 'REVIEWED', commitment: { ...base, status, nextReviewAbsoluteWeek: null } };
    }

    const reserveWeeks = 10 + ai.profile.financialDiscipline / 6;
    const availableCash = Math.max(0, input.studio.cashReserve - ai.finance.weeklyOperatingCostMillions * reserveWeeks - ai.finance.committedSpendMillions);
    const affordableBudget = Math.min(input.proposal.affordabilityCeilingMillions, availableCash);
    if (greenlightConfidence >= 58 && affordableBudget >= input.fingerprint.budgetSuitability.minimumMillions) {
        const riskStretch = (ai.profile.riskTolerance - 50) / 220;
        const confidenceStretch = (greenlightConfidence - 50) / 250;
        const target = input.commitment.proposedBudgetMillions * (1 + riskStretch + confidenceStretch);
        const greenlightBudgetMillions = money(clamp(
            target,
            Math.min(input.fingerprint.budgetSuitability.minimumMillions, affordableBudget),
            Math.min(input.fingerprint.budgetSuitability.ambitiousMaximumMillions, affordableBudget),
        ));
        return {
            reviewed: true,
            reason: 'REVIEWED',
            commitment: {
                ...base,
                status: 'GREENLIT',
                proposedBudgetMillions: greenlightBudgetMillions,
                greenlightBudgetMillions,
                greenlitAtAbsoluteWeek: input.absoluteWeek,
                nextReviewAbsoluteWeek: null,
            },
        };
    }

    if (input.commitment.rewriteCount < 2 && greenlightConfidence >= 40) {
        const rewriteCount = input.commitment.rewriteCount + 1;
        const rewriteCost = money(Math.max(0.1, input.commitment.developmentSpendMillions * (0.22 + rng() * 0.18)));
        const resizedBudget = financialRisk > 50
            ? money(Math.max(input.fingerprint.budgetSuitability.minimumMillions, input.commitment.proposedBudgetMillions * 0.86))
            : input.commitment.proposedBudgetMillions;
        return {
            reviewed: true,
            reason: 'REVIEWED',
            commitment: {
                ...base,
                status: 'REWRITE',
                rewriteCount,
                proposedBudgetMillions: resizedBudget,
                developmentSpendMillions: money(input.commitment.developmentSpendMillions + rewriteCost),
                nextReviewAbsoluteWeek: input.absoluteWeek + 2 + Math.round(rng() * 3),
            },
            transaction: {
                id: createDeterministicId('studio_ai_rewrite', input.commitment.id, rewriteCount),
                commitmentId: input.commitment.id,
                absoluteWeek: input.absoluteWeek,
                category: 'REWRITE',
                amountMillions: rewriteCost,
                description: `Rewrite ${rewriteCount} for ${input.fingerprint.primaryGenre} ${input.fingerprint.format.toLowerCase()}`,
            },
        };
    }

    if (greenlightConfidence >= 38) {
        const status = financialRisk >= 55 ? 'TURNAROUND' : 'ON_HOLD';
        return {
            reviewed: true,
            reason: 'REVIEWED',
            commitment: { ...base, status, nextReviewAbsoluteWeek: status === 'ON_HOLD' ? input.absoluteWeek + 8 : null },
        };
    }
    return { reviewed: true, reason: 'REVIEWED', commitment: { ...base, status: 'ABANDONED', nextReviewAbsoluteWeek: null } };
};
