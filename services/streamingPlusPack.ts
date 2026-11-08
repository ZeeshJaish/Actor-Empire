/* The Streaming+ Pack (2026-11-08): what it holds, and the one check every door uses.

   Zeesh's rule: the free game is whole; the pack goes further, and nothing may
   reach a pack item by a side door (a wizard, Suggest, the team, a revision).
   So the check sits in the engine's write functions, and the screens read the
   same lists for their chips. Only buying is gated: the weekly simulation never
   reads this file, and a save keeps whatever it already has.

   The plan: ae marketing/monetization/FINAL-plan-2026-11-08.md */
import type { Player } from '../types';

export const STREAMING_PLUS_PRODUCT_ID = 'streaming_plus' as const;

/** 21 countries, 35% of the world's viewers: China, then one launch market and a few
 *  mid and small countries in every region. Without the pack they cannot be
 *  launched in or entered.
 *
 *  This replaced 30 locked server cities on 2026-11-09. Zeesh: "विजार्ड में जाता हूँ
 *  तो वहाँ तो कंट्रीज आते हैं, तो सिटी लॉक करने का तो कोई सीन नहीं है, हमें कंट्री लॉक
 *  करना होगा". He took the 20 proposed countries ("mujhe yeh countries theek lag rhe")
 *  and asked for one super country ("Ek super country aur add karna chahiye"), so
 *  China was added.
 *
 *  Servers stay free everywhere. Rooms in Panama, Senegal, Fiji and Saudi Arabia
 *  are the only reach for free neighbours. With them locked, Costa Rica, Cape
 *  Verde, Mauritania and Tonga stay dark and Yemen thin, even with 12 racks in
 *  every free city. */
export const STREAMING_PLUS_COUNTRY_IDS: ReadonlySet<string> = new Set([
    // Asia, with the super country
    'CN', 'JP', 'VN', 'MY', 'SA', 'NP', 'LK',
    // North America
    'CA', 'DO', 'PA',
    // South America
    'AR', 'EC', 'UY',
    // Europe
    'DE', 'PT', 'IE',
    // Africa
    'ZA', 'MA', 'SN',
    // Oceania
    'NZ', 'FJ',
]);

export const STREAMING_PLUS_SERVER_TIERS: ReadonlySet<string> = new Set(['TITAN']);
export const STREAMING_PLUS_CLOUD_PROVIDERS: ReadonlySet<string> = new Set(['MERIDIAN']);

/** 10 Tech steps, 40% of Tech's energy: what viewers see as a wow. */
export const STREAMING_PLUS_TECH_IDS: ReadonlySet<string> = new Set([
    'PICTURE_12K', 'PICTURE_16K', 'PICTURE_24K', 'HDR_ULTRA', 'COLOUR_16BIT',
    'SOUND_PERSONAL', 'APPS_CAR', 'APPS_HOLO', 'AI_TASTE', 'AI_CHANNELS',
]);

/** The 5 big moments, City screens and Metro wraps. */
export const STREAMING_PLUS_CAMPAIGN_FORMATS: ReadonlySet<string> = new Set([
    'BUILDING_REVEAL', 'LANDMARK_LIGHT_SHOW', 'DRONE_SHOW', 'FAN_FESTIVAL', 'LIVE_SHOW', 'CITY_SCREEN', 'METRO_WRAP',
]);

/** The 12 front pages of #122 and Freeform Canvas. */
export const STREAMING_PLUS_STOREFRONT_IDS: ReadonlySet<string> = new Set([
    'cover-story', 'the-chart', 'coverflow', 'the-deck', 'gallery', 'bento', 'film-strip',
    'broadsheet', 'orbit', 'library', 'box-office', 'scrapbook', 'freeform-canvas',
]);

export const STREAMING_PLUS_IDENT_IDS: ReadonlySet<string> = new Set(['cinematic', 'living']);

