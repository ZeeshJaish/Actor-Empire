/**
 * Plans v2 (codex-handoff/plans/platform-tech-plan.md §6.2, Phase 2): what a plan offers and
 * how many ads it carries.
 *
 *   offer      one tech step per row: picture, HDR (or none), colour depth, sound, Clear
 *              dialogue, plus screens and downloads. Only unlocked tech can be offered; a
 *              locked row is refused with what to unlock, never silently dropped (§6.4).
 *   ad level   none, light, standard or heavy, on any plan (§6.2).
 *   up to 12   plans of any name and price.
 *
 * A plan saved before Phase 2 has no offer: it is read from its features (hd, uhd, spatial,
 * streams2/4/6, downloads) and the tree, the way Phase 1 read them, so nothing it streams
 * changes. A plan with an offer has its features follow the offer, so every engine that still
 * reads features keeps working. Pure: nothing here saves.
 */
import type {
    OwnedStreamingPlanOffer,
    OwnedStreamingPricingPlan,
    OwnedStreamingTechTreeState,
    StreamingPlanAdLevel,
    StreamingTechId,
    StreamingTechnologyBranch,
} from '../types';
import {
    getStreamingTechDefinition, getStreamingTechGroupLadder, streamingTechDownloadsAllowed, streamingTechExtraMemberAllowed, streamingTechScreens, streamingTechVersion,
} from './streamingTechTreeCatalogue';

/** Plans a service may sell at once (Phase 1 allowed 6). */
export const STREAMING_MAX_PLANS = 12;

export const STREAMING_PLAN_AD_LEVELS: StreamingPlanAdLevel[] = ['NONE', 'LIGHT', 'STANDARD', 'HEAVY'];
export const STREAMING_PLAN_AD_LEVEL_NAMES: Record<StreamingPlanAdLevel, string> = {
    NONE: 'No ads', LIGHT: 'Light ads', STANDARD: 'Ads', HEAVY: 'Heavy ads',
};

const PICTURE_LADDER = getStreamingTechGroupLadder('PICTURE').map(item => item.id);
const HDR_LADDER = getStreamingTechGroupLadder('HDR').map(item => item.id);
const COLOUR_LADDER = getStreamingTechGroupLadder('COLOUR').map(item => item.id);
const SOUND_LADDER = getStreamingTechGroupLadder('SOUND').filter(item => !item.sideLine).map(item => item.id);
const rank = (ladder: StreamingTechId[], id: StreamingTechId | null | undefined): number => (id ? ladder.indexOf(id) : -1);

/** The features an offer stands for, for engines that still read features. */
const OFFER_FEATURES = ['hd', 'uhd', 'spatial', 'streams2', 'streams4', 'streams6', 'downloads'];

/** The screens a plan can sell at once; 6 since Profiles and screens (#60). */
export const STREAMING_PLAN_SCREENS: OwnedStreamingPlanOffer['screens'][] = [1, 2, 4, 6];
const toScreens = (count: number): OwnedStreamingPlanOffer['screens'] => (count >= 6 ? 6 : count >= 4 ? 4 : count >= 2 ? 2 : 1);

/** A plan's ad level: its own, else standard with ads and none without. */
export const resolveStreamingPlanAdLevel = (plan: Pick<OwnedStreamingPricingPlan, 'ads' | 'adLevel'>): StreamingPlanAdLevel => {
    if (!plan.ads) return 'NONE';
    return plan.adLevel && plan.adLevel !== 'NONE' && STREAMING_PLAN_AD_LEVELS.includes(plan.adLevel) ? plan.adLevel : 'STANDARD';
};

const owns = (tree: OwnedStreamingTechTreeState, id: StreamingTechId) => streamingTechVersion(tree, id) >= 1;
const bestOwned = (tree: OwnedStreamingTechTreeState, ladder: StreamingTechId[], from = 0, below = ladder.length): StreamingTechId | null => (
    [...ladder.slice(from, below)].reverse().find(id => owns(tree, id)) || null
);

