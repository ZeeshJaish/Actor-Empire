/**
 * The plan builder (codex-handoff/plans/platform-tech-plan.md §6.2–§6.4, Phase 2 #45): a
 * service's plans side by side. Every row a plan sets, every step of a row with whether the
 * service may sell it (and what to unlock if not), starter plans suggested from the tech it owns,
 * the edits the table makes, and the receipt of what changed.
 *
 *   rows       price, ads, the offer (picture, HDR, colour, sound, Clear dialogue, screens,
 *              downloads) and the extras (early premieres, Live events, an extra member, the
 *              full catalogue)
 *   locks      a step the service cannot sell is refused with what it needs (§6.4); the save
 *              (saveStreamingPricingPlan) refuses it with the same words
 *   ads        any plan may carry ads (§6.1); the first ad plan switches advertising on without
 *              opening a free tier, and the last one switches it off again
 *
 * The same builder sits in Define the Launch › Pricing and in the Platform room's Offer tab.
 * Pure: nothing here saves.
 */
import type {
    OwnedStreamingPlanOffer,
    OwnedStreamingPricingConfiguration,
    OwnedStreamingPricingPlan,
    OwnedStreamingTechTreeState,
    StreamingPlanAdLevel,
    StreamingPricingPlanColorId,
    StreamingTechId,
    StreamingTechnologyBranch,
} from '../types';
import { configureStreamingPricingOffer } from './streamingCommercialOffers';
import { STREAMING_STORE_NAME } from './streamingStoreEditions';
import {
    STREAMING_FREE_TIER_NAME,
    STREAMING_MAX_PLANS,
    STREAMING_PLAN_AD_LEVELS,
    STREAMING_PLAN_SCREENS,
    applyStreamingPlanOfferFeatures,
    getStreamingPlanExtraLocks,
    streamingPlanIncludes,
    STREAMING_PLAN_EXTRA_LOCK_TECH,
    resolveStreamingPlanAdLevel,
    resolveStreamingPlanOffer,
    streamingPictureRank,
    streamingPlanOfferLocks,
    type StreamingPlanExtraRow,
    type StreamingPlanOfferLock,
    type StreamingPlanOfferRow,
} from './streamingPlanOffer';
import {
    STREAMING_AD_INTERVAL_PRESETS,
    STREAMING_MAXIMUM_PLAN_PRICE,
    STREAMING_MINIMUM_PAID_PLAN_PRICE,
    STREAMING_STORE_BUY_MAX,
    STREAMING_STORE_RENT_MAX,
    STREAMING_STORE_TOP_BUY_MAX,
    STREAMING_STORE_TOP_RENT_MAX,
    adIntervalForMinutesPerHour,
    adMinutesPerHourForInterval,
    normalizeStreamingPricingConfiguration,
} from './streamingPricingEconomy';
import {
    getStreamingTechDefinition,
    getStreamingTechGroup,
    getStreamingTechGroupLadder,
    resolveStreamingTechTree,
    streamingTechDownloadsAllowed,
    streamingTechScreens,
    streamingTechVersion,
} from './streamingTechTreeCatalogue';

export type StreamingPlanBuilderRowId = 'ads' | StreamingPlanOfferRow | StreamingPlanExtraRow;

export interface StreamingPlanBuilderOption {
    value: string;
    /** in the picker: "5.1 Surround", "2 screens", "2 weeks early" */
    label: string;
    /** in the table: "5.1", "2", "2 wk early" ('—' for nothing) */
    short: string;
    /** under the label in the picker: the version owned ("Version 2 · Sharp"), or what the step does */
    line: string | null;
}

export interface StreamingPlanBuilderRow {
    id: StreamingPlanBuilderRowId;
    label: string;
    options: StreamingPlanBuilderOption[];
}

export interface StreamingPlanBuilderView {
    /** ads, the offer rows, then the extras, in the order the table shows them */
    rows: StreamingPlanBuilderRow[];
    maxPlans: number;
    /** starter plans that differ, from what the service owns (§6.2) */
    suggestions: OwnedStreamingPricingPlan[];
    tree: OwnedStreamingTechTreeState;
    levels: Record<StreamingTechnologyBranch, number>;
    /** extras the service cannot sell yet, with what they need */
    extraLocks: Partial<Record<StreamingPlanExtraRow, string>>;
}

const BRANCHES: StreamingTechnologyBranch[] = [
    'DELIVERY_CAPACITY', 'PLAYBACK_QUALITY', 'RELIABILITY', 'DATA_RECOMMENDATIONS',
    'SECURITY', 'CONTENT_OPERATIONS', 'ADVERTISING_COMMERCE', 'PRODUCT_EXPERIENCE',
];
const OFFER_ROWS: StreamingPlanOfferRow[] = ['picture', 'hdr', 'colour', 'sound', 'dialogue', 'devices', 'screens', 'downloads', 'kids', 'aiChannels', 'autoplay'];
const EXTRA_ROWS: StreamingPlanExtraRow[] = ['early', 'live', 'extraseat', 'catalogue'];
const isOfferRow = (row: StreamingPlanBuilderRowId): row is StreamingPlanOfferRow => (OFFER_ROWS as string[]).includes(row);

