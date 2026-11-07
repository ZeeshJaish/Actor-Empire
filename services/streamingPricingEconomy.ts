import type {
    OwnedStreamingPlatformState,
    OwnedStreamingPricingConfiguration,
    OwnedStreamingPricingPlan,
    StreamingBillingPath,
    StreamingCommercialCoreModel,
    StreamingCommercialOfferBenefit,
    StreamingCommercialOfferIntent,
    StreamingPlanAdLevel,
    StreamingRevenueStreamId,
} from '../types';
import {
    STREAMING_MAX_PLANS,
    STREAMING_PLAN_AD_LEVELS,
    applyStreamingPlanOfferFeatures,
    normalizeStreamingPlanOffer,
} from './streamingPlanOffer';

export const STREAMING_MINIMUM_PAID_PLAN_PRICE = .99;
export const STREAMING_MAXIMUM_PLAN_PRICE = 100;
/** #103 (plan §18.3): one range for the store's prices, wherever they are set; the top edition (#47) a little above */
export const STREAMING_STORE_RENT_MAX = 12;
export const STREAMING_STORE_BUY_MAX = 30;
export const STREAMING_STORE_TOP_RENT_MAX = 20;
export const STREAMING_STORE_TOP_BUY_MAX = 40;
export const STREAMING_INTRO_OFFER_WEEKS = 13;
export const STREAMING_ANNUAL_BILLING_SHARE = .33;
/** Pay yearly (#71): the discount at which the market's one in three pays yearly. */
export const STREAMING_REFERENCE_ANNUAL_DISCOUNT = 15;
/* How deep a discount may go. A year off every tier is a standing decision, so
   it stays inside what real services do; an introductory offer is time-boxed
   and routinely extreme — 70 to 90 per cent off the first months is ordinary
   promotional practice. Both are floored by the minimum paid price below, and
   both are paid for by the affordability and demand curves in the world model,
   so a player may be as reckless as they like and will feel it. */
export const STREAMING_MAXIMUM_ANNUAL_DISCOUNT = 50;
export const STREAMING_MAXIMUM_INTRO_OFFER = 90;
/** A standard break is one 30-second spot. The saved value remains ad minutes
    per eligible viewing hour, so old non-preset and zero-load saves stay exact. */
export const STREAMING_AD_INTERVAL_PRESETS = [5, 10, 15, 20, 30] as const;
export const adMinutesPerHourForInterval = (intervalMinutes: number): number => (
    Number.isFinite(intervalMinutes) && intervalMinutes > 0
        ? Math.round(30 / intervalMinutes * 100) / 100 : 0
);
export const adIntervalForMinutesPerHour = (minutesPerHour: number): number | null => (
    STREAMING_AD_INTERVAL_PRESETS.find(interval =>
        Math.abs(adMinutesPerHourForInterval(interval) - minutesPerHour) < .0001) ?? null
);

const round2 = (value: number): number => Math.round(value * 100) / 100;
const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

const normalizeBenefit = (value: unknown): StreamingCommercialOfferBenefit => {
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown> : {};
    return {
        premiumAccess: source.premiumAccess === true,
        earlyAccessWeeks: Math.round(clamp(Number(source.earlyAccessWeeks), 0, 4)),
    };
};

