import type {
    OwnedStreamingCatalogLicense,
    OwnedStreamingCountryMarketProfile,
    OwnedStreamingLedgerEntry,
    OwnedStreamingLocalizationJob,
    OwnedStreamingMarketOperation,
    OwnedStreamingTitleLanguageAsset,
    Player,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { getStreamingCatalogLicenseStatus, resolveStreamingCatalogTitle } from './streamingCatalog';
import {
    normalizeStreamingLanguageId,
    resolveStreamingGlobalLocalizationCapability,
    resolveStreamingLocalizationTiers,
} from './streamingLocalizationCapabilities';
import { getStreamingContentAvailability, type ContentAvailability } from './streamingContentAvailability';

export type StreamingLocalizationDelivery = 'OUTSOURCE' | 'IN_HOUSE';
export type StreamingCatalogueMetadataStatus = 'READY' | 'IN_REVIEW' | 'PLANNED';

export interface StreamingOpeningTitleCoverage {
    projectId: string;
    title: string;
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
    source: 'OWNED' | 'LICENSED' | 'ORIGINAL';
    rightsCovered: boolean;
    available: boolean;
    availability: ContentAvailability;
    hours: number;
    hoursEstimated: boolean;
    subtitleLanguagesReady: string[];
    dubLanguagesReady: string[];
}

export interface StreamingOpeningCountryCoverage {
    operationId: string;
    countryId: string;
    country: string;
    regionId: string;
    status: OwnedStreamingMarketOperation['status'];
    localizationPreference: OwnedStreamingCountryMarketProfile['localizationPreference'];
    languageDistribution: OwnedStreamingCountryMarketProfile['languageDistribution'];
    metadataStatus: StreamingCatalogueMetadataStatus;
    rightsCoveredTitles: number;
    totalTitles: number;
    missingRightsTitles: string[];
    subtitleCoveragePercent: number;
    dubCoveragePercent: number;
    projectedAudienceReachPercent: number;
    launchGateReady: boolean;
    qualityReady: boolean;
}

export interface StreamingOpeningCatalogueView {
    strategyId: string | null;
    strategyLabel: string;
    titles: StreamingOpeningTitleCoverage[];
    countries: StreamingOpeningCountryCoverage[];
    openingCountryCount: number;
    rightsReadyCountryCount: number;
    qualityReadyCountryCount: number;
    rightsReady: boolean;
    qualityReady: boolean;
    activeLocalizationJobs: number;
    readyLanguageAssets: number;
    launchBlockers: string[];
    qualityWarnings: string[];
}

export interface StreamingLocalizationQuote {
    cashCost: number;
    deliveryWeeks: number;
    available: boolean;
    unavailableReason: string | null;
}

export interface StreamingLocalizationMutationResult {
    player: Player;
    changed: boolean;
    reason?: 'INVALID_TITLE' | 'INVALID_LANGUAGE' | 'ALREADY_EXISTS' | 'IN_HOUSE_LOCKED' | 'INSUFFICIENT_TREASURY';
    shortfall: number;
    job: OwnedStreamingLocalizationJob | null;
}

const STRATEGY_LABELS: Record<string, string> = {
    CURATED_PREMIERE: 'Curated Premiere',
    BROAD_APPEAL: 'Broad Appeal',
    PRESTIGE_VAULT: 'Prestige Vault',
};

const openingOperations = (player: Player): OwnedStreamingMarketOperation[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return platform.marketOperations.filter(operation => (
        operation.scope === 'COUNTRY'
        && operation.entryKind === 'OPENING'
        && operation.status !== 'EXITED'
        && Boolean(operation.countryId && operation.countryProfile)
    ));
};

const activeLicenseFor = (player: Player, projectId: string): OwnedStreamingCatalogLicense | null => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    return platform.catalogLicenses.find(license => (
        license.sourceProjectId === projectId
        && license.startsAtAbsoluteWeek <= absoluteWeek
        && getStreamingCatalogLicenseStatus(license, absoluteWeek) === 'ACTIVE'
    )) || null;
};

export const doesStreamingLicenseCoverCountry = (
    license: OwnedStreamingCatalogLicense,
    countryId: string,
    openingCountryIds: string[],
): boolean => {
    if (license.territory === 'GLOBAL') return true;
    if (license.countryIds?.length) return license.countryIds.includes(countryId);
    // Legacy contracts predate exact country snapshots. Preserve their original
    // broad meaning without silently expanding a domestic window.
    if (license.territory === 'MULTI_REGION') return openingCountryIds.includes(countryId);
    return openingCountryIds[0] === countryId;
};

