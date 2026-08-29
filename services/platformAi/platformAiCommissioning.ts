import type {
    IndustryProductionCommitment,
    PlatformAiContentPlan,
    PlatformAiProductionRecord,
    PlatformId,
    Player,
    ProductionCalendar,
    StudioId,
    WorldState,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { createProductionCalendar } from '../productionCalendar';
import { reserveProjectTalentBookings } from '../talentBookings';
import { STUDIO_CATALOG } from '../studioLogic';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import {
    appendPlatformAiDecisions,
    getPlatformAiProductionDuration,
    normalizePlatformAiState,
    resolvePlatformController,
    resolveStudioController,
} from './platformAiState';
import { selectPlatformAiTalent } from './platformAiTalent';
import {
    PLATFORM_AI_COMMISSIONING_RETRY_WEEKS,
    getPlatformAiProductionEscrowFundingId,
    getPlatformAiProductionReserveQuote,
} from './platformAiProductionEscrow';

const STANDARD_PRODUCTION_WEEKS = 20;

const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 100) / 100;
const roundRoll = (value: number): number => Math.round(value * 10_000) / 10_000;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const buildPlatformAiProductionCalendar = (
    durationWeeks: number,
    delayWeeks: number,
    absoluteWeek: number,
): ProductionCalendar => {
    const totalWeeks = Math.max(3, Math.round(durationWeeks + delayWeeks));
    const preProductionWeeks = Math.max(1, Math.round(totalWeeks * 0.2));
    const productionWeeks = Math.max(1, Math.round(totalWeeks * 0.4));
    const postProductionWeeks = Math.max(1, totalWeeks - preProductionWeeks - productionWeeks);
    return {
        ...createProductionCalendar({ preProductionWeeks, productionWeeks, postProductionWeeks }),
        startedAbsoluteWeek: Math.max(0, Math.round(absoluteWeek)),
    };
};

export interface SelectPlatformAiProducerInput {
    player: Player;
    platformId: PlatformId;
    planId: string;
    preferredStudioId: StudioId | null;
    genre?: PlatformAiContentPlan['genre'];
    budgetMillions?: number;
}

interface PlatformAiProducerCandidate {
    id: StudioId;
    name: string;
    archetype: string;
    valuation: number;
    payMultiplier: number;
    budgetComfort: string[];
    qualityBias: { script: number; hype: number; distribution: number };
    isDynamicVenture: boolean;
}

const getDynamicProducerBudgetComfort = (archetype: string, cashReserve: number): string[] => {
    if (archetype === 'COMMERCIAL_STUDIO') return cashReserve >= 180 ? ['LOW', 'MID', 'HIGH'] : ['LOW', 'MID'];
    if (archetype === 'PRESTIGE_LABEL' && cashReserve >= 260) return ['LOW', 'MID', 'HIGH'];
    return ['LOW', 'MID'];
};

const getPlatformAiProducerCandidates = (player: Player): PlatformAiProducerCandidate[] => {
    const staticCandidates = (Object.keys(STUDIO_CATALOG) as StudioId[]).map(id => ({
        id,
        name: STUDIO_CATALOG[id].name,
        archetype: STUDIO_CATALOG[id].archetype,
        valuation: STUDIO_CATALOG[id].valuation,
        payMultiplier: STUDIO_CATALOG[id].payMultiplier,
        budgetComfort: STUDIO_CATALOG[id].budgetComfort,
        qualityBias: STUDIO_CATALOG[id].qualityBias,
        isDynamicVenture: false,
    }));
    const dynamicCandidates = Object.values(player.world.npcVentures || {})
        .filter(venture => venture.status === 'ACTIVE')
        .filter(venture => venture.cashReserve >= 15 && venture.reputation >= 30 && venture.creativeQuality >= 35)
        .map(venture => ({
            id: venture.id,
            name: venture.name,
            archetype: venture.archetype === 'PRESTIGE_LABEL' || venture.archetype === 'AWARDS_BOUTIQUE'
                ? 'PRESTIGE'
                : 'LEGACY',
            valuation: venture.valuation,
            payMultiplier: clamp(0.92 + venture.reputation / 600, 0.95, 1.12),
            budgetComfort: getDynamicProducerBudgetComfort(venture.archetype, venture.cashReserve),
            qualityBias: {
                script: clamp(venture.creativeQuality / 20, 1, 5),
                hype: clamp(venture.hype / 20, 1, 5),
                distribution: clamp((venture.reputation + venture.hype) / 40, 1, 5),
            },
            isDynamicVenture: true,
        }));
    return [...staticCandidates, ...dynamicCandidates]
        .filter((candidate, index, all) => all.findIndex(entry => entry.id === candidate.id) === index);
};

