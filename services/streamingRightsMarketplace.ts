import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingRightsNegotiation,
    OwnedStreamingRightsObligation,
    OwnedStreamingSublicenseDeal,
    PlatformId,
    Player,
    StreamingLicenseExclusivity,
    StreamingLicenseTerritory,
    StreamingRightsChangeOfControl,
    StreamingRightsWindowType,
    StreamingCataloguePackage,
    StreamingCataloguePackageComponent,
    StreamingCataloguePackageOfferRow,
    StreamingRightsContract,
} from '../types';
import { STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import {
    getStreamingLicenseOpportunities,
    getStreamingLicenseQuote,
    type StreamingCatalogTitle,
} from './streamingCatalog';
import { PLATFORMS } from './streamingLogic';
import { normalizeStreamingDayOneMarketIds } from './streamingDayOneMarkets';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
    getStreamingRightsContract,
    normalizeStreamingRightsContractRegistry,
    registerStreamingRightsContract,
    validateStreamingRightsAvailability,
} from './streamingRightsCore';
import { buildStreamingBiddingRightsLot, resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import {
    allocateStreamingCatalogueGuarantee,
    calculateStreamingCatalogueReferenceValue,
    normalizeStreamingCataloguePackageRegistry,
} from './streamingCataloguePackages';
import { PHASE_ONE_ENERGY_COSTS } from './energyCosts';
import { spendPlayerEnergy } from './premiumLogic';
import {
    normalizeStreamingRightsCalendarState,
    normalizeStreamingRightsManagementState,
    processStreamingRightsCalendarWeek,
    resolveStreamingRightsRenewal,
} from './streamingRightsCalendar';

export type StreamingRightsOpportunityKind = 'STUDIO_ACQUISITION' | 'PLATFORM_TRADE' | 'SUBLICENSE_OUT';

export interface StreamingRightsOpportunity {
    id: string;
    kind: StreamingRightsOpportunityKind;
    title: StreamingCatalogTitle;
    sellerType: 'STUDIO' | 'PLATFORM';
    sellerId: string;
    sellerName: string;
    sellerPlatformId: PlatformId | null;
    sourceLicenseId: string | null;
    recommendedTerritory: StreamingLicenseTerritory;
    recommendedWindow: StreamingRightsWindowType;
    quote: ReturnType<typeof getStreamingLicenseQuote>;
    rivalPlatformId: PlatformId;
    rivalPlatformName: string;
    rivalBidAmount: number;
    marketHeat: 'COOL' | 'ACTIVE' | 'HOT';
}

export interface StreamingRightsTermsInput {
    territory: StreamingLicenseTerritory;
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    windowType: StreamingRightsWindowType;
    minimumGuarantee: number;
    platformRevenueShare: number;
    marketingGuarantee: number;
    viewershipBonusThreshold: number;
    viewershipBonusAmount: number;
    renewalOption: boolean;
    sublicensingAllowed: boolean;
    sequelRightsIncluded: boolean;
    changeOfControl: StreamingRightsChangeOfControl;
    cancellationPenalty: number;
}

export interface StreamingRightsActionResult {
    player: Player;
    changed: boolean;
    reason?: 'NOT_ACTIVE' | 'NOT_FOUND' | 'ALREADY_OPEN' | 'NOT_READY' | 'INSUFFICIENT_TREASURY' | 'INVALID_TERMS' | 'RIGHTS_UNAVAILABLE' | 'RIGHTS_RESTRICTED';
    detail?: string;
    negotiation?: OwnedStreamingRightsNegotiation;
}

const ACTIVE_NEGOTIATION_STATUSES = new Set(['OPEN', 'COUNTERED', 'READY_TO_SIGN']);
const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 250_000) * 250_000);

const marketCycle = (absoluteWeek: number): number => Math.max(0, Math.floor(absoluteWeek / 4));

const chooseRival = (
    seed: string,
    opportunityId: string,
    absoluteWeek: number,
    excludedPlatformId: PlatformId | null,
): { id: PlatformId; name: string; pressure: number } => {
    const rng = createDeterministicRng(`${seed}:rights-rival:${opportunityId}:${marketCycle(absoluteWeek)}`);
    const candidates = PLATFORM_IDS.filter(id => id !== excludedPlatformId);
    const id = candidates[Math.floor(rng() * candidates.length)] || 'NETFLIX';
    return { id, name: PLATFORMS[id].name, pressure: 0.88 + rng() * 0.34 };
};

const buildOpportunity = (
    platform: OwnedStreamingPlatformState,
    title: StreamingCatalogTitle,
    absoluteWeek: number,
    sellerType: 'STUDIO' | 'PLATFORM',
    sellerId: string,
    sellerName: string,
    sellerPlatformId: PlatformId | null,
    kind: StreamingRightsOpportunityKind,
    sourceLicenseId: string | null = null,
): StreamingRightsOpportunity => {
    const recommendedTerritory: StreamingLicenseTerritory = title.rating && title.rating >= 8 ? 'GLOBAL' : 'MULTI_REGION';
    const recommendedWindow: StreamingRightsWindowType = sellerType === 'PLATFORM' ? 'SECOND_WINDOW' : 'FIRST_WINDOW';
    const quote = getStreamingLicenseQuote(title, recommendedTerritory, kind === 'SUBLICENSE_OUT' ? 52 : 104, 'NON_EXCLUSIVE');
    const rival = chooseRival(platform.simulationSeed, `${kind}:${title.id}`, absoluteWeek, sellerPlatformId);
    const heatScore = rival.pressure * ((title.rating || 6.5) / 7);
    const marketHeat = heatScore >= 1.16 ? 'HOT' : heatScore >= 0.96 ? 'ACTIVE' : 'COOL';
    return {
        id: `${kind}:${sourceLicenseId || title.id}`,
        kind,
        title,
        sellerType,
        sellerId,
        sellerName,
        sellerPlatformId,
        sourceLicenseId,
        recommendedTerritory,
        recommendedWindow,
        quote,
        rivalPlatformId: rival.id,
        rivalPlatformName: rival.name,
        rivalBidAmount: roundMoney(quote.suggestedGuarantee * rival.pressure),
        marketHeat,
    };
};