const normalizeCommercialOffers = (
    value: unknown,
    streams: StreamingRevenueStreamId[],
    plans: OwnedStreamingPricingPlan[],
): StreamingCommercialOfferIntent => {
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown> : {};
    const passes = source.adFreePasses && typeof source.adFreePasses === 'object'
        ? source.adFreePasses as Record<string, unknown> : {};
    const benefits = source.benefits && typeof source.benefits === 'object'
        ? source.benefits as Record<string, unknown> : {};
    const savedPlans = benefits.plans && typeof benefits.plans === 'object' && !Array.isArray(benefits.plans)
        ? benefits.plans as Record<string, unknown> : {};
    const storeEligibility = source.storeEligibility && typeof source.storeEligibility === 'object'
        ? source.storeEligibility as Record<string, unknown> : {};
    const inferredCore: StreamingCommercialCoreModel = streams.includes('subs') && plans.length
        ? 'SUBSCRIPTION' : streams.includes('ads') ? 'ADVERTISING'
            : streams.includes('rentals') ? 'STORE' : 'LEGACY';
    const requestedCore = source.coreModel;
    const inactiveAdPlans = source.inactiveAdPlans && typeof source.inactiveAdPlans === 'object'
        ? source.inactiveAdPlans as Record<string, { monthly?: unknown; adLevel?: unknown }> : {};
    const coreModel: StreamingCommercialCoreModel = requestedCore === 'SUBSCRIPTION' && streams.includes('subs') && plans.length
        ? 'SUBSCRIPTION' : requestedCore === 'ADVERTISING' && streams.includes('ads')
            ? 'ADVERTISING' : requestedCore === 'STORE' && streams.includes('rentals')
                ? 'STORE' : inferredCore;
    const passPrice = (price: unknown): number | null => (
        typeof price === 'number' && Number.isFinite(price) && price > 0
            ? normalizeStreamingPlanPrice(price, false) : null
    );
    return {
        schemaVersion: 1,
        coreModelSelected: source.coreModelSelected !== false,
        inactiveAdPlans: Object.fromEntries(plans.flatMap(plan => {
            const monthly = inactiveAdPlans[plan.id]?.monthly;
            // #103: with the plan's ad level, so it comes back as it was
            const adLevel = inactiveAdPlans[plan.id]?.adLevel;
            return typeof monthly === 'number' && Number.isFinite(monthly) && monthly >= 0
                ? [[plan.id, {
                    monthly: normalizeStreamingPlanPrice(monthly, true),
                    ...(adLevel !== 'NONE' && STREAMING_PLAN_AD_LEVELS.includes(adLevel as StreamingPlanAdLevel) ? { adLevel: adLevel as StreamingPlanAdLevel } : {}),
                }]] : [];
        })),
        coreModel,
        freeAdAccess: streams.includes('ads') && (coreModel === 'ADVERTISING' || (typeof source.freeAdAccess === 'boolean'
            ? source.freeAdAccess : (!streams.includes('subs') || plans.some(plan => plan.ads && plan.monthly === 0)))),
        storeEligibility: storeEligibility.kind === 'MEMBERSHIP_PLANS' || (source.storeEligibility !== undefined
            && storeEligibility.kind !== 'PUBLIC')
            ? { kind: 'MEMBERSHIP_PLANS', planIds: [...new Set(Array.isArray(storeEligibility.planIds)
                ? storeEligibility.planIds.filter((id): id is string => typeof id === 'string'
                    && plans.some(plan => plan.id === id && plan.monthly > 0)) : [])] }
            : { kind: 'PUBLIC', planIds: [] },
        adFreePasses: {
            oneHourPrice: passPrice(passes.oneHourPrice),
            dayPrice: passPrice(passes.dayPrice),
        },
        benefits: {
            plans: Object.fromEntries(plans.filter(plan => savedPlans[plan.id] !== undefined)
                .map(plan => [plan.id, normalizeBenefit(savedPlans[plan.id])])),
            freeAds: normalizeBenefit(benefits.freeAds),
            store: normalizeBenefit(benefits.store),
        },
    };
};

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
    /* #103 (Zeesh: "ऑफर का नया रोल ठीक है", plan §18.3): ads on a paid plan belong to that plan, and Free with ads is
       the free tier alone, so turning the free tier off no longer takes the ads off "Basic with ads". The ads stream
       follows from the two: on while the free tier is open or a plan on sale has ads (it took every plan's ads away
       when it went off). */
    const requested = [...new Set(pricing.streams)].slice(0, 8) as StreamingRevenueStreamId[];
    const source = pricing.commercialOffers as Partial<StreamingCommercialOfferIntent> | undefined;
    /* the free tier as the offer intent reads it below: with the ads stream, when Free with ads is the main offer
       (chosen, or the service's only way to earn) or the saved choice (or an old save's free plan) opens it */
    const subscriptionsSold = requested.includes('subs') && pricing.plans.length > 0;
    const leading = source?.coreModel === 'SUBSCRIPTION' && subscriptionsSold ? 'SUBSCRIPTION'
        : source?.coreModel === 'ADVERTISING' && requested.includes('ads') ? 'ADVERTISING'
            : source?.coreModel === 'STORE' && requested.includes('rentals') ? 'STORE'
                : subscriptionsSold ? 'SUBSCRIPTION' : requested.includes('ads') ? 'ADVERTISING' : 'OTHER';
    const freeTier = requested.includes('ads') && (leading === 'ADVERTISING' || (typeof source?.freeAdAccess === 'boolean'
        ? source.freeAdAccess : !requested.includes('subs') || pricing.plans.some(plan => plan.ads === true && Number(plan.monthly) === 0)));
    /* while subscriptions are off a plan is not on sale, so its ads wait with it (remembered with their level in
       inactiveAdPlans) and come back with it: every reader sees an ad plan only beside an ads stream */
    const subscriptionsOn = requested.includes('subs');
    const planAds = subscriptionsOn && pricing.plans.some(plan => plan.ads === true);
    const streams: StreamingRevenueStreamId[] = [...requested.filter(stream => stream !== 'ads'), ...(freeTier || planAds ? ['ads' as const] : [])];
    const plans = pricing.plans.slice(0, STREAMING_MAX_PLANS).map((plan, index): OwnedStreamingPricingPlan => {
        const ads = subscriptionsOn && plan.ads === true;
        /* Plans v2 (Phase 2): an offer, checked row by row, and an ad level on an ad plan. The
           plan's features follow its offer, so engines reading features see the same plan. */
        const offer = normalizeStreamingPlanOffer(plan.offer);
        const adLevel = ads && plan.adLevel && plan.adLevel !== 'NONE' && STREAMING_PLAN_AD_LEVELS.includes(plan.adLevel)
            ? plan.adLevel : undefined;
        const { offer: _offer, adLevel: _adLevel, ...rest } = plan;
        return {
            ...rest,
            id: String(plan.id || `PLAN_${index + 1}`).slice(0, 50),
            name: String(plan.name || `Plan ${index + 1}`).slice(0, 40),
            monthly: normalizeStreamingPlanPrice(Number(plan.monthly), ads),
            featureIds: (() => {
                const saved = [...new Set((Array.isArray(plan.featureIds) ? plan.featureIds : []).map(String))];
                // with an offer, its features go after the plan's own and "noads" last, so a second pass writes the same list
                const ids = offer ? applyStreamingPlanOfferFeatures(saved.filter(id => id !== 'noads'), offer) : saved;
                const resolved = ids.filter(id => !(
                    (id === 'hd' && ids.includes('uhd'))
                    || (id === 'streams2' && (ids.includes('streams4') || ids.includes('streams6')))
                    || (id === 'streams4' && ids.includes('streams6'))
                    || (id === 'noads' && ads)
                ));
                if (!ads && !resolved.includes('noads')) resolved.push('noads');
                return resolved.slice(0, 20);
            })(),
            ads,
            ...(adLevel ? { adLevel } : {}),
            ...(offer ? { offer } : {}),
        };
    });
    /* An offer aimed at a plan that no longer exists is an offer on every plan,
       which is the same thing the field defaults to. */
    const introOfferPlanId = pricing.introOfferPlanId && plans.some(plan => plan.id === pricing.introOfferPlanId)
        ? pricing.introOfferPlanId
        : undefined;
    const offerIntent = normalizeCommercialOffers(pricing.commercialOffers, streams, plans);
    // #103: the ad plans waiting while subscriptions are off (see above)
    const waiting = subscriptionsOn ? [] : pricing.plans.slice(0, STREAMING_MAX_PLANS).flatMap((plan, index) => (plan.ads === true ? [[plans[index].id, {
        monthly: normalizeStreamingPlanPrice(Number(plan.monthly), true),
        ...(plan.adLevel && plan.adLevel !== 'NONE' && STREAMING_PLAN_AD_LEVELS.includes(plan.adLevel) ? { adLevel: plan.adLevel } : {}),
    }] as const] : []));
    const commercialOffers: StreamingCommercialOfferIntent = waiting.length
        ? { ...offerIntent, inactiveAdPlans: { ...offerIntent.inactiveAdPlans, ...Object.fromEntries(waiting) } }
        : offerIntent;
    const canonicalPlans = plans.map(plan => {
        const benefit = commercialOffers.benefits.plans[plan.id];
        const early = Boolean(benefit?.premiumAccess && benefit.earlyAccessWeeks > 0);
        return { ...plan, featureIds: [
            ...plan.featureIds.filter(id => id !== 'early'),
            ...(early ? ['early'] : []),
        ] };
    });
    // Free with ads' and Rent or buy's own quality (#46, #47): kept when every row is a real
    // step, else dropped; the store's top edition when both its prices are real.
    const { freeAdOffer: rawFreeAdOffer, storeQuality: rawStoreQuality, storeTopEdition: rawTopEdition, ...rest } = pricing;
    const freeAdOffer = normalizeStreamingPlanOffer(rawFreeAdOffer);
    const storeQuality = normalizeStreamingPlanOffer(rawStoreQuality);
    const topRent = normalizeStreamingTransactionPrice(Number(rawTopEdition?.rent));
    const topBuy = normalizeStreamingTransactionPrice(Number(rawTopEdition?.buy));
    const storeTopEdition = rawTopEdition && topRent > 0 && topBuy > 0 ? { rent: topRent, buy: topBuy } : undefined;
    return {
        ...rest,
        ...(freeAdOffer ? { freeAdOffer } : {}),
        ...(storeQuality ? { storeQuality } : {}),
        ...(storeTopEdition ? { storeTopEdition } : {}),
        streams,
        plans: canonicalPlans,
        commercialOffers,
        annualDiscount: round2(clamp(pricing.annualDiscount, 0, STREAMING_MAXIMUM_ANNUAL_DISCOUNT)),
        introOffer: round2(clamp(pricing.introOffer, 0, STREAMING_MAXIMUM_INTRO_OFFER)),
        introOfferPlanId,
        // Money has a cent quantum. A positive sub-cent quote cannot debit
        // zero cents while the revenue path still earns fractional dollars.
        rentals:{...pricing.rentals,rent:normalizeStreamingTransactionPrice(pricing.rentals.rent),
            buy:normalizeStreamingTransactionPrice(pricing.rentals.buy)},
        premium:{...pricing.premium,price:normalizeStreamingTransactionPrice(pricing.premium.price)},
        daypass:{...pricing.daypass,price:normalizeStreamingTransactionPrice(pricing.daypass.price)},
        metered:{...pricing.metered,perHour:normalizeStreamingTransactionPrice(pricing.metered.perHour)},
        patron:{...pricing.patron,monthly:normalizeStreamingTransactionPrice(pricing.patron.monthly)},
    };
};

