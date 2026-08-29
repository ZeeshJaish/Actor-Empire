import type {
    Business,
    Genre,
    IndustryProductionCommitment,
    PlatformAiPlayerCommissionOffer,
    PlatformFundingRelationship,
    PlatformId,
    Player,
    ProductionCalendar,
    ProjectType,
    StudioId,
    TargetAudience,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { releaseProjectTalentBookings } from '../talentBookings';
import { selectPlatformAiProducer } from './platformAiCommissioning';
import { createPlatformCommissionBriefReference } from './platformAiPlayerCommissionPresentation';
import { getPlatformAiSpendingRestrictions } from './platformAiFinancing';

const FULL_CURRENCY_PER_MILLION = 1_000_000;
const GREENLIGHT_FEE_SHARE = 0.25;
const DEFAULT_DELIVERY_ALLOWANCE_WEEKS = 40;
const OFFER_LIFETIME_WEEKS = 4;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const roundMoney = (value: number): number => Math.max(0, Math.round(value));
const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 100) / 100;
const OFFER_STATUSES = new Set<PlatformAiPlayerCommissionOffer['status']>([
    'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'GREENLIT', 'IN_PRODUCTION', 'DELIVERED', 'TRANSFERRED', 'CANCELLED',
]);

export const normalizePlatformAiPlayerCommissionOffers = (
    value: unknown,
    maxAbsoluteWeek = Number.MAX_SAFE_INTEGER,
): Record<string, PlatformAiPlayerCommissionOffer> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.values(value as Record<string, unknown>)
        .filter((raw): raw is Record<string, unknown> => Boolean(raw && typeof raw === 'object' && !Array.isArray(raw)))
        .map(raw => {
            const id = String(raw.id || '').trim();
            const platformId = String(raw.platformId || '') as PlatformId;
            const platformName = String(raw.platformName || '').trim();
            const platformContentPlanId = String(raw.platformContentPlanId || '').trim();
            const title = String(raw.title || '').trim();
            const projectType = raw.projectType === 'SERIES' ? 'SERIES' as const : raw.projectType === 'MOVIE' ? 'MOVIE' as const : null;
            const genre = String(raw.genre || '').trim() as Genre;
            if (!id || !platformId || !platformName || !platformContentPlanId || !title || !projectType || !genre) return null;
            const status = OFFER_STATUSES.has(raw.status as PlatformAiPlayerCommissionOffer['status'])
                ? raw.status as PlatformAiPlayerCommissionOffer['status']
                : 'PENDING';
            const safeWeek = (candidate: unknown): number | null => candidate === null || candidate === undefined
                ? null
                : Math.max(0, Math.round(Number(candidate) || 0));
            const createdAtAbsoluteWeek = Math.min(maxAbsoluteWeek, safeWeek(raw.createdAtAbsoluteWeek) || 0);
            return {
                id,
                platformId,
                platformName,
                platformContentPlanId,
                briefReference: typeof raw.briefReference === 'string' && raw.briefReference.trim()
                    ? raw.briefReference.trim()
                    : createPlatformCommissionBriefReference(platformName, id),
                title,
                projectType,
                genre,
                ...(raw.targetAudience ? { targetAudience: raw.targetAudience as TargetAudience } : {}),
                status,
                productionBudget: roundMoney(Number(raw.productionBudget || 0)),
                producerFee: roundMoney(Number(raw.producerFee || 0)),
                producerFeePaid: roundMoney(Number(raw.producerFeePaid || 0)),
                productionBudgetReturned: roundMoney(Number(raw.productionBudgetReturned || 0)),
                minimumImdbRating: Math.round(clamp(Number(raw.minimumImdbRating || 7), 1, 10) * 10) / 10,
                deliveryAllowanceWeeks: Math.max(DEFAULT_DELIVERY_ALLOWANCE_WEEKS, Math.round(Number(raw.deliveryAllowanceWeeks || DEFAULT_DELIVERY_ALLOWANCE_WEEKS))),
                createdAtAbsoluteWeek,
                expiresAtAbsoluteWeek: Math.max(createdAtAbsoluteWeek, safeWeek(raw.expiresAtAbsoluteWeek) ?? createdAtAbsoluteWeek + OFFER_LIFETIME_WEEKS),
                acceptedAtAbsoluteWeek: safeWeek(raw.acceptedAtAbsoluteWeek),
                greenlitAtAbsoluteWeek: safeWeek(raw.greenlitAtAbsoluteWeek),
                deliveredAtAbsoluteWeek: safeWeek(raw.deliveredAtAbsoluteWeek),
                deliveryDeadlineAtAbsoluteWeek: safeWeek(raw.deliveryDeadlineAtAbsoluteWeek),
                cooldownUntilAbsoluteWeek: safeWeek(raw.cooldownUntilAbsoluteWeek),
                studioId: raw.studioId ? String(raw.studioId) : null,
                scriptId: raw.scriptId ? String(raw.scriptId) : null,
                commitmentId: raw.commitmentId ? String(raw.commitmentId) : null,
                canonicalProductionId: raw.canonicalProductionId ? String(raw.canonicalProductionId) : null,
                finalQualityScore: raw.finalQualityScore === null || raw.finalQualityScore === undefined ? null : clamp(Math.round(Number(raw.finalQualityScore) || 0), 1, 100),
                deliveredImdbRating: raw.deliveredImdbRating === null || raw.deliveredImdbRating === undefined ? null : Math.round(clamp(Number(raw.deliveredImdbRating) || 0, 0, 10) * 10) / 10,
                releasedAtAbsoluteWeek: null,
            } satisfies PlatformAiPlayerCommissionOffer;
        })
        .filter((offer): offer is PlatformAiPlayerCommissionOffer => Boolean(offer))
        .sort((left, right) => left.id.localeCompare(right.id))
        .reduce<Record<string, PlatformAiPlayerCommissionOffer>>((registry, offer) => {
            registry[offer.id] = offer;
            return registry;
        }, {});
};