export const getStreamingRightsOpportunities = (player: Player): StreamingRightsOpportunity[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE') return [];
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platformTitles = new Map(
        (player.pastProjects || [])
            .filter(project => Boolean(project.streamingPlatform))
            .map(project => [project.id, project]),
    );
    const inbound = getStreamingLicenseOpportunities(player).map(title => {
        const tradedTitle = platformTitles.get(title.id);
        const sellerPlatformId = tradedTitle?.streamingPlatform || null;
        return buildOpportunity(
            platform,
            title,
            absoluteWeek,
            sellerPlatformId ? 'PLATFORM' : 'STUDIO',
            sellerPlatformId || title.studioId,
            sellerPlatformId ? PLATFORMS[sellerPlatformId].name : title.studioName,
            sellerPlatformId,
            sellerPlatformId ? 'PLATFORM_TRADE' : 'STUDIO_ACQUISITION',
        );
    });

    const activeLicenses = platform.catalogLicenses
        .filter(license => license.status === 'ACTIVE' && license.expiresAtAbsoluteWeek >= absoluteWeek)
        .filter(license => license.sublicensingAllowed);
    const licensedOutbound = activeLicenses.map(license => buildOpportunity(
        platform,
        {
            id: license.sourceProjectId,
            title: license.titleAtSigning,
            projectType: 'MOVIE',
            genre: 'Licensed',
            rating: null,
            releaseYear: null,
            gross: license.minimumGuarantee * 8,
            studioId: platform.identity?.slug || 'owned-platform',
            studioName: platform.identity?.name || 'Your platform',
            source: 'EXTERNAL_MARKET',
        },
        absoluteWeek,
        'PLATFORM',
        platform.identity?.slug || 'owned-platform',
        platform.identity?.name || 'Your platform',
        null,
        'SUBLICENSE_OUT',
        license.id,
    ));
    const originalOutbound = platform.originalCommissions
        .filter(commission => commission.status === 'RELEASED' && commission.canonicalProjectId)
        .filter(commission => commission.lifecycleDecision?.type === 'LICENSE_WINDOW')
        .map(commission => buildOpportunity(
            platform,
            {
                id: commission.canonicalProjectId!,
                title: commission.title,
                projectType: commission.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
                genre: commission.genre,
                rating: null,
                releaseYear: null,
                gross: commission.productionFundingApplied * 5,
                studioId: platform.identity?.slug || 'owned-platform',
                studioName: platform.identity?.name || 'Your platform',
                source: 'OWNED_LIBRARY',
            },
            absoluteWeek,
            'PLATFORM',
            platform.identity?.slug || 'owned-platform',
            platform.identity?.name || 'Your platform',
            null,
            'SUBLICENSE_OUT',
            `original:${commission.id}`,
        ));
    return [...inbound, ...licensedOutbound, ...originalOutbound]
        .filter(opportunity => !platform.rightsNegotiations.some(negotiation => (
            negotiation.idempotencyKey === `${opportunity.id}:${marketCycle(absoluteWeek)}`
            && ACTIVE_NEGOTIATION_STATUSES.has(negotiation.status)
        )))
        .slice(0, 18);
};

export interface StreamingCataloguePackageOpportunity {
    id: string;
    package: StreamingCataloguePackage;
    rows: StreamingCataloguePackageOfferRow[];
    totalGuarantee: number;
    sellerName: string;
    marketHeat: 'ACTIVE' | 'HOT';
}

export interface OwnedStreamingCataloguePackagePurchaseResult {
    player: Player;
    changed: boolean;
    contracts: StreamingRightsContract[];
    package: StreamingCataloguePackage | null;
    reason?: 'NOT_ACTIVE' | 'NOT_FOUND' | 'INSUFFICIENT_TREASURY' | 'RIGHTS_UNAVAILABLE' | 'INSUFFICIENT_ENERGY';
    detail?: string;
}

const getOwnedPlatformPackageCountryIds = (platform: OwnedStreamingPlatformState): string[] => {
    const active = normalizeStreamingDayOneMarketIds(platform.marketOperations
        .filter(operation => operation.scope === 'COUNTRY' && operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId));
    return (active.length ? active : ['US', 'CA', 'MX']).slice().sort();
};

export const getStreamingCataloguePackageOpportunities = (
    player: Player,
): StreamingCataloguePackageOpportunity[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE') return [];
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const countryIds = getOwnedPlatformPackageCountryIds(platform);
    const sourceProjectById = new Map((player.world.projects || []).map(project => [project.id, project]));
    const groups = new Map<string, StreamingCatalogTitle[]>();
    getStreamingLicenseOpportunities(player)
        .filter(title => title.source === 'EXTERNAL_MARKET')
        .forEach(title => groups.set(title.studioId, [...(groups.get(title.studioId) || []), title]));
    return [...groups.entries()].flatMap(([studioId, titles]) => {
        const selected = titles
            .slice()
            .sort((left, right) => (right.rating || 0) - (left.rating || 0) || left.id.localeCompare(right.id))
            .slice(0, 5);
        if (selected.length < 3) return [];
        const components = selected.flatMap(title => {
            const sourceProject = sourceProjectById.get(title.id);
            const lotBuild = buildStreamingBiddingRightsLot({
                world: player.world,
                sourceProjectId: title.id,
                sellerPartyId: studioId,
                startsAtAbsoluteWeek: absoluteWeek,
                maximumDurationWeeks: 104,
                windowType: 'FIRST_WINDOW',
                desiredCountryIds: countryIds,
            });
            if (!lotBuild.lot) return [];
            const component: StreamingCataloguePackageComponent = {
                sourceProjectId: title.id,
                title: title.title,
                projectType: title.projectType,
                genre: title.genre,
                originalLanguageId: sourceProject?.originalLanguageId || 'english',
                sellerStudioId: studioId,
                quality: Math.max(0, Number(sourceProject?.quality || (title.rating || 0) * 10)),
                audience: 0,
                budget: 0,
                theatricalGross: Math.max(0, Number(title.gross || sourceProject?.boxOffice || 0)),
                streamingRevenue: 0,
                franchiseProtected: Boolean((sourceProject as any)?.franchiseId || sourceProject?.universeId),
                rightsLot: lotBuild.lot,
                referenceValue: 0,
                referenceWeight: 0,
            };
            return [component];
        }).sort((left, right) => left.sourceProjectId.localeCompare(right.sourceProjectId));
        if (components.length !== selected.length) return [];
        const referenceValues = components.map(component => calculateStreamingCatalogueReferenceValue(component));
        const referenceTotal = referenceValues.reduce((sum, value) => sum + value, 0);
        const valuedComponents = components.map((component, index) => ({
            ...component,
            referenceValue: referenceValues[index],
            referenceWeight: referenceTotal > 0 ? referenceValues[index] / referenceTotal : 1 / components.length,
        }));
        const totalGuarantee = roundMoney(Math.max(
            selected.length * 1_000_000,
            selected.reduce((sum, title) => sum + getStreamingLicenseQuote(title, 'MULTI_REGION', 104, 'NON_EXCLUSIVE').suggestedGuarantee, 0) * .78,
        ));
        const allocation = allocateStreamingCatalogueGuarantee({
            totalGuarantee,
            components: valuedComponents,
            platformId: 'NETFLIX',
            bidderValues: Object.fromEntries(selected.map(title => [
                title.id,
                Math.max(1, Number(title.gross || 0) * .19 + (title.rating || 6) ** 2 * 900_000),
            ])),
            durationWeeks: 104,
            exclusivity: 'NON_EXCLUSIVE',
            localization: 'NONE',
            localizationRequirements: [],
        });
        if (!allocation.valid) return [];
        const packageId = createDeterministicId('owned_streaming_catalogue_package', platform.simulationSeed, marketCycle(absoluteWeek), studioId, ...valuedComponents.map(component => component.sourceProjectId));
        const acceptedOfferId = createDeterministicId('owned_streaming_catalogue_package_offer', packageId);
        const cataloguePackage: StreamingCataloguePackage = {
            schemaVersion: STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION,
            id: packageId,
            idempotencyKey: `owned-platform-market:${packageId}`,
            source: 'OWNED_PLATFORM_MARKET',
            lifecycle: 'READY',
            name: `${selected[0].studioName} Collection`,
            seller: { type: 'NPC_STUDIO', id: studioId, name: selected[0].studioName, platformId: null },
            createdAtAbsoluteWeek: absoluteWeek,
            startsAtAbsoluteWeek: absoluteWeek,
            requestedWindowType: 'FIRST_WINDOW',
            requestedExclusivity: 'NON_EXCLUSIVE',
            requestedCountryIds: countryIds,
            maximumDurationWeeks: 104,
            components: valuedComponents,
            excluded: [],
            controlModeAtCreation: 'FULL',
            protectionReasons: [],
            delegatedReason: null,
            manualApprovalRequired: true,
            biddingSessionId: null,
            acceptedOfferId,
            signedAtAbsoluteWeek: null,
            totalGuarantee,
            totalExpectedExposure: allocation.rows.reduce((sum, row) => sum + row.expectedTotalCost, 0),
            acceptedTerms: allocation.rows,
            componentContractIds: [],
            digestId: null,
        };
        const averageRating = selected.reduce((sum, title) => sum + (title.rating || 6), 0) / selected.length;
        return [{
            id: packageId,
            package: cataloguePackage,
            rows: allocation.rows,
            totalGuarantee,
            sellerName: selected[0].studioName,
            marketHeat: averageRating >= 7.8 ? 'HOT' as const : 'ACTIVE' as const,
        }];
    }).sort((left, right) => right.totalGuarantee - left.totalGuarantee || left.id.localeCompare(right.id)).slice(0, 4);
};

