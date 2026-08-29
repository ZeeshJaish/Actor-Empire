import type {
    OwnedStreamingCatalogLicense,
    PlatformAiContentSource,
    PlatformId,
    Player,
    StreamingCatalogLicenseStatus,
    StreamingLicenseExclusivity,
    StreamingLicenseTerritory,
    StreamingRightsChangeOfControl,
    StreamingRightsContract,
    StreamingRightsContractParty,
    StreamingRightsContractPartyType,
    StreamingRightsContractRegistry,
    StreamingRightsDealStructure,
    StreamingRightsGuaranteeDisposition,
    StreamingGuaranteeRecoupment,
    StreamingRightsLocalizationTerms,
    StreamingBiddingSession,
    StreamingOfferVersion,
    StreamingRightsSellerType,
    StreamingRightsWindowType,
    StreamingLocalizationPromise,
    WorldState,
} from '../types';
import { STREAMING_RIGHTS_CONTRACT_SCHEMA_VERSION } from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeStreamingDayOneMarketIds } from './streamingDayOneMarkets';
import { normalizeStreamingLanguageId } from './streamingLocalizationCapabilities';

const FULL_CURRENCY_PER_MILLION = 1_000_000;
const CONTRACT_PARTY_TYPES = new Set<StreamingRightsContractPartyType>([
    'PLAYER_STUDIO', 'NPC_STUDIO', 'PLAYER_PLATFORM', 'AI_PLATFORM',
]);
const DEAL_STRUCTURES = new Set<StreamingRightsDealStructure>([
    'FLAT_LICENSE', 'GUARANTEE_BONUS', 'GUARANTEE_REVENUE_SHARE',
    'PERMANENT_ACQUISITION', 'PRE_BUY', 'INTERNAL_ALLOCATION',
]);
const LOCALIZATION_TERMS = new Set<StreamingRightsLocalizationTerms>([
    'NONE', 'SUBTITLES', 'DUBS_AND_SUBTITLES',
]);
const GUARANTEE_DISPOSITIONS = new Set<StreamingRightsGuaranteeDisposition>([
    'PENDING', 'PAID', 'LEGACY_PAID', 'INTERNAL',
]);
const TERRITORIES = new Set<StreamingLicenseTerritory>(['DOMESTIC', 'MULTI_REGION', 'GLOBAL']);
const EXCLUSIVITY_TERMS = new Set<StreamingLicenseExclusivity>(['NON_EXCLUSIVE', 'EXCLUSIVE']);
const LICENSE_STATUSES = new Set<StreamingCatalogLicenseStatus>(['ACTIVE', 'EXPIRED', 'TERMINATED']);
const SELLER_TYPES = new Set<StreamingRightsSellerType>(['STUDIO', 'PLATFORM']);
const WINDOW_TYPES = new Set<StreamingRightsWindowType>(['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT']);
const CHANGE_OF_CONTROL_TERMS = new Set<StreamingRightsChangeOfControl>(['NONE', 'NOTICE', 'CONSENT_REQUIRED']);
const ORIGINS = new Set<NonNullable<OwnedStreamingCatalogLicense['origin']>>([
    'STARTER', 'STUDIO_MARKET', 'PLATFORM_TRADE', 'RENEWAL',
    'OWNED_STUDIO_TRANSFER', 'CATALOGUE_ACQUISITION',
]);
const LEGACY_SOURCES = new Set([
    'OWNED_PLATFORM_LICENSE', 'PLATFORM_AI_LICENSE', 'PRODUCTION_RELEASE',
]);
const GUARANTEE_RECOUPMENT_TERMS = new Set<StreamingGuaranteeRecoupment>(['NON_RECOUPABLE', 'RECOUPABLE']);
const PLATFORM_IDS = new Set<PlatformId>(['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE']);

const asRecord = (value: unknown): Record<string, any> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
);
const cleanText = (value: unknown, fallback = '', maxLength = 180): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback).slice(0, maxLength);
};
const finiteNumber = (value: unknown, fallback = 0): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};
const finiteMoney = (value: unknown): number => Math.max(0, Math.round(finiteNumber(value)));
const finiteWeek = (value: unknown, fallback = 0): number => Math.max(0, Math.round(finiteNumber(value, fallback)));
const clampPercent = (value: unknown, fallback = 0): number => Math.max(0, Math.min(100, Math.round(finiteNumber(value, fallback))));
const enumValue = <T extends string>(value: unknown, allowed: Set<T>, fallback: T): T => (
    allowed.has(value as T) ? value as T : fallback
);

