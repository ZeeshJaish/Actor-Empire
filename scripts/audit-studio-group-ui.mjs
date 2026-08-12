import { readFileSync } from 'node:fs';

const groupView = readFileSync('views/lifestyle/business/StudioGroupView.tsx', 'utf8');
const commandCenter = readFileSync('views/lifestyle/business/OwnedStudioCommandCenter.tsx', 'utf8');
const productionHouse = readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8');
const divisionCard = readFileSync('views/lifestyle/business/components/StudioDivisionCard.tsx', 'utf8');
const acquisitionDesk = readFileSync('views/mobile/components/StudioAcquisitionDesk.tsx', 'utf8');
const forbes = readFileSync('views/mobile/ForbesApp.tsx', 'utf8');
const groupLogic = readFileSync('services/studioGroup.ts', 'utf8');
const englishLocale = readFileSync('services/localization/locales/en.ts', 'utf8');
const portugueseLocale = readFileSync('services/localization/locales/pt-BR.ts', 'utf8');
const source = `${groupView}\n${commandCenter}\n${productionHouse}\n${divisionCard}\n${acquisitionDesk}\n${forbes}\n${groupLogic}\n${englishLocale}\n${portugueseLocale}`;

for (const [needle, description] of [
    ['Studio Group', 'the Studio Group navigation and title'],
    ['Group Headquarters', 'the parent studio identity'],
    ['Owned Studios', 'the acquired-studio roster'],
    ['Independent Label', 'the independent operating model'],
    ['Controlled Subsidiary', 'the controlled operating model'],
    ['Full Merger', 'the full-merger operating model'],
    ['Parent Company', 'the ownership-weighted parent-company metric'],
    ['Combined Studios', 'the consolidated operating-value metric'],
    ['Owner Weekly', 'the ownership-weighted weekly result'],
    ['HQ Operations', 'the standalone parent operating value'],
    ['Owned Stakes', 'the parent holdings value'],
    ['Acquisition Debt', 'the acquisition debt deduction'],
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
    ['Talent Stability', 'the existing production asset readout'],
    ['Acquisition Record', 'the existing acquisition closing history'],
    ['Change Operating Model', 'the command-center model action'],
    ['Operating Mandate', 'the owned-studio strategy mandate surface'],
    ['Issue Studio Mandate', 'the mandate save action'],
    ['Command Permission', 'the model-aware mandate permission copy'],
    ['Direct Production', 'the controlled-subsidiary production permission signal'],
    ['Auto Label', 'the independent-label auto-operation signal'],
    ['setStudioOperatingMandate', 'the shared mandate persistence service'],
    ['getSubsidiaryControlProfile', 'the mandate permission selector'],
    ['STUDIO_MANDATE_GROUPS', 'the mandate option groups'],
    ['getAcquisitionCase', 'the existing acquisition record selector'],
    ['Empire Map', 'the visual ownership hierarchy'],
    ['Group Headquarters', 'the compact parent-company anchor'],
    ['Operating Model', 'the explicit operating-model control'],
    ['Studio Health', 'the at-a-glance momentum signal'],
    ['Open Studio', 'the clear command-center action'],
    ['Integrated Assets', 'the merged-studio archive section'],
    ['Merged Into HQ', 'the full-merger integrated state label'],
    ['Restore Subsidiary', 'the merged-studio carve-out action'],
    ['Confirm Carve-Out', 'the explicit costly reversal confirmation'],
    ['reverseFullStudioMerger', 'the shared reversal service'],
    ['Confirm Full Merger', 'the second confirmation step for full merger'],
    ['Merge Consequences', 'the full-merger consequence warning'],
    ['Command Deck', 'the organized command-center tab system'],
    ['Studio Slate', 'the organized slate tab'],
    ['Catalog/IP', 'the organized catalog tab'],
    ['Finance', 'the organized finance tab'],
    ['Direct Production Console', 'the controlled-subsidiary production context'],
    ['Autonomous Label Board', 'the independent-label model-aware command view'],
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

if (groupView.includes('grid-cols-[0.82fr_1.18fr]') || groupView.includes('Operating Model ·')) {
    throw new Error('Studio Group owned-studio action row should use balanced 50/50 buttons without repeating the selected model.');
}

if (groupView.includes('Risk') || groupView.includes('riskLevel')) {
    throw new Error('Studio Group should not display a risk indicator.');
}

if (groupView.includes('Ownership Line')) {
    throw new Error('Studio Group still renders the rejected ownership tail and circle.');
}

if (commandCenter.includes('min-w-0 truncate font-serif text-2xl')) {
    throw new Error('Owned Studio Command Center still truncates the studio name.');
}

if (!commandCenter.includes('break-words') || !commandCenter.includes('Rebrand')) {
    throw new Error('Owned Studio Command Center must show the full wrapping name and a labeled rebrand control.');
}

console.log('Studio Group UI audit passed.');
