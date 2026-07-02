import fs from 'node:fs';

const releaseWizard = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const logoComponent = fs.readFileSync('views/lifestyle/business/components/CinemaChainLogo.tsx', 'utf8');
const cinemaChains = fs.readFileSync('services/cinemaChains.ts', 'utf8');

const mustInclude = (haystack, token, label = token) => {
  if (!haystack.includes(token)) throw new Error(`Missing ${label}`);
};

[
  'CinemaChainLogo',
  'Selected region partners',
  'All partners',
  'Max screens',
  'Partner cut',
].forEach(token => mustInclude(releaseWizard, token));

[
  'Empire Cinemas',
  'Z Cinemas'
].forEach(token => mustInclude(cinemaChains, token, `cinema-chain data ${token}`));

[
  'cinema-chain-logo',
  'EMPIRE_CINEMAS',
  'Z_CINEMAS',
  'NOVA_CIRCUIT',
  'PRISM_HALLS',
  'ARCLIGHT_GRID',
  'CROWNSCREEN',
  'cinemaLogoGlow',
  'cinemaLogoPlate',
  'radialGradient',
  'svg'
].forEach(token => mustInclude(logoComponent, token));

if (/img\s+src=|<img/.test(logoComponent)) {
  throw new Error('Cinema chain logos should be SVG marks, not image assets.');
}

console.log('Cinema chain UI audit passed.');