const normalizeLocalizationPromises = (value: unknown): StreamingLocalizationPromise[] => {
    const byKey = new Map<string, StreamingLocalizationPromise>();
    for (const raw of Array.isArray(value) ? value : []) {
        const source = asRecord(raw);
        const languageId = normalizeStreamingLanguageId(source.languageId);
        const mode = source.mode === 'DUB' || source.mode === 'SUBTITLE' ? source.mode : null;
        const capabilityTierAtPromise = Math.round(Number(source.capabilityTierAtPromise));
        const countryIds = normalizeStreamingDayOneMarketIds(source.countryIds).sort();
        if (!languageId || !mode || ![1, 2, 3].includes(capabilityTierAtPromise) || !countryIds.length) continue;
        const promise: StreamingLocalizationPromise = {
            ...(typeof source.sourceProjectId === 'string' && source.sourceProjectId.trim()
                ? { sourceProjectId: source.sourceProjectId.trim() } : {}),
            languageId,
            mode,
            countryIds,
            capabilityTierAtPromise: capabilityTierAtPromise as 1 | 2 | 3,
            mandatory: source.mandatory !== false,
        };
        byKey.set(`${languageId}:${mode}:${countryIds.join(',')}`, promise);
    }
    return Array.from(byKey.values()).sort((left, right) => (
        left.languageId.localeCompare(right.languageId) || left.mode.localeCompare(right.mode)
    ));
};

const normalizeParty = (
    value: unknown,
    fallback: StreamingRightsContractParty,
): StreamingRightsContractParty => {
    const source = asRecord(value);
    const type = enumValue(source.type, CONTRACT_PARTY_TYPES, fallback.type);
    const platformId = source.platformId === null
        ? null
        : PLATFORM_IDS.has(source.platformId as PlatformId)
            ? source.platformId as PlatformId
            : fallback.platformId;
    return {
        type,
        id: cleanText(source.id, fallback.id, 180),
        name: cleanText(source.name, fallback.name, 140),
        platformId,
    };
};

