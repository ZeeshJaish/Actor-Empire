import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const developmentLab = read('views/lifestyle/business/DevelopmentLab.tsx');
const productionHouse = read('views/lifestyle/business/ProductionHouseGame.tsx');
const businessLogic = read('services/businessLogic.ts');

assert(
    fs.existsSync(path.join(root, 'services/studioMarket.ts')),
    'studio market classification helper must exist',
);

const { getStudioMarketScripts } = await import('../services/studioMarket');
const sample = [
    { id: 'spec', sourceMaterialType: 'SPEC_SCRIPT' },
    { id: 'screenplay', sourceMaterialType: 'SCREENPLAY' },
    { id: 'book', sourceMaterialType: 'BOOK' },
    { id: 'life', sourceMaterialType: 'LIFE_RIGHTS' },
    { id: 'original' },
] as any;

assert(
    getStudioMarketScripts(sample).map((item: any) => item.id).join(',') === 'spec,screenplay,book,life,original',
    'Scripts lane must contain screenplays and adaptable source material',
);

for (const label of ['Scripts', 'Properties']) {
    assert(developmentLab.includes(`label: '${label}'`), `Market must expose ${label} lane`);
}
assert(!developmentLab.includes("label: 'Stories'"), 'Market must not split adaptable source material into a separate Stories lane');
for (const label of ['Scripts', 'Rights']) {
    assert(developmentLab.includes(`label: '${label}'`), `Vault must expose ${label} lane`);
}

assert(developmentLab.includes('<RightsMarket'), 'Properties lane must embed the existing Rights Market');
assert(developmentLab.includes("'FRANCHISES'"), 'Development Lab must retain Franchise');
assert(developmentLab.includes("'UNIVERSE'"), 'Development Lab must retain Universe');

assert(!productionHouse.includes('IP_MANAGEMENT'), 'separate IP management route must be removed');
assert(!productionHouse.includes('Rights & Universes'), 'duplicate dashboard card must be removed');
assert(!productionHouse.includes("from './IPManagement'"), 'duplicate IP management component must not be imported');

assert(businessLogic.includes('ipMarket:'), 'old source-material market state must remain');
assert(businessLogic.includes('rightsMarket:'), 'rights-market state must remain');
assert(businessLogic.includes('lastRightsScoutingCycle'), 'rights scouting metadata must remain');

console.log('Market consolidation audit passed');
