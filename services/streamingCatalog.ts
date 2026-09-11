import type {
    IndustryProject,
    OwnedStreamingCatalogLicense,
    OwnedStreamingCatalogSetupDraft,
    OwnedStreamingLedgerEntry,
    PastProject,
    Player,
    StreamingLicenseExclusivity,
    StreamingLicenseTerritory,
    StreamingStarterCatalogPackageId,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek, getInheritedStudioProjects } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import {
    createStreamingRightsContractFromLicense,
    registerStreamingRightsContract,
} from './streamingRightsCore';
import { selectStreamingMarketTitles } from './streamingMarketSupply';

export interface StreamingCatalogTitle {
    id: string;
    title: string;
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
    rating: number | null;
    releaseYear: number | null;
    gross: number | null;
    studioId: string;
    studioName: string;
    source: 'OWNED_LIBRARY' | 'EXTERNAL_MARKET';
}

export interface StreamingLicenseQuote {
    suggestedGuarantee: number;
    minimumGuarantee: number;
    maximumGuarantee: number;
    targetPlatformRevenueShare: number;
    estimatedExpiryWeeks: number;
}

export const STREAMING_STARTER_CATALOG_PACKAGES: Array<{
    id: StreamingStarterCatalogPackageId;
    title: string;
    label: string;
    description: string;
    programmingIntent: string;
    recommendedOwnedTitles: number;
}> = [
    {
        id: 'CURATED_PREMIERE',
        title: 'Curated Premiere',
        label: 'Identity first',
        description: 'A smaller opening shelf where every title supports a clear brand promise.',
        programmingIntent: 'Best for a focused launch with one licensed anchor and a selective owned library.',
        recommendedOwnedTitles: 2,
    },
    {
        id: 'BROAD_APPEAL',
        title: 'Broad Appeal',
        label: 'Reach first',
        description: 'A wider mix of genres designed to reduce the chance of a one-note catalog.',
        programmingIntent: 'Best when your production group already owns several released movies and shows.',
        recommendedOwnedTitles: 4,
    },
    {
        id: 'PRESTIGE_VAULT',
        title: 'Prestige Vault',
        label: 'Quality first',
        description: 'Lead with acclaimed work and a premium external title instead of pure volume.',
        programmingIntent: 'Best for award-led positioning and a premium opening impression.',
        recommendedOwnedTitles: 2,
    },
];

export const STREAMING_LICENSE_TERRITORIES: Array<{
    id: StreamingLicenseTerritory;
    title: string;
    description: string;
    multiplier: number;
}> = [
    { id: 'DOMESTIC', title: 'Domestic', description: 'One home market with the lowest guarantee.', multiplier: 0.58 },
    { id: 'MULTI_REGION', title: 'Multi-region', description: 'A balanced opening across several priority markets.', multiplier: 1 },
    { id: 'GLOBAL', title: 'Global', description: 'Worldwide rights with the highest upfront exposure.', multiplier: 1.72 },
];

export const STREAMING_LICENSE_TERMS = [52, 104, 156] as const;

const roundMoney = (value: number): number => {
    const step = value >= 50_000_000 ? 1_000_000 : 250_000;
    return Math.max(step, Math.round(value / step) * step);
};
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const resolveProjectType = (value: unknown): 'MOVIE' | 'SERIES' => value === 'SERIES' ? 'SERIES' : 'MOVIE';
const asNumberOrNull = (value: unknown): number | null => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getOpeningLicenseCountryIds = (
    player: Player,
    territory: StreamingLicenseTerritory,
): string[] => {
    if (territory === 'GLOBAL') return [];
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const openingCountryIds = platform.marketOperations
        .filter(operation => (
            operation.scope === 'COUNTRY'
            && operation.entryKind === 'OPENING'
            && operation.status !== 'EXITED'
            && operation.countryId
        ))
        .map(operation => operation.countryId!);
    return territory === 'DOMESTIC' ? openingCountryIds.slice(0, 1) : openingCountryIds;
};

const getOwnedStudioNames = (player: Player): Map<string, string> => new Map(
    (player.businesses || [])
        .filter(business => business.type === 'PRODUCTION_HOUSE')
        .map(business => [String(business.id), business.name]),
);