/**
 * What a plan saved before Phase 2 offers, read from its features the way Phase 1 sold them:
 * 4K HDR with `uhd`, 1080p with `hd`, Spatial 3D with `spatial`, at the best HDR, colour and
 * sound the service has from those steps up; without them, 720p (or 480p). No surround and no
 * Clear dialogue: Phase 1 sold neither, so the plan's appeal is what it was. A feature names
 * what the plan sells; that the service may sell it is the save's check (Phase 1 kept plans to
 * unlocked tech, and old saves were given the tech their features needed).
 */
export const deriveStreamingPlanOffer = (featureIds: string[], tree: OwnedStreamingTechTreeState): OwnedStreamingPlanOffer => {
    const uhd = featureIds.includes('uhd');
    const hd = featureIds.includes('hd') || uhd;
    const spatialAt = rank(SOUND_LADDER, 'SOUND_SPATIAL');
    return {
        picture: uhd ? 'PICTURE_4K' : hd ? 'PICTURE_1080P' : owns(tree, 'PICTURE_720P') ? 'PICTURE_720P' : 'PICTURE_480P',
        hdr: uhd ? bestOwned(tree, HDR_LADDER) || 'HDR_HDR' : null,
        colour: (uhd ? bestOwned(tree, COLOUR_LADDER, rank(COLOUR_LADDER, 'COLOUR_10BIT')) : null) || 'COLOUR_8BIT',
        sound: featureIds.includes('spatial') ? bestOwned(tree, SOUND_LADDER, spatialAt) || 'SOUND_SPATIAL' : 'SOUND_STEREO',
        dialogue: false,
        screens: featureIds.includes('streams6') ? 6 : featureIds.includes('streams4') ? 4 : featureIds.includes('streams2') ? 2 : 1,
        downloads: featureIds.includes('downloads'),
    };
};

/** What a plan offers: its own offer, else what its features stand for. */
export const resolveStreamingPlanOffer = (
    plan: Pick<OwnedStreamingPricingPlan, 'featureIds' | 'offer'>,
    tree: OwnedStreamingTechTreeState,
): OwnedStreamingPlanOffer => plan.offer || deriveStreamingPlanOffer(plan.featureIds || [], tree);

/** The features an offer stands for: hd or uhd (4K and up with HDR), spatial, screens, downloads. */
export const streamingPlanOfferFeatureIds = (offer: OwnedStreamingPlanOffer): string[] => {
    const ids: string[] = [];
    const picture = rank(PICTURE_LADDER, offer.picture);
    if (picture >= rank(PICTURE_LADDER, 'PICTURE_4K') && offer.hdr) ids.push('uhd');
    else if (picture >= rank(PICTURE_LADDER, 'PICTURE_1080P')) ids.push('hd');
    if (rank(SOUND_LADDER, offer.sound) >= rank(SOUND_LADDER, 'SOUND_SPATIAL')) ids.push('spatial');
    if (offer.screens === 6) ids.push('streams6');
    else if (offer.screens === 4) ids.push('streams4');
    else if (offer.screens === 2) ids.push('streams2');
    if (offer.downloads) ids.push('downloads');
    return ids;
};

/** A plan's features with the offer's rows in place of whatever they said before. */
export const applyStreamingPlanOfferFeatures = (featureIds: string[], offer: OwnedStreamingPlanOffer): string[] => [
    ...featureIds.filter(id => !OFFER_FEATURES.includes(id)),
    ...streamingPlanOfferFeatureIds(offer),
];

