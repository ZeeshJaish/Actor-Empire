import {
  BOX_OFFICE_REGIONS,
  CINEMA_CHAINS,
  getCinemaChainById,
  getCinemaChainsForRegion,
  getScreeningStrategyChainPreview
} from '../services/cinemaChains';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const requiredChains = [
  'EMPIRE_CINEMAS',
  'Z_CINEMAS',
  'NOVA_CIRCUIT',
  'PRISM_HALLS',
  'ARCLIGHT_GRID',
  'CROWNSCREEN'
];

assert(BOX_OFFICE_REGIONS.length === 6, 'Expected six playable continent-scale box office regions.');
assert(!BOX_OFFICE_REGIONS.some(region => region.id === 'POLAR' as any), 'Polar / Antarctica should not be a playable box office region.');
assert(CINEMA_CHAINS.length >= requiredChains.length, 'Expected core cinema-chain roster.');

const chainIds = new Set(CINEMA_CHAINS.map(chain => chain.id));
assert(chainIds.size === CINEMA_CHAINS.length, 'Cinema chain ids must be unique.');
requiredChains.forEach(chainId => assert(chainIds.has(chainId as any), `Missing ${chainId}.`));

CINEMA_CHAINS.forEach(chain => {
  assert(chain.name.trim().length > 2, `${chain.id} needs a readable name.`);
  assert(chain.logoMark.trim().length > 0, `${chain.id} needs a logo mark.`);
  assert(/^#[0-9a-f]{6}$/i.test(chain.brandColor), `${chain.id} needs a stable hex brand color.`);
  assert(chain.personality.trim().length > 10, `${chain.id} needs brand personality.`);
  assert(chain.globalReputation >= 1 && chain.globalReputation <= 100, `${chain.id} reputation must be 1-100.`);
  assert(chain.audienceStrengths.length >= 2, `${chain.id} needs audience strengths.`);

  BOX_OFFICE_REGIONS.forEach(region => {
    const terms = chain.regionalTerms[region.id];
    assert(!!terms, `${chain.id} must have terms for ${region.id}.`);
    assert(terms.screens > 0, `${chain.id}/${region.id} needs screen count.`);
    assert(terms.bookingCost > 0, `${chain.id}/${region.id} needs booking cost.`);
    assert(terms.exhibitorCut >= 0.32 && terms.exhibitorCut <= 0.58, `${chain.id}/${region.id} exhibitor cut out of range.`);
    assert(terms.footfallPower >= 0.35 && terms.footfallPower <= 1.25, `${chain.id}/${region.id} footfall power out of range.`);
  });
});

const empire = getCinemaChainById('EMPIRE_CINEMAS');
const zCinemas = getCinemaChainById('Z_CINEMAS');
assert(empire?.name === 'Empire Cinemas', 'Empire Cinemas must be a first-class chain.');
assert(zCinemas?.name === 'Z Cinemas', 'Z Cinemas must be a first-class chain.');
assert(empire.regionalTerms.NORTH_AMERICA.exhibitorCut !== empire.regionalTerms.ASIA.exhibitorCut, 'Empire terms should vary by region.');
assert(zCinemas.regionalTerms.ASIA.screens !== zCinemas.regionalTerms.OCEANIA.screens, 'Z Cinemas screen offers should vary by region.');

BOX_OFFICE_REGIONS.forEach(region => {
  const chains = getCinemaChainsForRegion(region.id);
  assert(chains.length === CINEMA_CHAINS.length, `${region.id} should have every chain available with local terms.`);
});

const regionalPreview = getScreeningStrategyChainPreview('REGIONAL');
const nationalPreview = getScreeningStrategyChainPreview('NATIONAL');
const internationalPreview = getScreeningStrategyChainPreview('INTERNATIONAL');
assert(regionalPreview.length >= 2, 'Regional preview needs partner options.');
assert(nationalPreview.length >= 3, 'National preview needs partner options.');
assert(internationalPreview.length >= 4, 'International preview needs partner options.');
assert(internationalPreview.some(chain => chain.id === 'EMPIRE_CINEMAS'), 'International preview should include Empire Cinemas.');

console.log('Cinema chain identity audit passed.');