/* the table's short names; the picker shows the step's full name */
const SHORT: Partial<Record<StreamingTechId, string>> = {
    SOUND_51: '5.1', SOUND_71: '7.1', SOUND_SPATIAL: 'Spatial', SOUND_PERSONAL: 'Personal',
};
const AD_WORDS: Record<StreamingPlanAdLevel, { label: string; short: string; line: string }> = {
    NONE: { label: 'No ads', short: 'None', line: 'No breaks. The price carries the plan.' },
    LIGHT: { label: 'Light ads', short: 'Light', line: 'Half your usual breaks. Fewer viewers are put off.' },
    STANDARD: { label: 'Standard ads', short: 'Standard', line: 'Your usual ad breaks.' },
    HEAVY: { label: 'Heavy ads', short: 'Heavy', line: 'Twice the breaks: more ad money, more viewers put off.' },
};
const EXTRA_WORDS: Record<Exclude<StreamingPlanExtraRow, 'early'>, { label: string; on: string; line: string }> = {
    live: { label: 'Live events', on: 'Live events', line: 'Concerts, sport and premieres as they happen' },
    extraseat: { label: 'Extra member', on: 'Extra member', line: 'One more member outside the home' },
    catalogue: { label: 'Full catalogue', on: 'Full catalogue', line: 'Every title you hold, not a selection' },
};

/** "Version 2 · Sharp" for a step the service owns, else null */
const versionName = (tree: OwnedStreamingTechTreeState, id: StreamingTechId): string | null => {
    const version = streamingTechVersion(tree, id);
    const definition = getStreamingTechDefinition(id);
    return version >= 1 && definition ? `Version ${version} · ${getStreamingTechGroup(definition.group).versionNames[version - 1]}` : null;
};
const ladder = (group: 'PICTURE' | 'HDR' | 'COLOUR' | 'SOUND') => getStreamingTechGroupLadder(group).filter(item => !item.sideLine).map(item => item.id);
const techOptions = (tree: OwnedStreamingTechTreeState, ids: StreamingTechId[]): StreamingPlanBuilderOption[] => ids.map(id => {
    const name = getStreamingTechDefinition(id)?.name || id;
    return { value: id, label: name, short: SHORT[id] || name, line: versionName(tree, id) };
});
const yesNo = (off: string, on: string, line: string | null, onShort = '✓'): StreamingPlanBuilderOption[] => [
    { value: 'off', label: off, short: '—', line: null },
    { value: 'on', label: on, short: onShort, line },
];

/** The rows a plan sets, in the order the comparison table shows them (after the price). */
export const getStreamingPlanBuilderRows = (tree: OwnedStreamingTechTreeState): StreamingPlanBuilderRow[] => [
    { id: 'ads', label: 'Ads', options: STREAMING_PLAN_AD_LEVELS.map(level => ({ value: level, ...AD_WORDS[level] })) },
    { id: 'picture', label: 'Picture', options: techOptions(tree, ladder('PICTURE')) },
    { id: 'hdr', label: 'HDR', options: [{ value: 'off', label: 'No HDR', short: '—', line: null }, ...techOptions(tree, ladder('HDR'))] },
    { id: 'colour', label: 'Colour', options: techOptions(tree, ladder('COLOUR')) },
    { id: 'sound', label: 'Sound', options: techOptions(tree, ladder('SOUND')) },
    { id: 'dialogue', label: 'Clear dialogue', options: yesNo('Off', 'Clear dialogue', versionName(tree, 'SOUND_CLEAR_DIALOGUE')) },
    /* #106: a plan for phones and tablets only, as Netflix's Mobile plan */
    { id: 'devices', label: 'Devices', options: [
        { value: 'all', label: 'Every device', short: 'All', line: 'TVs, computers, phones and tablets' },
        { value: 'mobile', label: 'Phones and tablets only', short: 'Mobile',
            line: 'Draws price-minded homes where many watch on a phone alone; smaller screens cost less to stream' },
    ] },
    { id: 'screens', label: 'Screens', options: STREAMING_PLAN_SCREENS.map(count => ({
        value: String(count), label: `${count} screen${count === 1 ? '' : 's'}`, short: String(count),
        line: count === 1 ? 'One stream at a time' : `${count} streams at once`,
    })) },
    { id: 'downloads', label: 'Downloads', options: yesNo('No downloads', 'Downloads', 'Watch offline') },
    /* #62: on whenever the tech is owned, unless a plan turns them off */
    { id: 'kids', label: 'Kids profiles', options: yesNo('Off', 'Kids profiles', 'A safe space for children, with parental controls') },
    { id: 'aiChannels', label: 'AI channels', options: yesNo('Off', 'AI channels', 'Always-on channels built from each viewer\'s taste') },
    { id: 'autoplay', label: 'Autoplay', options: yesNo('Off', 'Autoplay', 'The next episode starts on its own') },
    { id: 'early', label: 'Early premieres', options: [
        { value: 'off', label: 'On release day', short: '—', line: 'With every other plan' },
        ...[1, 2, 3, 4].map(weeks => ({
            value: String(weeks), label: `${weeks} week${weeks === 1 ? '' : 's'} early`, short: `${weeks} wk early`,
            line: 'Titles whose rights allow it',
        })),
    ] },
    ...(['live', 'extraseat', 'catalogue'] as const).map(id => ({
        id, label: EXTRA_WORDS[id].label, options: yesNo('Not included', EXTRA_WORDS[id].on, EXTRA_WORDS[id].line),
    })),
];

/* ── reading a plan ── */

/** An offer with one row set to an option's value. */
export const withStreamingPlanOfferRow = (offer: OwnedStreamingPlanOffer, row: StreamingPlanOfferRow, value: string): OwnedStreamingPlanOffer => {
    switch (row) {
        case 'picture': return { ...offer, picture: value as StreamingTechId };
        case 'hdr': return { ...offer, hdr: value === 'off' ? null : value as StreamingTechId };
        case 'colour': return { ...offer, colour: value as StreamingTechId };
        case 'sound': return { ...offer, sound: value as StreamingTechId };
        case 'dialogue': return { ...offer, dialogue: value === 'on' };
        case 'devices': {
            const { devices: _devices, ...everyDevice } = offer;
            return value === 'mobile' ? { ...everyDevice, devices: 'MOBILE' } : everyDevice;
        }
        case 'screens': return { ...offer, screens: STREAMING_PLAN_SCREENS.find(count => String(count) === value) || 1 };
        case 'downloads': return { ...offer, downloads: value === 'on' };
        case 'kids': case 'aiChannels': case 'autoplay': return { ...offer, [row]: value === 'on' };
        default: return offer;
    }
};