/** A saved offer, checked row by row; anything that is not a real step of its row drops the offer. */
export const normalizeStreamingPlanOffer = (raw: unknown): OwnedStreamingPlanOffer | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const record = raw as Record<string, unknown>;
    const pick = (value: unknown, ladder: StreamingTechId[]): StreamingTechId | null => (
        typeof value === 'string' && (ladder as string[]).includes(value) ? value as StreamingTechId : null
    );
    const picture = pick(record.picture, PICTURE_LADDER);
    const colour = pick(record.colour, COLOUR_LADDER);
    const sound = pick(record.sound, SOUND_LADDER);
    if (!picture || !colour || !sound) return undefined;
    const screens = Number(record.screens);
    return {
        picture,
        hdr: pick(record.hdr, HDR_LADDER),
        colour,
        sound,
        dialogue: record.dialogue === true,
        screens: toScreens(screens),
        downloads: record.downloads === true,
        // #62: kept only when set, so an offer saved before them is byte-identical
        ...(typeof record.kids === 'boolean' ? { kids: record.kids } : {}),
        ...(typeof record.aiChannels === 'boolean' ? { aiChannels: record.aiChannels } : {}),
        ...(typeof record.autoplay === 'boolean' ? { autoplay: record.autoplay } : {}),
        // #106: kept only on a phones-only plan, so every other offer is byte-identical
        ...(record.devices === 'MOBILE' ? { devices: 'MOBILE' as const } : {}),
    };
};

/**
 * #106 phones-only plans (Zeesh: "स्क्रीन में भी हो सकता है कि एक मोबाइल या दो लैपटॉप … पता नहीं वो हमारे वर्ल्ड
 * पॉपुलेशन के साथ अलाइन होगा या नहीं", plan §18.10): a viewer on a phone streams less (a smaller screen); a home that
 * watches on a TV gives up up to `tvHomePenalty` of the plan's fit (less the more price-minded it is), so the plan draws
 * where many homes watch on a phone alone.
 */
export const STREAMING_MOBILE_PLAN = { load: .6, tvHomePenalty: 90 } as const;
/** The share of a market's homes with a phone but no TV-sized screen: where a phones-only plan loses nothing (25 of
    49 in the poorest markets, 5 of 94 in the richest). */
export const streamingPhoneOnlyShare = (country: { smartphoneAccessPercent: number; homeScreenAccessPercent: number }): number => {
    const phones = Math.max(1, Number(country.smartphoneAccessPercent) || 0);
    const share = (phones - (Number(country.homeScreenAccessPercent) || 0)) / phones;
    return Math.round(Math.min(1, Math.max(0, share)) * 1000) / 1000;
};

/** #62: the plan rows Phase 4's techs add, and the tech each needs. */
export type StreamingPlanTechRow = 'kids' | 'aiChannels' | 'autoplay';
export const STREAMING_PLAN_TECH_ROWS: Record<StreamingPlanTechRow, StreamingTechId> = {
    kids: 'FAM_KIDS', aiChannels: 'AI_CHANNELS', autoplay: 'AI_AUTOPLAY',
};
/** Whether a plan carries one of them: only with its tech owned, and then unless the plan turns it off. */
export const streamingPlanIncludes = (
    offer: OwnedStreamingPlanOffer | null | undefined,
    row: StreamingPlanTechRow,
    tree: OwnedStreamingTechTreeState | undefined,
): boolean => streamingTechVersion(tree, STREAMING_PLAN_TECH_ROWS[row]) >= 1 && offer?.[row] !== false;

export type StreamingPlanOfferRow = 'picture' | 'hdr' | 'colour' | 'sound' | 'dialogue' | 'devices' | 'screens' | 'downloads' | StreamingPlanTechRow;
/** What a plan sets besides its offer: premieres early, Live events, a member outside the home, the full catalogue. */
export type StreamingPlanExtraRow = 'early' | 'live' | 'extraseat' | 'catalogue';

export interface StreamingPlanOfferLock {
    row: StreamingPlanOfferRow | StreamingPlanExtraRow;
    /** what to do, in words: "Unlock 8K in Tech" */
    needs: string;
    /** the tech to open, when Tech is the answer */
    techId: StreamingTechId | null;
    /** a combination the offer cannot have (HDR below 1080p), not something to unlock */
    combination?: true;
}

const unlock = (row: StreamingPlanOfferRow, id: StreamingTechId): StreamingPlanOfferLock => (
    { row, needs: `Unlock ${getStreamingTechDefinition(id)?.name || id} in Tech`, techId: id }
);

