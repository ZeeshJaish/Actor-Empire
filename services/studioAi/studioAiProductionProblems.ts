import type { IndustryProductionCommitment, NPCStudioState, StudioAiProductionCheckpoint, StudioAiProductionProblem } from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { appendStudioAiProductionKey, STUDIO_AI_PRODUCTION_PROBLEM_LIMIT } from './studioAiProductionState';

export interface EvaluateStudioAiProductionProblemInput {
    studio: NPCStudioState;
    production: IndustryProductionCommitment;
    checkpoint: StudioAiProductionCheckpoint;
    absoluteWeek: number;
}

export interface EvaluateStudioAiProductionProblemResult {
    studio: NPCStudioState;
    production: IndustryProductionCommitment;
    problem: StudioAiProductionProblem | null;
    changed: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const evaluateStudioAiProductionProblem = (input: EvaluateStudioAiProductionProblemInput): EvaluateStudioAiProductionProblemResult => {
    const execution = input.production.studioAiExecution;
    const key = `b6-problem:${input.production.id}:${input.checkpoint}`;
    if (!execution || input.production.source !== 'STUDIO_INDEPENDENT' || input.studio.ai?.controller !== 'AI'
        || execution.processedKeys.includes(key)) return { studio: input.studio, production: input.production, problem: null, changed: false };
    const competence = input.studio.ai.competence.production;
    const cashPressure = input.studio.cashReserve / Math.max(1, input.production.budgetMillions);
    const congestion = input.studio.ai.capacity.committedProductionSlots / Math.max(1, input.studio.ai.capacity.productionSlots);
    const risk = clamp(0.20 + (100 - competence) / 145 + congestion * 0.08 + (cashPressure < 0.15 ? 0.18 : 0), 0.08, 0.98);
    const rng = createDeterministicRng(`${input.studio.ai.seed}:${key}`);
    const roll = rng();
    const processedKeys = appendStudioAiProductionKey(execution.processedKeys, key);
    if (roll >= risk || execution.problems.length >= STUDIO_AI_PRODUCTION_PROBLEM_LIMIT) {
        const production = { ...input.production, studioAiExecution: { ...execution, processedKeys } };
        return { studio: input.studio, production, problem: null, changed: true };
    }
    const severity = Math.round(clamp((risk - roll) * 85 + rng() * 35, 8, 100));
    const types = input.checkpoint === 'POST_PRODUCTION_START'
        ? ['POST_PRODUCTION_DIFFICULTY', 'QUALITY_LOSS', 'OVERRUN'] as const
        : ['DELAY', 'OVERRUN', 'QUALITY_LOSS', 'TALENT_ISSUE'] as const;
    const type = types[Math.floor(rng() * types.length)];
    const delayWeeks = type === 'DELAY' || type === 'TALENT_ISSUE' || type === 'POST_PRODUCTION_DIFFICULTY' ? Math.max(1, Math.ceil(severity / 35)) : 0;
    const overrunMillions = type === 'OVERRUN' ? Math.round(input.production.budgetMillions * severity / 1000 * 1000) / 1000 : 0;
    const qualityImpact = type === 'QUALITY_LOSS' || type === 'TALENT_ISSUE' || type === 'POST_PRODUCTION_DIFFICULTY' ? -Math.max(1, Math.round(severity / 8)) : 0;
    const response = input.studio.cashReserve > input.production.budgetMillions * 0.25
        ? type === 'QUALITY_LOSS' ? 'QUALITY_PROTECTION' as const : 'CONTINGENCY_SPEND' as const
        : input.studio.cashReserve < input.production.budgetMillions * 0.05
            ? 'FINANCING_HOLD' as const
            : type === 'DELAY' ? 'SCHEDULE_EXTENSION' as const : 'SCOPE_REDUCTION' as const;
    const problem: StudioAiProductionProblem = {
        id: createDeterministicId('studio_ai_production_problem', input.production.id, input.checkpoint),
        checkpoint: input.checkpoint, type, severity, occurredAtAbsoluteWeek: input.absoluteWeek,
        delayWeeks, overrunMillions, qualityImpact, response, responseAppliedAtAbsoluteWeek: input.absoluteWeek,
    };
    const calendar = delayWeeks > 0 ? {
        ...input.production.productionCalendar,
        postProductionWeeks: input.production.productionCalendar.postProductionWeeks + delayWeeks,
        totalWeeks: input.production.productionCalendar.totalWeeks + delayWeeks,
    } : input.production.productionCalendar;
    const production = {
        ...input.production,
        status: response === 'FINANCING_HOLD' ? 'ON_HOLD' as const : input.production.status,
        productionCalendar: calendar,
        updatedAtAbsoluteWeek: input.absoluteWeek,
        studioAiExecution: {
            ...execution,
            problems: [...execution.problems, problem].slice(-STUDIO_AI_PRODUCTION_PROBLEM_LIMIT),
            processedKeys,
            ...(response === 'FINANCING_HOLD' ? { holdStartedAtAbsoluteWeek: input.absoluteWeek, nextReviewAbsoluteWeek: input.absoluteWeek + 4 } : {}),
        },
    };
    return { studio: input.studio, production, problem, changed: true };
};
