/**
 * What a subscriber sees of the tech tree and the plans in "SEE IT AS THEY DO" (plan §8):
 *   Phase 1  the quality badges titles carry, the player's quality menu (what the viewer's plan
 *            streams, with dearer steps greyed and "Upgrade plan"), and a short "Now in 4K" after
 *            a new resolution;
 *   Phase 2  the plans as a viewer meets them (#48): a plan picker built from the real plans and
 *            the free tier, each with its price, what it streams and the ad breaks its viewers sit
 *            through, so the app can be seen as each plan's viewers see it.
 *   Phase 4  (#63) Because you watched rows (Smart AI) and "Who's watching?" (Profiles and
 *            screens); each plan's cards name its Kids profiles, AI channels and Autoplay (#62).
 * Pure: nothing here saves.
 */
import type {
    OwnedStreamingPlanOffer,
    OwnedStreamingPlatformState,
    OwnedStreamingPricingPlan,
    OwnedStreamingTechTreeState,
    StreamingPlanAdLevel,
    StreamingPricingPlanColorId,
    StreamingTechId,
    WorldStreamingPlanAllocation,
} from '../types';
import { getStreamingTechDefinition, resolveStreamingTechTree, streamingTechVersion } from './streamingTechTreeCatalogue';
import {
    STREAMING_AD_LEVEL_EFFECTS,
    STREAMING_FREE_TIER_ID,
    STREAMING_FREE_TIER_NAME,
    resolveStreamingPlanAdLevel,
    resolveStreamingPlanOffer,
    streamingPlanIncludes,
} from './streamingPlanOffer';
import { projectStreamingCommercialOffers } from './streamingCommercialOffers';
import { normalizeStreamingPricingConfiguration } from './streamingPricingEconomy';
import { streamingFreeTierOffer } from './streamingPlanBuilder';

export type StreamingViewerResolution = '480p' | '720p' | '1080p' | '4K' | '8K' | '12K' | '16K' | '24K';

const PICTURE: Array<{ id: StreamingTechId; label: StreamingViewerResolution }> = [
    { id: 'PICTURE_480P', label: '480p' },
    { id: 'PICTURE_720P', label: '720p' },
    { id: 'PICTURE_1080P', label: '1080p' },
    { id: 'PICTURE_4K', label: '4K' },
    { id: 'PICTURE_8K', label: '8K' },
    { id: 'PICTURE_12K', label: '12K' },
    { id: 'PICTURE_16K', label: '16K' },
    { id: 'PICTURE_24K', label: '24K' },
];
const rankOf = (label: StreamingViewerResolution) => PICTURE.findIndex(step => step.label === label);
const labelOf = (id: StreamingTechId): StreamingViewerResolution => PICTURE.find(step => step.id === id)?.label || '480p';

/** How long "Now in 4K" shows after the service reaches it. */
export const STREAMING_VIEWER_NOW_IN_WEEKS = 2;

/**
 * What the network delivers at the busiest hour, as the app's player and STATUS both read it: any
 * picture while tech health is 78 or more and peak load under 85%, up to 1080p from tech health 45,
 * else 480p.
 */
export const streamingNetworkPictureTier = (technologyHealth: number, peakLoad: number): 'SD' | 'HD' | '4K' => (
    technologyHealth >= 78 && peakLoad < 85 ? '4K' : technologyHealth >= 45 ? 'HD' : 'SD'
);

export interface StreamingViewerQualityOption {
    label: StreamingViewerResolution;
    /** AVAILABLE in the viewer's plan · UPGRADE offered only by a dearer plan */
    state: 'AVAILABLE' | 'UPGRADE';
}