/**
 * The rows of an offer the service cannot sell yet, each with what it needs. Every tech row
 * must be unlocked; HDR needs a 1080p-or-better picture and 12-bit or 16-bit colour needs HDR;
 * screens need Profiles and screens at as many (#60; two and four needed Reliability 10 and 35);
 * downloads need Playback's Downloads (#52; they needed Product Experience 25); a 4K-or-better
 * picture needs Studio DRM (#54: studios license 4K and above only with strong DRM). `levels`
 * stays for callers, though no row reads a level since #60.
 */
export const streamingPlanOfferLocks = (
    offer: OwnedStreamingPlanOffer,
    tree: OwnedStreamingTechTreeState,
    levels: Record<StreamingTechnologyBranch, number>,
): StreamingPlanOfferLock[] => {
    const locks: StreamingPlanOfferLock[] = [];
    if (!owns(tree, offer.picture)) locks.push(unlock('picture', offer.picture));
    else if (rank(PICTURE_LADDER, offer.picture) >= STREAMING_4K_RANK && !owns(tree, 'TRUST_STUDIO_DRM')) locks.push(unlock('picture', 'TRUST_STUDIO_DRM'));
    if (offer.hdr) {
        if (!owns(tree, offer.hdr)) locks.push(unlock('hdr', offer.hdr));
        else if (rank(PICTURE_LADDER, offer.picture) < rank(PICTURE_LADDER, 'PICTURE_1080P')) {
            locks.push({ row: 'hdr', needs: 'HDR needs a 1080p or better picture', techId: null, combination: true });
        }
    }
    if (!owns(tree, offer.colour)) locks.push(unlock('colour', offer.colour));
    else if (rank(COLOUR_LADDER, offer.colour) >= rank(COLOUR_LADDER, 'COLOUR_12BIT') && !offer.hdr) {
        locks.push({ row: 'colour', needs: '12-bit and 16-bit colour need HDR', techId: null, combination: true });
    }
    if (!owns(tree, offer.sound)) locks.push(unlock('sound', offer.sound));
    if (offer.dialogue && !owns(tree, 'SOUND_CLEAR_DIALOGUE')) locks.push(unlock('dialogue', 'SOUND_CLEAR_DIALOGUE'));
    const screens = streamingTechScreens(tree);
    if (offer.screens > screens) {
        locks.push(screens > 1
            ? { row: 'screens', needs: `Raise Profiles and screens to ${offer.screens} screens in Tech`, techId: 'FAM_SCREENS' }
            : unlock('screens', 'FAM_SCREENS'));
    }
    if (offer.downloads && !streamingTechDownloadsAllowed(tree)) locks.push(unlock('downloads', 'PLAY_DOWNLOADS'));
    // #62: a plan asking for Kids profiles, AI channels or Autoplay needs its tech
    (Object.keys(STREAMING_PLAN_TECH_ROWS) as StreamingPlanTechRow[]).forEach(row => {
        if (offer[row] === true && !owns(tree, STREAMING_PLAN_TECH_ROWS[row])) locks.push(unlock(row, STREAMING_PLAN_TECH_ROWS[row]));
    });
    return locks;
};

/**
 * What the extras need, in words: Live events need EMPIRE+ Live running; an extra member needs
 * Paid extra member in Tech (#56; it needed Commerce level 30). Early premieres are limited by
 * each title's rights, not research, and the full catalogue needs nothing.
 */
/** what the Live events extra says while no save runs EMPIRE+ Live (#126) */
export const STREAMING_LIVE_EXTRA_COMING = 'Live & Sports is coming in a future update';
export const getStreamingPlanExtraLocks = (
    tree: OwnedStreamingTechTreeState | undefined,
    activeProducts: ReadonlySet<string>,
): Partial<Record<StreamingPlanExtraRow, string>> => ({
    /* #126: Live & Sports is on the PRODUCT tab as coming in a future update; a save already running EMPIRE+ Live keeps it */
    ...(activeProducts.has('LIVE') ? {} : { live: STREAMING_LIVE_EXTRA_COMING }),
    ...(streamingTechExtraMemberAllowed(tree) ? {} : { extraseat: `Unlock ${getStreamingTechDefinition('TRUST_EXTRA_MEMBER')?.name || 'Paid extra member'} in Tech` }),
});
/** The tech an extra's lock opens in Tech (Go to Tech); Live events are a product, not a tech. */
export const STREAMING_PLAN_EXTRA_LOCK_TECH: Partial<Record<StreamingPlanExtraRow, StreamingTechId>> = { extraseat: 'TRUST_EXTRA_MEMBER' };

