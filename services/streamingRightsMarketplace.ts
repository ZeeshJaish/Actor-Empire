import {resolveStreamingOriginalRightsSellerId, allocatePrivateCollectionMoney, collectionOpportunityForNegotiation, collectionPrivateDefaults, createCollectionNegotiationSnapshot, validateCollectionPrivateTerms, validatePrivateTermsNumbers} from './streamingCollectionPrivateOffers';
import {getStreamingBuyerBackendCapability, streamingBackendPercentForBuyer, validateNewStreamingBackendTerms, minimumStreamingLicenseFee} from './streamingBackendPolicy';
import { getOwnedPlatformPackageCountryIds } from './streamingContentAvailability';
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
    StreamingRightsAccessGrant,
    StreamingTitleAccessMode,
} from '../types';
import { STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import {
    getStreamingLicenseCandidatePool,
    getStreamingLicenseOpportunities,
    getStreamingLicenseQuote,
    getActiveStreamingQuoteVersion,
    type StreamingCatalogTitle,
} from './streamingCatalog';
import {
    getStreamingMarketCycle,
    getStreamingMarketDiscovery,
    getStreamingMarketSupplyProfile,
    selectStreamingMarketTitles,
} from './streamingMarketSupply';
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
import {
    settleStreamingRightsSublicense,
    settleStreamingRightsTransfer,
} from './streamingRightsTransactions';
import { createStreamingRightsAccessGrantForOffer, intersectStreamingRightsAccessGrants, normalizeStreamingRightsAccessGrant } from './streamingRightsAccessGrant';
import { getContentMarketCollections, getContentMarketListings, isContentMarketAuctionCollection, isContentMarketAuctionListing } from './streamingContentMarket';

export type StreamingRightsOpportunityKind = 'STUDIO_ACQUISITION' | 'PLATFORM_TRADE' | 'SUBLICENSE_OUT' | 'TRANSFER_OUT';

export interface StreamingRightsOpportunity {
    id: string;
    kind: StreamingRightsOpportunityKind;
    title: StreamingCatalogTitle;
    sellerType: 'STUDIO' | 'PLATFORM';
    sellerId: string;
    sellerName: string;
    sellerPlatformId: string | null;
    sourceLicenseId: string | null;
    recommendedTerritory: StreamingLicenseTerritory;
    recommendedWindow: StreamingRightsWindowType;
    quote: ReturnType<typeof getStreamingLicenseQuote>;
    rivalPlatformId: PlatformId;
    rivalPlatformName: string;
    rivalBidAmount: number;
    marketHeat: 'COOL' | 'ACTIVE' | 'HOT';
    originalOwnerName: string;
    currentHolderName: string;
    countryIds: string[];
    remainingWeeks: number;
    inheritedExclusivity: StreamingLicenseExclusivity;
    inheritedLicensorRevenueShare: number;
    inheritedObligationCount: number;
    incompatibilityDetail: string | null;
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
    /** Optional exact market subset for Content Market private proposals. */
    countryIds?: string[];
    accessGrant?: StreamingRightsAccessGrant;
}

export interface StreamingRightsActionResult {
    player: Player;
    changed: boolean;
    reason?: 'NOT_ACTIVE' | 'NOT_FOUND' | 'ALREADY_OPEN' | 'NOT_READY' | 'INSUFFICIENT_TREASURY' | 'INVALID_TERMS' | 'RIGHTS_UNAVAILABLE' | 'RIGHTS_RESTRICTED';
    detail?: string;
    negotiation?: OwnedStreamingRightsNegotiation;
}

const privateOfferResponseMessage = (
    negotiation: OwnedStreamingRightsNegotiation,
    absoluteWeek: number,
): Player['inbox'][number] => {
    const accepted = negotiation.responseStatus === 'SELLER_ACCEPTED';
    const countered = negotiation.responseStatus === 'SELLER_COUNTERED';
    const subject = accepted
        ? `${negotiation.sellerName} accepts your offer`
        : countered
            ? `${negotiation.sellerName} sent revised terms`
            : negotiation.responseStatus === 'RIGHTS_SOLD'
                ? `${negotiation.title} is no longer available`
                : `${negotiation.sellerName} declined your offer`;
    return {
        id: negotiation.responseMessageId || createDeterministicId(
            'streaming_private_offer_message',
            negotiation.id,
            String(negotiation.proposalVersion || 1),
        ),
        sender: `${negotiation.sellerName} · Business Affairs`,
        subject,
        text: negotiation.responseReason || 'The rights holder has replied to your private offer.',
        type: 'RIGHTS_NEGOTIATION',
        data: {
            streamingPrivateOfferId: negotiation.id,
            negotiation: {
                opportunityId: negotiation.id,
                status: accepted ? 'READY_TO_SIGN' : countered ? 'COUNTERED' : 'DECLINED',
                round: negotiation.proposalVersion || 1,
                currentOffer: negotiation.minimumGuarantee,
                counterAmount: negotiation.counterMinimumGuarantee,
                agreedAmount: accepted ? negotiation.minimumGuarantee : null,
                responseSummary: negotiation.responseReason,
                signByAbsoluteWeek: negotiation.signingDeadlineAbsoluteWeek,
            },
        },
        isRead: false,
        weekSent: (absoluteWeek % 52) + 1,
    };
};

/** Resolves only saved CM2 proposals whose persisted due week has arrived. */
export const processStreamingPrivateOffersWeek = (
    player: Player,
    absoluteWeek: number = getAbsoluteWeek(player.age, player.currentWeek),
): { player: Player; resolvedOfferIds: string[] } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const resolvedOfferIds: string[] = [];
    const messages = [...(player.inbox || [])];
    let changed = false;
    const rightsNegotiations = platform.rightsNegotiations.map(current => {
        if (
            ['SELLER_ACCEPTED', 'SELLER_COUNTERED'].includes(current.responseStatus || '')
            && current.signingDeadlineAbsoluteWeek != null
            && absoluteWeek > current.signingDeadlineAbsoluteWeek
            && ['READY_TO_SIGN', 'COUNTERED'].includes(current.status)
        ) {
            changed = true;
            return {
                ...current,
                status: 'EXPIRED' as const,
                responseStatus: 'EXPIRED' as const,
                responseReason: 'The signing window closed before the agreement was completed.',
                updatedAtAbsoluteWeek: absoluteWeek,
            };
        }
        if (
            current.responseStatus !== 'AWAITING_RESPONSE'
            || current.responseDueAbsoluteWeek == null
            || current.responseDueAbsoluteWeek > absoluteWeek
            || current.processedProposalVersion === current.proposalVersion
        ) return current;

        const privateSource=current.sourceLicenseId ? getStreamingRightsContract(player.world.streamingRightsContracts,current.sourceLicenseId) : null;
        const sourceError = validateCurrentOriginalPrivateSource(player, current) || (current.sourceLicenseId
            ? !privateSource ? 'The source grant is no longer available.'
                : validatePrivateScope(player,platform,current,privateSource,current.rivalBidAmount,current.buyerPlatformId,current.createdAtAbsoluteWeek)
            : null);
        const startsAtAbsoluteWeek = absoluteWeek;
        const expiresAtAbsoluteWeek = privateSource ? privateSource.expiresAtAbsoluteWeek : current.windowType === 'PERMANENT'
            ? Number.MAX_SAFE_INTEGER
            : startsAtAbsoluteWeek + current.durationWeeks;
        const collectionError = current.collectionSnapshot ? validateCollectionPrivateTerms(player,current.collectionSnapshot,current,absoluteWeek) : null;
        const compatibility = current.collectionSnapshot ? {available:!collectionError} : validateStreamingRightsAvailability({
            player,
            world: player.world,
            sourceProjectId: current.sourceProjectId,
            buyerPlatformId: null,
            sellerPartyId: current.sellerId,
            territory: current.territory,
            countryIds: current.territory === 'GLOBAL' ? [] : current.countryIds,
            windowType: current.windowType,
            exclusivity: current.exclusivity,
            startsAtAbsoluteWeek,
            expiresAtAbsoluteWeek,
            action: 'LICENSE',
            sourceContractId: null,
            excludeLicenseIds: current.sourceLicenseId ? [current.sourceLicenseId] : [],
        });

        let status: OwnedStreamingRightsNegotiation['status'];
        let responseStatus: NonNullable<OwnedStreamingRightsNegotiation['responseStatus']>;
        let responseReason: string;
        let counterMinimumGuarantee: number | null = null;
        let counterPlatformRevenueShare: number | null = null;
        let signingDeadlineAbsoluteWeek: number | null = null;
        const immutableTransfer = (current.kind==='ACQUIRE' && current.sellerType==='PLATFORM' || current.kind==='TRANSFER_OUT')
            && !!current.sourceLicenseId && !!player.world.streamingRightsContracts?.[current.sourceLicenseId];
        const invalidBackend=immutableTransfer ? null : validateNewStreamingBackendTerms({minimumGuarantee:current.minimumGuarantee,licensorRevenueShare:100-current.platformRevenueShare,
            referenceFee:current.rivalBidAmount,capability:getStreamingBuyerBackendCapability(player,null,absoluteWeek,current.countryIds || [],current.accessGrant),permanentPurchase:current.windowType==='PERMANENT'});
        if (!compatibility.available || sourceError) {
            status = 'LOST';
            responseStatus = 'RIGHTS_SOLD';
            responseReason = `The available ${current.territory === 'GLOBAL' ? 'worldwide' : 'market'} rights changed while your offer was under review. No money was charged.`;
        } else if (invalidBackend || current.marketingGuarantee > 0 || !immutableTransfer && current.viewershipBonusAmount > 0) {
            status='LOST';responseStatus='SELLER_DECLINED';
            responseReason=invalidBackend || 'New licensing terms use one ads and rental backend, without a separate success bonus.';
        } else {
            const referencePrice = Math.max(1, current.rivalBidAmount);
            const relationshipWins = platform.rightsNegotiations.filter(item => (
                item.id !== current.id && item.sellerId === current.sellerId && item.status === 'SIGNED'
            )).length;
            const rng = createDeterministicRng(`${platform.simulationSeed}:private-offer-outcome:${current.id}:${current.proposalVersion}`);
            const cashScore = current.minimumGuarantee / referencePrice;
            const sellerShare = 100 - current.platformRevenueShare;
            const economics = cashScore * 0.69
                + getStreamingBuyerBackendCapability(player,null,absoluteWeek,current.countryIds || [],current.accessGrant).eligibleRevenueFraction * sellerShare / 100 * 0.13;
            const clauses = (current.exclusivity === 'NON_EXCLUSIVE' ? 0.035 : -0.025)
                + (current.renewalOption ? -0.015 : 0.02)
                + (current.sublicensingAllowed ? -0.025 : 0.015)
                + (current.sequelRightsIncluded ? -0.03 : 0.015)
                + (current.changeOfControl === 'CONSENT_REQUIRED' ? 0.025 : current.changeOfControl === 'NOTICE' ? 0.01 : -0.01)
                + Math.min(0.05, relationshipWins * 0.015);
            const heatThreshold = current.marketHeat === 'HOT' ? 0.98 : current.marketHeat === 'ACTIVE' ? 0.91 : 0.84;
            const score = economics + clauses + (rng() - 0.5) * 0.06;
            const matchesAdvertisedTerms = Boolean(current.advertisedTermsSignature)
                && current.advertisedTermsSignature === privateOfferTermsSignature(platform, current);
            if (matchesAdvertisedTerms || score >= heatThreshold) {
                status = 'READY_TO_SIGN';
                responseStatus = 'SELLER_ACCEPTED';
                signingDeadlineAbsoluteWeek = absoluteWeek + 3;
                responseReason = `${current.sellerName} accepted the complete term sheet. You have three processed weeks to sign; the rights remain available until signature.`;
            } else if (score >= heatThreshold - 0.23) {
                status = 'COUNTERED';
                responseStatus = 'SELLER_COUNTERED';
                counterMinimumGuarantee = roundMoney(Math.max(current.minimumGuarantee * 1.08, referencePrice * (current.marketHeat === 'HOT' ? 0.96 : 0.9)));
                counterPlatformRevenueShare = immutableTransfer ? current.platformRevenueShare : 100-streamingBackendPercentForBuyer(player,null,absoluteWeek,Math.min(20,103-current.platformRevenueShare),current.countryIds || [],current.accessGrant);
                signingDeadlineAbsoluteWeek = absoluteWeek + 3;
                responseReason = `${current.sellerName} wants ${counterMinimumGuarantee.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} upfront and a ${100 - counterPlatformRevenueShare}% rights-holder share. The revision is open for three processed weeks.`;
            } else {
                status = 'LOST';
                responseStatus = 'SELLER_DECLINED';
                responseReason = current.marketHeat === 'HOT'
                    ? 'The offer did not match the value or competitive interest around these rights. No money was charged.'
                    : 'The rights holder could not support the proposed economics and closed this round. No money was charged.';
            }
        }
        const responseMessageId = createDeterministicId('streaming_private_offer_message', current.id, String(current.proposalVersion || 1));
        const negotiation: OwnedStreamingRightsNegotiation = {
            ...current,
            status,
            round: Math.max(current.round, current.proposalVersion || 1),
            counterMinimumGuarantee,
            counterPlatformRevenueShare,
            responseStatus,
            responseReason,
            respondedAtAbsoluteWeek: absoluteWeek,
            processedProposalVersion: current.proposalVersion || 1,
            signingDeadlineAbsoluteWeek,
            responseMessageId,
            updatedAtAbsoluteWeek: absoluteWeek,
            expiresAtAbsoluteWeek: signingDeadlineAbsoluteWeek || absoluteWeek,
        };
        if (!messages.some(message => message.id === responseMessageId)) {
            messages.push(privateOfferResponseMessage(negotiation, absoluteWeek));
        }
        changed = true;
        resolvedOfferIds.push(current.id);
        return negotiation;
    });
    if (!changed) return { player, resolvedOfferIds };
    return {
        player: {
            ...player,
            inbox: messages,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations,
            }, player.id),
        },
        resolvedOfferIds,
    };
};