const metadataStatusFor = (operation: OwnedStreamingMarketOperation): StreamingCatalogueMetadataStatus => {
    if (['READY', 'ACTIVE'].includes(operation.status)) return 'READY';
    if (operation.clearance && operation.clearance.progressPercent >= 35) return 'IN_REVIEW';
    return 'PLANNED';
};

const getAsset = (
    assets: OwnedStreamingTitleLanguageAsset[],
    titleId: string,
    language: string,
): OwnedStreamingTitleLanguageAsset | null => assets.find(asset => (
    asset.titleId === titleId && normalizeStreamingLanguageId(asset.languageId) === normalizeStreamingLanguageId(language)
)) || null;

const isOriginalLanguage = (language: string): boolean => normalizeStreamingLanguageId(language) === 'english';

const qualitySatisfied = (
    preference: OwnedStreamingCountryMarketProfile['localizationPreference'],
    language: string,
    asset: OwnedStreamingTitleLanguageAsset | null,
    subtitleLevel: 0 | 1 | 2 | 3 = 0,
    dubbingLevel: 0 | 1 | 2 | 3 = 0,
): boolean => {
    if (isOriginalLanguage(language)) return true;
    const subtitlesReady = Boolean(asset?.subtitleReady) || subtitleLevel > 0;
    const dubbingReady = Boolean(asset?.dubReady) || dubbingLevel > 0;
    if (preference === 'DUB_FIRST') return dubbingReady;
    if (preference === 'SUBTITLE_FIRST') return subtitlesReady;
    return subtitlesReady || dubbingReady;
};

const reachForLanguage = (
    preference: OwnedStreamingCountryMarketProfile['localizationPreference'],
    language: string,
    asset: OwnedStreamingTitleLanguageAsset | null,
    subtitleLevel: 0 | 1 | 2 | 3 = 0,
    dubbingLevel: 0 | 1 | 2 | 3 = 0,
): number => {
    if (isOriginalLanguage(language)) return 1;
    if (asset?.dubReady) return 1;
    if (asset?.subtitleReady) return preference === 'DUB_FIRST' ? 0.68 : 0.94;
    if (dubbingLevel > 0) return ([0, 0.84, 0.94, 1] as const)[dubbingLevel];
    if (subtitleLevel > 0) {
        const subtitleReach = ([0, 0.78, 0.88, 0.96] as const)[subtitleLevel];
        return preference === 'DUB_FIRST' ? subtitleReach * 0.72 : subtitleReach;
    }
    return preference === 'ORIGINAL_AUDIO' ? 0.72 : 0.24;
};