const offerRowValue = (offer: OwnedStreamingPlanOffer, row: StreamingPlanOfferRow, tree: OwnedStreamingTechTreeState): string => {
    switch (row) {
        case 'picture': return offer.picture;
        case 'hdr': return offer.hdr || 'off';
        case 'colour': return offer.colour;
        case 'sound': return offer.sound;
        case 'dialogue': return offer.dialogue ? 'on' : 'off';
        case 'devices': return offer.devices === 'MOBILE' ? 'mobile' : 'all';
        case 'screens': return String(offer.screens);
        case 'downloads': return offer.downloads ? 'on' : 'off';
        case 'kids': case 'aiChannels': case 'autoplay': return streamingPlanIncludes(offer, row, tree) ? 'on' : 'off';
        default: return '';
    }
};

/** The value a plan holds in a row, as the row's options name it. */
export const streamingPlanBuilderValue = (
    pricing: OwnedStreamingPricingConfiguration,
    plan: OwnedStreamingPricingPlan,
    row: StreamingPlanBuilderRowId,
    tree: OwnedStreamingTechTreeState,
): string => {
    if (row === 'ads') return resolveStreamingPlanAdLevel(plan);
    if (isOfferRow(row)) return offerRowValue(resolveStreamingPlanOffer(plan, tree), row, tree);
    if (row === 'early') {
        const benefit = pricing.commercialOffers?.benefits?.plans?.[plan.id];
        return benefit?.premiumAccess && benefit.earlyAccessWeeks > 0 ? String(Math.min(4, benefit.earlyAccessWeeks)) : 'off';
    }
    return plan.featureIds.includes(row) ? 'on' : 'off';
};

/**
 * Why a plan cannot take an option, or null: a tech not unlocked, a combination (HDR below 1080p,
 * deep colour without HDR), or an extra the service cannot sell. Picking a lower picture never
 * locks the plan's HDR: the builder takes HDR off with it (settleStreamingPlanOffer).
 */
export const streamingPlanBuilderOptionLock = (
    pricing: OwnedStreamingPricingConfiguration,
    plan: OwnedStreamingPricingPlan,
    row: StreamingPlanBuilderRowId,
    value: string,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels' | 'extraLocks'>,
): StreamingPlanOfferLock | null => {
    if (isOfferRow(row)) {
        const offer = withStreamingPlanOfferRow(resolveStreamingPlanOffer(plan, view.tree), row, value);
        return streamingPlanOfferLocks(offer, view.tree, view.levels).find(lock => lock.row === row) || null;
    }
    if ((row === 'live' || row === 'extraseat') && value === 'on' && view.extraLocks[row]) {
        return { row, needs: view.extraLocks[row]!, techId: STREAMING_PLAN_EXTRA_LOCK_TECH[row] ?? null };
    }
    return null;
};

/** The lock on what a plan holds now (an offer the tree no longer covers), so the table can show it. */
export const streamingPlanBuilderCellLock = (
    pricing: OwnedStreamingPricingConfiguration,
    plan: OwnedStreamingPricingPlan,
    row: StreamingPlanBuilderRowId,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels' | 'extraLocks'>,
): StreamingPlanOfferLock | null => (
    row === 'ads' ? null : streamingPlanBuilderOptionLock(pricing, plan, row, streamingPlanBuilderValue(pricing, plan, row, view.tree), view)
);

/* ── making plans ── */

/** Keeps an offer sellable after one row changes: below 1080p there is no HDR, and 12/16-bit colour needs HDR. */
export const settleStreamingPlanOffer = (offer: OwnedStreamingPlanOffer): OwnedStreamingPlanOffer => {
    let next = offer;
    if (next.hdr && streamingPictureRank(next.picture) < streamingPictureRank('PICTURE_1080P')) next = { ...next, hdr: null };
    if (!next.hdr && (next.colour === 'COLOUR_12BIT' || next.colour === 'COLOUR_16BIT')) next = { ...next, colour: 'COLOUR_10BIT' };
    return next;
};

/** A plan from an offer: its features follow the offer, with the full catalogue, and "noads" marks a plan without ads. */
export const createStreamingPlanFromOffer = (
    id: string,
    name: string,
    monthly: number,
    offer: OwnedStreamingPlanOffer,
    adLevel: StreamingPlanAdLevel,
): OwnedStreamingPricingPlan => ({
    id,
    name,
    monthly,
    featureIds: applyStreamingPlanOfferFeatures(['catalogue', ...(adLevel === 'NONE' ? ['noads'] : [])], offer),
    ads: adLevel !== 'NONE',
    ...(adLevel !== 'NONE' ? { adLevel } : {}),
    offer,
});

const bestOwnedOf = (tree: OwnedStreamingTechTreeState, ids: StreamingTechId[], ceiling?: StreamingTechId): StreamingTechId | null => {
    const limit = ceiling ? ids.indexOf(ceiling) : ids.length - 1;
    return [...ids.slice(0, limit + 1)].reverse().find(id => streamingTechVersion(tree, id) >= 1) || null;
};

