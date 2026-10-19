import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { getHistoricalCatalogueTitles } from '../services/historicalCatalogue';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';
import { getContentMarketCollections, getContentMarketListings, purchaseContentMarketListing } from '../services/streamingContentMarket';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getStreamingLicenseOpportunities } from '../services/streamingCatalog';
import { getStreamingBuyerAuctionBackendCapability, getStreamingBuyerAuctionLots, openStreamingBuyerAuction, advanceStreamingBuyerAuction } from '../services/streamingBuyerAuctions';
import { visitStreamingHqSection } from '../services/streamingHq';
import { prepareExternalPlayerUpdateForUi, prepareTrustedMarketUpdateForUi } from '../services/playerUiState';
import StreamingBuyerAuctionRoom from '../components/StreamingBuyerAuctionRoom';
import StreamingDefineLaunchExperience from '../components/StreamingDefineLaunchExperience';
import StreamingPlatformHQ from '../components/StreamingPlatformHQ';

const measure = (run: () => unknown) => {
    run();
    const samples = Array.from({ length: process.argv.includes('--quick') ? 3 : 7 }, () => { const started = performance.now(); run(); return performance.now() - started; }).sort((a, b) => a - b);
    return { medianMs: +samples[Math.floor(samples.length / 2)].toFixed(2), maxMs: +samples.at(-1)!.toFixed(2), samples: samples.map(ms => +ms.toFixed(2)) };
};
for (const countries of [['US', 'IN'], WORLD_COUNTRY_DEFINITIONS.map(country => country.id)]) {
    let player = filedMarketFixture(countries);
    if (process.argv.includes('--licensed')) {
        const listing = getContentMarketListings(player)[0];
        const acquired = purchaseContentMarketListing(player, listing.id, listing.signature);
        if (!acquired.changed) throw new Error(acquired.detail);
        player = acquired.player;
    }
    const lot = getStreamingBuyerAuctionLots(player).find(row => row.listingKind === 'TITLE' && !row.upcomingRightsSaleId)!;
    const unopened = player;
    const opened = openStreamingBuyerAuction(player, lot.id, 1_000);
    if (!opened.session) throw new Error('Expected a real auction session');
    player = opened.player;
    const session = opened.session;
    const noUpdate = () => {};
    const rows = getContentMarketListings(player);
    const hash = createHash('sha256').update(JSON.stringify(rows.map(row => [row.id, row.signature]))).digest('hex');
    const availabilityHash = createHash('sha256').update(JSON.stringify(player.ownedStreamingPlatform.catalogProjectIds
        .map(id => [id, getStreamingContentAvailability(player, id)]))).digest('hex');
    console.log(JSON.stringify({ label: process.argv[2] || 'unspecified', countriesFiled: countries.length, titleCandidates: getHistoricalCatalogueTitles(player).length,
        licensedTitles: player.ownedStreamingPlatform.catalogLicenses.length, listings: rows.length, listingHash: hash, availabilityHash,
        marketListings: measure(() => getContentMarketListings(player)),
        marketCollections: measure(() => getContentMarketCollections(player)),
        openAuction: measure(() => openStreamingBuyerAuction(unopened, lot.id, 1_000)),
        discovery: measure(() => getStreamingLicenseOpportunities(player)),
        backendCapability: measure(() => getStreamingBuyerAuctionBackendCapability(player, session.lot)),
        auctionRoom: measure(() => renderToStaticMarkup(<StreamingBuyerAuctionRoom player={player} session={session} onUpdatePlayer={noUpdate} onExit={noUpdate} />)),
        launchWizard: measure(() => renderToStaticMarkup(<StreamingDefineLaunchExperience player={player} onUpdatePlayer={noUpdate} onClose={noUpdate} onOpenFinance={noUpdate} onOpenCatalogue={noUpdate} onOpenBuild={noUpdate} onOpenPricing={noUpdate} onOpenTechnology={noUpdate} />)),
        hq: measure(() => renderToStaticMarkup(<StreamingPlatformHQ player={player} onUpdatePlayer={noUpdate} onTrustedMarketUpdate={noUpdate} onBack={noUpdate} />)),
        auctionTick: measure(() => advanceStreamingBuyerAuction(player, session.id, 1, 2_000)),
        externalUpdate: measure(() => prepareExternalPlayerUpdateForUi(player)),
        trustedUpdate: measure(() => prepareTrustedMarketUpdateForUi(player)),
        revisitedHq: measure(() => visitStreamingHqSection(visitStreamingHqSection(player, 'HOME'), 'HOME')),
    }));
}
