import type {
    IndustryDecisionLane,
    IndustryContentFingerprint,
    IndustryIntelligenceProposal,
    IndustryIntelligenceScore,
    IndustryIntelligenceState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import type { IndustryIntelligenceContext } from './industryIntelligenceContext';
import { createDefaultIndustryDecisionOptions } from './industryIntelligenceOptions';
import { evaluateIndustryDecisionOptions } from './industryIntelligenceScoring';
import { coolIndustryMomentum } from './industryIntelligenceLearning';
import {
    advanceIndustryDecisionLane,
    getDueIndustryDecisionLanes,
    getIndustryDecisionProcessedKey,
} from './industryIntelligenceScheduler';
import { INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT } from './industryIntelligenceState';
import { processIndustryContentShadowSelection } from './industryContentShadow';

export interface ProcessIndustryIntelligenceShadowCompanyInput {
    context: IndustryIntelligenceContext;
    state: IndustryIntelligenceState;
    globalRecentFingerprints?: IndustryContentFingerprint[];
}

export interface ProcessIndustryIntelligenceShadowCompanyResult {
    state: IndustryIntelligenceState;
    changed: boolean;
    dueLanes: IndustryDecisionLane[];
}

const TERMINAL_STATUSES = new Set(['CLOSED', 'SOLD_MERGED', 'DORMANT']);

export const processIndustryIntelligenceShadowCompany = (
    input: ProcessIndustryIntelligenceShadowCompanyInput,
): ProcessIndustryIntelligenceShadowCompanyResult => {
    if (input.context.controller !== 'AI' || TERMINAL_STATUSES.has(input.context.status)) {
        return { state: input.state, changed: false, dueLanes: [] };
    }
    const dueLanes = getDueIndustryDecisionLanes(input.context).filter(lane => !input.state.processedKeys.includes(
        getIndustryDecisionProcessedKey(input.state, lane, input.context.absoluteWeek),
    ));
    if (!dueLanes.length) return { state: input.state, changed: false, dueLanes: [] };
    const zeroScore = (): IndustryIntelligenceScore => ({
        total: 0, need: 0, strategyFit: 0, expectedUpside: 0, relationshipValue: 0,
        competitiveValue: 0, financialRisk: 0, capacityPressure: 0, fatigue: 0, executionRisk: 0,
    });
    const cooledState = coolIndustryMomentum(input.state, input.context, input.context.absoluteWeek);
    const state = dueLanes.reduce((current, lane) => {
        const evaluation = evaluateIndustryDecisionOptions(
            { ...input.context, decisionCycleByLane: { ...current.decisionCycleByLane } },
            lane,
            createDefaultIndustryDecisionOptions(input.context, lane),
        );
        const advanced = advanceIndustryDecisionLane(current, lane, input.context.absoluteWeek);
        const selected = evaluation.selected;
        const idempotencyKey = getIndustryDecisionProcessedKey(current, lane, input.context.absoluteWeek);
        const proposal: IndustryIntelligenceProposal = {
            id: createDeterministicId('industry_intelligence_proposal', idempotencyKey),
            idempotencyKey,
            companyId: current.companyId,
            companyKind: current.companyKind,
            lane,
            decisionCycle: current.decisionCycleByLane[lane],
            absoluteWeek: input.context.absoluteWeek,
            actionFamily: selected?.actionFamily || 'HOLD',
            optionId: selected?.optionId || 'HOLD',
            urgency: Math.max(0, Math.min(100, selected?.need || 0)),
            confidence: selected?.forecast.confidence || 0,
            expectedExposureMillions: selected?.expectedExposureMillions || 0,
            affordabilityCeilingMillions: evaluation.affordabilityCeilingMillions,
            score: selected?.score || zeroScore(),
            reasonCodes: selected?.reasonCodes || ['NO_ELIGIBLE_OPTION'],
            uncertaintyKey: selected?.forecast.uncertaintyKey || createDeterministicId('industry_forecast_hold', idempotencyKey),
            status: 'SHADOW',
            nextReviewAbsoluteWeek: advanced.nextDueAbsoluteWeek[lane] || input.context.absoluteWeek + 1,
        };
        const proposedState = {
            ...advanced,
            proposals: [...advanced.proposals.filter(item => item.idempotencyKey !== idempotencyKey), proposal]
                .slice(-INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT),
        };
        const contentSelection = processIndustryContentShadowSelection({
            context: input.context,
            state: proposedState,
            proposal,
            globalRecentFingerprints: input.globalRecentFingerprints || [],
        });
        if (!contentSelection.selectedFingerprint) return contentSelection.state;
        return {
            ...contentSelection.state,
            proposals: contentSelection.state.proposals.map(item => item.id === proposal.id
                ? { ...item, contentFingerprintId: contentSelection.selectedFingerprint!.id }
                : item),
        };
    }, cooledState);
    return { state, changed: state !== input.state, dueLanes };
};
