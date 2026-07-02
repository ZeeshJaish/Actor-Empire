import { readFileSync } from 'node:fs';

const stocksApp = readFileSync('views/mobile/StocksApp.tsx', 'utf8');
const app = readFileSync('App.tsx', 'utf8');

const required = [
    [stocksApp, "'SHARES' | 'CASH' | 'OWNERSHIP'", 'three consistent order modes'],
    [stocksApp, 'Target Ownership', 'ownership-target order mode'],
    [stocksApp, 'Resulting Ownership', 'pre-trade ownership preview'],
    [stocksApp, 'Price Impact', 'large-order price impact preview'],
    [stocksApp, 'Average Cost', 'position cost basis'],
    [stocksApp, 'Gain / Loss', 'position performance'],
    [stocksApp, '10% Influence', 'first influence threshold marker'],
    [stocksApp, 'Row Ownership Progress', 'main stock-list ownership progress line'],
    [app, 'executeStockTrade', 'centralized stock execution'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Minority Stakes UI audit missing ${description}: ${needle}`);
    }
}

const tradeIndex = stocksApp.indexOf("{tr('stocks.trade')}");
const chartIndex = stocksApp.indexOf("{tr('stocks.weekTrend')}");
if (tradeIndex === -1 || chartIndex === -1 || tradeIndex > chartIndex) {
    throw new Error('Minority Stakes UI audit expected the buy/sell trade panel before the 12 week trend chart.');
}

console.log('Minority stakes UI audit passed.');