const toOwnedTitle = (
    project: PastProject | Record<string, any>,
    studioNames: Map<string, string>,
): StreamingCatalogTitle | null => {
    const source = project as Record<string, any>;
    const id = String(source.id || '').trim();
    const studioId = String(source.studioId || source.projectDetails?.studioId || '').trim();
    if (!id || !studioNames.has(studioId)) return null;
    return {
        id,
        title: String(source.name || source.title || source.projectDetails?.title || 'Untitled').trim(),
        projectType: resolveProjectType(source.projectType || source.projectDetails?.type || source.type),
        genre: String(source.genre || source.projectDetails?.genre || 'Unknown'),
        rating: asNumberOrNull(source.imdbRating ?? source.rating),
        releaseYear: asNumberOrNull(source.releaseYear ?? source.year),
        gross: asNumberOrNull(source.gross ?? source.totalGross),
        studioId,
        studioName: studioNames.get(studioId) || 'Owned studio',
        source: 'OWNED_LIBRARY',
    };
};

export const getEligibleOwnedStreamingTitles = (player: Player): StreamingCatalogTitle[] => {
    const studioNames = getOwnedStudioNames(player);
    if (!studioNames.size) return [];
    const inherited = Array.from(studioNames.keys()).flatMap(studioId => getInheritedStudioProjects(player, studioId));
    const candidates = [
        ...(player.pastProjects || []),
        ...inherited,
    ];
    const byId = new Map<string, StreamingCatalogTitle>();
    candidates.forEach(project => {
        const title = toOwnedTitle(project, studioNames);
        if (title) byId.set(title.id, title);
    });
    return Array.from(byId.values()).sort((a, b) => (
        (b.releaseYear || 0) - (a.releaseYear || 0)
        || (b.rating || 0) - (a.rating || 0)
        || a.title.localeCompare(b.title)
    ));
};

const toWorldLicenseTitle = (
    project: IndustryProject,
    studioNames: Map<string, string>,
): StreamingCatalogTitle => ({
    id: String(project.id),
    title: project.title,
    projectType: resolveProjectType(project.mediaType),
    genre: String(project.genre || 'Unknown'),
    rating: asNumberOrNull(project.rating),
    releaseYear: asNumberOrNull(project.year),
    gross: asNumberOrNull(project.boxOffice),
    studioId: String(project.studioId),
    studioName: studioNames.get(String(project.studioId)) || String(project.studioId || 'Independent rights holder'),
    source: 'EXTERNAL_MARKET',
});

const toCareerLicenseTitle = (
    project: PastProject,
    ownedStudioNames: Map<string, string>,
): StreamingCatalogTitle | null => {
    const studioId = String(project.studioId || '');
    if (!project.id || ownedStudioNames.has(studioId)) return null;
    return {
        id: String(project.id),
        title: project.name,
        projectType: resolveProjectType(project.projectType),
        genre: String(project.genre || 'Unknown'),
        rating: asNumberOrNull(project.imdbRating ?? project.rating),
        releaseYear: asNumberOrNull(project.releaseYear ?? project.year),
        gross: asNumberOrNull(project.gross),
        studioId,
        studioName: studioId || 'Independent rights holder',
        source: 'EXTERNAL_MARKET',
    };
};

export const getStreamingLicenseCandidatePool = (player: Player): StreamingCatalogTitle[] => {
    const ownedStudioNames = getOwnedStudioNames(player);
    const worldStudioNames = new Map(
        Object.values(player.world?.studios || {}).map(studio => [String(studio.id), studio.name]),
    );
    const existingCatalogIds = new Set(
        normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).catalogProjectIds,
    );
    const ownedTitleIds = new Set(getEligibleOwnedStreamingTitles(player).map(project => project.id));
    const candidates = [
        ...(player.world?.projects || [])
            .filter(project => (
                Boolean(String(project.id || '').trim())
                && Boolean(String(project.title || '').trim())
                && Boolean(String(project.studioId || '').trim())
                && !ownedStudioNames.has(String(project.studioId))
            ))
            .map(project => toWorldLicenseTitle(project, worldStudioNames)),
        ...(player.pastProjects || [])
            .map(project => toCareerLicenseTitle(project, ownedStudioNames))
            .filter((project): project is StreamingCatalogTitle => Boolean(
                project?.id && project.title && project.studioId,
            )),
    ];
    const byId = new Map<string, StreamingCatalogTitle>();
    candidates.forEach(project => {
        if (!existingCatalogIds.has(project.id) && !ownedTitleIds.has(project.id)) byId.set(project.id, project);
    });
    return Array.from(byId.values()).sort((a, b) => (
            (b.rating || 0) - (a.rating || 0)
            || (b.gross || 0) - (a.gross || 0)
            || a.title.localeCompare(b.title)
        ));
};

