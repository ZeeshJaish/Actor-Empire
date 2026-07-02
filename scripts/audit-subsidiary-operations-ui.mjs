import { readFileSync } from 'node:fs';

const commandCenter = readFileSync('views/lifestyle/business/OwnedStudioCommandCenter.tsx', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const operations = readFileSync('services/subsidiaryOperations.ts', 'utf8');
const businessLogic = readFileSync('services/businessLogic.ts', 'utf8');
const types = readFileSync('types.ts', 'utf8');
const source = `${commandCenter}\n${gameLoop}\n${operations}\n${businessLogic}\n${types}`;

for (const [needle, description] of [
    ['SubsidiaryProjectProposal', 'typed subsidiary proposals'],
    ['subsidiaryProjectProposals', 'proposal storage in StudioState'],
    ['processSubsidiaryAutonomousOperations(nextPlayer)', 'weekly autonomous operation hook'],
    ['planSubsidiaryProject', 'mandate-driven proposal planning'],
    ['approveSubsidiaryProjectProposal', 'board approval action'],
    ['rejectSubsidiaryProjectProposal', 'board rejection action'],
    ['Board Proposals', 'visible command-center decision panel'],
    ['Mandate History', 'visible historical decision trail'],
    ['proposal.logic', 'visible explanation of studio decisions'],
    ['formatMoney(proposal.estimatedBudget)', 'visible budget recommendation'],
    ['Approve', 'approval button'],
    ['Reject', 'rejection button'],
    ['Existing full wizard', 'existing production wizard remains the direct production path'],
]) {
    if (!source.includes(needle)) {
        throw new Error(`Subsidiary operations UI missing ${description}: ${needle}`);
    }
}

if (!operations.includes("mandate.autoProduction === 'PAUSED'")) {
    throw new Error('Autonomous operations must respect paused mandates.');
}

if (!operations.includes("studio.studioState?.operatingModel === 'INDEPENDENT_LABEL'")) {
    throw new Error('Independent labels must have a distinct auto-start path.');
}

if (!operations.includes("status === 'PENDING'")) {
    throw new Error('Controlled subsidiaries must preserve pending board-review proposals.');
}

console.log('Subsidiary operations UI audit passed.');
