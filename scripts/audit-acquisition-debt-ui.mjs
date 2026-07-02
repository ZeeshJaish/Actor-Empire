import { readFileSync } from 'node:fs';

const service = readFileSync('services/acquisitionDebt.ts', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const worldReactions = readFileSync('services/worldReactions.ts', 'utf8');
const commandCenter = readFileSync('views/lifestyle/business/OwnedStudioCommandCenter.tsx', 'utf8');
const homePage = readFileSync('views/HomePage.tsx', 'utf8');

const required = [
    [service, 'syncAcquisitionDebtLedger', 'debt ledger migration helper'],
    [service, 'processAcquisitionDebtService', 'weekly service processor'],
    [service, 'payDownAcquisitionDebt', 'player pay-down action'],
    [gameLoop, "import { processAcquisitionDebtService } from './acquisitionDebt';", 'game loop debt import'],
    [gameLoop, 'processAcquisitionDebtService(nextPlayer)', 'game loop weekly service call'],
    [worldReactions, 'getAcquisitionDebtSummary', 'world reaction ledger pressure read'],
    [commandCenter, 'Acquisition Debt', 'finance tab debt section label'],
    [commandCenter, 'Weekly Interest', 'weekly interest UI label'],
    [commandCenter, 'Pay Down', 'pay-down UI label'],
    [commandCenter, 'payDownAcquisitionDebt', 'command center uses real debt paydown logic'],
    [commandCenter, 'fillDebtPaydownPreset', 'quick amount chips should fill the input before confirmation'],
    [commandCenter, 'setDebtPaydownAmount(formatDebtInputAmount', 'quick amount chips should write formatted amounts into the field'],
    [homePage, 'triggerPhase10DebtQa', 'Phase 10 debt cheat handler'],
    [homePage, 'Phase 10 Debt QA', 'visible debt QA cheat button'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Acquisition debt UI audit missing ${description}: ${needle}`);
    }
}

if (commandCenter.includes('onClick={() => handleDebtPaydown(Number(value))}')) {
    throw new Error('Acquisition debt quick chips must not pay immediately; they should fill the amount field.');
}

console.log('Acquisition debt UI audit passed.');
