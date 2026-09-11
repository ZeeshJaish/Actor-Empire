import type { IndustryProductionCommitment, OwnedStreamingRightsNegotiation, Player, StreamingBuyerAuctionLot, StreamingUpcomingRightsSale } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getOwnedPlatformPackageCountryIds } from './streamingContentAvailability';
import { resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { appendIndustryEventFacts, createIndustryEventFact } from './industryWorld/industryEventLedger';
import { signStreamingRightsDeal } from './streamingRightsMarketplace';

export interface StreamingUpcomingRightsWeekResult {
    player: Player;
    createdSaleIds: string[];
    openedSaleIds: string[];
    updatedSaleIds: string[];
}

export const getStreamingUpcomingRightsSales = (player: Player): StreamingUpcomingRightsSale[] => (
    normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).upcomingRightsSales
        .slice()
        .sort((left, right) => left.opensAtAbsoluteWeek - right.opensAtAbsoluteWeek || left.id.localeCompare(right.id))
);

const auctionPriorities = (saleId: string): StreamingBuyerAuctionLot['sellerPriorities'] => {
    const rng = createDeterministicRng(`${saleId}:seller-priorities`);
    return {
        cash: Math.round((0.92 + rng() * 0.16) * 100) / 100,
        backend: Math.round((0.85 + rng() * 0.3) * 100) / 100,
        marketing: Math.round((0.82 + rng() * 0.34) * 100) / 100,
        futureGreenlight: Math.round((0.8 + rng() * 0.4) * 100) / 100,
    };
};

export const getStreamingUpcomingRightsAuctionLots = (player: Player): StreamingBuyerAuctionLot[] => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    return getStreamingUpcomingRightsSales(player)
        .filter(sale => sale.status === 'LIVE' && sale.opensAtAbsoluteWeek <= absoluteWeek)
        .filter(sale => {
            const production = player.world.industryProductions?.[sale.sourceProductionId];
            return Boolean(production && !['CANCELLED', 'TURNAROUND', 'ON_HOLD'].includes(production.status));
        })
        .filter(sale => resolveStreamingRightsCompatibility({
            world: player.world,
            sourceProjectId: sale.sourceProjectId,
            buyerPlatformId: null,
            sellerPartyId: sale.sellerId,
            territory: sale.territory,
            countryIds: sale.countryIds,
            startsAtAbsoluteWeek: sale.plannedAvailabilityAbsoluteWeek,
            expiresAtAbsoluteWeek: sale.plannedAvailabilityAbsoluteWeek + sale.durationWeeks,
            windowType: sale.windowType,
            exclusivity: sale.exclusivity,
        }).available)
        .map(sale => {
            const id = createDeterministicId('streaming_buyer_auction_lot', sale.id);
            return {
                id,
                listingId: `upcoming:${sale.id}`,
                listingSignature: JSON.stringify({
                    saleId: sale.id,
                    sourceProjectId: sale.sourceProjectId,
                    plannedAvailabilityAbsoluteWeek: sale.plannedAvailabilityAbsoluteWeek,
                    durationWeeks: sale.durationWeeks,
                    territory: sale.territory,
                    countryIds: [...sale.countryIds].sort(),
                    windowType: sale.windowType,
                    exclusivity: sale.exclusivity,
                }),
                listingKind: 'TITLE' as const,
                sourceProjectId: sale.sourceProjectId,
                title: sale.title,
                projectType: sale.projectType,
                genre: sale.genre,
                sellerId: sale.sellerId,
                sellerName: sale.sellerName,
                sourceLicenseId: null,
                territory: sale.territory,
                countryIds: [...sale.countryIds],
                excludedCountryIds: [],
                windowType: sale.windowType,
                exclusivity: sale.exclusivity,
                durationWeeks: sale.durationWeeks,
                startsAtAbsoluteWeek: sale.plannedAvailabilityAbsoluteWeek,
                referenceValue: sale.referenceValue,
                minimumGuarantee: sale.minimumGuarantee,
                minimumBidIncrement: Math.max(500_000, Math.round(sale.referenceValue * 0.025 / 100_000) * 100_000),
                reserveSellerValue: Math.round(sale.referenceValue * 0.84 / 100_000) * 100_000,
                allowedTerms: {
                    backendMinimum: 1,
                    backendMaximum: 10,
                    marketingMaximum: Math.round(sale.referenceValue * 0.18 / 100_000) * 100_000,
                    futureGreenlightAllowed: true,
                    futureGreenlightReserve: Math.round(sale.referenceValue * 0.25 / 100_000) * 100_000,
                },
                sellerPriorities: auctionPriorities(sale.id),
                notice: `Pre-release rights. ${sale.title} cannot be scheduled or played until the canonical production is delivered and its week ${sale.plannedAvailabilityAbsoluteWeek} availability begins.`,
                cataloguePackageId: null,
                catalogueComponentIds: [],
                upcomingRightsSaleId: sale.id,
            };
        });
};

