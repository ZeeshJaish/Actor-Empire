import type {
    OwnedStreamingPricingConfiguration,
    OwnedStreamingPricingPlan,
    StreamingCommercialCoreModel,
    StreamingCommercialOfferBenefit,
    StreamingRevenueStreamId,
} from '../types';
import { normalizeStreamingPlanPrice, normalizeStreamingPricingConfiguration } from './streamingPricingEconomy';

export interface StreamingCommercialOfferProjection {
    schemaVersion: 1;
    coreModel: StreamingCommercialCoreModel;
    subscriptions: (OwnedStreamingPricingPlan & { benefits: StreamingCommercialOfferBenefit })[];
    freeAdOffer: ({ price: 0; adMinutesPerHour: number; benefits: StreamingCommercialOfferBenefit }) | null;
    storeOffer: ({ rent: number; buy: number; windowWeeks: number; benefits: StreamingCommercialOfferBenefit;
        eligibility: { kind: 'PUBLIC' | 'MEMBERSHIP_PLANS'; planIds: string[] } }) | null;
    adFreePasses: { oneHourPrice: number | null; dayPrice: number | null };
}

const noBenefit = (): StreamingCommercialOfferBenefit => ({ premiumAccess: false, earlyAccessWeeks: 0 });

const rememberAdPlans = (pricing: OwnedStreamingPricingConfiguration) => ({
    ...pricing.commercialOffers?.inactiveAdPlans,
    ...Object.fromEntries(pricing.plans.filter(plan => plan.ads).map(plan => [plan.id, { monthly: plan.monthly }])),
});
const restoreAdPlans = (pricing: OwnedStreamingPricingConfiguration) => pricing.plans.map(plan => {
    const saved = pricing.commercialOffers?.inactiveAdPlans?.[plan.id];
    if (!saved || pricing.streams.includes('ads')) return plan;
    return { ...plan, ads: true,
        // An intentional price edit while ads were off takes precedence.
        monthly: plan.monthly === normalizeStreamingPlanPrice(saved.monthly, false) ? saved.monthly : plan.monthly };
});

/** A read-only offer view; it does not grant title access or settle revenue. */
export const projectStreamingCommercialOffers = (
    pricing: OwnedStreamingPricingConfiguration,
): StreamingCommercialOfferProjection => {
    const normalized = normalizeStreamingPricingConfiguration(pricing);
    const intent = normalized.commercialOffers!;
    const hasAds = normalized.streams.includes('ads');
    return {
        schemaVersion: 1,
        coreModel: intent.coreModel,
        subscriptions: normalized.streams.includes('subs')
            ? normalized.plans.filter(plan => plan.monthly > 0).map(plan => ({
                ...plan,
                benefits: intent.benefits.plans[plan.id] || noBenefit(),
            })) : [],
        freeAdOffer: hasAds && intent.freeAdAccess ? {
            price: 0,
            adMinutesPerHour: normalized.ads.minutesPerHour,
            benefits: intent.benefits.freeAds,
        } : null,
        storeOffer: normalized.streams.includes('rentals') ? {
            rent: normalized.rentals.rent,
            buy: normalized.rentals.buy,
            windowWeeks: normalized.rentals.windowWeeks,
            benefits: intent.benefits.store,
            eligibility: intent.storeEligibility || { kind: 'PUBLIC', planIds: [] },
        } : null,
        adFreePasses: hasAds ? { ...intent.adFreePasses } : { oneHourPrice: null, dayPrice: null },
    };
};

/** New setup choice; existing prices and custom plan definitions stay available for hybrids. */
export const createStreamingPricingForCoreModel = (
    pricing: OwnedStreamingPricingConfiguration,
    coreModel: Exclude<StreamingCommercialCoreModel, 'LEGACY'>,
): OwnedStreamingPricingConfiguration => {
    const normalized = normalizeStreamingPricingConfiguration(pricing);
    const stream = coreModel === 'SUBSCRIPTION' ? 'subs' : coreModel === 'ADVERTISING' ? 'ads' : 'rentals';
    const plans = coreModel === 'SUBSCRIPTION' && !normalized.plans.length
        ? [{ id: 'ESSENTIAL', name: 'Essential', monthly: 7.99, featureIds: [], ads: false }]
        : coreModel === 'ADVERTISING' ? restoreAdPlans(normalized) : normalized.plans;
    return normalizeStreamingPricingConfiguration({
        ...normalized,
        streams: [stream],
        plans,
        commercialOffers: {
            ...normalized.commercialOffers!,
            coreModel,
            coreModelSelected: true,
            inactiveAdPlans: coreModel === 'ADVERTISING' ? {} : rememberAdPlans(normalized),
            freeAdAccess: coreModel === 'ADVERTISING',
        },
    });
};

export type StreamingPricingOfferAction =
    | { kind: 'CORE'; coreModel: Exclude<StreamingCommercialCoreModel, 'LEGACY'> }
    | { kind: 'TOGGLE'; offer: 'SUBSCRIPTION' | 'ADS' | 'STORE'; enabled: boolean }
    | { kind: 'BENEFIT'; offer: 'PLAN' | 'FREE_AD' | 'STORE'; planId?: string;
        premiumAccess: boolean; earlyAccessWeeks: number }
    | { kind: 'PASS'; duration: 'ONE_HOUR' | 'DAY'; price: number | null }
    | { kind: 'STORE_ELIGIBILITY'; scope: 'PUBLIC' | 'MEMBERSHIP_PLANS'; planIds: string[] };

