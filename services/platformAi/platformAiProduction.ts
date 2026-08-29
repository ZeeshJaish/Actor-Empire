import type {
    IndustryProductionCommitment,
    PlatformAiContentPlan,
    PlatformAiProductionRecord,
    PlatformId,
    Player,
    ProductionCalendar,
    WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { cancelProjectTalentBookings, releaseProjectTalentBookings } from '../talentBookings';
import { STUDIO_CATALOG } from '../studioLogic';
import { getIndustryProduction } from '../industryProductions';
import { buildPlatformAiProductionCalendar, type PlatformAiProductionMutationResult } from './platformAiCommissioning';
import {
    appendPlatformAiDecisions,
    normalizePlatformAiState,
    resolvePlatformController,
    resolveStudioController,
} from './platformAiState';

type PaymentMilestone = PlatformAiProductionRecord['paidMilestoneIds'][number];

const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 100) / 100;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const fundedEscrowBalances = (plan: PlatformAiContentPlan): { marketing: number; contingency: number } => (
    plan.productionEscrow?.status === 'FUNDED'
        ? {
            marketing: roundMillions(plan.productionEscrow.marketingBalanceMillions),
            contingency: roundMillions(plan.productionEscrow.contingencyBalanceMillions),
        }
        : { marketing: 0, contingency: 0 }
);

const statusForCalendar = (calendar: ProductionCalendar): IndustryProductionCommitment['status'] => {
    if (calendar.elapsedWeeks >= calendar.totalWeeks) return 'DELIVERED';
    if (calendar.elapsedWeeks < calendar.preProductionWeeks) return 'PRE_PRODUCTION';
    if (calendar.elapsedWeeks < calendar.preProductionWeeks + calendar.productionWeeks) return 'PRODUCTION';
    return 'POST_PRODUCTION';
};

const dueMilestones = (
    production: IndustryProductionCommitment,
    nextElapsed: number,
): Array<{ id: PaymentMilestone; principalMillions: number; overrunMillions: number; amountMillions: number }> => {
    const execution = production.aiExecution!;
    const paid = new Set(execution.paidMilestoneIds);
    const due: Array<{ id: PaymentMilestone; principalMillions: number; overrunMillions: number; amountMillions: number }> = [];
    let remainingPrincipal = roundMillions(Math.max(0, production.budgetMillions - production.paidMillions));
    const addMilestone = (id: PaymentMilestone, requestedPrincipal: number, overrunMillions = 0) => {
        const principalMillions = roundMillions(Math.min(remainingPrincipal, requestedPrincipal));
        remainingPrincipal = roundMillions(remainingPrincipal - principalMillions);
        const boundedOverrun = roundMillions(overrunMillions);
        due.push({
            id,
            principalMillions,
            overrunMillions: boundedOverrun,
            amountMillions: roundMillions(principalMillions + boundedOverrun),
        });
    };
    if (!paid.has('PROGRESS_35') && nextElapsed >= Math.ceil(execution.effectiveDurationWeeks * 0.35)) {
        addMilestone('PROGRESS_35', production.budgetMillions * 0.30);
    }
    if (!paid.has('PROGRESS_70') && nextElapsed >= Math.ceil(execution.effectiveDurationWeeks * 0.70)) {
        addMilestone('PROGRESS_70', production.budgetMillions * 0.30);
    }
    if (!paid.has('DELIVERY') && nextElapsed >= production.productionCalendar.totalWeeks) {
        addMilestone('DELIVERY', remainingPrincipal, execution.overrunMillions);
    }
    return due;
};

const planStatusForProduction = (
    status: IndustryProductionCommitment['status'],
): PlatformAiContentPlan['status'] => status === 'DELIVERED' ? 'DELIVERED' : status === 'ON_HOLD' ? 'ON_HOLD' : 'IN_PRODUCTION';