const normalizeStreamingRightsContract = (value: unknown): StreamingRightsContract | null => {
    const source = asRecord(value);
    const id = cleanText(source.id, '', 180);
    const sourceProjectId = cleanText(source.sourceProjectId, '', 180);
    if (!id || !sourceProjectId) return null;
    const signedAtAbsoluteWeek = finiteWeek(source.signedAtAbsoluteWeek);
    const startsAtAbsoluteWeek = Math.max(signedAtAbsoluteWeek, finiteWeek(source.startsAtAbsoluteWeek, signedAtAbsoluteWeek));
    const durationWeeks = Math.max(1, finiteWeek(source.durationWeeks, 52));
    const permanentPurchase = Boolean(source.permanentPurchase) || source.windowType === 'PERMANENT';
    const platformRevenueShare = clampPercent(source.platformRevenueShare, 70);
    const seller = normalizeParty(source.seller, {
        type: 'NPC_STUDIO', id: 'unknown-studio', name: 'Rights holder', platformId: null,
    });
    const buyer = normalizeParty(source.buyer, {
        type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Streaming platform', platformId: 'NETFLIX',
    });
    const settlementSource = asRecord(source.settlement);
    const settledWeek = settlementSource.settledAtAbsoluteWeek === null
        || settlementSource.settledAtAbsoluteWeek === undefined
        ? null
        : finiteWeek(settlementSource.settledAtAbsoluteWeek, signedAtAbsoluteWeek);
    const countryIds = Array.from(new Set((Array.isArray(source.countryIds) ? source.countryIds : [])
        .map((countryId: unknown) => cleanText(countryId, '', 12).toUpperCase())
        .filter(Boolean)));
    return {
        schemaVersion: STREAMING_RIGHTS_CONTRACT_SCHEMA_VERSION,
        id,
        idempotencyKey: cleanText(source.idempotencyKey, id, 180),
        biddingSessionId: cleanText(source.biddingSessionId, '', 180) || null,
        sourceOfferId: cleanText(source.sourceOfferId, '', 180) || null,
        sourceProjectId,
        titleAtSigning: cleanText(source.titleAtSigning, 'Untitled project', 140),
        projectType: source.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
        genre: cleanText(source.genre, 'Licensed', 80),
        licensorName: cleanText(source.licensorName, seller.name, 140),
        territory: enumValue(source.territory, TERRITORIES, 'GLOBAL'),
        countryIds: source.territory === 'GLOBAL' ? [] : countryIds,
        durationWeeks,
        exclusivity: enumValue(source.exclusivity, EXCLUSIVITY_TERMS, 'EXCLUSIVE'),
        minimumGuarantee: finiteMoney(source.minimumGuarantee),
        platformRevenueShare,
        licensorRevenueShare: 100 - platformRevenueShare,
        signedAtAbsoluteWeek,
        startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: permanentPurchase ? Number.MAX_SAFE_INTEGER : startsAtAbsoluteWeek + durationWeeks,
        status: enumValue(source.status, LICENSE_STATUSES, 'ACTIVE'),
        origin: enumValue(source.origin, ORIGINS, 'STUDIO_MARKET'),
        buyerPlatformId: PLATFORM_IDS.has(source.buyerPlatformId as PlatformId)
            ? source.buyerPlatformId as PlatformId
            : buyer.platformId,
        platformContentPlanId: cleanText(source.platformContentPlanId, '', 180) || null,
        cataloguePackageId: cleanText(source.cataloguePackageId, '', 180) || null,
        contentSource: source.contentSource,
        sellerType: enumValue(source.sellerType, SELLER_TYPES, seller.type.endsWith('PLATFORM') ? 'PLATFORM' : 'STUDIO'),
        sellerPlatformId: PLATFORM_IDS.has(source.sellerPlatformId as PlatformId)
            ? source.sellerPlatformId as PlatformId
            : seller.platformId,
        windowType: enumValue(source.windowType, WINDOW_TYPES, permanentPurchase ? 'PERMANENT' : 'FIRST_WINDOW'),
        permanentPurchase,
        marketingGuarantee: finiteMoney(source.marketingGuarantee),
        viewershipBonusThreshold: finiteMoney(source.viewershipBonusThreshold),
        viewershipBonusAmount: finiteMoney(source.viewershipBonusAmount),
        renewalOption: Boolean(source.renewalOption),
        sublicensingAllowed: Boolean(source.sublicensingAllowed),
        sequelRightsIncluded: Boolean(source.sequelRightsIncluded),
        changeOfControl: enumValue(source.changeOfControl, CHANGE_OF_CONTROL_TERMS, 'NOTICE'),
        cancellationPenalty: finiteMoney(source.cancellationPenalty),
        renewedFromLicenseId: cleanText(source.renewedFromLicenseId, '', 180) || null,
        seller,
        buyer,
        dealStructure: enumValue(source.dealStructure, DEAL_STRUCTURES, 'FLAT_LICENSE'),
        productionFunding: finiteMoney(source.productionFunding),
        futureSeasonFunding: finiteMoney(source.futureSeasonFunding),
        localization: enumValue(source.localization, LOCALIZATION_TERMS, 'NONE'),
        localizationRequirements: normalizeLocalizationPromises(source.localizationRequirements),
        backendBasis: 'ADJUSTED_GROSS_RECEIPTS',
        guaranteeRecoupment: enumValue(source.guaranteeRecoupment, GUARANTEE_RECOUPMENT_TERMS, 'NON_RECOUPABLE'),
        backendCap: source.backendCap === null || source.backendCap === undefined ? null : finiteMoney(source.backendCap),
        cumulativeRoyaltyAccrued: finiteMoney(source.cumulativeRoyaltyAccrued),
        cumulativeRoyaltyPaid: finiteMoney(source.cumulativeRoyaltyPaid),
        settlement: {
            guarantee: enumValue(settlementSource.guarantee, GUARANTEE_DISPOSITIONS, 'PENDING'),
            paymentKey: cleanText(settlementSource.paymentKey, `streaming-guarantee:${id}`, 180),
            settledAtAbsoluteWeek: settledWeek,
        },
        legacySource: LEGACY_SOURCES.has(source.legacySource)
            ? source.legacySource
            : undefined,
    };
};

export const normalizeStreamingRightsContractRegistry = (
    value: unknown,
): StreamingRightsContractRegistry => {
    const source = asRecord(value);
    const registry: StreamingRightsContractRegistry = {};
    Object.values(source).forEach(rawContract => {
        const contract = normalizeStreamingRightsContract(rawContract);
        if (!contract || registry[contract.id]) return;
        registry[contract.id] = contract;
    });
    return registry;
};

export const getStreamingRightsContract = (
    registry: StreamingRightsContractRegistry | null | undefined,
    contractId: string,
): StreamingRightsContract | null => (
    normalizeStreamingRightsContractRegistry(registry)[cleanText(contractId, '', 180)] || null
);

export const registerStreamingRightsContract = (
    value: StreamingRightsContractRegistry | null | undefined,
    candidate: StreamingRightsContract,
): { registry: StreamingRightsContractRegistry; contract: StreamingRightsContract | null; changed: boolean } => {
    const registry = normalizeStreamingRightsContractRegistry(value);
    const normalizedCandidate = normalizeStreamingRightsContract(candidate);
    if (!normalizedCandidate) return { registry, contract: null, changed: false };
    const existing = registry[normalizedCandidate.id]
        || Object.values(registry).find(contract => contract.idempotencyKey === normalizedCandidate.idempotencyKey);
    if (existing) {
        const originalRegistry = value && Object.keys(registry).length === Object.keys(value).length ? value : registry;
        return { registry: originalRegistry, contract: existing, changed: false };
    }
    const nextRegistry = { ...registry, [normalizedCandidate.id]: normalizedCandidate };
    return { registry: nextRegistry, contract: normalizedCandidate, changed: true };
};