const getPlatformAiProducerCandidate = (player: Player, studioId: StudioId): PlatformAiProducerCandidate | null => (
    getPlatformAiProducerCandidates(player).find(candidate => candidate.id === studioId) || null
);

export const selectPlatformAiProducer = (
    input: SelectPlatformAiProducerInput,
): StudioId | null => {
    const profile = PLATFORM_AI_PROFILES[input.platformId];
    const activeProductionsByStudio = Object.values(input.player.world.industryProductions || {})
        .filter(production => !['DELIVERED', 'CANCELLED'].includes(production.status))
        .reduce<Record<string, number>>((counts, production) => {
            counts[production.producerStudioId] = (counts[production.producerStudioId] || 0) + 1;
            return counts;
        }, {});
    const candidatesById = new Map(getPlatformAiProducerCandidates(input.player).map(candidate => [candidate.id, candidate]));
    const candidates = [...new Set([...profile.producerStudioPreferences, ...[...candidatesById.keys()].sort()])]
        .map(studioId => candidatesById.get(studioId))
        .filter((candidate): candidate is PlatformAiProducerCandidate => Boolean(candidate))
        .filter(candidate => candidate.archetype !== 'PLATFORM' && resolveStudioController(input.player, candidate.id) === 'AI')
        .filter(candidate => !candidate.isDynamicVenture || (activeProductionsByStudio[candidate.id] || 0) < 3);
    const budgetTier = Number(input.budgetMillions || 0) >= 100 ? 'HIGH' : Number(input.budgetMillions || 0) >= 30 ? 'MID' : 'LOW';
    return candidates
        .map(studio => ({
            studioId: studio.id,
            score: (() => {
                const preferenceIndex = profile.producerStudioPreferences.indexOf(studio.id);
                const explicitRelationshipFit = input.preferredStudioId === studio.id ? 40 : 0;
                const ownershipFit = profile.ownedStudioIds.includes(studio.id) ? 28 : 0;
                const preferenceFit = preferenceIndex >= 0 ? 36 - preferenceIndex * 6 : 0;
                const budgetFit = studio.budgetComfort.includes(budgetTier) ? 24 : -18;
                const genreFit = input.genre === 'DRAMA' || input.genre === 'BIOPIC' || input.genre === 'DOCUMENTARY'
                    ? studio.archetype === 'PRESTIGE' ? 20 : studio.qualityBias.script * 5
                    : input.genre === 'SUPERHERO' || input.genre === 'FANTASY' || input.genre === 'ANIMATION'
                        ? studio.archetype === 'UNIVERSE_ARCHITECT' ? 22 : studio.qualityBias.hype * 5
                        : studio.qualityBias.distribution * 6;
                const capacityPenalty = (activeProductionsByStudio[studio.id] || 0) * (studio.isDynamicVenture ? 16 : 11);
                const worldStudio = input.player.world.studios?.[studio.id];
                const trackRecord = worldStudio
                    ? clamp((worldStudio.reputation - 50) * 0.25 + (worldStudio.hits || 0) * 1.5 - (worldStudio.flops || 0), -12, 18)
                    : 0;
                const costFit = (1.4 - studio.payMultiplier) * 8;
                const deterministicTieBreak = createDeterministicRng(`${input.player.id}:${input.platformId}:${input.planId}:PRODUCER:${studio.id}`)() * 3;
                return explicitRelationshipFit + ownershipFit + preferenceFit + budgetFit + genreFit + trackRecord + costFit - capacityPenalty + deterministicTieBreak;
            })(),
        }))
        .sort((left, right) => right.score - left.score || left.studioId.localeCompare(right.studioId))[0]?.studioId || null;
};

