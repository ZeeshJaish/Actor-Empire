import type { Player, StreamingStarterCatalogPackageId } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getEligibleOwnedStreamingTitles, STREAMING_STARTER_CATALOG_PACKAGES } from './streamingCatalog';
import {
    createDefaultStreamingRightsTerms, getOwnedPlatformPackageCountryIds, getStreamingRightsOpportunities,
    getStreamingCataloguePackageOpportunities, openStreamingPrivateOffer, openStreamingRightsNegotiation, signStreamingRightsDeal,
    signOwnedStreamingCataloguePackage,
    type StreamingRightsActionResult,
    type StreamingRightsTermsInput,
} from './streamingRightsMarketplace';
import { resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { getOwnedTitleCountryAccess } from './streamingContentAvailability';
import { createDeterministicId, hashDeterministicSeed } from './deterministicRandom';
import { getStreamingMarketSupplyProfile } from './streamingMarketSupply';

export { followStreamingUpcomingRightsSale, getStreamingUpcomingRightsSales, processStreamingUpcomingRightsWeek } from './streamingUpcomingRights';

export const getContentMarketFunds = (player: Player): number => {
    const p = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const committed = p.costCommitments.filter(c => c.status === 'COMMITTED').reduce((sum, c) => sum + c.committedAmount, 0);
    return Math.max(0, p.treasuryCash - committed);
};

export const getContentMarketListings = (player: Player) => {
    const p = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const countries = getOwnedPlatformPackageCountryIds(p);
    return getStreamingRightsOpportunities(player).filter(o => ['STUDIO_ACQUISITION', 'PLATFORM_TRADE'].includes(o.kind)).map(o => {
        const terms = { ...createDefaultStreamingRightsTerms(o), minimumGuarantee: o.quote.suggestedGuarantee,
            platformRevenueShare: o.sourceLicenseId ? 100 - o.inheritedLicensorRevenueShare : o.quote.targetPlatformRevenueShare,
            marketingGuarantee: 0, viewershipBonusThreshold: 0, viewershipBonusAmount: 0,
            renewalOption: false, sublicensingAllowed: false, sequelRightsIncluded: false, cancellationPenalty: 0 };
        const source = o.sourceLicenseId ? player.world.streamingRightsContracts?.[o.sourceLicenseId] : null;
        const countryIds = terms.territory === 'GLOBAL' ? [] : o.sourceLicenseId ? o.countryIds : countries;
        const compatibility = resolveStreamingRightsCompatibility({ world: player.world, sourceProjectId: o.title.id,
            buyerPlatformId: null, sellerPartyId: o.sellerId, territory: terms.territory, countryIds,
            startsAtAbsoluteWeek: source?.startsAtAbsoluteWeek ? Math.max(week, source.startsAtAbsoluteWeek) : week,
            expiresAtAbsoluteWeek: source?.expiresAtAbsoluteWeek || week + terms.durationWeeks,
            windowType: terms.windowType, exclusivity: terms.exclusivity,
            excludeContractIds: o.sourceLicenseId ? [o.sourceLicenseId] : [],
        });
        const unavailableReason = source && source.startsAtAbsoluteWeek > week ? 'This title is not available yet.'
            : !compatibility.available ? compatibility.summary : o.incompatibilityDetail;
        // The displayed contract snapshot is checked again on acceptance; no silently revised price/scope.
        const signature = JSON.stringify([o.id, terms, countryIds, source]);
        return { ...o, terms, countryIds, unavailableReason, signature, inheritedContract: source };
    });
};

export interface ContentMarketAuctionAssignments {
    listingIds: Set<string>;
    collectionIds: Set<string>;
}

export interface ContentMarketSupplySummary {
    directListings: number;
    collections: number;
    collectionTitles: number;
    liveAuctions: number;
    totalCanonicalTitles: number;
    foundingBoost: boolean;
    nextRotationAbsoluteWeek: number;
}

/** One deterministic auction allocation shared by title and package inventory. */
export const getContentMarketAuctionAssignments = (player: Player): ContentMarketAuctionAssignments => {
    const profile = getStreamingMarketSupplyProfile(player);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const liveProjectIds = new Set(platform.buyerAuctionSessions
        .filter(session => session.status === 'LIVE')
        .map(session => session.lot.sourceProjectId));
    const livePackageIds = new Set(platform.buyerAuctionSessions
        .filter(session => session.status === 'LIVE')
        .map(session => session.lot.cataloguePackageId)
        .filter((id): id is string => Boolean(id)));
    const listings = getContentMarketListings(player)
        .filter(listing => !listing.unavailableReason && !listing.sourceLicenseId)
        .filter(listing => !liveProjectIds.has(listing.title.id));
    const collections = getContentMarketCollections(player)
        .filter(collection => !livePackageIds.has(collection.id))
        .filter(collection => !collection.package.components.some(component => liveProjectIds.has(component.sourceProjectId)));
    const score = (kind: 'TITLE' | 'COLLECTION', id: string): number => hashDeterministicSeed([
        platform.simulationSeed,
        'content-market-auction',
        profile.cycle,
        kind,
        id,
    ].join(':'));
    // Keep the leading commercial headliner available for immediate purchase;
    // auctions draw from the remaining eligible discovery shelf.
    const titleCandidates = listings.slice(listings.length > 1 ? 1 : 0)
        .map(listing => ({ kind: 'TITLE' as const, id: listing.id }));
    const collectionCandidates = collections.map(collection => ({ kind: 'COLLECTION' as const, id: collection.id }));
    const selected: Array<{ kind: 'TITLE' | 'COLLECTION'; id: string }> = [];
    if (titleCandidates.length) {
        selected.push(titleCandidates.slice().sort((left, right) => score('TITLE', right.id) - score('TITLE', left.id) || left.id.localeCompare(right.id))[0]);
    }
    if (collectionCandidates.length && selected.length < profile.auctionLimit) {
        selected.push(collectionCandidates.slice().sort((left, right) => score('COLLECTION', right.id) - score('COLLECTION', left.id) || left.id.localeCompare(right.id))[0]);
    }
    const selectedKeys = new Set(selected.map(item => `${item.kind}:${item.id}`));
    const remaining = [...titleCandidates, ...collectionCandidates]
        .filter(item => !selectedKeys.has(`${item.kind}:${item.id}`))
        .sort((left, right) => score(right.kind, right.id) - score(left.kind, left.id) || left.id.localeCompare(right.id));
    selected.push(...remaining.slice(0, Math.max(0, profile.auctionLimit - selected.length)));
    return {
        listingIds: new Set(selected.filter(item => item.kind === 'TITLE').map(item => item.id)),
        collectionIds: new Set(selected.filter(item => item.kind === 'COLLECTION').map(item => item.id)),
    };
};

export const getContentMarketAuctionListings = (player: Player) => {
    const assignments = getContentMarketAuctionAssignments(player);
    return getContentMarketListings(player).filter(listing => assignments.listingIds.has(listing.id));
};

export const isContentMarketAuctionListing = (player: Player, listingId: string): boolean => (
    getContentMarketAuctionListings(player).some(listing => listing.id === listingId)
    || normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).buyerAuctionSessions
        .some(session => session.status === 'LIVE' && session.lot.listingKind === 'TITLE' && session.lot.listingId === listingId)
);