/* ── appeal (§6.7, Phase 2 #44) ── */

/** A picture step's place on the ladder: 480p 0 … 4K 3 … 24K 7. */
export const streamingPictureRank = (picture: StreamingTechId): number => Math.max(0, rank(PICTURE_LADDER, picture));
export const STREAMING_4K_RANK = rank(PICTURE_LADDER, 'PICTURE_4K');

/* What each row adds to a plan's appeal. Phase 1's points stay exactly (1080p 5; 4K with HDR
   12 = 8 + 4; Spatial 5), so a plan built the Phase 1 way is worth what it was; the steps past
   them add on top. 480p is a little worse than 720p, which real services no longer sell. */
const PICTURE_APPEAL: Partial<Record<StreamingTechId, number>> = {
    PICTURE_480P: -3, PICTURE_720P: 0, PICTURE_1080P: 5, PICTURE_4K: 8, PICTURE_8K: 12, PICTURE_12K: 15, PICTURE_16K: 17, PICTURE_24K: 19,
};
const HDR_EXTRA: Partial<Record<StreamingTechId, number>> = { HDR_HDR: 0, HDR_PRO: 1.5, HDR_ULTRA: 3 };
const COLOUR_APPEAL: Partial<Record<StreamingTechId, number>> = { COLOUR_12BIT: 1, COLOUR_16BIT: 2 };
const SOUND_APPEAL: Partial<Record<StreamingTechId, number>> = {
    SOUND_STEREO: 0, SOUND_51: 1, SOUND_71: 2, SOUND_SPATIAL: 5, SOUND_LOSSLESS: 7, SOUND_PERSONAL: 9,
};
const DIALOGUE_APPEAL = 2;

/** A version's quality: 1 at version 1, 1.2 at 2, 1.4 at 3 (Phase 1's rule). */
const versionQuality = (tree: OwnedStreamingTechTreeState, id: StreamingTechId | null): number => {
    if (!id) return 1;
    const version = streamingTechVersion(tree, id);
    return version >= 3 ? 1.4 : version === 2 ? 1.2 : 1;
};

/**
 * What one tech row adds to a plan's appeal before its version (#85: a version adds a fifth of it, shown on the step): a
 * picture step, an HDR step on 4K and up, a colour or sound step, Clear dialogue; 0 for a row that adds nothing.
 */
export const streamingTechRowAppeal = (id: StreamingTechId): number => {
    if (id in PICTURE_APPEAL) return Math.max(0, PICTURE_APPEAL[id] ?? 0);
    if (id in HDR_EXTRA) return 4 + (HDR_EXTRA[id] ?? 0);
    if (id in COLOUR_APPEAL) return COLOUR_APPEAL[id] ?? 0;
    if (id in SOUND_APPEAL) return SOUND_APPEAL[id] ?? 0;
    return id === 'SOUND_CLEAR_DIALOGUE' ? DIALOGUE_APPEAL : 0;
};

/**
 * What a plan's tech rows add to its appeal: picture, HDR (4 on 4K and up, 2 on 1080p, more for
 * Pro and Ultra), 12/16-bit colour, sound and Clear dialogue, each scaled by its tech's version.
 */
