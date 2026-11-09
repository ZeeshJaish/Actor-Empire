/**
 * Value against the rivals in the news (#117, plan §18.7): "A plan clearly cheaper or better than the rivals' gets a
 * story ("the cheapest 4K plan around"), and so does one clearly worse ("pays more for less"). Some praise, some
 * criticise, at most one a week." Zeesh, 2026-11-01: "कोई बोले कि अरे उसका तो सस्ता है फिर भी इतना कुछ ऑफर कर रहा है".
 *
 * Each week the industry pass sets the player's paid plans beside the global rivals' plans where they meet (a shared
 * market), at list prices:
 *  - praised: a plan streams its picture (1080p or better) for at least a quarter less than any global rival's plan
 *    with that picture or better, like with like (ads beside ads, no ads beside no ads);
 *  - criticised: a global rival's plan streams the same picture or better, with no more ads, for at least a quarter less
 *    (the most damning such plan: the best picture, then the cheapest).
 * The week's story is the widest gap; the same verdict at the same price is told once (the fact's key).
 * Pure: reads the player and the world, returns facts.
 */
import type { IndustryEventFact, Player, WorldStreamingPlanOffer } from '../types';
import { createIndustryEventFact } from './industryWorld/industryEventLedger';
import { getOwnedPlatformPackageCountryIds } from './streamingContentAvailability';
import { resolveStreamingPlanOffer, streamingPictureRank } from './streamingPlanOffer';
import { normalizeStreamingPricingConfiguration } from './streamingPricingEconomy';
import { getStreamingTechGroupLadder, resolveStreamingTechTree } from './streamingTechTreeCatalogue';
import { getWorldStreamingRivalOffers } from './worldEconomy/worldStreamingOffers';
import { fillCopy, pickCopy, sentenceStart } from './industryWorld/mediaCopyVariety';

/** "clearly": a quarter cheaper */
export const STREAMING_VALUE_CLEAR_GAP = .25;
/* praise starts at 1080p: "the cheapest 720p plan around" is no story */
const PRAISE_FROM_RANK = 2;

interface ValuePlan { id: string; name: string; price: number; rank: number; ads: boolean }
interface RivalPlan extends ValuePlan { rival: string; rivalId: string }
interface Verdict { kind: 'PRAISED' | 'CRITICISED'; gap: number; mine: ValuePlan; rival: RivalPlan }

const pictureName = (rank: number) => getStreamingTechGroupLadder('PICTURE').find(item => streamingPictureRank(item.id) === rank)?.name || '';
const money = (amount: number) => `$${amount.toFixed(2)}`;

/* the player's paid plans on sale, as the world's audience reads them (worldStreamingOffers): the picture its offer or
   features stream with the service's tech, ads while ads run, the list price (phone-only plans aside) */
const playerPlans = (player: Player): ValuePlan[] => {
    const platform = player.ownedStreamingPlatform;
    const pricing = normalizeStreamingPricingConfiguration(platform.serviceConfiguration.pricing);
    if (!pricing.streams.includes('subs')) return [];
    const techTree = resolveStreamingTechTree(platform);
    return pricing.plans.flatMap(plan => {
        const offer = resolveStreamingPlanOffer(plan, techTree);
        if (plan.monthly <= 0 || offer.devices === 'MOBILE') return [];
        return [{ id: plan.id, name: plan.name, price: plan.monthly, rank: streamingPictureRank(offer.picture), ads: Boolean(plan.ads) && pricing.ads.minutesPerHour > 0 }];
    });
};

const rivalPlan = (plan: WorldStreamingPlanOffer, rival: string, rivalId: string): RivalPlan => ({
    id: plan.id, name: plan.name, price: plan.monthlyPrice, rank: plan.pictureRank ?? 1,
    ads: plan.ads && plan.adLevel !== 'NONE', rival, rivalId,
});

