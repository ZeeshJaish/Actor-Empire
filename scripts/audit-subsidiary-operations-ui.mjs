import { readFileSync } from 'node:fs';

const commandCenter = readFileSync('views/lifestyle/business/OwnedStudioCommandCenter.tsx', 'utf8');
const productionHouse = readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8');
const studioGroup = readFileSync('views/lifestyle/business/StudioGroupView.tsx', 'utf8');
const studioPage = readFileSync('views/StudioPage.tsx', 'utf8');
const greenlight = readFileSync('views/lifestyle/business/GreenlightWizard.tsx', 'utf8');
const divisionCard = readFileSync('views/lifestyle/business/components/StudioDivisionCard.tsx', 'utf8');
const gameLoop = readFileSync('services/gameLoop.ts', 'utf8');
const operations = readFileSync('services/subsidiaryOperations.ts', 'utf8');
const businessLogic = readFileSync('services/businessLogic.ts', 'utf8');
const types = readFileSync('types.ts', 'utf8');
const source = `${commandCenter}\n${productionHouse}\n${studioGroup}\n${studioPage}\n${greenlight}\n${divisionCard}\n${gameLoop}\n${operations}\n${businessLogic}\n${types}`;

for (const [needle, description] of [
    ['SubsidiaryProjectProposal', 'typed subsidiary proposals'],
    ['subsidiaryProjectProposals', 'proposal storage in StudioState'],
    ['processSubsidiaryAutonomousOperations(nextPlayer)', 'weekly autonomous operation hook'],
    ['prepareSubsidiaryProjectsForGameLoop(nextPlayer)', 'pre-release subsidiary repair hook'],
    ['planSubsidiaryProject', 'mandate-driven proposal planning'],
    ['createSubsidiaryProductionCommitment', 'real production commitment creation'],
    ['approveSubsidiaryProjectProposal', 'board approval action'],
    ['rejectSubsidiaryProjectProposal', 'board rejection action'],
    ['Board Proposals', 'visible command-center decision panel'],
    ['Mandate History', 'visible historical decision trail'],
    ['Past Slate', 'visible acquired-studio archive slate'],
    ['SubsidiarySlateTile', 'active slate tile UI'],
    ['SubsidiaryArchiveTile', 'past slate tile UI'],
    ['proposal.logic', 'visible explanation of studio decisions'],
    ['formatMoney(proposal.estimatedBudget)', 'visible budget recommendation'],
    ['Approve', 'approval button'],
    ['Reject', 'rejection button'],
    ['StudioDivisionCard', 'shared parent and subsidiary division cards'],
    ["title={tr('ownedStudio.command.greenlightProject')}", 'subsidiary production card'],
    ['eyebrow="Production command"', 'clear subsidiary production command'],
    ['onClick={onOpenFacilities}', 'studio-scoped facilities route'],
    ['onClick={onOpenTalent}', 'studio-scoped talent route'],
    ["onClick={() => setActiveDeck('FINANCE')}", 'ownership-aware subsidiary finance route'],
    ['studioId={studio.id}', 'selected studio passed into talent management'],
    ['studioId: studio.id', 'talent contracts stamped with studio ownership'],
    ['contract.studioId === business.id', 'weekly subsidiary payroll ownership guard'],
    ['contract.studioId === studio.id', 'greenlight and roster ownership guard'],
    ['The legacy global roster mirrors only the parent/HQ studio', 'HQ roster isolation'],
    ['Amount you receive', 'ownership-aware treasury amount label'],
    ['Your ownership', 'visible live ownership percentage'],
    ['Studio reserve', 'visible protected operating reserve'],
    ['Available to you', 'visible maximum owner proceeds'],
    ['Outside shareholders receive', 'plain-language minority distribution explanation'],
]) {
    if (!source.includes(needle)) {
        throw new Error(`Subsidiary operations UI missing ${description}: ${needle}`);
    }
}

if (!operations.includes("mandate.autoProduction === 'PAUSED'")) {
    throw new Error('Autonomous operations must respect paused mandates.');
}

if (!operations.includes("currentStudio.studioState?.operatingModel === 'INDEPENDENT_LABEL'")) {
    throw new Error('Independent labels must have a distinct auto-start path.');
}

if (
    !operations.includes("const releaseStrategy = getSubsidiaryReleaseStrategy")
    || !operations.includes("releaseStrategy,")
) {
    throw new Error('Subsidiary productions must receive automatic release strategies.');
}

if (!operations.includes("status === 'PENDING'")) {
    throw new Error('Controlled subsidiaries must preserve pending board-review proposals.');
}

console.log('Subsidiary operations UI audit passed.');