const getOffers = (player: Player): Record<string, PlatformAiPlayerCommissionOffer> => normalizePlatformAiPlayerCommissionOffers(player.world.platformAiPlayerCommissionOffers);
const getStudio = (player: Player, studioId: string): Business | null => (
    player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE' && business.studioState) || null
);

export const hasEligiblePlayerProductionStudio = (player: Player, platformId?: PlatformId): boolean => (
    player.businesses.some(studio => {
        if (studio.type !== 'PRODUCTION_HOUSE' || !studio.isActive || !studio.studioState) return false;
        if (studio.stats.brandHealth < 40) return false;
        if (!platformId) return true;
        return Number(studio.studioState.platformRelations?.[platformId]?.recoveryWeeksRemaining || 0) <= 0;
    })
);

export const hasOpenPlayerCommissionForPlan = (
    world: Player['world'],
    planId: string,
    absoluteWeek = Number.MAX_SAFE_INTEGER,
): boolean => Object.values(world.platformAiPlayerCommissionOffers || {}).some(offer => (
    offer.platformContentPlanId === planId
    && ['PENDING', 'ACCEPTED', 'GREENLIT', 'IN_PRODUCTION'].includes(offer.status)
    && (offer.status !== 'PENDING' || offer.expiresAtAbsoluteWeek >= absoluteWeek)
));

const normalizeRelationship = (value?: PlatformFundingRelationship): PlatformFundingRelationship => ({
    trustModifier: Number(value?.trustModifier || 0),
    recoveryWeeksRemaining: Math.max(0, Math.round(Number(value?.recoveryWeeksRemaining || 0))),
    ...(value?.lastBreachWeek !== undefined ? { lastBreachWeek: value.lastBreachWeek } : {}),
    ...(value?.lastBreachYear !== undefined ? { lastBreachYear: value.lastBreachYear } : {}),
    completedDeals: Math.max(0, Math.round(Number(value?.completedDeals || 0))),
    profitableDeals: Math.max(0, Math.round(Number(value?.profitableDeals || 0))),
    loyaltyScore: clamp(Number(value?.loyaltyScore || 0), 0, 100),
    realizedPartnerValue: Math.max(0, Number(value?.realizedPartnerValue || 0)),
});

const replaceOffer = (player: Player, offer: PlatformAiPlayerCommissionOffer): Player => ({
    ...player,
    world: {
        ...player.world,
        platformAiPlayerCommissionOffers: { ...getOffers(player), [offer.id]: offer },
    },
});

const updateStudio = (player: Player, studioId: string, updater: (studio: Business) => Business): Player => ({
    ...player,
    businesses: player.businesses.map(studio => studio.id === studioId ? updater(studio) : studio),
});

export const calculatePlatformAiPlayerProducerFee = (input: {
    player: Player;
    platformId: PlatformId;
    productionBudget: number;
}): number => {
    const studios = input.player.businesses.filter(business => business.type === 'PRODUCTION_HOUSE' && business.studioState);
    const best = studios.sort((left, right) => (right.stats.brandHealth + right.stats.customerSatisfaction) - (left.stats.brandHealth + left.stats.customerSatisfaction))[0];
    const relation = best?.studioState?.platformRelations?.[input.platformId];
    const successfulDeliveries = Math.max(0, Number(relation?.profitableDeals || 0));
    const trackRecordBonus = clamp(successfulDeliveries * 0.005, 0, 0.02);
    const trustBonus = clamp(Number(relation?.trustModifier || 0) * 0.001, -0.01, 0.01);
    const brandBonus = clamp(((best?.stats.brandHealth || 50) - 50) / 5_000, -0.005, 0.005);
    return roundMoney(input.productionBudget * clamp(0.085 + trackRecordBonus + trustBonus + brandBonus, 0.08, 0.12));
};

export interface CreatePlatformAiPlayerCommissionOfferInput {
    player: Player;
    platformId: PlatformId;
    planId: string;
    title: string;
    projectType: ProjectType;
    genre: Genre;
    targetAudience?: TargetAudience;
    productionFundingMillions: number;
    minimumImdbRating?: number;
    absoluteWeek: number;
}

export interface PlatformAiPlayerCommissionResult {
    player: Player;
    changed: boolean;
    offer: PlatformAiPlayerCommissionOffer | null;
    studioId?: string;
    reason?: 'PLATFORM_NOT_FOUND' | 'PLATFORM_FINANCIAL_RESTRICTION' | 'DUPLICATE' | 'OFFER_COOLDOWN' | 'OFFER_NOT_FOUND' | 'NOT_PENDING' | 'NOT_ACCEPTED' | 'NOT_GREENLIT' | 'ALREADY_DELIVERED' | 'STUDIO_NOT_FOUND' | 'INSUFFICIENT_PLATFORM_CASH' | 'OVER_BUDGET_CAP' | 'BRIEF_MISMATCH' | 'COMMITMENT_MISMATCH' | 'TRANSFER_NOT_ALLOWED' | 'PRODUCER_UNAVAILABLE';
}