export interface StreamingViewerQuality {
    /** the plan the viewer watches on: the one most households chose last week, else the first */
    planName: string | null;
    /** the best picture that plan streams */
    planMax: StreamingViewerResolution;
    /** the picture steps the player's menu lists, best first */
    menu: StreamingViewerQualityOption[];
    /** what titles carry on that plan: '4K', 'HDR', 'Spatial audio' */
    badges: string[];
    /** "Now in 4K" for two weeks after the service reaches a new resolution, else null */
    nowIn: string | null;
    /** the cheapest plan that streams it, when the viewer's plan does not (#48): "Now in 4K on Premium" */
    nowInOn?: { plan: string; picture: StreamingViewerResolution };
}

/** A plan as "Now in …" can name it: its name, price and best picture. */
interface PictureSeller { name: string; monthly: number; picture: StreamingViewerResolution }

/** The best picture a plan streams: its offer's (Plans v2), or what its features stand for (4K with 4K HDR, 1080p with HD, else the best below HD). */
const planPicture = (plan: Pick<OwnedStreamingPricingPlan, 'featureIds' | 'offer'>, tree: OwnedStreamingTechTreeState): StreamingViewerResolution => (
    labelOf(resolveStreamingPlanOffer(plan, tree).picture)
);

/** The resolutions the service owns, and the step "Now in …" names: one some plan streams, in the two weeks after it arrives. */
const ownedAndNow = (
    tree: OwnedStreamingTechTreeState,
    absoluteWeek: number,
    offeredByAnyPlan: StreamingViewerResolution,
): { owned: StreamingViewerResolution[]; now: StreamingViewerResolution | null } => {
    const owned = PICTURE.filter(step => streamingTechVersion(tree, step.id) >= 1).map(step => step.label);
    // only a resolution some plan actually streams: unlocking 8K that no plan offers changes nothing on screen
    const recent = PICTURE
        .filter(step => rankOf(step.label) >= rankOf('1080p') && rankOf(step.label) <= rankOf(offeredByAnyPlan))
        .filter(step => {
            const progress = tree.techs[step.id];
            return progress && !progress.granted && absoluteWeek - progress.unlockedAtAbsoluteWeek >= 0
                && absoluteWeek - progress.unlockedAtAbsoluteWeek < STREAMING_VIEWER_NOW_IN_WEEKS;
        })
        .at(-1);
    return { owned, now: recent?.label ?? null };
};

/** What one offer's viewers see: the menu up to the best any plan streams, greyed above this offer's; the badges; "Now in …". */
const qualityFor = (
    owned: StreamingViewerResolution[],
    offeredByAnyPlan: StreamingViewerResolution,
    offer: OwnedStreamingPlanOffer | null,
    planName: string | null,
    now: StreamingViewerResolution | null,
    sellers: PictureSeller[],
): StreamingViewerQuality => {
    const planMax: StreamingViewerResolution = offer ? labelOf(offer.picture) : owned.includes('720p') ? '720p' : '480p';
    const ceiling = rankOf(offeredByAnyPlan) > rankOf(planMax) ? offeredByAnyPlan : planMax;
    const menu: StreamingViewerQualityOption[] = owned
        .filter(label => rankOf(label) <= rankOf(ceiling))
        .map(label => ({ label, state: rankOf(label) <= rankOf(planMax) ? 'AVAILABLE' as const : 'UPGRADE' as const }))
        .reverse();
    const badges: string[] = [];
    if (rankOf(planMax) >= rankOf('4K')) badges.push('4K');
    else if (planMax === '1080p') badges.push('HD');
    if (offer?.hdr && rankOf(planMax) >= rankOf('1080p')) badges.push('HDR');
    if (offer && ['SOUND_SPATIAL', 'SOUND_LOSSLESS', 'SOUND_PERSONAL'].includes(offer.sound)) badges.push('Spatial audio');
    const seller = now && rankOf(planMax) < rankOf(now)
        ? [...sellers].sort((left, right) => left.monthly - right.monthly).find(item => rankOf(item.picture) >= rankOf(now))
        : undefined;
    return {
        planName, planMax, menu, badges, nowIn: now ? `Now in ${now}` : null,
        ...(seller && now ? { nowInOn: { plan: seller.name, picture: now } } : {}),
    };
};