export const getStreamingLicenseOpportunities = (player: Player): StreamingCatalogTitle[] => {
    return selectStreamingMarketTitles(player, getStreamingLicenseCandidatePool(player));
};

export const resolveStreamingCatalogTitle = (
    player: Player,
    projectId: string,
): StreamingCatalogTitle | null => {
    const ownedStudioNames = getOwnedStudioNames(player);
    const worldStudioNames = new Map(
        Object.values(player.world?.studios || {}).map(studio => [String(studio.id), studio.name]),
    );
    return (
        getEligibleOwnedStreamingTitles(player).find(project => project.id === projectId)
        || (player.world?.projects || [])
            .filter(project => !ownedStudioNames.has(String(project.studioId)))
            .map(project => toWorldLicenseTitle(project, worldStudioNames))
            .find(project => project.id === projectId)
        || (player.pastProjects || [])
            .map(project => toCareerLicenseTitle(project, ownedStudioNames))
            .filter((project): project is StreamingCatalogTitle => Boolean(project))
            .find(project => project.id === projectId)
        || (() => {
        const commission = player.ownedStreamingPlatform?.originalCommissions?.find(item => item.canonicalProjectId === projectId);
        if (commission) return {
            id: projectId, title: commission.title, projectType: commission.projectType,
            genre: commission.genre, rating: null, releaseYear: null, gross: null,
            studioId: commission.producerStudioId, studioName: commission.producerStudioName,
            source: 'OWNED_LIBRARY' as const,
        };
        const license = normalizeOwnedStreamingPlatformState(
            player.ownedStreamingPlatform,
            player.id,
        ).catalogLicenses.find(item => item.sourceProjectId === projectId);
        return license ? {
            id: license.sourceProjectId,
            title: license.titleAtSigning,
            projectType: license.projectType || 'MOVIE',
            genre: license.genre || 'Licensed',
            rating: null,
            releaseYear: null,
            gross: null,
            studioId: license.licensorName,
            studioName: license.licensorName,
            source: 'EXTERNAL_MARKET' as const,
        } : null;
        })()
    );
};

export const getStreamingLicenseQuote = (
    title: StreamingCatalogTitle,
    territory: StreamingLicenseTerritory,
    durationWeeks: number,
    exclusivity: StreamingLicenseExclusivity,
): StreamingLicenseQuote => {
    const territoryMultiplier = STREAMING_LICENSE_TERRITORIES.find(item => item.id === territory)?.multiplier || 1;
    const durationMultiplier = durationWeeks >= 156 ? 1.32 : durationWeeks >= 104 ? 1 : 0.72;
    const exclusivityMultiplier = exclusivity === 'EXCLUSIVE' ? 1.55 : 1;
    const performanceBase = Math.max(
        3_000_000,
        Math.min(90_000_000, (title.gross || 45_000_000) * 0.045 + (title.rating || 6.5) * 550_000),
    );
    const suggestedGuarantee = roundMoney(performanceBase * territoryMultiplier * durationMultiplier * exclusivityMultiplier);
    return {
        suggestedGuarantee,
        minimumGuarantee: roundMoney(suggestedGuarantee * 0.62),
        maximumGuarantee: roundMoney(suggestedGuarantee * 1.55),
        targetPlatformRevenueShare: exclusivity === 'EXCLUSIVE' ? 64 : 72,
        estimatedExpiryWeeks: durationWeeks,
    };
};