const createExecutionRecord = (
    input: {
        player: Player;
        platformId: PlatformId;
        plan: PlatformAiContentPlan;
        productionId: string;
        leadActorId: string;
        leadActorName: string;
        directorId: string;
        directorName: string;
        writerName: string;
        productionSkill: number;
        absoluteWeek: number;
    },
): PlatformAiProductionRecord => {
    const rng = createDeterministicRng(`${input.player.id}:${input.platformId}:${input.plan.id}:${input.productionId}:EXECUTION`);
    const executionRoll = roundRoll(rng());
    const delayRoll = roundRoll(rng());
    const overrunRoll = roundRoll(rng());
    const failureRoll = roundRoll(rng());
    const riskTolerance = PLATFORM_AI_PROFILES[input.platformId].riskTolerance;
    const effectiveDurationWeeks = getPlatformAiProductionDuration(STANDARD_PRODUCTION_WEEKS, input.productionSkill, 'AI');
    const delayRisk = clamp(0.34 - (input.productionSkill - 7) * 0.055, 0.12, 0.34);
    const delayWeeks = delayRoll < delayRisk ? 1 + Math.floor(executionRoll * 3) : 0;
    const overrunRisk = clamp(0.30 - (input.productionSkill - 7) * 0.04, 0.14, 0.30);
    const overrunMillions = overrunRoll < overrunRisk
        ? roundMillions(input.plan.productionFundingMillions * (0.04 + failureRoll * 0.08))
        : 0;
    const failureDecision: PlatformAiProductionRecord['failureDecision'] = failureRoll < 0.08
        ? riskTolerance > 0.7 ? 'ADD_CONTINGENCY' : 'DELAY_RELEASE'
        : failureRoll < 0.14
            ? 'REDUCE_MARKETING'
            : 'NONE';
    const qualityForecast = clamp(Math.round(
        input.plan.forecast.creative * 0.55
        + input.productionSkill * 4
        + executionRoll * 8,
    ), 1, 100);
    return {
        standardDurationWeeks: STANDARD_PRODUCTION_WEEKS,
        effectiveDurationWeeks,
        qualityForecast,
        executionRoll,
        delayRoll,
        overrunRoll,
        failureRoll,
        delayWeeks,
        overrunMillions,
        leadActorId: input.leadActorId,
        leadActorName: input.leadActorName,
        directorId: input.directorId,
        directorName: input.directorName,
        writerId: null,
        writerName: input.writerName,
        finalQuality: null,
        failureDecision,
        failureResponse: failureDecision === 'NONE' ? 'NONE' : 'PENDING',
        failureResponseAmountMillions: 0,
        failureResponseAppliedAtAbsoluteWeek: null,
        paidMilestoneIds: [],
        controllerAtLastProgression: 'AI',
        lastProgressedAbsoluteWeek: input.absoluteWeek,
        holdReason: null,
    };
};

export interface CommissionPlatformAiOriginalInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    planId: string;
    absoluteWeek: number;
}

export interface PlatformAiProductionMutationResult {
    world: WorldState;
    changed: boolean;
    plan: PlatformAiContentPlan | null;
    production: IndustryProductionCommitment | null;
    reason?: 'PLATFORM_NOT_FOUND' | 'PLAN_NOT_FOUND' | 'NOT_ORIGINAL' | 'PLAYER_CONTROLLED' | 'COMPANY_INACTIVE' | 'PRODUCER_UNAVAILABLE' | 'TALENT_UNAVAILABLE' | 'TALENT_CONFLICT' | 'SCHEDULE_CONFLICT' | 'INSUFFICIENT_CASH' | 'DUPLICATE' | 'PAYMENT_HOLD' | 'FAILURE_RESPONSE_APPLIED' | 'FAILURE_RESPONSE_HOLD' | 'ALREADY_PROCESSED' | 'DELIVERED' | 'CANCELLED' | 'PLAYER_HANDOFF';
}

