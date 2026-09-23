import type {
    OwnedStreamingPlatformState,
    OwnedStreamingPricingConfiguration,
    OwnedStreamingPricingPlan,
    StreamingBillingPath,
    StreamingRevenueStreamId,
} from '../types';

export const STREAMING_MINIMUM_PAID_PLAN_PRICE = .99;
export const STREAMING_MAXIMUM_PLAN_PRICE = 100;
export const STREAMING_INTRO_OFFER_WEEKS = 13;
export const STREAMING_ANNUAL_BILLING_SHARE = .33;
/* How deep a discount may go. A year off every tier is a standing decision, so
   it stays inside what real services do; an introductory offer is time-boxed
   and routinely extreme — 70 to 90 per cent off the first months is ordinary
   promotional practice. Both are floored by the minimum paid price below, and
   both are paid for by the affordability and demand curves in the world model,
   so a player may be as reckless as they like and will feel it. */
export const STREAMING_MAXIMUM_ANNUAL_DISCOUNT = 50;
export const STREAMING_MAXIMUM_INTRO_OFFER = 90;

const round2 = (value: number): number => Math.round(value * 100) / 100;
const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

export const normalizeStreamingPlanPrice = (value: number, canBeFree: boolean): number => {
    const minimum = canBeFree ? 0 : STREAMING_MINIMUM_PAID_PLAN_PRICE;
    return round2(clamp(Number(value), minimum, STREAMING_MAXIMUM_PLAN_PRICE));
};

/** What a household pays a month on one billing path. A discount may never take
    a paid plan below the least the game lets anyone charge; a free ad-funded
    tier stays free. */
export const streamingDiscountedMonthly = (listPrice: number, discountPercent: number, maximumPercent: number): number => {
    if (listPrice <= 0) return 0;
    const cut = listPrice * (1 - clamp(discountPercent, 0, maximumPercent) / 100);
    return round2(Math.max(STREAMING_MINIMUM_PAID_PLAN_PRICE, cut));
};

export const normalizeStreamingPricingConfiguration = (
    pricing: OwnedStreamingPricingConfiguration,
): OwnedStreamingPricingConfiguration => {
    const streams = [...new Set(pricing.streams)].slice(0, 8) as StreamingRevenueStreamId[];
    const advertisingEnabled = streams.includes('ads');
    const plans = pricing.plans.slice(0, 6).map((plan, index): OwnedStreamingPricingPlan => {
        const ads = advertisingEnabled && plan.ads === true;
        return {
            ...plan,
            id: String(plan.id || `PLAN_${index + 1}`).slice(0, 50),
            name: String(plan.name || `Plan ${index + 1}`).slice(0, 40),
            monthly: normalizeStreamingPlanPrice(Number(plan.monthly), ads),
            featureIds: [...new Set(plan.featureIds.map(String))].slice(0, 20),
            ads,
        };
    });
    /* An offer aimed at a plan that no longer exists is an offer on every plan,
       which is the same thing the field defaults to. */
    const introOfferPlanId = pricing.introOfferPlanId && plans.some(plan => plan.id === pricing.introOfferPlanId)
        ? pricing.introOfferPlanId
        : undefined;
    return {
        ...pricing,
        streams,
        plans,
        annualDiscount: round2(clamp(pricing.annualDiscount, 0, STREAMING_MAXIMUM_ANNUAL_DISCOUNT)),
        introOffer: round2(clamp(pricing.introOffer, 0, STREAMING_MAXIMUM_INTRO_OFFER)),
        introOfferPlanId,
    };
};

/** Does the introductory offer apply to this plan? Undefined targeting means
    every plan, so this is the one place that decision is made. */
export const streamingIntroOfferAppliesTo = (
    planId: string,
    introOfferPlanId?: string,
): boolean => !introOfferPlanId || introOfferPlanId === planId;

export const effectiveMonthlyStreamingPlanPrice = (
    monthly: number,
    annualDiscountPercent: number,
    introOfferPercent: number,
    weeksSinceOfferStart: number,
    introApplies = true,
): number => {
    const listPrice = round2(clamp(monthly, 0, STREAMING_MAXIMUM_PLAN_PRICE));
    const annual = streamingDiscountedMonthly(listPrice, annualDiscountPercent, STREAMING_MAXIMUM_ANNUAL_DISCOUNT);
    const intro = introApplies && weeksSinceOfferStart < STREAMING_INTRO_OFFER_WEEKS
        ? streamingDiscountedMonthly(listPrice, introOfferPercent, STREAMING_MAXIMUM_INTRO_OFFER)
        : listPrice;
    return round2(
        STREAMING_ANNUAL_BILLING_SHARE * annual
        + (1 - STREAMING_ANNUAL_BILLING_SHARE) * intro,
    );
};