const partyIdFromName = (name: string): string => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'unknown-rights-holder';
};

const inferDealStructure = (license: OwnedStreamingCatalogLicense): StreamingRightsDealStructure => {
    if (license.permanentPurchase || license.windowType === 'PERMANENT') return 'PERMANENT_ACQUISITION';
    if (license.origin === 'OWNED_STUDIO_TRANSFER') return 'INTERNAL_ALLOCATION';
    if ((license.viewershipBonusAmount || 0) > 0) return 'GUARANTEE_BONUS';
    if (license.platformRevenueShare > 0 && license.platformRevenueShare < 100) return 'GUARANTEE_REVENUE_SHARE';
    return 'FLAT_LICENSE';
};

export interface StreamingRightsContractFromLicenseInput {
    license: OwnedStreamingCatalogLicense;
    seller?: StreamingRightsContractParty;
    buyer: StreamingRightsContractParty;
    guaranteeDisposition: StreamingRightsGuaranteeDisposition;
    settledAtAbsoluteWeek: number | null;
    legacySource?: StreamingRightsContract['legacySource'];
    productionFunding?: number;
    futureSeasonFunding?: number;
    localization?: StreamingRightsLocalizationTerms;
    localizationRequirements?: StreamingLocalizationPromise[];
    guaranteeRecoupment?: StreamingGuaranteeRecoupment;
    backendCap?: number | null;
    biddingSessionId?: string | null;
    sourceOfferId?: string | null;
    idempotencyKey?: string;
}

export const createStreamingRightsContractFromLicense = (
    input: StreamingRightsContractFromLicenseInput,
): StreamingRightsContract => {
    const license = input.license;
    const sellerPlatformId = license.sellerPlatformId || null;
    const seller = input.seller || {
        type: sellerPlatformId ? 'AI_PLATFORM' : 'NPC_STUDIO',
        id: sellerPlatformId || partyIdFromName(license.licensorName),
        name: license.licensorName,
        platformId: sellerPlatformId,
    };
    return normalizeStreamingRightsContract({
        ...license,
        schemaVersion: STREAMING_RIGHTS_CONTRACT_SCHEMA_VERSION,
        idempotencyKey: input.idempotencyKey || `streaming-contract:${license.id}`,
        biddingSessionId: input.biddingSessionId || null,
        sourceOfferId: input.sourceOfferId || null,
        seller,
        buyer: input.buyer,
        dealStructure: inferDealStructure(license),
        productionFunding: input.productionFunding || 0,
        futureSeasonFunding: input.futureSeasonFunding || 0,
        localization: input.localization || 'NONE',
        localizationRequirements: normalizeLocalizationPromises(input.localizationRequirements),
        backendBasis: 'ADJUSTED_GROSS_RECEIPTS',
        guaranteeRecoupment: input.guaranteeRecoupment || 'NON_RECOUPABLE',
        backendCap: input.backendCap ?? null,
        cumulativeRoyaltyAccrued: 0,
        cumulativeRoyaltyPaid: 0,
        settlement: {
            guarantee: input.guaranteeDisposition,
            paymentKey: `streaming-guarantee:${license.id}`,
            settledAtAbsoluteWeek: input.settledAtAbsoluteWeek,
        },
        legacySource: input.legacySource,
    })!;
};

/**
 * Imports existing buyer-local licence projections into the actor-neutral world
 * registry. Existing canonical entries always win and no financial state moves.
 */