export const createDefaultStreamingCatalogDraft = (player: Player): OwnedStreamingCatalogSetupDraft => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const existing = platform.catalogSetupDraft;
    if (existing) return existing;
    const ownedTitles = getEligibleOwnedStreamingTitles(player);
    const opportunity = getStreamingLicenseOpportunities(player)[0] || null;
    const packageId: StreamingStarterCatalogPackageId = ownedTitles.length >= 4 ? 'BROAD_APPEAL' : 'CURATED_PREMIERE';
    const selectedOwnedProjectIds = ownedTitles.slice(0, packageId === 'BROAD_APPEAL' ? 4 : 2).map(title => title.id);
    const baseDraft: OwnedStreamingCatalogSetupDraft = {
        currentStep: 0,
        selectedOwnedProjectIds,
        packageId,
        opportunityProjectId: opportunity?.id || null,
        territory: 'MULTI_REGION',
        durationWeeks: 104,
        exclusivity: 'NON_EXCLUSIVE',
        minimumGuarantee: 0,
        platformRevenueShare: 72,
        negotiationStatus: 'BUILDING',
        counterMinimumGuarantee: null,
        counterPlatformRevenueShare: null,
        negotiationRound: 0,
        updatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
    };
    if (!opportunity) return baseDraft;
    const quote = getStreamingLicenseQuote(opportunity, baseDraft.territory, baseDraft.durationWeeks, baseDraft.exclusivity);
    return {
        ...baseDraft,
        minimumGuarantee: quote.suggestedGuarantee,
        platformRevenueShare: quote.targetPlatformRevenueShare + 3,
    };
};

export const saveStreamingCatalogDraft = (
    player: Player,
    inputDraft: OwnedStreamingCatalogSetupDraft,
): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'FOUNDING' || platform.starterCatalog) return player;
    const defaults = createDefaultStreamingCatalogDraft(player);
    const eligibleIds = new Set(getEligibleOwnedStreamingTitles(player).map(title => title.id));
    const opportunityIds = new Set(getStreamingLicenseOpportunities(player).map(title => title.id));
    const opportunityProjectId = inputDraft.opportunityProjectId && opportunityIds.has(inputDraft.opportunityProjectId)
        ? inputDraft.opportunityProjectId
        : defaults.opportunityProjectId;
    const termsChanged = (
        inputDraft.opportunityProjectId !== platform.catalogSetupDraft?.opportunityProjectId
        || inputDraft.territory !== platform.catalogSetupDraft?.territory
        || inputDraft.durationWeeks !== platform.catalogSetupDraft?.durationWeeks
        || inputDraft.exclusivity !== platform.catalogSetupDraft?.exclusivity
        || inputDraft.minimumGuarantee !== platform.catalogSetupDraft?.minimumGuarantee
        || inputDraft.platformRevenueShare !== platform.catalogSetupDraft?.platformRevenueShare
    );
    const draft: OwnedStreamingCatalogSetupDraft = {
        currentStep: Math.round(clamp(Number(inputDraft.currentStep) || 0, 0, 4)),
        selectedOwnedProjectIds: Array.from(new Set(inputDraft.selectedOwnedProjectIds.filter(id => eligibleIds.has(id)))),
        packageId: STREAMING_STARTER_CATALOG_PACKAGES.some(item => item.id === inputDraft.packageId)
            ? inputDraft.packageId
            : defaults.packageId,
        opportunityProjectId,
        territory: STREAMING_LICENSE_TERRITORIES.some(item => item.id === inputDraft.territory)
            ? inputDraft.territory
            : defaults.territory,
        durationWeeks: STREAMING_LICENSE_TERMS.includes(inputDraft.durationWeeks as typeof STREAMING_LICENSE_TERMS[number])
            ? inputDraft.durationWeeks
            : defaults.durationWeeks,
        exclusivity: inputDraft.exclusivity === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'NON_EXCLUSIVE',
        minimumGuarantee: roundMoney(Math.max(0, Number(inputDraft.minimumGuarantee) || 0)),
        platformRevenueShare: Math.round(clamp(Number(inputDraft.platformRevenueShare) || 70, 50, 90)),
        negotiationStatus: termsChanged ? 'BUILDING' : inputDraft.negotiationStatus,
        counterMinimumGuarantee: termsChanged ? null : inputDraft.counterMinimumGuarantee,
        counterPlatformRevenueShare: termsChanged ? null : inputDraft.counterPlatformRevenueShare,
        negotiationRound: termsChanged ? 0 : Math.round(clamp(inputDraft.negotiationRound, 0, 3)),
        updatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
    };
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            catalogSetupDraft: draft,
        }, player.id),
    };
};