const settleCancelledProduction = (
    input: ProgressPlatformAiProductionInput,
    platform: NonNullable<WorldState['platforms']>[PlatformId],
    plan: PlatformAiContentPlan,
    production: IndustryProductionCommitment,
): PlatformAiProductionMutationResult => {
    const balances = fundedEscrowBalances(plan);
    const refundMillions = roundMillions(balances.marketing + balances.contingency);
    const hasBookedTalent = (input.world.talentBookings || []).some(booking => (
        booking.projectId === production.canonicalProjectId && booking.status === 'BOOKED'
    ));
    if (plan.status === 'CANCELLED' && refundMillions === 0 && !hasBookedTalent) {
        return { world: input.world, changed: false, plan, production, reason: 'CANCELLED' };
    }
    const cancelledPlan: PlatformAiContentPlan = {
        ...plan,
        status: 'CANCELLED',
        marketingReserveMillions: 0,
        contingencyMillions: 0,
        productionEscrow: plan.productionEscrow?.status === 'FUNDED' ? {
            ...plan.productionEscrow,
            status: 'SETTLED',
            marketingBalanceMillions: 0,
            contingencyBalanceMillions: 0,
            settledAtAbsoluteWeek: input.absoluteWeek,
            settlementReason: 'CANCELLED',
        } : plan.productionEscrow,
    };
    const cancelledProduction: IndustryProductionCommitment = {
        ...production,
        status: 'CANCELLED',
        updatedAtAbsoluteWeek: input.absoluteWeek,
    };
    const decisionId = createDeterministicId('platform_ai_decision', input.platformId, plan.id, 'PRODUCTION_CANCELLED');
    const cancelledPlatform = {
        ...platform,
        cashReserve: roundMillions(platform.cashReserve + refundMillions),
        ai: {
            ...platform.ai!,
            slate: platform.ai!.slate.map(item => item.id === plan.id ? cancelledPlan : item),
            decisionHistory: appendPlatformAiDecisions(
                platform.ai!.decisionHistory.filter(decision => decision.id !== decisionId),
                [{
                    id: decisionId,
                    absoluteWeek: input.absoluteWeek,
                    type: 'PRODUCTION_CANCELLED',
                    summary: `${plan.title} was cancelled.`,
                    reason: refundMillions > 0
                        ? `${refundMillions}M of unused production reserves returned to available cash.`
                        : 'No affordable production safeguard remained.',
                    cashImpactMillions: refundMillions,
                }],
            ),
        },
    };
    return {
        world: {
            ...input.world,
            platforms: { ...input.world.platforms, [input.platformId]: cancelledPlatform },
            industryProductions: {
                ...(input.world.industryProductions || {}),
                [production.id]: cancelledProduction,
            },
            talentBookings: cancelProjectTalentBookings(
                input.world.talentBookings,
                production.canonicalProjectId,
                input.absoluteWeek,
            ),
        },
        changed: true,
        plan: cancelledPlan,
        production: cancelledProduction,
        reason: 'CANCELLED',
    };
};

const updateTalentWindowsForHandoff = (
    world: WorldState,
    production: IndustryProductionCommitment,
    calendar: ProductionCalendar,
): WorldState['talentBookings'] => (world.talentBookings || []).map(booking => {
    if (booking.projectId !== production.canonicalProjectId || booking.status !== 'BOOKED') return booking;
    const started = Math.round(calendar.startedAbsoluteWeek ?? production.createdAtAbsoluteWeek);
    return booking.role === 'ACTOR'
        ? {
            ...booking,
            startAbsoluteWeek: started + calendar.preProductionWeeks,
            endAbsoluteWeek: started + calendar.preProductionWeeks + calendar.productionWeeks - 1,
        }
        : {
            ...booking,
            startAbsoluteWeek: started,
            endAbsoluteWeek: started + calendar.totalWeeks - 1,
        };
});

