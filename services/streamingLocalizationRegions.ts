/**
 * Localization by region — the rules, with no state changes.
 *
 * A region is one language network (`STREAMING_LANGUAGE_PACKAGES`). Setting it
 * up costs cash once (the package capability, with its weekly cost). Each
 * region then has two tracks, subtitles and dubbing, and each track rises a
 * level at a time with energy (see `streamingLocalizationResearch.ts`).
 *
 * A level says WHICH titles get the track (Zeesh, 2026-10-23: "level 2 brings
 * more advanced titles"):
 *   level 1  the library      titles on the service 9 weeks or more
 *   level 2  new releases     from their second week
 *   level 3  premieres        from their first day
 *
 * A title the track reaches plays stronger in every country that speaks one
 * of the region's languages: subtitles +.18, dubbing +.30 over the open
 * region's .58, so both tracks together equal a local title (1.06). A country
 * takes the best open region that reaches it. The fit model feeds the viewing
 * engine (who watches) and the player's offer (who subscribes). Levels never
 * decay.
 */
import type {
    OwnedStreamingLocalizationMilestone,
    OwnedStreamingLocalizationRegion,
    OwnedStreamingPlatformState,
    Player,
    StreamingLocalizationTrack,
} from '../types';
import {
    STREAMING_LANGUAGE_PACKAGES,
    getStreamingLanguagePackageCapabilityId,
    normalizeStreamingLanguageId,
    resolveStreamingLocalizationTiers,
} from './streamingLocalizationCapabilities';
import { WORLD_COUNTRY_DEFINITIONS } from './worldEconomy/worldCountryRegistry';

export const STREAMING_LOCALIZATION_TRACKS: StreamingLocalizationTrack[] = ['SUBTITLES', 'DUBBING'];
/** One press of the energy button. */
export const STREAMING_LOCALIZATION_ENERGY_STEP = 5;

/** Energy to reach each level (Zeesh, 2026-10-23: 10/20/30 and 20/30/40). */
export const STREAMING_LOCALIZATION_LEVEL_ENERGY: Record<StreamingLocalizationTrack, [number, number, number]> = {
    SUBTITLES: [10, 20, 30],
    DUBBING: [20, 30, 40],
};

export const getStreamingLocalizationLevelEnergy = (track: StreamingLocalizationTrack, level: number): number | null => (
    level >= 1 && level <= 3 ? STREAMING_LOCALIZATION_LEVEL_ENERGY[track][level - 1] : null
);

/* ── what a level reaches ── */

export type StreamingLocalizationTitleClass = 'LIBRARY' | 'NEW_RELEASE' | 'PREMIERE';

/** A title in its first week on the service is a premiere; through week 8, a new release. */
export const STREAMING_LOCALIZATION_NEW_RELEASE_WEEKS = 8;

export const STREAMING_LOCALIZATION_LEVEL_REACH: Record<1 | 2 | 3, { titleClass: StreamingLocalizationTitleClass; name: string; detail: string }> = {
    1: { titleClass: 'LIBRARY', name: 'Library', detail: 'titles on your service 9 weeks or more' },
    2: { titleClass: 'NEW_RELEASE', name: 'New releases', detail: 'titles from their second week' },
    3: { titleClass: 'PREMIERE', name: 'Day-one premieres', detail: 'premieres from their first day' },
};

export const streamingLocalizationTitleClass = (weeksAvailable: number): StreamingLocalizationTitleClass => (
    weeksAvailable <= 1 ? 'PREMIERE' : weeksAvailable <= STREAMING_LOCALIZATION_NEW_RELEASE_WEEKS ? 'NEW_RELEASE' : 'LIBRARY'
);

/** The level a track needs to reach a title of this age. */
export const streamingLocalizationLevelNeeded = (weeksAvailable: number): 1 | 2 | 3 => {
    const titleClass = streamingLocalizationTitleClass(weeksAvailable);
    return titleClass === 'PREMIERE' ? 3 : titleClass === 'NEW_RELEASE' ? 2 : 1;
};