export const migrateStreamingRightsContractRegistry = (player: Player): Player => {
    let registry = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const ownedIdentity = player.ownedStreamingPlatform?.identity;
    const ownedBuyer: StreamingRightsContractParty = {
        type: 'PLAYER_PLATFORM',
        id: ownedIdentity?.slug || `player-platform:${player.id}`,
        name: ownedIdentity?.name || 'Player streaming platform',
        platformId: null,
    };
    (player.ownedStreamingPlatform?.catalogLicenses || []).forEach(license => {
        const result = registerStreamingRightsContract(registry, createStreamingRightsContractFromLicense({
            license,
            buyer: ownedBuyer,
            guaranteeDisposition: license.origin === 'OWNED_STUDIO_TRANSFER' ? 'INTERNAL' : 'LEGACY_PAID',
            settledAtAbsoluteWeek: license.signedAtAbsoluteWeek,
            legacySource: 'OWNED_PLATFORM_LICENSE',
        }));
        registry = result.registry;
    });
    Object.entries(player.world.platforms || {})
        .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
        .forEach(([platformId, platform]) => {
            (platform.ai?.rightsContracts || []).forEach(license => {
                const buyer: StreamingRightsContractParty = {
                    type: 'AI_PLATFORM',
                    id: platformId,
                    name: platform.name,
                    platformId: platform.id,
                };
                const result = registerStreamingRightsContract(registry, createStreamingRightsContractFromLicense({
                    license,
                    buyer,
                    guaranteeDisposition: 'LEGACY_PAID',
                    settledAtAbsoluteWeek: license.signedAtAbsoluteWeek,
                    legacySource: 'PLATFORM_AI_LICENSE',
                }));
                registry = result.registry;
            });
        });
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const activeReleases = (player.activeReleases || []).map(release => {
        if (release.distributionPhase !== 'STREAMING' || !release.streaming?.platformId) return release;
        const referencedContractId = cleanText(release.streamingContractId || release.streaming.contractId, '', 180);
        if (referencedContractId && registry[referencedContractId]) {
            if (release.streamingContractId === referencedContractId && release.streaming.contractId === referencedContractId) return release;
            return {
                ...release,
                streamingContractId: referencedContractId,
                streaming: { ...release.streaming, contractId: referencedContractId },
            };
        }
        const elapsedWeeks = Math.max(1, finiteWeek(release.streaming.weekOnPlatform, 1));
        const startsAtAbsoluteWeek = finiteWeek(
            release.streaming.startWeekAbsolute,
            finiteWeek(release.releasedAtAbsoluteWeek, Math.max(0, currentAbsoluteWeek - (elapsedWeeks - 1))),
        );
        const contractId = createDeterministicId(
            'streaming_contract',
            release.id,
            release.streaming.platformId,
            startsAtAbsoluteWeek,
        );
        const platform = player.world.platforms?.[release.streaming.platformId];
        const studioId = cleanText(release.projectDetails?.studioId, 'unknown-studio', 180);
        const playerStudio = (player.businesses || []).find(business => business.id === studioId);
        const seller: StreamingRightsContractParty = {
            type: playerStudio ? 'PLAYER_STUDIO' : 'NPC_STUDIO',
            id: studioId,
            name: playerStudio?.name || studioId,
            platformId: null,
        };
        const buyer: StreamingRightsContractParty = {
            type: 'AI_PLATFORM',
            id: release.streaming.platformId,
            name: platform?.name || release.streaming.platformId,
            platformId: release.streaming.platformId,
        };
        const licensorRevenueShare = clampPercent(release.studioRoyaltyPercentage, 0);
        const license = createStreamingLicenseContract({
            id: contractId,
            sourceProject: {
                id: release.id,
                title: release.name,
                mediaType: release.type === 'SERIES' ? 'SERIES' : 'MOVIE',
                genre: release.projectDetails?.genre,
            },
            buyerPlatformId: release.streaming.platformId,
            platformContentPlanId: null,
            cataloguePackageId: null,
            licensorName: seller.name,
            territory: 'GLOBAL',
            countryIds: [],
            durationWeeks: 52,
            exclusivity: 'EXCLUSIVE',
            minimumGuarantee: finiteMoney(
                release.streamingUpfrontFee ?? release.projectDetails?.streamingRevenue ?? release.streamingRevenue,
            ),
            platformRevenueShare: 100 - licensorRevenueShare,
            signedAtAbsoluteWeek: startsAtAbsoluteWeek,
            startsAtAbsoluteWeek,
            status: 'ACTIVE',
            origin: 'STUDIO_MARKET',
            sellerType: 'STUDIO',
            sellerPlatformId: null,
            windowType: 'FIRST_WINDOW',
            permanentPurchase: false,
            renewalOption: false,
            sublicensingAllowed: false,
            sequelRightsIncluded: false,
            changeOfControl: 'NOTICE',
        });
        const result = registerStreamingRightsContract(registry, createStreamingRightsContractFromLicense({
            license,
            seller,
            buyer,
            guaranteeDisposition: 'LEGACY_PAID',
            settledAtAbsoluteWeek: startsAtAbsoluteWeek,
            legacySource: 'PRODUCTION_RELEASE',
            productionFunding: finiteMoney(release.streamingFundingAmount ?? release.platformProductionFunding),
        }));
        registry = result.registry;
        const canonicalId = result.contract?.id || contractId;
        return {
            ...release,
            streamingContractId: canonicalId,
            streaming: { ...release.streaming, contractId: canonicalId },
        };
    });
    return {
        ...player,
        activeReleases,
        world: { ...player.world, streamingRightsContracts: registry },
    };
};

