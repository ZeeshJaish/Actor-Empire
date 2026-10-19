import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { streamingCatalogueScaleFixture } from './helpers/streamingCatalogueScaleFixture';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { getStreamingLaunchReadiness } from '../services/streamingLaunch';
import { setStreamingDefineLaunchStep } from '../services/streamingLaunchProgram';
import { advanceStreamingBuyerAuction } from '../services/streamingBuyerAuctions';
import StreamingPlatformHQ from '../components/StreamingPlatformHQ';
import StreamingDefineLaunchExperience from '../components/StreamingDefineLaunchExperience';
import StreamingBuyerAuctionRoom from '../components/StreamingBuyerAuctionRoom';
const noUpdate = () => {};
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const measure = (run: () => unknown) => {
    run();
    const samples = Array.from({ length: 3 }, () => {
        const start = performance.now(); run(); return +(performance.now() - start).toFixed(2);
    }).sort((a, b) => a - b);
    return { medianMs: samples[1], minMs: samples[0], maxMs: samples[2], samples };
};
for (const count of [52, 104]) {
    const { player, session } = streamingCatalogueScaleFixture(count);
    const hq = (value = player, room = false) => renderToStaticMarkup(<StreamingPlatformHQ player={value}
        onUpdatePlayer={noUpdate} onTrustedMarketUpdate={noUpdate} onBack={noUpdate}
        initialContentMarketOfferId={room ? session.id : undefined} />);
    const ticked = advanceStreamingBuyerAuction(player, session.id, 1, 2_000).player;
    console.log(JSON.stringify({ label: process.argv[2] || 'unspecified', countriesFiled: player.ownedStreamingPlatform.marketOperations.length,
        licensedTitles: player.ownedStreamingPlatform.catalogLicenses.length,
        availabilityHash: hash(player.ownedStreamingPlatform.catalogProjectIds.map(id => [id, getStreamingContentAvailability(player, id)])),
        openingCatalogueHash: hash(getStreamingOpeningCatalogueView(player)),
        launchReadinessHash: hash(getStreamingLaunchReadiness(player)),
        hq: measure(() => hq()),
        hqWithRoom: measure(() => hq(player, true)),
        hqWithRoomAfterTick: measure(() => hq(ticked, true)),
        isolatedRoom: measure(() => renderToStaticMarkup(<StreamingBuyerAuctionRoom player={player} session={session} onUpdatePlayer={noUpdate} onExit={noUpdate} />)),
        wizard: measure(() => renderToStaticMarkup(<StreamingDefineLaunchExperience player={player} onUpdatePlayer={noUpdate}
            onClose={noUpdate} onOpenFinance={noUpdate} onOpenCatalogue={noUpdate} onOpenBuild={noUpdate} onOpenPricing={noUpdate} onOpenTechnology={noUpdate} />)),
        stepSave: measure(() => setStreamingDefineLaunchStep(player, 'PRICING')),
    }));
}
