import { filedMarketFixture } from './streamingFiledMarketFixture';
import {
    getContentMarketListings, getContentMarketCollections, purchaseContentMarketListing,
    purchaseContentMarketCollection, isContentMarketAuctionListing, isContentMarketAuctionCollection,
} from '../../services/streamingContentMarket';
import { getStreamingBuyerAuctionLots, openStreamingBuyerAuction } from '../../services/streamingBuyerAuctions';
import { skipStreamingHqTour } from '../../services/streamingHq';
import { getStreamingOpportunityCards, purchaseStreamingOpportunityOffer } from '../../services/streamingOpportunityMarket';
import { refreshStreamingPaidScout } from '../../services/paidMarketScouting';

/** Disposable only: normal filing/acquisition services; never career storage. */
export const streamingCatalogueScaleFixture = (titleCount = 52, nowMs = 1_000) => {
    let player = filedMarketFixture();
    const lot = getStreamingBuyerAuctionLots(player).find(row => row.listingKind === 'TITLE' && !row.upcomingRightsSaleId);
    if (!lot) throw new Error('Expected a title auction for the scale fixture.');
    const opened = openStreamingBuyerAuction(player, lot.id, nowMs);
    if (!opened.session) throw new Error('Expected a real reserved auction.');
    player = opened.player;
    while (player.ownedStreamingPlatform.catalogLicenses.length < titleCount) {
        const beforeCount = player.ownedStreamingPlatform.catalogLicenses.length;
        const gap = titleCount - player.ownedStreamingPlatform.catalogLicenses.length;
        const collection = getContentMarketCollections(player)
            .find(row => row.rows.length > 0 && row.rows.length <= gap && !isContentMarketAuctionCollection(player, row.id));
        const listing = collection ? null : getContentMarketListings(player)
            .find(row => !row.unavailableReason && !isContentMarketAuctionListing(player, row.id));
        const opportunity = collection || listing ? null : getStreamingOpportunityCards(player, { includeCollections: false })
            .individuals.find(row => !player.world.projects.some(project => project.id === row.projectId));
        if (!collection && !listing && !opportunity) {
            const scouted = refreshStreamingPaidScout(player);
            if (!scouted.changed) throw new Error(scouted.detail);
            player = scouted.player;
            continue;
        }
        const result = collection
            ? purchaseContentMarketCollection(player, collection.id, collection.signature)
            : listing ? purchaseContentMarketListing(player, listing.id, listing.signature)
                : purchaseStreamingOpportunityOffer(player, opportunity!.id);
        if (!result.changed) throw new Error(result.detail);
        player = result.player;
        if (player.ownedStreamingPlatform.catalogLicenses.length <= beforeCount) throw new Error('Fixture acquisition made no catalogue progress.');
    }
    player = skipStreamingHqTour(player);
    return { player, session: player.ownedStreamingPlatform.buyerAuctionSessions.find(row => row.id === opened.session!.id)! };
};
