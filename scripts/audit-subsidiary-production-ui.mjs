import { readFileSync } from 'node:fs';

const productionHouse = readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8');
const studioGroup = readFileSync('views/lifestyle/business/StudioGroupView.tsx', 'utf8');
const commandCenter = readFileSync('views/lifestyle/business/OwnedStudioCommandCenter.tsx', 'utf8');
const developmentLab = readFileSync('views/lifestyle/business/DevelopmentLab.tsx', 'utf8');
const greenlight = readFileSync('views/lifestyle/business/GreenlightWizard.tsx', 'utf8');
const source = `${productionHouse}\n${studioGroup}\n${commandCenter}\n${developmentLab}\n${greenlight}`;

for (const [needle, description] of [
    ['activeStudioId', 'the active studio context in ProductionHouseGame'],
    ['setActiveStudioId', 'the active studio switcher'],
    ['subsidiaryLaunch', 'the subsidiary launch context'],
    ['returnAfterStudioTool', 'the back-routing target for subsidiary tools'],
    ['onGreenlightStudioProject', 'the Studio Group callback for direct greenlight'],
    ['onOpenStudioWorkbench', 'the Studio Group callback for workbench/development routes'],
    ['DevelopmentLabInitialTab', 'the typed Development Lab tab launch contract'],
    ['initialTab', 'the Development Lab initial tab prop'],
    ['Greenlight Project', 'the direct existing Greenlight Wizard action'],
    ['Open Development Lab', 'the direct route into existing script systems'],
    ['Browse Catalog/IP', 'the direct route into existing catalog and rights systems'],
    ['Franchise Command', 'the route into existing franchise systems'],
    ['Universe Command', 'the route into existing universe systems'],
    ['studio.id', 'studio-scoped production context'],
    ['studioId: studio.id', 'greenlight commitments written to the selected studio'],
    ['universe.studioId === studio.id', 'universe choices filtered to the active studio'],
    ['player.pastProjects.filter(p => p.studioId === studio.id)', 'franchise/history scoped to the active studio'],
]) {
    if (!source.includes(needle)) {
        throw new Error(`Subsidiary production UI is missing ${description}: ${needle}`);
    }
}

if (!productionHouse.includes("const studio = activeStudio")) {
    throw new Error('ProductionHouseGame must render against the active studio, not always the parent studio.');
}

if (!productionHouse.includes("setView('STUDIO_GROUP')") || !productionHouse.includes("returnAfterStudioTool === 'STUDIO_GROUP'")) {
    throw new Error('Subsidiary tool back navigation must return to Studio Group instead of the HQ dashboard.');
}

if (!commandCenter.includes('controlProfile.canDirectProduce')) {
    throw new Error('OwnedStudioCommandCenter must only show direct production controls when the model allows it.');
}

if (commandCenter.includes('Slice 4 Pipeline')) {
    throw new Error('Controlled subsidiary production still shows placeholder Slice 4 copy.');
}

if (commandCenter.includes('Develop Movie') || commandCenter.includes('Develop Series')) {
    throw new Error('Subsidiary command center should not duplicate Development Lab with Develop Movie/Series buttons.');
}

console.log('Subsidiary production UI audit passed.');