export const createPlatformAiPlayerCommissionOffer = (
    input: CreatePlatformAiPlayerCommissionOfferInput,
): PlatformAiPlayerCommissionResult => {
    const platform = input.player.world.platforms?.[input.platformId];
    if (!platform) return { player: input.player, changed: false, offer: null, reason: 'PLATFORM_NOT_FOUND' };
    if (getPlatformAiSpendingRestrictions(platform, input.absoluteWeek).blocksNewGreenlights) {
        return { player: input.player, changed: false, offer: null, reason: 'PLATFORM_FINANCIAL_RESTRICTION' };
    }
    const id = createDeterministicId('player_platform_commission', input.platformId, input.planId);
    const existing = getOffers(input.player)[id];
    if (existing) return { player: input.player, changed: false, offer: existing, reason: 'DUPLICATE' };
    const activeCooldown = input.player.businesses.some(studio => (
        studio.type === 'PRODUCTION_HOUSE'
        && Number(studio.studioState?.platformRelations?.[input.platformId]?.recoveryWeeksRemaining || 0) > 0
    ));
    if (activeCooldown) return { player: input.player, changed: false, offer: null, reason: 'OFFER_COOLDOWN' };
    const productionBudget = roundMoney(input.productionFundingMillions * FULL_CURRENCY_PER_MILLION);
    const producerFee = calculatePlatformAiPlayerProducerFee({ player: input.player, platformId: input.platformId, productionBudget });
    const minimumImdbRating = Math.round(clamp(Number(input.minimumImdbRating ?? 7), 5.5, 9) * 10) / 10;
    const briefReference = createPlatformCommissionBriefReference(platform.name, id);
    const offer: PlatformAiPlayerCommissionOffer = {
        id,
        platformId: input.platformId,
        platformName: platform.name,
        platformContentPlanId: input.planId,
        briefReference,
        title: input.title,
        projectType: input.projectType,
        genre: input.genre,
        ...(input.targetAudience ? { targetAudience: input.targetAudience } : {}),
        status: 'PENDING',
        productionBudget,
        producerFee,
        producerFeePaid: 0,
        productionBudgetReturned: 0,
        minimumImdbRating,
        deliveryAllowanceWeeks: DEFAULT_DELIVERY_ALLOWANCE_WEEKS,
        createdAtAbsoluteWeek: input.absoluteWeek,
        expiresAtAbsoluteWeek: input.absoluteWeek + OFFER_LIFETIME_WEEKS,
        acceptedAtAbsoluteWeek: null,
        greenlitAtAbsoluteWeek: null,
        deliveredAtAbsoluteWeek: null,
        deliveryDeadlineAtAbsoluteWeek: null,
        cooldownUntilAbsoluteWeek: null,
        studioId: null,
        scriptId: null,
        commitmentId: null,
        canonicalProductionId: null,
        finalQualityScore: null,
        deliveredImdbRating: null,
        releasedAtAbsoluteWeek: null,
    };
    const player = replaceOffer({
        ...input.player,
        inbox: [{
            id: `message_${id}`,
            sender: `${platform.name} Originals`,
            subject: `${briefReference}: production offer`,
            text: `${platform.name} wants your studio to produce a ${input.genre.toLowerCase()} ${input.projectType.toLowerCase()}. Production cap: $${input.productionFundingMillions.toFixed(1)}M. Producer fee: $${(producerFee / FULL_CURRENCY_PER_MILLION).toFixed(1)}M. Expected minimum: ${minimumImdbRating.toFixed(1)} IMDb. The deadline will include a fair buffer after Greenlight.`,
            type: 'OFFER_PLATFORM_COMMISSION',
            data: { offerId: id },
            isRead: false,
            weekSent: input.player.currentWeek,
            expiresIn: OFFER_LIFETIME_WEEKS,
        }, ...input.player.inbox],
    }, offer);
    return { player, changed: true, offer };
};

export const expirePlatformAiPlayerCommissionOffers = (player: Player, absoluteWeek: number): Player => {
    const offers = getOffers(player);
    const expiredIds = Object.values(offers)
        .filter(offer => offer.status === 'PENDING' && offer.expiresAtAbsoluteWeek < absoluteWeek)
        .map(offer => offer.id);
    if (!expiredIds.length) return player;
    const expiredSet = new Set(expiredIds);
    return {
        ...player,
        inbox: player.inbox.filter(message => !expiredSet.has(String(message.data?.offerId || ''))),
        world: {
            ...player.world,
            platformAiPlayerCommissionOffers: Object.fromEntries(Object.entries(offers).map(([id, offer]) => [
                id,
                expiredSet.has(id) ? { ...offer, status: 'EXPIRED' as const } : offer,
            ])),
        },
    };
};