/** One edit boundary for the launch cards; prices and benefits stay in the saved configuration. */
export const configureStreamingPricingOffer = (
    pricing: OwnedStreamingPricingConfiguration,
    action: StreamingPricingOfferAction,
): OwnedStreamingPricingConfiguration => {
    if (action.kind === 'CORE') return createStreamingPricingForCoreModel(pricing, action.coreModel);
    const current = normalizeStreamingPricingConfiguration(pricing);
    const intent = current.commercialOffers!;
    if (action.kind === 'STORE_ELIGIBILITY') return normalizeStreamingPricingConfiguration({ ...current,
        commercialOffers: { ...intent, storeEligibility: { kind: action.scope, planIds: action.planIds } },
    });
    if (action.kind === 'TOGGLE') {
        const stream: StreamingRevenueStreamId = action.offer === 'SUBSCRIPTION' ? 'subs' : action.offer === 'ADS' ? 'ads' : 'rentals';
        if (!action.enabled && ((intent.coreModel === 'SUBSCRIPTION' && stream === 'subs')
            || (intent.coreModel === 'ADVERTISING' && stream === 'ads')
            || (intent.coreModel === 'STORE' && stream === 'rentals'))) return current;
        const streams = action.enabled
            ? [...new Set([...current.streams, stream])]
            : current.streams.filter(value => value !== stream);
        const plans = stream === 'subs' && action.enabled && !current.plans.length
            ? [{ id: 'ESSENTIAL', name: 'Essential', monthly: 7.99, featureIds: [] as string[], ads: false }]
            : stream === 'ads' && action.enabled ? restoreAdPlans(current)
                : stream === 'ads' && !action.enabled
                    ? current.plans.map(plan => ({ ...plan, ads: false })) : current.plans;
        return normalizeStreamingPricingConfiguration({
            ...current, streams, plans,
            commercialOffers: {
                ...intent,
                inactiveAdPlans: stream === 'ads' ? action.enabled ? {} : rememberAdPlans(current) : intent.inactiveAdPlans,
                freeAdAccess: action.offer === 'ADS' ? action.enabled : intent.freeAdAccess,
            },
        });
    }
    if (action.kind === 'PASS') {
        const field = action.duration === 'ONE_HOUR' ? 'oneHourPrice' : 'dayPrice';
        return normalizeStreamingPricingConfiguration({ ...current, commercialOffers: {
            ...intent, adFreePasses: { ...intent.adFreePasses, [field]: action.price },
        } });
    }
    const benefits = {
        premiumAccess: action.premiumAccess,
        earlyAccessWeeks: action.premiumAccess ? action.earlyAccessWeeks : 0,
    };
    if (action.offer === 'PLAN') {
        if (!action.planId || !current.plans.some(plan => plan.id === action.planId)) return current;
        const plans = current.plans.map(plan => plan.id === action.planId ? {
            ...plan,
            featureIds: benefits.premiumAccess && benefits.earlyAccessWeeks > 0
                ? [...new Set([...plan.featureIds, 'early'])]
                : plan.featureIds.filter(id => id !== 'early'),
        } : plan);
        return normalizeStreamingPricingConfiguration({ ...current, plans, commercialOffers: {
            ...intent, benefits: { ...intent.benefits,
                plans: { ...intent.benefits.plans, [action.planId]: benefits },
            },
        } });
    }
    return normalizeStreamingPricingConfiguration({ ...current, commercialOffers: {
        ...intent, benefits: { ...intent.benefits,
            [action.offer === 'FREE_AD' ? 'freeAds' : 'store']: benefits,
        },
    } });
};

/** Build and marketing consume the same saved offer the pricing editor changes. */
export const summarizeStreamingBuildPricing = (pricing: OwnedStreamingPricingConfiguration): {
    label: string; sellable: number; priceLabel: string;
} => {
    const offer = projectStreamingCommercialOffers(pricing);
    const sellable = offer.subscriptions.length + Number(Boolean(offer.freeAdOffer))
        + Number(Boolean(offer.storeOffer));
    const core = offer.coreModel === 'LEGACY' ? 'SUBSCRIPTION' : offer.coreModel;
    const label = core === 'ADVERTISING' ? 'Free with ads'
        : core === 'STORE' ? 'Rent or buy' : 'Subscription';
    const extras = [
        core !== 'SUBSCRIPTION' && offer.subscriptions.length ? 'subscription' : null,
        core !== 'ADVERTISING' && offer.freeAdOffer ? 'free ads' : null,
        core !== 'STORE' && offer.storeOffer ? 'rent or buy' : null,
    ].filter((part): part is string => Boolean(part));
    const entry = offer.subscriptions.length
        ? Math.min(...offer.subscriptions.map(plan => plan.monthly)) : null;
    return { label: [label, ...extras].join(' + '),
        sellable,
        priceLabel: entry === null ? offer.storeOffer ? `$${offer.storeOffer.rent.toFixed(2)} rent` : 'Free entry'
            : `from $${entry.toFixed(2)}/mo` };
};
