import { readFileSync } from 'node:fs';

const service = readFileSync('services/rivalRetaliation.ts', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const homePage = readFileSync('views/HomePage.tsx', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

const required = [
    [service, 'getRivalRetaliationState', 'rival retaliation state calculator'],
    [service, 'processRivalRetaliation', 'weekly rival retaliation processor'],
    [service, 'rivalRetaliationEventType', 'popup discriminator'],
    [service, 'RIVAL_COUNTER_BID', 'counter-bid event type'],
    [service, 'DEFENSIVE_ALLIANCE', 'defensive alliance event type'],
    [service, 'NEGATIVE_PRESS_LEAK', 'negative press leak event type'],
    [service, 'QUIET_BACKCHANNEL', 'quiet option'],
    [service, 'PUBLIC_COUNTERMOVE', 'public option'],
    [service, 'isGolden: true', 'golden safest option'],
    [gameLoop, "import { processRivalRetaliation } from './rivalRetaliation';", 'weekly game-loop import'],
    [gameLoop, 'nextPlayer = processRivalRetaliation(nextPlayer);', 'weekly game-loop call'],
    [homePage, 'triggerPhase10RivalQa', 'cheat handler'],
    [homePage, 'Phase 10 Rival QA', 'visible cheat button'],
    [packageJson, 'audit:rival-retaliation', 'logic audit script'],
    [packageJson, 'audit:rival-retaliation-ui', 'UI audit script'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Rival retaliation UI audit missing ${description}: ${needle}`);
    }
}

const forbidden = ['poach', 'poaching'];
for (const needle of forbidden) {
    if (service.toLowerCase().includes(needle)) {
        throw new Error(`Rival retaliation should not include staff/talent poaching logic: ${needle}`);
    }
}

console.log('Rival retaliation UI audit passed.');