export const submitContentMarketPrivateOffer = (
    player: Player,
    listingId: string,
    terms: StreamingRightsTermsInput,
): StreamingRightsActionResult => isContentMarketAuctionListing(player, listingId)
    ? { player, changed: false, reason: 'NOT_READY', detail: 'These rights are assigned to a live auction. Enter the auction room to compete.' }
    : openStreamingPrivateOffer(player, listingId, terms);

export const getContentMarketCollections = (player: Player, includeReservedOpportunityId?: string) => getStreamingCataloguePackageOpportunities(player, {
    includeReservedOpportunityId,
}).map(o => ({
    ...o, signature: JSON.stringify([o.id, o.totalGuarantee, o.rows]),
}));

export const getContentMarketAuctionCollections = (player: Player) => {
    const assignments = getContentMarketAuctionAssignments(player);
    return getContentMarketCollections(player).filter(collection => assignments.collectionIds.has(collection.id));
};

export const getContentMarketSupplySummary = (player: Player): ContentMarketSupplySummary => {
    const profile = getStreamingMarketSupplyProfile(player);
    const listings = getContentMarketListings(player);
    const collections = getContentMarketCollections(player);
    const assignments = getContentMarketAuctionAssignments(player);
    const collectionTitleIds = new Set(collections.flatMap(collection => (
        collection.package.components.map(component => component.sourceProjectId)
    )));
    const allTitleIds = new Set([
        ...listings.map(listing => listing.title.id),
        ...collectionTitleIds,
    ]);
    return {
        directListings: listings.length,
        collections: collections.length,
        collectionTitles: collectionTitleIds.size,
        liveAuctions: assignments.listingIds.size + assignments.collectionIds.size,
        totalCanonicalTitles: allTitleIds.size,
        foundingBoost: profile.foundingBoost,
        nextRotationAbsoluteWeek: (profile.cycle + 1) * 3,
    };
};

export const isContentMarketAuctionCollection = (player: Player, collectionId: string): boolean => (
    getContentMarketAuctionCollections(player).some(collection => collection.id === collectionId)
    || normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).buyerAuctionSessions
        .some(session => session.status === 'LIVE' && session.lot.listingKind === 'CATALOGUE_PACKAGE' && session.lot.listingId === collectionId)
);

export const getContentMarketOwnedTitles = (player: Player) => {
    const p = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const countries = getOwnedPlatformPackageCountryIds(p);
    return getEligibleOwnedStreamingTitles(player).map(title => {
        const countryIds = getOwnedTitleCountryAccess(player, title.id, countries);
        return { ...title, countryIds, excludedCountryIds: countries.filter(id => !countryIds.includes(id)),
            linked: p.catalogProjectIds.includes(title.id), unavailableReason: countryIds.length ? null : 'Streaming rights are already granted in your selected markets.' };
    });
};