export const followStreamingUpcomingRightsSale = (
    player: Player,
    saleId: string,
): { player: Player; changed: boolean; detail: string } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const sale = platform.upcomingRightsSales.find(item => item.id === saleId);
    if (!sale || !['ANNOUNCED', 'LIVE'].includes(sale.status)) {
        return { player, changed: false, detail: 'This sale is no longer available to follow.' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const followedAtAbsoluteWeek = sale.followedAtAbsoluteWeek == null ? absoluteWeek : null;
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                upcomingRightsSales: platform.upcomingRightsSales.map(item => item.id === saleId
                    ? { ...item, followedAtAbsoluteWeek }
                    : item),
            }, player.id),
        },
        changed: true,
        detail: followedAtAbsoluteWeek == null ? 'Removed from your watchlist.' : `Following ${sale.title}. We will alert you when bidding opens.`,
    };
};

export const settleStreamingUpcomingRightsForPlayer = (
    player: Player,
    saleId: string,
    auctionSessionId: string,
    terms: {
        minimumGuarantee: number;
        licensorRevenueShare: number;
        marketingGuarantee: number;
    },
): { player: Player; changed: boolean; detail?: string; contractId?: string } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const sale = platform.upcomingRightsSales.find(item => item.id === saleId);
    if (!sale || sale.status !== 'LIVE') return { player, changed: false, detail: 'This future-rights sale is no longer live.' };
    const production = player.world.industryProductions?.[sale.sourceProductionId];
    if (!production || ['CANCELLED', 'TURNAROUND', 'ON_HOLD'].includes(production.status)) {
        return { player, changed: false, detail: 'The underlying production is no longer eligible.' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const compatibility = resolveStreamingRightsCompatibility({
        world: player.world,
        sourceProjectId: sale.sourceProjectId,
        buyerPlatformId: null,
        sellerPartyId: sale.sellerId,
        territory: sale.territory,
        countryIds: sale.countryIds,
        startsAtAbsoluteWeek: sale.plannedAvailabilityAbsoluteWeek,
        expiresAtAbsoluteWeek: sale.plannedAvailabilityAbsoluteWeek + sale.durationWeeks,
        windowType: sale.windowType,
        exclusivity: sale.exclusivity,
    });
    if (!compatibility.available) return { player, changed: false, detail: compatibility.summary };

    const negotiationId = createDeterministicId('streaming_upcoming_rights_negotiation', sale.id);
    const negotiation: OwnedStreamingRightsNegotiation = {
        id: negotiationId,
        idempotencyKey: `upcoming-rights-negotiation:${sale.id}`,
        kind: 'ACQUIRE',
        sourceProjectId: sale.sourceProjectId,
        sourceLicenseId: null,
        title: sale.title,
        projectType: sale.projectType,
        genre: sale.genre,
        sellerType: 'STUDIO',
        sellerId: sale.sellerId,
        sellerName: sale.sellerName,
        buyerPlatformId: null,
        buyerName: platform.identity?.name || 'Player streaming platform',
        territory: sale.territory,
        countryIds: [...sale.countryIds],
        durationWeeks: sale.durationWeeks,
        exclusivity: sale.exclusivity,
        windowType: sale.windowType,
        minimumGuarantee: Math.max(0, Math.round(terms.minimumGuarantee)),
        platformRevenueShare: 100 - Math.max(0, Math.min(40, Math.round(terms.licensorRevenueShare))),
        marketingGuarantee: Math.max(0, Math.round(terms.marketingGuarantee)),
        viewershipBonusThreshold: 0,
        viewershipBonusAmount: 0,
        renewalOption: false,
        sublicensingAllowed: false,
        sequelRightsIncluded: false,
        changeOfControl: 'NOTICE',
        cancellationPenalty: 0,
        rivalPlatformId: null,
        rivalPlatformName: null,
        rivalBidAmount: 0,
        marketHeat: sale.publicInterest === 'EVENT' || sale.publicInterest === 'HIGH' ? 'HOT' : 'ACTIVE',
        status: 'READY_TO_SIGN',
        round: 1,
        counterMinimumGuarantee: null,
        counterPlatformRevenueShare: null,
        createdAtAbsoluteWeek: absoluteWeek,
        updatedAtAbsoluteWeek: absoluteWeek,
        expiresAtAbsoluteWeek: absoluteWeek + 1,
        signingDeadlineAbsoluteWeek: absoluteWeek + 1,
        availabilityAtAbsoluteWeek: sale.plannedAvailabilityAbsoluteWeek,
        upcomingRightsSaleId: sale.id,
    };
    const stagedPlayer: Player = {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            rightsNegotiations: platform.rightsNegotiations.some(item => item.id === negotiationId)
                ? platform.rightsNegotiations
                : [...platform.rightsNegotiations, negotiation],
        }, player.id),
    };
    const signed = signStreamingRightsDeal(stagedPlayer, negotiationId);
    if (!signed.changed) return { player, changed: false, detail: signed.detail || 'The future-rights contract could not settle.' };
    const signedPlatform = normalizeOwnedStreamingPlatformState(signed.player.ownedStreamingPlatform, signed.player.id);
    const license = signedPlatform.catalogLicenses.find(item => item.upcomingRightsSaleId === sale.id);
    if (!license) return { player, changed: false, detail: 'The canonical future-rights contract was not created.' };
    const resolvedSale = {
        ...sale,
        status: 'ACQUIRED' as const,
        auctionSessionId,
        winningContractId: license.id,
        winnerName: signedPlatform.identity?.name || 'Player streaming platform',
        resolvedAtAbsoluteWeek: absoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
    };
    const fact = createIndustryEventFact({
        idempotencyKey: `upcoming-rights-acquired:${sale.id}`,
        absoluteWeek,
        type: 'RIGHTS_DEAL',
        importance: sale.publicInterest === 'EVENT' ? 'HIGH' : 'MEDIUM',
        companyId: sale.sellerId,
        companyName: sale.sellerName,
        projectId: sale.sourceProjectId,
        productionId: sale.sourceProductionId,
        platformId: signedPlatform.identity?.slug || `player-platform:${player.id}`,
        headline: `${resolvedSale.winnerName} wins the future rights to ${sale.title}`,
        detail: `The saved contract begins in absolute week ${sale.plannedAvailabilityAbsoluteWeek}, subject to canonical delivery. Private bid terms remain private.`,
        evidence: [
            { kind: 'RIGHTS_CONTRACT', id: license.id },
            { kind: 'PRODUCTION', id: sale.sourceProductionId },
            { kind: 'PROJECT', id: sale.sourceProjectId },
        ],
    });
    return {
        player: {
            ...signed.player,
            world: {
                ...signed.player.world,
                industryEvents: appendIndustryEventFacts(signed.player.world.industryEvents, [fact]),
            },
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...signedPlatform,
                upcomingRightsSales: signedPlatform.upcomingRightsSales.map(item => item.id === sale.id ? resolvedSale : item),
            }, signed.player.id),
        },
        changed: true,
        contractId: license.id,
    };
};

