import { readFileSync } from 'node:fs';

const stocksApp = readFileSync('views/mobile/StocksApp.tsx', 'utf8');
const mobilePage = readFileSync('views/mobile/MobilePage.tsx', 'utf8');
const messagesApp = readFileSync('views/mobile/MessagesApp.tsx', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const shareholderVoting = readFileSync('services/shareholderVoting.ts', 'utf8');

const required = [
    [stocksApp, "tr('stocks.influence.ladder')", 'localized compact influence ladder'],
    [shareholderVoting, "t(language, 'life.event.shareholder.title'", 'localized shareholder decision popup title'],
    [shareholderVoting, "t(language, 'life.event.shareholder.advisor.label')", 'localized golden rewarded-ad safety option'],
    [shareholderVoting, 'isGolden: true', 'golden option flag'],
    [shareholderVoting, 'resolveShareholderVote', 'popup ballot resolution'],
    [mobilePage, 'onResolveShareholderVote', 'message-to-ballot resolver'],
    [mobilePage, "resolveShareholderVote(props.player!, voteId, selectedVote)", 'exact saved ballot resolution'],
    [messagesApp, 'activeShareholderVoteId', 'recoverable inbox ballot state'],
    [messagesApp, 'handleOpenShareholderBallot', 'direct inbox ballot action'],
    [messagesApp, 'role="dialog"', 'accessible in-phone ballot sheet'],
    [messagesApp, 'Vote against', 'against ballot action'],
    [messagesApp, 'Vote for', 'for ballot action'],
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

if (messagesApp.includes('onOpenStock?.(selectedMessage.data?.stockId)')) {
    throw new Error('Shareholder inbox action must open the saved ballot, not the generic stock profile.');
}

console.log('Shareholder voting UI audit passed.');