export const fullCurrencyToMillions = (amount: number): number => (
    Math.round((Math.max(0, amount) / FULL_CURRENCY_PER_MILLION) * 1_000_000) / 1_000_000
);

export const millionsToFullCurrency = (millions: number): number => (
    Math.round(Math.max(0, millions) * FULL_CURRENCY_PER_MILLION)
);

export interface StreamingLicenseContractInput {
    id: string;
    sourceProject: { id: string; title: string; mediaType?: 'MOVIE' | 'SERIES'; genre?: string };
    buyerPlatformId: PlatformId | null;
    platformContentPlanId: string | null;
    cataloguePackageId: string | null;
    contentSource?: PlatformAiContentSource;
    licensorName: string;
    territory: StreamingLicenseTerritory;
    countryIds?: string[];
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    minimumGuarantee: number;
    platformRevenueShare: number;
    signedAtAbsoluteWeek: number;
    startsAtAbsoluteWeek: number;
    status?: StreamingCatalogLicenseStatus;
    origin: NonNullable<OwnedStreamingCatalogLicense['origin']>;
    sellerType: StreamingRightsSellerType;
    sellerPlatformId: PlatformId | null;
    windowType: StreamingRightsWindowType;
    permanentPurchase?: boolean;
    marketingGuarantee?: number;
    viewershipBonusThreshold?: number;
    viewershipBonusAmount?: number;
    renewalOption?: boolean;
    sublicensingAllowed?: boolean;
    sequelRightsIncluded?: boolean;
    changeOfControl?: StreamingRightsChangeOfControl;
    cancellationPenalty?: number;
    renewedFromLicenseId?: string | null;
}

export const createStreamingLicenseContract = (
    input: StreamingLicenseContractInput,
): OwnedStreamingCatalogLicense => {
    const permanentPurchase = input.permanentPurchase ?? input.windowType === 'PERMANENT';
    return {
        id: input.id,
        sourceProjectId: input.sourceProject.id,
        titleAtSigning: input.sourceProject.title,
        projectType: input.sourceProject.mediaType === 'SERIES' ? 'SERIES' : 'MOVIE',
        genre: input.sourceProject.genre,
        licensorName: input.licensorName,
        territory: input.territory,
        countryIds: input.countryIds ? [...input.countryIds] : [],
        durationWeeks: input.durationWeeks,
        exclusivity: input.exclusivity,
        minimumGuarantee: Math.max(0, Math.round(input.minimumGuarantee)),
        platformRevenueShare: input.platformRevenueShare,
        licensorRevenueShare: 100 - input.platformRevenueShare,
        signedAtAbsoluteWeek: input.signedAtAbsoluteWeek,
        startsAtAbsoluteWeek: input.startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: permanentPurchase
            ? Number.MAX_SAFE_INTEGER
            : input.startsAtAbsoluteWeek + input.durationWeeks,
        status: input.status ?? 'ACTIVE',
        origin: input.origin,
        buyerPlatformId: input.buyerPlatformId,
        platformContentPlanId: input.platformContentPlanId,
        cataloguePackageId: input.cataloguePackageId,
        contentSource: input.contentSource,
        sellerType: input.sellerType,
        sellerPlatformId: input.sellerPlatformId,
        windowType: input.windowType,
        permanentPurchase,
        marketingGuarantee: input.marketingGuarantee,
        viewershipBonusThreshold: input.viewershipBonusThreshold,
        viewershipBonusAmount: input.viewershipBonusAmount,
        renewalOption: input.renewalOption,
        sublicensingAllowed: input.sublicensingAllowed,
        sequelRightsIncluded: input.sequelRightsIncluded,
        changeOfControl: input.changeOfControl,
        cancellationPenalty: input.cancellationPenalty,
        renewedFromLicenseId: input.renewedFromLicenseId,
    };
};

export interface ProductionStreamingRightsContractInput {
    sourceProjectId: string;
    title: string;
    projectType: 'MOVIE' | 'SERIES';
    genre?: string;
    sellerStudioId: string;
    sellerStudioName: string;
    sellerPartyType?: 'PLAYER_STUDIO' | 'NPC_STUDIO';
    buyerPlatformId: PlatformId;
    minimumGuarantee: number;
    platformRevenueShare: number;
    productionFunding?: number;
    futureSeasonFunding?: number;
    guaranteeRecoupment?: StreamingGuaranteeRecoupment;
    backendCap?: number | null;
    territory?: StreamingLicenseTerritory;
    countryIds?: string[];
    exclusivity?: StreamingLicenseExclusivity;
    localization?: StreamingRightsLocalizationTerms;
    localizationRequirements?: StreamingLocalizationPromise[];
    renewalOption?: boolean;
    signedAtAbsoluteWeek: number;
    startsAtAbsoluteWeek: number;
    durationWeeks?: number;
}

