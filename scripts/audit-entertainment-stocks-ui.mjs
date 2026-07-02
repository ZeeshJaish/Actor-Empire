import { readFileSync } from 'node:fs';

const stocksApp = readFileSync('views/mobile/StocksApp.tsx', 'utf8');

const required = [
    ["tr('stocks.title')", 'original Stocks app identity'],
    ["tr('stocks.market')", 'original market tab'],
    ["tr('stocks.portfolio')", 'original portfolio tab'],
    ['rounded-xl border border-zinc-800', 'compact original stock-row language'],
    ['Ownership', 'ownership-position context'],
    ['Ownership Progress', 'minimal ownership progress meter'],
    ['Shares Issued', 'explicit issued-share detail'],
    ['Public Float', 'public-float detail'],
    ['formatCompactNumber(getStockOutstandingShares(selectedStock))', 'share count display derived from stock structure'],
    ['getEntertainmentStockSnapshot', 'shared entertainment-stock selector'],
    ['selectedStockId', 'live selected-stock state after trading'],
    ['stockScrollRef.current.scrollTop = 0', 'detail-view scroll reset'],
];

for (const [needle, description] of required) {
    if (!stocksApp.includes(needle)) {
        throw new Error(`Entertainment Stocks UI audit missing ${description}: ${needle}`);
    }
}

if (!stocksApp.includes('snapshot.isEntertainment')) {
    throw new Error('Stocks UI should visibly distinguish true entertainment-studio equities.');
}

if (stocksApp.includes('Entertainment Exchange') || stocksApp.includes('Market Command')) {
    throw new Error('Stocks UI should preserve the original Stocks app identity instead of a replacement terminal concept.');
}

if (stocksApp.includes('Studio Performance') || stocksApp.includes('Market Driver')) {
    throw new Error('Detailed Stocks view should not include a separate studio-performance panel.');
}

if (stocksApp.includes('studioStock ? (')) {
    throw new Error('Main stock cards should not add a second studio metrics strip.');
}

if (stocksApp.includes('shadow-[inset_3px_0_0_#38bdf8]')) {
    throw new Error('Entertainment companies should not receive a blue highlight in the main stock list.');
}

if (stocksApp.includes('{studioStock ? <Building2')) {
    throw new Error('Entertainment companies should not receive a studio icon in the main stock list.');
}

console.log('Entertainment stocks UI audit passed.');
