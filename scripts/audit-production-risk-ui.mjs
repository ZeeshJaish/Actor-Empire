import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const gameLoop = read('services/gameLoop.ts');
const productionHouse = read('views/lifestyle/business/ProductionHouseGame.tsx');
const home = read('views/HomePage.tsx');
const studioProductionQa = read('views/home/homeStudioProductionQaActions.ts');
const homeQaSource = `${home}\n${studioProductionQa}`;
const pkg = JSON.parse(read('package.json'));

[
  'calculateProductionRiskProfile',
  'theatricalDemandMultiplier',
  'streamingViewMultiplier',
  'platformBidMultiplier',
].forEach(token => {
  assert(gameLoop.includes(token), `Game loop should apply production risk token: ${token}`);
});

[
  'Project Revenue',
  'AVERAGE',
  'getStudioArchiveRevenue(project)',
].forEach(token => {
  assert(productionHouse.includes(token), `Production House archive cards should keep old revenue-card token: ${token}`);
});

[
  'getStudioArchiveReceipts',
  'Studio Net',
].forEach(token => {
  assert(!productionHouse.includes(token), `Production House archive cards should not show studio-net token: ${token}`);
});

[
  'triggerProductionRiskQa',
  'Production Risk QA',
  'Risk Bomb',
  'Break Even',
  'Surprise Hit',
  'Prestige Series',
].forEach(token => {
  assert(homeQaSource.includes(token), `Cheat menu should include production risk QA support: ${token}`);
});

assert(
  pkg.scripts?.['audit:production-risk']?.includes('scripts/audit-production-risk.ts'),
  'package.json should expose audit:production-risk.'
);

assert(
  pkg.scripts?.['audit:production-risk-ui'] === 'node scripts/audit-production-risk-ui.mjs',
  'package.json should expose audit:production-risk-ui.'
);

console.log('Production risk UI audit passed.');
