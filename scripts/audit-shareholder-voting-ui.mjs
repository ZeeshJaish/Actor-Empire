import { readFileSync } from 'node:fs';

const stocksApp = readFileSync('views/mobile/StocksApp.tsx', 'utf8');
const mobilePage = readFileSync('views/mobile/MobilePage.tsx', 'utf8');
const messagesApp = readFileSync('views/mobile/MessagesApp.tsx', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const shareholderVoting = readFileSync('services/shareholderVoting.ts', 'utf8');

const required = [
    [stocksApp, 'Influence Ladder', 'compact influence ladder'],
    [shareholderVoting, 'Shareholder Decision', 'shareholder decision popup title'],
    [shareholderVoting, 'Let Advisors Handle It', 'golden rewarded-ad safety option'],
    [shareholderVoting, 'isGolden: true', 'golden option flag'],
    [shareholderVoting, 'resolveShareholderVote', 'popup ballot resolution'],
    [mobilePage, 'initialStockId', 'message-to-stock targeting'],
    [messagesApp, 'Open Shareholder Vote', 'direct inbox action'],
    [gameLoop, 'processShareholderVoting(nextPlayer)', 'weekly shareholder-vote engine'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Shareholder Voting UI audit missing ${description}: ${needle}`);
    }
}

for (const retiredStockDecisionCopy of ['Shareholder Ballot', 'Expected Support', 'Vote For', 'Vote Against']) {
    if (stocksApp.includes(retiredStockDecisionCopy)) {
        throw new Error(`Stocks app should not show shareholder decision copy now that ballots are popup events: ${retiredStockDecisionCopy}`);
    }
}

console.log('Shareholder voting UI audit passed.');