/**
 * Starter plans that differ (§6.2), from the tech the service owns:
 *   Basic with ads   the best picture up to 1080p, stereo, one screen, standard ads, $7.99
 *   Standard         that picture with HDR and 10-bit colour where owned, sound up to 7.1, two
 *                    screens and downloads where allowed, no ads, $9.99
 *   Premium          the best of everything owned, the most screens allowed, no ads, $14.99
 *                    (+$3 for every picture step past 4K)
 * Premium is left out when it would offer nothing Standard does not. Every plan carries the full
 * catalogue, as every rival plan does.
 */
export const suggestStreamingStarterPlans = (tree: OwnedStreamingTechTreeState): OwnedStreamingPricingPlan[] => {
    const pictures = ladder('PICTURE');
    const sounds = ladder('SOUND');
    const hdPicture = bestOwnedOf(tree, pictures, 'PICTURE_1080P') || 'PICTURE_480P';
    const hd = streamingPictureRank(hdPicture) >= streamingPictureRank('PICTURE_1080P');
    // screens come from Profiles and screens (#60; they read Reliability 10 and 35 before)
    const screens = streamingTechScreens(tree);
    const screens2 = screens >= 2;
    const downloads = streamingTechDownloadsAllowed(tree);
    const basic: OwnedStreamingPlanOffer = { picture: hdPicture, hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false };
    const standard: OwnedStreamingPlanOffer = {
        ...basic,
        hdr: hd ? bestOwnedOf(tree, ladder('HDR'), 'HDR_HDR') : null,
        colour: hd ? bestOwnedOf(tree, ladder('COLOUR'), 'COLOUR_10BIT') || 'COLOUR_8BIT' : 'COLOUR_8BIT',
        sound: bestOwnedOf(tree, sounds, 'SOUND_71') || 'SOUND_STEREO',
        screens: screens2 ? 2 : 1,
        downloads,
    };
    const bestPicture = bestOwnedOf(tree, pictures) || 'PICTURE_480P';
    const bestHdr = streamingPictureRank(bestPicture) >= streamingPictureRank('PICTURE_1080P') ? bestOwnedOf(tree, ladder('HDR')) : null;
    const premium: OwnedStreamingPlanOffer = settleStreamingPlanOffer({
        picture: bestPicture,
        hdr: bestHdr,
        colour: bestOwnedOf(tree, ladder('COLOUR')) || 'COLOUR_8BIT',
        sound: bestOwnedOf(tree, sounds) || 'SOUND_STEREO',
        dialogue: streamingTechVersion(tree, 'SOUND_CLEAR_DIALOGUE') >= 1,
        screens: STREAMING_PLAN_SCREENS.filter(count => count <= screens).at(-1) || 1,
        downloads,
    });
    const plans = [
        createStreamingPlanFromOffer('BASIC', 'Basic with ads', 7.99, basic, 'STANDARD'),
        createStreamingPlanFromOffer('PREMIUM', 'Standard', 9.99, standard, 'NONE'),
    ];
    if (JSON.stringify(premium) !== JSON.stringify(standard)) {
        const beyond4K = Math.max(0, streamingPictureRank(premium.picture) - streamingPictureRank('PICTURE_4K'));
        plans.push(createStreamingPlanFromOffer('FAMILY', 'Premium', Math.round((14.99 + beyond4K * 3) * 100) / 100, premium, 'NONE'));
    }
    return plans;
};

/** The builder for a platform-shaped value: its tree, its levels, what its extras need, its starters. */
export const getStreamingPlanBuilderView = (platform: unknown): StreamingPlanBuilderView => {
    const record = (platform && typeof platform === 'object' ? platform : {}) as {
        technologyLevels?: Partial<Record<StreamingTechnologyBranch, number>>;
        productLines?: Array<{ lineId: string; status: string }>;
    };
    const tree = resolveStreamingTechTree(platform);
    const levels = Object.fromEntries(BRANCHES.map(branch => [branch, Number(record.technologyLevels?.[branch]) || 0])) as Record<StreamingTechnologyBranch, number>;
    const active = new Set((record.productLines || []).filter(line => line.status === 'ACTIVE').map(line => line.lineId));
    return {
        rows: getStreamingPlanBuilderRows(tree),
        maxPlans: STREAMING_MAX_PLANS,
        suggestions: suggestStreamingStarterPlans(tree),
        tree,
        levels,
        /* #126: Live events wait for Live & Sports, coming in a future update, before launch and after */
        extraLocks: getStreamingPlanExtraLocks(tree, active),
    };
};

/* ── edits: each returns the whole pricing, normalised ── */

/**
 * Plans in place, with advertising following them: the first plan with ads switches advertising
 * on (at a break every 10 minutes if the cadence was off) without opening a free tier; with no ad
 * plan, no free tier and ads not the main offer, it switches off again.
 */
const withPlans = (pricing: OwnedStreamingPricingConfiguration, plans: OwnedStreamingPricingPlan[]): OwnedStreamingPricingConfiguration => {
    const anyAds = plans.some(plan => plan.ads);
    const intent = pricing.commercialOffers;
    const adsOn = pricing.streams.includes('ads');
    if (anyAds && !adsOn) {
        return normalizeStreamingPricingConfiguration({
            ...pricing,
            plans,
            streams: [...pricing.streams, 'ads'],
            ads: { ...pricing.ads, minutesPerHour: pricing.ads.minutesPerHour > 0 ? pricing.ads.minutesPerHour : adMinutesPerHourForInterval(10) },
            ...(intent ? { commercialOffers: { ...intent, freeAdAccess: false } } : {}),
        });
    }
    if (!anyAds && adsOn && intent && !intent.freeAdAccess && intent.coreModel !== 'ADVERTISING') {
        return normalizeStreamingPricingConfiguration({ ...pricing, plans, streams: pricing.streams.filter(stream => stream !== 'ads') });
    }
    return normalizeStreamingPricingConfiguration({ ...pricing, plans });
};

