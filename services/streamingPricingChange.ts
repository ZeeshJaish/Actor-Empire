/**
 * The newsworthy part of a price or plan change (plan §10, Phase 5, #68): "pricing and plan changes,
 * with critic reactions (price rises, ads added to Premium, a cheaper ad plan…)". Saving new pricing
 * on a live service records it on the platform's ledger, and the next week's news reports it.
 * #117 (plan §18.7): the offer's own moves too, each typed for what it is: the main offer switched, subscriptions
 * turned off, a free tier opened or closed, the store opened. "A free tier is not a price cut", and a new ad plan is
 * not a free tier: Free with ads opens only when the offer opens it.
 * Pure: compares two pricing configurations.
 */
import type { OwnedStreamingPricingConfiguration, OwnedStreamingPricingPlan } from '../types';

export type StreamingPricingChangeKind =
    | 'ADS_ADDED' | 'RAISED' | 'MAIN_SWITCHED' | 'SUBSCRIPTIONS_OFF' | 'FREE_TIER' | 'FREE_TIER_CLOSED' | 'STORE_OPENED'
    | 'STORE_CLOSED' | 'SUBSCRIPTIONS_ON' | 'NEW_CHEAPER' | 'CUT' | 'ADS_REMOVED';

type PricingSide = Pick<OwnedStreamingPricingConfiguration, 'plans' | 'streams' | 'commercialOffers'>;

export interface StreamingPricingChange {
    change: StreamingPricingChangeKind;
    /** the plan it is about (none for the offer's moves; the new main offer for MAIN_SWITCHED) */
    plan: string;
    /** monthly prices before and after, and the change in whole percent (rises and cuts; the cheapest plan's
        price once subscriptions go on sale) */
    from: number;
    to: number;
    percent: number;
}

/* a price move worth a story: 5% either way */
const NEWSWORTHY_PERCENT = 5;

const adsOn = (plan: OwnedStreamingPricingPlan) => Boolean(plan.ads) && plan.adLevel !== 'NONE';
/* Free with ads open to anyone: as the saved offer says (the normalizer's rule), or for an offer saved before it, a
   free plan or ads with no subscriptions */
const freeTierOpen = (pricing: PricingSide) => pricing.streams.includes('ads') && (pricing.commercialOffers
    ? pricing.commercialOffers.coreModel === 'ADVERTISING' || pricing.commercialOffers.freeAdAccess
    : !pricing.streams.includes('subs') || pricing.plans.some(plan => plan.ads && plan.monthly === 0));
const subscriptionsSold = (pricing: PricingSide) => pricing.streams.includes('subs') && pricing.plans.some(plan => plan.monthly > 0);
const offerOn = (pricing: PricingSide, model: string | undefined) => (model === 'SUBSCRIPTION' ? subscriptionsSold(pricing)
    : model === 'ADVERTISING' ? freeTierOpen(pricing) : model === 'STORE' && pricing.streams.includes('rentals'));

/**
 * The one change the news leads with, most contested first: ads put on a paid plan, then the
 * biggest rise; then the offer's moves (#117): subscriptions turned off or put on sale, the store
 * opened or closed, the main offer switched, a free tier opened or closed; then a new plan cheaper
 * than every plan before, the biggest cut, ads taken off. A plan's own moves count only while
 * subscriptions are on sale both before and after (a plan back on sale with its ads has not had
 * ads put on it). Smaller moves, renames and offer tweaks: null.
 */
export const describeStreamingPricingChange = (
    before: PricingSide,
    after: PricingSide,
): StreamingPricingChange | null => {
    const prior = new Map(before.plans.map(plan => [plan.id, plan]));
    const subsBefore = subscriptionsSold(before);
    const subsAfter = subscriptionsSold(after);
    const kept = subsBefore && subsAfter ? after.plans.filter(plan => prior.has(plan.id)) : [];
    const change = (kind: StreamingPricingChangeKind, plan: string, from = 0, to = 0, percent = 0): StreamingPricingChange => (
        { change: kind, plan, from, to, percent }
    );

    const adsAdded = kept.filter(plan => plan.monthly > 0 && adsOn(plan) && !adsOn(prior.get(plan.id)!))
        .sort((left, right) => right.monthly - left.monthly)[0];
    if (adsAdded) return change('ADS_ADDED', adsAdded.name);

    const moves = kept.map(plan => ({ plan, from: prior.get(plan.id)!.monthly, to: plan.monthly }))
        .filter(move => move.from > 0 && move.to > 0)
        .map(move => ({ ...move, percent: Math.round((move.to - move.from) / move.from * 100) }));
    const rise = moves.filter(move => move.percent >= NEWSWORTHY_PERCENT).sort((left, right) => right.percent - left.percent)[0];
    if (rise) return change('RAISED', rise.plan.name, rise.from, rise.to, rise.percent);

    /* the offer's moves (#117): a way to buy opened or closed leads them; then the main offer, the front door, moved
       while the old one stays open (when it closed, the closing is the news); then the free tier */
    if (subsBefore && !subsAfter) return change('SUBSCRIPTIONS_OFF', '');
    if (subsAfter && !subsBefore) return change('SUBSCRIPTIONS_ON', '', 0, Math.min(...after.plans.map(plan => plan.monthly).filter(price => price > 0)));
    const storeBefore = before.streams.includes('rentals');
    const storeAfter = after.streams.includes('rentals');
    if (storeAfter && !storeBefore) return change('STORE_OPENED', '');
    if (storeBefore && !storeAfter) return change('STORE_CLOSED', '');
    const mainBefore = before.commercialOffers?.coreModel;
    const mainAfter = after.commercialOffers?.coreModel;
    if (mainBefore && mainAfter && mainAfter !== mainBefore && mainAfter !== 'LEGACY' && offerOn(after, mainBefore)) {
        return change('MAIN_SWITCHED', mainAfter);
    }
    const freeBefore = freeTierOpen(before);
    const freeAfter = freeTierOpen(after);
    if (freeAfter && !freeBefore) return change('FREE_TIER', '');
    if (freeBefore && !freeAfter) return change('FREE_TIER_CLOSED', '');

    const paidBefore = before.plans.map(plan => plan.monthly).filter(price => price > 0);
    const cheapest = paidBefore.length ? Math.min(...paidBefore) : Infinity;
    const cheaper = subsBefore && subsAfter ? after.plans.filter(plan => !prior.has(plan.id) && plan.monthly > 0 && plan.monthly < cheapest)
        .sort((left, right) => left.monthly - right.monthly)[0] : undefined;
    if (cheaper) return change('NEW_CHEAPER', cheaper.name, 0, cheaper.monthly);

    const cut = moves.filter(move => move.percent <= -NEWSWORTHY_PERCENT).sort((left, right) => left.percent - right.percent)[0];
    if (cut) return change('CUT', cut.plan.name, cut.from, cut.to, -cut.percent);

    const adsRemoved = kept.filter(plan => !adsOn(plan) && adsOn(prior.get(plan.id)!))
        .sort((left, right) => right.monthly - left.monthly)[0];
    if (adsRemoved) return change('ADS_REMOVED', adsRemoved.name);
    return null;
};
