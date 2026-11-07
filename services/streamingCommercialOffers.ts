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

/* #103 (plan §18.3): a plan keeps its own ads. While subscriptions are off its ads wait here with their level (the
   normaliser keeps them), and they come back when subscriptions do; plans an earlier rule stripped (choosing a main
   offer, or turning Free with ads off, took every plan's ads) come back the same way: "Basic with ads" reads ads again. */
const restoreAdPlans = (pricing: OwnedStreamingPricingConfiguration) => pricing.plans.map(plan => {
    const saved = pricing.commercialOffers?.inactiveAdPlans?.[plan.id];
    if (!saved || plan.ads) return plan;
    return { ...plan, ads: true, ...(saved.adLevel ? { adLevel: saved.adLevel } : {}),
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

/** #103 (plan §18.3): a store open only to members of chosen plans sells to nobody while subscriptions are off, or
    with no plan chosen; the pages say so (it sold nothing, silently). */
export const streamingStoreSellsToNobody = (pricing: OwnedStreamingPricingConfiguration): boolean => {
    const store = projectStreamingCommercialOffers(pricing).storeOffer;
    return Boolean(store && store.eligibility.kind === 'MEMBERSHIP_PLANS'
        && (!pricing.streams.includes('subs') || !store.eligibility.planIds.length));
};

/**
 * The main offer (#103, plan §18.3): the front door, what a new viewer meets first. The first choice opens the
 * service with that offer alone; after it, choosing a main offer only turns that offer on if it is off and moves the
 * front door. The others stay as they are, with their plans, ads and levels (Make main reset the offer and switched the
 * rest back on, and the wizard's "Change model" turned them off). `alone` builds a service with only that way to earn
 * and no ads on its plans (the old reset, which the model audits' fixtures stand on).
 */
export const createStreamingPricingForCoreModel = (
    pricing: OwnedStreamingPricingConfiguration,
    coreModel: Exclude<StreamingCommercialCoreModel, 'LEGACY'>,
    options: { alone?: boolean } = {},
): OwnedStreamingPricingConfiguration => {
    const normalized = normalizeStreamingPricingConfiguration(pricing);
    const intent = normalized.commercialOffers!;
    const first = options.alone || !intent.coreModelSelected;
    const stream: StreamingRevenueStreamId = coreModel === 'SUBSCRIPTION' ? 'subs' : coreModel === 'ADVERTISING' ? 'ads' : 'rentals';
    const streams: StreamingRevenueStreamId[] = first ? [stream] : [...new Set([...normalized.streams, stream])];
    const subsBack = streams.includes('subs') && !normalized.streams.includes('subs');
    const plans = coreModel === 'SUBSCRIPTION' && !normalized.plans.length
        ? [{ id: 'ESSENTIAL', name: 'Essential', monthly: 7.99, featureIds: [], ads: false }]
        : options.alone ? normalized.plans.map(plan => ({ ...plan, ads: false }))
            : subsBack ? restoreAdPlans(normalized) : normalized.plans;
    return normalizeStreamingPricingConfiguration({
        ...normalized,
        streams,
        plans,
        commercialOffers: {
            ...intent,
            coreModel,
            coreModelSelected: true,
            inactiveAdPlans: options.alone || subsBack ? {} : intent.inactiveAdPlans,
            freeAdAccess: coreModel === 'ADVERTISING' || (!first && intent.freeAdAccess),
        },
    });
};

/** A launch draft whose plans an earlier rule stripped of their ads, with subscriptions on, gets them back (#103):
    the "Basic with ads: None" every new career met. Before launch only; a live service keeps its plans as they are. */
export const restoreStreamingDraftAdPlans = (pricing: OwnedStreamingPricingConfiguration): OwnedStreamingPricingConfiguration => {
    const remembered = pricing.commercialOffers?.inactiveAdPlans;
    if (!pricing.streams.includes('subs') || !remembered || !Object.keys(remembered).length) return pricing;
    return normalizeStreamingPricingConfiguration({
        ...pricing,
        plans: restoreAdPlans(pricing),
        commercialOffers: { ...pricing.commercialOffers!, inactiveAdPlans: {} },
    });
};

export type StreamingPricingOfferAction =
    | { kind: 'CORE'; coreModel: Exclude<StreamingCommercialCoreModel, 'LEGACY'>; alone?: boolean }
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
    if (action.kind === 'CORE') return createStreamingPricingForCoreModel(pricing, action.coreModel, { alone: action.alone });
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
        /* #103 (§18.3): Free with ads is the free tier alone. Turning it on or off opens or closes the free tier and
           leaves every plan's ads as they are; the ads stream follows in the normaliser. */
        if (action.offer === 'ADS') return normalizeStreamingPricingConfiguration({
            ...current,
            streams: action.enabled ? [...new Set([...current.streams, stream])] : current.streams,
            commercialOffers: { ...intent, freeAdAccess: action.enabled },
        });
        const streams = action.enabled
            ? [...new Set([...current.streams, stream])]
            : current.streams.filter(value => value !== stream);
        const subsBack = stream === 'subs' && action.enabled && !current.streams.includes('subs');
        const plans = stream === 'subs' && action.enabled && !current.plans.length
            ? [{ id: 'ESSENTIAL', name: 'Essential', monthly: 7.99, featureIds: [] as string[], ads: false }]
            : subsBack ? restoreAdPlans(current) : current.plans;
        return normalizeStreamingPricingConfiguration({
            ...current, streams, plans,
            commercialOffers: { ...intent, inactiveAdPlans: subsBack ? {} : intent.inactiveAdPlans },
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