export type StreamingPlusItem =
    | { kind: 'COUNTRY'; id: string }
    | { kind: 'TIER'; id: string }
    | { kind: 'CLOUD'; id: string }
    | { kind: 'TECH'; id: string }
    | { kind: 'CAMPAIGN'; id: string }
    | { kind: 'STOREFRONT'; id: string }
    | { kind: 'IDENT'; id: string }
    | { kind: 'IPO' };

/** Read only: never writes into the player (premiumLogic's reader creates the list when missing). */
export const hasStreamingPlus = (player: { flags?: Record<string, unknown> | null } | null | undefined): boolean => {
    const owned = player?.flags?.premiumPurchases;
    return Array.isArray(owned) && owned.includes(STREAMING_PLUS_PRODUCT_ID);
};

export const isStreamingPlusItem = (item: StreamingPlusItem): boolean => {
    switch (item.kind) {
        case 'COUNTRY': return STREAMING_PLUS_COUNTRY_IDS.has(String(item.id || '').trim().toUpperCase());
        case 'TIER': return STREAMING_PLUS_SERVER_TIERS.has(String(item.id || '').toUpperCase());
        case 'CLOUD': return STREAMING_PLUS_CLOUD_PROVIDERS.has(String(item.id || '').toUpperCase());
        case 'TECH': return STREAMING_PLUS_TECH_IDS.has(String(item.id || ''));
        case 'CAMPAIGN': return STREAMING_PLUS_CAMPAIGN_FORMATS.has(String(item.id || ''));
        case 'STOREFRONT': return STREAMING_PLUS_STOREFRONT_IDS.has(String(item.id || '').toLowerCase());
        case 'IDENT': return STREAMING_PLUS_IDENT_IDS.has(String(item.id || '').toLowerCase());
        case 'IPO': return true;
        default: return false;
    }
};

/** True when this player may not take this item now. */
export const streamingPlusLocks = (player: Parameters<typeof hasStreamingPlus>[0], item: StreamingPlusItem): boolean =>
    isStreamingPlusItem(item) && !hasStreamingPlus(player);

export const STREAMING_PLUS_NAME = 'Streaming+ Pack';

/** The one line a refused action says. */
export const streamingPlusRefusal = (what: string) => `${what} is part of the ${STREAMING_PLUS_NAME}.`;

const NO_COUNTRIES: ReadonlySet<string> = new Set();
/** The countries a player cannot launch in or enter now: the 21 without the pack, none with it. */
export const streamingPlusLockedCountryIds = (owned: boolean): ReadonlySet<string> => (owned ? NO_COUNTRIES : STREAMING_PLUS_COUNTRY_IDS);

/** For pickers: may this player launch in, or enter, this country now? */
export const streamingPlusCountryOpen = (player: Parameters<typeof hasStreamingPlus>[0], countryId: string) =>
    !streamingPlusLocks(player, { kind: 'COUNTRY', id: countryId });

/** What a locked country's card and the sheet say: "Germany is a Streaming+ country." */
export const streamingPlusCountryLine = (countryName: string) => `${countryName} is a Streaming+ country.`;

/* ---- the network: what a change adds, compared with what was there ---- */
interface FacilityView {
    id: string;
    cityId: string;
    type?: string;
    installedRacks?: number;
    rackGroups?: Array<{ rackCount: number; serverTier?: string }>;
    lease?: { tenure?: string; cloudProvider?: string } | null;
}

const isCloud = (facility: FacilityView) => facility.type === 'CLOUD_ALLOCATION' || facility.lease?.tenure === 'CLOUD';
const sizeOf = (facility: FacilityView | undefined) => {
    if (!facility) return 0;
    const grouped = (facility.rackGroups || []).reduce((sum, group) => sum + Math.max(0, Number(group.rackCount) || 0), 0);
    return Math.max(grouped, Math.max(0, Number(facility.installedRacks) || 0));
};
const titansOf = (facility: FacilityView | undefined) => (facility?.rackGroups || [])
    .filter(group => STREAMING_PLUS_SERVER_TIERS.has(String(group.serverTier || 'WORKHORSE').toUpperCase()))
    .reduce((sum, group) => sum + Math.max(0, Number(group.rackCount) || 0), 0);