/**
 * Records a Production House deal after its existing signing route has already
 * settled cash. This function is intentionally accounting-neutral.
 */
export const registerProductionStreamingRightsContract = (
    player: Player,
    input: ProductionStreamingRightsContractInput,
): { player: Player; contract: StreamingRightsContract | null; changed: boolean } => {
    const signedAtAbsoluteWeek = finiteWeek(input.signedAtAbsoluteWeek);
    const startsAtAbsoluteWeek = Math.max(signedAtAbsoluteWeek, finiteWeek(input.startsAtAbsoluteWeek, signedAtAbsoluteWeek));
    const durationWeeks = Math.max(1, finiteWeek(input.durationWeeks, 52));
    const contractId = createDeterministicId(
        'streaming_contract',
        input.sourceProjectId,
        input.buyerPlatformId,
        startsAtAbsoluteWeek,
    );
    const platform = player.world.platforms?.[input.buyerPlatformId];
    const playerOwnsSeller = (player.businesses || []).some(business => business.id === input.sellerStudioId);
    const seller: StreamingRightsContractParty = {
        type: input.sellerPartyType || (playerOwnsSeller ? 'PLAYER_STUDIO' : 'NPC_STUDIO'),
        id: input.sellerStudioId,
        name: input.sellerStudioName,
        platformId: null,
    };
    const buyer: StreamingRightsContractParty = {
        type: 'AI_PLATFORM',
        id: input.buyerPlatformId,
        name: platform?.name || input.buyerPlatformId,
        platformId: input.buyerPlatformId,
    };
    const license = createStreamingLicenseContract({
        id: contractId,
        sourceProject: {
            id: input.sourceProjectId,
            title: input.title,
            mediaType: input.projectType,
            genre: input.genre,
        },
        buyerPlatformId: input.buyerPlatformId,
        platformContentPlanId: null,
        cataloguePackageId: null,
        licensorName: input.sellerStudioName,
        territory: input.territory || 'GLOBAL',
        countryIds: input.countryIds || [],
        durationWeeks,
        exclusivity: input.exclusivity || 'EXCLUSIVE',
        minimumGuarantee: input.minimumGuarantee,
        platformRevenueShare: input.platformRevenueShare,
        signedAtAbsoluteWeek,
        startsAtAbsoluteWeek,
        status: 'ACTIVE',
        origin: 'STUDIO_MARKET',
        sellerType: 'STUDIO',
        sellerPlatformId: null,
        windowType: 'FIRST_WINDOW',
        permanentPurchase: false,
        renewalOption: input.renewalOption || false,
        sublicensingAllowed: false,
        sequelRightsIncluded: false,
        changeOfControl: 'NOTICE',
    });
    const registration = registerStreamingRightsContract(
        player.world.streamingRightsContracts,
        createStreamingRightsContractFromLicense({
            license,
            seller,
            buyer,
            guaranteeDisposition: 'PAID',
            settledAtAbsoluteWeek: signedAtAbsoluteWeek,
            productionFunding: input.productionFunding,
            futureSeasonFunding: input.futureSeasonFunding,
            localization: input.localization,
            localizationRequirements: input.localizationRequirements,
            guaranteeRecoupment: input.guaranteeRecoupment,
            backendCap: input.backendCap,
        }),
    );
    const canonicalId = registration.contract?.id || contractId;
    let referenceChanged = false;
    const activeReleases = (player.activeReleases || []).map(release => {
        if (release.id !== input.sourceProjectId) return release;
        const streamingAlreadyReferencesContract = !release.streaming || release.streaming.contractId === canonicalId;
        if (release.streamingContractId === canonicalId && streamingAlreadyReferencesContract) return release;
        const streaming = release.streaming
            ? { ...release.streaming, contractId: canonicalId }
            : release.streaming;
        referenceChanged = true;
        return { ...release, streamingContractId: canonicalId, streaming };
    });
    if (!registration.changed && !referenceChanged) {
        return { player, contract: registration.contract, changed: false };
    }
    return {
        player: {
            ...player,
            activeReleases,
            world: { ...player.world, streamingRightsContracts: registration.registry },
        },
        contract: registration.contract,
        changed: true,
    };
};

export interface ProductionStreamingRightsContractFromOfferInput {
    session: StreamingBiddingSession;
    offer: StreamingOfferVersion;
    signedAtAbsoluteWeek: number;
    startsAtAbsoluteWeek: number;
}

