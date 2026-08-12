import { readFileSync } from 'node:fs';

const youtubeApp = readFileSync('views/mobile/YoutubeApp.tsx', 'utf8');
const youtubeLogic = readFileSync('services/youtubeLogic.ts', 'utf8');
const types = readFileSync('types.ts', 'utf8');

const required = [
    [youtubeLogic, 'resolveYoutubeMerchDrop', 'central merch settlement service'],
    [youtubeLogic, "category: 'BUSINESS' as const", 'gross sales ledger entry'],
    [youtubeLogic, "category: 'EXPENSE' as const", 'production cost ledger entry'],
    [types, 'lastMerchOutcome?:', 'persisted merch outcome'],
    [youtubeApp, 'lastMerchOutcome.netProfit', 'visible net result'],
    [youtubeApp, "tr('youtube.merch.outcome.grossSales')", 'gross sales label'],
    [youtubeApp, "tr('youtube.merch.outcome.productionCost')", 'production cost label'],
    [youtubeApp, 'aria-live="polite"', 'accessible result announcement'],
    [youtubeApp, "tr('youtube.merch.outcome.cashSettled')", 'clear settlement confirmation'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`YouTube merch UI audit missing ${description}: ${needle}`);
    }
}

if (youtubeApp.includes('money: player.money - tier.cost + gross')) {
    throw new Error('YouTube merch cash math must not be hand-rolled inside the UI.');
}

console.log('YouTube merch UI audit passed.');