export const generatePlatformAiPlayerCommissionOffers = (
    sourcePlayer: Player,
    absoluteWeek: number,
): { player: Player; changed: boolean; offer: PlatformAiPlayerCommissionOffer | null } => {
    let player = expirePlatformAiPlayerCommissionOffers(sourcePlayer, absoluteWeek);
    const candidate = (Object.entries(player.world.platforms || {}) as Array<[PlatformId, NonNullable<Player['world']['platforms']>[PlatformId]]>)
        .flatMap(([platformId, platform]) => (platform.ai?.slate || []).map(plan => ({ platformId, platform, plan })))
        .filter(({ platformId, platform, plan }) => (
            platform.ai?.status === 'ACTIVE'
            && plan.source === 'COMMISSIONED_ORIGINAL'
            && plan.status === 'BRIEF'
            && plan.commissioningLifecycle?.status === 'PENDING'
            && hasEligiblePlayerProductionStudio(player, platformId)
            && !Object.values(getOffers(player)).some(offer => offer.platformContentPlanId === plan.id)
        ))
        .sort((left, right) => left.plan.id.localeCompare(right.plan.id))[0];
    if (!candidate) return { player, changed: player !== sourcePlayer, offer: null };
    const creative = clamp(Number(candidate.platform.ai?.competence?.creative || 7), 1, 10);
    const minimumImdbRating = Math.round(clamp(6.1 + creative * 0.12, 6.2, 7.8) * 10) / 10;
    const created = createPlatformAiPlayerCommissionOffer({
        player,
        platformId: candidate.platformId,
        planId: candidate.plan.id,
        title: candidate.plan.title,
        projectType: candidate.plan.projectType,
        genre: candidate.plan.genre,
        targetAudience: candidate.plan.targetAudience,
        productionFundingMillions: candidate.plan.productionFundingMillions,
        minimumImdbRating,
        absoluteWeek,
    });
    return { player: created.player, changed: created.changed || player !== sourcePlayer, offer: created.offer };
};

export const acceptPlatformAiPlayerCommission = (input: {
    player: Player;
    offerId: string;
    studioId: string;
    absoluteWeek: number;
}): PlatformAiPlayerCommissionResult => {
    const offer = getOffers(input.player)[input.offerId];
    if (!offer) return { player: input.player, changed: false, offer: null, reason: 'OFFER_NOT_FOUND' };
    if (offer.status !== 'PENDING') return { player: input.player, changed: false, offer, reason: 'NOT_PENDING' };
    const studio = getStudio(input.player, input.studioId);
    if (!studio) return { player: input.player, changed: false, offer, reason: 'STUDIO_NOT_FOUND' };
    const platform = input.player.world.platforms?.[offer.platformId];
    if (!platform) return { player: input.player, changed: false, offer, reason: 'PLATFORM_NOT_FOUND' };
    const platformPlan = platform.ai?.slate.find(plan => plan.id === offer.platformContentPlanId);
    const existingDepositMillions = roundMillions(platformPlan?.commissioningLifecycle?.depositEscrowMillions || 0);
    const reserveMillions = roundMillions(Math.max(
        0,
        (offer.productionBudget + offer.producerFee) / FULL_CURRENCY_PER_MILLION - existingDepositMillions,
    ));
    if (platform.cashReserve + 1e-9 < reserveMillions) {
        return { player: input.player, changed: false, offer, reason: 'INSUFFICIENT_PLATFORM_CASH' };
    }
    const accepted: PlatformAiPlayerCommissionOffer = {
        ...offer,
        status: 'ACCEPTED',
        studioId: studio.id,
        acceptedAtAbsoluteWeek: input.absoluteWeek,
    };
    let player = replaceOffer({
        ...input.player,
        inbox: input.player.inbox.filter(message => message.data?.offerId !== offer.id),
        world: {
            ...input.player.world,
            platforms: {
                ...input.player.world.platforms!,
                [offer.platformId]: { ...platform, cashReserve: roundMillions(platform.cashReserve - reserveMillions) },
            },
        },
    }, accepted);
    player = updateStudio(player, studio.id, current => ({
        ...current,
        studioState: {
            ...current.studioState!,
            lockedStreamingFunds: [
                ...(current.studioState!.lockedStreamingFunds || []).filter(funding => funding.playerPlatformCommissionOfferId !== offer.id),
                {
                    id: `funding_${offer.id}`,
                    platformId: offer.platformId,
                    platformName: offer.platformName,
                    amount: offer.productionBudget,
                    sourceProjectId: offer.id,
                    sourceTitle: offer.title,
                    projectType: offer.projectType,
                    createdWeek: player.currentWeek,
                    createdYear: player.age,
                    fundingSource: 'AI_PLATFORM_COMMISSION',
                    playerPlatformCommissionOfferId: offer.id,
                    fixedBudgetCap: true,
                },
            ],
        },
    }));
    return { player, changed: true, offer: accepted, studioId: studio.id };
};

export const declinePlatformAiPlayerCommission = (input: {
    player: Player;
    offerId: string;
    absoluteWeek: number;
}): PlatformAiPlayerCommissionResult => {
    void input.absoluteWeek;
    const offer = getOffers(input.player)[input.offerId];
    if (!offer) return { player: input.player, changed: false, offer: null, reason: 'OFFER_NOT_FOUND' };
    if (offer.status !== 'PENDING') return { player: input.player, changed: false, offer, reason: 'NOT_PENDING' };
    const declined = { ...offer, status: 'DECLINED' as const };
    return {
        player: replaceOffer({ ...input.player, inbox: input.player.inbox.filter(message => message.data?.offerId !== offer.id) }, declined),
        changed: true,
        offer: declined,
    };
};

