/**
 * Content Desk · Localization — what the tab shows, read from the save.
 *
 * Every figure is the simulation's own. The weekly viewing engine records,
 * per region: who watched a title from another language with the region's
 * subtitles or dubbing (and its five most-watched such titles), how many
 * viewers its levels added (the same week computed without them), and who
 * watched other-language titles no level reached ("untapped").
 *
 * The flow (Zeesh, 2026-10-23): set a region up with cash once, then raise
 * Subtitles and Dubbing a level at a time with energy. A level says which
 * titles the track reaches: the library, then new releases, then premieres
 * from their first day.
 */
import type { Player, StreamingLocalizationTrack } from '../types';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getAbsoluteWeek } from './legacyLogic';
import { getStreamingCatalogueReadContext, type StreamingCatalogueReadContext } from './streamingContentAvailability';
import { STREAMING_LANGUAGE_PACKAGES, normalizeStreamingLanguageId } from './streamingLocalizationCapabilities';
import { getOwnedStreamingProgramEntries } from './streamingOriginals';
import {
    STREAMING_LOCALIZATION_ENERGY_STEP,
    STREAMING_LOCALIZATION_HOME_COUNTRIES,
    STREAMING_LOCALIZATION_LEVEL_REACH,
    STREAMING_LOCALIZATION_NEW_RELEASE_WEEKS,
    STREAMING_LOCALIZATION_REGION_META,
    STREAMING_LOCALIZATION_REGION_ORDER,
    getStreamingLocalizationLevelEnergy,
    measureStreamingLocalizationRegion,
    resolveStreamingLocalizationRegions,
} from './streamingLocalizationRegions';
import { streamingLocalizationLevelName } from './streamingLocalizationResearch';
import { streamingTitleLanguageId } from './worldEconomy/worldStreamingContentValue';

export interface StreamingLocalizationDeskTitle {
    id: string;
    title: string;
    viewers: number;
}

export interface StreamingLocalizationDeskTier {
    level: 1 | 2 | 3;
    /** 'Library' · 'New releases' · 'Day-one premieres' */
    name: string;
    detail: string;
    energy: number;
    /** DONE reached · NEXT the one energy goes to · LATER after it */
    state: 'DONE' | 'NEXT' | 'LATER';
    /** energy already put toward it (NEXT only) */
    progress: number;
    /** the titles on the service this level brings, today */
    reach: { count: number; examples: string[]; note: string };
}

export interface StreamingLocalizationDeskTrack {
    track: StreamingLocalizationTrack;
    level: 0 | 1 | 2 | 3;
    tiers: [StreamingLocalizationDeskTier, StreamingLocalizationDeskTier, StreamingLocalizationDeskTier];
}

export interface StreamingLocalizationDeskRegion {
    packageId: string;
    name: string;
    accent: string;
    /** country codes drawn on its card */
    flags: string[];
    languages: string[];
    open: boolean;
    openCost: number;
    weeklyCost: number;
    canAffordOpen: boolean;
    /** countries whose main language is one of the region's (the map) */
    homeCountryIds: string[];
    /** the player's live markets that speak one of its languages */
    markets: { count: number; names: string[]; countryIds: string[] };
    subscribers: number;
    /** of those, where most of the catalogue is in another language: where the region helps most */
    helps: { count: number; names: string[]; subscribers: number };
    tracks: Record<StreamingLocalizationTrack, StreamingLocalizationDeskTrack>;
    /** the last processed week; null before the region has a processed week */
    week: { localized: number; added: number } | null;
    /** other-language viewing in its markets that no level reached, last week */
    untapped: number;
    /** its most-watched titles in its languages, last week */
    topTitles: StreamingLocalizationDeskTitle[];
    /** viewers the region added, week by week, aligned with the desk's trend weeks */
    trend: number[];
    /** since the last level was reached: the change in what the region adds a week */
    since: { label: string; weeks: number; added: number; localized: number; pending: boolean; by?: string } | null;
}

export interface StreamingLocalizationDeskTrendPoint {
    absoluteWeek: number;
    label: string;
    localized: number;
    added: number;
    /** levels that first applied this week */
    markers: Array<{ name: string; accent: string; level: string }>;
}