export const getStreamingOpeningCatalogueView = (player: Player): StreamingOpeningCatalogueView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const globalLocalization = resolveStreamingGlobalLocalizationCapability(platform);
    const activeLanguages = new Set(globalLocalization.activeLanguageIds);
    const operations = openingOperations(player);
    const openingCountryIds = operations.map(operation => operation.countryId!);
    const ownedIds = new Set(platform.starterCatalog?.ownedProjectIds || []);
    const originalIds = new Set(platform.originalCommissions.flatMap(commission => commission.canonicalProjectId ? [commission.canonicalProjectId] : []));
    const titleIds = Array.from(new Set([
        ...(platform.starterCatalog?.ownedProjectIds || []),
        ...(platform.starterCatalog?.licensedProjectIds || []),
        ...platform.catalogProjectIds,
        ...originalIds,
    ]));
    const baseTitles = titleIds.map(projectId => {
        const title = resolveStreamingCatalogTitle(player, projectId);
        const license = activeLicenseFor(player, projectId);
        const source: StreamingOpeningTitleCoverage['source'] = originalIds.has(projectId)
            ? 'ORIGINAL'
            : ownedIds.has(projectId) || title?.source === 'OWNED_LIBRARY'
                ? 'OWNED'
                : 'LICENSED';
        return {
            projectId,
            title: title?.title || license?.titleAtSigning || 'Untitled',
            projectType: title?.projectType || license?.projectType || 'MOVIE',
            genre: title?.genre || license?.genre || 'Unknown',
            source,
            license,
            access: getStreamingContentAvailability(player, projectId, openingCountryIds),
        };
    });
    const allLanguages = Array.from(new Set(operations.flatMap(operation => (
        operation.countryProfile?.languageDistribution.map(item => item.language) || []
    ))));
    const titles: StreamingOpeningTitleCoverage[] = baseTitles.map(title => ({
        projectId: title.projectId,
        title: title.title,
        projectType: title.projectType,
        genre: title.genre,
        source: title.source,
        rightsCovered: title.access.available,
        available: title.access.available,
        availability: title.access.status,
        hours: title.access.hours,
        hoursEstimated: title.access.estimated,
        subtitleLanguagesReady: allLanguages.filter(language => {
            const normalized = normalizeStreamingLanguageId(language);
            return isOriginalLanguage(language)
                || Boolean(getAsset(platform.localizationOperations.titleLanguageAssets, title.projectId, language)?.subtitleReady)
                || (globalLocalization.subtitleLevel > 0 && activeLanguages.has(normalized));
        }),
        dubLanguagesReady: allLanguages.filter(language => {
            const normalized = normalizeStreamingLanguageId(language);
            return isOriginalLanguage(language)
                || Boolean(getAsset(platform.localizationOperations.titleLanguageAssets, title.projectId, language)?.dubReady)
                || (globalLocalization.dubbingLevel > 0 && activeLanguages.has(normalized));
        }),
    }));

    const countries = operations.map((operation): StreamingOpeningCountryCoverage => {
        const profile = operation.countryProfile!;
        const availableTitles = baseTitles.filter(title => title.access.available && title.access.coveredCountryIds.includes(operation.countryId!));
        const missingRightsTitles = baseTitles.filter(title => !availableTitles.includes(title)).map(title => title.title);
        const totalChecks = Math.max(1, availableTitles.length * Math.max(1, profile.languageDistribution.length));
        let subtitles = 0;
        let dubs = 0;
        let qualityChecks = 0;
        let reachWeighted = 0;
        availableTitles.forEach(title => profile.languageDistribution.forEach(language => {
            const asset = getAsset(platform.localizationOperations.titleLanguageAssets, title.projectId, language.language);
            const languageActive = activeLanguages.has(normalizeStreamingLanguageId(language.language));
            const subtitleLevel = languageActive ? globalLocalization.subtitleLevel : 0;
            const dubbingLevel = languageActive ? globalLocalization.dubbingLevel : 0;
            if (isOriginalLanguage(language.language) || asset?.subtitleReady || subtitleLevel > 0) subtitles += 1;
            if (isOriginalLanguage(language.language) || asset?.dubReady || dubbingLevel > 0) dubs += 1;
            if (qualitySatisfied(profile.localizationPreference, language.language, asset, subtitleLevel, dubbingLevel)) qualityChecks += 1;
            reachWeighted += language.audiencePercent * reachForLanguage(profile.localizationPreference, language.language, asset, subtitleLevel, dubbingLevel);
        }));
        const titleCount = baseTitles.length;
        return {
            operationId: operation.id,
            countryId: operation.countryId!,
            country: profile.country,
            regionId: profile.regionId,
            status: operation.status,
            localizationPreference: profile.localizationPreference,
            languageDistribution: profile.languageDistribution,
            metadataStatus: metadataStatusFor(operation),
            rightsCoveredTitles: Math.max(0, titleCount - missingRightsTitles.length),
            totalTitles: titleCount,
            missingRightsTitles,
            subtitleCoveragePercent: Math.round((subtitles / totalChecks) * 100),
            dubCoveragePercent: Math.round((dubs / totalChecks) * 100),
            projectedAudienceReachPercent: availableTitles.length
                ? Math.max(0, Math.min(100, Math.round(reachWeighted / availableTitles.length)))
                : 0,
            launchGateReady: availableTitles.length > 0,
            qualityReady: availableTitles.length > 0 && qualityChecks === totalChecks,
        };
    });
    const launchBlockers: string[] = [];
    if (!platform.starterCatalog || !titles.some(title => title.available)) launchBlockers.push('Add at least one available opening title.');
    countries.filter(country => !country.launchGateReady).forEach(country => {
        launchBlockers.push(`${country.country}: no available titles with current rights.`);
    });
    if (!countries.length) launchBlockers.push('Choose at least one Opening Market.');
    const qualityWarnings = countries.filter(country => !country.qualityReady).map(country => (
        `${country.country}: projected reach ${country.projectedAudienceReachPercent}% without preferred language coverage.`
    ));
    return {
        strategyId: platform.starterCatalog?.packageId || null,
        strategyLabel: STRATEGY_LABELS[platform.starterCatalog?.packageId || ''] || 'Not selected',
        titles,
        countries,
        openingCountryCount: countries.length,
        rightsReadyCountryCount: countries.filter(country => country.launchGateReady).length,
        qualityReadyCountryCount: countries.filter(country => country.qualityReady).length,
        rightsReady: Boolean(platform.starterCatalog && titles.length && countries.length && countries.every(country => country.launchGateReady)),
        qualityReady: Boolean(titles.length && countries.length && countries.every(country => country.qualityReady)),
        activeLocalizationJobs: platform.localizationOperations.jobs.filter(job => job.status !== 'READY').length,
        readyLanguageAssets: platform.localizationOperations.titleLanguageAssets.filter(asset => asset.subtitleReady || asset.dubReady).length,
        launchBlockers,
        qualityWarnings,
    };
};