export const finalizePlatformAiPlayerCommissionGreenlight = (input: {
    player: Player;
    offerId: string;
    studioId: string;
    commitmentId: string;
    projectTitle: string;
    projectType: ProjectType;
    genre: Genre;
    scriptId: string;
    packageBudget: number;
    productionCalendar: ProductionCalendar;
    finalQualityScore: number;
    absoluteWeek: number;
    fundingAlreadyApplied?: boolean;
}): PlatformAiPlayerCommissionResult => {
    const offer = getOffers(input.player)[input.offerId];
    if (!offer) return { player: input.player, changed: false, offer: null, reason: 'OFFER_NOT_FOUND' };
    if (offer.status !== 'ACCEPTED' || offer.studioId !== input.studioId) return { player: input.player, changed: false, offer, reason: 'NOT_ACCEPTED' };
    if (offer.projectType !== input.projectType || offer.genre !== input.genre) return { player: input.player, changed: false, offer, reason: 'BRIEF_MISMATCH' };
    if (roundMoney(input.packageBudget) > offer.productionBudget) return { player: input.player, changed: false, offer, reason: 'OVER_BUDGET_CAP' };
    const studio = getStudio(input.player, input.studioId);
    if (!studio) return { player: input.player, changed: false, offer, reason: 'STUDIO_NOT_FOUND' };
    const unused = roundMoney(offer.productionBudget - input.packageBudget);
    const greenlightFee = roundMoney(offer.producerFee * GREENLIGHT_FEE_SHARE);
    const allowance = Math.max(offer.deliveryAllowanceWeeks, Math.round(input.productionCalendar.totalWeeks) + 6);
    const canonicalProductionId = createDeterministicId('industry_player_commission', offer.platformId, offer.platformContentPlanId);
    const canonicalProjectId = createDeterministicId('player_commission_project', offer.platformId, offer.platformContentPlanId);
    const production: IndustryProductionCommitment = {
        id: canonicalProductionId,
        canonicalProjectId,
        title: input.projectTitle,
        projectType: input.projectType,
        genre: input.genre,
        producerStudioId: input.studioId as StudioId,
        commissioningPlatformId: offer.platformId,
        platformContentPlanId: offer.platformContentPlanId,
        status: 'PRE_PRODUCTION',
        productionCalendar: { ...input.productionCalendar, startedAbsoluteWeek: input.absoluteWeek },
        budgetMillions: roundMillions(input.packageBudget / FULL_CURRENCY_PER_MILLION),
        paidMillions: roundMillions(input.packageBudget / FULL_CURRENCY_PER_MILLION),
        talentBookingIds: (input.player.world.talentBookings || [])
            .filter(booking => booking.projectId === input.commitmentId)
            .map(booking => booking.id),
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: `${studio.name} Story Department`,
        writerSkill: clamp(Math.round(studio.studioState?.departments?.writing || 50), 1, 100),
        createdAtAbsoluteWeek: input.absoluteWeek,
        updatedAtAbsoluteWeek: input.absoluteWeek,
    };
    const greenlit: PlatformAiPlayerCommissionOffer = {
        ...offer,
        status: 'GREENLIT',
        title: input.projectTitle,
        scriptId: input.scriptId,
        commitmentId: input.commitmentId,
        canonicalProductionId,
        greenlitAtAbsoluteWeek: input.absoluteWeek,
        deliveryAllowanceWeeks: allowance,
        deliveryDeadlineAtAbsoluteWeek: input.absoluteWeek + allowance,
        producerFeePaid: greenlightFee,
        productionBudgetReturned: unused,
        finalQualityScore: clamp(Math.round(input.finalQualityScore), 1, 100),
    };
    const platform = input.player.world.platforms?.[offer.platformId];
    const platformPlan = platform?.ai?.slate.find(plan => plan.id === offer.platformContentPlanId);
    let player = replaceOffer({
        ...input.player,
        commitments: input.player.commitments.map(commitment => commitment.id === input.commitmentId && commitment.projectDetails ? {
            ...commitment,
            projectDetails: {
                ...commitment.projectDetails,
                hiddenStats: {
                    ...commitment.projectDetails.hiddenStats,
                    playerPlatformCommissionOfferId: offer.id,
                    playerPlatformCommissionMinimumImdb: offer.minimumImdbRating,
                    playerPlatformCommissionDeadlineAbsoluteWeek: input.absoluteWeek + allowance,
                    platformId: offer.platformId,
                },
            },
        } : commitment),
        world: {
            ...input.player.world,
            platforms: platform ? {
                ...input.player.world.platforms!,
                [offer.platformId]: {
                    ...platform,
                    cashReserve: roundMillions(platform.cashReserve + (input.fundingAlreadyApplied ? 0 : unused / FULL_CURRENCY_PER_MILLION)),
                    ...(platform.ai ? {
                        ai: {
                            ...platform.ai,
                            slate: platform.ai.slate.map(plan => plan.id === offer.platformContentPlanId ? {
                                ...plan,
                                title: input.projectTitle,
                                status: 'IN_PRODUCTION',
                                sourceStudioId: input.studioId as StudioId,
                                industryProductionId: canonicalProductionId,
                                commissionId: offer.id,
                                paidSpendMillions: roundMillions((input.packageBudget + offer.producerFee) / FULL_CURRENCY_PER_MILLION),
                                ...(platformPlan?.commissioningLifecycle ? {
                                    commissioningLifecycle: {
                                        ...platformPlan.commissioningLifecycle,
                                        status: 'COMMISSIONED',
                                        lastAttemptAtAbsoluteWeek: input.absoluteWeek,
                                        lastFailureReason: null,
                                        depositEscrowMillions: 0,
                                    },
                                } : {}),
                            } : plan),
                        },
                    } : {}),
                },
            } : input.player.world.platforms,
            industryProductions: { ...(input.player.world.industryProductions || {}), [canonicalProductionId]: production },
        },
    }, greenlit);
    player = updateStudio(player, studio.id, current => ({
        ...current,
        balance: current.balance + greenlightFee,
        stats: {
            ...current.stats,
            weeklyRevenue: current.stats.weeklyRevenue + greenlightFee,
            weeklyProfit: current.stats.weeklyProfit + greenlightFee,
            lifetimeRevenue: current.stats.lifetimeRevenue + greenlightFee,
        },
        studioState: {
            ...current.studioState!,
            lockedStreamingFunds: (current.studioState!.lockedStreamingFunds || []).filter(funding => funding.playerPlatformCommissionOfferId !== offer.id),
            financeLedger: [{
                id: `producer_fee_greenlight_${offer.id}`,
                week: player.currentWeek,
                year: player.age,
                amount: greenlightFee,
                type: 'STREAMING_DEAL' as const,
                label: `${offer.platformName} producer fee - Greenlight milestone`,
                projectId: input.commitmentId,
            }, ...(current.studioState!.financeLedger || [])].slice(0, 200),
        },
    }));
    return { player, changed: true, offer: greenlit, studioId: studio.id };
};