export const streamingPlanOfferAppeal = (offer: OwnedStreamingPlanOffer, tree: OwnedStreamingTechTreeState): number => {
    const pictureRank = streamingPictureRank(offer.picture);
    const hdr = offer.hdr && pictureRank >= rank(PICTURE_LADDER, 'PICTURE_1080P')
        ? (pictureRank >= STREAMING_4K_RANK ? 4 : 2) + (HDR_EXTRA[offer.hdr] ?? 0) : 0;
    return (PICTURE_APPEAL[offer.picture] ?? 0) * (PICTURE_APPEAL[offer.picture]! > 0 ? versionQuality(tree, offer.picture) : 1)
        + hdr * versionQuality(tree, offer.hdr)
        + (COLOUR_APPEAL[offer.colour] ?? 0) * versionQuality(tree, offer.colour)
        + (SOUND_APPEAL[offer.sound] ?? 0) * versionQuality(tree, offer.sound)
        + (offer.dialogue ? DIALOGUE_APPEAL * versionQuality(tree, 'SOUND_CLEAR_DIALOGUE') : 0);
};

/**
 * What an ad level does (§6.7): appeal lost, the per-household ad penalty (× (100 − price
 * sensitivity)), the bonus value-seekers give a cheaper ad plan, and the ad minutes an hour
 * against the service's cadence. Standard is exactly what ads did before Phase 2.
 */
export const STREAMING_AD_LEVEL_EFFECTS: Record<StreamingPlanAdLevel, { appeal: number; penalty: number; valueBonus: number; minutes: number }> = {
    NONE: { appeal: 0, penalty: 0, valueBonus: 0, minutes: 0 },
    LIGHT: { appeal: 5, penalty: .05, valueBonus: 6, minutes: .5 },
    STANDARD: { appeal: 9, penalty: .09, valueBonus: 7, minutes: 1 },
    HEAVY: { appeal: 15, penalty: .16, valueBonus: 8, minutes: 2 },
};

/**
 * How much more a prestige viewer likes a plan with 4K HDR or better (Phase 1 gave a flat 13):
 * 13 when it matches the best picture a rival sells in that market, 3 more for every step above
 * both that and 4K, and half as much for every step a rival sells beyond it. With rivals at 4K,
 * as today, 4K HDR is worth exactly what it was.
 */
export const streamingPrestigePictureBonus = (pictureRank: number, bestRivalRank: number): number => {
    if (pictureRank >= bestRivalRank) return 13 + 3 * Math.max(0, pictureRank - Math.max(bestRivalRank, STREAMING_4K_RANK));
    return 13 * Math.pow(.5, bestRivalRank - pictureRank);
};

/* ── Free with ads (§6.5, Phase 2 #46) ── */

/** The id and name a free tier stands under where plans are listed (locks, receipts, load). */
export const STREAMING_FREE_TIER_ID = 'FREE_AD';
export const STREAMING_FREE_TIER_NAME = 'Free with ads';

/**
 * How a free tier's quality moves its audience: its offer's appeal (streamingPlanOfferAppeal)
 * against a 720p stereo tier at 0. More households choose it (×0.8 to ×1.6, 2.5% a point) and
 * they watch longer (×0.92 to ×1.25, 1% a point). A free tier whose quality was never set is as
 * before (×1).
 */
export const streamingFreeTierChoiceFactor = (appeal: number | undefined): number => (
    appeal === undefined || !Number.isFinite(appeal) ? 1 : Math.min(1.6, Math.max(.8, 1 + appeal / 40))
);
export const streamingFreeTierEngagementFactor = (appeal: number | undefined): number => (
    appeal === undefined || !Number.isFinite(appeal) ? 1 : Math.min(1.25, Math.max(.92, 1 + appeal / 100))
);

/**
 * A free tier draws pirates in (#57; plan §1: "a cheap or free tier also draws pirates in"). The
 * player's only, so rivals are as they were:
 *  - draw: of the homes a cohort leaves outside every service, its piracy tendency × 5% × the free
 *    tier's choice factor × its exposure come to the player's free tier instead;
 *  - cut: of the people pirating the player's titles, 20% × the choice factor (16–32%) watch the
 *    free tier instead.
 * A service without a free tier: neither.
 */
export const STREAMING_FREE_TIER_PIRACY = { draw: .05, cut: .2 } as const;
export const streamingFreeTierPiracyCut = (appeal: number | undefined): number => (
    Math.round(STREAMING_FREE_TIER_PIRACY.cut * streamingFreeTierChoiceFactor(appeal) * 1000) / 1000
);
