import { readFileSync } from 'node:fs';

const homePage = readFileSync('views/HomePage.tsx', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const worldReactions = readFileSync('services/worldReactions.ts', 'utf8');

const required = [
    [homePage, 'triggerPhase10WorldReactionQa', 'Phase 10 cheat handler'],
    [homePage, 'Phase 10 World Reactions QA', 'visible cheat button'],
    [homePage, 'processWorldReactions(seededPlayer)', 'cheat should run the real world reaction processor'],
    [gameLoop, "import { processWorldReactions } from './worldReactions';", 'weekly game-loop import'],
    [gameLoop, 'nextPlayer = processWorldReactions(nextPlayer);', 'weekly game-loop processing'],
    [worldReactions, 'worldReactionEventType', 'world reaction event discriminator'],
    [worldReactions, "type: 'LIFE_EVENT'", 'existing popup renderer'],
    [worldReactions, 'isGolden: true', 'golden advisor option'],
    [worldReactions, 'ANTI_MONOPOLY_PRESSURE', 'anti-monopoly popup path'],
    [worldReactions, 'RIVAL_RETALIATION', 'rival retaliation popup path'],
    [worldReactions, 'EMPLOYEE_DEPARTURE', 'employee departure popup path'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`World reactions UI audit missing ${description}: ${needle}`);
    }
}

console.log('World reactions UI audit passed.');