const ACTIVE_NEGOTIATION_STATUSES = new Set(['OPEN', 'COUNTERED', 'READY_TO_SIGN']);
const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 250_000) * 250_000);

const chooseRival = (
    seed: string,
    opportunityId: string,
    absoluteWeek: number,
    excludedPlatformId: PlatformId | null,
): { id: PlatformId; name: string; pressure: number } => {
    const rng = createDeterministicRng(`${seed}:rights-rival:${opportunityId}:${getStreamingMarketCycle(absoluteWeek)}`);
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
    sellerPlatformId: string | null,
    kind: StreamingRightsOpportunityKind,
    sourceLicenseId: string | null = null,
    sourceContract: StreamingRightsContract | null = null,
): StreamingRightsOpportunity => {
    const recommendedTerritory: StreamingLicenseTerritory = sourceContract?.territory
        || (title.rating && title.rating >= 8 ? 'GLOBAL' : 'MULTI_REGION');
    const recommendedWindow: StreamingRightsWindowType = sourceContract?.windowType
        || (sellerType === 'PLATFORM' ? 'SECOND_WINDOW' : 'FIRST_WINDOW');
    const remainingWeeks = sourceContract
        ? Math.max(1, sourceContract.expiresAtAbsoluteWeek - absoluteWeek)
        : kind === 'SUBLICENSE_OUT' ? 52 : 104;
    const quoteVersion = getActiveStreamingQuoteVersion(platform.marketQuotePolicy, absoluteWeek);
    const quote = getStreamingLicenseQuote(title, recommendedTerritory, Math.min(520, remainingWeeks),
        sourceContract?.exclusivity || 'NON_EXCLUSIVE', quoteVersion, recommendedWindow,
        Math.floor(absoluteWeek / 52) + 1);
    const excludedLegacyPlatform = sellerPlatformId && PLATFORM_IDS.includes(sellerPlatformId as PlatformId)
        ? sellerPlatformId as PlatformId
        : null;
    const rival = chooseRival(platform.simulationSeed, `${kind}:${title.id}`, absoluteWeek, excludedLegacyPlatform);
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
        originalOwnerName: sourceContract?.seller.name || sellerName,
        currentHolderName: sourceContract?.buyer.name || sellerName,
        countryIds: sourceContract?.countryIds?.slice().sort() || [],
        remainingWeeks,
        inheritedExclusivity: sourceContract?.exclusivity || 'NON_EXCLUSIVE',
        inheritedLicensorRevenueShare: sourceContract?.licensorRevenueShare || 0,
        inheritedObligationCount: sourceContract
            ? Number((sourceContract.marketingGuarantee || 0) > 0) + Number((sourceContract.viewershipBonusThreshold || 0) > 0)
            : 0,
        incompatibilityDetail: null,
    };
};

export const getStreamingRightsOpportunities = (player: Player, includeLiveAuctionReferences = false): StreamingRightsOpportunity[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!['FOUNDING', 'ACTIVE'].includes(platform.lifecycle)) return [];
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platformTitles = new Map(
        (player.pastProjects || [])
            .filter(project => Boolean(project.streamingPlatform))
            .map(project => [project.id, project]),
    );
    const inbound = getStreamingLicenseOpportunities(player, includeLiveAuctionReferences).map(title => {
        const tradedTitle = platformTitles.get(title.id);
        const sellerPlatformId = tradedTitle?.streamingPlatform || null;
        if (sellerPlatformId) return null;
        return buildOpportunity(
            platform,
            title,
            absoluteWeek,
            sellerPlatformId ? 'PLATFORM' : 'STUDIO',
            sellerPlatformId || title.studioId,
            sellerPlatformId ? PLATFORMS[sellerPlatformId].name : title.studioName,
            sellerPlatformId,
            'STUDIO_ACQUISITION',
        );
    }).filter((opportunity): opportunity is StreamingRightsOpportunity => Boolean(opportunity));

    const canonicalRegistry = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const canonicalPlatformTrades = Object.values(canonicalRegistry)
        .filter(contract => (
            contract.status === 'ACTIVE'
            && contract.expiresAtAbsoluteWeek >= absoluteWeek
            && !contract.permanentPurchase
            && contract.buyer.type === 'AI_PLATFORM'
            && Boolean(contract.buyer.platformId)
        ))
        .map(contract => {
            const project = player.world.projects.find(item => item.id === contract.sourceProjectId);
            const pastProject = (player.pastProjects || []).find(item => item.id === contract.sourceProjectId);
            const root = canonicalRegistry[contract.rootContractId] || contract;
            const opportunity = buildOpportunity(
                platform,
                {
                    id: contract.sourceProjectId,
                    title: contract.titleAtSigning,
                    projectType: contract.projectType || 'MOVIE',
                    genre: contract.genre || 'Licensed',
                    rating: Number((project as any)?.rating || (pastProject as any)?.imdbRating || (pastProject as any)?.rating) || null,
                    releaseYear: Number((project as any)?.year) || null,
                    gross: Number((project as any)?.boxOffice || (pastProject as any)?.gross || contract.minimumGuarantee * 5),
                    studioId: root.seller.id,
                    studioName: root.seller.name,
                    source: 'EXTERNAL_MARKET',
                },
                absoluteWeek,
                'PLATFORM',
                contract.buyer.id,
                contract.buyer.name,
                contract.buyer.platformId,
                'PLATFORM_TRADE',
                contract.id,
                contract,
            );
            const compatibility = resolveStreamingRightsCompatibility({
                world: player.world,
                sourceProjectId: contract.sourceProjectId,
                buyerPlatformId: null,
                sellerPartyId: contract.buyer.id,
                territory: contract.territory,
                countryIds: contract.countryIds,
                startsAtAbsoluteWeek: Math.max(absoluteWeek, contract.startsAtAbsoluteWeek),
                expiresAtAbsoluteWeek: contract.expiresAtAbsoluteWeek,
                windowType: contract.windowType,
                exclusivity: contract.exclusivity,
                action: 'LICENSE',
                excludeContractIds: [contract.id],
            });
            return {
                ...opportunity,
                originalOwnerName: root.seller.name,
                incompatibilityDetail: compatibility.available ? null : compatibility.summary,
            };
        });

    const activeLicenses = platform.catalogLicenses
        .filter(license => license.status === 'ACTIVE' && license.expiresAtAbsoluteWeek >= absoluteWeek);
    const licensedOutbound = activeLicenses.flatMap(license => {
        const canonical = canonicalRegistry[license.id] || null;
        const shared = buildOpportunity(
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
        canonical,
        );
        const transfer = buildOpportunity(
            platform,
            shared.title,
            absoluteWeek,
            'PLATFORM',
            platform.identity?.slug || 'owned-platform',
            platform.identity?.name || 'Your platform',
            null,
            'TRANSFER_OUT',
            license.id,
            canonical,
        );
        return license.sublicensingAllowed ? [shared, transfer] : [transfer];
    });
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
    return [...inbound, ...canonicalPlatformTrades, ...licensedOutbound, ...originalOutbound]
        .filter(opportunity => !platform.rightsNegotiations.some(negotiation => (
            ACTIVE_NEGOTIATION_STATUSES.has(negotiation.status)
            && negotiation.sourceProjectId === opportunity.title.id
            && negotiation.sourceLicenseId === opportunity.sourceLicenseId
            && (
                (['STUDIO_ACQUISITION', 'PLATFORM_TRADE'].includes(opportunity.kind) && negotiation.kind === 'ACQUIRE')
                || (opportunity.kind === 'SUBLICENSE_OUT' && negotiation.kind === 'SUBLICENSE_OUT')
                || (opportunity.kind === 'TRANSFER_OUT' && negotiation.kind === 'TRANSFER_OUT')
            )
        )))
        .slice(0, 18 + (includeLiveAuctionReferences ? platform.buyerAuctionSessions.filter(session => session.status === 'LIVE' && session.lot.listingKind === 'TITLE').length : 0));
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
    reason?: 'NOT_ACTIVE' | 'NOT_FOUND' | 'INSUFFICIENT_TREASURY' | 'RIGHTS_UNAVAILABLE' | 'INSUFFICIENT_ENERGY' | 'INVALID_TERMS';
    detail?: string;
}