export const getStreamingViewerQuality = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    allocations: WorldStreamingPlanAllocation[] = [],
): StreamingViewerQuality => {
    const tree = resolveStreamingTechTree(platform);
    const plans = platform.serviceConfiguration.pricing.plans || [];
    const households = (planId: string) => allocations.find(row => row.planId === planId)?.households ?? 0;
    const plan = [...plans].sort((left, right) => households(right.id) - households(left.id))[0] || null;
    const offer = plan ? resolveStreamingPlanOffer(plan, tree) : null;
    const owned720 = PICTURE.some(step => step.label === '720p' && streamingTechVersion(tree, step.id) >= 1);
    const planMax = plan ? planPicture(plan, tree) : owned720 ? '720p' : '480p';
    const sellers = plans.map(item => ({ name: item.name, monthly: item.monthly, picture: planPicture(item, tree) }));
    const offeredByAnyPlan = sellers.reduce<StreamingViewerResolution>((best, item) => (
        rankOf(item.picture) > rankOf(best) ? item.picture : best
    ), planMax);
    const { owned, now } = ownedAndNow(tree, absoluteWeek, offeredByAnyPlan);
    return qualityFor(owned, offeredByAnyPlan, offer, plan?.name || null, now, sellers);
};

/* ── the plans as a viewer meets them (§8 Phase 2, #48) ── */

export interface StreamingViewerPlan {
    /** a plan's id, or the free tier's (STREAMING_FREE_TIER_ID) */
    id: string;
    name: string;
    /** the monthly price (0 for the free tier) and how the app prints it: "$7.99 a month", "Free" */
    monthly: number;
    price: string;
    /** no, limited, standard or more ad breaks */
    adLevel: StreamingPlanAdLevel;
    /** 30-second ad spots in an hour of viewing: the service's ad minutes an hour, by the plan's level, as the engine counts them */
    adSpotsPerHour: number;
    /** its card's headline: the best picture it streams ("4K HDR", "1080p Full HD") */
    picture: string;
    /** what else its card lists, best first: "Spatial audio", "2 screens at once", "Downloads", "Premieres 2 weeks early" */
    features: string[];
    /** its ads in the apps' words: "No ads", "Limited ads", "With ads", "More ads" */
    ads: string;
    /** what its viewers see in the player and on the titles */
    quality: StreamingViewerQuality;
    /** the free tier before its own quality is set (#46): its viewers watch what the plans' viewers watch */
    qualityNotSet?: true;
    /** the colour the plan wears in the plans table (#45), when one is picked */
    colorId?: StreamingPricingPlanColorId;
}

export interface StreamingViewerPlans {
    /** the free tier first when it runs, then the plans, as the plans table lists them */
    plans: StreamingViewerPlan[];
    /** the plan a viewer is on by default: the one most households chose last week, else the first plan, else the free tier */
    currentId: string | null;
}

const SOUND_WORDS: Partial<Record<StreamingTechId, string>> = {
    SOUND_51: '5.1 surround sound', SOUND_71: '7.1 surround sound', SOUND_SPATIAL: 'Spatial audio', SOUND_LOSSLESS: 'Lossless spatial audio',
};
/* the words the apps use: Prime's "limited ads", Netflix's "with ads" */
const AD_WORDS: Record<StreamingPlanAdLevel, string> = { NONE: 'No ads', LIGHT: 'Limited ads', STANDARD: 'With ads', HEAVY: 'More ads' };