/**
 * How the desk names and colours each region, in display order. The seven
 * colours are a validated categorical set for the dark desk surface
 * (#0b0e15) in exactly this order (adjacent CVD ΔE ≥ 8.4, normal-vision ≥ 19.3),
 * so regions shown side by side keep this order. A region's name always
 * travels with its colour. `flags` are the countries drawn on its card.
 * Europe & English is violet, not blue: the maps' sea is blue (#0ea5e9), and
 * the old #3987e5 sat only ΔE 8 from it (violet: ΔE 22-27 from the sea, 41
 * from the land). Eastern Europe & Central Asia is fuchsia: of the colours that
 * pass in order, the one farthest from all six others (ΔE ≥ 15), the sea (30)
 * and the land (44).
 */
export const STREAMING_LOCALIZATION_REGION_ORDER = [
    'WESTERN_EUROPE_CORE',
    'INDIA_CORE',
    'LATIN_AMERICA_CORE',
    'SOUTHEAST_ASIA_CORE',
    'EAST_ASIA_CORE',
    'MIDDLE_EAST_AFRICA_CORE',
    'EASTERN_EUROPE_CENTRAL_ASIA_CORE',
] as const;
export const STREAMING_LOCALIZATION_REGION_META: Record<string, { name: string; accent: string; flags: string[] }> = {
    WESTERN_EUROPE_CORE: { name: 'Europe & English', accent: '#7c4dff', flags: ['GB', 'FR', 'DE', 'IT'] },
    INDIA_CORE: { name: 'South Asia', accent: '#d95926', flags: ['IN', 'PK', 'BD', 'LK'] },
    LATIN_AMERICA_CORE: { name: 'Latin America', accent: '#199e70', flags: ['BR', 'MX', 'AR', 'ES'] },
    SOUTHEAST_ASIA_CORE: { name: 'Southeast Asia', accent: '#c98500', flags: ['ID', 'VN', 'TH', 'PH'] },
    EAST_ASIA_CORE: { name: 'East Asia', accent: '#d55181', flags: ['CN', 'JP', 'KR'] },
    MIDDLE_EAST_AFRICA_CORE: { name: 'Middle East & Africa', accent: '#008300', flags: ['EG', 'SA', 'TR', 'NG'] },
    EASTERN_EUROPE_CENTRAL_ASIA_CORE: { name: 'Eastern Europe & Central Asia', accent: '#c026d3', flags: ['RU', 'PL', 'UA', 'KZ'] },
};

/* ── the fit model ──────────────────────────────────────────────────────────
   A title in a language the country speaks: native (unchanged).
   Another language, no open region reaching the country: .42 (unchanged).
   Another language, an open region: .58, plus .18 when the subtitle track
   reaches the title and .30 when the dubbing track does (1.06 = local). */
export const STREAMING_LANGUAGE_FIT = {
    uncovered: .42,
    covered: .58,
    subtitles: .18,
    dubbing: .30,
    max: 1.06,
} as const;

export const resolveCoveredLanguageFit = (subtitlesReach: boolean, dubbingReach: boolean): number => (
    STREAMING_LANGUAGE_FIT.covered
    + (subtitlesReach ? STREAMING_LANGUAGE_FIT.subtitles : 0)
    + (dubbingReach ? STREAMING_LANGUAGE_FIT.dubbing : 0)
);

/** 0 with no region, 1 with both tracks reaching the title. */
export const localizationCoverageShare = (fit: number): number => Math.max(0, Math.min(1,
    (fit - STREAMING_LANGUAGE_FIT.uncovered) / (STREAMING_LANGUAGE_FIT.max - STREAMING_LANGUAGE_FIT.uncovered)));

/**
 * Viewing: where subtitles and dubbing reach the titles a cohort would choose,
 * more of it finds something to watch: up to 25% more when its whole weighted
 * choice is other-language titles both tracks reach.
 */
export const STREAMING_LOCALIZED_ENGAGEMENT_LIFT = .25;
/**
 * Subscribing: the offer's localization index in a market gains up to this
 * much when every title is in another language and fully localized there.
 * Never lower than the index without it.
 */