/** The week's verdict on the player's value, or null: the widest clear gap either way */
export const getStreamingValueVerdict = (player: Player, absoluteWeek: number): Verdict | null => {
    const platform = player.ownedStreamingPlatform;
    if (!platform?.launchCommit || platform.lifecycle !== 'ACTIVE') return null;
    const markets = new Set(getOwnedPlatformPackageCountryIds(platform));
    const mine = playerPlans(player);
    if (!markets.size || !mine.length) return null;
    const rivals = getWorldStreamingRivalOffers(player, absoluteWeek)
        .filter(item => (item.kind === 'CORE_GLOBAL' || item.kind === 'GLOBAL_REAL') && item.offer.activeCountryIds.some(id => markets.has(id)))
        .flatMap(item => item.offer.plans.filter(plan => plan.monthlyPrice > 0).map(plan => rivalPlan(plan, item.offer.name, item.offer.platformId)));
    const cheapest = (plans: RivalPlan[]) => plans.reduce<RivalPlan | null>((best, plan) => (!best || plan.price < best.price ? plan : best), null);
    const verdicts = mine.flatMap((plan): Verdict[] => {
        const found: Verdict[] = [];
        const like = cheapest(rivals.filter(rival => rival.rank >= plan.rank && rival.ads === plan.ads));
        if (plan.rank >= PRAISE_FROM_RANK && like && 1 - plan.price / like.price >= STREAMING_VALUE_CLEAR_GAP) {
            found.push({ kind: 'PRAISED', gap: 1 - plan.price / like.price, mine: plan, rival: like });
        }
        /* of the rival plans clearly cheaper for as much or more, the most damning: the best picture, then the cheapest */
        const worse = rivals.filter(rival => rival.rank >= plan.rank && (!rival.ads || plan.ads) && 1 - rival.price / plan.price >= STREAMING_VALUE_CLEAR_GAP)
            .sort((left, right) => right.rank - left.rank || left.price - right.price)[0];
        if (worse) found.push({ kind: 'CRITICISED', gap: 1 - worse.price / plan.price, mine: plan, rival: worse });
        return found;
    });
    return verdicts.sort((left, right) => right.gap - left.gap || (left.kind === right.kind ? 0 : left.kind === 'PRAISED' ? -1 : 1)
        || left.mine.id.localeCompare(right.mine.id))[0] || null;
};

/** The week's value story, if the verdict is new */
export const collectStreamingValueFacts = (player: Player, absoluteWeek: number): IndustryEventFact[] => {
    const identity = player.ownedStreamingPlatform?.identity;
    const slug = identity?.slug;
    const name = identity?.name?.trim();
    if (!slug || !name) return [];
    const verdict = getStreamingValueVerdict(player, absoluteWeek);
    if (!verdict) return [];
    const { mine, rival } = verdict;
    const picture = pictureName(mine.rank);
    const theirs = pictureName(rival.rank);
    const praised = verdict.kind === 'PRAISED';
    const less = rival.rank > mine.rank || (mine.ads && !rival.ads);
    /* 2026-11-09: each verdict is written several ways, picked by the verdict's own key */
    const headline = sentenceStart(fillCopy(pickCopy(`streaming-value:${slug}:${verdict.kind}:${mine.id}:${Math.round(mine.price * 100)}`, praised
        ? ['{name} has the cheapest {picture} plan{ads} around', 'Best value in {picture}: {name}', 'Nobody streams {picture} for less than {name}', '{name} undercuts every rival on {picture}']
        : less ? ['{name} charges more for less', '{name} asks more and gives less', 'Paying more for less at {name}', 'Is {name} overcharging?']
            : ["{name}'s {picture} plan costs more than {rival}'s", '{rival} streams {picture} for less than {name}', 'Price check: {name} against {rival} on {picture}', '{name} looks pricey next to {rival}']),
    { name, picture, ads: mine.ads ? ' with ads' : '', rival: rival.rival }));
    const detail = praised
        ? `${mine.name} streams in ${picture} for ${money(mine.price)} a month. The next cheapest, ${rival.rival}'s ${rival.name}, costs ${money(rival.price)}.`
        : `${mine.name} costs ${money(mine.price)} a month for ${picture}${mine.ads ? ' with ads' : ''}; ${rival.rival}'s ${rival.name} streams ${theirs}${rival.ads ? ' with ads' : ''} for ${money(rival.price)}.`;
    return [createIndustryEventFact({
        idempotencyKey: `owned-platform:${slug}:value:${verdict.kind.toLowerCase()}:${mine.id}:${Math.round(mine.price * 100)}`,
        absoluteWeek,
        type: praised ? 'PLATFORM_VALUE_PRAISED' : 'PLATFORM_VALUE_CRITICISED',
        /* a top story for 4K and up, a gap of 40% or more, or a better picture for less; X for the rest */
        importance: mine.rank >= 3 || verdict.gap >= .4 || (!praised && less) ? 'HIGH' : 'MEDIUM',
        companyId: slug,
        companyName: name,
        platformId: slug,
        headline,
        detail,
        evidence: [{ kind: 'PLATFORM', id: slug }, { kind: 'PLATFORM', id: rival.rivalId }],
    })];
};