const mapPlan = (
    pricing: OwnedStreamingPricingConfiguration,
    planId: string,
    change: (plan: OwnedStreamingPricingPlan) => OwnedStreamingPricingPlan,
): OwnedStreamingPricingConfiguration => withPlans(pricing, pricing.plans.map(plan => (plan.id === planId ? change(plan) : plan)));

/** A plan's ad level: none takes the ads off; any other puts them on at that level. */
const withAdLevel = (plan: OwnedStreamingPricingPlan, level: StreamingPlanAdLevel): OwnedStreamingPricingPlan => {
    const { adLevel: _previous, ...rest } = plan;
    return {
        ...rest,
        featureIds: level === 'NONE' ? [...plan.featureIds.filter(id => id !== 'noads'), 'noads'] : plan.featureIds.filter(id => id !== 'noads'),
        ads: level !== 'NONE',
        ...(level !== 'NONE' ? { adLevel: level } : {}),
    };
};

/** One cell of the table changed. A locked choice is not made: check streamingPlanBuilderOptionLock first. */
export const applyStreamingPlanBuilderChoice = (
    pricing: OwnedStreamingPricingConfiguration,
    planId: string,
    row: StreamingPlanBuilderRowId,
    value: string,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels' | 'extraLocks'>,
): OwnedStreamingPricingConfiguration => {
    const plan = pricing.plans.find(item => item.id === planId);
    if (!plan || streamingPlanBuilderOptionLock(pricing, plan, row, value, view)) return pricing;
    if (row === 'ads') {
        return STREAMING_PLAN_AD_LEVELS.includes(value as StreamingPlanAdLevel) ? mapPlan(pricing, planId, item => withAdLevel(item, value as StreamingPlanAdLevel)) : pricing;
    }
    if (isOfferRow(row)) {
        const offer = settleStreamingPlanOffer(withStreamingPlanOfferRow(resolveStreamingPlanOffer(plan, view.tree), row, value));
        return mapPlan(pricing, planId, item => ({ ...item, offer, featureIds: applyStreamingPlanOfferFeatures(item.featureIds, offer) }));
    }
    if (row === 'early') {
        const weeks = value === 'off' ? 0 : Math.max(1, Math.min(4, Math.round(Number(value)) || 0));
        return configureStreamingPricingOffer(pricing, { kind: 'BENEFIT', offer: 'PLAN', planId, premiumAccess: weeks > 0, earlyAccessWeeks: weeks });
    }
    return mapPlan(pricing, planId, item => ({
        ...item,
        featureIds: value === 'on' ? [...new Set([...item.featureIds, row])] : item.featureIds.filter(id => id !== row),
    }));
};

/** A plan's price: a paid plan stays at or above the least anyone may charge; a free plan may stay free. */
export const setStreamingPlanPrice = (pricing: OwnedStreamingPricingConfiguration, planId: string, monthly: number): OwnedStreamingPricingConfiguration => (
    mapPlan(pricing, planId, plan => {
        const floor = plan.monthly > 0 || monthly > 0 ? STREAMING_MINIMUM_PAID_PLAN_PRICE : 0;
        const value = Number.isFinite(monthly) ? monthly : plan.monthly;
        return { ...plan, monthly: Math.round(Math.min(STREAMING_MAXIMUM_PLAN_PRICE, Math.max(floor, value)) * 100) / 100 };
    })
);

export const renameStreamingPlan = (pricing: OwnedStreamingPricingConfiguration, planId: string, name: string): OwnedStreamingPricingConfiguration => {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, 40);
    return clean ? mapPlan(pricing, planId, plan => ({ ...plan, name: clean })) : pricing;
};

export const setStreamingPlanColour = (
    pricing: OwnedStreamingPricingConfiguration,
    planId: string,
    colorId: StreamingPricingPlanColorId,
): OwnedStreamingPricingConfiguration => mapPlan(pricing, planId, plan => ({ ...plan, colorId }));

const nextPlanId = (plans: OwnedStreamingPricingPlan[]): string => {
    const used = new Set(plans.map(plan => plan.id));
    let index = plans.length + 1;
    while (used.has(`PLAN_${index}`)) index += 1;
    return `PLAN_${index}`;
};
const nextPlanName = (plans: OwnedStreamingPricingPlan[], base: string): string => {
    const used = new Set(plans.map(plan => plan.name.trim().toLowerCase()));
    if (!used.has(base.toLowerCase())) return base;
    let index = 2;
    while (used.has(`${base} ${index}`.toLowerCase())) index += 1;
    return `${base} ${index}`.slice(0, 40);
};
const copyOf = (plan: OwnedStreamingPricingPlan, tree: OwnedStreamingTechTreeState): Omit<OwnedStreamingPricingPlan, 'id' | 'name'> => {
    const { colorId: _colour, id: _id, name: _name, ...rest } = plan;
    const offer = resolveStreamingPlanOffer(plan, tree);
    return { ...rest, featureIds: applyStreamingPlanOfferFeatures(plan.featureIds.filter(id => id !== 'early'), offer), offer };
};

/**
 * A new plan at the end: a copy of the last plan's offer and ads at $3 more, for the player to set
 * apart; the first plan of all is 1080p-or-best, no ads, $9.99. Returns the new plan's id.
 */