export const settlePlatformAiPlayerCommissionDelivery = (input: {
    player: Player;
    offerId: string;
    commitmentId: string;
    finalQualityScore: number;
    absoluteWeek: number;
}): PlatformAiPlayerCommissionResult => {
    const offer = getOffers(input.player)[input.offerId];
    if (!offer) return { player: input.player, changed: false, offer: null, reason: 'OFFER_NOT_FOUND' };
    if (offer.status === 'DELIVERED') return { player: input.player, changed: false, offer, reason: 'ALREADY_DELIVERED' };
    if (offer.status !== 'GREENLIT' && offer.status !== 'IN_PRODUCTION') return { player: input.player, changed: false, offer, reason: 'NOT_GREENLIT' };
    if (offer.commitmentId !== input.commitmentId) return { player: input.player, changed: false, offer, reason: 'COMMITMENT_MISMATCH' };
    const studio = offer.studioId ? getStudio(input.player, offer.studioId) : null;
    if (!studio) return { player: input.player, changed: false, offer, reason: 'STUDIO_NOT_FOUND' };
    const finalQualityScore = clamp(Math.round(input.finalQualityScore), 1, 100);
    const deliveredImdbRating = Math.round((finalQualityScore / 10) * 10) / 10;
    const miss = offer.minimumImdbRating - deliveredImdbRating;
    const severeMiss = miss >= 2;
    const metTarget = miss <= 0;
    const cooldownWeeks = severeMiss
        ? 15 + Math.floor(createDeterministicRng(`${input.player.id}:${offer.id}:QUALITY_COOLDOWN`)() * 16)
        : 0;
    const delivered: PlatformAiPlayerCommissionOffer = {
        ...offer,
        status: 'DELIVERED',
        deliveredAtAbsoluteWeek: input.absoluteWeek,
        producerFeePaid: offer.producerFee,
        finalQualityScore,
        deliveredImdbRating,
        cooldownUntilAbsoluteWeek: cooldownWeeks > 0 ? input.absoluteWeek + cooldownWeeks : null,
        releasedAtAbsoluteWeek: null,
    };
    const remainingFee = roundMoney(offer.producerFee - offer.producerFeePaid);
    const platform = input.player.world.platforms?.[offer.platformId];
    let player = replaceOffer({
        ...input.player,
        world: {
            ...input.player.world,
            platforms: platform?.ai ? {
                ...input.player.world.platforms!,
                [offer.platformId]: {
                    ...platform,
                    ai: {
                        ...platform.ai,
                        slate: platform.ai.slate.map(plan => plan.id === offer.platformContentPlanId ? {
                            ...plan,
                            status: 'DELIVERED',
                            rightsReadyAtAbsoluteWeek: input.absoluteWeek,
                            releasedAtAbsoluteWeek: null,
                        } : plan),
                    },
                },
            } : input.player.world.platforms,
            industryProductions: offer.canonicalProductionId ? {
                ...(input.player.world.industryProductions || {}),
                [offer.canonicalProductionId]: {
                    ...input.player.world.industryProductions?.[offer.canonicalProductionId],
                    status: 'DELIVERED',
                    updatedAtAbsoluteWeek: input.absoluteWeek,
                } as IndustryProductionCommitment,
            } : input.player.world.industryProductions,
            talentBookings: releaseProjectTalentBookings(
                input.player.world.talentBookings,
                input.commitmentId,
                input.absoluteWeek,
            ),
        },
        news: severeMiss ? [{
            id: `platform_commission_quality_${offer.id}`,
            headline: `${offer.platformName} disappointed by ${offer.title}`,
            subtext: `${studio.name} delivered a ${deliveredImdbRating.toFixed(1)} result against a ${offer.minimumImdbRating.toFixed(1)} expectation. Future commissions are on hold.`,
            category: 'INDUSTRY' as const,
            week: input.player.currentWeek,
            year: input.player.age,
            impactLevel: 'MEDIUM' as const,
            projectId: input.commitmentId,
        }, ...input.player.news] : input.player.news,
    }, delivered);
    player = updateStudio(player, studio.id, current => {
        const relationship = normalizeRelationship(current.studioState!.platformRelations?.[offer.platformId]);
        const trustDelta = metTarget ? 2 : severeMiss ? -4 : -1;
        return {
            ...current,
            balance: current.balance + remainingFee,
            stats: {
                ...current.stats,
                weeklyRevenue: current.stats.weeklyRevenue + remainingFee,
                weeklyProfit: current.stats.weeklyProfit + remainingFee,
                lifetimeRevenue: current.stats.lifetimeRevenue + remainingFee,
            },
            studioState: {
                ...current.studioState!,
                platformRelations: {
                    ...(current.studioState!.platformRelations || {}),
                    [offer.platformId]: {
                        ...relationship,
                        trustModifier: clamp(relationship.trustModifier + trustDelta, -20, 20),
                        recoveryWeeksRemaining: cooldownWeeks,
                        ...(severeMiss ? { lastBreachWeek: player.currentWeek, lastBreachYear: player.age } : {}),
                        completedDeals: (relationship.completedDeals || 0) + 1,
                        profitableDeals: (relationship.profitableDeals || 0) + (metTarget ? 1 : 0),
                        loyaltyScore: clamp((relationship.loyaltyScore || 0) + (metTarget ? 8 : severeMiss ? -12 : -3), 0, 100),
                        realizedPartnerValue: (relationship.realizedPartnerValue || 0) + finalQualityScore,
                    },
                },
                financeLedger: [{
                    id: `producer_fee_delivery_${offer.id}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: remainingFee,
                    type: 'STREAMING_DEAL' as const,
                    label: `${offer.platformName} producer fee - Delivery milestone`,
                    projectId: input.commitmentId,
                }, ...(current.studioState!.financeLedger || [])].slice(0, 200),
            },
        };
    });
    return { player, changed: true, offer: delivered, studioId: studio.id };
};

export const transferPlatformAiPlayerCommission = (input: {
    player: Player;
    offerId: string;
    absoluteWeek: number;
}): PlatformAiPlayerCommissionResult => {
    const offer = getOffers(input.player)[input.offerId];
    if (!offer) return { player: input.player, changed: false, offer: null, reason: 'OFFER_NOT_FOUND' };
    if (!['ACCEPTED', 'GREENLIT', 'IN_PRODUCTION'].includes(offer.status) || !offer.studioId) {
        return { player: input.player, changed: false, offer, reason: 'TRANSFER_NOT_ALLOWED' };
    }
    const studio = getStudio(input.player, offer.studioId);
    const platform = input.player.world.platforms?.[offer.platformId];
    if (!studio) return { player: input.player, changed: false, offer, reason: 'STUDIO_NOT_FOUND' };
    if (!platform) return { player: input.player, changed: false, offer, reason: 'PLATFORM_NOT_FOUND' };

    const commitment = offer.commitmentId ? input.player.commitments.find(item => item.id === offer.commitmentId) : undefined;
    const isStarted = Boolean(commitment && offer.canonicalProductionId);
    const replacementProducerId = isStarted ? selectPlatformAiProducer({
        player: input.player,
        platformId: offer.platformId,
        planId: offer.platformContentPlanId,
        preferredStudioId: null,
        genre: offer.genre,
        budgetMillions: offer.productionBudget / FULL_CURRENCY_PER_MILLION,
    }) : null;
    if (isStarted && !replacementProducerId) return { player: input.player, changed: false, offer, reason: 'PRODUCER_UNAVAILABLE' };

    const reservedRefund = offer.status === 'ACCEPTED'
        ? offer.productionBudget + offer.producerFee
        : Math.max(0, offer.producerFee - offer.producerFeePaid);
    const cooldownWeeks = 20 + Math.floor(createDeterministicRng(`${input.player.id}:${offer.id}:TRANSFER_COOLDOWN`)() * 11);
    const transferred: PlatformAiPlayerCommissionOffer = {
        ...offer,
        status: 'TRANSFERRED',
        cooldownUntilAbsoluteWeek: input.absoluteWeek + cooldownWeeks,
    };
    const sourceProduction = offer.canonicalProductionId
        ? input.player.world.industryProductions?.[offer.canonicalProductionId]
        : undefined;
    const calendar = commitment?.productionCalendar || sourceProduction?.productionCalendar;
    const transferredProduction = sourceProduction && calendar && replacementProducerId ? {
        ...sourceProduction,
        producerStudioId: replacementProducerId,
        productionCalendar: calendar,
        status: commitment?.projectPhase === 'POST_PRODUCTION' ? 'POST_PRODUCTION' as const
            : commitment?.projectPhase === 'PRODUCTION' ? 'PRODUCTION' as const
                : 'PRE_PRODUCTION' as const,
        paidMillions: sourceProduction.budgetMillions,
        aiExecution: {
            standardDurationWeeks: calendar.totalWeeks,
            effectiveDurationWeeks: calendar.totalWeeks,
            qualityForecast: clamp(Math.round(Number(commitment?.projectDetails?.hiddenStats?.qualityScore || offer.finalQualityScore || 50)), 1, 100),
            executionRoll: 0.5,
            delayRoll: 0.5,
            overrunRoll: 0.5,
            failureRoll: 0.5,
            delayWeeks: 0,
            overrunMillions: 0,
            leadActorId: commitment?.projectDetails?.castList?.find(member => !member.isPlayer)?.npcId || null,
            leadActorName: commitment?.projectDetails?.castList?.find(member => !member.isPlayer)?.name || null,
            directorId: commitment?.projectDetails?.directorId || null,
            directorName: commitment?.projectDetails?.directorName || null,
            writerId: null,
            writerName: sourceProduction.writerName,
            finalQuality: null,
            failureDecision: 'NONE' as const,
            failureResponse: 'NONE' as const,
            failureResponseAmountMillions: 0,
            failureResponseAppliedAtAbsoluteWeek: null,
            paidMilestoneIds: ['COMMISSIONING', 'PROGRESS_35', 'PROGRESS_70', 'DELIVERY'] as Array<'COMMISSIONING' | 'PROGRESS_35' | 'PROGRESS_70' | 'DELIVERY'>,
            controllerAtLastProgression: 'AI' as const,
            lastProgressedAbsoluteWeek: input.absoluteWeek,
            holdReason: null,
        },
        updatedAtAbsoluteWeek: input.absoluteWeek,
    } : null;
    const relation = normalizeRelationship(studio.studioState!.platformRelations?.[offer.platformId]);
    let player = replaceOffer({
        ...input.player,
        commitments: offer.commitmentId ? input.player.commitments.filter(item => item.id !== offer.commitmentId) : input.player.commitments,
        world: {
            ...input.player.world,
            platforms: {
                ...input.player.world.platforms!,
                [offer.platformId]: {
                    ...platform,
                    cashReserve: roundMillions(platform.cashReserve + reservedRefund / FULL_CURRENCY_PER_MILLION),
                    ...(platform.ai ? {
                        ai: {
                            ...platform.ai,
                            slate: platform.ai.slate.map(plan => plan.id === offer.platformContentPlanId ? {
                                ...plan,
                                status: isStarted ? 'IN_PRODUCTION' : 'BRIEF',
                                sourceStudioId: isStarted ? replacementProducerId : null,
                                industryProductionId: isStarted ? offer.canonicalProductionId : null,
                                paidSpendMillions: roundMillions(Math.max(0, plan.paidSpendMillions - reservedRefund / FULL_CURRENCY_PER_MILLION)),
                                ...(!isStarted && plan.commissioningLifecycle ? {
                                    commissioningLifecycle: {
                                        ...plan.commissioningLifecycle,
                                        status: 'PENDING',
                                        depositEscrowMillions: 0,
                                        lastFailureReason: 'PLAYER_HANDOFF',
                                        nextAttemptAtAbsoluteWeek: input.absoluteWeek + 1,
                                    },
                                } : {}),
                            } : plan),
                        },
                    } : {}),
                },
            },
            industryProductions: transferredProduction && offer.canonicalProductionId ? {
                ...(input.player.world.industryProductions || {}),
                [offer.canonicalProductionId]: transferredProduction,
            } : input.player.world.industryProductions,
        },
        news: [{
            id: `platform_commission_transfer_${offer.id}`,
            headline: `${studio.name} exits ${offer.platformName} commission`,
            subtext: isStarted
                ? `${offer.title} moved to another producer. The studio keeps earned milestone fees but loses future commission trust.`
                : `${offer.title} returned to the platform before Greenlight. Future offers are temporarily paused.`,
            category: 'INDUSTRY' as const,
            week: input.player.currentWeek,
            year: input.player.age,
            impactLevel: 'MEDIUM' as const,
            ...(offer.commitmentId ? { projectId: offer.commitmentId } : {}),
        }, ...input.player.news].slice(0, 80),
    }, transferred);
    player = updateStudio(player, studio.id, current => ({
        ...current,
        studioState: {
            ...current.studioState!,
            lockedStreamingFunds: (current.studioState!.lockedStreamingFunds || []).filter(funding => funding.playerPlatformCommissionOfferId !== offer.id),
            platformRelations: {
                ...(current.studioState!.platformRelations || {}),
                [offer.platformId]: {
                    ...relation,
                    trustModifier: clamp(relation.trustModifier - (isStarted ? 5 : 3), -20, 20),
                    recoveryWeeksRemaining: cooldownWeeks,
                    lastBreachWeek: player.currentWeek,
                    lastBreachYear: player.age,
                    loyaltyScore: clamp((relation.loyaltyScore || 0) - (isStarted ? 15 : 8), 0, 100),
                },
            },
        },
    }));
    return { player, changed: true, offer: transferred, studioId: studio.id };
};

/** Advances player-produced originals from the existing Production House phases into platform delivery. */
export const syncPlatformAiPlayerCommissionProductions = (
    sourcePlayer: Player,
    absoluteWeek: number,
): Player => {
    let player = sourcePlayer;
    const offers = Object.values(getOffers(player))
        .filter(offer => ['GREENLIT', 'IN_PRODUCTION'].includes(offer.status) && offer.commitmentId)
        .sort((left, right) => left.id.localeCompare(right.id));
    for (const offerSnapshot of offers) {
        const offer = getOffers(player)[offerSnapshot.id];
        const commitment = player.commitments.find(item => item.id === offer.commitmentId);
        if (!commitment) continue;
        if (commitment.projectPhase === 'AWAITING_RELEASE') {
            const baseQuality = Number(commitment.projectDetails?.hiddenStats?.qualityScore || offer.finalQualityScore || 50);
            const execution = Number(commitment.productionPerformance ?? 50);
            const finalQualityScore = clamp(Math.round(baseQuality * 0.8 + execution * 0.2), 1, 100);
            const settled = settlePlatformAiPlayerCommissionDelivery({
                player,
                offerId: offer.id,
                commitmentId: commitment.id,
                finalQualityScore,
                absoluteWeek,
            });
            if (settled.changed) {
                player = {
                    ...settled.player,
                    commitments: settled.player.commitments.filter(item => item.id !== commitment.id),
                    logs: [{
                        week: settled.player.currentWeek,
                        year: settled.player.age,
                        message: `Delivered ${offer.title} to ${offer.platformName}. The title now waits in the platform's post-delivery pipeline.`,
                        type: 'positive' as const,
                    }, ...(settled.player.logs || [])].slice(0, 80),
                };
            }
            continue;
        }
        if (offer.status === 'GREENLIT' && ['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION'].includes(String(commitment.projectPhase))) {
            player = replaceOffer(player, { ...offer, status: 'IN_PRODUCTION' });
        }
    }
    return player;
};
