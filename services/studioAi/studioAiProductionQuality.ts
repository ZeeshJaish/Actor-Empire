import type { IndustryContentFingerprint, IndustryProductionCommitment, NPCStudioState, StudioAiFinalQuality } from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import { appendStudioAiProductionKey } from './studioAiProductionState';

const clamp = (value: number) => Math.max(1, Math.min(100, Math.round(value * 100) / 100));

export interface FinalizeStudioAiProductionQualityInput {
    studio: NPCStudioState;
    production: IndustryProductionCommitment;
    fingerprint: IndustryContentFingerprint;
    absoluteWeek: number;
}

export interface FinalizeStudioAiProductionQualityResult {
    production: IndustryProductionCommitment;
    quality: StudioAiFinalQuality | null;
    changed: boolean;
}

export const finalizeStudioAiProductionQuality = (input: FinalizeStudioAiProductionQualityInput): FinalizeStudioAiProductionQualityResult => {
    const execution = input.production.studioAiExecution;
    if (!execution || execution.finalQuality || !['DELIVERED', 'AWAITING_RELEASE'].includes(input.production.status)) {
        return { production: input.production, quality: execution?.finalQuality || null, changed: false };
    }
    const commitment = input.studio.ai?.slate?.commitments.find(item => item.id === execution.slateCommitmentId);
    const scores = commitment?.scores;
    const talent = execution.talent?.packageScore || 45;
    const idealMid = (input.fingerprint.budgetSuitability.idealLowMillions + input.fingerprint.budgetSuitability.idealHighMillions) / 2;
    const budgetFit = Math.max(0, 100 - Math.abs(input.production.budgetMillions - idealMid) / Math.max(1, idealMid) * 90);
    const problemQuality = execution.problems.reduce((sum, problem) => sum + problem.qualityImpact, 0);
    const delayPenalty = Math.min(14, execution.problems.reduce((sum, problem) => sum + problem.delayWeeks, 0) * 1.5);
    const rng = createDeterministicRng(`${input.studio.ai?.seed || input.studio.id}:b6-quality:${input.production.id}`);
    const variance = (rng() - 0.5) * (18 + input.fingerprint.creativeRisk * 0.18);
    const creativeQuality = clamp(
        (scores?.creative || input.fingerprint.noveltyScore) * 0.27
        + input.studio.ai!.competence.creative * 0.19
        + input.studio.ai!.competence.development * 0.11
        + input.production.writerSkill * 0.09
        + talent * 0.17
        + budgetFit * 0.11
        + variance + problemQuality - delayPenalty,
    );
    const executionQuality = clamp(input.studio.ai!.competence.production * 0.46 + talent * 0.20 + budgetFit * 0.20 + creativeQuality * 0.14 - delayPenalty);
    const quality: StudioAiFinalQuality = {
        creativeQuality,
        executionQuality,
        commercialPotential: clamp((scores?.commercial || input.fingerprint.commercialIntent) * 0.55 + creativeQuality * 0.25 + input.studio.ai!.competence.marketing * 0.2),
        prestigePotential: clamp((scores?.prestige || input.fingerprint.prestigeIntent) * 0.62 + creativeQuality * 0.28 + talent * 0.1),
        downsideRisk: clamp((scores?.financialRisk || input.fingerprint.creativeRisk) * 0.55 + (100 - executionQuality) * 0.3 + execution.problems.length * 5),
    };
    const production: IndustryProductionCommitment = {
        ...input.production, status: 'AWAITING_RELEASE', updatedAtAbsoluteWeek: input.absoluteWeek,
        studioAiExecution: { ...execution, finalQuality: quality, processedKeys: appendStudioAiProductionKey(execution.processedKeys, `b6-quality:${input.production.id}`) },
    };
    return { production, quality, changed: true };
};