export interface OwnedStreamingCataloguePackagePurchaseOptions {
    /** Auction settlement may replace the listed guarantee while retaining the frozen per-title allocation weights. */
    totalGuarantee?: number;
    licensorRevenueShare?: number;
    skipEnergyCost?: boolean;
    /** Resolves only the saved accepted collection proposal. */
    privateNegotiationId?: string;
}

export { getOwnedPlatformPackageCountryIds } from './streamingContentAvailability';

export const getStreamingCataloguePackageOpportunities = (
    player: Player,
    options: { includeReservedOpportunityId?: string } = {},
): StreamingCataloguePackageOpportunity[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!['FOUNDING', 'ACTIVE'].includes(platform.lifecycle)) return [];
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const supplyProfile = getStreamingMarketSupplyProfile(player);
    const countryIds = getOwnedPlatformPackageCountryIds(platform);
    const sourceProjectById = new Map((player.world.projects || []).map(project => [project.id, project]));
    const settlementSession = options.includeReservedOpportunityId
        ? platform.buyerAuctionSessions.find(session => (
            session.status === 'LIVE' && session.lot.listingKind === 'CATALOGUE_PACKAGE'
            && session.lot.listingId === options.includeReservedOpportunityId
        ))
        : null;
    if (options.includeReservedOpportunityId) {
        const frozen = normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages)[options.includeReservedOpportunityId];
        if (settlementSession || frozen?.biddingSessionId) {
            // Auction settlement must use the complete saved room proposal, never rebuild
            // a smaller/new-cycle collection from whichever titles remain discoverable.
            if (!settlementSession || !frozen || frozen.lifecycle !== 'READY' || frozen.biddingSessionId !== settlementSession.id) return [];
            const expected = [...(settlementSession.lot.catalogueComponentIds || [])].sort();
            const componentIds = frozen.components.map(component => component.sourceProjectId).sort();
            const rowIds = frozen.acceptedTerms.map(row => row.componentProjectId).sort();
            if (expected.length < 3 || expected.length > 50 || new Set(expected).size !== expected.length
                || JSON.stringify(expected) !== JSON.stringify(componentIds) || JSON.stringify(expected) !== JSON.stringify(rowIds)
                || frozen.acceptedTerms.some(row => !Number.isSafeInteger(row.minimumGuarantee) || row.minimumGuarantee < 0
                    || !Number.isSafeInteger(row.durationWeeks) || row.durationWeeks < 1 || row.durationWeeks > frozen.maximumDurationWeeks)
                || frozen.acceptedTerms.reduce((sum,row) => sum + row.minimumGuarantee,0) !== frozen.totalGuarantee) return [];
            return [{id:frozen.id,package:frozen,rows:frozen.acceptedTerms,totalGuarantee:frozen.totalGuarantee,
                sellerName:frozen.seller.name,marketHeat:'ACTIVE'}];
        }
    }
    const settlementProjectIds = new Set(settlementSession?.lot.catalogueComponentIds || []);
    const reservedProjectIds = new Set([
        ...platform.rightsNegotiations
            .filter(negotiation => ACTIVE_NEGOTIATION_STATUSES.has(negotiation.status))
            .flatMap(negotiation => negotiation.collectionSnapshot?.package?.components?.map(c=>c?.sourceProjectId) || [negotiation.sourceProjectId]),
        ...platform.buyerAuctionSessions
            .filter(session => session.status === 'LIVE')
            .flatMap(session => session.lot.catalogueComponentIds?.length
                ? session.lot.catalogueComponentIds
                : [session.lot.sourceProjectId]),
    ]);
    const groups = new Map<string, StreamingCatalogTitle[]>();
    getStreamingLicenseCandidatePool(player)
        .filter(title => (
            title.source === 'EXTERNAL_MARKET'
            && (!reservedProjectIds.has(title.id) || settlementProjectIds.has(title.id))
        ))
        .forEach(title => groups.set(title.studioId, [...(groups.get(title.studioId) || []), title]));
    return [...groups.entries()].flatMap(([studioId, titles]) => {
        const frozenIds = getStreamingMarketDiscovery(player)?.collectionTitleIdsBySeller?.[studioId];
        const titleById = new Map(titles.map(title => [title.id, title]));
        const selected = frozenIds
            ? frozenIds.flatMap(id => titleById.has(id) ? [titleById.get(id)!] : [])
            : selectStreamingMarketTitles(player, titles, supplyProfile.collectionMaximumSize);
        const compatibleTitles: StreamingCatalogTitle[] = [];
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
            compatibleTitles.push(title);
            const component: StreamingCataloguePackageComponent = {
                sourceProjectId: title.id,
                title: title.title,
                catalogueTier: title.catalogueTier,
                projectType: title.projectType,
                genre: title.genre,
                originalLanguageId: sourceProject?.originalLanguageId || title.originalLanguageId || 'english',
                sellerStudioId: studioId,
                quality: Math.max(0, Number(sourceProject?.quality || title.quality || (title.rating || 0) * 10)),
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
        if (components.length < 3) return [];
        const referenceValues = components.map(component => calculateStreamingCatalogueReferenceValue(component));
        const referenceTotal = referenceValues.reduce((sum, value) => sum + value, 0);
        const valuedComponents = components.map((component, index) => ({
            ...component,
            referenceValue: referenceValues[index],
            referenceWeight: referenceTotal > 0 ? referenceValues[index] / referenceTotal : 1 / components.length,
        }));
        const totalGuarantee = roundMoney(Math.max(
            compatibleTitles.length * 1_000_000,
            compatibleTitles.reduce((sum, title) => sum + getStreamingLicenseQuote(title, 'MULTI_REGION', 104,
                'NON_EXCLUSIVE', getActiveStreamingQuoteVersion(platform.marketQuotePolicy, absoluteWeek), 'FIRST_WINDOW', player.age).suggestedGuarantee, 0) * .78,
        ));
        const allocation = allocateStreamingCatalogueGuarantee({
            totalGuarantee,
            components: valuedComponents,
            platformId: 'NETFLIX',
            bidderValues: Object.fromEntries(compatibleTitles.map(title => [
                title.id,
                Math.max(1, Number(title.gross || 0) * .19 + (title.rating || 6) ** 2 * 900_000),
            ])),
            durationWeeks: 104,
            exclusivity: 'NON_EXCLUSIVE',
            localization: 'NONE',
            localizationRequirements: [],
        });
        if (!allocation.valid) return [];
        allocation.rows=allocation.rows.map(row=>{const pct=streamingBackendPercentForBuyer(player,null,absoluteWeek,row.licensorRevenueShare,row.countryIds,undefined,platform);
            const expectedRoyaltyCost=pct>0?Math.round(row.expectedRoyaltyCost*pct/Math.max(1,row.licensorRevenueShare)):0;
            return {...row,licensorRevenueShare:pct,platformRevenueShare:100-pct,backendBasis:'ADS_RENTAL_RECEIPTS',guaranteeRecoupment:'NON_RECOUPABLE',backendCap:null,
                expectedRoyaltyCost,expectedTotalCost:row.minimumGuarantee+expectedRoyaltyCost};});
        const packageId = createDeterministicId('owned_streaming_catalogue_package', platform.simulationSeed, getStreamingMarketCycle(absoluteWeek), studioId, ...valuedComponents.map(component => component.sourceProjectId));
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
        const averageRating = compatibleTitles.reduce((sum, title) => sum + (title.rating || 6), 0) / compatibleTitles.length;
        return [{
            id: packageId,
            package: cataloguePackage,
            rows: allocation.rows,
            totalGuarantee,
            sellerName: selected[0].studioName,
            marketHeat: averageRating >= 7.8 ? 'HOT' as const : 'ACTIVE' as const,
        }];
    }).sort((left, right) => right.totalGuarantee - left.totalGuarantee || left.id.localeCompare(right.id))
        .slice(0, supplyProfile.collectionLimit);
};

