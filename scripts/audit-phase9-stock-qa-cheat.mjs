import { readFileSync } from 'node:fs';

const homePage = readFileSync('views/HomePage.tsx', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

const required = [
    [homePage, 'triggerPhase9StockQa', 'Phase 9 stock QA cheat handler'],
    [homePage, 'Phase 9 Stock Events QA', 'visible cheat-menu button copy'],
    [homePage, 'processShareholderVoting', 'real shareholder popup engine call'],
    [homePage, 'processStockTakeoverEvents', 'real takeover popup engine call'],
    [homePage, 'stockTakeoverEventDismissals', 'takeover dismissal reset for repeatable QA'],
    [homePage, 'stockDecisionType', 'stock decision queue prioritization'],
    [packageJson, 'audit:phase9-stock-qa-cheat', 'package script for this audit'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Phase 9 stock QA cheat audit missing ${description}: ${needle}`);
    }
}

console.log('Phase 9 stock QA cheat audit passed.');