const normalizeStreamingTransactionPrice = (value:number):number => {
    const price=clamp(value,0,1_000_000);
    return price>0?Math.max(.01,round2(price)):0;
};

/** Does the introductory offer apply to this plan? Undefined targeting means
    every plan, so this is the one place that decision is made. */
export const streamingIntroOfferAppliesTo = (
    planId: string,
    introOfferPlanId?: string,
): boolean => !introOfferPlanId || introOfferPlanId === planId;

/** Pay yearly (#71): the share of subscribers who pay yearly at a discount. The odds that one does grow in
    step with the discount for paying up front: at 15% they are `share`'s (the market's one in three, or a
    cohort's own split), twice the discount is twice the odds (30% off about one in two, 50% off about three
    in five), and with nothing off nobody pays yearly. */
export const streamingAnnualBillingShare = (
    discountPercent: number,
    share = STREAMING_ANNUAL_BILLING_SHARE,
): number => {
    const discount = clamp(discountPercent, 0, STREAMING_MAXIMUM_ANNUAL_DISCOUNT);
    if (discount === STREAMING_REFERENCE_ANNUAL_DISCOUNT || share <= 0 || share >= 1) return share;
    const odds = share / (1 - share) * discount / STREAMING_REFERENCE_ANNUAL_DISCOUNT;
    return odds / (1 + odds);
};