export const addStreamingPlan = (
    pricing: OwnedStreamingPricingConfiguration,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels' | 'maxPlans'>,
): { pricing: OwnedStreamingPricingConfiguration; planId: string | null } => {
    if (pricing.plans.length >= view.maxPlans) return { pricing, planId: null };
    const id = nextPlanId(pricing.plans);
    const name = nextPlanName(pricing.plans, `Plan ${pricing.plans.length + 1}`);
    const last = pricing.plans[pricing.plans.length - 1];
    const plan: OwnedStreamingPricingPlan = last
        ? { ...copyOf(last, view.tree), id, name, monthly: Math.min(STREAMING_MAXIMUM_PLAN_PRICE, Math.round((Math.max(last.monthly, 6.99) + 3) * 100) / 100) }
        : { ...suggestStreamingStarterPlans(view.tree)[1], id, name };
    return { pricing: withPlans(pricing, [...pricing.plans, plan]), planId: id };
};

/** A copy of a plan, right after it, named "… copy". */
export const duplicateStreamingPlan = (
    pricing: OwnedStreamingPricingConfiguration,
    planId: string,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'maxPlans'>,
): { pricing: OwnedStreamingPricingConfiguration; planId: string | null } => {
    const index = pricing.plans.findIndex(plan => plan.id === planId);
    if (index < 0 || pricing.plans.length >= view.maxPlans) return { pricing, planId: null };
    const source = pricing.plans[index];
    const id = nextPlanId(pricing.plans);
    const copy: OwnedStreamingPricingPlan = { ...copyOf(source, view.tree), id, name: nextPlanName(pricing.plans, `${source.name} copy`.slice(0, 40)) };
    return { pricing: withPlans(pricing, [...pricing.plans.slice(0, index + 1), copy, ...pricing.plans.slice(index + 1)]), planId: id };
};

/** Removes a plan; the last plan cannot go while subscriptions are on. */
export const removeStreamingPlan = (pricing: OwnedStreamingPricingConfiguration, planId: string): OwnedStreamingPricingConfiguration => (
    pricing.plans.length <= 1 || !pricing.plans.some(plan => plan.id === planId)
        ? pricing : withPlans(pricing, pricing.plans.filter(plan => plan.id !== planId))
);

/** The suggested starters in place of every plan, without the old plans' early premieres or aimed offer. */
export const replaceWithStreamingStarterPlans = (
    pricing: OwnedStreamingPricingConfiguration,
    view: Pick<StreamingPlanBuilderView, 'suggestions'>,
): OwnedStreamingPricingConfiguration => {
    const intent = pricing.commercialOffers;
    return withPlans({
        ...pricing,
        introOfferPlanId: undefined,
        ...(intent ? { commercialOffers: { ...intent, benefits: { ...intent.benefits, plans: {} } } } : {}),
    }, view.suggestions.map(plan => ({ ...plan, featureIds: [...plan.featureIds], ...(plan.offer ? { offer: { ...plan.offer } } : {}) })));
};

/* ── the receipt ── */

const priceWords = (value: number) => (value <= 0 ? 'free' : `$${value.toFixed(2)}`);
const optionLabel = (view: Pick<StreamingPlanBuilderView, 'rows'>, row: StreamingPlanBuilderRowId, value: string): string => (
    view.rows.find(item => item.id === row)?.options.find(option => option.value === value)?.label || value
);
const TOGGLE_ROWS = new Set<StreamingPlanBuilderRowId>(['dialogue', 'downloads', 'live', 'extraseat', 'catalogue']);

/** One changed cell, in words: "Premium: Picture 4K → 8K", "Basic: No ads → Light ads", "Standard: Downloads on". */
const describeCell = (view: Pick<StreamingPlanBuilderView, 'rows'>, name: string, row: StreamingPlanBuilderRow, was: string, now: string): string => {
    if (TOGGLE_ROWS.has(row.id)) return `${name}: ${row.label} ${now === 'on' ? 'on' : 'off'}`;
    if (row.id === 'early') return `${name}: premieres ${now === 'off' ? 'on release day' : optionLabel(view, row.id, now)}`;
    if (row.id === 'devices') return `${name}: ${now === 'mobile' ? 'phones and tablets only' : 'every device'}`;
    if (row.id === 'ads' || row.id === 'screens') return `${name}: ${optionLabel(view, row.id, was)} → ${optionLabel(view, row.id, now)}`;
    const words = (value: string) => (value === 'off' ? 'off' : optionLabel(view, row.id, value));
    return `${name}: ${row.label} ${words(was)} → ${words(now)}`;
};

/**
 * Every difference between two plan line-ups, in words: plans added, removed or renamed, and each
 * changed price, ad level, offer row and extra.
 */
export const describeStreamingPlanChanges = (
    saved: OwnedStreamingPricingConfiguration,
    draft: OwnedStreamingPricingConfiguration,
    view: Pick<StreamingPlanBuilderView, 'rows' | 'tree'>,
): string[] => {
    const lines: string[] = [];
    draft.plans.forEach(plan => {
        const before = saved.plans.find(item => item.id === plan.id);
        if (!before) { lines.push(`${plan.name} added at ${priceWords(plan.monthly)}`); return; }
        if (before.name !== plan.name) lines.push(`${before.name} renamed ${plan.name}`);
        if (before.monthly !== plan.monthly) lines.push(`${plan.name} ${priceWords(before.monthly)} → ${priceWords(plan.monthly)}`);
        view.rows.forEach(row => {
            const was = streamingPlanBuilderValue(saved, before, row.id, view.tree);
            const now = streamingPlanBuilderValue(draft, plan, row.id, view.tree);
            if (was !== now) lines.push(describeCell(view, plan.name, row, was, now));
        });
    });
    saved.plans.forEach(plan => {
        if (!draft.plans.some(item => item.id === plan.id)) lines.push(`${plan.name} removed`);
    });
    // the free tier's quality, once set (its ad breaks are the service's cadence, a line of their own)
    if (draft.freeAdOffer) {
        if (!saved.freeAdOffer) lines.push(`${STREAMING_FREE_TIER_NAME} gets its own quality`);
        view.rows.filter(row => STREAMING_FREE_TIER_ROWS.includes(row.id) && row.id !== 'ads').forEach(row => {
            const was = streamingFreeTierValue(saved, row.id, view.tree);
            const now = streamingFreeTierValue(draft, row.id, view.tree);
            if (was !== null && now !== null && was !== now) lines.push(describeCell(view, STREAMING_FREE_TIER_NAME, row, was, now));
        });
    }
    // the store's quality, once set (#47; its prices are lines of their own)
    if (draft.storeQuality) {
        if (!saved.storeQuality) lines.push(`${STREAMING_STORE_NAME} gets its own quality`);
        view.rows.filter(row => STREAMING_STORE_ROWS.includes(row.id)).forEach(row => {
            const was = streamingStoreValue(saved, row.id, view.tree);
            const now = streamingStoreValue(draft, row.id, view.tree);
            if (was !== null && now !== null && was !== now) lines.push(describeCell(view, STREAMING_STORE_NAME, row, was, now));
        });
    }
    return lines;
};

