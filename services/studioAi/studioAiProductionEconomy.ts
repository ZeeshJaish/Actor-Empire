import { moveCinemaNpcCash } from '../boxOffice/boxOfficeSettlement';
import { applyForStudioLoan, wasRefusedByBankLately } from './studioAiBank';
import type { IndustryProductionCommitment, NPCStudioState, StudioAiProductionMilestone } from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { appendStudioAiProductionKey, STUDIO_AI_PRODUCTION_PROBLEM_LIMIT } from './studioAiProductionState';
import { STUDIO_AI_EVENT_LIMIT, STUDIO_AI_LEDGER_LIMIT } from './studioAiState';

const money = (value: number): number => Math.round((value + Number.EPSILON * 100) * 1000) / 1000;

export interface StudioAiProductionMilestoneAmount {
    id: StudioAiProductionMilestone;
    amountMillions: number;
}

export const getStudioAiProductionMilestones = (budgetMillions: number): StudioAiProductionMilestoneAmount[] => {
    const budget = money(Math.max(0, budgetMillions));
    const first = money(budget * 0.15);
    const second = money(budget * 0.30);
    const third = money(budget * 0.30);
    return [
        { id: 'PRE_PRODUCTION_START', amountMillions: first },
        { id: 'PRODUCTION_START', amountMillions: second },
        { id: 'POST_PRODUCTION_START', amountMillions: third },
        { id: 'DELIVERY', amountMillions: money(budget - first - second - third) },
    ];
};

export interface ApplyStudioAiProductionMilestoneInput {
    studio: NPCStudioState;
    production: IndustryProductionCommitment;
    milestone: StudioAiProductionMilestone;
    absoluteWeek: number;
}

export interface ApplyStudioAiProductionMilestoneResult {
    studio: NPCStudioState;
    production: IndustryProductionCommitment;
}

export const applyStudioAiProductionMilestone = (rawInput: ApplyStudioAiProductionMilestoneInput): ApplyStudioAiProductionMilestoneResult => {
    let input = rawInput;
    const execution = input.production.studioAiExecution;
    if (!execution || input.production.source !== 'STUDIO_INDEPENDENT' || input.studio.ai?.controller !== 'AI'
        || execution.paidMilestoneIds?.includes(input.milestone)) return { studio: input.studio, production: input.production };
    const milestone = getStudioAiProductionMilestones(input.production.budgetMillions).find(row => row.id === input.milestone)!;
    /* 18 Nov 2026 (rival studio debt plan v2): short of cash for a production bill, the studio asks the Bank for the gap
       (plus a quarter of running costs) before it pauses the film. A refusal is kept as an event (and may be news).
       After a refusal it waits 4 weeks before asking again for production money (the Bank's answer does not change
       week to week); the film stays on hold meanwhile. */
    if (input.studio.cashReserve + 0.0001 < milestone.amountMillions && !wasRefusedByBankLately(input.studio, input.absoluteWeek, 'PRODUCTION')) {
        const application = applyForStudioLoan(input.studio, milestone.amountMillions - Math.max(0, input.studio.cashReserve), input.absoluteWeek, 'PRODUCTION', input.production.title);
        input = application.approved
            ? { ...input, studio: application.studio }
            : { ...input, studio: { ...input.studio, ai: { ...input.studio.ai!, events: [...input.studio.ai!.events, application.event].slice(-STUDIO_AI_EVENT_LIMIT) } } };
    }
    if (input.studio.cashReserve + 0.0001 < milestone.amountMillions) {
        const problemId = createDeterministicId('studio_ai_financing_hold', input.production.id, input.milestone);
        const problems = execution.problems.some(problem => problem.id === problemId) ? execution.problems : [...execution.problems, {
            id: problemId,
            checkpoint: 'PRODUCTION_START' as const,
            type: 'FINANCING_HOLD' as const,
            severity: Math.min(100, Math.round((milestone.amountMillions - input.studio.cashReserve) / Math.max(1, milestone.amountMillions) * 100)),
            occurredAtAbsoluteWeek: input.absoluteWeek,
            delayWeeks: 0,
            overrunMillions: 0,
            qualityImpact: 0,
            response: 'FINANCING_HOLD' as const,
            responseAppliedAtAbsoluteWeek: input.absoluteWeek,
        }].slice(-STUDIO_AI_PRODUCTION_PROBLEM_LIMIT);
        return {
            studio: input.studio,
            production: {
                ...input.production, status: 'ON_HOLD', updatedAtAbsoluteWeek: input.absoluteWeek,
                studioAiExecution: { ...execution, problems, holdStartedAtAbsoluteWeek: execution.holdStartedAtAbsoluteWeek ?? input.absoluteWeek, nextReviewAbsoluteWeek: input.absoluteWeek + 4 },
            },
        };
    }
    const nextCash = moveCinemaNpcCash(input.studio.cashReserve,-milestone.amountMillions);
    const ledgerId = createDeterministicId('studio_ai_production_ledger', input.production.id, input.milestone);
    const paidMilestoneIds = [...(execution.paidMilestoneIds || []), input.milestone];
    const status = input.milestone === 'PRODUCTION_START' ? 'PRODUCTION'
        : input.milestone === 'POST_PRODUCTION_START' ? 'POST_PRODUCTION'
            : input.milestone === 'DELIVERY' ? 'DELIVERED' : 'PRE_PRODUCTION';
    return {
        studio: {
            ...input.studio,
            cashReserve: nextCash,
            ai: {
                ...input.studio.ai!,
                finance: { ...input.studio.ai!.finance, committedSpendMillions: money(Math.max(0, input.studio.ai!.finance.committedSpendMillions - milestone.amountMillions)) },
                ledger: [...input.studio.ai!.ledger.filter(row => row.id !== ledgerId), {
                    id: ledgerId, absoluteWeek: input.absoluteWeek, category: 'PRODUCTION' as const,
                    amountMillions: -milestone.amountMillions, balanceAfterMillions: nextCash,
                    description: `${input.production.title}: ${input.milestone.toLowerCase().replaceAll('_', ' ')}`,
                }].sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id)).slice(-STUDIO_AI_LEDGER_LIMIT),
            },
        },
        production: {
            ...input.production, status, paidMillions: money(input.production.paidMillions + milestone.amountMillions), updatedAtAbsoluteWeek: input.absoluteWeek,
            studioAiExecution: {
                ...execution, paidMilestoneIds,
                processedKeys: appendStudioAiProductionKey(execution.processedKeys, `b6-milestone:${input.milestone}`),
                holdStartedAtAbsoluteWeek: null,
            },
        },
    };
};