export const resolveStreamingUpcomingRightsAuctionOutcome = (
    player: Player,
    saleId: string,
    outcome: {
        status: 'LOST' | 'CLOSED' | 'WITHDRAWN';
        auctionSessionId: string;
        winnerName?: string | null;
        winningContractId?: string | null;
    },
): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const sale = platform.upcomingRightsSales.find(item => item.id === saleId);
    if (!sale || !['ANNOUNCED', 'LIVE'].includes(sale.status)) return player;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const resolvedSale = {
        ...sale,
        status: outcome.status,
        auctionSessionId: outcome.auctionSessionId,
        winningContractId: outcome.winningContractId || null,
        winnerName: outcome.winnerName || null,
        resolvedAtAbsoluteWeek: absoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
    };
    const dealFact = outcome.status === 'LOST' && outcome.winningContractId && outcome.winnerName
        ? createIndustryEventFact({
            idempotencyKey: `upcoming-rights-acquired:${sale.id}`,
            absoluteWeek,
            type: 'RIGHTS_DEAL',
            importance: sale.publicInterest === 'EVENT' ? 'HIGH' : 'MEDIUM',
            companyId: sale.sellerId,
            companyName: sale.sellerName,
            projectId: sale.sourceProjectId,
            productionId: sale.sourceProductionId,
            headline: `${outcome.winnerName} wins the future rights to ${sale.title}`,
            detail: `The public result is confirmed. Contract availability is scheduled for absolute week ${sale.plannedAvailabilityAbsoluteWeek}; private bid terms remain private.`,
            evidence: [
                { kind: 'RIGHTS_CONTRACT', id: outcome.winningContractId },
                { kind: 'PRODUCTION', id: sale.sourceProductionId },
                { kind: 'PROJECT', id: sale.sourceProjectId },
            ],
        })
        : null;
    return {
        ...player,
        world: dealFact ? {
            ...player.world,
            industryEvents: appendIndustryEventFacts(player.world.industryEvents, [dealFact]),
        } : player.world,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            upcomingRightsSales: platform.upcomingRightsSales.map(item => item.id === sale.id ? resolvedSale : item),
        }, player.id),
    };
};

