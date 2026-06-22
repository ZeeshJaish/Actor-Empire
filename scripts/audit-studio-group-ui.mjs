import { readFileSync } from 'node:fs';

const groupView = readFileSync('views/lifestyle/business/StudioGroupView.tsx', 'utf8');
const commandCenter = readFileSync('views/lifestyle/business/OwnedStudioCommandCenter.tsx', 'utf8');
const productionHouse = readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8');
const acquisitionDesk = readFileSync('views/mobile/components/StudioAcquisitionDesk.tsx', 'utf8');
const forbes = readFileSync('views/mobile/ForbesApp.tsx', 'utf8');
const groupLogic = readFileSync('services/studioGroup.ts', 'utf8');
const source = `${groupView}\n${commandCenter}\n${productionHouse}\n${acquisitionDesk}\n${forbes}\n${groupLogic}`;

for (const [needle, description] of [
    ['Studio Group', 'the Studio Group navigation and title'],
    ['Group Headquarters', 'the parent studio identity'],
    ['Owned Studios', 'the acquired-studio roster'],
    ['Independent Label', 'the independent operating model'],
    ['Controlled Subsidiary', 'the controlled operating model'],
    ['Full Merger', 'the full-merger operating model'],
    ['Group Valuation', 'the group valuation metric'],
    ['Group Capital', 'the group capital metric'],
    ['Weekly Result', 'the group profit metric'],
    ['Operating Model', 'the operating-model command'],
    ['Change Operating Model', 'the later model-change action'],
    ['Confirm Operating Model', 'the immediate post-acquisition confirmation'],
    ['onSetOperatingModel', 'the acquisition operating-model callback'],
    ['setSubsidiaryOperatingModel', 'the shared operating-model service'],
    ['Group Command', 'the full-width Studio Group division card'],
    ['Manage Subsidiaries', 'the Studio Group card action'],
    ['division-command-card', 'the upgraded division-card visual contract'],
    ['Studio Control Console', 'the game-style department console'],
    ['status-light', 'physical status indicators on department controls'],
    ['control-key', 'chunky physical department keys'],
    ['Studio Command Center', 'the owned-studio command screen'],
    ['Open Studio', 'the owned-studio entry action'],
    ['Control Authority', 'the operating-model permissions panel'],
    ['Financial Position', 'the existing financial system readout'],
    ['Active Slate', 'the existing studio project slate'],
    ['Catalog & IP', 'the existing catalog and rights readout'],
    ['Facilities & Talent', 'the existing production asset readout'],
    ['Acquisition Record', 'the existing acquisition closing history'],
    ['Change Operating Model', 'the command-center model action'],
    ['getAcquisitionCase', 'the existing acquisition record selector'],
    ['Empire Map', 'the visual ownership hierarchy'],
    ['Group Headquarters', 'the compact parent-company anchor'],
    ['Operating Model ·', 'the explicit operating-model control'],
    ['Studio Health', 'the at-a-glance momentum signal'],
    ['Open Studio', 'the clear command-center action'],
]) {
    if (!source.includes(needle)) {
        throw new Error(`Studio Group UI is missing ${description}: ${needle}`);
    }
}

if (!productionHouse.includes("'STUDIO_GROUP'")) {
    throw new Error('Production House does not expose the Studio Group view.');
}

if (productionHouse.includes('Studio HQ')) {
    throw new Error('Production House still renders the old Studio HQ / Studio Group toggle.');
}

if (!productionHouse.includes('wide')) {
    throw new Error('Studio Group is not rendered as the prominent full-width division card.');
}

if (productionHouse.includes("min-h-[128px]") || productionHouse.includes("min-h-[138px]")) {
    throw new Error('The division controls still use the oversized dashboard-card footprint.');
}

if (groupView.includes("aria-label={`${model ? 'Change' : 'Set'} operating model")) {
    throw new Error('Studio Group still hides operating-model changes behind the old icon-only control.');
}

if (groupView.includes('Risk') || groupView.includes('riskLevel')) {
    throw new Error('Studio Group should not display a risk indicator.');
}

if (groupView.includes('Ownership Line')) {
    throw new Error('Studio Group still renders the rejected ownership tail and circle.');
}

console.log('Studio Group UI audit passed.');
