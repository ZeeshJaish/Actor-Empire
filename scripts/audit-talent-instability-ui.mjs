import { readFileSync } from 'node:fs';

const service = readFileSync('services/talentInstability.ts', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const homePage = readFileSync('views/HomePage.tsx', 'utf8');
const commandCenter = readFileSync('views/lifestyle/business/OwnedStudioCommandCenter.tsx', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

const required = [
    [service, 'processTalentInstability', 'weekly talent instability processor'],
    [service, 'getTalentInstabilityState', 'talent instability state calculator'],
    [service, 'talentInstabilityEventType', 'popup discriminator'],
    [service, 'HOLD_THE_LINE', 'departure choice'],
    [service, 'isGolden: true', 'golden retention option'],
    [gameLoop, "import { processTalentInstability } from './talentInstability';", 'weekly game-loop import'],
    [gameLoop, 'nextPlayer = processTalentInstability(nextPlayer);', 'weekly game-loop call'],
    [homePage, 'triggerPhase10TalentQa', 'cheat handler'],
    [homePage, 'Phase 10 Talent QA', 'visible cheat button'],
    [commandCenter, 'getTalentInstabilityState', 'command center talent state'],
    [commandCenter, 'Talent Stability', 'command center talent panel'],
    [packageJson, 'audit:talent-instability', 'logic audit script'],
    [packageJson, 'audit:talent-instability-ui', 'UI audit script'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Talent instability UI audit missing ${description}: ${needle}`);
    }
}

console.log('Talent instability UI audit passed.');