/* ── Free with ads (§6.5, Phase 2 #46): one column, its own quality and the ad cadence ── */

/** The rows the free column sets: its ad breaks (the service's cadence) and its quality. #103 (plan §18.3): no
    Screens or Kids profiles, which a free viewer never reads (they could be set and did nothing). */
export const STREAMING_FREE_TIER_ROWS: StreamingPlanBuilderRowId[] = ['ads', 'picture', 'hdr', 'colour', 'sound', 'dialogue', 'aiChannels', 'autoplay'];

/** The free column's ad options: a break every 5 to 30 minutes. */
export const STREAMING_FREE_TIER_AD_OPTIONS: StreamingPlanBuilderOption[] = STREAMING_AD_INTERVAL_PRESETS.map(minutes => ({
    value: String(minutes),
    label: `A break every ${minutes} minutes`,
    short: `Every ${minutes} min`,
    line: minutes <= 5 ? 'The most ad money, and the most viewers put off'
        : minutes >= 20 ? 'Few breaks: viewers watch longer' : null,
}));

/**
 * What the free tier streams: its own offer once set; until then, the cheapest plan's offer (no
 * downloads), or a new service's best picture up to 720p in stereo, as where its column starts.
 */
export const streamingFreeTierOffer = (
    pricing: OwnedStreamingPricingConfiguration,
    tree: OwnedStreamingTechTreeState,
): { offer: OwnedStreamingPlanOffer; set: boolean } => {
    if (pricing.freeAdOffer) return { offer: pricing.freeAdOffer, set: true };
    const cheapest = pricing.plans.filter(plan => plan.monthly > 0).sort((a, b) => a.monthly - b.monthly)[0];
    const offer: OwnedStreamingPlanOffer = cheapest
        ? { ...resolveStreamingPlanOffer(cheapest, tree), downloads: false }
        : {
            picture: bestOwnedOf(tree, ladder('PICTURE'), 'PICTURE_720P') || 'PICTURE_480P',
            hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false,
        };
    return { offer: settleStreamingPlanOffer(offer), set: false };
};

/** The free column's value in a row: the break interval in minutes ('custom' for a saved load off the presets), an offer row's value, or null where the free tier has no such row. */
export const streamingFreeTierValue = (
    pricing: OwnedStreamingPricingConfiguration,
    row: StreamingPlanBuilderRowId,
    tree: OwnedStreamingTechTreeState,
): string | null => {
    if (row === 'ads') {
        const interval = adIntervalForMinutesPerHour(pricing.ads.minutesPerHour);
        return interval ? String(interval) : 'custom';
    }
    if (!STREAMING_FREE_TIER_ROWS.includes(row) || !isOfferRow(row)) return null;
    return offerRowValue(streamingFreeTierOffer(pricing, tree).offer, row, tree);
};

/** Why the free tier cannot take an option, or null (the plans' locks). */
export const streamingFreeTierOptionLock = (
    pricing: OwnedStreamingPricingConfiguration,
    row: StreamingPlanBuilderRowId,
    value: string,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels'>,
): StreamingPlanOfferLock | null => {
    if (row === 'ads' || !STREAMING_FREE_TIER_ROWS.includes(row) || !isOfferRow(row)) return null;
    const offer = withStreamingPlanOfferRow(streamingFreeTierOffer(pricing, view.tree).offer, row, value);
    return streamingPlanOfferLocks(offer, view.tree, view.levels).find(lock => lock.row === row) || null;
};

/** The lock on what the free tier holds now, so its cell can show it. */
export const streamingFreeTierCellLock = (
    pricing: OwnedStreamingPricingConfiguration,
    row: StreamingPlanBuilderRowId,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels'>,
): StreamingPlanOfferLock | null => {
    const value = streamingFreeTierValue(pricing, row, view.tree);
    return value === null || row === 'ads' ? null : streamingFreeTierOptionLock(pricing, row, value, view);
};

/**
 * One cell of the free column changed: a quality row sets the free tier's own offer (from where
 * its column stood), the ad row the service's break interval. A locked choice changes nothing.
 */
