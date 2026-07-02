import { readFileSync } from 'node:fs';

const app = readFileSync('App.tsx', 'utf8');
const modal = readFileSync('components/StockControlEventModal.tsx', 'utf8');
const mobilePage = readFileSync('views/mobile/MobilePage.tsx', 'utf8');
const types = readFileSync('types.ts', 'utf8');

const required = [
    [types, "'STOCK_CONTROL'", 'dedicated scheduled event type'],
    [app, '<StockControlEventModal', 'app-level stock control modal rendering'],
    [app, 'setInitialForbesStudioId', 'acquisition desk navigation state'],
    [app, 'setInitialMobileStockId', 'stock review navigation state'],
    [modal, 'Majority Control Decision', 'dedicated control event headline'],
    [modal, 'Open Acquisition Desk', 'primary acquisition action'],
    [modal, 'Review Stock Position', 'secondary review action'],
    [mobilePage, 'initialStockId', 'mobile stock deep-link prop'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Stock control event UI audit missing ${description}: ${needle}`);
    }
}

if (modal.includes('isGolden') || modal.includes('Reward Ad')) {
    throw new Error('Stock control modal should not expose a golden rewarded-ad option.');
}
if (modal.includes('Clean Board Transition')) {
    throw new Error('Stock control modal should not expose the old golden board transition option.');
}

console.log('Stock control event UI audit passed.');