export interface StreamingLocalizationDeskView {
    /** the service has launched, so weeks are being processed */
    live: boolean;
    energy: { available: number; weekly: number; bank: number; step: number };
    treasury: number;
    /** the last processed week with localization figures */
    week: { absoluteWeek: number; label: string; localized: number; added: number; untapped: number; playerViewers: number } | null;
    /** up to twelve processed weeks, oldest first */
    trend: StreamingLocalizationDeskTrendPoint[];
    regions: StreamingLocalizationDeskRegion[];
    /** the weekly language report */
    insights: {
        /** up to 15 titles most watched in other languages, across regions (the tab shows 6, then all) */
        topTitles: Array<StreamingLocalizationDeskTitle & { regions: Array<{ packageId: string; name: string; accent: string; viewers: number }> }>;
        /** viewers by the main language of the country they watched in */
        audienceByLanguage: Array<{ language: string; viewers: number; share: number }>;
    };
}

const TREND_WEEKS = 12;

export const streamingLocalizationWeekLabel = (absoluteWeek: number): string => (
    `Year ${Math.floor(absoluteWeek / 52) + 1} · W${(absoluteWeek % 52) + 1}`
);

const languageLabel = (languageId: string): string => languageId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getStreamingLocalizationDesk = (player: Player, preparedContext?: StreamingCatalogueReadContext): StreamingLocalizationDeskView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const context = getStreamingCatalogueReadContext(player, preparedContext);
    const levels = new Map(resolveStreamingLocalizationRegions(platform).map(region => [region.packageId, region]));
    const stored = new Map((platform.localizationOperations.regions || []).map(region => [region.packageId, region]));
    const viewing = player.world?.worldStreamingViewing;
    const snapshots = (viewing?.snapshots || []).filter(snapshot => snapshot.localization).slice(-TREND_WEEKS);
    const latest = snapshots.at(-1) || null;

    /* ── titles: names, ages and languages ── */
    const playerTitles = viewing?.platforms?.PLAYER?.titlePerformance || [];
    const titleName = new Map(playerTitles.map(row => [row.projectId, row.title]));
    const launchWeek = platform.launchCommit?.committedAtAbsoluteWeek ?? null;
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const programWeek = launchWeek === null ? 0 : now - launchWeek + 1;
    const entries = launchWeek === null ? [] : getOwnedStreamingProgramEntries(player, context);
    entries.forEach(entry => { if (!titleName.has(entry.projectId)) titleName.set(entry.projectId, entry.title); });
    // Titles on the service by age: the library (9+ weeks), new releases (2–8)
    // and premieres still ahead (their first day comes later).
    const onService = playerTitles.filter(row => row.weeksAvailable >= 1);
    const library = onService.filter(row => row.weeksAvailable > STREAMING_LOCALIZATION_NEW_RELEASE_WEEKS);
    const newReleases = onService.filter(row => row.weeksAvailable >= 2 && row.weeksAvailable <= STREAMING_LOCALIZATION_NEW_RELEASE_WEEKS);
    const upcoming = entries
        .filter(entry => entry.launchWeek > programWeek)
        .sort((left, right) => left.launchWeek - right.launchWeek || left.title.localeCompare(right.title));
    const byViews = <T extends { viewingAccounts: number; title: string }>(rows: T[]) => [...rows]
        .sort((left, right) => right.viewingAccounts - left.viewingAccounts || left.title.localeCompare(right.title));
    const reachFor = (level: 1 | 2 | 3): StreamingLocalizationDeskTier['reach'] => {
        if (level === 1) return { count: library.length, examples: byViews(library).slice(0, 2).map(row => row.title),
            note: `${library.length} library title${library.length === 1 ? '' : 's'}` };
        if (level === 2) return { count: newReleases.length, examples: byViews(newReleases).slice(0, 2).map(row => row.title),
            note: `${newReleases.length} new release${newReleases.length === 1 ? '' : 's'} right now` };
        const next = upcoming[0];
        return {
            count: upcoming.length,
            examples: upcoming.slice(0, 2).map(entry => entry.title),
            note: next && launchWeek !== null
                ? `next premiere: ${next.title}, W${((launchWeek + next.launchWeek - 1) % 52) + 1}${upcoming.length > 1 ? ` (+${upcoming.length - 1} more)` : ''}`
                : 'every premiere you schedule',
        };
    };

    /* ── where each region helps most ── */
    const titleIds = [...new Set([
        ...platform.catalogProjectIds,
        ...(platform.starterCatalog?.ownedProjectIds || []),
        ...(platform.starterCatalog?.licensedProjectIds || []),
        ...platform.catalogLicenses.map(license => license.sourceProjectId),
        ...platform.originalCommissions.flatMap(commission => commission.canonicalProjectId ? [commission.canonicalProjectId] : []),
    ])];
    const titlesByLanguage = new Map<string, number>();
    titleIds.forEach(id => {
        const language = streamingTitleLanguageId(player, id, context);
        titlesByLanguage.set(language, (titlesByLanguage.get(language) || 0) + 1);
    });
    const population = player.world?.worldPopulation?.countries || {};
    const otherLanguageShare = (countryId: string): number => {
        if (!titleIds.length) return 0;
        const spoken = new Set((population[countryId]?.languages || []).map(normalizeStreamingLanguageId));
        let native = 0;
        spoken.forEach(language => { native += titlesByLanguage.get(language) || 0; });
        return 1 - native / titleIds.length;
    };

    /* ── the trend ── */
    const markersByWeek = new Map<number, StreamingLocalizationDeskTrendPoint['markers']>();
    for (const region of platform.localizationOperations.regions || []) {
        const meta = STREAMING_LOCALIZATION_REGION_META[region.packageId];
        for (const milestone of region.milestones) {
            const week = milestone.completedAtAbsoluteWeek + 1;
            const rows = markersByWeek.get(week) || [];
            rows.push({ name: meta?.name || region.packageId, accent: meta?.accent || '#7c4dff',
                level: streamingLocalizationLevelName(milestone.track, milestone.level) });
            markersByWeek.set(week, rows);
        }
    }
    const trend: StreamingLocalizationDeskTrendPoint[] = snapshots.map(snapshot => ({
        absoluteWeek: snapshot.absoluteWeek,
        label: streamingLocalizationWeekLabel(snapshot.absoluteWeek),
        localized: snapshot.localization!.localizedViewingAccounts,
        added: snapshot.localization!.addedViewingAccounts,
        markers: markersByWeek.get(snapshot.absoluteWeek) || [],
    }));

    /* ── the regions ── */
    const regions: StreamingLocalizationDeskRegion[] = STREAMING_LOCALIZATION_REGION_ORDER.map(packageId => {
        const definition = STREAMING_LANGUAGE_PACKAGES.find(item => item.id === packageId)!;
        const meta = STREAMING_LOCALIZATION_REGION_META[packageId];
        const region = levels.get(packageId)!;
        const footprint = measureStreamingLocalizationRegion(player, packageId);
        const helped = footprint.countries.filter(row => otherLanguageShare(row.countryId) >= .5);
        const latestRow = latest?.localization?.byPackage?.[packageId];
        // A region set up after the last processed week has no figures yet, not
        // zeros (its row may exist already: untapped viewing is counted for every region).
        const setUpAt = platform.capabilities.installed.find(row => row.capabilityId === `LANGUAGE_PACKAGE:${packageId}`)?.installedAtAbsoluteWeek;
        const setUpSinceLatest = setUpAt !== undefined && (!latest || latest.absoluteWeek < setUpAt);
        const week = region.unlocked && latestRow && !setUpSinceLatest ? { localized: latestRow.localized, added: latestRow.added } : null;
        const milestone = [...(stored.get(packageId)?.milestones || [])]
            .sort((left, right) => left.completedAtAbsoluteWeek - right.completedAtAbsoluteWeek)
            .at(-1);
        const since = milestone ? {
            label: streamingLocalizationLevelName(milestone.track, milestone.level),
            weeks: latest && milestone.baselineAbsoluteWeek !== null ? Math.max(0, latest.absoluteWeek - milestone.baselineAbsoluteWeek) : 0,
            added: (latestRow?.added || 0) - milestone.baselineAddedViewers,
            localized: (latestRow?.localized || 0) - milestone.baselineLocalizedViewers,
            pending: !latest || (milestone.baselineAbsoluteWeek !== null && latest.absoluteWeek <= milestone.baselineAbsoluteWeek),
            ...(milestone.by ? { by: milestone.by } : {}),
        } : null;
        const trackFor = (track: StreamingLocalizationTrack): StreamingLocalizationDeskTrack => {
            const current = track === 'SUBTITLES' ? region.subtitleLevel : region.dubbingLevel;
            const progress = track === 'SUBTITLES' ? region.subtitleProgress : region.dubbingProgress;
            const tiers = ([1, 2, 3] as const).map(level => ({
                level,
                name: STREAMING_LOCALIZATION_LEVEL_REACH[level].name,
                detail: STREAMING_LOCALIZATION_LEVEL_REACH[level].detail,
                energy: getStreamingLocalizationLevelEnergy(track, level)!,
                state: level <= current ? 'DONE' as const : level === current + 1 ? 'NEXT' as const : 'LATER' as const,
                progress: level === current + 1 ? progress : 0,
                reach: reachFor(level),
            })) as StreamingLocalizationDeskTrack['tiers'];
            return { track, level: current, tiers };
        };
        return {
            packageId,
            name: meta?.name || definition.name,
            accent: meta?.accent || '#7c4dff',
            flags: meta?.flags || [],
            languages: definition.languageIds.map(languageLabel),
            open: region.unlocked,
            openCost: definition.activationCost,
            weeklyCost: definition.weeklyOperatingCost,
            canAffordOpen: platform.treasuryCash >= definition.activationCost,
            homeCountryIds: STREAMING_LOCALIZATION_HOME_COUNTRIES[packageId] || [],
            markets: {
                count: footprint.countries.length,
                names: footprint.countries.slice(0, 4).map(row => row.name),
                countryIds: footprint.countries.map(row => row.countryId),
            },
            subscribers: footprint.subscribers,
            helps: {
                count: helped.length,
                names: helped.slice(0, 4).map(row => row.name),
                subscribers: helped.reduce((sum, row) => sum + row.subscribers, 0),
            },
            tracks: { SUBTITLES: trackFor('SUBTITLES'), DUBBING: trackFor('DUBBING') },
            week,
            untapped: latestRow?.untapped || 0,
            topTitles: (latestRow?.top || []).map(([id, viewers]) => ({ id, title: titleName.get(id) || 'A title', viewers })),
            trend: snapshots.map(snapshot => snapshot.localization!.byPackage?.[packageId]?.added || 0),
            since,
        };
    });

    /* ── the weekly language report ── */
    const titleTotals = new Map<string, { viewers: number; regions: Array<{ packageId: string; name: string; accent: string; viewers: number }> }>();
    regions.forEach(region => region.topTitles.forEach(row => {
        const total = titleTotals.get(row.id) || { viewers: 0, regions: [] };
        total.viewers += row.viewers;
        total.regions.push({ packageId: region.packageId, name: region.name, accent: region.accent, viewers: row.viewers });
        titleTotals.set(row.id, total);
    }));
    const topTitles = [...titleTotals.entries()]
        .map(([id, total]) => ({ id, title: titleName.get(id) || 'A title', viewers: total.viewers,
            regions: total.regions.sort((left, right) => right.viewers - left.viewers) }))
        .sort((left, right) => right.viewers - left.viewers || left.title.localeCompare(right.title))
        .slice(0, 15);
    const languageViewers = new Map<string, number>();
    Object.entries(viewing?.countries || {}).forEach(([countryId, country]) => {
        const viewers = (country.titlePerformance || []).reduce((sum, row) => sum + Math.max(0, row.viewingAccounts || 0), 0);
        if (viewers <= 0) return;
        const language = population[countryId]?.languages?.[0] || 'Other';
        languageViewers.set(language, (languageViewers.get(language) || 0) + viewers);
    });
    const languageTotal = [...languageViewers.values()].reduce((sum, value) => sum + value, 0);
    const sortedLanguages = [...languageViewers.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    const audienceByLanguage = [
        ...sortedLanguages.slice(0, 6).map(([language, viewers]) => ({ language, viewers, share: languageTotal ? viewers / languageTotal : 0 })),
        ...(sortedLanguages.length > 6 ? [{
            language: 'Other',
            viewers: sortedLanguages.slice(6).reduce((sum, [, viewers]) => sum + viewers, 0),
            share: languageTotal ? sortedLanguages.slice(6).reduce((sum, [, viewers]) => sum + viewers, 0) / languageTotal : 0,
        }] : []),
    ];

    const flags = player.flags || {};
    return {
        live: launchWeek !== null,
        energy: {
            available: Math.max(0, Math.floor(Number(player.energy?.current) || 0)),
            weekly: Math.max(0, Math.floor(Number(flags.weeklyBaseEnergyRemaining) || 0)),
            bank: Math.max(0, Math.floor(Number(flags.bonusEnergyBank) || 0)),
            step: STREAMING_LOCALIZATION_ENERGY_STEP,
        },
        treasury: platform.treasuryCash,
        week: latest ? {
            absoluteWeek: latest.absoluteWeek,
            label: streamingLocalizationWeekLabel(latest.absoluteWeek),
            localized: latest.localization!.localizedViewingAccounts,
            added: latest.localization!.addedViewingAccounts,
            untapped: latest.localization!.untappedViewingAccounts || 0,
            playerViewers: latest.localization!.playerViewingAccounts,
        } : null,
        trend,
        regions,
        insights: { topTitles, audienceByLanguage },
    };
};