export const STREAMING_LOCALIZATION_APPEAL_WEIGHT = 40;

/* ── region state ── */

export interface StreamingLocalizationRegionLevels {
    packageId: string;
    unlocked: boolean;
    subtitleLevel: 0 | 1 | 2 | 3;
    dubbingLevel: 0 | 1 | 2 | 3;
    subtitleProgress: number;
    dubbingProgress: number;
}

const level = (value: unknown): 0 | 1 | 2 | 3 => {
    const parsed = Math.round(Number(value));
    return (Number.isFinite(parsed) ? Math.max(0, Math.min(3, parsed)) : 0) as 0 | 1 | 2 | 3;
};

const installedCapabilityIds = (platform: Pick<OwnedStreamingPlatformState, 'capabilities'>): Set<string> => new Set(
    (platform.capabilities?.installed || [])
        .filter(item => item.status === 'OPERATING' || item.status === 'LEGACY_GRANT')
        .map(item => item.capabilityId),
);

/**
 * Every region with its effective levels. An older save's platform-wide
 * subtitle and dubbing tiers (Technology Campus research) still count, in
 * every region it set up, so nothing it earned is lost.
 */
export const resolveStreamingLocalizationRegions = (
    platform: Pick<OwnedStreamingPlatformState, 'capabilities' | 'localizationOperations'>,
): StreamingLocalizationRegionLevels[] => {
    const installed = installedCapabilityIds(platform);
    const legacy = resolveStreamingLocalizationTiers(Array.from(installed));
    const stored = new Map((platform.localizationOperations?.regions || []).map(region => [region.packageId, region]));
    return STREAMING_LANGUAGE_PACKAGES.map(definition => {
        const unlocked = installed.has(getStreamingLanguagePackageCapabilityId(definition.id));
        const region = stored.get(definition.id);
        const subtitleLevel = unlocked ? level(Math.max(region?.subtitleLevel || 0, legacy.subtitleLevel)) : 0;
        const dubbingLevel = unlocked ? level(Math.max(region?.dubbingLevel || 0, legacy.dubbingLevel)) : 0;
        return {
            packageId: definition.id,
            unlocked,
            subtitleLevel,
            dubbingLevel,
            subtitleProgress: unlocked && subtitleLevel < 3 ? Math.max(0, region?.subtitleProgress || 0) : 0,
            dubbingProgress: unlocked && dubbingLevel < 3 ? Math.max(0, region?.dubbingProgress || 0) : 0,
        };
    });
};

export interface StreamingCountryLocalization {
    /** the open region that serves the country best; null when none reaches it */
    packageId: string | null;
    subtitleLevel: 0 | 1 | 2 | 3;
    dubbingLevel: 0 | 1 | 2 | 3;
}

const UNCOVERED: StreamingCountryLocalization = { packageId: null, subtitleLevel: 0, dubbingLevel: 0 };

/** A title of this age in another language, in a country this localization serves. */
export const resolveTitleLanguageFit = (country: StreamingCountryLocalization, weeksAvailable: number): number => {
    if (!country.packageId) return STREAMING_LANGUAGE_FIT.uncovered;
    const needed = streamingLocalizationLevelNeeded(weeksAvailable);
    return resolveCoveredLanguageFit(country.subtitleLevel >= needed, country.dubbingLevel >= needed);
};

const PACKAGE_LANGUAGES = new Map(STREAMING_LANGUAGE_PACKAGES.map(item => [item.id, new Set(item.languageIds)]));

/** The regions whose languages a country speaks, open or not, in package order. */
export const streamingLocalizationPackagesForLanguages = (languages: string[]): string[] => {
    const spoken = languages.map(normalizeStreamingLanguageId);
    return STREAMING_LANGUAGE_PACKAGES
        .filter(item => spoken.some(language => PACKAGE_LANGUAGES.get(item.id)!.has(language)))
        .map(item => item.id);
};

/**
 * One reader per week: resolves a country's localization from its language
 * list, caching by list. The viewing engine and the offer share it. Among
 * open regions reaching the country, the one whose levels weigh most serves.
 */