const recordCommissioningFailure = (
    input: CommissionPlatformAiOriginalInput,
    platform: NonNullable<WorldState['platforms']>[PlatformId],
    plan: PlatformAiContentPlan,
    reason: NonNullable<PlatformAiProductionMutationResult['reason']>,
): PlatformAiProductionMutationResult => {
    const lifecycle = plan.commissioningLifecycle;
    if (!lifecycle || lifecycle.status !== 'PENDING') {
        return { world: input.world, changed: false, plan, production: null, reason };
    }
    const attemptCount = Math.min(PLATFORM_AI_COMMISSIONING_RETRY_WEEKS, lifecycle.attemptCount + 1);
    const cancelled = attemptCount >= PLATFORM_AI_COMMISSIONING_RETRY_WEEKS
        || input.absoluteWeek >= lifecycle.deadlineAtAbsoluteWeek;
    const refundMillions = cancelled ? roundMillions(lifecycle.depositEscrowMillions) : 0;
    const nextPlan: PlatformAiContentPlan = {
        ...plan,
        status: cancelled ? 'CANCELLED' : 'BRIEF',
        commissioningLifecycle: {
            ...lifecycle,
            status: cancelled ? 'CANCELLED' : 'PENDING',
            attemptCount,
            lastAttemptAtAbsoluteWeek: input.absoluteWeek,
            lastFailureReason: reason,
            depositEscrowMillions: cancelled ? 0 : lifecycle.depositEscrowMillions,
            depositRefundedAtAbsoluteWeek: cancelled ? input.absoluteWeek : null,
        },
    };
    const decision = cancelled ? [{
        id: createDeterministicId('platform_ai_decision', input.platformId, plan.id, 'COMMISSIONING_CANCELLED'),
        absoluteWeek: input.absoluteWeek,
        type: 'COMMISSIONING_CANCELLED',
        summary: `${plan.title} left the commissioning slate.`,
        reason: `${attemptCount} bounded commissioning attempts ended with ${reason}; the ${refundMillions}M deposit returned to cash.`,
        cashImpactMillions: refundMillions,
    }] : [];
    const nextPlatform = {
        ...platform,
        cashReserve: roundMillions(platform.cashReserve + refundMillions),
        ai: {
            ...platform.ai!,
            slate: platform.ai!.slate.map(item => item.id === plan.id ? nextPlan : item),
            decisionHistory: appendPlatformAiDecisions(platform.ai!.decisionHistory, decision),
        },
    };
    return {
        world: {
            ...input.world,
            platforms: { ...input.world.platforms, [input.platformId]: nextPlatform },
        },
        changed: true,
        plan: nextPlan,
        production: null,
        reason: cancelled ? 'CANCELLED' : reason,
    };
};