export const signOwnedStreamingCataloguePackage = (
    player: Player,
    opportunityId: string,
): OwnedStreamingCataloguePackagePurchaseResult => {
    const registry = normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages);
    const existing = registry[opportunityId];
    if (existing?.lifecycle === 'SIGNED') {
        const contracts = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
        return { player, changed: false, package: existing, contracts: existing.componentContractIds.map(id => contracts[id]).filter(Boolean) };
    }
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE') return { player, changed: false, contracts: [], package: null, reason: 'NOT_ACTIVE' };
    const opportunity = getStreamingCataloguePackageOpportunities(player).find(candidate => candidate.id === opportunityId);
    if (!opportunity) return { player, changed: false, contracts: [], package: null, reason: 'NOT_FOUND' };
    if (platform.treasuryCash < opportunity.totalGuarantee) {
        return { player, changed: false, contracts: [], package: opportunity.package, reason: 'INSUFFICIENT_TREASURY' };
    }
    if (player.energy.current < PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT) {
        return { player, changed: false, contracts: [], package: opportunity.package, reason: 'INSUFFICIENT_ENERGY' };
    }
    for (const row of opportunity.rows) {
        const compatibility = resolveStreamingRightsCompatibility({
            world: player.world,
            sourceProjectId: row.componentProjectId,
            buyerPlatformId: null,
            sellerPartyId: opportunity.package.seller.id,
            territory: row.territory,
            countryIds: row.countryIds,
            startsAtAbsoluteWeek: opportunity.package.startsAtAbsoluteWeek,
            expiresAtAbsoluteWeek: opportunity.package.startsAtAbsoluteWeek + row.durationWeeks,
            windowType: row.windowType,
            exclusivity: row.exclusivity,
        });
        if (!compatibility.available) {
            return { player, changed: false, contracts: [], package: opportunity.package, reason: 'RIGHTS_UNAVAILABLE', detail: compatibility.summary };
        }
    }
    const identity = platform.identity;
    const buyerId = identity?.slug || `player-platform:${player.id}`;
    const componentById = new Map(opportunity.package.components.map(component => [component.sourceProjectId, component]));
    let contractRegistry = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const contracts: StreamingRightsContract[] = [];
    opportunity.rows.forEach((row, index) => {
        const component = componentById.get(row.componentProjectId)!;
        const license = createStreamingLicenseContract({
            id: createDeterministicId('owned_streaming_catalogue_contract', opportunity.id, row.componentProjectId, index),
            sourceProject: { id: component.sourceProjectId, title: component.title, mediaType: component.projectType, genre: component.genre },
            buyerPlatformId: null,
            platformContentPlanId: null,
            cataloguePackageId: opportunity.package.id,
            licensorName: opportunity.package.seller.name,
            territory: row.territory,
            countryIds: row.countryIds,
            durationWeeks: row.durationWeeks,
            exclusivity: row.exclusivity,
            minimumGuarantee: row.minimumGuarantee,
            platformRevenueShare: row.platformRevenueShare,
            signedAtAbsoluteWeek: opportunity.package.createdAtAbsoluteWeek,
            startsAtAbsoluteWeek: opportunity.package.startsAtAbsoluteWeek,
            origin: 'CATALOGUE_ACQUISITION',
            sellerType: 'STUDIO',
            sellerPlatformId: null,
            windowType: row.windowType,
            renewalOption: true,
            sublicensingAllowed: row.exclusivity === 'NON_EXCLUSIVE',
            sequelRightsIncluded: false,
            changeOfControl: 'NOTICE',
            cancellationPenalty: Math.round(row.minimumGuarantee * .2),
        });
        const registration = registerStreamingRightsContract(contractRegistry, createStreamingRightsContractFromLicense({
            license,
            seller: opportunity.package.seller,
            buyer: { type: 'PLAYER_PLATFORM', id: buyerId, name: identity?.name || 'Your platform', platformId: null },
            guaranteeDisposition: 'PAID',
            settledAtAbsoluteWeek: opportunity.package.createdAtAbsoluteWeek,
            localization: row.localization,
            localizationRequirements: row.localizationRequirements,
            guaranteeRecoupment: row.guaranteeRecoupment,
            backendCap: row.backendCap,
            sourceOfferId: opportunity.package.acceptedOfferId,
            idempotencyKey: `owned-streaming-catalogue-contract:${opportunity.package.id}:${row.componentProjectId}`,
        }));
        if (registration.contract) contracts.push(registration.contract);
        contractRegistry = registration.registry;
    });
    if (contracts.length !== opportunity.rows.length) {
        return { player, changed: false, contracts: [], package: opportunity.package, reason: 'RIGHTS_UNAVAILABLE' };
    }
    const signedPackage: StreamingCataloguePackage = {
        ...opportunity.package,
        lifecycle: 'SIGNED',
        signedAtAbsoluteWeek: opportunity.package.createdAtAbsoluteWeek,
        componentContractIds: contracts.map(contract => contract.id).sort(),
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${opportunity.id}:signed`),
        idempotencyKey: `${opportunity.id}:signed`,
        absoluteWeek: opportunity.package.createdAtAbsoluteWeek,
        type: 'LICENSE_SIGNED',
        summary: `${signedPackage.name} joined the catalogue through ${contracts.length} title contracts.`,
        source: 'PLAYER_ACTION',
        metadata: { cataloguePackageId: signedPackage.id, minimumGuarantee: opportunity.totalGuarantee },
    };
    const nextPlayer: Player = {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            treasuryCash: platform.treasuryCash - opportunity.totalGuarantee,
            catalogLicenses: [...platform.catalogLicenses, ...contracts],
            catalogProjectIds: Array.from(new Set([...platform.catalogProjectIds, ...contracts.map(contract => contract.sourceProjectId)])),
            eventLedger: platform.eventLedger.some(entry => entry.idempotencyKey === ledger.idempotencyKey)
                ? platform.eventLedger
                : [...platform.eventLedger, ledger],
        }, player.id),
        world: {
            ...player.world,
            streamingRightsContracts: contractRegistry,
            streamingCataloguePackages: { ...registry, [signedPackage.id]: signedPackage },
        },
    };
    spendPlayerEnergy(nextPlayer, PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT, `Catalogue acquisition: ${signedPackage.name}`);
    return { player: nextPlayer, changed: true, contracts, package: signedPackage };
};

export const createDefaultStreamingRightsTerms = (
    opportunity: StreamingRightsOpportunity,
): StreamingRightsTermsInput => ({
    territory: opportunity.kind === 'SUBLICENSE_OUT' ? 'DOMESTIC' : opportunity.recommendedTerritory,
    durationWeeks: opportunity.kind === 'SUBLICENSE_OUT' ? 52 : 104,
    exclusivity: 'NON_EXCLUSIVE',
    windowType: opportunity.recommendedWindow,
    minimumGuarantee: opportunity.quote.suggestedGuarantee,
    platformRevenueShare: opportunity.kind === 'SUBLICENSE_OUT' ? 62 : opportunity.quote.targetPlatformRevenueShare,
    marketingGuarantee: roundMoney(opportunity.quote.suggestedGuarantee * 0.12),
    viewershipBonusThreshold: Math.max(100_000, Math.round(opportunity.quote.suggestedGuarantee / 45)),
    viewershipBonusAmount: roundMoney(opportunity.quote.suggestedGuarantee * 0.08),
    renewalOption: true,
    sublicensingAllowed: opportunity.kind !== 'SUBLICENSE_OUT',
    sequelRightsIncluded: false,
    changeOfControl: 'NOTICE',
    cancellationPenalty: roundMoney(opportunity.quote.suggestedGuarantee * 0.22),
});

const normalizeTerms = (terms: StreamingRightsTermsInput): StreamingRightsTermsInput => ({
    territory: ['DOMESTIC', 'MULTI_REGION', 'GLOBAL'].includes(terms.territory) ? terms.territory : 'MULTI_REGION',
    durationWeeks: [26, 52, 104, 156, 260, 520].includes(terms.durationWeeks) ? terms.durationWeeks : 104,
    exclusivity: terms.exclusivity === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'NON_EXCLUSIVE',
    windowType: ['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT'].includes(terms.windowType) ? terms.windowType : 'SECOND_WINDOW',
    minimumGuarantee: roundMoney(clamp(terms.minimumGuarantee, 0, 5_000_000_000)),
    platformRevenueShare: Math.round(clamp(terms.platformRevenueShare, 45, 90)),
    marketingGuarantee: roundMoney(clamp(terms.marketingGuarantee, 0, 1_000_000_000)),
    viewershipBonusThreshold: Math.round(clamp(terms.viewershipBonusThreshold, 0, 100_000_000)),
    viewershipBonusAmount: roundMoney(clamp(terms.viewershipBonusAmount, 0, 1_000_000_000)),
    renewalOption: Boolean(terms.renewalOption),
    sublicensingAllowed: Boolean(terms.sublicensingAllowed),
    sequelRightsIncluded: Boolean(terms.sequelRightsIncluded),
    changeOfControl: ['NONE', 'NOTICE', 'CONSENT_REQUIRED'].includes(terms.changeOfControl) ? terms.changeOfControl : 'NOTICE',
    cancellationPenalty: roundMoney(clamp(terms.cancellationPenalty, 0, 2_000_000_000)),
});

const FALLBACK_MARKET_IDS = ['US', 'CA', 'MX'];

const getNegotiationCountrySnapshot = (
    platform: OwnedStreamingPlatformState,
    territory: StreamingLicenseTerritory,
    sourceLicense?: OwnedStreamingPlatformState['catalogLicenses'][number] | null,
): string[] => {
    if (territory === 'GLOBAL') return [];
    const activeCountryIds = normalizeStreamingDayOneMarketIds(platform.marketOperations
        .filter(operation => operation.scope === 'COUNTRY' && operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId));
    const sourceCountryIds = sourceLicense
        ? sourceLicense.territory === 'GLOBAL'
            ? activeCountryIds
            : normalizeStreamingDayOneMarketIds(sourceLicense.countryIds)
        : [];
    const candidates = sourceCountryIds.length
        ? sourceCountryIds
        : activeCountryIds.length ? activeCountryIds : [...FALLBACK_MARKET_IDS];
    return territory === 'DOMESTIC' ? candidates.slice(0, 1) : candidates.slice().sort();
};

export const openStreamingRightsNegotiation = (
    player: Player,
    opportunityId: string,
    inputTerms?: StreamingRightsTermsInput,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE') return { player, changed: false, reason: 'NOT_ACTIVE' };
    const opportunity = getStreamingRightsOpportunities(player).find(item => item.id === opportunityId);
    if (!opportunity) return { player, changed: false, reason: 'NOT_FOUND' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `${opportunity.id}:${marketCycle(absoluteWeek)}`;
    const existing = platform.rightsNegotiations.find(item => item.idempotencyKey === idempotencyKey);
    if (existing) return { player, changed: false, reason: 'ALREADY_OPEN', negotiation: existing };
    const terms = normalizeTerms(inputTerms || createDefaultStreamingRightsTerms(opportunity));
    const sourceLicense = opportunity.sourceLicenseId
        ? platform.catalogLicenses.find(license => license.id === opportunity.sourceLicenseId)
        : null;
    const negotiation: OwnedStreamingRightsNegotiation = {
        id: createDeterministicId('streaming_rights_negotiation', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        kind: opportunity.kind === 'SUBLICENSE_OUT' ? 'SUBLICENSE_OUT' : 'ACQUIRE',
        sourceProjectId: opportunity.title.id,
        sourceLicenseId: opportunity.sourceLicenseId,
        title: opportunity.title.title,
        projectType: opportunity.title.projectType,
        genre: opportunity.title.genre,
        sellerType: opportunity.sellerType,
        sellerId: opportunity.sellerId,
        sellerName: opportunity.sellerName,
        buyerPlatformId: opportunity.kind === 'SUBLICENSE_OUT' ? opportunity.rivalPlatformId : null,
        buyerName: opportunity.kind === 'SUBLICENSE_OUT' ? opportunity.rivalPlatformName : null,
        ...terms,
        countryIds: getNegotiationCountrySnapshot(platform, terms.territory, sourceLicense),
        rivalPlatformId: opportunity.kind === 'SUBLICENSE_OUT' ? null : opportunity.rivalPlatformId,
        rivalPlatformName: opportunity.kind === 'SUBLICENSE_OUT' ? null : opportunity.rivalPlatformName,
        rivalBidAmount: opportunity.rivalBidAmount,
        marketHeat: opportunity.marketHeat,
        status: 'OPEN',
        round: 0,
        counterMinimumGuarantee: null,
        counterPlatformRevenueShare: null,
        createdAtAbsoluteWeek: absoluteWeek,
        updatedAtAbsoluteWeek: absoluteWeek,
        expiresAtAbsoluteWeek: absoluteWeek + 3,
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: [...platform.rightsNegotiations, negotiation],
            }, player.id),
        },
        changed: true,
        negotiation,
    };
};

export const reviseStreamingRightsNegotiation = (
    player: Player,
    negotiationId: string,
    inputTerms: StreamingRightsTermsInput,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const current = platform.rightsNegotiations.find(item => item.id === negotiationId);
    if (!current || !ACTIVE_NEGOTIATION_STATUSES.has(current.status)) return { player, changed: false, reason: 'NOT_FOUND' };
    const terms = normalizeTerms(inputTerms);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const sourceLicense = current.sourceLicenseId
        ? platform.catalogLicenses.find(license => license.id === current.sourceLicenseId)
        : null;
    const negotiation = {
        ...current,
        ...terms,
        countryIds: getNegotiationCountrySnapshot(platform, terms.territory, sourceLicense),
        status: 'OPEN' as const,
        updatedAtAbsoluteWeek: absoluteWeek,
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? negotiation : item),
            }, player.id),
        },
        changed: true,
        negotiation,
    };
};

export const submitStreamingRightsOffer = (
    player: Player,
    negotiationId: string,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const current = platform.rightsNegotiations.find(item => item.id === negotiationId);
    if (!current || !ACTIVE_NEGOTIATION_STATUSES.has(current.status)) return { player, changed: false, reason: 'NOT_FOUND' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (absoluteWeek > current.expiresAtAbsoluteWeek) return { player, changed: false, reason: 'NOT_READY' };
    const rng = createDeterministicRng(`${platform.simulationSeed}:rights-offer:${current.id}:${current.round + 1}`);
    const referencePrice = Math.max(1, current.rivalBidAmount);
    const moneyScore = current.kind === 'SUBLICENSE_OUT'
        ? referencePrice / Math.max(1, current.minimumGuarantee)
        : current.minimumGuarantee / referencePrice;
    const shareScore = current.kind === 'SUBLICENSE_OUT'
        ? (100 - current.platformRevenueShare) / 38
        : (100 - current.platformRevenueShare) / 32;
    const clauseScore = (
        (current.renewalOption ? 0.04 : 0)
        + (current.sublicensingAllowed ? -0.03 : 0.03)
        + (current.marketingGuarantee > referencePrice * 0.08 ? 0.06 : 0)
        + (current.changeOfControl === 'CONSENT_REQUIRED' ? 0.04 : 0)
    );
    const score = moneyScore * 0.72 + shareScore * 0.18 + clauseScore + rng() * 0.08;
    const nextRound = Math.min(3, current.round + 1);
    let status: OwnedStreamingRightsNegotiation['status'] = 'COUNTERED';
    if (score >= 0.91 || nextRound >= 3) status = score >= 0.78 ? 'READY_TO_SIGN' : 'LOST';
    const counterGuarantee = status === 'COUNTERED'
        ? roundMoney(current.kind === 'SUBLICENSE_OUT'
            ? Math.max(current.minimumGuarantee * 0.92, referencePrice * 0.83)
            : Math.max(current.minimumGuarantee * 1.08, referencePrice * 0.92))
        : null;
    const counterShare = status === 'COUNTERED'
        ? Math.round(clamp(
            current.platformRevenueShare + (current.kind === 'SUBLICENSE_OUT' ? 3 : -3),
            45,
            90,
        ))
        : null;
    const negotiation: OwnedStreamingRightsNegotiation = {
        ...current,
        status,
        round: nextRound,
        counterMinimumGuarantee: counterGuarantee,
        counterPlatformRevenueShare: counterShare,
        updatedAtAbsoluteWeek: absoluteWeek,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${current.id}:round:${nextRound}`),
        idempotencyKey: `${current.id}:round:${nextRound}`,
        absoluteWeek,
        type: 'LICENSE_NEGOTIATION_UPDATED',
        summary: status === 'READY_TO_SIGN'
            ? `${current.title} reached signature terms after round ${nextRound}.`
            : status === 'LOST'
                ? `${current.title} was lost to competitive pressure.`
                : `${current.sellerName} countered the ${current.title} offer.`,
        source: 'PLAYER_ACTION',
        metadata: { negotiationId: current.id, round: nextRound, status },
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? negotiation : item),
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
        negotiation,
    };
};