export const effectiveMonthlyStreamingPlanPrice = (
    monthly: number,
    annualDiscountPercent: number,
    introOfferPercent: number,
    weeksSinceOfferStart: number,
    introApplies = true,
    /** who pays yearly: the market's one in three, or the player's at its discount (#71) */
    annualShare = STREAMING_ANNUAL_BILLING_SHARE,
): number => {
    const listPrice = round2(clamp(monthly, 0, STREAMING_MAXIMUM_PLAN_PRICE));
    const annual = streamingDiscountedMonthly(listPrice, annualDiscountPercent, STREAMING_MAXIMUM_ANNUAL_DISCOUNT);
    const intro = introApplies && weeksSinceOfferStart < STREAMING_INTRO_OFFER_WEEKS
        ? streamingDiscountedMonthly(listPrice, introOfferPercent, STREAMING_MAXIMUM_INTRO_OFFER)
        : listPrice;
    return round2(
        annualShare * annual
        + (1 - annualShare) * intro,
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
    /** who pays yearly: the market's one in three, or the player's at its discount (#71) */
    annualShare = STREAMING_ANNUAL_BILLING_SHARE,
): number => {
    const listPrice = round2(clamp(monthly, 0, STREAMING_MAXIMUM_PLAN_PRICE));
    const annualRevenue = streamingDiscountedMonthly(listPrice, annualDiscountPercent, STREAMING_MAXIMUM_ANNUAL_DISCOUNT) * 12;
    const introMonthly = introApplies
        ? streamingDiscountedMonthly(listPrice, introOfferPercent, STREAMING_MAXIMUM_INTRO_OFFER)
        : listPrice;
    const monthlyRevenue = introMonthly * 3 + listPrice * 9;
    return round2(
        annualRevenue * annualShare
        + monthlyRevenue * (1 - annualShare)
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
            true,
            streamingAnnualBillingShare(pricing.annualDiscount),
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