export const applyStreamingFreeTierChoice = (
    pricing: OwnedStreamingPricingConfiguration,
    row: StreamingPlanBuilderRowId,
    value: string,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels'>,
): OwnedStreamingPricingConfiguration => {
    if (row === 'ads') {
        const minutes = Number(value);
        return (STREAMING_AD_INTERVAL_PRESETS as readonly number[]).includes(minutes)
            ? normalizeStreamingPricingConfiguration({ ...pricing, ads: { ...pricing.ads, minutesPerHour: adMinutesPerHourForInterval(minutes) } })
            : pricing;
    }
    if (!STREAMING_FREE_TIER_ROWS.includes(row) || !isOfferRow(row) || streamingFreeTierOptionLock(pricing, row, value, view)) return pricing;
    const offer = settleStreamingPlanOffer(withStreamingPlanOfferRow(streamingFreeTierOffer(pricing, view.tree).offer, row, value));
    return normalizeStreamingPricingConfiguration({ ...pricing, freeAdOffer: offer });
};

/* ── Rent or buy (§6.5, Phase 2 #47): one column, the store's own quality, its editions' prices ── */

/** The rows the store column sets: its quality (it has no ads, screens, downloads or extras). */
export const STREAMING_STORE_ROWS: StreamingPlanBuilderRowId[] = ['picture', 'hdr', 'colour', 'sound', 'dialogue'];

/** What the store sells at its best: its own quality once set; until then where its column starts, the best picture up to 1080p in stereo. */
export const streamingStoreOffer = (
    pricing: OwnedStreamingPricingConfiguration,
    tree: OwnedStreamingTechTreeState,
): { offer: OwnedStreamingPlanOffer; set: boolean } => (pricing.storeQuality ? { offer: pricing.storeQuality, set: true } : {
    offer: {
        picture: bestOwnedOf(tree, ladder('PICTURE'), 'PICTURE_1080P') || 'PICTURE_480P',
        hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false,
    },
    set: false,
});

/** The store column's value in a row, or null where the store has no such row. */
export const streamingStoreValue = (
    pricing: OwnedStreamingPricingConfiguration,
    row: StreamingPlanBuilderRowId,
    tree: OwnedStreamingTechTreeState,
): string | null => (STREAMING_STORE_ROWS.includes(row) && isOfferRow(row) ? offerRowValue(streamingStoreOffer(pricing, tree).offer, row, tree) : null);

/** Why the store cannot take an option, or null (the plans' locks). */
export const streamingStoreOptionLock = (
    pricing: OwnedStreamingPricingConfiguration,
    row: StreamingPlanBuilderRowId,
    value: string,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels'>,
): StreamingPlanOfferLock | null => {
    if (!STREAMING_STORE_ROWS.includes(row) || !isOfferRow(row)) return null;
    const offer = withStreamingPlanOfferRow(streamingStoreOffer(pricing, view.tree).offer, row, value);
    return streamingPlanOfferLocks(offer, view.tree, view.levels).find(lock => lock.row === row) || null;
};

/** The lock on what the store holds now, so its cell can show it. */
export const streamingStoreCellLock = (
    pricing: OwnedStreamingPricingConfiguration,
    row: StreamingPlanBuilderRowId,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels'>,
): StreamingPlanOfferLock | null => {
    const value = streamingStoreValue(pricing, row, view.tree);
    return value === null ? null : streamingStoreOptionLock(pricing, row, value, view);
};

/** One quality cell of the store column changed: it sets the store's own quality from where its column stood. A locked choice changes nothing. */
export const applyStreamingStoreChoice = (
    pricing: OwnedStreamingPricingConfiguration,
    row: StreamingPlanBuilderRowId,
    value: string,
    view: Pick<StreamingPlanBuilderView, 'tree' | 'levels'>,
): OwnedStreamingPricingConfiguration => {
    if (!STREAMING_STORE_ROWS.includes(row) || !isOfferRow(row) || streamingStoreOptionLock(pricing, row, value, view)) return pricing;
    const offer = settleStreamingPlanOffer(withStreamingPlanOfferRow(streamingStoreOffer(pricing, view.tree).offer, row, value));
    return normalizeStreamingPricingConfiguration({ ...pricing, storeQuality: offer });
};

/** The store's HD prices and rental length (1–16 weeks). #103: one range wherever they are set (the table's store
    column went to $100, the store card to $12 and $30). */
export const setStreamingStoreTerms = (
    pricing: OwnedStreamingPricingConfiguration,
    terms: Partial<{ rent: number; buy: number; windowWeeks: number }>,
): OwnedStreamingPricingConfiguration => normalizeStreamingPricingConfiguration({
    ...pricing,
    rentals: {
        ...pricing.rentals,
        ...(terms.rent !== undefined ? { rent: Math.min(STREAMING_STORE_RENT_MAX, Math.max(.99, terms.rent)) } : {}),
        ...(terms.buy !== undefined ? { buy: Math.min(STREAMING_STORE_BUY_MAX, Math.max(.99, terms.buy)) } : {}),
        ...(terms.windowWeeks !== undefined ? { windowWeeks: Math.min(16, Math.max(1, Math.round(terms.windowWeeks))) } : {}),
    },
});

/** The store's top edition prices (above 1080p); null sells it at the HD prices. A top price is never below the HD one,
    and never above its own range (#103). */
export const setStreamingStoreTopEdition = (
    pricing: OwnedStreamingPricingConfiguration,
    top: { rent: number; buy: number } | null,
): OwnedStreamingPricingConfiguration => normalizeStreamingPricingConfiguration({
    ...pricing,
    storeTopEdition: top ? {
        rent: Math.min(STREAMING_STORE_TOP_RENT_MAX, Math.max(pricing.rentals.rent, top.rent)),
        buy: Math.min(STREAMING_STORE_TOP_BUY_MAX, Math.max(pricing.rentals.buy, top.buy)),
    } : undefined,
});

export { EXTRA_ROWS as STREAMING_PLAN_EXTRA_ROWS, OFFER_ROWS as STREAMING_PLAN_OFFER_ROWS };