export const signOwnedStreamingCataloguePackage = (
    player: Player,
    opportunityId: string,
    options: OwnedStreamingCataloguePackagePurchaseOptions = {},
): OwnedStreamingCataloguePackagePurchaseResult => {
    const registry = normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages);
    const existing = registry[opportunityId];
    if (existing?.lifecycle === 'SIGNED') {
        const contracts = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
        return { player, changed: false, package: existing, contracts: existing.componentContractIds.map(id => contracts[id]).filter(Boolean) };
    }
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!['FOUNDING', 'ACTIVE'].includes(platform.lifecycle)) return { player, changed: false, contracts: [], package: null, reason: 'NOT_ACTIVE' };
    const privateNegotiation = options.privateNegotiationId ? platform.rightsNegotiations.find(n=>n.id===options.privateNegotiationId
        && n.status==='READY_TO_SIGN' && n.collectionSnapshot?.package?.id===opportunityId) : undefined;
    if (options.privateNegotiationId && !privateNegotiation) return {player,changed:false,contracts:[],package:null,reason:'INVALID_TERMS'};
    if (privateNegotiation) {
        if (options.skipEnergyCost || options.totalGuarantee!==undefined || options.licensorRevenueShare!==undefined
            || getAbsoluteWeek(player.age,player.currentWeek)>(privateNegotiation.signingDeadlineAbsoluteWeek ?? privateNegotiation.expiresAtAbsoluteWeek))
            return {player,changed:false,contracts:[],package:null,reason:'INVALID_TERMS'};
        const error=validateCollectionPrivateTerms(player,privateNegotiation.collectionSnapshot!,privateNegotiation);
        if (error) return {player,changed:false,contracts:[],package:null,reason:'RIGHTS_UNAVAILABLE',detail:error};
    }
    const opportunity = privateNegotiation ? collectionOpportunityForNegotiation(privateNegotiation,getAbsoluteWeek(player.age,player.currentWeek))
        : getStreamingCataloguePackageOpportunities(player, {includeReservedOpportunityId:opportunityId}).find(candidate=>candidate.id===opportunityId);
    if (!opportunity) return { player, changed: false, contracts: [], package: null, reason: 'NOT_FOUND' };
    const packageError = validateNewStreamingBackendTerms({minimumGuarantee:options.totalGuarantee ?? opportunity.totalGuarantee,
        licensorRevenueShare:options.licensorRevenueShare ?? 0,referenceFee:opportunity.totalGuarantee,
        capability:getStreamingBuyerBackendCapability(player,null,getAbsoluteWeek(player.age,player.currentWeek))});
    if(packageError) return {player,changed:false,contracts:[],package:opportunity.package,reason:'INVALID_TERMS'};
    const totalGuarantee = Math.max(0, Math.round(options.totalGuarantee ?? opportunity.totalGuarantee));
    const licensorRevenueShare = options.licensorRevenueShare == null
        ? null
        : Math.round(clamp(options.licensorRevenueShare, 0, 40));
    const allocationTotal = Math.max(1, opportunity.rows.reduce((sum, row) => sum + row.minimumGuarantee, 0));
    let allocated = 0;
    const effectiveRows = privateNegotiation ? opportunity.rows : opportunity.rows.map((row, index) => {
        const minimumGuarantee = index === opportunity.rows.length - 1
            ? Math.max(0, totalGuarantee - allocated)
            : Math.floor((totalGuarantee * row.minimumGuarantee / allocationTotal) / 100_000) * 100_000;
        allocated += minimumGuarantee;
        const sellerShare = licensorRevenueShare ?? streamingBackendPercentForBuyer(player,null,getAbsoluteWeek(player.age,player.currentWeek),row.licensorRevenueShare,row.countryIds);
        return {
            ...row,
            backendBasis: 'ADS_RENTAL_RECEIPTS' as const,
            minimumGuarantee,
            licensorRevenueShare: sellerShare,
            platformRevenueShare: 100 - sellerShare,
            referenceAllocation: minimumGuarantee,
            expectedTotalCost: minimumGuarantee + row.expectedRoyaltyCost,
        };
    });
    for(const row of privateNegotiation ? [] : effectiveRows){
        const original=opportunity.rows.find(item=>item.componentProjectId===row.componentProjectId)!;
        const grant=createStreamingRightsAccessGrantForOffer(platform.serviceConfiguration.pricing.streams,row.windowType==='PERMANENT');
        const error=validateNewStreamingBackendTerms({minimumGuarantee:row.minimumGuarantee,licensorRevenueShare:row.licensorRevenueShare,referenceFee:original.minimumGuarantee,
            capability:getStreamingBuyerBackendCapability(player,null,getAbsoluteWeek(player.age,player.currentWeek),row.countryIds,grant)});
        if(error) return {player,changed:false,contracts:[],package:opportunity.package,reason:'INVALID_TERMS',detail:error};
    }
    const committedCash = platform.costCommitments.filter(item => item.status === 'COMMITTED')
        .reduce((sum,item) => sum + Math.max(0,item.committedAmount-item.paidAmount),0);
    if (platform.treasuryCash - committedCash < totalGuarantee) {
        return { player, changed: false, contracts: [], package: opportunity.package, reason: 'INSUFFICIENT_TREASURY' };
    }
    if (!options.skipEnergyCost && player.energy.current < PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT) {
        return { player, changed: false, contracts: [], package: opportunity.package, reason: 'INSUFFICIENT_ENERGY' };
    }
    const effectiveStart = Math.max(opportunity.package.startsAtAbsoluteWeek,getAbsoluteWeek(player.age,player.currentWeek));
    if (effectiveRows.some(row => effectiveStart >= opportunity.package.startsAtAbsoluteWeek + row.durationWeeks))
        return {player,changed:false,contracts:[],package:opportunity.package,reason:'RIGHTS_UNAVAILABLE',detail:'The original collection window has expired.'};
    for (const row of effectiveRows) {
        const compatibility = resolveStreamingRightsCompatibility({
            world: player.world,
            sourceProjectId: row.componentProjectId,
            buyerPlatformId: null,
            sellerPartyId: opportunity.package.seller.id,
            territory: row.territory,
            countryIds: row.countryIds,
            startsAtAbsoluteWeek: effectiveStart,
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
    const privatePenalties = privateNegotiation ? allocatePrivateCollectionMoney(privateNegotiation.cancellationPenalty,opportunity.rows.map(r=>r.minimumGuarantee)) : null;
    effectiveRows.forEach((row, index) => {
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
            durationWeeks: opportunity.package.startsAtAbsoluteWeek + row.durationWeeks - effectiveStart,
            exclusivity: row.exclusivity,
            minimumGuarantee: row.minimumGuarantee,
            platformRevenueShare: row.platformRevenueShare,
            signedAtAbsoluteWeek: getAbsoluteWeek(player.age,player.currentWeek),
            startsAtAbsoluteWeek: effectiveStart,
            origin: 'CATALOGUE_ACQUISITION',
            sellerType: 'STUDIO',
            sellerPlatformId: null,
            windowType: row.windowType,
            renewalOption: privateNegotiation?.renewalOption ?? true,
            sublicensingAllowed: privateNegotiation?.sublicensingAllowed ?? (row.exclusivity === 'NON_EXCLUSIVE'),
            sequelRightsIncluded: privateNegotiation?.sequelRightsIncluded ?? false,
            changeOfControl: privateNegotiation?.changeOfControl ?? 'NOTICE',
            cancellationPenalty: privatePenalties ? privatePenalties[index] : Math.round(row.minimumGuarantee * .2),
            accessGrant: privateNegotiation?.accessGrant || createStreamingRightsAccessGrantForOffer(
                platform.serviceConfiguration.pricing.streams,
                row.windowType === 'PERMANENT',
                Math.max(0, ...Object.values(platform.serviceConfiguration.pricing.commercialOffers?.benefits.plans || {})
                    .map(benefit => benefit.earlyAccessWeeks)),
            ),
        });
        const registration = registerStreamingRightsContract(contractRegistry, createStreamingRightsContractFromLicense({
            license,
            seller: opportunity.package.seller,
            buyer: { type: 'PLAYER_PLATFORM', id: buyerId, name: identity?.name || 'Your platform', platformId: null },
            guaranteeDisposition: 'PAID',
            settledAtAbsoluteWeek: getAbsoluteWeek(player.age,player.currentWeek),
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
        signedAtAbsoluteWeek: getAbsoluteWeek(player.age,player.currentWeek),
        totalGuarantee,
        totalExpectedExposure: effectiveRows.reduce((sum, row) => sum + row.expectedTotalCost, 0),
        acceptedTerms: effectiveRows,
        componentContractIds: contracts.map(contract => contract.id).sort(),
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${opportunity.id}:signed`),
        idempotencyKey: `${opportunity.id}:signed`,
        absoluteWeek: getAbsoluteWeek(player.age,player.currentWeek),
        type: 'LICENSE_SIGNED',
        summary: `${signedPackage.name} joined the catalogue through ${contracts.length} title contracts.`,
        source: 'PLAYER_ACTION',
        metadata: { cataloguePackageId: signedPackage.id, minimumGuarantee: totalGuarantee },
    };
    const nextPlayer: Player = {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            treasuryCash: platform.treasuryCash - totalGuarantee,
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
    if (!options.skipEnergyCost) {
        spendPlayerEnergy(nextPlayer, PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT, `Catalogue acquisition: ${signedPackage.name}`);
    }
    return { player: nextPlayer, changed: true, contracts, package: signedPackage };
};

export const createDefaultStreamingRightsTerms = (
    opportunity: StreamingRightsOpportunity,
): StreamingRightsTermsInput => ({
    territory: opportunity.kind === 'SUBLICENSE_OUT' ? 'DOMESTIC' : opportunity.recommendedTerritory,
    // PERMANENT is the canonical window, not an editable MAX_SAFE week count.
    // Keep the form value bounded; signing retains the source's perpetual scope.
    durationWeeks: opportunity.recommendedWindow === 'PERMANENT' ? 520 : opportunity.remainingWeeks,
    exclusivity: opportunity.sourceLicenseId && opportunity.kind !== 'SUBLICENSE_OUT'
        ? opportunity.inheritedExclusivity
        : 'NON_EXCLUSIVE',
    windowType: opportunity.recommendedWindow,
    minimumGuarantee: opportunity.quote.suggestedGuarantee,
    platformRevenueShare: 100,
    marketingGuarantee: 0,
    viewershipBonusThreshold: 0,
    viewershipBonusAmount: 0,
    renewalOption: true,
    sublicensingAllowed: !opportunity.sourceLicenseId && opportunity.kind !== 'SUBLICENSE_OUT',
    sequelRightsIncluded: false,
    changeOfControl: 'NONE',
    cancellationPenalty: roundMoney(opportunity.quote.suggestedGuarantee * 0.22),
});

const normalizeTerms = (terms: StreamingRightsTermsInput): StreamingRightsTermsInput => ({
    territory: ['DOMESTIC', 'MULTI_REGION', 'GLOBAL'].includes(terms.territory) ? terms.territory : 'MULTI_REGION',
    durationWeeks: Math.max(1, Math.min(520, Math.round(Number(terms.durationWeeks) || 104))),
    exclusivity: terms.exclusivity === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'NON_EXCLUSIVE',
    windowType: ['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT'].includes(terms.windowType) ? terms.windowType : 'SECOND_WINDOW',
    minimumGuarantee: terms.minimumGuarantee,
    platformRevenueShare: Math.round(clamp(terms.platformRevenueShare, 80, 100)),
    marketingGuarantee: 0,
    viewershipBonusThreshold: Math.round(clamp(terms.viewershipBonusThreshold, 0, 100_000_000)),
    viewershipBonusAmount: roundMoney(clamp(terms.viewershipBonusAmount, 0, 1_000_000_000)),
    renewalOption: Boolean(terms.renewalOption),
    sublicensingAllowed: Boolean(terms.sublicensingAllowed),
    sequelRightsIncluded: Boolean(terms.sequelRightsIncluded),
    changeOfControl: terms.changeOfControl,
    cancellationPenalty: terms.cancellationPenalty,
    countryIds: normalizeStreamingDayOneMarketIds(terms.countryIds),
    ...(Object.prototype.hasOwnProperty.call(terms, 'accessGrant') ? {
        accessGrant: normalizeStreamingRightsAccessGrant(terms.accessGrant) || {
            schemaVersion: 1 as const, modes: [] as StreamingTitleAccessMode[], earlyWindowWeeks: 0,
            purchaseFulfillment: 'NONE' as const, source: 'EXPLICIT' as const,
        },
    } : {}),
});

const requestedAccessGrantForTerms = (
    platform: OwnedStreamingPlatformState,
    terms: StreamingRightsTermsInput,
): StreamingRightsAccessGrant => {
    const streams = platform.serviceConfiguration.pricing.streams;
    const modes: StreamingTitleAccessMode[] = [
        ...(streams.includes('subs') ? ['SUBSCRIPTION' as const] : []),
        ...(streams.includes('ads') ? ['AD_SUPPORTED' as const] : []),
        ...(streams.includes('rentals') ? ['RENTAL' as const] : []),
        ...(streams.includes('rentals') && terms.windowType === 'PERMANENT' ? ['PURCHASE' as const] : []),
    ];
    const benefits = platform.serviceConfiguration.pricing.commercialOffers?.benefits;
    const earlyWindowWeeks = Math.max(0, ...Object.values(benefits?.plans || {}).map(value => value.earlyAccessWeeks));
    const requested = normalizeStreamingRightsAccessGrant(terms.accessGrant) || {
        schemaVersion: 1,
        modes,
        earlyWindowWeeks: Math.min(4, earlyWindowWeeks),
        purchaseFulfillment: modes.includes('PURCHASE') ? 'PERPETUAL' : 'NONE',
        source: 'EXPLICIT' as const,
    };
    return terms.windowType === 'PERMANENT' ? requested : {
        ...requested,
        modes: requested.modes.filter(mode => mode !== 'PURCHASE'),
        purchaseFulfillment: 'NONE',
    };
};

/** Compare every economic clause and exact viewer/country scope, not an acceptance boolean a revision can retain. */
const privateOfferTermsSignature = (platform: OwnedStreamingPlatformState, input: StreamingRightsTermsInput): string => {
    const terms = normalizeTerms(input);
    const grant = requestedAccessGrantForTerms(platform, terms);
    return JSON.stringify({...terms,
        countryIds: terms.territory === 'GLOBAL' ? [] : normalizeStreamingDayOneMarketIds(terms.countryIds).sort(),
        accessGrant: {modes: grant.modes.slice().sort(), earlyWindowWeeks: grant.earlyWindowWeeks,
            purchaseFulfillment: grant.purchaseFulfillment},
    });
};

const FALLBACK_MARKET_IDS = ['US', 'CA', 'MX'];

const getNegotiationCountrySnapshot = (
    platform: OwnedStreamingPlatformState,
    territory: StreamingLicenseTerritory,
    sourceLicense?: OwnedStreamingPlatformState['catalogLicenses'][number] | null,
): string[] => {
    if (territory === 'GLOBAL') return [];
    const activeCountryIds = getOwnedPlatformPackageCountryIds(platform);
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

/** Resolve ownership from current canonical sources, never a rotating listing or licence display fallback. */
const validateCurrentOriginalPrivateSource = (
    player: Player,
    negotiation: OwnedStreamingRightsNegotiation,
    terms: StreamingRightsTermsInput = negotiation,
): string | null => {
    if (!negotiation.proposalVersion || negotiation.kind !== 'ACQUIRE'
        || negotiation.sourceLicenseId || negotiation.collectionSnapshot !== undefined) return null;
    const sellerId = resolveStreamingOriginalRightsSellerId(player, negotiation.sourceProjectId);
    if (!sellerId || sellerId !== negotiation.sellerId)
        return 'The original title or its current seller is no longer available.';
    if (terms.territory !== 'GLOBAL') {
        const countries = terms.countryIds || negotiation.countryIds;
        const footprint = getOwnedPlatformPackageCountryIds(player.ownedStreamingPlatform);
        if (!countries.length || countries.some(countryId => !footprint.includes(countryId)))
            return 'The proposed countries are no longer in the platform footprint.';
    }
    return null;
};

/** Reject scope loss before normalization; a submitted promise cannot silently shrink. */
const validatePrivateScope = (player:Player, platform:OwnedStreamingPlatformState, terms:StreamingRightsTermsInput,
    sourceContract: StreamingRightsContract | OwnedStreamingPlatformState['catalogLicenses'][number] | null | undefined,
    referenceFee:number, buyerPlatformId:PlatformId|null=null, scopeAnchorWeek=getAbsoluteWeek(player.age,player.currentWeek)):string|null => {
    const countries=terms.countryIds;
    const allowed=sourceContract?.territory==='GLOBAL' ? null : sourceContract?.countryIds || getOwnedPlatformPackageCountryIds(platform);
    if (countries && (new Set(countries).size!==countries.length || countries.some(id=>!normalizeStreamingDayOneMarketIds([id]).length
        || allowed && !allowed.includes(id)) || terms.territory==='DOMESTIC' && countries.length!==1
        || terms.territory==='GLOBAL' && countries.length>0)) return 'The requested country scope is not available.';
    if (sourceContract && (terms.territory==='GLOBAL' && sourceContract.territory!=='GLOBAL'
        || terms.durationWeeks>Math.max(0,sourceContract.expiresAtAbsoluteWeek-scopeAnchorWeek)
        || terms.windowType!==sourceContract.windowType
        || terms.exclusivity==='EXCLUSIVE' && sourceContract.exclusivity!=='EXCLUSIVE'
        || terms.sublicensingAllowed && !sourceContract.sublicensingAllowed
        || terms.sequelRightsIncluded && !sourceContract.sequelRightsIncluded)) return 'The requested clauses exceed the seller rights.';
    const requested=terms.accessGrant;
    const available=normalizeStreamingRightsAccessGrant(sourceContract?.accessGrant);
    if (requested && (!Array.isArray(requested.modes) || !requested.modes.length || !Number.isInteger(requested.earlyWindowWeeks) || requested.earlyWindowWeeks<0 || requested.earlyWindowWeeks>4 || requested.modes.some(mode=>!['SUBSCRIPTION','AD_SUPPORTED','RENTAL','PURCHASE'].includes(mode))
        || terms.windowType!=='PERMANENT' && (requested.modes.includes('PURCHASE') || requested.purchaseFulfillment!=='NONE')
        || available && (requested.modes.some(mode=>!available.modes.includes(mode)) || requested.earlyWindowWeeks>available.earlyWindowWeeks)))
        return 'The requested viewing modes exceed the seller rights.';
    if (!sourceContract) return validateNewStreamingBackendTerms({minimumGuarantee:terms.minimumGuarantee,
        licensorRevenueShare:100-terms.platformRevenueShare,referenceFee,
        capability:getStreamingBuyerBackendCapability(player,buyerPlatformId,getAbsoluteWeek(player.age,player.currentWeek),terms.countryIds||[],requested),
        permanentPurchase:terms.windowType==='PERMANENT'});
    return null;
};

/** Outgoing offers must still be backed by the current canonical owned grant.
 * A catalogue projection alone cannot authorize a transfer or silently trim a sublicense.
 */
const validateCurrentOutgoingSource = (
    player: Player,
    platform: OwnedStreamingPlatformState,
    negotiation: OwnedStreamingRightsNegotiation,
    terms: StreamingRightsTermsInput = negotiation,
): string | null => {
    if (negotiation.kind !== 'SUBLICENSE_OUT' && negotiation.kind !== 'TRANSFER_OUT') return null;
    const source = negotiation.sourceLicenseId
        ? getStreamingRightsContract(player.world.streamingRightsContracts, negotiation.sourceLicenseId) : null;
    if (!source || source.status !== 'ACTIVE' || source.sourceProjectId !== negotiation.sourceProjectId
        || source.buyer.type !== 'PLAYER_PLATFORM'
        || source.buyer.id !== (platform.identity?.slug || `player-platform:${player.id}`)
        || getAbsoluteWeek(player.age, player.currentWeek) > source.expiresAtAbsoluteWeek)
        return 'The canonical owned source grant is no longer available.';
    if (negotiation.kind === 'SUBLICENSE_OUT' && !source.sublicensingAllowed)
        return 'The source contract does not permit sublicensing.';
    if (negotiation.kind === 'TRANSFER_OUT') {
        const available = normalizeStreamingRightsAccessGrant(source.accessGrant);
        const requested = normalizeStreamingRightsAccessGrant(terms.accessGrant || negotiation.accessGrant);
        if (JSON.stringify((available?.modes || []).slice().sort()) !== JSON.stringify((requested?.modes || []).slice().sort())
            || (available?.earlyWindowWeeks || 0) !== (requested?.earlyWindowWeeks || 0)
            || (available?.purchaseFulfillment || 'NONE') !== (requested?.purchaseFulfillment || 'NONE'))
            return 'The inherited viewing grant changed while this transfer was under review.';
    }
    // An exact transfer may carry a legacy empty viewer grant; it creates no new modes.
    const scopeTerms = negotiation.kind === 'TRANSFER_OUT' ? {...terms, accessGrant: undefined} : terms;
    return validatePrivateScope(player, platform, scopeTerms, source, negotiation.rivalBidAmount,
        negotiation.buyerPlatformId, negotiation.createdAtAbsoluteWeek);
};

export const openStreamingRightsNegotiation = (
    player: Player,
    opportunityId: string,
    inputTerms?: StreamingRightsTermsInput,
    settlementAuctionSessionId?: string,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!['FOUNDING', 'ACTIVE'].includes(platform.lifecycle)) return { player, changed: false, reason: 'NOT_ACTIVE' };
    const reservedSettlement = Boolean(settlementAuctionSessionId && platform.buyerAuctionSessions.some(session => (
        session.id === settlementAuctionSessionId && session.status === 'LIVE'
        && session.lot.listingKind === 'TITLE' && session.lot.listingId === opportunityId
    )));
    const opportunity = getStreamingRightsOpportunities(player, reservedSettlement).find(item => item.id === opportunityId);
    if (!opportunity) return { player, changed: false, reason: 'NOT_FOUND' };
    if (opportunity.incompatibilityDetail) {
        return {
            player,
            changed: false,
            reason: 'RIGHTS_UNAVAILABLE',
            detail: opportunity.incompatibilityDetail,
        };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `${opportunity.id}:${getStreamingMarketCycle(absoluteWeek)}`;
    const existing = platform.rightsNegotiations.find(item => item.idempotencyKey === idempotencyKey);
    if (existing) return { player, changed: false, reason: 'ALREADY_OPEN', negotiation: existing };
    const invalidNumbers = validatePrivateTermsNumbers(inputTerms || createDefaultStreamingRightsTerms(opportunity));
    if (invalidNumbers) return {player, changed:false, reason:'INVALID_TERMS', detail:invalidNumbers};
    const terms = normalizeTerms(inputTerms || createDefaultStreamingRightsTerms(opportunity));
    const availableTreasury = Math.max(0, platform.treasuryCash - platform.costCommitments
        .filter(commitment => commitment.status === 'COMMITTED')
        .reduce((sum, commitment) => sum + commitment.committedAmount, 0));
    if (!['SUBLICENSE_OUT', 'TRANSFER_OUT'].includes(opportunity.kind) && terms.minimumGuarantee > availableTreasury) {
        return {
            player,
            changed: false,
            reason: 'INSUFFICIENT_TREASURY',
            detail: 'Available platform funds cannot support this proposal.',
        };
    }
    const sourceLicense = opportunity.sourceLicenseId
        ? platform.catalogLicenses.find(license => license.id === opportunity.sourceLicenseId)
        : null;
    const sourceContract = opportunity.sourceLicenseId
        ? getStreamingRightsContract(player.world.streamingRightsContracts, opportunity.sourceLicenseId)
        : null;
    const scopeError=validatePrivateScope(player,platform,inputTerms || createDefaultStreamingRightsTerms(opportunity),sourceContract || sourceLicense,opportunity.rivalBidAmount,
        opportunity.kind==='SUBLICENSE_OUT'?opportunity.rivalPlatformId:null);
    if(scopeError)return {player,changed:false,reason:'INVALID_TERMS',detail:scopeError};
    const sourceGrant = normalizeStreamingRightsAccessGrant(sourceContract?.accessGrant || sourceLicense?.accessGrant);
    const requestedGrant = sourceGrant
        && (opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT')
        ? sourceGrant : requestedAccessGrantForTerms(platform, terms);
    const accessGrant = sourceGrant
        ? intersectStreamingRightsAccessGrants(sourceGrant, requestedGrant)
        : opportunity.sourceLicenseId
            ? { schemaVersion: 1 as const, modes: [] as StreamingTitleAccessMode[], earlyWindowWeeks: 0,
                purchaseFulfillment: 'NONE' as const, source: 'EXPLICIT' as const }
            : requestedGrant;
    const requestedCountryIds = normalizeStreamingDayOneMarketIds(terms.countryIds);
    const defaultCountryIds = opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT'
        ? opportunity.countryIds.slice().sort()
        : getNegotiationCountrySnapshot(platform, terms.territory, sourceLicense);
    const countryIds = terms.territory === 'GLOBAL'
        ? []
        : (requestedCountryIds.length ? requestedCountryIds.filter(id => !defaultCountryIds.length || defaultCountryIds.includes(id)) : defaultCountryIds)
            .slice(0, terms.territory === 'DOMESTIC' ? 1 : undefined)
            .sort();
    const negotiationId = createDeterministicId('streaming_rights_negotiation', platform.simulationSeed, idempotencyKey);
    const negotiation: OwnedStreamingRightsNegotiation = {
        id: negotiationId,
        idempotencyKey,
        kind: opportunity.kind === 'SUBLICENSE_OUT'
            ? 'SUBLICENSE_OUT'
            : opportunity.kind === 'TRANSFER_OUT' ? 'TRANSFER_OUT' : 'ACQUIRE',
        sourceProjectId: opportunity.title.id,
        sourceLicenseId: opportunity.sourceLicenseId,
        title: opportunity.title.title,
        projectType: opportunity.title.projectType,
        genre: opportunity.title.genre,
        sellerType: opportunity.sellerType,
        sellerId: opportunity.sellerId,
        sellerName: opportunity.sellerName,
        buyerPlatformId: opportunity.kind === 'SUBLICENSE_OUT' || opportunity.kind === 'TRANSFER_OUT'
            ? opportunity.rivalPlatformId : null,
        buyerName: opportunity.kind === 'SUBLICENSE_OUT' || opportunity.kind === 'TRANSFER_OUT'
            ? opportunity.rivalPlatformName : null,
        ...terms,
        accessGrant,
        countryIds,
        rivalPlatformId: opportunity.kind === 'SUBLICENSE_OUT' || opportunity.kind === 'TRANSFER_OUT'
            ? null : opportunity.rivalPlatformId,
        rivalPlatformName: opportunity.kind === 'SUBLICENSE_OUT' || opportunity.kind === 'TRANSFER_OUT'
            ? null : opportunity.rivalPlatformName,
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

export const openStreamingCollectionPrivateOffer = (
    player: Player, source: string | StreamingCataloguePackageOpportunity, inputTerms: StreamingRightsTermsInput,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!['FOUNDING','ACTIVE'].includes(platform.lifecycle)) return {player,changed:false,reason:'NOT_ACTIVE'};
    // Legacy callers may supply a display object; only its ID is authoritative input.
    const sourceId = typeof source === 'string' ? source : source.id;
    if (isContentMarketAuctionCollection(player, sourceId))
        return {player,changed:false,reason:'NOT_READY',detail:'This collection is assigned to a live auction.'};
    const existing = platform.rightsNegotiations.find(n => n.collectionSnapshot?.package?.id === sourceId);
    if (existing) return {player,changed:false,reason:'ALREADY_OPEN',negotiation:existing};
    const opportunity = getContentMarketCollections(player).find(item => item.id === sourceId);
    if (!opportunity) return {player,changed:false,reason:'NOT_FOUND',detail:'This collection offer is no longer available.'};
    const snapshot = createCollectionNegotiationSnapshot(player, opportunity);
    const terms = {...inputTerms, countryIds:inputTerms.countryIds || snapshot.package.requestedCountryIds,
        accessGrant:inputTerms.accessGrant || snapshot.accessGrant};
    const invalid = validateCollectionPrivateTerms(player,snapshot,terms);
    if (invalid) return {player,changed:false,reason:'INVALID_TERMS',detail:invalid};
    const committed = platform.costCommitments.filter(c=>c.status==='COMMITTED').reduce((sum,c)=>sum+Math.max(0,c.committedAmount-c.paidAmount),0);
    if (platform.treasuryCash-committed<terms.minimumGuarantee) return {player,changed:false,reason:'INSUFFICIENT_TREASURY'};
    const week=getAbsoluteWeek(player.age,player.currentWeek);
    const id=createDeterministicId('collection_private_negotiation',platform.simulationSeed,opportunity.id);
    const due=week+2+(createDeterministicRng(`${platform.simulationSeed}:private-offer-response:${id}:1`)()>=.5?1:0);
    const negotiation:OwnedStreamingRightsNegotiation={...terms,id,idempotencyKey:`collection-private:${opportunity.id}`,
        collectionSnapshot:snapshot,kind:'ACQUIRE',sourceProjectId:opportunity.id,sourceLicenseId:null,title:opportunity.package.name,
        projectType:'MOVIE',genre:'Collection',sellerType:'STUDIO',sellerId:opportunity.package.seller.id,sellerName:opportunity.sellerName,
        buyerPlatformId:null,buyerName:null,rivalPlatformId:null,rivalPlatformName:null,rivalBidAmount:opportunity.totalGuarantee,
        marketHeat:opportunity.marketHeat,status:'OPEN',round:0,counterMinimumGuarantee:null,counterPlatformRevenueShare:null,
        createdAtAbsoluteWeek:week,updatedAtAbsoluteWeek:week,expiresAtAbsoluteWeek:due,proposalVersion:1,submittedAtAbsoluteWeek:week,
        responseDueAbsoluteWeek:due,responseStatus:'AWAITING_RESPONSE',responseReason:null,respondedAtAbsoluteWeek:null,
        processedProposalVersion:null,signingDeadlineAbsoluteWeek:null,responseMessageId:null,
        advertisedTermsSignature:privateOfferTermsSignature(platform,collectionPrivateDefaults(player,opportunity))};
    return {player:{...player,ownedStreamingPlatform:compactOwnedStreamingPlatformForPersistence({...platform,
        rightsNegotiations:[...platform.rightsNegotiations,negotiation]},player.id)},changed:true,negotiation};
};

export const openStreamingPrivateOffer = (
    player: Player,
    opportunityId: string,
    inputTerms: StreamingRightsTermsInput,
): StreamingRightsActionResult => {
    const advertised = getContentMarketListings(player).find(listing => listing.id === opportunityId);
    const inheritedGrant = advertised?.sourceLicenseId ? normalizeStreamingRightsAccessGrant(
        advertised.inheritedContract?.accessGrant
        || player.ownedStreamingPlatform.catalogLicenses.find(license => license.id === advertised.sourceLicenseId)?.accessGrant,
    ) || {schemaVersion: 1 as const, modes: [] as StreamingTitleAccessMode[], earlyWindowWeeks: 0,
        purchaseFulfillment: 'NONE' as const, source: 'EXPLICIT' as const} : null;
    const advertisedTermsSignature = advertised && !isContentMarketAuctionListing(player, opportunityId)
        ? privateOfferTermsSignature(player.ownedStreamingPlatform, {...advertised.terms, countryIds: advertised.countryIds,
            ...(inheritedGrant ? {accessGrant: inheritedGrant} : {})})
        : undefined;
    const opened = openStreamingRightsNegotiation(player, opportunityId, inputTerms);
    if (!opened.changed || !opened.negotiation) return opened;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(opened.player.ownedStreamingPlatform, opened.player.id);
    const responseRng = createDeterministicRng(`${platform.simulationSeed}:private-offer-response:${opened.negotiation.id}:1`);
    const responseDueAbsoluteWeek = absoluteWeek + 2 + (responseRng() >= 0.5 ? 1 : 0);
    const negotiation: OwnedStreamingRightsNegotiation = {
        ...opened.negotiation,
        ...(advertisedTermsSignature ? {advertisedTermsSignature} : {}),
        proposalVersion: 1,
        submittedAtAbsoluteWeek: absoluteWeek,
        responseDueAbsoluteWeek,
        responseStatus: 'AWAITING_RESPONSE',
        responseReason: null,
        respondedAtAbsoluteWeek: null,
        processedProposalVersion: null,
        signingDeadlineAbsoluteWeek: null,
        responseMessageId: null,
        expiresAtAbsoluteWeek: responseDueAbsoluteWeek,
    };
    return {
        player: {
            ...opened.player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiation.id ? negotiation : item),
            }, opened.player.id),
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
    const invalidNumbers = validatePrivateTermsNumbers(inputTerms,Boolean(current.collectionSnapshot));
    if (invalidNumbers) return {player,changed:false,reason:'INVALID_TERMS',detail:invalidNumbers};
    const originalSourceError = validateCurrentOriginalPrivateSource(player,current,inputTerms);
    if (originalSourceError) return {player,changed:false,reason:'RIGHTS_UNAVAILABLE',detail:originalSourceError};
    const outgoingSourceError = validateCurrentOutgoingSource(player,platform,current,inputTerms);
    if (outgoingSourceError) return {player,changed:false,reason:'RIGHTS_UNAVAILABLE',detail:outgoingSourceError};
    const collectionTerms = current.collectionSnapshot ? {...inputTerms,accessGrant:inputTerms.accessGrant || current.accessGrant, countryIds:inputTerms.countryIds || current.countryIds} : inputTerms;
    const collectionError = current.collectionSnapshot ? validateCollectionPrivateTerms(player,current.collectionSnapshot,collectionTerms) : null;
    if (collectionError) return {player,changed:false,reason:'INVALID_TERMS',detail:collectionError};
    const terms = normalizeTerms(collectionTerms);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const sourceLicense = current.sourceLicenseId
        ? platform.catalogLicenses.find(license => license.id === current.sourceLicenseId)
        : null;
    const sourceContract = current.sourceLicenseId
        ? getStreamingRightsContract(player.world.streamingRightsContracts, current.sourceLicenseId)
        : null;
    const scopeError=current.collectionSnapshot ? null : validatePrivateScope(player,platform,inputTerms,sourceContract || sourceLicense,current.rivalBidAmount,
        current.kind==='SUBLICENSE_OUT'?current.buyerPlatformId:null);
    if(scopeError)return {player,changed:false,reason:'INVALID_TERMS',detail:scopeError};
    const sourceGrant = normalizeStreamingRightsAccessGrant(sourceContract?.accessGrant || sourceLicense?.accessGrant);
    const inheritedExactTransfer = Boolean(sourceGrant && current.sourceLicenseId
        && (current.kind === 'TRANSFER_OUT' || current.sellerType === 'PLATFORM'));
    const requestedGrant = requestedAccessGrantForTerms(platform, terms);
    const accessGrant = sourceGrant
        ? inheritedExactTransfer ? sourceGrant : intersectStreamingRightsAccessGrants(sourceGrant, requestedGrant)
        : current.sourceLicenseId
            ? { schemaVersion: 1 as const, modes: [] as StreamingTitleAccessMode[], earlyWindowWeeks: 0,
                purchaseFulfillment: 'NONE' as const, source: 'EXPLICIT' as const }
            : requestedGrant;
    const defaultCountryIds = getNegotiationCountrySnapshot(platform, terms.territory, sourceLicense);
    const requestedCountryIds = normalizeStreamingDayOneMarketIds(terms.countryIds);
    const isPrivateOffer = Boolean(current.proposalVersion);
    const proposalVersion = isPrivateOffer ? (current.proposalVersion || 0) + 1 : undefined;
    const responseRng = proposalVersion
        ? createDeterministicRng(`${platform.simulationSeed}:private-offer-response:${current.id}:${proposalVersion}`)
        : null;
    const responseDueAbsoluteWeek = responseRng ? absoluteWeek + 2 + (responseRng() >= 0.5 ? 1 : 0) : null;
    const negotiation = {
        ...current,
        ...terms,
        accessGrant,
        countryIds: terms.territory === 'GLOBAL' ? [] : (requestedCountryIds.length ? requestedCountryIds : defaultCountryIds)
            .slice(0, terms.territory === 'DOMESTIC' ? 1 : undefined)
            .sort(),
        status: 'OPEN' as const,
        updatedAtAbsoluteWeek: absoluteWeek,
        ...(isPrivateOffer ? {
            proposalVersion,
            submittedAtAbsoluteWeek: absoluteWeek,
            responseDueAbsoluteWeek,
            responseStatus: 'AWAITING_RESPONSE' as const,
            responseReason: null,
            respondedAtAbsoluteWeek: null,
            processedProposalVersion: null,
            signingDeadlineAbsoluteWeek: null,
            responseMessageId: null,
        } : {}),
        counterMinimumGuarantee: null,
        counterPlatformRevenueShare: null,
        expiresAtAbsoluteWeek: responseDueAbsoluteWeek || current.expiresAtAbsoluteWeek,
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
    const outgoingSourceError = validateCurrentOutgoingSource(player,platform,current);
    if (outgoingSourceError) return {player,changed:false,reason:'RIGHTS_UNAVAILABLE',detail:outgoingSourceError};
    if (current.responseStatus === 'AWAITING_RESPONSE' && current.responseDueAbsoluteWeek != null) {
        return { player, changed: true, negotiation: current };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (absoluteWeek > current.expiresAtAbsoluteWeek) return { player, changed: false, reason: 'NOT_READY' };
    const eligibility = getStreamingBuyerBackendCapability(player,null,absoluteWeek,current.countryIds || [],current.accessGrant);
    const immutableTransfer=(current.kind==='ACQUIRE' && current.sellerType==='PLATFORM' || current.kind==='TRANSFER_OUT') && !!current.sourceLicenseId && !!player.world.streamingRightsContracts?.[current.sourceLicenseId];
    const termsError = current.kind === 'SUBLICENSE_OUT' || immutableTransfer ? null : validateNewStreamingBackendTerms({minimumGuarantee:current.minimumGuarantee,
        licensorRevenueShare:100-current.platformRevenueShare,referenceFee:current.rivalBidAmount,capability:eligibility,permanentPurchase:current.windowType==='PERMANENT'});
    if(termsError || current.marketingGuarantee > 0 || !immutableTransfer && current.viewershipBonusAmount > 0) return {player,changed:false,reason:'INVALID_TERMS',detail:termsError || 'New agreements use one ads and rental backend, without a separate success bonus.'};
    const rng = createDeterministicRng(`${platform.simulationSeed}:rights-offer:${current.id}:${current.round + 1}`);
    const referencePrice = Math.max(1, current.rivalBidAmount);
    const moneyScore = current.kind === 'SUBLICENSE_OUT'
        ? referencePrice / Math.max(1, current.minimumGuarantee)
        : current.minimumGuarantee / referencePrice;
    const shareScore = eligibility.eligibleRevenueFraction * (100-current.platformRevenueShare) / 100;
    const clauseScore = (
        (current.renewalOption ? 0.04 : 0)
        + (current.sublicensingAllowed ? -0.03 : 0.03)
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
        ? immutableTransfer ? current.platformRevenueShare : 100-streamingBackendPercentForBuyer(player,current.kind==='SUBLICENSE_OUT'?current.buyerPlatformId:null,absoluteWeek,
            Math.min(20,100-current.platformRevenueShare+(current.kind==='SUBLICENSE_OUT'?-3:3)),current.countryIds || [],current.accessGrant)
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
    const week=getAbsoluteWeek(player.age,player.currentWeek);
    if (week>(current.signingDeadlineAbsoluteWeek ?? current.expiresAtAbsoluteWeek)) return {player,changed:false,reason:'NOT_READY'};
    const proposed={...current,minimumGuarantee:current.counterMinimumGuarantee,platformRevenueShare:current.counterPlatformRevenueShare};
    const error=validateCurrentOriginalPrivateSource(player,current,proposed) || validateCurrentOutgoingSource(player,platform,current,proposed) || (current.collectionSnapshot ? validateCollectionPrivateTerms(player,current.collectionSnapshot,proposed)
        : validatePrivateScope(player,platform,proposed,current.sourceLicenseId ? getStreamingRightsContract(player.world.streamingRightsContracts,current.sourceLicenseId) : null,current.rivalBidAmount,current.buyerPlatformId,current.createdAtAbsoluteWeek));
    if(error)return {player,changed:false,reason:'INVALID_TERMS',detail:error};
    const negotiation: OwnedStreamingRightsNegotiation = {
        ...current,
        minimumGuarantee: current.counterMinimumGuarantee,
        platformRevenueShare: current.counterPlatformRevenueShare,
        status: 'READY_TO_SIGN',
        responseStatus: current.responseStatus ? 'SELLER_ACCEPTED' : current.responseStatus,
        responseReason: current.responseStatus
            ? `You accepted ${current.sellerName}'s revised terms. Complete signature before the deadline.`
            : current.responseReason,
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

export const withdrawStreamingRightsNegotiation = (
    player: Player,
    negotiationId: string,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const current = platform.rightsNegotiations.find(item => item.id === negotiationId);
    if (!current || !['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(current.status)) {
        return { player, changed: false, reason: 'NOT_READY' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const negotiation: OwnedStreamingRightsNegotiation = {
        ...current,
        status: 'WITHDRAWN',
        responseStatus: current.responseStatus ? 'WITHDRAWN' : current.responseStatus,
        responseReason: 'You withdrew this proposal. No money was charged and no rights were granted.',
        updatedAtAbsoluteWeek: absoluteWeek,
        expiresAtAbsoluteWeek: absoluteWeek,
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
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (negotiation.signingDeadlineAbsoluteWeek != null && absoluteWeek > negotiation.signingDeadlineAbsoluteWeek) {
        return {
            player,
            changed: false,
            reason: 'NOT_READY',
            detail: 'The signing window has expired. No money was charged.',
            negotiation,
        };
    }
    const originalSourceError = validateCurrentOriginalPrivateSource(player,negotiation);
    if (originalSourceError) return {player,changed:false,reason:'RIGHTS_UNAVAILABLE',detail:originalSourceError};
    const outgoingSourceError = validateCurrentOutgoingSource(player,platform,negotiation);
    if (outgoingSourceError) return {player,changed:false,reason:'RIGHTS_RESTRICTED',detail:outgoingSourceError};
    if (negotiation.collectionSnapshot !== undefined) {
        const error=validateCollectionPrivateTerms(player,negotiation.collectionSnapshot!,negotiation);
        if(error)return {player,changed:false,reason:'RIGHTS_UNAVAILABLE',detail:error};
        const signed=signOwnedStreamingCataloguePackage(player,negotiation.collectionSnapshot.package.id,{privateNegotiationId:negotiation.id});
        if (!signed.changed) return {player,changed:false,reason:signed.reason==='INSUFFICIENT_ENERGY'?'NOT_READY':signed.reason,detail:signed.detail};
        const signedNegotiation={...negotiation,status:'SIGNED' as const,responseStatus:'SIGNED' as const,updatedAtAbsoluteWeek:absoluteWeek};
        return {player:{...signed.player,ownedStreamingPlatform:compactOwnedStreamingPlatformForPersistence({...signed.player.ownedStreamingPlatform,
            rightsNegotiations:platform.rightsNegotiations.map(n=>n.id===negotiation.id?signedNegotiation:n)},player.id)},changed:true,negotiation:signedNegotiation};
    }
    if (negotiation.kind !== 'SUBLICENSE_OUT' && negotiation.kind !== 'TRANSFER_OUT'
        && !(negotiation.kind==='ACQUIRE' && negotiation.sellerType==='PLATFORM' && negotiation.sourceLicenseId && player.world.streamingRightsContracts?.[negotiation.sourceLicenseId])) {
        const error=validateNewStreamingBackendTerms({minimumGuarantee:negotiation.minimumGuarantee,licensorRevenueShare:100-negotiation.platformRevenueShare,
            referenceFee:negotiation.rivalBidAmount,capability:getStreamingBuyerBackendCapability(player,null,absoluteWeek,negotiation.countryIds || [],negotiation.accessGrant),permanentPurchase:negotiation.windowType==='PERMANENT'});
        if(error || negotiation.marketingGuarantee > 0 || negotiation.viewershipBonusAmount > 0) return {player,changed:false,reason:'INVALID_TERMS',detail:error || 'Separate success bonuses are not part of new licenses.'};
    }
    const availableTreasury = Math.max(0, platform.treasuryCash - platform.costCommitments
        .filter(commitment => commitment.status === 'COMMITTED')
        .reduce((sum, commitment) => sum + commitment.committedAmount, 0));
    if (negotiation.kind !== 'SUBLICENSE_OUT' && availableTreasury < negotiation.minimumGuarantee) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', negotiation };
    }
    const sourceLicense = negotiation.sourceLicenseId
        ? platform.catalogLicenses.find(item => item.id === negotiation.sourceLicenseId)
        : null;
    if (negotiation.proposalVersion && negotiation.sourceLicenseId) {
        const sourceContract=getStreamingRightsContract(player.world.streamingRightsContracts,negotiation.sourceLicenseId);
        if(!sourceContract && !sourceLicense)return {player,changed:false,reason:'RIGHTS_UNAVAILABLE',detail:'The source grant is no longer available.'};
        const error=validatePrivateScope(player,platform,negotiation,sourceContract || sourceLicense,negotiation.rivalBidAmount,negotiation.buyerPlatformId,negotiation.createdAtAbsoluteWeek);
        if(error)return {player,changed:false,reason:'RIGHTS_RESTRICTED',detail:error};
    }
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
            responseStatus: negotiation.responseStatus ? 'SIGNED' as const : negotiation.responseStatus,
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
    const canonicalTransferSource = negotiation.sourceLicenseId
        ? getStreamingRightsContract(player.world.streamingRightsContracts, negotiation.sourceLicenseId)
        : null;
    const isInboundPlatformTransfer = Boolean(
        negotiation.kind === 'ACQUIRE'
        && negotiation.sellerType === 'PLATFORM'
        && canonicalTransferSource,
    );
    const isOutboundPlatformTransfer = Boolean(
        negotiation.kind === 'TRANSFER_OUT'
        && canonicalTransferSource,
    );
    if (canonicalTransferSource && (isInboundPlatformTransfer || isOutboundPlatformTransfer)) {
        const playerParty = {
            type: 'PLAYER_PLATFORM' as const,
            id: platform.identity?.slug || `player-platform:${player.id}`,
            name: platform.identity?.name || 'Player streaming platform',
            platformId: null,
        };
        const aiBuyerPlatformId = negotiation.buyerPlatformId;
        if (isOutboundPlatformTransfer && !aiBuyerPlatformId) {
            return { player, changed: false, reason: 'NOT_READY', detail: 'The resale buyer is missing.', negotiation };
        }
        const transfer = settleStreamingRightsTransfer(player, {
            sourceContractId: canonicalTransferSource.id,
            seller: isInboundPlatformTransfer ? canonicalTransferSource.buyer : playerParty,
            buyer: isInboundPlatformTransfer ? playerParty : {
                type: 'AI_PLATFORM',
                id: aiBuyerPlatformId!,
                name: negotiation.buyerName || PLATFORMS[aiBuyerPlatformId!].name,
                platformId: aiBuyerPlatformId!,
            },
            askingPrice: Math.max(negotiation.minimumGuarantee, negotiation.rivalBidAmount || 0),
            price: negotiation.minimumGuarantee,
            absoluteWeek,
            idempotencyKey: `owned-rights-transfer:${negotiation.id}`,
            requestedAccessGrant: negotiation.accessGrant,
            controllerAtCommitment: {
                seller: isInboundPlatformTransfer ? 'AI' : 'PLAYER',
                buyer: isInboundPlatformTransfer ? 'PLAYER' : 'AI',
            },
        });
        if ('reason' in transfer) {
            return {
                player,
                changed: false,
                reason: transfer.reason === 'INSUFFICIENT_TREASURY' ? 'INSUFFICIENT_TREASURY'
                    : transfer.reason === 'RIGHTS_UNAVAILABLE' ? 'RIGHTS_UNAVAILABLE'
                        : 'NOT_READY',
                detail: transfer.detail,
                negotiation,
            };
        }
        const signedNegotiation = { ...negotiation, status: 'SIGNED' as const, responseStatus: negotiation.responseStatus ? 'SIGNED' as const : negotiation.responseStatus, updatedAtAbsoluteWeek: absoluteWeek };
        const transferredPlatform = normalizeOwnedStreamingPlatformState(
            transfer.player.ownedStreamingPlatform,
            transfer.player.id,
        );
        return {
            player: {
                ...transfer.player,
                ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                    ...transferredPlatform,
                    rightsNegotiations: transferredPlatform.rightsNegotiations.map(item => (
                        item.id === negotiation.id ? signedNegotiation : item
                    )),
                }, transfer.player.id),
            },
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
        : negotiation.availabilityAtAbsoluteWeek == null
            ? absoluteWeek
            : Math.max(absoluteWeek, negotiation.availabilityAtAbsoluteWeek);
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
    const signedNegotiation = { ...negotiation, status: 'SIGNED' as const, responseStatus: negotiation.responseStatus ? 'SIGNED' as const : negotiation.responseStatus, updatedAtAbsoluteWeek: absoluteWeek };
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
            sellerRevenueShare: 100 - negotiation.platformRevenueShare,
            buyerRevenueShare: negotiation.platformRevenueShare,
            signedAtAbsoluteWeek: absoluteWeek,
            startsAtAbsoluteWeek,
            expiresAtAbsoluteWeek,
            status: 'ACTIVE',
            changeOfControl: negotiation.changeOfControl,
            cancellationPenalty: negotiation.cancellationPenalty,
        };
        if (!sourceLicense) {
            return { player, changed: false, reason: 'NOT_FOUND', detail: 'The canonical source licence is missing.', negotiation };
        }
        const sublicense = settleStreamingRightsSublicense(player, {
            sourceContractId: sourceLicense.id,
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
            territory: deal.territory,
            countryIds: deal.countryIds,
            windowType: deal.windowType,
            exclusivity: deal.exclusivity,
            durationWeeks: deal.durationWeeks,
            price: deal.upfrontFee,
            buyerRevenueShare: deal.buyerRevenueShare,
            absoluteWeek,
            idempotencyKey: `owned-rights-sublicense:${negotiation.id}`,
            successorContractId: deal.id,
            requestedAccessGrant: negotiation.accessGrant,
            controllerAtCommitment: { seller: 'PLAYER', buyer: 'AI' },
        });
        if ('reason' in sublicense) {
            return {
                player,
                changed: false,
                reason: sublicense.reason === 'INSUFFICIENT_TREASURY' ? 'INSUFFICIENT_TREASURY'
                    : sublicense.reason === 'RIGHTS_UNAVAILABLE' || sublicense.reason === 'NOT_ACTIVE'
                        ? 'RIGHTS_RESTRICTED' : 'NOT_READY',
                detail: sublicense.detail,
                negotiation,
            };
        }
        nextWorld = sublicense.player.world;
        const sublicensePlatform = normalizeOwnedStreamingPlatformState(
            sublicense.player.ownedStreamingPlatform,
            sublicense.player.id,
        );
        nextPlatform = {
            ...sublicensePlatform,
            rightsNegotiations: sublicensePlatform.rightsNegotiations.map(item => item.id === negotiationId ? signedNegotiation : item),
            sublicenseDeals: sublicensePlatform.sublicenseDeals.some(item => item.id === deal.id)
                ? sublicensePlatform.sublicenseDeals
                : [...sublicensePlatform.sublicenseDeals, deal],
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
            upcomingRightsSaleId: negotiation.upcomingRightsSaleId || null,
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
            accessGrant: normalizeStreamingRightsAccessGrant(negotiation.accessGrant) || {
                schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
                purchaseFulfillment: 'NONE', source: 'LEGACY_SNAPSHOT',
            },
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
    const rival = chooseRival(
        platform.simulationSeed,
        idempotencyKey,
        absoluteWeek,
        license.sellerPlatformId && PLATFORM_IDS.includes(license.sellerPlatformId as PlatformId)
            ? license.sellerPlatformId as PlatformId
            : null,
    );
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
        platformRevenueShare: 100-streamingBackendPercentForBuyer(player,null,absoluteWeek,100-economics.platformRevenueShare,license.countryIds,license.accessGrant),
        marketingGuarantee: license.marketingGuarantee || 0,
        viewershipBonusThreshold: 0,
        viewershipBonusAmount: 0,
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
        if (obligation.futureFunding?.commitment === 'OPTION' && obligation.fundingActivatedAtAbsoluteWeek == null) return obligation;
        const observedAmount = obligation.type === 'MARKETING_SPEND'
            ? platform.growthActions
                .filter(action => action.projectId === obligation.sourceProjectId && action.status === 'APPLIED')
                .reduce((sum, action) => sum + action.cashCost, 0)
            : obligation.type === 'FUTURE_GREENLIGHT'
                ? obligation.sourceAuctionId ? obligation.observedAmount : platform.originalCommissions.some(commission => (
                    commission.producerStudioId === obligation.counterpartyId
                    && commission.commissionedAtAbsoluteWeek >= (obligation.createdAtAbsoluteWeek || 0)
                    && ['GREENLIT', 'IN_PRODUCTION', 'DELIVERED', 'RELEASED'].includes(commission.status)
                )) ? 1 : 0
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
                    summary: `${obligation.title} breached its ${obligation.type === 'MARKETING_SPEND'
                        ? 'marketing guarantee'
                        : obligation.type === 'FUTURE_GREENLIGHT'
                            ? 'future-original greenlight promise'
                            : 'viewership obligation'}.`,
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
    _consentGranted: boolean,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const license = platform.catalogLicenses.find(item => item.id === licenseId);
    if (!license) return { player, changed: false, reason: 'NOT_FOUND' };
    return {
        player,
        changed: false,
        reason: 'NOT_READY',
        detail: 'Valid licence positions remain attached to the platform after a change of control.',
    };
};