export const registerProductionStreamingRightsContractFromOffer = (
    player: Player,
    input: ProductionStreamingRightsContractFromOfferInput,
): { player: Player; contract: StreamingRightsContract | null; changed: boolean } => {
    if (
        input.session.status !== 'ACCEPTED'
        || input.session.acceptedOfferId !== input.offer.id
        || input.offer.sessionId !== input.session.id
        || input.offer.status !== 'ACTIVE' && input.offer.status !== 'FINAL' && input.offer.status !== 'ACCEPTED'
    ) return { player, contract: null, changed: false };
    const result = registerProductionStreamingRightsContract(player, {
        sourceProjectId: input.session.projectId,
        title: input.session.title,
        projectType: input.session.projectType,
        genre: input.session.genre,
        sellerStudioId: input.session.sellerStudioId,
        sellerStudioName: input.session.sellerStudioName,
        sellerPartyType: 'PLAYER_STUDIO',
        buyerPlatformId: input.offer.platformId,
        minimumGuarantee: input.offer.minimumGuarantee,
        platformRevenueShare: input.offer.platformRevenueShare,
        productionFunding: input.offer.productionFunding,
        futureSeasonFunding: input.offer.futureSeasonFunding,
        guaranteeRecoupment: input.offer.guaranteeRecoupment,
        backendCap: input.offer.backendCap,
        territory: input.offer.territory,
        exclusivity: input.offer.exclusivity,
        localization: input.offer.localization,
        localizationRequirements: input.offer.localizationRequirements,
        renewalOption: input.offer.renewalOption,
        signedAtAbsoluteWeek: input.signedAtAbsoluteWeek,
        startsAtAbsoluteWeek: input.startsAtAbsoluteWeek,
        durationWeeks: input.offer.durationWeeks,
    });
    if (!result.contract) return result;
    const contract = normalizeStreamingRightsContract({
        ...result.contract,
        idempotencyKey: `streaming-offer:${input.offer.id}`,
        biddingSessionId: input.session.id,
        sourceOfferId: input.offer.id,
    })!;
    const registry = {
        ...result.player.world.streamingRightsContracts,
        [contract.id]: contract,
    };
    return {
        ...result,
        contract,
        player: {
            ...result.player,
            world: { ...result.player.world, streamingRightsContracts: registry },
        },
    };
};

/** Actor-neutral contract clock used by both player and rival platform release flows. */
export const isStreamingLicenseActiveAt = (
    contract: Pick<OwnedStreamingCatalogLicense, 'status' | 'startsAtAbsoluteWeek' | 'expiresAtAbsoluteWeek'>,
    absoluteWeek: number,
): boolean => (
    contract.status === 'ACTIVE'
    && contract.startsAtAbsoluteWeek <= absoluteWeek
    && contract.expiresAtAbsoluteWeek >= absoluteWeek
);

/** GLOBAL covers every market; bounded territories require their immutable country snapshot. */
export const doesStreamingLicenseCoverCountry = (
    contract: OwnedStreamingCatalogLicense,
    countryId: string,
): boolean => (
    contract.territory === 'GLOBAL'
    || (contract.countryIds || []).includes(countryId)
);

export interface StreamingRightsAvailabilityInput {
    player: Player;
    world: WorldState;
    sourceProjectId: string;
    buyerPlatformId: PlatformId | null;
    exclusivity: StreamingLicenseExclusivity;
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    excludeLicenseIds?: string[];
}

export interface StreamingRightsAvailabilityResult {
    available: boolean;
    conflictLicenseIds: string[];
}

const windowsOverlap = (
    leftStart: number,
    leftEnd: number,
    rightStart: number,
    rightEnd: number,
): boolean => leftStart <= rightEnd && rightStart <= leftEnd;

export const validateStreamingRightsAvailability = (
    input: StreamingRightsAvailabilityInput,
): StreamingRightsAvailabilityResult => {
    const excluded = new Set(input.excludeLicenseIds || []);
    const playerContracts = input.player.ownedStreamingPlatform?.catalogLicenses || [];
    const aiContracts = Object.values(input.world.platforms || {}).flatMap(platform => (
        platform.ai?.rightsContracts || []
    ));
    const conflictLicenseIds = [...playerContracts, ...aiContracts]
        .filter(contract => (
            !excluded.has(contract.id)
            && contract.status === 'ACTIVE'
            && contract.sourceProjectId === input.sourceProjectId
            && windowsOverlap(
                input.startsAtAbsoluteWeek,
                input.expiresAtAbsoluteWeek,
                contract.startsAtAbsoluteWeek,
                contract.expiresAtAbsoluteWeek,
            )
            && (input.exclusivity === 'EXCLUSIVE' || contract.exclusivity === 'EXCLUSIVE')
        ))
        .map(contract => contract.id)
        .sort();

    return { available: conflictLicenseIds.length === 0, conflictLicenseIds };
};