/** What a plan card says: its picture as the headline, then the rest best first, and its ads. */
const cardOf = (
    offer: OwnedStreamingPlanOffer,
    adLevel: StreamingPlanAdLevel,
    extras: { earlyWeeks?: number; live?: boolean; extraMember?: boolean } = {},
    /** #62: Kids profiles, AI channels and Autoplay, where the plan includes them */
    tree?: OwnedStreamingTechTreeState,
): Pick<StreamingViewerPlan, 'picture' | 'features' | 'ads'> => {
    const picture = labelOf(offer.picture);
    const hdr = offer.hdr && rankOf(picture) >= rankOf('1080p') ? getStreamingTechDefinition(offer.hdr)?.name : null;
    const colour = offer.colour === 'COLOUR_12BIT' || offer.colour === 'COLOUR_16BIT' ? getStreamingTechDefinition(offer.colour)?.name : null;
    return {
        picture: hdr ? `${picture} ${hdr}` : picture === '1080p' ? '1080p Full HD' : picture,
        features: [
            ...(colour ? [`${colour} colour`] : []),
            ...(SOUND_WORDS[offer.sound] ? [SOUND_WORDS[offer.sound]!] : []),
            ...(offer.dialogue ? ['Clear dialogue'] : []),
            // #106: a phones-only plan says so, and its screens are phones
            ...(offer.devices === 'MOBILE' ? ['Phones and tablets only'] : []),
            offer.devices === 'MOBILE'
                ? (offer.screens <= 1 ? '1 phone at a time' : `${offer.screens} phones at once`)
                : offer.screens <= 1 ? '1 screen at a time' : `${offer.screens} screens at once`,
            ...(offer.downloads ? ['Downloads'] : []),
            ...(tree && streamingPlanIncludes(offer, 'kids', tree) ? ['Kids profiles'] : []),
            ...(tree && streamingPlanIncludes(offer, 'aiChannels', tree) ? ['AI channels'] : []),
            ...(tree && streamingPlanIncludes(offer, 'autoplay', tree) ? ['Autoplay'] : []),
            ...(extras.earlyWeeks ? [`Premieres ${extras.earlyWeeks} week${extras.earlyWeeks === 1 ? '' : 's'} early`] : []),
            ...(extras.live ? ['Live events'] : []),
            ...(extras.extraMember ? ['Add an extra member'] : []),
        ],
        ads: AD_WORDS[adLevel],
    };
};

/**
 * The plans a viewer can pick from in the app: the free tier (when it runs) and each paid plan,
 * with its price, what it streams, its ad breaks and the player's view of it. The engine's
 * numbers throughout: the normalised pricing, its ad minutes, each plan's offer. Previewing a
 * plan in the app changes nothing for real subscribers.
 */