export const acceptStreamingRightsCounter = (
    player: Player,
    negotiationId: string,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const current = platform.rightsNegotiations.find(item => item.id === negotiationId);
    if (!current || current.status !== 'COUNTERED' || current.counterMinimumGuarantee == null || current.counterPlatformRevenueShare == null) {
        return { player, changed: false, reason: 'NOT_READY' };
    }
    const negotiation: OwnedStreamingRightsNegotiation = {
        ...current,
        minimumGuarantee: current.counterMinimumGuarantee,
        platformRevenueShare: current.counterPlatformRevenueShare,
        status: 'READY_TO_SIGN',
        updatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? negotiation : item),
            }, player.id),
        },
        changed: true,
        negotiation,
    };
};

const createObligations = (
    platform: OwnedStreamingPlatformState,
    negotiation: OwnedStreamingRightsNegotiation,
    licenseId: string,
    absoluteWeek: number,
): OwnedStreamingRightsObligation[] => [
    ...(negotiation.marketingGuarantee > 0 ? [{
        id: createDeterministicId('streaming_rights_obligation', platform.simulationSeed, licenseId, 'marketing'),
        licenseId,
        sourceProjectId: negotiation.sourceProjectId,
        title: negotiation.title,
        type: 'MARKETING_SPEND' as const,
        targetAmount: negotiation.marketingGuarantee,
        observedAmount: 0,
        dueAtAbsoluteWeek: absoluteWeek + 4,
        status: 'PENDING' as const,
        breachPenalty: negotiation.cancellationPenalty,
        successPayment: 0,
        resolvedAtAbsoluteWeek: null,
    }] : []),
    ...(negotiation.viewershipBonusThreshold > 0 ? [{
        id: createDeterministicId('streaming_rights_obligation', platform.simulationSeed, licenseId, 'viewership'),
        licenseId,
        sourceProjectId: negotiation.sourceProjectId,
        title: negotiation.title,
        type: 'VIEWERSHIP_THRESHOLD' as const,
        targetAmount: negotiation.viewershipBonusThreshold,
        observedAmount: 0,
        dueAtAbsoluteWeek: absoluteWeek + 6,
        status: 'PENDING' as const,
        breachPenalty: negotiation.cancellationPenalty,
        successPayment: negotiation.viewershipBonusAmount,
        resolvedAtAbsoluteWeek: null,
    }] : []),
];

