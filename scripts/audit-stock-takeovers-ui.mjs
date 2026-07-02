import { readFileSync } from 'node:fs';

const stocksApp = readFileSync('views/mobile/StocksApp.tsx', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

const required = [
    [stocksApp, 'Majority Control', 'simplified majority-control panel'],
    [stocksApp, 'Start Acquisition Process', 'manual control-transfer fallback'],
    [stocksApp, 'takeoverSnapshot.nextUnlockLabel', 'locked control-transfer state should explain the next unlock'],
    [stocksApp, 'Rival Defence', 'rival defence state copy'],
    [stocksApp, 'onOpenStudioAcquisition', 'acquisition desk route callback'],
    [stocksApp, 'setControlFeedback', 'manual acquisition feedback state'],
    [stocksApp, 'getStockTakeoverSnapshot', 'takeover snapshot selector'],
    [packageJson, 'audit:stock-takeovers', 'logic audit script'],
    [packageJson, 'audit:stock-decision-events', 'popup event audit script'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Stock Takeovers UI audit missing ${description}: ${needle}`);
    }
}

for (const retiredRoute of ['Friendly Takeover', 'Shareholder Alliance', 'Hostile Takeover']) {
    if (stocksApp.includes(retiredRoute)) {
        throw new Error(`Stocks UI should not expose old route button copy: ${retiredRoute}`);
    }
}

console.log('Stock takeovers UI audit passed.');