const hasTalentConflictForCalendar = (
    world: WorldState,
    production: IndustryProductionCommitment,
    calendar: ProductionCalendar,
): boolean => {
    void world;
    void production;
    void calendar;
    // Phase 3 keeps overlapping NPC workload as history but does not enforce
    // exclusivity. Contractual conflicts belong to the future Law Pack.
    return false;
};

export interface ProgressPlatformAiProductionInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    planId: string;
    absoluteWeek: number;
}

export const progressPlatformAiProduction = (
    input: ProgressPlatformAiProductionInput,
): PlatformAiProductionMutationResult => {
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, plan: null, production: null, reason: 'PLATFORM_NOT_FOUND' };
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const plan = platform.ai!.slate.find(item => item.id === input.planId) || null;
    if (!plan) return { world: input.world, changed: false, plan: null, production: null, reason: 'PLAN_NOT_FOUND' };
    const production = plan.industryProductionId
        ? getIndustryProduction(input.world.industryProductions, plan.industryProductionId, input.absoluteWeek)
        : null;
    if (!production?.aiExecution) return { world: input.world, changed: false, plan, production, reason: 'PLAN_NOT_FOUND' };
    const controller = resolvePlatformController(input.player, input.platformId) === 'PLAYER'
        || resolveStudioController(input.player, production.producerStudioId) === 'PLAYER'
        ? 'PLAYER'
        : 'AI';
    const execution = production.aiExecution;

    if (production.status === 'DELIVERED') return { world: input.world, changed: false, plan, production, reason: 'DELIVERED' };
    if (production.status === 'CANCELLED') return settleCancelledProduction(input, platform, plan, production);

    if (controller === 'PLAYER') {
        if (execution.controllerAtLastProgression === 'PLAYER' && execution.effectiveDurationWeeks === execution.standardDurationWeeks) {
            return { world: input.world, changed: false, plan, production, reason: 'PLAYER_CONTROLLED' };
        }
        const standardCalendar = buildPlatformAiProductionCalendar(
            execution.standardDurationWeeks,
            execution.delayWeeks,
            production.productionCalendar.startedAbsoluteWeek ?? production.createdAtAbsoluteWeek,
        );
        const handedOffCalendar = {
            ...standardCalendar,
            elapsedWeeks: Math.min(production.productionCalendar.elapsedWeeks, standardCalendar.totalWeeks),
        };
        if (hasTalentConflictForCalendar(input.world, production, handedOffCalendar)) {
            const heldProduction: IndustryProductionCommitment = {
                ...production,
                status: 'ON_HOLD',
                aiExecution: {
                    ...execution,
                    controllerAtLastProgression: 'PLAYER',
                    holdReason: 'SCHEDULE_CONFLICT',
                },
                updatedAtAbsoluteWeek: input.absoluteWeek,
            };
            const heldPlan: PlatformAiContentPlan = { ...plan, status: 'ON_HOLD' };
            const heldPlatform = {
                ...platform,
                ai: {
                    ...platform.ai!,
                    slate: platform.ai!.slate.map(item => item.id === plan.id ? heldPlan : item),
                },
            };
            return {
                world: {
                    ...input.world,
                    platforms: { ...input.world.platforms, [input.platformId]: heldPlatform },
                    industryProductions: {
                        ...(input.world.industryProductions || {}),
                        [production.id]: heldProduction,
                    },
                },
                changed: true,
                plan: heldPlan,
                production: heldProduction,
                reason: 'SCHEDULE_CONFLICT',
            };
        }
        const handedOffProduction: IndustryProductionCommitment = {
            ...production,
            productionCalendar: handedOffCalendar,
            aiExecution: {
                ...execution,
                effectiveDurationWeeks: execution.standardDurationWeeks,
                controllerAtLastProgression: 'PLAYER',
                holdReason: null,
            },
            status: statusForCalendar(handedOffCalendar),
            updatedAtAbsoluteWeek: input.absoluteWeek,
        };
        const nextWorld = {
            ...input.world,
            talentBookings: updateTalentWindowsForHandoff(input.world, production, handedOffCalendar),
            industryProductions: {
                ...(input.world.industryProductions || {}),
                [production.id]: handedOffProduction,
            },
        };
        return { world: nextWorld, changed: true, plan, production: handedOffProduction, reason: 'PLAYER_HANDOFF' };
    }

    if (input.absoluteWeek <= execution.lastProgressedAbsoluteWeek) {
        return { world: input.world, changed: false, plan, production, reason: 'ALREADY_PROCESSED' };
    }

    const persistedFailureResponse = execution.failureResponse
        || (execution.failureDecision === 'NONE' ? 'NONE' : 'PENDING');
    const responseAlreadyApplied = persistedFailureResponse === 'CONTINGENCY_TRANSFERRED'
        || persistedFailureResponse === 'MARKETING_TRANSFERRED'
        || persistedFailureResponse === 'SCHEDULE_EXTENDED';
    if (persistedFailureResponse === 'ON_HOLD' && execution.failureResponseAppliedAtAbsoluteWeek !== null) {
        if (input.absoluteWeek > execution.failureResponseAppliedAtAbsoluteWeek) {
            return settleCancelledProduction(
                input,
                platform,
                { ...plan, status: 'CANCELLED' },
                { ...production, status: 'CANCELLED', updatedAtAbsoluteWeek: input.absoluteWeek },
            );
        }
        return { world: input.world, changed: false, plan, production, reason: 'FAILURE_RESPONSE_HOLD' };
    }
    if (execution.failureDecision !== 'NONE' && !responseAlreadyApplied) {
        if (execution.failureDecision === 'CANCEL') {
            return settleCancelledProduction(
                input,
                platform,
                { ...plan, status: 'CANCELLED' },
                {
                    ...production,
                    status: 'CANCELLED',
                    aiExecution: {
                        ...execution,
                        failureResponse: 'ON_HOLD',
                        failureResponseAppliedAtAbsoluteWeek: input.absoluteWeek,
                        lastProgressedAbsoluteWeek: input.absoluteWeek,
                        holdReason: 'FAILURE_RESPONSE_UNAVAILABLE',
                    },
                },
            );
        }
        let response: PlatformAiProductionRecord['failureResponse'] = 'ON_HOLD';
        let responseAmountMillions = 0;
        let responseAppliedAtAbsoluteWeek: number | null = null;
        let holdReason: PlatformAiProductionRecord['holdReason'] = 'FAILURE_RESPONSE_UNAVAILABLE';
        let producerTransferMillions = 0;
        let nextPlan: PlatformAiContentPlan = { ...plan };
        let nextProduction: IndustryProductionCommitment = { ...production };
        let nextBookings = input.world.talentBookings;

        if (execution.failureDecision === 'ADD_CONTINGENCY') {
            const available = fundedEscrowBalances(plan).contingency;
            if (available > 0) {
                response = 'CONTINGENCY_TRANSFERRED';
                responseAmountMillions = available;
                responseAppliedAtAbsoluteWeek = input.absoluteWeek;
                holdReason = null;
                producerTransferMillions = available;
                nextPlan = {
                    ...plan,
                    status: planStatusForProduction(statusForCalendar(production.productionCalendar)),
                    contingencyMillions: 0,
                    productionEscrow: {
                        ...plan.productionEscrow,
                        contingencyBalanceMillions: 0,
                    },
                };
                nextProduction = {
                    ...production,
                    status: statusForCalendar(production.productionCalendar),
                    budgetMillions: roundMillions(production.budgetMillions + available),
                    paidMillions: roundMillions(production.paidMillions + available),
                };
            }
        } else if (execution.failureDecision === 'REDUCE_MARKETING') {
            const available = fundedEscrowBalances(plan).marketing;
            if (available > 0) {
                response = 'MARKETING_TRANSFERRED';
                responseAmountMillions = available;
                responseAppliedAtAbsoluteWeek = input.absoluteWeek;
                holdReason = null;
                producerTransferMillions = available;
                nextPlan = {
                    ...plan,
                    status: planStatusForProduction(statusForCalendar(production.productionCalendar)),
                    marketingReserveMillions: 0,
                    productionEscrow: {
                        ...plan.productionEscrow,
                        marketingBalanceMillions: 0,
                    },
                };
                nextProduction = {
                    ...production,
                    status: statusForCalendar(production.productionCalendar),
                    budgetMillions: roundMillions(production.budgetMillions + available),
                    paidMillions: roundMillions(production.paidMillions + available),
                };
            }
        } else if (execution.failureDecision === 'DELAY_RELEASE') {
            const delayedCalendar: ProductionCalendar = {
                ...production.productionCalendar,
                postProductionWeeks: production.productionCalendar.postProductionWeeks + 1,
                totalWeeks: production.productionCalendar.totalWeeks + 1,
                focusWindowWeeks: Math.min(
                    production.productionCalendar.totalWeeks + 1,
                    production.productionCalendar.focusWindowWeeks + 1,
                ),
            };
            if (hasTalentConflictForCalendar(input.world, production, delayedCalendar)) {
                holdReason = 'SCHEDULE_CONFLICT';
            } else {
                response = 'SCHEDULE_EXTENDED';
                responseAppliedAtAbsoluteWeek = input.absoluteWeek;
                holdReason = null;
                nextBookings = updateTalentWindowsForHandoff(input.world, production, delayedCalendar);
                nextPlan = {
                    ...plan,
                    status: planStatusForProduction(statusForCalendar(delayedCalendar)),
                };
                nextProduction = {
                    ...production,
                    status: statusForCalendar(delayedCalendar),
                    productionCalendar: delayedCalendar,
                };
            }
        } else {
            responseAppliedAtAbsoluteWeek = input.absoluteWeek;
        }

        if (response === 'ON_HOLD' && responseAppliedAtAbsoluteWeek === null) {
            responseAppliedAtAbsoluteWeek = input.absoluteWeek;
        }

        const unavailableFundedFallback = response === 'ON_HOLD'
            && (execution.failureDecision === 'ADD_CONTINGENCY' || execution.failureDecision === 'REDUCE_MARKETING');
        if (unavailableFundedFallback) {
            const cancelledExecution: PlatformAiProductionRecord = {
                ...execution,
                failureResponse: 'ON_HOLD',
                failureResponseAmountMillions: 0,
                failureResponseAppliedAtAbsoluteWeek: input.absoluteWeek,
                lastProgressedAbsoluteWeek: input.absoluteWeek,
                holdReason: 'INSUFFICIENT_CASH',
            };
            return settleCancelledProduction(
                input,
                platform,
                { ...plan, status: 'CANCELLED' },
                { ...production, status: 'CANCELLED', aiExecution: cancelledExecution },
            );
        }
        const isHeld = response === 'ON_HOLD';
        const respondedProduction: IndustryProductionCommitment = {
            ...nextProduction,
            status: isHeld ? 'ON_HOLD' : nextProduction.status,
            aiExecution: {
                ...execution,
                delayWeeks: response === 'SCHEDULE_EXTENDED' ? execution.delayWeeks + 1 : execution.delayWeeks,
                failureResponse: response,
                failureResponseAmountMillions: responseAmountMillions,
                failureResponseAppliedAtAbsoluteWeek: responseAppliedAtAbsoluteWeek,
                lastProgressedAbsoluteWeek: input.absoluteWeek,
                holdReason,
            },
            updatedAtAbsoluteWeek: input.absoluteWeek,
        };
        const respondedPlan: PlatformAiContentPlan = {
            ...nextPlan,
            status: isHeld ? 'ON_HOLD' : nextPlan.status,
        };
        const responseDecisionId = createDeterministicId(
            'platform_ai_decision',
            input.platformId,
            plan.id,
            'FAILURE_RESPONSE',
        );
        const responseDecision = {
            id: responseDecisionId,
            absoluteWeek: input.absoluteWeek,
            type: 'PRODUCTION_FAILURE_RESPONSE',
            summary: isHeld
                ? `${plan.title} entered a production hold.`
                : `${plan.title} applied ${response.toLowerCase().replaceAll('_', ' ')}.`,
            reason: isHeld
                ? `The bounded ${execution.failureDecision.toLowerCase().replaceAll('_', ' ')} response could not be applied: ${holdReason}.`
                : `${responseAmountMillions > 0 ? `${responseAmountMillions}M was reassigned. ` : ''}${execution.failureDecision} was resolved without inventing a new production system.`,
            cashImpactMillions: 0,
        };
        const producer = input.world.studios?.[production.producerStudioId] || {
            id: production.producerStudioId,
            name: STUDIO_CATALOG[production.producerStudioId]?.name || production.producerStudioId,
            valuation: STUDIO_CATALOG[production.producerStudioId]?.valuation || 0,
            reputation: 70,
            cashReserve: 0,
            recentHits: 0,
            archetype: STUDIO_CATALOG[production.producerStudioId]?.archetype || 'INDEPENDENT',
        };
        const respondedPlatform = {
            ...platform,
            cashReserve: platform.cashReserve,
            ai: {
                ...platform.ai!,
                slate: platform.ai!.slate.map(item => item.id === plan.id ? respondedPlan : item),
                decisionHistory: appendPlatformAiDecisions(
                    platform.ai!.decisionHistory.filter(decision => decision.id !== responseDecisionId),
                    [responseDecision],
                ),
            },
        };
        return {
            world: {
                ...input.world,
                platforms: { ...input.world.platforms, [input.platformId]: respondedPlatform },
                studios: {
                    ...(input.world.studios || {}),
                    [production.producerStudioId]: {
                        ...producer,
                        cashReserve: roundMillions(producer.cashReserve + producerTransferMillions),
                    },
                },
                industryProductions: {
                    ...(input.world.industryProductions || {}),
                    [production.id]: respondedProduction,
                },
                talentBookings: nextBookings,
            },
            changed: true,
            plan: respondedPlan,
            production: respondedProduction,
            reason: isHeld
                ? holdReason === 'SCHEDULE_CONFLICT' ? 'SCHEDULE_CONFLICT' : 'FAILURE_RESPONSE_HOLD'
                : 'FAILURE_RESPONSE_APPLIED',
        };
    }
    const nextElapsed = Math.min(production.productionCalendar.totalWeeks, production.productionCalendar.elapsedWeeks + 1);
    const milestones = dueMilestones(production, nextElapsed);
    const dueMillions = roundMillions(milestones.reduce((sum, milestone) => sum + milestone.amountMillions, 0));
    const duePrincipalMillions = roundMillions(milestones.reduce((sum, milestone) => sum + milestone.principalMillions, 0));
    const cashPaymentMillions = roundMillions(Math.min(platform.cashReserve, dueMillions));
    const reserveShortfallMillions = roundMillions(dueMillions - cashPaymentMillions);
    const escrowBalances = fundedEscrowBalances(plan);
    const contingencyUsedMillions = roundMillions(Math.min(escrowBalances.contingency, reserveShortfallMillions));
    const marketingShortfallMillions = roundMillions(reserveShortfallMillions - contingencyUsedMillions);
    const marketingUsedMillions = roundMillions(Math.min(escrowBalances.marketing, marketingShortfallMillions));
    const reserveUsedMillions = roundMillions(contingencyUsedMillions + marketingUsedMillions);
    if (roundMillions(cashPaymentMillions + reserveUsedMillions) < dueMillions) {
        if (
            plan.productionHoldStartedAtAbsoluteWeek !== null
            && plan.productionHoldStartedAtAbsoluteWeek !== undefined
            && plan.productionHoldStartedAtAbsoluteWeek < input.absoluteWeek
        ) {
            return settleCancelledProduction(
                input,
                platform,
                { ...plan, status: 'CANCELLED' },
                {
                    ...production,
                    status: 'CANCELLED',
                    aiExecution: {
                        ...execution,
                        lastProgressedAbsoluteWeek: input.absoluteWeek,
                        holdReason: 'INSUFFICIENT_CASH',
                    },
                },
            );
        }
        const heldProduction: IndustryProductionCommitment = {
            ...production,
            status: 'ON_HOLD',
            aiExecution: {
                ...execution,
                lastProgressedAbsoluteWeek: input.absoluteWeek,
                holdReason: 'INSUFFICIENT_CASH',
            },
            updatedAtAbsoluteWeek: input.absoluteWeek,
        };
        const heldPlan: PlatformAiContentPlan = {
            ...plan,
            status: 'ON_HOLD',
            productionHoldStartedAtAbsoluteWeek: input.absoluteWeek,
        };
        const heldPlatform = {
            ...platform,
            ai: { ...platform.ai!, slate: platform.ai!.slate.map(item => item.id === plan.id ? heldPlan : item) },
        };
        const heldWorld = {
            ...input.world,
            platforms: { ...input.world.platforms, [input.platformId]: heldPlatform },
            industryProductions: { ...(input.world.industryProductions || {}), [production.id]: heldProduction },
        };
        return { world: heldWorld, changed: true, plan: heldPlan, production: heldProduction, reason: 'PAYMENT_HOLD' };
    }

    const nextCalendar = { ...production.productionCalendar, elapsedWeeks: nextElapsed };
    const nextStatus = statusForCalendar(nextCalendar);
    const paidMilestoneIds = [
        ...execution.paidMilestoneIds,
        ...milestones.map(milestone => milestone.id),
    ];
    const finalQuality = nextStatus === 'DELIVERED'
        ? clamp(Math.round(
            execution.qualityForecast
            + (execution.executionRoll - 0.5) * 10
            - execution.delayWeeks
            - execution.overrunMillions / Math.max(1, production.budgetMillions) * 8,
        ), 1, 100)
        : execution.finalQuality;
    const nextPaid = nextStatus === 'DELIVERED'
        ? production.budgetMillions
        : roundMillions(Math.min(production.budgetMillions, production.paidMillions + duePrincipalMillions));
    const nextProduction: IndustryProductionCommitment = {
        ...production,
        status: nextStatus,
        productionCalendar: nextCalendar,
        paidMillions: nextPaid,
            aiExecution: {
                ...execution,
                paidMilestoneIds,
            controllerAtLastProgression: 'AI',
            lastProgressedAbsoluteWeek: input.absoluteWeek,
            holdReason: null,
            finalQuality,
        },
        updatedAtAbsoluteWeek: input.absoluteWeek,
    };
    const nextPlan: PlatformAiContentPlan = {
        ...plan,
        status: planStatusForProduction(nextStatus),
        paidSpendMillions: roundMillions(plan.paidSpendMillions + cashPaymentMillions),
        marketingReserveMillions: roundMillions(escrowBalances.marketing - marketingUsedMillions),
        contingencyMillions: nextStatus === 'DELIVERED'
            ? 0
            : roundMillions(escrowBalances.contingency - contingencyUsedMillions),
        productionEscrow: plan.productionEscrow?.status === 'FUNDED' ? {
            ...plan.productionEscrow,
            marketingBalanceMillions: roundMillions(escrowBalances.marketing - marketingUsedMillions),
            contingencyBalanceMillions: nextStatus === 'DELIVERED'
                ? 0
                : roundMillions(escrowBalances.contingency - contingencyUsedMillions),
        } : plan.productionEscrow,
        productionHoldStartedAtAbsoluteWeek: null,
        rightsReadyAtAbsoluteWeek: nextStatus === 'DELIVERED' ? input.absoluteWeek : plan.rightsReadyAtAbsoluteWeek,
    };
    const producer = input.world.studios?.[production.producerStudioId] || {
        id: production.producerStudioId,
        name: STUDIO_CATALOG[production.producerStudioId]?.name || production.producerStudioId,
        valuation: STUDIO_CATALOG[production.producerStudioId]?.valuation || 0,
        reputation: 70,
        cashReserve: 0,
        recentHits: 0,
        archetype: STUDIO_CATALOG[production.producerStudioId]?.archetype || 'INDEPENDENT',
    };
    let cashLeftForDecisions = cashPaymentMillions;
    let reserveLeftForDecisions = reserveUsedMillions;
    const decisions = milestones.map(milestone => {
        const milestoneCashMillions = roundMillions(Math.min(cashLeftForDecisions, milestone.amountMillions));
        cashLeftForDecisions = roundMillions(cashLeftForDecisions - milestoneCashMillions);
        const milestoneReserveMillions = roundMillions(Math.min(
            reserveLeftForDecisions,
            milestone.amountMillions - milestoneCashMillions,
        ));
        reserveLeftForDecisions = roundMillions(reserveLeftForDecisions - milestoneReserveMillions);
        return {
            id: createDeterministicId('platform_ai_decision', input.platformId, plan.id, milestone.id),
            absoluteWeek: input.absoluteWeek,
            type: `PRODUCTION_${milestone.id}`,
            summary: `${plan.title} cleared ${milestone.id.toLowerCase().replaceAll('_', ' ')}.`,
            reason: `${producer.name} received ${milestone.amountMillions}M for the production milestone${milestoneReserveMillions > 0 ? `, including ${milestoneReserveMillions}M from funded reserves` : ''}.`,
            cashImpactMillions: -milestoneCashMillions,
        };
    });
    const reserveRefundMillions = nextStatus === 'DELIVERED'
        ? roundMillions(escrowBalances.contingency - contingencyUsedMillions)
        : 0;
    const nextPlatform = {
        ...platform,
        cashReserve: roundMillions(platform.cashReserve - cashPaymentMillions + reserveRefundMillions),
        ai: {
            ...platform.ai!,
            slate: platform.ai!.slate.map(item => item.id === plan.id ? nextPlan : item),
            decisionHistory: appendPlatformAiDecisions(platform.ai!.decisionHistory, decisions),
        },
    };
    const nextWorld: WorldState = {
        ...input.world,
        platforms: { ...input.world.platforms, [input.platformId]: nextPlatform },
        studios: {
            ...(input.world.studios || {}),
            [production.producerStudioId]: { ...producer, cashReserve: roundMillions(producer.cashReserve + dueMillions) },
        },
        industryProductions: { ...(input.world.industryProductions || {}), [production.id]: nextProduction },
        talentBookings: nextStatus === 'DELIVERED'
            ? releaseProjectTalentBookings(input.world.talentBookings, production.canonicalProjectId, input.absoluteWeek)
            : input.world.talentBookings,
    };
    return { world: nextWorld, changed: true, plan: nextPlan, production: nextProduction };
};

/** One-time ownership-boundary conversion invoked by the real acquisition signer. */
export const handoffAcquiredPlatformProductions = (input: {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    absoluteWeek: number;
}): WorldState => {
    let nextWorld = input.world;
    const planIds = (nextWorld.platforms?.[input.platformId]?.ai?.slate || [])
        .filter(plan => {
            if (plan.source !== 'COMMISSIONED_ORIGINAL' || !plan.industryProductionId) return false;
            const production = nextWorld.industryProductions?.[plan.industryProductionId];
            return Boolean(production?.aiExecution && !['DELIVERED', 'CANCELLED'].includes(production.status));
        })
        .map(plan => plan.id)
        .sort();
    for (const planId of planIds) {
        nextWorld = progressPlatformAiProduction({
            player: { ...input.player, world: nextWorld },
            world: nextWorld,
            platformId: input.platformId,
            planId,
            absoluteWeek: input.absoluteWeek,
        }).world;
    }
    return nextWorld;
};
