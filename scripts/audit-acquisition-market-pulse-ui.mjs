import { readFileSync } from 'node:fs';

const service = readFileSync('services/acquisitionMarketPulse.ts', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const homePage = readFileSync('views/HomePage.tsx', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

const required = [
    [service, 'getAcquisitionMarketPulseState', 'market pulse state calculator'],
    [service, 'processAcquisitionMarketPulse', 'weekly market pulse processor'],
    [service, 'marketMood', 'market mood state'],
    [service, 'franchiseValueDelta', 'franchise value movement'],
    [service, 'investorConfidenceDelta', 'investor confidence movement'],
    [service, 'makeAcquisitionNewsChain', 'rich news chain builder'],
    [gameLoop, "import { processAcquisitionMarketPulse } from './acquisitionMarketPulse';", 'weekly game-loop import'],
    [gameLoop, 'nextPlayer = processAcquisitionMarketPulse(nextPlayer);', 'weekly game-loop call'],
    [homePage, 'triggerPhase10MarketPulseQa', 'cheat handler'],
    [homePage, 'Phase 10 Market Pulse QA', 'visible cheat button'],
    [packageJson, 'audit:acquisition-market-pulse', 'logic audit script'],
    [packageJson, 'audit:acquisition-market-pulse-ui', 'UI audit script'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Acquisition market pulse UI audit missing ${description}: ${needle}`);
    }
}

console.log('Acquisition market pulse UI audit passed.');
