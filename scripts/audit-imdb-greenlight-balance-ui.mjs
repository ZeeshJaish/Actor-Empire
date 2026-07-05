import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const greenlight = read('views/lifestyle/business/GreenlightWizard.tsx');
const roleLogic = read('services/roleLogic.ts');
const pkg = JSON.parse(read('package.json'));

[
  'greenlightBudgetRisk',
  'Budget Risk',
  'Overexposed',
  'Stretched',
].forEach(token => {
  assert(!greenlight.includes(token), `Greenlight should not expose budget risk meter token: ${token}`);
});

[
  'elitePackageScore',
  'highRatingGate',
  'packageFragility',
].forEach(token => {
  assert(roleLogic.includes(token), `IMDb rating should include tougher high-rating token: ${token}`);
});

assert(
  pkg.scripts?.['audit:imdb-greenlight-balance']?.includes('scripts/audit-imdb-greenlight-balance.ts'),
  'package.json should expose audit:imdb-greenlight-balance.'
);

assert(
  pkg.scripts?.['audit:imdb-greenlight-balance-ui'] === 'node scripts/audit-imdb-greenlight-balance-ui.mjs',
  'package.json should expose audit:imdb-greenlight-balance-ui.'
);

console.log('IMDb balance and Greenlight no-risk-meter UI audit passed.');