export const createStreamingCountryLocalizationResolver = (
    platform: Pick<OwnedStreamingPlatformState, 'capabilities' | 'localizationOperations'>,
): (languages: string[]) => StreamingCountryLocalization => {
    const open = resolveStreamingLocalizationRegions(platform).filter(region => region.unlocked);
    const cache = new Map<string, StreamingCountryLocalization>();
    return (languages: string[]) => {
        const key = languages.join('|');
        const cached = cache.get(key);
        if (cached) return cached;
        const reaching = new Set(streamingLocalizationPackagesForLanguages(languages));
        let best = UNCOVERED;
        let bestWeight = -1;
        for (const region of open) {
            if (!reaching.has(region.packageId)) continue;
            const weight = region.subtitleLevel * STREAMING_LANGUAGE_FIT.subtitles + region.dubbingLevel * STREAMING_LANGUAGE_FIT.dubbing;
            if (weight > bestWeight) {
                bestWeight = weight;
                best = { packageId: region.packageId, subtitleLevel: region.subtitleLevel, dubbingLevel: region.dubbingLevel };
            }
        }
        cache.set(key, best);
        return best;
    };
};

/* ── where each region's languages are the main one (the desk's map) ── */

/** A country belongs on a region's map when its first-listed language is one of the region's. */
export const STREAMING_LOCALIZATION_HOME_COUNTRIES: Record<string, string[]> = (() => {
    const homes: Record<string, string[]> = Object.fromEntries(STREAMING_LANGUAGE_PACKAGES.map(item => [item.id, [] as string[]]));
    for (const country of WORLD_COUNTRY_DEFINITIONS) {
        const primary = normalizeStreamingLanguageId(country.languages[0]);
        const owner = STREAMING_LANGUAGE_PACKAGES.find(item => PACKAGE_LANGUAGES.get(item.id)!.has(primary));
        if (owner) homes[owner.id].push(country.id);
    }
    return homes;
})();

/* ── a region's figures, read from the world ── */

export interface StreamingLocalizationRegionFootprint {
    /** the player's live markets that speak one of the region's languages, most subscribers first */
    countries: Array<{ countryId: string; name: string; subscribers: number }>;
    /** paid accounts in those markets at the last processed week */
    subscribers: number;
}

/** Live markets are the countries where the customer model holds the player's service. */
export const measureStreamingLocalizationRegion = (
    player: Pick<Player, 'world'>,
    packageId: string,
): StreamingLocalizationRegionFootprint => {
    const languages = PACKAGE_LANGUAGES.get(packageId);
    const customers = player.world?.worldStreamingCustomers?.countries || {};
    const population = player.world?.worldPopulation?.countries || {};
    if (!languages) return { countries: [], subscribers: 0 };
    const countries: StreamingLocalizationRegionFootprint['countries'] = [];
    for (const [countryId, country] of Object.entries(customers)) {
        const row = country.platformSummaries?.find(item => item.platformId === 'PLAYER');
        if (!row) continue;
        const spoken = (population[countryId]?.languages || []).map(normalizeStreamingLanguageId);
        if (!spoken.some(language => languages.has(language))) continue;
        countries.push({ countryId, name: population[countryId]?.name || countryId, subscribers: Math.max(0, row.endingPaidAccounts || 0) });
    }
    countries.sort((left, right) => right.subscribers - left.subscribers || left.countryId.localeCompare(right.countryId));
    return { countries, subscribers: countries.reduce((sum, row) => sum + row.subscribers, 0) };
};

/* ── normalisation (idempotent; loading never changes cash or time) ── */

const asRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);
const finite = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const nonNegative = (value: unknown): number => Math.max(0, Math.round(finite(value)));
const KNOWN_PACKAGE_IDS = new Set(STREAMING_LANGUAGE_PACKAGES.map(item => item.id));
const isTrack = (value: unknown): value is StreamingLocalizationTrack => value === 'SUBTITLES' || value === 'DUBBING';

