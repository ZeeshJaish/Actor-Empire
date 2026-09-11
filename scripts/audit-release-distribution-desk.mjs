import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const releaseWizard = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const desk = fs.readFileSync('views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep.tsx', 'utf8');
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
  '<TheatricalDeskStep',
  'regions={deskRegions}',
  'totalScreens={distributionDealSummary.totalScreens}',
  'bookingCost={distributionDealSummary.bookingCost}',
  'studioShare={distributionDealSummary.studioShare}',
  'onToggleRegion={regionId => toggleSelectedRegion',
  'onToggleChain={(regionId, chainId) => toggleDistributionChain',
  'onAutoBuild={() => applyRecommendedDistributionDesk'
].forEach(token => {
  assert(releaseWizard.includes(token), `Release distribution desk should include ${token}.`);
});

[
  'AUTO-BUILD FOOTPRINT',
  'WHERE IT OPENS',
  'CINEMA PARTNERS',
  'regions.map',
  'region.chains.map',
  'onToggleRegion(region.id)',
  'onToggleChain(region.id, chain.id)',
  'totalScreens.toLocaleString()',
  'bookingCost',
  'studioShare',
  'expectedFootfall',
  'openingRange'
].forEach(token => assert(desk.includes(token), `Transplanted distribution desk should include ${token}.`));

assert(
  releaseWizard.includes('releaseChainSelections: releaseType === \'THEATRICAL\'') &&
    releaseWizard.includes('? normalizedDistributionChainSelections'),
  'Release lock should persist selected cinema chains per region.'
);
assert(/disabled=\{totalScreens <= 0\}/.test(desk), 'Continue should require a live theatrical footprint.');
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

console.log('Release transplanted distribution desk audit passed.');
