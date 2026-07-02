import { INITIAL_PLAYER } from '../types';
import { getEntertainmentStockSnapshot } from '../services/entertainmentStockMarket';
import { initializeStocks } from '../services/stockLogic';

const stocks = initializeStocks();
const disney = stocks.find(stock => stock.relatedStudioId === 'DISNEY_PLUS');

if (!disney) {
    throw new Error('Entertainment market should include the Disney-linked studio stock.');
}

const player = {
    ...INITIAL_PLAYER,
    stocks,
    portfolio: [{ stockId: disney.id, shares: 18_200_000 }],
    world: {
        ...INITIAL_PLAYER.world,
        projects: [
            {
                id: 'market_hit_1',
                title: 'Kingdom Event',
                studioId: 'DISNEY_PLUS',
                year: 31,
                weekReleased: 20,
                boxOffice: 980_000_000,
                quality: 88,
                reviews: 'BLOCKBUSTER',
            },
            {
                id: 'market_flop_1',
                title: 'Quiet Launch',
                studioId: 'DISNEY_PLUS',
                year: 31,
                weekReleased: 10,
                boxOffice: 45_000_000,
                quality: 48,
                reviews: 'FLOP',
            },
        ] as any[],
    },
};

const snapshot = getEntertainmentStockSnapshot(player, disney);

if (!snapshot.isEntertainment || snapshot.companyType !== 'ENTERTAINMENT_STUDIO') {
    throw new Error('Studio-linked media stocks should resolve as entertainment companies.');
}
if (snapshot.marketCap <= 0) {
    throw new Error('Entertainment stock snapshot should expose market cap.');
}
if (snapshot.ownershipPercent <= 0.9 || snapshot.ownershipPercent >= 1.1) {
    throw new Error(`Expected roughly 1% ownership, received ${snapshot.ownershipPercent}%.`);
}
if (snapshot.hits !== 1 || snapshot.flops !== 1) {
    throw new Error(`Expected one hit and one flop, received ${snapshot.hits}/${snapshot.flops}.`);
}
if (!snapshot.primaryDriver.includes('Kingdom Event')) {
    throw new Error('Latest studio release should be visible as the primary market driver.');
}
if (!snapshot.performanceLabel || !snapshot.momentumLabel) {
    throw new Error('Entertainment snapshot should provide readable performance signals.');
}

console.log('Entertainment stocks audit passed.');
