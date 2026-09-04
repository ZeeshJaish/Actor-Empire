import type {
    IndustryIntelligenceProposal,
    IndustryIntelligenceShadowComparison,
    IndustryIntelligenceShadowDivergence,
    IndustryIntelligenceState,
    NPCStudioState,
    PlatformState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import type { IndustryIntelligenceContext } from './industryIntelligenceContext';
import { INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT } from './industryIntelligenceState';

export interface IndustryShadowBaseline {
    companyId: string;
    companyKind: string;
    absoluteWeek: number;
    controller: 'AI' | 'PLAYER';
    cashMillions: number;
    debtMillions: number;
    activeCommitmentIds: string[];
}

export interface IndustryAuthoritativeDecisionObservation {
    acted: boolean;
    eligible: boolean;
    actionFamily: string;
    exposureMillions: number;
    absoluteWeek: number;
}

export interface CompareIndustryShadowDecisionInput {
    state: IndustryIntelligenceState;
    proposal: IndustryIntelligenceProposal;
    observation: IndustryAuthoritativeDecisionObservation | null;
}

export interface CompareIndustryShadowDecisionResult {
    state: IndustryIntelligenceState;
    comparison: IndustryIntelligenceShadowComparison | null;
    changed: boolean;
}

export const captureIndustryShadowBaseline = (
    context: IndustryIntelligenceContext,
): IndustryShadowBaseline => Object.freeze({
    companyId: context.companyId,
    companyKind: context.companyKind,
    absoluteWeek: context.absoluteWeek,
    controller: context.controller,
    cashMillions: context.condition.cashMillions,
    debtMillions: context.condition.debtMillions,
    activeCommitmentIds: Object.freeze([...context.activeCommitmentIds]) as unknown as string[],
});

const exposureBand = (millions: number): string => {
    if (millions <= 0) return 'NONE';
    if (millions < 10) return 'SMALL';
    if (millions < 75) return 'MEDIUM';
    if (millions < 250) return 'LARGE';
    return 'MAJOR';
};

const classifyDivergence = (
    proposal: IndustryIntelligenceProposal,
    observation: IndustryAuthoritativeDecisionObservation | null,
): IndustryIntelligenceShadowDivergence => {
    if (!observation) return 'NO_AUTHORITATIVE_OBSERVATION';
    const shadowActed = proposal.actionFamily !== 'HOLD';
    if (!observation.eligible && shadowActed) return 'ELIGIBILITY_DIFFERENCE';
    if (shadowActed !== observation.acted) return 'ACT_VS_HOLD';
    if (proposal.actionFamily !== observation.actionFamily) return 'ACTION_FAMILY_DIFFERENCE';
    if (exposureBand(proposal.expectedExposureMillions) !== exposureBand(observation.exposureMillions)) {
        return 'EXPOSURE_BAND_DIFFERENCE';
    }
    if (proposal.absoluteWeek !== observation.absoluteWeek) return 'TIMING_DIFFERENCE';
    return 'MATCH';
};

export const compareIndustryShadowDecision = (
    input: CompareIndustryShadowDecisionInput,
): CompareIndustryShadowDecisionResult => {
    const idempotencyKey = `${input.proposal.idempotencyKey}:shadow-comparison`;
    const existing = input.state.shadowComparisons.find(item => item.idempotencyKey === idempotencyKey);
    if (existing) return { state: input.state, comparison: existing, changed: false };
    const comparison: IndustryIntelligenceShadowComparison = {
        id: createDeterministicId('industry_shadow_comparison', idempotencyKey),
        idempotencyKey,
        companyId: input.state.companyId,
        lane: input.proposal.lane,
        absoluteWeek: input.proposal.absoluteWeek,
        proposalId: input.proposal.id,
        shadowActionFamily: input.proposal.actionFamily,
        authoritativeActionFamily: input.observation?.actionFamily || null,
        divergence: classifyDivergence(input.proposal, input.observation),
    };
    const state = {
        ...input.state,
        shadowComparisons: [...input.state.shadowComparisons, comparison]
            .slice(-INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT),
    };
    return { state, comparison, changed: true };
};

export const observeStudioAuthoritativeDecision = (
    before: NPCStudioState,
    after: NPCStudioState,
    proposal: IndustryIntelligenceProposal,
): IndustryAuthoritativeDecisionObservation | null => {
    if (proposal.lane !== 'FINANCE_REVIEW') return null;
    const constrained = ['DISTRESSED', 'RESTRUCTURING', 'DORMANT', 'CLOSED'].includes(after.ai?.status || '');
    return {
        acted: true,
        eligible: after.ai?.controller !== 'PLAYER',
        actionFamily: constrained ? 'REDUCE_SPEND' : 'MAINTAIN_BUDGET',
        exposureMillions: Math.max(0, (before.cashReserve || 0) - (after.cashReserve || 0)),
        absoluteWeek: proposal.absoluteWeek,
    };
};

export const observePlatformAuthoritativeDecision = (
    before: PlatformState,
    after: PlatformState,
    proposal: IndustryIntelligenceProposal,
): IndustryAuthoritativeDecisionObservation | null => {
    if (!before.ai || !after.ai) return null;
    let actionFamily = 'HOLD';
    let acted = false;
    if (proposal.lane === 'CONTENT_STRATEGY') {
        acted = after.ai.slate.length > before.ai.slate.length;
        actionFamily = acted ? 'DEVELOP_CONTENT' : 'HOLD';
    } else if (proposal.lane === 'CAPABILITY_GROWTH') {
        acted = after.ai.researchQueue.length > before.ai.researchQueue.length;
        actionFamily = acted ? 'RESEARCH_TECHNOLOGY' : 'HOLD';
    } else if (proposal.lane === 'MARKET_EXPANSION') {
        const localized = after.ai.localizationJobs.length > before.ai.localizationJobs.length;
        const expanded = after.ai.marketOperations.length > before.ai.marketOperations.length;
        acted = localized || expanded;
        actionFamily = localized ? 'LOCALIZE_CATALOGUE' : expanded ? 'ENTER_MARKET' : 'HOLD';
    } else if (proposal.lane === 'RELEASE_REVIEW') {
        acted = after.ai.releaseMemory.length > before.ai.releaseMemory.length;
        actionFamily = acted ? 'PREPARE_RELEASE' : 'HOLD';
    } else if (proposal.lane === 'PRODUCTION_REVIEW') {
        acted = after.ai.slate.some(plan => {
            const prior = before.ai!.slate.find(item => item.id === plan.id);
            return prior && prior.status !== plan.status;
        });
        actionFamily = acted ? 'CONTINUE_PRODUCTION' : 'HOLD';
    } else if (proposal.lane === 'FINANCE_REVIEW') {
        acted = true;
        const constrained = after.ai.spendingRestrictions.blocksNewBids
            || after.ai.spendingRestrictions.blocksNewGreenlights
            || after.ai.spendingRestrictions.blocksNewResearch
            || after.ai.spendingRestrictions.blocksExpansion;
        actionFamily = constrained ? 'REDUCE_SPEND' : 'MAINTAIN_BUDGET';
    } else {
        return null;
    }
    return {
        acted,
        eligible: true,
        actionFamily,
        exposureMillions: Math.max(0, (before.cashReserve || 0) - (after.cashReserve || 0)),
        absoluteWeek: proposal.absoluteWeek,
    };
};