export const signStreamingRightsDeal = (
    player: Player,
    negotiationId: string,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const negotiation = platform.rightsNegotiations.find(item => item.id === negotiationId);
    if (!negotiation || negotiation.status !== 'READY_TO_SIGN') return { player, changed: false, reason: 'NOT_READY' };
    if (negotiation.kind !== 'SUBLICENSE_OUT' && platform.treasuryCash < negotiation.minimumGuarantee) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', negotiation };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const sourceLicense = negotiation.sourceLicenseId
        ? platform.catalogLicenses.find(item => item.id === negotiation.sourceLicenseId)
        : null;
    if (negotiation.kind === 'RENEW' && sourceLicense) {
        const calendar = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
        const renewalCase = Object.values(calendar.renewalCases)
            .find(candidate => candidate.sourceContractId === sourceLicense.id);
        if (!renewalCase || renewalCase.outcome !== 'PENDING') {
            return {
                player,
                changed: false,
                reason: 'NOT_READY',
                detail: renewalCase ? 'This renewal case has already been resolved.' : 'The canonical renewal case is missing.',
                negotiation,
            };
        }
        const playerWithFinalTerms: Player = {
            ...player,
            world: {
                ...player.world,
                streamingRightsCalendar: {
                    ...calendar,
                    renewalCases: {
                        ...calendar.renewalCases,
                        [renewalCase.id]: {
                            ...renewalCase,
                            offerDisposition: 'OFFERED',
                            proposedEconomics: {
                                minimumGuarantee: negotiation.minimumGuarantee,
                                platformRevenueShare: negotiation.platformRevenueShare,
                                licensorRevenueShare: 100 - negotiation.platformRevenueShare,
                                durationWeeks: negotiation.durationWeeks,
                                offerExpiresAtAbsoluteWeek: renewalCase.decisionDeadlineAbsoluteWeek,
                            },
                            lastProcessedAbsoluteWeek: absoluteWeek,
                        },
                    },
                },
            },
        };
        const resolved = resolveStreamingRightsRenewal(playerWithFinalTerms, {
            caseId: renewalCase.id,
            action: 'ACCEPT_RENEWAL',
            absoluteWeek,
        });
        if (!resolved.changed || !resolved.replacementContractId) {
            return {
                player,
                changed: false,
                reason: resolved.reason === 'RIGHTS_CONFLICT' ? 'RIGHTS_UNAVAILABLE'
                    : resolved.reason === 'BUYER_CANNOT_PAY' ? 'INSUFFICIENT_TREASURY'
                        : 'NOT_READY',
                detail: resolved.detail || undefined,
                negotiation,
            };
        }
        const resolvedPlatform = normalizeOwnedStreamingPlatformState(
            resolved.player.ownedStreamingPlatform,
            resolved.player.id,
        );
        const signedNegotiation = {
            ...negotiation,
            status: 'SIGNED' as const,
            updatedAtAbsoluteWeek: absoluteWeek,
        };
        const replacement = resolved.player.world.streamingRightsContracts?.[resolved.replacementContractId];
        const alreadyHasObligations = resolvedPlatform.rightsObligations
            .some(obligation => obligation.licenseId === resolved.replacementContractId);
        const renewalLedger: OwnedStreamingLedgerEntry = {
            id: createDeterministicId('streaming_event', resolvedPlatform.simulationSeed, `${negotiation.id}:signed`),
            idempotencyKey: `${negotiation.id}:signed`,
            absoluteWeek,
            type: 'LICENSE_SIGNED',
            summary: `${negotiation.title} was renewed through the canonical rights calendar.`,
            source: 'PLAYER_ACTION',
            metadata: {
                negotiationId: negotiation.id,
                kind: negotiation.kind,
                minimumGuarantee: negotiation.minimumGuarantee,
                replacementContractId: resolved.replacementContractId,
            },
        };
        const nextPlatform = compactOwnedStreamingPlatformForPersistence({
            ...resolvedPlatform,
            rightsNegotiations: resolvedPlatform.rightsNegotiations.map(item => (
                item.id === negotiationId ? signedNegotiation : item
            )),
            rightsObligations: replacement && !alreadyHasObligations
                ? [
                    ...resolvedPlatform.rightsObligations,
                    ...createObligations(
                        resolvedPlatform,
                        signedNegotiation,
                        replacement.id,
                        replacement.startsAtAbsoluteWeek,
                    ),
                ]
                : resolvedPlatform.rightsObligations,
            eventLedger: resolvedPlatform.eventLedger.some(entry => entry.idempotencyKey === renewalLedger.idempotencyKey)
                ? resolvedPlatform.eventLedger
                : [...resolvedPlatform.eventLedger, renewalLedger],
        }, resolved.player.id);
        return {
            player: { ...resolved.player, ownedStreamingPlatform: nextPlatform },
            changed: true,
            negotiation: signedNegotiation,
        };
    }
    const countryIds = negotiation.territory === 'GLOBAL'
        ? []
        : normalizeStreamingDayOneMarketIds(negotiation.countryIds).length
            ? normalizeStreamingDayOneMarketIds(negotiation.countryIds).sort()
            : getNegotiationCountrySnapshot(platform, negotiation.territory, sourceLicense);
    const startsAtAbsoluteWeek = negotiation.kind === 'RENEW' && sourceLicense
        ? Math.max(absoluteWeek, sourceLicense.expiresAtAbsoluteWeek + 1)
        : absoluteWeek;
    const expiresAtAbsoluteWeek = negotiation.windowType === 'PERMANENT'
        ? Number.MAX_SAFE_INTEGER
        : startsAtAbsoluteWeek + negotiation.durationWeeks;
    const compatibility = validateStreamingRightsAvailability({
        player,
        world: player.world,
        sourceProjectId: negotiation.sourceProjectId,
        buyerPlatformId: negotiation.kind === 'SUBLICENSE_OUT' ? negotiation.buyerPlatformId : null,
        sellerPartyId: negotiation.kind === 'SUBLICENSE_OUT'
            ? platform.identity?.slug || `player-platform:${player.id}`
            : negotiation.sellerId,
        territory: negotiation.territory,
        countryIds,
        windowType: negotiation.windowType,
        exclusivity: negotiation.exclusivity,
        startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek,
        action: negotiation.kind === 'SUBLICENSE_OUT' && sourceLicense ? 'SUBLICENSE' : 'LICENSE',
        sourceContractId: negotiation.kind === 'SUBLICENSE_OUT' && sourceLicense ? sourceLicense.id : null,
        excludeLicenseIds: negotiation.kind === 'RENEW' && negotiation.sourceLicenseId
            ? [negotiation.sourceLicenseId]
            : [],
    });
    if (!compatibility.available) {
        return {
            player,
            changed: false,
            reason: compatibility.status === 'RESTRICTED' ? 'RIGHTS_RESTRICTED' : 'RIGHTS_UNAVAILABLE',
            detail: compatibility.summary,
            negotiation,
        };
    }
    const signedNegotiation = { ...negotiation, status: 'SIGNED' as const, updatedAtAbsoluteWeek: absoluteWeek };
    let nextPlatform = platform;
    let nextWorld = player.world;
    if (negotiation.kind === 'SUBLICENSE_OUT') {
        const buyerPlatformId = negotiation.buyerPlatformId || 'NETFLIX';
        const deal: OwnedStreamingSublicenseDeal = {
            id: createDeterministicId('streaming_sublicense', platform.simulationSeed, negotiation.id),
            sourceLicenseId: negotiation.sourceLicenseId || `original:${negotiation.sourceProjectId}`,
            sourceProjectId: negotiation.sourceProjectId,
            title: negotiation.title,
            buyerPlatformId,
            buyerName: negotiation.buyerName || PLATFORMS[buyerPlatformId].name,
            territory: negotiation.territory,
            countryIds,
            windowType: negotiation.windowType,
            durationWeeks: negotiation.durationWeeks,
            exclusivity: negotiation.exclusivity,
            upfrontFee: negotiation.minimumGuarantee,
            sellerRevenueShare: negotiation.platformRevenueShare,
            buyerRevenueShare: 100 - negotiation.platformRevenueShare,
            signedAtAbsoluteWeek: absoluteWeek,
            startsAtAbsoluteWeek,
            expiresAtAbsoluteWeek,
            status: 'ACTIVE',
            changeOfControl: negotiation.changeOfControl,
            cancellationPenalty: negotiation.cancellationPenalty,
        };
        const buyerState = player.world.platforms?.[buyerPlatformId];
        nextWorld = buyerState ? {
            ...player.world,
            platforms: {
                ...player.world.platforms,
                [buyerPlatformId]: {
                    ...buyerState,
                    cashReserve: Math.max(0, buyerState.cashReserve - negotiation.minimumGuarantee / 1_000_000),
                },
            },
        } : player.world;
        if (sourceLicense) {
            const sublicenseProjection = {
                ...sourceLicense,
                id: deal.id,
                buyerPlatformId,
                licensorName: platform.identity?.name || 'Player streaming platform',
                territory: deal.territory,
                countryIds: deal.countryIds,
                windowType: deal.windowType,
                durationWeeks: deal.durationWeeks,
                exclusivity: deal.exclusivity,
                minimumGuarantee: deal.upfrontFee,
                platformRevenueShare: deal.buyerRevenueShare,
                studioRevenueShare: deal.sellerRevenueShare,
                signedAtAbsoluteWeek: deal.signedAtAbsoluteWeek,
                startsAtAbsoluteWeek: deal.startsAtAbsoluteWeek,
                expiresAtAbsoluteWeek: deal.expiresAtAbsoluteWeek,
                status: deal.status,
                origin: 'PLATFORM_TRADE' as const,
                sellerType: 'PLATFORM' as const,
                sellerPlatformId: null,
                changeOfControl: deal.changeOfControl,
                cancellationPenalty: deal.cancellationPenalty,
            };
            const canonicalRegistration = registerStreamingRightsContract(
                nextWorld.streamingRightsContracts,
                createStreamingRightsContractFromLicense({
                    license: sublicenseProjection,
                    seller: {
                        type: 'PLAYER_PLATFORM',
                        id: platform.identity?.slug || `player-platform:${player.id}`,
                        name: platform.identity?.name || 'Player streaming platform',
                        platformId: null,
                    },
                    buyer: {
                        type: 'AI_PLATFORM',
                        id: buyerPlatformId,
                        name: deal.buyerName,
                        platformId: buyerPlatformId,
                    },
                    guaranteeDisposition: 'PAID',
                    settledAtAbsoluteWeek: absoluteWeek,
                }),
            );
            nextWorld = { ...nextWorld, streamingRightsContracts: canonicalRegistration.registry };
        }
        nextPlatform = {
            ...platform,
            treasuryCash: platform.treasuryCash + negotiation.minimumGuarantee,
            rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? signedNegotiation : item),
            sublicenseDeals: [...platform.sublicenseDeals, deal],
        };
    } else {
        const licenseId = createDeterministicId('streaming_catalog_license', platform.simulationSeed, negotiation.id);
        const permanentPurchase = negotiation.windowType === 'PERMANENT';
        const license = createStreamingLicenseContract({
            id: licenseId,
            sourceProject: {
                id: negotiation.sourceProjectId,
                title: negotiation.title,
                mediaType: negotiation.projectType,
                genre: negotiation.genre,
            },
            buyerPlatformId: null,
            platformContentPlanId: null,
            cataloguePackageId: null,
            licensorName: negotiation.sellerName,
            territory: negotiation.territory,
            countryIds,
            durationWeeks: negotiation.durationWeeks,
            exclusivity: negotiation.exclusivity,
            minimumGuarantee: negotiation.minimumGuarantee,
            platformRevenueShare: negotiation.platformRevenueShare,
            signedAtAbsoluteWeek: absoluteWeek,
            startsAtAbsoluteWeek,
            origin: negotiation.kind === 'RENEW' ? 'RENEWAL' : negotiation.sellerType === 'PLATFORM' ? 'PLATFORM_TRADE' : 'STUDIO_MARKET',
            sellerType: negotiation.sellerType,
            sellerPlatformId: negotiation.sellerType === 'PLATFORM' ? negotiation.sellerId as PlatformId : null,
            windowType: negotiation.windowType,
            permanentPurchase,
            marketingGuarantee: negotiation.marketingGuarantee,
            viewershipBonusThreshold: negotiation.viewershipBonusThreshold,
            viewershipBonusAmount: negotiation.viewershipBonusAmount,
            renewalOption: negotiation.renewalOption,
            sublicensingAllowed: negotiation.sublicensingAllowed,
            sequelRightsIncluded: negotiation.sequelRightsIncluded,
            changeOfControl: negotiation.changeOfControl,
            cancellationPenalty: negotiation.cancellationPenalty,
            renewedFromLicenseId: negotiation.kind === 'RENEW' ? negotiation.sourceLicenseId : null,
        });
        const canonicalRegistration = registerStreamingRightsContract(
            nextWorld.streamingRightsContracts,
            createStreamingRightsContractFromLicense({
                license,
                seller: {
                    type: negotiation.sellerType === 'PLATFORM' ? 'AI_PLATFORM' : 'NPC_STUDIO',
                    id: negotiation.sellerId,
                    name: negotiation.sellerName,
                    platformId: negotiation.sellerType === 'PLATFORM' ? negotiation.sellerId as PlatformId : null,
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
        nextWorld = { ...nextWorld, streamingRightsContracts: canonicalRegistration.registry };
        nextPlatform = {
            ...platform,
            treasuryCash: platform.treasuryCash - negotiation.minimumGuarantee,
            rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? signedNegotiation : item),
            catalogLicenses: [...platform.catalogLicenses, license],
            rightsObligations: [...platform.rightsObligations, ...createObligations(platform, negotiation, licenseId, startsAtAbsoluteWeek)],
            catalogProjectIds: Array.from(new Set([...platform.catalogProjectIds, negotiation.sourceProjectId])),
        };
    }
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${negotiation.id}:signed`),
        idempotencyKey: `${negotiation.id}:signed`,
        absoluteWeek,
        type: 'LICENSE_SIGNED',
        summary: negotiation.kind === 'SUBLICENSE_OUT'
            ? `${negotiation.title} was sublicensed to ${negotiation.buyerName}.`
            : `${negotiation.title} joined the catalog through ${negotiation.sellerType === 'PLATFORM' ? 'a platform trade' : 'a studio agreement'}.`,
        source: 'PLAYER_ACTION',
        metadata: {
            negotiationId,
            kind: negotiation.kind,
            minimumGuarantee: negotiation.minimumGuarantee,
            territory: negotiation.territory,
        },
    };
    return {
        player: {
            ...player,
            world: nextWorld,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...nextPlatform,
                eventLedger: [...nextPlatform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
        negotiation: signedNegotiation,
    };
};

export const openStreamingRightsRenewal = (
    player: Player,
    licenseId: string,
): StreamingRightsActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const management = normalizeStreamingRightsManagementState(player.streamingRightsManagement);
    const canonical = getStreamingRightsContract(player.world.streamingRightsContracts, licenseId);
    if (!canonical || canonical.permanentPurchase || !canonical.renewalOption) {
        return { player, changed: false, reason: 'NOT_FOUND' };
    }
    const renewalOpensAt = Math.max(
        canonical.startsAtAbsoluteWeek,
        canonical.expiresAtAbsoluteWeek - management.policy.noticeWeeks,
    );
    if (absoluteWeek < renewalOpensAt) {
        return {
            player,
            changed: false,
            reason: 'NOT_READY',
            detail: `Renewal becomes available in Week ${renewalOpensAt}.`,
        };
    }
    const prepared = processStreamingRightsCalendarWeek(player, absoluteWeek).player;
    const renewalCase = Object.values(prepared.world.streamingRightsCalendar?.renewalCases || {})
        .find(candidate => candidate.sourceContractId === canonical.id);
    if (!renewalCase || renewalCase.offerDisposition !== 'OFFERED' || !renewalCase.proposedEconomics) {
        return {
            player: prepared,
            changed: prepared !== player,
            reason: 'NOT_READY',
            detail: renewalCase?.offerDisposition === 'DECLINED'
                ? 'The incumbent did not make a renewal offer.'
                : 'The renewal desk has not received terms yet.',
        };
    }
    const platform = normalizeOwnedStreamingPlatformState(prepared.ownedStreamingPlatform, prepared.id);
    const license = platform.catalogLicenses.find(item => item.id === licenseId);
    if (!license) return { player: prepared, changed: false, reason: 'NOT_FOUND' };
    const idempotencyKey = `RENEW:${license.id}:${renewalCase.id}`;
    const existing = platform.rightsNegotiations.find(item => item.idempotencyKey === idempotencyKey);
    if (existing) return { player: prepared, changed: false, reason: 'ALREADY_OPEN', negotiation: existing };
    const rival = chooseRival(platform.simulationSeed, idempotencyKey, absoluteWeek, license.sellerPlatformId || null);
    const economics = renewalCase.proposedEconomics;
    const negotiation: OwnedStreamingRightsNegotiation = {
        id: createDeterministicId('streaming_rights_negotiation', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        kind: 'RENEW',
        sourceProjectId: license.sourceProjectId,
        sourceLicenseId: license.id,
        title: license.titleAtSigning,
        projectType: renewalCase.projectType,
        genre: renewalCase.genre,
        sellerType: license.sellerType || 'STUDIO',
        sellerId: license.sellerPlatformId || license.licensorName,
        sellerName: license.licensorName,
        buyerPlatformId: null,
        buyerName: null,
        territory: license.territory,
        countryIds: license.territory === 'GLOBAL' ? [] : normalizeStreamingDayOneMarketIds(license.countryIds).sort(),
        durationWeeks: economics.durationWeeks,
        exclusivity: license.exclusivity,
        windowType: license.windowType || 'SECOND_WINDOW',
        minimumGuarantee: economics.minimumGuarantee,
        platformRevenueShare: economics.platformRevenueShare,
        marketingGuarantee: license.marketingGuarantee || 0,
        viewershipBonusThreshold: license.viewershipBonusThreshold || 0,
        viewershipBonusAmount: license.viewershipBonusAmount || 0,
        renewalOption: true,
        sublicensingAllowed: Boolean(license.sublicensingAllowed),
        sequelRightsIncluded: Boolean(license.sequelRightsIncluded),
        changeOfControl: license.changeOfControl || 'NOTICE',
        cancellationPenalty: license.cancellationPenalty || roundMoney(license.minimumGuarantee * 0.2),
        rivalPlatformId: rival.id,
        rivalPlatformName: rival.name,
        rivalBidAmount: roundMoney(economics.minimumGuarantee * (0.8 + renewalCase.performance!.rivalInterestScore / 250)),
        marketHeat: renewalCase.performance!.rivalInterestScore >= 72 ? 'HOT' : renewalCase.performance!.rivalInterestScore >= 45 ? 'ACTIVE' : 'COOL',
        status: 'OPEN',
        round: 0,
        counterMinimumGuarantee: null,
        counterPlatformRevenueShare: null,
        createdAtAbsoluteWeek: absoluteWeek,
        updatedAtAbsoluteWeek: absoluteWeek,
        expiresAtAbsoluteWeek: renewalCase.decisionDeadlineAbsoluteWeek,
    };
    return {
        player: {
            ...prepared,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: [...platform.rightsNegotiations, negotiation],
            }, prepared.id),
        },
        changed: true,
        negotiation,
    };
};

export const evaluateStreamingRightsCompliance = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
): {
    platform: OwnedStreamingPlatformState;
    complianceCost: number;
    ledgerEntries: OwnedStreamingLedgerEntry[];
} => {
    const ledgerEntries: OwnedStreamingLedgerEntry[] = [];
    let complianceCost = 0;
    const catalogLicenses = platform.catalogLicenses.map(license => {
        if (license.status === 'ACTIVE' && !license.permanentPurchase && absoluteWeek > license.expiresAtAbsoluteWeek) {
            const key = `rights-expired:${license.id}`;
            if (!platform.eventLedger.some(entry => entry.idempotencyKey === key)) {
                ledgerEntries.push({
                    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
                    idempotencyKey: key,
                    absoluteWeek,
                    type: 'SYSTEM_REPAIR',
                    summary: `${license.titleAtSigning} left the catalog when its rights window expired.`,
                    source: 'WEEK_PROCESSOR',
                    metadata: { licenseId: license.id, projectId: license.sourceProjectId },
                });
            }
            return { ...license, status: 'EXPIRED' as const };
        }
        return license;
    });
    const sublicenseDeals = platform.sublicenseDeals.map(deal => (
        deal.status === 'ACTIVE' && absoluteWeek > deal.expiresAtAbsoluteWeek
            ? { ...deal, status: 'EXPIRED' as const }
            : deal
    ));
    const rightsNegotiations = platform.rightsNegotiations.map(negotiation => (
        ACTIVE_NEGOTIATION_STATUSES.has(negotiation.status) && absoluteWeek > negotiation.expiresAtAbsoluteWeek
            ? { ...negotiation, status: 'EXPIRED' as const, updatedAtAbsoluteWeek: absoluteWeek }
            : negotiation
    ));
    const rightsObligations = platform.rightsObligations.map(obligation => {
        if (obligation.status === 'SATISFIED' || obligation.status === 'BREACHED') return obligation;
        const observedAmount = obligation.type === 'MARKETING_SPEND'
            ? platform.growthActions
                .filter(action => action.projectId === obligation.sourceProjectId && action.status === 'APPLIED')
                .reduce((sum, action) => sum + action.cashCost, 0)
            : platform.weeklyHistory.reduce((sum, snapshot) => (
                sum + (snapshot.operations?.titlePerformance || [])
                    .filter(performance => performance.projectId === obligation.sourceProjectId)
                    .reduce((titleSum, performance) => titleSum + performance.viewingAccounts, 0)
            ), 0);
        if (observedAmount >= obligation.targetAmount) {
            const key = `rights-obligation-satisfied:${obligation.id}`;
            if (obligation.successPayment > 0 && !platform.eventLedger.some(entry => entry.idempotencyKey === key)) {
                complianceCost += obligation.successPayment;
                ledgerEntries.push({
                    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
                    idempotencyKey: key,
                    absoluteWeek,
                    type: 'SYSTEM_REPAIR',
                    summary: `${obligation.title} earned its contractual viewership bonus.`,
                    source: 'WEEK_PROCESSOR',
                    metadata: { obligationId: obligation.id, bonus: obligation.successPayment },
                });
            }
            return { ...obligation, observedAmount, status: 'SATISFIED' as const, resolvedAtAbsoluteWeek: absoluteWeek };
        }
        if (absoluteWeek > obligation.dueAtAbsoluteWeek) {
            const key = `rights-obligation-breach:${obligation.id}`;
            if (!platform.eventLedger.some(entry => entry.idempotencyKey === key)) {
                complianceCost += obligation.breachPenalty;
                ledgerEntries.push({
                    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
                    idempotencyKey: key,
                    absoluteWeek,
                    type: 'SYSTEM_REPAIR',
                    summary: `${obligation.title} breached its ${obligation.type === 'MARKETING_SPEND' ? 'marketing guarantee' : 'viewership obligation'}.`,
                    source: 'WEEK_PROCESSOR',
                    metadata: { obligationId: obligation.id, penalty: obligation.breachPenalty },
                });
            }
            return { ...obligation, observedAmount, status: 'BREACHED' as const, resolvedAtAbsoluteWeek: absoluteWeek };
        }
        return { ...obligation, observedAmount, status: observedAmount > 0 ? 'ON_TRACK' as const : 'PENDING' as const };
    });
    return {
        platform: { ...platform, catalogLicenses, sublicenseDeals, rightsNegotiations, rightsObligations },
        complianceCost,
        ledgerEntries,
    };
};

export const applyStreamingRightsChangeOfControl = (
    player: Player,
    licenseId: string,
    consentGranted: boolean,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const license = platform.catalogLicenses.find(item => item.id === licenseId);
    if (!license) return { player, changed: false, reason: 'NOT_FOUND' };
    const requiresConsent = license.changeOfControl === 'CONSENT_REQUIRED';
    if (!requiresConsent || consentGranted) return { player, changed: false, reason: 'NOT_READY' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const penalty = Math.min(platform.treasuryCash, license.cancellationPenalty || 0);
    const otherActiveRight = platform.catalogLicenses.some(item => (
        item.id !== license.id && item.sourceProjectId === license.sourceProjectId && item.status === 'ACTIVE'
    ));
    const key = `rights-change-of-control:${license.id}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'SYSTEM_REPAIR',
        summary: `${license.titleAtSigning} terminated after change-of-control consent was denied.`,
        source: 'SYSTEM',
        metadata: { licenseId, penalty },
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                treasuryCash: platform.treasuryCash - penalty,
                catalogLicenses: platform.catalogLicenses.map(item => item.id === licenseId ? { ...item, status: 'TERMINATED' } : item),
                catalogProjectIds: otherActiveRight
                    ? platform.catalogProjectIds
                    : platform.catalogProjectIds.filter(id => id !== license.sourceProjectId),
                eventLedger: platform.eventLedger.some(entry => entry.idempotencyKey === key)
                    ? platform.eventLedger
                    : [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
    };
};