export const commissionPlatformAiOriginal = (
    input: CommissionPlatformAiOriginalInput,
): PlatformAiProductionMutationResult => {
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, plan: null, production: null, reason: 'PLATFORM_NOT_FOUND' };
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const plan = platform.ai!.slate.find(item => item.id === input.planId) || null;
    if (platform.ai!.status !== 'ACTIVE') {
        return { world: input.world, changed: false, plan, production: null, reason: 'COMPANY_INACTIVE' };
    }
    if (!plan) return { world: input.world, changed: false, plan: null, production: null, reason: 'PLAN_NOT_FOUND' };
    if (plan.source !== 'COMMISSIONED_ORIGINAL') return { world: input.world, changed: false, plan, production: null, reason: 'NOT_ORIGINAL' };
    if (plan.status === 'CANCELLED' || plan.commissioningLifecycle?.status === 'CANCELLED') {
        return { world: input.world, changed: false, plan, production: null, reason: 'CANCELLED' };
    }
    if (plan.status !== 'BRIEF' || plan.commissioningLifecycle?.status !== 'PENDING') {
        return { world: input.world, changed: false, plan, production: null, reason: 'DUPLICATE' };
    }
    if (plan.commissioningLifecycle.lastAttemptAtAbsoluteWeek === input.absoluteWeek) {
        return { world: input.world, changed: false, plan, production: null, reason: 'ALREADY_PROCESSED' };
    }
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, plan, production: null, reason: 'PLAYER_CONTROLLED' };
    }
    const stableProductionId = createDeterministicId('industry_production', input.platformId, plan.id);
    const stableCanonicalProjectId = createDeterministicId('platform_ai_project', input.platformId, plan.id);
    const existingId = plan.industryProductionId || stableProductionId;
    const existing = input.world.industryProductions?.[existingId];
    if (existing) return { world: input.world, changed: false, plan, production: existing, reason: 'DUPLICATE' };

    const producerSelectionPlayer = { ...input.player, world: input.world };
    const producerStudioId = selectPlatformAiProducer({
        player: producerSelectionPlayer,
        platformId: input.platformId,
        planId: plan.id,
        preferredStudioId: plan.sourceStudioId,
        genre: plan.genre,
        budgetMillions: plan.productionFundingMillions,
    });
    if (!producerStudioId) return recordCommissioningFailure(input, platform, plan, 'PRODUCER_UNAVAILABLE');
    const producerCandidate = getPlatformAiProducerCandidate(producerSelectionPlayer, producerStudioId);
    if (!producerCandidate) return recordCommissioningFailure(input, platform, plan, 'PRODUCER_UNAVAILABLE');
    const productionSkill = platform.ai!.competence.production;
    const commissioningTarget = roundMillions(plan.productionFundingMillions * 0.05);
    const alreadyPaid = Math.min(commissioningTarget, roundMillions(plan.paidSpendMillions));
    const additionalDepositDue = roundMillions(commissioningTarget - alreadyPaid);
    const reserveQuote = getPlatformAiProductionReserveQuote(plan.productionFundingMillions);
    const reserveFundingDue = roundMillions(reserveQuote.marketingMillions + reserveQuote.contingencyMillions);
    const totalCommissioningDue = roundMillions(additionalDepositDue + reserveFundingDue);
    if (platform.cashReserve < totalCommissioningDue) {
        return recordCommissioningFailure(input, platform, plan, 'INSUFFICIENT_CASH');
    }
    const executionSeed = createDeterministicRng(`${input.player.id}:${input.platformId}:${plan.id}:${stableProductionId}:EXECUTION`);
    executionSeed();
    const delayRoll = roundRoll(executionSeed());
    const delayRisk = clamp(0.34 - (productionSkill - 7) * 0.055, 0.12, 0.34);
    const delayWeeks = delayRoll < delayRisk ? 1 + Math.floor(roundRoll(createDeterministicRng(`${input.player.id}:${input.platformId}:${plan.id}:${stableProductionId}:EXECUTION`)()) * 3) : 0;
    const effectiveDurationWeeks = getPlatformAiProductionDuration(STANDARD_PRODUCTION_WEEKS, productionSkill, 'AI');
    const productionCalendar = buildPlatformAiProductionCalendar(effectiveDurationWeeks, delayWeeks, input.absoluteWeek);
    const talent = selectPlatformAiTalent({
        player: input.player,
        platformId: input.platformId,
        canonicalProjectId: stableCanonicalProjectId,
        genre: plan.genre,
        productionCalendar,
        bookings: input.world.talentBookings,
        releaseMemory: platform.ai!.releaseMemory,
    });
    if (!talent) return recordCommissioningFailure(input, platform, plan, 'TALENT_UNAVAILABLE');
    const reservation = reserveProjectTalentBookings({
        bookings: input.world.talentBookings,
        projectId: stableCanonicalProjectId,
        projectOwner: 'INDUSTRY_PRODUCTION',
        producerStudioId,
        commissioningPlatformId: input.platformId,
        productionCalendar,
        actorIds: [talent.leadActor.id],
        directorIds: [talent.director.id],
        allowOverlaps: true,
    });

    const writerName = `${producerCandidate.name} Story Department`;
    const execution = createExecutionRecord({
        player: input.player,
        platformId: input.platformId,
        plan,
        productionId: stableProductionId,
        leadActorId: talent.leadActor.id,
        leadActorName: talent.leadActor.name,
        directorId: talent.director.id,
        directorName: talent.director.name,
        writerName,
        productionSkill,
        absoluteWeek: input.absoluteWeek,
    });
    execution.paidMilestoneIds = ['COMMISSIONING'];
    const production: IndustryProductionCommitment = {
        id: stableProductionId,
        canonicalProjectId: stableCanonicalProjectId,
        title: plan.title,
        projectType: plan.projectType,
        genre: plan.genre,
        producerStudioId,
        commissioningPlatformId: input.platformId,
        platformContentPlanId: plan.id,
        status: 'PRE_PRODUCTION',
        productionCalendar,
        budgetMillions: plan.productionFundingMillions,
        paidMillions: commissioningTarget,
        talentBookingIds: reservation.bookingIds,
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName,
        writerSkill: clamp(Math.round(platform.ai!.competence.creative * 10), 1, 100),
        aiExecution: execution,
        createdAtAbsoluteWeek: input.absoluteWeek,
        updatedAtAbsoluteWeek: input.absoluteWeek,
    };
    const committedPlan: PlatformAiContentPlan = {
        ...plan,
        status: 'IN_PRODUCTION',
        commissionId: createDeterministicId('platform_ai_commission', input.platformId, plan.id),
        sourceStudioId: producerStudioId,
        industryProductionId: production.id,
        paidSpendMillions: roundMillions(plan.paidSpendMillions + totalCommissioningDue),
        marketingReserveMillions: reserveQuote.marketingMillions,
        contingencyMillions: reserveQuote.contingencyMillions,
        productionEscrow: {
            status: 'FUNDED',
            fundingId: getPlatformAiProductionEscrowFundingId(input.platformId, plan.id),
            marketingCampaignMillions: reserveQuote.marketingMillions,
            marketingBalanceMillions: reserveQuote.marketingMillions,
            contingencyBalanceMillions: reserveQuote.contingencyMillions,
            fundedAtAbsoluteWeek: input.absoluteWeek,
            settledAtAbsoluteWeek: null,
            settlementReason: null,
        },
        commissioningLifecycle: plan.commissioningLifecycle ? {
            ...plan.commissioningLifecycle,
            status: 'COMMISSIONED',
            attemptCount: Math.min(PLATFORM_AI_COMMISSIONING_RETRY_WEEKS, plan.commissioningLifecycle.attemptCount + 1),
            lastAttemptAtAbsoluteWeek: input.absoluteWeek,
            lastFailureReason: null,
            depositEscrowMillions: 0,
            depositRefundedAtAbsoluteWeek: null,
        } : null,
    };
    const producerState = input.world.studios?.[producerStudioId] || {
        id: producerStudioId,
        name: producerCandidate.name,
        valuation: producerCandidate.valuation,
        reputation: 70,
        cashReserve: 0,
        recentHits: 0,
        archetype: producerCandidate.archetype,
    };
    const nextProducerCashReserve = roundMillions(producerState.cashReserve + commissioningTarget);
    const nextPlatform = {
        ...platform,
        cashReserve: roundMillions(platform.cashReserve - totalCommissioningDue),
        ai: {
            ...platform.ai!,
            slate: platform.ai!.slate.map(item => item.id === plan.id ? committedPlan : item),
            talentBookingRefs: [...new Set([...platform.ai!.talentBookingRefs, ...reservation.bookingIds])].sort(),
            decisionHistory: appendPlatformAiDecisions(platform.ai!.decisionHistory, [{
                id: createDeterministicId('platform_ai_decision', input.platformId, plan.id, 'ORIGINAL_COMMISSION'),
                absoluteWeek: input.absoluteWeek,
                type: 'ORIGINAL_COMMISSION',
                summary: `${platform.name} commissioned ${plan.title}.`,
                reason: `${producerCandidate.name} received the physical production mandate.`,
                cashImpactMillions: -totalCommissioningDue,
            }]),
        },
    };
    const nextWorld: WorldState = {
        ...input.world,
        talentBookings: reservation.bookings,
        industryProductions: { ...(input.world.industryProductions || {}), [production.id]: production },
        platforms: { ...input.world.platforms, [input.platformId]: nextPlatform },
        studios: {
            ...(input.world.studios || {}),
            [producerStudioId]: { ...producerState, cashReserve: nextProducerCashReserve },
        },
        npcVentures: producerCandidate.isDynamicVenture && input.world.npcVentures?.[producerStudioId]
            ? {
                ...input.world.npcVentures,
                [producerStudioId]: {
                    ...input.world.npcVentures[producerStudioId],
                    cashReserve: nextProducerCashReserve,
                },
            }
            : input.world.npcVentures,
    };
    return { world: nextWorld, changed: true, plan: committedPlan, production };
};