export const getStreamingLocalizationQuote = (
    player: Player,
    titleId: string,
    mode: OwnedStreamingLocalizationJob['mode'],
    delivery: StreamingLocalizationDelivery,
): StreamingLocalizationQuote => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const title = resolveStreamingCatalogTitle(player, titleId);
    const localizationTiers = resolveStreamingLocalizationTiers(
        platform.capabilities.installed.map(capability => capability.capabilityId),
    );
    const inHouseAvailable = (mode === 'DUB' ? localizationTiers.dubbingLevel : localizationTiers.subtitleLevel) > 0
        || platform.localizationOperations.facilities.some(facility => facility.status === 'ACTIVE');
    const seriesMultiplier = title?.projectType === 'SERIES' ? 1.8 : 1;
    const baseCost = mode === 'DUB' ? 1_250_000 : 225_000;
    const deliveryMultiplier = delivery === 'IN_HOUSE' ? 0.42 : 1;
    return {
        cashCost: Math.max(50_000, Math.round(baseCost * seriesMultiplier * deliveryMultiplier / 50_000) * 50_000),
        deliveryWeeks: delivery === 'IN_HOUSE'
            ? (mode === 'DUB' ? 3 : 2)
            : (mode === 'DUB' ? 2 : 1),
        available: delivery === 'OUTSOURCE' || inHouseAvailable,
        unavailableReason: delivery === 'IN_HOUSE' && !inHouseAvailable
            ? 'Research Localization Exchange or activate an in-house language facility.'
            : null,
    };
};

export const scheduleStreamingTitleLocalization = (
    player: Player,
    input: { titleId: string; languageId: string; mode: OwnedStreamingLocalizationJob['mode']; delivery: StreamingLocalizationDelivery },
): StreamingLocalizationMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const validTitleIds = new Set(getStreamingOpeningCatalogueView(player).titles.map(title => title.projectId));
    if (!validTitleIds.has(input.titleId)) return { player, changed: false, reason: 'INVALID_TITLE', shortfall: 0, job: null };
    const validLanguages = new Set(openingOperations(player).flatMap(operation => (
        operation.countryProfile?.languageDistribution.map(language => normalizeStreamingLanguageId(language.language)) || []
    )));
    const languageId = normalizeStreamingLanguageId(input.languageId);
    if (!validLanguages.has(languageId) || isOriginalLanguage(languageId)) {
        return { player, changed: false, reason: 'INVALID_LANGUAGE', shortfall: 0, job: null };
    }
    const existingAsset = getAsset(platform.localizationOperations.titleLanguageAssets, input.titleId, input.languageId);
    if ((input.mode === 'DUB' && existingAsset?.dubReady) || (input.mode === 'SUBTITLE' && existingAsset?.subtitleReady)) {
        return { player, changed: false, reason: 'ALREADY_EXISTS', shortfall: 0, job: null };
    }
    const jobKey = `title-localization:${input.titleId}:${languageId}:${input.mode.toLowerCase()}`;
    const existingJob = platform.localizationOperations.jobs.find(job => job.id === jobKey || (
        job.titleId === input.titleId && normalizeStreamingLanguageId(job.languageId) === languageId && job.mode === input.mode
    ));
    if (existingJob) return { player, changed: false, reason: 'ALREADY_EXISTS', shortfall: 0, job: existingJob };
    const quote = getStreamingLocalizationQuote(player, input.titleId, input.mode, input.delivery);
    if (!quote.available) return { player, changed: false, reason: 'IN_HOUSE_LOCKED', shortfall: 0, job: null };
    if (platform.treasuryCash < quote.cashCost) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', shortfall: quote.cashCost - platform.treasuryCash, job: null };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const providerId = input.delivery === 'OUTSOURCE' ? 'atlas-language-network' : null;
    const facilityId = input.delivery === 'IN_HOUSE' ? 'empire-localization-exchange' : null;
    const job: OwnedStreamingLocalizationJob = {
        id: jobKey,
        titleId: input.titleId,
        languageId,
        mode: input.mode,
        status: 'IN_PROGRESS',
        providerId,
        facilityId,
        cashCost: quote.cashCost,
        readyAtAbsoluteWeek: absoluteWeek + quote.deliveryWeeks,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, jobKey),
        idempotencyKey: jobKey,
        absoluteWeek,
        type: 'TITLE_LOCALIZATION_COMMITTED',
        summary: `${input.languageId} ${input.mode === 'DUB' ? 'dub' : 'subtitles'} ordered for ${resolveStreamingCatalogTitle(player, input.titleId)?.title || 'opening title'}.`,
        source: 'PLAYER_ACTION',
        metadata: { titleId: input.titleId, language: input.languageId, mode: input.mode, delivery: input.delivery, cashCost: quote.cashCost },
    };
    const provider = providerId && !platform.localizationOperations.providers.some(item => item.id === providerId) ? [{
        id: providerId,
        name: 'Atlas Language Network',
        status: 'CONTRACTED' as const,
        languageIds: Array.from(validLanguages),
        contractedAtAbsoluteWeek: absoluteWeek,
    }] : [];
    const facility = facilityId && !platform.localizationOperations.facilities.some(item => item.id === facilityId) ? [{
        id: facilityId,
        name: 'EMPIRE+ Localization Exchange',
        status: 'ACTIVE' as const,
        languageIds: Array.from(validLanguages),
        readyAtAbsoluteWeek: absoluteWeek,
    }] : [];
    const commitment = {
        id: createDeterministicId('streaming_cost', platform.simulationSeed, jobKey),
        idempotencyKey: jobKey,
        category: 'LOCALIZATION' as const,
        label: `${input.languageId} ${input.mode === 'DUB' ? 'dubbing' : 'subtitles'}`,
        status: 'PAID' as const,
        plannedAmount: quote.cashCost,
        committedAmount: quote.cashCost,
        paidAmount: quote.cashCost,
        weeklyAmount: 0,
        createdAtAbsoluteWeek: absoluteWeek,
        committedAtAbsoluteWeek: absoluteWeek,
        paidAtAbsoluteWeek: absoluteWeek,
        sourceReferenceId: job.id,
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - quote.cashCost,
        localizationOperations: {
            ...platform.localizationOperations,
            providers: [...platform.localizationOperations.providers, ...provider],
            facilities: [...platform.localizationOperations.facilities, ...facility],
            jobs: [...platform.localizationOperations.jobs, job],
        },
        costCommitments: [...platform.costCommitments, commitment],
        eventLedger: [...platform.eventLedger, ledger],
        launchProgram: {
            ...platform.launchProgram,
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, shortfall: 0, job };
};

