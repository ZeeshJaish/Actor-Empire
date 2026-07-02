import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const releaseWizard = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const typesSource = fs.readFileSync('types.ts', 'utf8');

[
  'distributionChainSelections',
  'normalizeDistributionChainSelectionRecord',
  'toggleDistributionChain',
  'selectAllDistributionChainsForRegion',
  'applyRecommendedDistributionDesk',
  'distributionDealSummary',
  'getCinemaChainsForRegion',
  'getCinemaChainTerms',
  'Auto Build Footprint',
  'Distribution Desk',
  'Selected region partners',
  'All partners',
  'Max screens',
  'chainIds',
  'Deal summary',
  'Audience pull',
  'Partner cut',
  'Studio share',
  'Booking cost',
  'Gross opening estimate',
  'Studio receipts',
  'If the run sells $100',
  'box-office variance'
].forEach(token => {
  assert(releaseWizard.includes(token), `Release distribution desk should include ${token}.`);
});

assert(
  releaseWizard.includes('releaseChainSelections: releaseType === \'THEATRICAL\'') &&
    releaseWizard.includes('? normalizedDistributionChainSelections'),
  'Release lock should persist selected cinema chains per region.'
);
assert(
  /disabled=\{normalizedSelectedRegionIds\.length === 0\}/.test(releaseWizard),
  'Continue should require at least one selected release region, not a separate scale card.'
);
assert(
  /releaseChainSelections\?:\s*Partial<Record<BoxOfficeRegionId,\s*CinemaChainId\[\]>>/.test(typesSource),
  'ProjectDetails should support saved multi-partner cinema-chain selections by region.'
);
assert(
  !releaseWizard.includes('Partner circuit identity begins here'),
  'Distribution intro should not include the old partner identity placeholder line.'
);
assert(
  !releaseWizard.includes('Regional Release') &&
    !releaseWizard.includes('National Release') &&
    !releaseWizard.includes('International Mass') &&
    !releaseWizard.includes('market weight') &&
    !releaseWizard.includes('Forecast model'),
  'Distribution desk should not show duplicate scale cards, market-weight jargon, or bulky forecast model copy.'
);

console.log('Release distribution desk audit passed.');
