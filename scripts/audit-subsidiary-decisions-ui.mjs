import { readFileSync } from 'node:fs';

const commandCenter = readFileSync('views/lifestyle/business/OwnedStudioCommandCenter.tsx', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');

const required = [
    [commandCenter, 'Board Decisions', 'visible board-decision panel'],
    [commandCenter, 'Ownership Docket', 'ownership decision framing'],
    [commandCenter, 'resolveSubsidiaryDecision', 'decision resolution action'],
    [commandCenter, 'Major subsidiary calls appear every 8–16 weeks', 'cadence explanation'],
    [commandCenter, 'decision.followUp', 'consequence-chain preview'],
    [commandCenter, 'Active Storylines', 'active decision storyline panel'],
    [commandCenter, 'activeDecisionArcs', 'studio aftermath arc state'],
    [gameLoop, 'processSubsidiaryDecisionEngine(nextPlayer)', 'weekly decision-engine hook'],
];

for (const [source, needle, description] of required) {
    if (!source.includes(needle)) {
        throw new Error(`Subsidiary decision UI audit missing ${description}: ${needle}`);
    }
}

if (!commandCenter.includes('Board Proposals')) {
    throw new Error('Project proposals should remain separate from board decisions.');
}

console.log('Subsidiary decisions UI audit passed.');