export const advanceStreamingTitleLocalization = (player: Player): { player: Player; changed: boolean } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const completing = platform.localizationOperations.jobs.filter(job => (
        job.status !== 'READY' && job.readyAtAbsoluteWeek !== null && job.readyAtAbsoluteWeek <= absoluteWeek
    ));
    if (!completing.length) return { player, changed: false };
    const assetsByKey = new Map(platform.localizationOperations.titleLanguageAssets.map(asset => (
        [`${asset.titleId}:${asset.languageId.toLowerCase()}`, asset]
    )));
    const completionLedger: OwnedStreamingLedgerEntry[] = [];
    completing.forEach(job => {
        const key = `${job.titleId}:${job.languageId.toLowerCase()}`;
        const existing = assetsByKey.get(key);
        assetsByKey.set(key, {
            id: existing?.id || createDeterministicId('streaming_language_asset', platform.simulationSeed, key),
            titleId: job.titleId,
            languageId: job.languageId,
            subtitleReady: existing?.subtitleReady === true || job.mode === 'SUBTITLE',
            dubReady: existing?.dubReady === true || job.mode === 'DUB',
            readyAtAbsoluteWeek: absoluteWeek,
        });
        const ledgerKey = `${job.id}:ready`;
        if (!platform.eventLedger.some(entry => entry.idempotencyKey === ledgerKey)) completionLedger.push({
            id: createDeterministicId('streaming_event', platform.simulationSeed, ledgerKey),
            idempotencyKey: ledgerKey,
            absoluteWeek,
            type: 'TITLE_LOCALIZATION_READY',
            summary: `${job.languageId} ${job.mode === 'DUB' ? 'dub' : 'subtitles'} delivered.`,
            source: 'WEEK_PROCESSOR',
            metadata: { titleId: job.titleId, language: job.languageId, mode: job.mode },
        });
    });
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        localizationOperations: {
            ...platform.localizationOperations,
            jobs: platform.localizationOperations.jobs.map(job => completing.some(item => item.id === job.id)
                ? { ...job, status: 'READY' as const }
                : job),
            titleLanguageAssets: Array.from(assetsByKey.values()),
        },
        eventLedger: [...platform.eventLedger, ...completionLedger],
        launchProgram: {
            ...platform.launchProgram,
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true };
};