export const getStreamingViewerPlans = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    allocations: WorldStreamingPlanAllocation[] = [],
): StreamingViewerPlans => {
    const tree = resolveStreamingTechTree(platform);
    const pricing = normalizeStreamingPricingConfiguration(platform.serviceConfiguration.pricing);
    const projection = projectStreamingCommercialOffers(pricing);
    const adMinutes = pricing.streams.includes('ads') ? Math.max(0, Number(pricing.ads.minutesPerHour) || 0) : 0;
    // a 30-second spot is half a minute; a level runs its share of the service's minutes (#44)
    const spots = (level: StreamingPlanAdLevel) => Math.round(adMinutes * STREAMING_AD_LEVEL_EFFECTS[level].minutes * 2 * 10) / 10;
    const free = projection.freeAdOffer ? streamingFreeTierOffer(pricing, tree) : null;
    const paid = projection.subscriptions.map(plan => ({ plan, offer: resolveStreamingPlanOffer(plan, tree) }));
    const sellers: PictureSeller[] = [
        ...(free ? [{ name: STREAMING_FREE_TIER_NAME, monthly: 0, picture: labelOf(free.offer.picture) }] : []),
        ...paid.map(({ plan, offer }) => ({ name: plan.name, monthly: plan.monthly, picture: labelOf(offer.picture) })),
    ];
    const offeredByAnyPlan = sellers.reduce<StreamingViewerResolution>((best, item) => (
        rankOf(item.picture) > rankOf(best) ? item.picture : best
    ), '480p');
    const { owned, now } = ownedAndNow(tree, absoluteWeek, offeredByAnyPlan);
    const rows: StreamingViewerPlan[] = [
        ...(free ? [{
            id: STREAMING_FREE_TIER_ID,
            name: STREAMING_FREE_TIER_NAME,
            monthly: 0,
            price: 'Free',
            adLevel: 'STANDARD' as const,
            adSpotsPerHour: spots('STANDARD'),
            ...cardOf(free.offer, 'STANDARD', {}, tree),
            quality: qualityFor(owned, offeredByAnyPlan, free.offer, STREAMING_FREE_TIER_NAME, now, sellers),
            ...(free.set ? {} : { qualityNotSet: true as const }),
        }] : []),
        ...paid.map(({ plan, offer }): StreamingViewerPlan => {
            const level = resolveStreamingPlanAdLevel(plan);
            return {
                id: plan.id,
                name: plan.name,
                monthly: plan.monthly,
                price: `$${plan.monthly.toFixed(2)} a month`,
                adLevel: level,
                adSpotsPerHour: spots(level),
                ...cardOf(offer, level, {
                    earlyWeeks: plan.benefits.premiumAccess ? plan.benefits.earlyAccessWeeks : 0,
                    live: plan.featureIds.includes('live'),
                    extraMember: plan.featureIds.includes('extraseat'),
                }, tree),
                quality: qualityFor(owned, offeredByAnyPlan, offer, plan.name, now, sellers),
                ...(plan.colorId ? { colorId: plan.colorId } : {}),
            };
        }),
    ];
    const households = (planId: string) => allocations.find(row => row.planId === planId)?.households ?? 0;
    const top = [...paid].sort((left, right) => households(right.plan.id) - households(left.plan.id))[0]?.plan;
    return { plans: rows, currentId: top?.id ?? rows[0]?.id ?? null };
};

export interface StreamingViewerAdBreak {
    /** how far into the title, in percent (0: before it starts) */
    at: number;
    /** 30-second spots in the break */
    spots: number;
}

/**
 * A plan's ad breaks across a title in the app's player (#48): one before it, then mid-rolls
 * through it, about one for every four 30-second spots an hour (at the usual 4 ad minutes an
 * hour: limited ads 1, with ads 2, more ads 3), each break a quarter of the hour's spots shared
 * out between them, one to three. The player plays a taste of a title, not the hour.
 */
export const streamingViewerAdBreaks = (spotsPerHour: number): StreamingViewerAdBreak[] => {
    if (!(spotsPerHour > 0)) return [];
    const mid = Math.max(1, Math.min(3, Math.round(spotsPerHour / 4)));
    const spots = Math.max(1, Math.min(3, Math.round(spotsPerHour / ((mid + 1) * 4))));
    return [0, ...Array.from({ length: mid }, (_, index) => Math.round((index + 1) * 100 / (mid + 1)))].map(at => ({ at, spots }));
};

/* ── Phase 4 (#63): what Smart AI and Profiles and family show a viewer ── */

/**
 * What the app's home screen does for a viewer, from the tree: Because you watched rows (Smart AI's
 * Because you watched, or a step above it) and "Who's watching?" (Profiles and screens). Kids
 * profiles, AI channels and Autoplay are each plan's (#62), in its card's features. Neither: null,
 * so the app is as before.
 */
export interface StreamingViewerPersonal { because: boolean; profiles: boolean }
export const getStreamingViewerPersonal = (platform: unknown): StreamingViewerPersonal | null => {
    const tree = resolveStreamingTechTree(platform);
    const because = (['AI_BECAUSE', 'AI_ARTWORK', 'AI_TASTE'] as const).some(id => streamingTechVersion(tree, id) >= 1);
    const profiles = streamingTechVersion(tree, 'FAM_SCREENS') >= 1;
    return because || profiles ? { because, profiles } : null;
};