const normalizeMilestone = (value: unknown): OwnedStreamingLocalizationMilestone | null => {
    const source = asRecord(value);
    const milestoneLevel = level(source.level);
    if (!isTrack(source.track) || milestoneLevel === 0) return null;
    const baselineWeek = source.baselineAbsoluteWeek === null || source.baselineAbsoluteWeek === undefined
        ? null : nonNegative(source.baselineAbsoluteWeek);
    return {
        track: source.track,
        level: milestoneLevel as 1 | 2 | 3,
        completedAtAbsoluteWeek: nonNegative(source.completedAtAbsoluteWeek),
        baselineAbsoluteWeek: baselineWeek,
        baselineSubscribers: nonNegative(source.baselineSubscribers),
        baselineLocalizedViewers: nonNegative(source.baselineLocalizedViewers),
        baselineAddedViewers: nonNegative(source.baselineAddedViewers),
        ...(typeof source.by === 'string' && source.by.trim() ? { by: source.by.trim().slice(0, 80) } : {}),
    };
};

/** Energy toward the next level, below what that level needs (a full bar is a level). */
const clampProgress = (track: StreamingLocalizationTrack, currentLevel: number, value: unknown): number => {
    const needed = getStreamingLocalizationLevelEnergy(track, currentLevel + 1);
    return needed === null ? 0 : Math.min(needed - 1, nonNegative(value));
};

/**
 * Region rows: known packages only, levels 0–3, progress below its level's
 * energy, milestones deduped (last 6). A save from the first version of this
 * desk (#23) kept levels "in the lab" as `localizationOperations.research`;
 * their energy becomes the matching track's progress. Pass that raw array as
 * `legacyResearch`; the result never carries it, so a second pass is a no-op.
 */
export const normalizeStreamingLocalizationRegions = (value: unknown, legacyResearch?: unknown): OwnedStreamingLocalizationRegion[] => {
    const byPackage = new Map<string, OwnedStreamingLocalizationRegion>();
    for (const item of Array.isArray(value) ? value : []) {
        const source = asRecord(item);
        const packageId = String(source.packageId || '');
        if (!KNOWN_PACKAGE_IDS.has(packageId) || byPackage.has(packageId)) continue;
        const milestones = (Array.isArray(source.milestones) ? source.milestones : [])
            .map(normalizeMilestone)
            .filter((milestone): milestone is OwnedStreamingLocalizationMilestone => Boolean(milestone));
        const seen = new Set<string>();
        const subtitleLevel = level(source.subtitleLevel);
        const dubbingLevel = level(source.dubbingLevel);
        byPackage.set(packageId, {
            packageId,
            subtitleLevel,
            dubbingLevel,
            subtitleProgress: clampProgress('SUBTITLES', subtitleLevel, source.subtitleProgress),
            dubbingProgress: clampProgress('DUBBING', dubbingLevel, source.dubbingProgress),
            milestones: milestones.filter(milestone => {
                const key = `${milestone.track}:${milestone.level}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).slice(-6),
        });
    }
    for (const item of Array.isArray(legacyResearch) ? legacyResearch : []) {
        const source = asRecord(item);
        const packageId = String(source.packageId || '');
        if (!KNOWN_PACKAGE_IDS.has(packageId) || !isTrack(source.track)) continue;
        const region = byPackage.get(packageId) || {
            packageId, subtitleLevel: 0, dubbingLevel: 0, subtitleProgress: 0, dubbingProgress: 0, milestones: [],
        };
        const currentLevel = source.track === 'SUBTITLES' ? region.subtitleLevel : region.dubbingLevel;
        if (level(source.level) !== currentLevel + 1) continue;
        const progress = clampProgress(source.track, currentLevel, source.energyContributed);
        byPackage.set(packageId, source.track === 'SUBTITLES'
            ? { ...region, subtitleProgress: Math.max(region.subtitleProgress, progress) }
            : { ...region, dubbingProgress: Math.max(region.dubbingProgress, progress) });
    }
    return STREAMING_LANGUAGE_PACKAGES.flatMap(definition => {
        const region = byPackage.get(definition.id);
        return region ? [region] : [];
    });
};