export interface StreamingPlusNetworkBlock {
    item: StreamingPlusItem;
    cityId: string;
    message: string;
}

/** The first pack item a network change would add without the pack, or null.
 *  Taking things away, repairs and what a save already has are always allowed.
 *  Every city takes rooms: the pack's countries lock selling there, not building there. */
export const streamingPlusNetworkBlock = (
    player: Parameters<typeof hasStreamingPlus>[0],
    before: readonly FacilityView[] | null | undefined,
    after: readonly FacilityView[] | null | undefined,
): StreamingPlusNetworkBlock | null => {
    if (hasStreamingPlus(player)) return null;
    const previous = new Map((before || []).map(facility => [facility.id, facility]));
    for (const facility of after || []) {
        const was = previous.get(facility.id);
        const grows = !was || sizeOf(facility) > sizeOf(was);
        if (titansOf(facility) > titansOf(was)) {
            return { item: { kind: 'TIER', id: 'TITAN' }, cityId: facility.cityId, message: streamingPlusRefusal('The Titan server') };
        }
        const provider = String(facility.lease?.cloudProvider || '').toUpperCase();
        if (isCloud(facility) && grows && STREAMING_PLUS_CLOUD_PROVIDERS.has(provider)) {
            return { item: { kind: 'CLOUD', id: provider }, cityId: facility.cityId, message: streamingPlusRefusal('Meridian Edge cloud') };
        }
    }
    return null;
};

/** For pickers: the server tier to use when the wanted one is locked. */
export const streamingPlusTierOrFallback = <T extends string>(player: Parameters<typeof hasStreamingPlus>[0], tier: T, fallback: T): T =>
    streamingPlusLocks(player, { kind: 'TIER', id: tier }) ? fallback : tier;

/* ---- what the one sheet lists ---- */
export const STREAMING_PLUS_TODAY: ReadonlyArray<{ id: string; title: string; line: string }> = [
    { id: 'countries', title: '21 Streaming+ countries', line: 'China, Japan, Germany, Canada and 17 more in every region: a third of the world’s viewers' },
    { id: 'servers', title: 'Titan servers and Meridian Edge', line: 'The high-end rack and the premium edge cloud: more reach from fewer rooms' },
    { id: 'tech', title: '10 future Tech steps', line: '12K to 24K, HDR Ultra, 16-bit colour, personal sound, car and holo screens, the taste engine, AI channels' },
    { id: 'company', title: 'The IPO and Wall Street', line: 'List your company, ring the bell, earnings calls, buybacks and your ticker' },
    { id: 'campaigns', title: '7 big campaign moments', line: 'Building reveals, landmark light shows, drone shows, fan festivals, live stunts, city screens, metro wraps' },
    { id: 'brand', title: '13 front pages and 2 idents', line: 'Cover Story, Orbit, Coverflow and ten more; the Cinematic and Living idents' },
];

export const STREAMING_PLUS_LATER: ReadonlyArray<{ id: string; title: string; line: string }> = [
    { id: 'products', title: 'Products, such as Live & Sports', line: 'Included in the Streaming+ Pack when they arrive. No date yet.' },
    { id: 'deal-room', title: 'The Deal Room', line: 'Included in the Streaming+ Pack when it arrives. No date yet.' },
];

/** Dev and audits only: the test company tests everything, so it carries the pack (the dev menu can take it away). */
export const grantStreamingPlusForTesting = <T extends { flags?: Record<string, any> | null }>(player: T): T => {
    const owned = Array.isArray(player.flags?.premiumPurchases) ? player.flags!.premiumPurchases as string[] : [];
    return owned.includes(STREAMING_PLUS_PRODUCT_ID) ? player : { ...player, flags: { ...(player.flags || {}), premiumPurchases: [...owned, STREAMING_PLUS_PRODUCT_ID] } };
};