/** The actual monthly-equivalent price charged on one billing path. */
export const streamingBillingPathPrice = (
    monthly: number,
    annualDiscountPercent: number,
    introOfferPercent: number,
    weeksSinceOfferStart: number,
    path: StreamingBillingPath,
    introApplies = true,
): number => {
    const listPrice = round2(clamp(monthly, 0, STREAMING_MAXIMUM_PLAN_PRICE));
    if (path === 'ANNUAL') {
        return streamingDiscountedMonthly(listPrice, annualDiscountPercent, STREAMING_MAXIMUM_ANNUAL_DISCOUNT);
    }
    return introApplies && weeksSinceOfferStart < STREAMING_INTRO_OFFER_WEEKS
        ? streamingDiscountedMonthly(listPrice, introOfferPercent, STREAMING_MAXIMUM_INTRO_OFFER)
        : listPrice;
};

export const firstYearStreamingPlanRevenuePerSubscriber = (
    monthly: number,
    annualDiscountPercent: number,
    introOfferPercent: number,
    introApplies = true,
): number => {
    const listPrice = round2(clamp(monthly, 0, STREAMING_MAXIMUM_PLAN_PRICE));
    const annualRevenue = streamingDiscountedMonthly(listPrice, annualDiscountPercent, STREAMING_MAXIMUM_ANNUAL_DISCOUNT) * 12;
    const introMonthly = introApplies
        ? streamingDiscountedMonthly(listPrice, introOfferPercent, STREAMING_MAXIMUM_INTRO_OFFER)
        : listPrice;
    const monthlyRevenue = introMonthly * 3 + listPrice * 9;
    return round2(
        annualRevenue * STREAMING_ANNUAL_BILLING_SHARE
        + monthlyRevenue * (1 - STREAMING_ANNUAL_BILLING_SHARE)
    );
};

const configuredPlans = (platform: Pick<OwnedStreamingPlatformState, 'serviceConfiguration' | 'subscriptionPrices'>): OwnedStreamingPricingPlan[] => {
    const pricing = platform.serviceConfiguration.pricing;
    if (platform.serviceConfiguration.source !== 'UNCONFIGURED' && pricing.streams.includes('subs') && pricing.plans.length) {
        return normalizeStreamingPricingConfiguration(pricing).plans;
    }
    return Object.entries(platform.subscriptionPrices).map(([id, monthly]) => ({
        id,
        name: id,
        monthly: normalizeStreamingPlanPrice(monthly, false),
        featureIds: [],
        ads: false,
    }));
};

export const getStreamingEntryPrice = (
    platform: Pick<OwnedStreamingPlatformState, 'serviceConfiguration' | 'subscriptionPrices'>,
): number => {
    const plans = configuredPlans(platform);
    return plans.length ? Math.min(...plans.map(plan => plan.monthly)) : 0;
};

export const getStreamingBlendedMonthlyPrice = (
    platform: Pick<OwnedStreamingPlatformState, 'serviceConfiguration' | 'subscriptionPrices'>,
): number => {
    const pricing = normalizeStreamingPricingConfiguration(platform.serviceConfiguration.pricing);
    const plans = configuredPlans(platform);
    if (!plans.length) return 0;
    const weights = plans.map(plan => Math.max(.1, 1 + plan.featureIds.length * .12 - (plan.ads ? .08 : 0)));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const weeksSinceOfferStart = STREAMING_INTRO_OFFER_WEEKS;
    return round2(plans.reduce((sum, plan, index) => (
        sum + effectiveMonthlyStreamingPlanPrice(
            plan.monthly,
            pricing.annualDiscount,
            pricing.introOffer,
            weeksSinceOfferStart,
        ) * weights[index]
    ), 0) / totalWeight);
};

export interface StreamingFundingPressure {
    availableCash: number;
    fundedCost: number;
    unfundedCost: number;
    fundingCoverage: number;
    technologyHealthPenalty: number;
    distressed: boolean;
}

export const calculateStreamingFundingPressure = (input: {
    treasuryBefore: number;
    operatingRevenue: number;
    operatingCost: number;
}): StreamingFundingPressure => {
    const availableCash = Math.max(0, input.treasuryBefore) + Math.max(0, input.operatingRevenue);
    const operatingCost = Math.max(0, input.operatingCost);
    const fundedCost = Math.min(availableCash, operatingCost);
    const unfundedCost = round2(Math.max(0, operatingCost - fundedCost));
    const fundingCoverage = operatingCost > 0 ? clamp(fundedCost / operatingCost, 0, 1) : 1;
    return {
        availableCash: round2(availableCash),
        fundedCost: round2(fundedCost),
        unfundedCost,
        fundingCoverage,
        technologyHealthPenalty: round2((1 - fundingCoverage) * 18),
        distressed: unfundedCost > 0,
    };
};
