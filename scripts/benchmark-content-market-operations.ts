import { performance } from 'node:perf_hooks';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { prepareExternalPlayerUpdateForUi, prepareProcessedWeekForUi } from '../services/playerUiState';
import {
    getContentMarketListings, getContentMarketCollections, getContentMarketOwnedTitles,
    getContentMarketAuctionAssignments,
} from '../services/streamingContentMarket';
import { getHistoricalCatalogueTitles } from '../services/historicalCatalogue';
import { getStreamingBuyerAuctionLots } from '../services/streamingBuyerAuctions';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingContentMarket from '../components/StreamingContentMarket';

const player = contentMarketFixture();
player.world.projects = Array.from({ length: 2_000 }, (_, index) => ({
    id: `benchmark-film-${index}`, title: `Benchmark Film ${index}`, studioId: `studio-${index % 40}`,
    mediaType: 'MOVIE', genre: 'DRAMA', rating: 7, year: 24, boxOffice: 50_000_000,
} as any));
player.pastProjects = Array.from({ length: 2_000 }, (_, index) => ({
    id: `past-${index}`, title: `Past Film ${index}`, awards: [],
} as any));

const measure = (name: string, run: () => unknown) => {
    const samples: number[] = [];
    for (let index = 0; index < 6; index += 1) {
        const start = performance.now();
        run();
        if (index > 0) samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    console.log(`${name}: median ${samples[2].toFixed(1)}ms, range ${samples[0].toFixed(1)}-${samples[4].toFixed(1)}ms`);
};

measure('full-player UI migration', () => prepareExternalPlayerUpdateForUi(player));
measure('canonical-player UI finalize', () => prepareProcessedWeekForUi(player));
measure('market listings', () => getContentMarketListings(player));
measure('market collections', () => getContentMarketCollections(player));
measure('historical catalogue', () => getHistoricalCatalogueTitles(player));
measure('live auction lots', () => getStreamingBuyerAuctionLots(player));
measure('live auction lots with prepared market inputs', () => {
    const listings = getContentMarketListings(player);
    const collections = getContentMarketCollections(player);
    const assignments = getContentMarketAuctionAssignments(player, { listings, collections });
    return getStreamingBuyerAuctionLots(player, { listings, collections, assignments });
});
measure('own-studio eligible titles', () => getContentMarketOwnedTitles(player));
const brand = {
    name: 'Empire+', markId: 'FRAME_PLAY', customMark: null,
    hue: 252, sat: 88, identId: 'PULSE', customIdent: null,
    promiseId: 'BALANCED', publicManifesto: 'Stories worth gathering for.',
    layoutId: 'CINEMA', typeId: 'GROTESK', accentHue: 35,
    identMode: 'badge', identLen: 2,
    ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null,
} as any;
const renderMarket = () => renderToStaticMarkup(React.createElement(StreamingContentMarket, {
    player, brand, onUpdatePlayer: () => undefined, onClose: () => undefined,
    onOpenFinance: () => undefined, onCommission: () => undefined, onReview: () => undefined,
}));
measure('market SSR gate', renderMarket);
