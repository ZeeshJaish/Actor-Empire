import { readFileSync } from 'node:fs';

const service = readFileSync('services/regulatorPressure.ts', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const homePage = readFileSync('views/HomePage.tsx', 'utf8');
const studioAcquisition = readFileSync('services/studioAcquisition.ts', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

const required = [
    [service, 'getRegulatorPressureState', 'regulator state calculator'],
    [service, 'processRegulatorPressure', 'weekly regulator processor'],
    [service, 'regulatorPressureEventType', 'popup discriminator'],
    [service, 'REGULATOR_REVIEW', 'review event type'],
    [service, 'REVIEW_CLEARED', 'review-cleared inbox action'],
    [service, 'reviewCooldownWeeksRemaining', 'review cooling-off protection'],
    [service, 'isGolden: true', 'golden safest option'],
    [gameLoop, "import { processRegulatorPressure } from './regulatorPressure';", 'weekly game-loop import'],
    [gameLoop, 'nextPlayer = processRegulatorPressure(nextPlayer);', 'weekly game-loop call'],
    [studioAcquisition, 'REGULATOR_REVIEW_ACTIVE', 'acquisition offer block reason'],
    [studioAcquisition, 'getRegulatorAdjustedDiligenceFee', 'regulator diligence surcharge'],
    [homePage, 'triggerPhase10RegulatorQa', 'cheat handler'],
    [homePage, 'Phase 10 Regulator QA', 'visible cheat button'],
    [packageJson, 'audit:regulator-pressure', 'logic audit script'],
    [packageJson, 'audit:regulator-pressure-ui', 'UI audit script'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Regulator pressure UI audit missing ${description}: ${needle}`);
    }
}

console.log('Regulator pressure UI audit passed.');