export const establishContentMarketCatalogue = (player: Player, strategy?: StreamingStarterCatalogPackageId): Player => {
    const p = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!p.catalogProjectIds.length) return player;
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const ownedIds = new Set(getEligibleOwnedStreamingTitles(player).map(t => t.id));
    const packageId = strategy || p.starterCatalog?.packageId || p.catalogSetupDraft?.packageId || 'CURATED_PREMIERE';
    return { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...p,
        starterCatalog: { packageId, ownedProjectIds: p.catalogProjectIds.filter(id => ownedIds.has(id)),
            licensedProjectIds: p.catalogLicenses.map(l => l.sourceProjectId).filter((id, index, all) => all.indexOf(id) === index),
            establishedAtAbsoluteWeek: p.starterCatalog?.establishedAtAbsoluteWeek ?? week },
        milestoneKeys: Array.from(new Set([...p.milestoneKeys, 'starter-catalog-established'])),
        launchProgram: { ...p.launchProgram, configurationRevision: p.launchProgram.configurationRevision + 1 },
    }, player.id) };
};

export const saveContentMarketStrategy = (player: Player, strategy: StreamingStarterCatalogPackageId): Player => {
    if (!STREAMING_STARTER_CATALOG_PACKAGES.some(p => p.id === strategy)) return player;
    return establishContentMarketCatalogue(player, strategy);
};

export const linkContentMarketOwnedTitles = (player: Player, ids: string[]) => {
    const p = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!['FOUNDING', 'ACTIVE'].includes(p.lifecycle)) return { player, changed: false, detail: 'The platform is not accepting content.' };
    const options = getContentMarketOwnedTitles(player);
    const chosen = [...new Set(ids)].map(id => options.find(o => o.id === id));
    if (!chosen.length || chosen.some(t => !t || t.linked || t.unavailableReason)) return { player, changed: false, detail: 'Review your selection: a title is already linked or its rights are unavailable.' };
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `content-import:${[...ids].sort().join(':')}`;
    const updated = { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...p,
        catalogProjectIds: [...new Set([...p.catalogProjectIds, ...ids])],
        eventLedger: [...p.eventLedger, { id: createDeterministicId('streaming_event', p.simulationSeed, key), idempotencyKey: key,
            absoluteWeek: week, type: 'CATALOG_IMPORTED', source: 'PLAYER_ACTION',
            summary: `${ids.length} studio titles linked to the catalogue.`, metadata: { projectIds: ids, internalFee: 0 } }],
    }, player.id) };
    return { player: establishContentMarketCatalogue(updated), changed: true, detail: `${ids.length} studio titles added to your catalogue.` };
};

export const purchaseContentMarketListing = (player: Player, id: string, signature: string) => {
    const listing = getContentMarketListings(player).find(o => o.id === id);
    const fail = (detail: string) => ({ player, changed: false, detail });
    if (!listing || listing.signature !== signature) return fail('This listing changed. Review the current terms.');
    if (isContentMarketAuctionListing(player, id)) return fail('These rights are assigned to a live auction. Enter the auction room to compete.');
    if (listing.unavailableReason) return fail(listing.unavailableReason);
    if (getContentMarketFunds(player) < listing.terms.minimumGuarantee) return fail('Available funds cannot cover this agreement. Open Studio Finance.');
    const opened = openStreamingRightsNegotiation(player, id, listing.terms);
    if (!opened.changed || !opened.negotiation) return fail(opened.detail || 'This agreement is already being negotiated. Open Rights to review it.');
    const prepared = { ...opened.player, ownedStreamingPlatform: { ...opened.player.ownedStreamingPlatform,
        rightsNegotiations: opened.player.ownedStreamingPlatform.rightsNegotiations.map(n => n.id === opened.negotiation!.id
            ? { ...n, status: 'READY_TO_SIGN' as const } : n) } };
    const signed = signStreamingRightsDeal(prepared, opened.negotiation.id);
    if (!signed.changed) return fail(signed.detail || 'The agreement could not be completed. No money was charged.');
    return { player: establishContentMarketCatalogue(signed.player), changed: true, detail: `${listing.title.title} added to your catalogue.` };
};

export const purchaseContentMarketCollection = (player: Player, id: string, signature: string) => {
    const listing = getContentMarketCollections(player).find(o => o.id === id);
    const fail = (detail: string) => ({ player, changed: false, detail });
    if (!listing || listing.signature !== signature) return fail('This collection changed. Review the current terms.');
    if (isContentMarketAuctionCollection(player, id)) return fail('This collection is assigned to a live auction. Enter the auction room to compete.');
    if (getContentMarketFunds(player) < listing.totalGuarantee) return fail('Available funds cannot cover this collection. Open Studio Finance.');
    const result = signOwnedStreamingCataloguePackage(player, id);
    if (!result.changed) return fail(result.detail || (result.reason === 'INSUFFICIENT_ENERGY' ? 'Not enough energy to sign this collection.' : 'The collection could not be purchased. No money was charged.'));
    return { player: establishContentMarketCatalogue(result.player), changed: true, detail: `${listing.package.name} added to your catalogue.` };
};