export const submitStreamingCatalogOffer = (
    player: Player,
    inputDraft: OwnedStreamingCatalogSetupDraft,
): { player: Player; draft: OwnedStreamingCatalogSetupDraft; changed: boolean; message: string } => {
    const savedPlayer = saveStreamingCatalogDraft(player, inputDraft);
    const platform = normalizeOwnedStreamingPlatformState(savedPlayer.ownedStreamingPlatform, savedPlayer.id);
    const draft = platform.catalogSetupDraft || createDefaultStreamingCatalogDraft(savedPlayer);
    const opportunity = getStreamingLicenseOpportunities(savedPlayer).find(item => item.id === draft.opportunityProjectId);
    if (!opportunity) return { player: savedPlayer, draft, changed: false, message: 'No eligible external title is available for this opening negotiation.' };
    const quote = getStreamingLicenseQuote(opportunity, draft.territory, draft.durationWeeks, draft.exclusivity);
    if (draft.minimumGuarantee < quote.minimumGuarantee || draft.minimumGuarantee > quote.maximumGuarantee) {
        return {
            player: savedPlayer,
            draft,
            changed: false,
            message: `Keep the guarantee between ${quote.minimumGuarantee.toLocaleString()} and ${quote.maximumGuarantee.toLocaleString()}.`,
        };
    }
    const accepted = draft.minimumGuarantee >= quote.suggestedGuarantee
        && draft.platformRevenueShare <= quote.targetPlatformRevenueShare;
    const nextDraft: OwnedStreamingCatalogSetupDraft = accepted ? {
        ...draft,
        negotiationStatus: 'READY_TO_SIGN',
        counterMinimumGuarantee: null,
        counterPlatformRevenueShare: null,
        negotiationRound: Math.max(1, draft.negotiationRound + 1),
        currentStep: 4,
    } : {
        ...draft,
        negotiationStatus: 'COUNTERED',
        counterMinimumGuarantee: Math.min(
            quote.maximumGuarantee,
            roundMoney(Math.max(quote.suggestedGuarantee * 0.92, draft.minimumGuarantee * 1.08)),
        ),
        counterPlatformRevenueShare: Math.min(draft.platformRevenueShare, quote.targetPlatformRevenueShare),
        negotiationRound: Math.max(1, draft.negotiationRound + 1),
        currentStep: 3,
    };
    const absoluteWeek = getAbsoluteWeek(savedPlayer.age, savedPlayer.currentWeek);
    const ledgerKey = `catalog-negotiation:${opportunity.id}:${absoluteWeek}:${nextDraft.negotiationRound}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, ledgerKey),
        idempotencyKey: ledgerKey,
        absoluteWeek,
        type: 'LICENSE_NEGOTIATION_UPDATED',
        summary: accepted
            ? `License terms for ${opportunity.title} are ready to sign.`
            : `${opportunity.studioName} returned a counteroffer for ${opportunity.title}.`,
        source: 'PLAYER_ACTION',
        metadata: {
            projectId: opportunity.id,
            round: nextDraft.negotiationRound,
            status: nextDraft.negotiationStatus,
        },
    };
    const nextPlayer: Player = {
        ...savedPlayer,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            catalogSetupDraft: nextDraft,
            eventLedger: [...platform.eventLedger, ledger],
        }, savedPlayer.id),
    };
    return {
        player: nextPlayer,
        draft: nextDraft,
        changed: true,
        message: accepted ? 'The licensor accepted. The agreement is ready to sign.' : 'The licensor countered with firmer commercial terms.',
    };
};

export const acceptStreamingCatalogCounter = (
    player: Player,
): { player: Player; draft: OwnedStreamingCatalogSetupDraft; changed: boolean } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const draft = platform.catalogSetupDraft || createDefaultStreamingCatalogDraft(player);
    if (
        draft.negotiationStatus !== 'COUNTERED'
        || draft.counterMinimumGuarantee === null
        || draft.counterPlatformRevenueShare === null
    ) return { player, draft, changed: false };
    const nextDraft: OwnedStreamingCatalogSetupDraft = {
        ...draft,
        minimumGuarantee: draft.counterMinimumGuarantee,
        platformRevenueShare: draft.counterPlatformRevenueShare,
        negotiationStatus: 'READY_TO_SIGN',
        currentStep: 4,
        updatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                catalogSetupDraft: nextDraft,
            }, player.id),
        },
        draft: nextDraft,
        changed: true,
    };
};

export const getStreamingCatalogLicenseStatus = (
    license: OwnedStreamingCatalogLicense,
    absoluteWeek: number,
): 'ACTIVE' | 'EXPIRED' => (
    license.status !== 'ACTIVE' || absoluteWeek >= license.expiresAtAbsoluteWeek
        ? 'EXPIRED'
        : 'ACTIVE'
);

/**
 * Establishes the opening catalogue from production-house releases the player
 * already controls. This creates references only: no internal sale, expense or
 * production-house revenue is fabricated.
 */
export const establishOwnedStreamingStarterCatalog = (
    player: Player,
    inputDraft?: OwnedStreamingCatalogSetupDraft,
): { player: Player; changed: boolean; reason?: 'INVALID_STATE' | 'EMPTY_CATALOGUE' } => {
    const savedPlayer = inputDraft ? saveStreamingCatalogDraft(player, inputDraft) : player;
    const platform = normalizeOwnedStreamingPlatformState(savedPlayer.ownedStreamingPlatform, savedPlayer.id);
    const draft = platform.catalogSetupDraft || createDefaultStreamingCatalogDraft(savedPlayer);
    if (platform.lifecycle !== 'FOUNDING' || platform.starterCatalog) {
        return { player: savedPlayer, changed: false, reason: 'INVALID_STATE' };
    }
    const eligibleOwnedIds = new Set(getEligibleOwnedStreamingTitles(savedPlayer).map(title => title.id));
    const ownedProjectIds = Array.from(new Set(draft.selectedOwnedProjectIds.filter(id => eligibleOwnedIds.has(id))));
    if (!ownedProjectIds.length) return { player: savedPlayer, changed: false, reason: 'EMPTY_CATALOGUE' };

    const absoluteWeek = getAbsoluteWeek(savedPlayer.age, savedPlayer.currentWeek);
    const importKey = `starter-catalog-owned:${ownedProjectIds.slice().sort().join(',')}`;
    if (platform.eventLedger.some(entry => entry.idempotencyKey === importKey)) {
        return { player: savedPlayer, changed: false, reason: 'INVALID_STATE' };
    }
    const importLedger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, importKey),
        idempotencyKey: importKey,
        absoluteWeek,
        type: 'CATALOG_IMPORTED',
        summary: `${ownedProjectIds.length} owned title${ownedProjectIds.length === 1 ? '' : 's'} linked to the opening catalogue at no internal fee.`,
        source: 'PLAYER_ACTION',
        metadata: { packageId: draft.packageId, ownedTitleCount: ownedProjectIds.length, internalFee: 0 },
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        catalogSetupDraft: null,
        starterCatalog: {
            packageId: draft.packageId,
            ownedProjectIds,
            licensedProjectIds: [],
            establishedAtAbsoluteWeek: absoluteWeek,
        },
        catalogProjectIds: Array.from(new Set([...platform.catalogProjectIds, ...ownedProjectIds])),
        milestoneKeys: Array.from(new Set([...platform.milestoneKeys, 'starter-catalog-established'])),
        eventLedger: [...platform.eventLedger, importLedger],
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            defineCurrentStep: 'BLUEPRINT',
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, savedPlayer.id);
    return { player: { ...savedPlayer, ownedStreamingPlatform: nextPlatform }, changed: true };
};

export const signStreamingStarterCatalog = (
    player: Player,
): { player: Player; changed: boolean; reason?: 'INVALID_STATE' | 'NOT_READY' | 'MISSING_TITLE' | 'INSUFFICIENT_TREASURY' } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const draft = platform.catalogSetupDraft;
    if (
        platform.lifecycle !== 'FOUNDING'
        || !draft
        || platform.starterCatalog
    ) return { player, changed: false, reason: 'INVALID_STATE' };
    if (draft.negotiationStatus !== 'READY_TO_SIGN') return { player, changed: false, reason: 'NOT_READY' };
    const opportunity = getStreamingLicenseOpportunities(player).find(item => item.id === draft.opportunityProjectId);
    if (!opportunity) return { player, changed: false, reason: 'MISSING_TITLE' };
    if (platform.treasuryCash < draft.minimumGuarantee) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const contractKey = `starter-license:${opportunity.id}:${absoluteWeek}`;
    if (platform.eventLedger.some(entry => entry.idempotencyKey === contractKey)) return { player, changed: false, reason: 'INVALID_STATE' };
    const eligibleOwnedIds = new Set(getEligibleOwnedStreamingTitles(player).map(title => title.id));
    const ownedProjectIds = Array.from(new Set(draft.selectedOwnedProjectIds.filter(id => eligibleOwnedIds.has(id))));
    const license: OwnedStreamingCatalogLicense = {
        id: createDeterministicId('streaming_license', platform.simulationSeed, contractKey),
        sourceProjectId: opportunity.id,
        titleAtSigning: opportunity.title,
        projectType: opportunity.projectType,
        genre: opportunity.genre,
        licensorName: opportunity.studioName,
        territory: draft.territory,
        countryIds: getOpeningLicenseCountryIds(player, draft.territory),
        durationWeeks: draft.durationWeeks,
        exclusivity: draft.exclusivity,
        minimumGuarantee: draft.minimumGuarantee,
        platformRevenueShare: draft.platformRevenueShare,
        licensorRevenueShare: 100 - draft.platformRevenueShare,
        signedAtAbsoluteWeek: absoluteWeek,
        startsAtAbsoluteWeek: absoluteWeek,
        expiresAtAbsoluteWeek: absoluteWeek + draft.durationWeeks,
        status: 'ACTIVE',
        origin: 'STARTER',
    };
    const importKey = `starter-catalog-import:${absoluteWeek}`;
    const importLedger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, importKey),
        idempotencyKey: importKey,
        absoluteWeek,
        type: 'CATALOG_IMPORTED',
        summary: ownedProjectIds.length
            ? `${ownedProjectIds.length} owned title${ownedProjectIds.length === 1 ? '' : 's'} linked to the starter catalog.`
            : 'Starter catalog recorded with no eligible owned titles available to import.',
        source: 'PLAYER_ACTION',
        metadata: {
            packageId: draft.packageId,
            ownedTitleCount: ownedProjectIds.length,
        },
    };
    const licenseLedger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, contractKey),
        idempotencyKey: contractKey,
        absoluteWeek,
        type: 'LICENSE_SIGNED',
        summary: `${opportunity.title} licensed for ${draft.durationWeeks} weeks.`,
        source: 'PLAYER_ACTION',
        metadata: {
            projectId: opportunity.id,
            guarantee: draft.minimumGuarantee,
            platformShare: draft.platformRevenueShare,
            expiresAtAbsoluteWeek: license.expiresAtAbsoluteWeek,
        },
    };
    const cinematicKey = `starter-catalog-open:${absoluteWeek}`;
    const cinematicId = createDeterministicId('streaming_scene', platform.simulationSeed, cinematicKey);
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - draft.minimumGuarantee,
        catalogSetupDraft: null,
        starterCatalog: {
            packageId: draft.packageId,
            ownedProjectIds,
            licensedProjectIds: [opportunity.id],
            establishedAtAbsoluteWeek: absoluteWeek,
        },
        catalogLicenses: [...platform.catalogLicenses, license],
        catalogProjectIds: Array.from(new Set([...platform.catalogProjectIds, ...ownedProjectIds, opportunity.id])),
        milestoneKeys: Array.from(new Set([...platform.milestoneKeys, 'starter-catalog-established', 'first-streaming-license-signed'])),
        eventLedger: [...platform.eventLedger, importLedger, licenseLedger, {
            id: createDeterministicId('streaming_event', platform.simulationSeed, `cinematic:${cinematicKey}`),
            idempotencyKey: `cinematic:${cinematicKey}`,
            absoluteWeek,
            type: 'CINEMATIC_QUEUED',
            summary: 'Catalog opening reveal queued.',
            source: 'SYSTEM',
            metadata: { cinematicId },
        }],
        cinematicQueue: [...platform.cinematicQueue, {
            id: cinematicId,
            idempotencyKey: cinematicKey,
            type: 'MILESTONE',
            status: 'QUEUED',
            priority: 'IMPORTANT',
            availableAtAbsoluteWeek: absoluteWeek,
            title: 'The library doors open',
            factIds: [importLedger.id, licenseLedger.id],
        }],
    }, player.id);
    const canonicalRegistration = registerStreamingRightsContract(
        player.world.streamingRightsContracts,
        createStreamingRightsContractFromLicense({
            license,
            seller: {
                type: 'NPC_STUDIO',
                id: opportunity.studioId,
                name: opportunity.studioName,
                platformId: null,
            },
            buyer: {
                type: 'PLAYER_PLATFORM',
                id: platform.identity?.slug || `player-platform:${player.id}`,
                name: platform.identity?.name || 'Player streaming platform',
                platformId: null,
            },
            guaranteeDisposition: 'PAID',
            settledAtAbsoluteWeek: absoluteWeek,
        }),
    );
    return {
        player: {
            ...player,
            ownedStreamingPlatform: nextPlatform,
            world: { ...player.world, streamingRightsContracts: canonicalRegistration.registry },
        },
        changed: true,
    };
};