export const processStreamingUpcomingRightsWeek = (
    player: Player,
    inputAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek),
): StreamingUpcomingRightsWeekResult => {
    const absoluteWeek = Math.max(0, Math.round(inputAbsoluteWeek));
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!['FOUNDING', 'ACTIVE'].includes(platform.lifecycle)) {
        return { player, createdSaleIds: [], openedSaleIds: [], updatedSaleIds: [] };
    }
    const playerStudioIds = new Set((player.businesses || []).map(business => business.id));
    const knownProductionIds = new Set(platform.upcomingRightsSales.map(sale => sale.sourceProductionId));
    const countryIds = getOwnedPlatformPackageCountryIds(platform);
    const created: StreamingUpcomingRightsSale[] = [];
    const interestFor = (production: IndustryProductionCommitment) => {
        const execution = production.studioAiExecution;
        const studioMarketing = player.world.studios?.[production.producerStudioId]?.ai?.competence.marketing || 50;
        const progressSignal = ({
            PLANNED: 2, PRE_PRODUCTION: 6, PRODUCTION: 11, POST_PRODUCTION: 15,
            DELIVERED: 18, AWAITING_RELEASE: 20, RELEASED: 22, ON_HOLD: -10,
            TURNAROUND: -15, CANCELLED: -25,
        } as Record<string, number>)[production.status] || 0;
        const resultSignal = execution?.result
            ? execution.result.outcome === 'HIT' ? 15 : execution.result.outcome === 'SOLID' ? 7 : -12
            : 0;
        const historicalUniverse = production.universeId
            ? (player.world.projects || []).filter(project => project.universeId === production.universeId)
            : [];
        const historySignal = historicalUniverse.length
            ? Math.min(18, historicalUniverse.reduce((sum, project) => sum + Math.min(5, project.boxOffice / 100_000_000), 0))
            : 0;
        const score = Math.max(0, Math.min(100, Math.round(
            18
            + Math.min(26, production.budgetMillions / 8)
            + (execution?.talent?.packageScore || 50) * 0.2
            + (execution?.finalQuality?.commercialPotential || execution?.finalQuality?.creativeQuality || production.writerSkill * 10) * 0.28
            + studioMarketing * 0.08
            + progressSignal
            + resultSignal
            + historySignal
            - (execution?.finalQuality?.downsideRisk || 35) * 0.12
        )));
        const drivers = [
            ...(production.universeId ? ['Known franchise or universe'] : []),
            ...((execution?.talent?.packageScore || 0) >= 75 ? ['High-profile creative package'] : []),
            ...(production.budgetMillions >= 100 ? ['Large-scale production'] : []),
            ...(studioMarketing >= 75 ? ['Strong campaign capability'] : []),
            ...(['POST_PRODUCTION', 'DELIVERED', 'AWAITING_RELEASE'].includes(production.status) ? ['Advanced production progress'] : []),
            ...((execution?.finalQuality?.commercialPotential || 0) >= 78 ? ['Strong commercial outlook'] : []),
            ...(execution?.result?.outcome === 'HIT' ? ['Strong verified release result'] : []),
            ...(execution?.problems?.length ? ['Production uncertainty'] : []),
        ];
        return {
            score,
            label: score >= 86 ? 'EVENT' as const : score >= 72 ? 'HIGH' as const : score >= 52 ? 'ACTIVE' as const : 'EMERGING' as const,
            drivers: drivers.slice(0, 4).length ? drivers.slice(0, 4) : ['Early market attention'],
        };
    };
    Object.values(player.world.industryProductions || {})
        .filter(production => !knownProductionIds.has(production.id))
        .filter(production => production.source === 'STUDIO_INDEPENDENT' && !playerStudioIds.has(production.producerStudioId))
        .filter(production => !['CANCELLED', 'RELEASED', 'TURNAROUND', 'ON_HOLD'].includes(production.status))
        .sort((left, right) => left.id.localeCompare(right.id))
        .forEach(production => {
            const releaseWeek = production.studioAiExecution?.plannedReleaseAbsoluteWeek;
            if (!releaseWeek || releaseWeek <= absoluteWeek + 2 || !countryIds.length) return;
            const availabilityWeek = releaseWeek + (production.studioAiExecution?.publicReleaseStrategy === 'STREAMING_ONLY' ? 0 : 4);
            const compatibility = resolveStreamingRightsCompatibility({
                world: player.world,
                sourceProjectId: production.canonicalProjectId,
                buyerPlatformId: null,
                sellerPartyId: production.producerStudioId,
                territory: 'MULTI_REGION',
                countryIds,
                startsAtAbsoluteWeek: availabilityWeek,
                expiresAtAbsoluteWeek: availabilityWeek + 104,
                windowType: 'FIRST_WINDOW',
                exclusivity: 'EXCLUSIVE',
            });
            if (!compatibility.available) return;
            const saleId = createDeterministicId('streaming_upcoming_rights_sale', production.id);
            const rng = createDeterministicRng(`${saleId}:opening`);
            const opensAtAbsoluteWeek = Math.min(availabilityWeek - 1, absoluteWeek + 1 + Math.floor(rng() * 3));
            const interest = interestFor(production);
            const referenceValue = Math.max(2_000_000, Math.round((production.budgetMillions * 650_000) * (0.72 + interest.score / 180) / 100_000) * 100_000);
            created.push({
                schemaVersion: 1,
                id: saleId,
                idempotencyKey: `upcoming-rights:${production.id}`,
                sourceProductionId: production.id,
                sourceProjectId: production.canonicalProjectId,
                title: production.title,
                projectType: production.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
                genre: production.genre,
                sellerId: production.producerStudioId,
                sellerName: player.world.studios?.[production.producerStudioId]?.name || String(production.producerStudioId),
                announcedAtAbsoluteWeek: absoluteWeek,
                opensAtAbsoluteWeek,
                originalAvailabilityAbsoluteWeek: availabilityWeek,
                plannedAvailabilityAbsoluteWeek: availabilityWeek,
                durationWeeks: 104,
                territory: 'MULTI_REGION',
                countryIds: [...countryIds],
                windowType: 'FIRST_WINDOW',
                exclusivity: 'EXCLUSIVE',
                referenceValue,
                minimumGuarantee: Math.max(1_000_000, Math.round(referenceValue * 0.52 / 100_000) * 100_000),
                publicInterestScore: interest.score,
                publicInterest: interest.label,
                publicInterestDrivers: interest.drivers,
                status: 'ANNOUNCED',
                followedAtAbsoluteWeek: null,
                openedNotificationId: null,
                auctionSessionId: null,
                winningContractId: null,
                winnerName: null,
                resolvedAtAbsoluteWeek: null,
                lastProcessedAbsoluteWeek: absoluteWeek,
            });
        });
    const announcementFacts = created.map(sale => createIndustryEventFact({
        idempotencyKey: `upcoming-rights-announced:${sale.id}`,
        absoluteWeek,
        type: 'RIGHTS_SALE_ANNOUNCED',
        importance: sale.publicInterest === 'EVENT' ? 'HIGH' : 'MEDIUM',
        companyId: sale.sellerId,
        companyName: sale.sellerName,
        projectId: sale.sourceProjectId,
        productionId: sale.sourceProductionId,
        headline: `${sale.sellerName} schedules a rights auction for ${sale.title}`,
        detail: `The public sale opens in absolute week ${sale.opensAtAbsoluteWeek}; ${sale.title} is currently expected from week ${sale.plannedAvailabilityAbsoluteWeek}. Interest is an estimate, not a promised result.`,
        evidence: [
            { kind: 'PRODUCTION', id: sale.sourceProductionId },
            { kind: 'PROJECT', id: sale.sourceProjectId },
            ...sale.countryIds.slice(0, 4).map(id => ({ kind: 'COUNTRY' as const, id })),
        ],
    }));
    const allSales = [...platform.upcomingRightsSales, ...created];
    const updatedSaleIds: string[] = [];
    const delayFacts = [];
    let catalogLicenses = [...platform.catalogLicenses];
    let streamingRightsContracts = { ...(player.world.streamingRightsContracts || {}) };
    const reconciledSales = allSales.map(sale => {
        const production = player.world.industryProductions?.[sale.sourceProductionId];
        if (!production) return sale;
        if (['CANCELLED', 'TURNAROUND'].includes(production.status)) {
            if (sale.status !== 'ANNOUNCED' && sale.status !== 'LIVE') return sale;
            updatedSaleIds.push(sale.id);
            return { ...sale, status: 'WITHDRAWN' as const, resolvedAtAbsoluteWeek: absoluteWeek, lastProcessedAbsoluteWeek: absoluteWeek };
        }
        const releaseWeek = production.studioAiExecution?.plannedReleaseAbsoluteWeek;
        if (!releaseWeek) return sale;
        const plannedAvailabilityAbsoluteWeek = releaseWeek
            + (production.studioAiExecution?.publicReleaseStrategy === 'STREAMING_ONLY' ? 0 : 4);
        if (['ANNOUNCED', 'LIVE'].includes(sale.status)) {
            const compatibility = resolveStreamingRightsCompatibility({
                world: player.world,
                sourceProjectId: sale.sourceProjectId,
                buyerPlatformId: null,
                sellerPartyId: sale.sellerId,
                territory: sale.territory,
                countryIds: sale.countryIds,
                startsAtAbsoluteWeek: plannedAvailabilityAbsoluteWeek,
                expiresAtAbsoluteWeek: plannedAvailabilityAbsoluteWeek + sale.durationWeeks,
                windowType: sale.windowType,
                exclusivity: sale.exclusivity,
            });
            if (!compatibility.available) {
                updatedSaleIds.push(sale.id);
                return { ...sale, status: 'WITHDRAWN' as const, resolvedAtAbsoluteWeek: absoluteWeek, lastProcessedAbsoluteWeek: absoluteWeek };
            }
        }
        const interest = interestFor(production);
        const interestChanged = interest.score !== sale.publicInterestScore
            || interest.label !== sale.publicInterest
            || interest.drivers.join('|') !== sale.publicInterestDrivers.join('|');
        if (plannedAvailabilityAbsoluteWeek === sale.plannedAvailabilityAbsoluteWeek && !interestChanged) return sale;
        if (!updatedSaleIds.includes(sale.id)) updatedSaleIds.push(sale.id);
        if (sale.winningContractId) {
            catalogLicenses = catalogLicenses.map(license => license.id === sale.winningContractId ? {
                ...license,
                startsAtAbsoluteWeek: plannedAvailabilityAbsoluteWeek,
                expiresAtAbsoluteWeek: license.permanentPurchase
                    ? Number.MAX_SAFE_INTEGER
                    : plannedAvailabilityAbsoluteWeek + license.durationWeeks,
            } : license);
            const contract = streamingRightsContracts[sale.winningContractId];
            if (contract) streamingRightsContracts[sale.winningContractId] = {
                ...contract,
                startsAtAbsoluteWeek: plannedAvailabilityAbsoluteWeek,
                expiresAtAbsoluteWeek: contract.permanentPurchase
                    ? Number.MAX_SAFE_INTEGER
                    : plannedAvailabilityAbsoluteWeek + contract.durationWeeks,
            };
        }
        if (plannedAvailabilityAbsoluteWeek > sale.plannedAvailabilityAbsoluteWeek) {
            delayFacts.push(createIndustryEventFact({
                idempotencyKey: `upcoming-rights-delay:${sale.id}:${plannedAvailabilityAbsoluteWeek}`,
                absoluteWeek,
                type: 'PROJECT_DELAYED',
                importance: sale.publicInterest === 'EVENT' ? 'HIGH' : 'MEDIUM',
                companyId: sale.sellerId,
                companyName: sale.sellerName,
                projectId: sale.sourceProjectId,
                productionId: sale.sourceProductionId,
                headline: `${sale.title} moves to a later window`,
                detail: `The canonical production schedule now points to absolute week ${releaseWeek}; contracted streaming availability follows in week ${plannedAvailabilityAbsoluteWeek}.`,
                evidence: [
                    { kind: 'PRODUCTION', id: sale.sourceProductionId },
                    { kind: 'PROJECT', id: sale.sourceProjectId },
                    ...(sale.winningContractId ? [{ kind: 'RIGHTS_CONTRACT' as const, id: sale.winningContractId }] : []),
                ],
            }));
        }
        return {
            ...sale,
            plannedAvailabilityAbsoluteWeek,
            publicInterestScore: interest.score,
            publicInterest: interest.label,
            publicInterestDrivers: interest.drivers,
            lastProcessedAbsoluteWeek: absoluteWeek,
        };
    });
    const openedSaleIds: string[] = [];
    const inbox = [...player.inbox];
    const progressedSales = reconciledSales.map(sale => {
        if (sale.status !== 'ANNOUNCED' || sale.opensAtAbsoluteWeek > absoluteWeek) return sale;
        openedSaleIds.push(sale.id);
        const notificationId = sale.followedAtAbsoluteWeek == null
            ? null
            : sale.openedNotificationId || createDeterministicId('streaming_upcoming_rights_message', sale.id);
        if (notificationId && !inbox.some(message => message.id === notificationId)) {
            inbox.unshift({
                id: notificationId,
                type: 'RIGHTS_NEGOTIATION',
                sender: 'Content Market',
                subject: `Bidding is open for ${sale.title}`,
                text: `${sale.sellerName}'s live rights auction is open now. The saved agreement would become available from week ${sale.plannedAvailabilityAbsoluteWeek}.`,
                weekSent: (absoluteWeek % 52) + 1,
                isRead: false,
                data: {
                    streamingUpcomingRightsSaleId: sale.id,
                    streamingBuyerAuctionId: createDeterministicId('streaming_buyer_auction_lot', sale.id),
                },
            } as Player['inbox'][number]);
        }
        return { ...sale, status: 'LIVE' as const, openedNotificationId: notificationId, lastProcessedAbsoluteWeek: absoluteWeek };
    });
    if (!created.length && !openedSaleIds.length && !updatedSaleIds.length) {
        return { player, createdSaleIds: [], openedSaleIds: [], updatedSaleIds: [] };
    }
    return {
        player: {
            ...player,
            inbox,
            world: {
                ...player.world,
                streamingRightsContracts,
                industryEvents: appendIndustryEventFacts(player.world.industryEvents, [...announcementFacts, ...delayFacts]),
            },
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                upcomingRightsSales: progressedSales,
                catalogLicenses,
            }, player.id),
        },
        createdSaleIds: created.map(sale => sale.id),
        openedSaleIds,
        updatedSaleIds,
    };
};
