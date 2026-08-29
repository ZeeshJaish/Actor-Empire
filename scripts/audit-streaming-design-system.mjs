import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
const requireText = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};

const tokenPath = 'components/streaming-transplant/presentation/tokens.css';
const primitivePath = 'components/streaming-transplant/presentation/primitives.css';
const brandPath = 'components/streaming-transplant/presentation/brand.ts';
const entryPath = 'components/streaming-transplant/presentation/index.ts';
const tokens = read(tokenPath);
const primitives = read(primitivePath);
const brand = read(brandPath);
const entry = read(entryPath);

const requiredTokens = [
  '--epx-s-canvas', '--epx-s-surface', '--epx-fg', '--epx-fg-4',
  '--epx-good', '--epx-warn', '--epx-bad', '--epx-pending',
  '--epx-brand', '--epx-brand-ink', '--epx-brand-wash',
  '--epx-t-body', '--epx-t-title', '--epx-t-hero', '--epx-sp-4',
  '--epx-tap-min', '--epx-r-md', '--epx-ease-out', '--epx-d-base',
  '--epx-z-cinematic',
];
for (const token of requiredTokens) {
  requireText(tokens, token, `Missing required token ${token}`);
}

const typeTokens = [...tokens.matchAll(/--epx-t-[\w-]+:\s*([\d.]+)px/g)]
  .map(match => Number(match[1]));
if (typeTokens.length !== 8) {
  failures.push(`Expected 8 type-size tokens, found ${typeTokens.length}`);
}
if (typeTokens.some(size => size < 11)) {
  failures.push('The shared type scale contains a value below the 11px floor');
}

requireText(tokens, '--epx-tap-min: 44px', 'Touch target token must remain 44px');
requireText(tokens, '[data-epx-root] *', 'Reduced motion must be scoped to EMPIRE+ roots');
if (/\n\s*\*,\s*\*::before,\s*\*::after/.test(tokens)) {
  failures.push('Reduced-motion rules leak globally outside EMPIRE+');
}

for (const contract of [
  ':focus-visible',
  'touch-action: manipulation',
  '@media (hover: hover) and (pointer: fine)',
  'overscroll-behavior: contain',
]) {
  requireText(primitives, contract, `Missing interaction contract: ${contract}`);
}

for (const contract of [
  'contrastInkForBrand',
  "'--epx-brand-s-deep'",
  "'--epx-brand-ink'",
]) {
  requireText(brand, contract, `Missing runtime brand contract: ${contract}`);
}

requireText(entry, "import './tokens.css'", 'Presentation entry does not install tokens');
requireText(entry, "import './primitives.css'", 'Presentation entry does not install primitives');
requireText(
  read('components/streaming-transplant/StreamingBrandVisuals.tsx'),
  "import './presentation'",
  'Streaming dependency root does not install the presentation system',
);

const rootedScreens = [
  'StreamingAudienceExperience.tsx',
  'StreamingBoardroomExperience.tsx',
  'StreamingBuildoutExperience.tsx',
  'StreamingCinematicsExperience.tsx',
  'StreamingContentExperience.tsx',
  'StreamingDossierExperience.tsx',
  'StreamingFinanceRoom.tsx',
  'StreamingListingExperience.tsx',
  'StreamingMarketDesk.tsx',
  'StreamingNetworkExperience.tsx',
  'StreamingPlatformCommandDeck.tsx',
  'StreamingPremiereExperience.tsx',
  'StreamingPricingExperience.tsx',
  'StreamingPrototypeOrchestrator.tsx',
  'StreamingRaiseExperience.tsx',
  'StreamingStockExperience.tsx',
  'StreamingViewerExperience.tsx',
  'StreamingWallExperience.tsx',
];
for (const file of rootedScreens) {
  requireText(
    read(`components/streaming-transplant/${file}`),
    'data-epx-root',
    `${file} is not attached to the shared interaction scope`,
  );
}

const screenDir = path.join(root, 'components/streaming-transplant/presentation/screens');
const cssFiles = fs.readdirSync(screenDir, { recursive: true })
  .filter(name => name.endsWith('.module.css'))
  .map(name => fs.readFileSync(path.join(screenDir, name), 'utf8'));
const screenCss = cssFiles.join('\n');
const legacySmallType = [...screenCss.matchAll(/font-size\s*:\s*([\d.]+)px/g)]
  .map(match => Number(match[1]))
  .filter(size => size < 11).length;
const legacyHex = new Set(
  [...screenCss.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(match => match[0].toLowerCase()),
).size;

if (failures.length) {
  console.error('EMPIRE+ design-system audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('EMPIRE+ design-system audit passed.');
console.log(`- ${typeTokens.length} shared type sizes; ${Math.min(...typeTokens)}px floor`);
console.log(`- ${rootedScreens.length} cinematic roots use the shared interaction scope`);
console.log(`- Migration baseline: ${legacySmallType} sub-11px declarations, ${legacyHex} unique local hex colours`);
