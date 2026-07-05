import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/LifestyleAssets.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const mustInclude = (token, label = token) => {
  if (!source.includes(token)) throw new Error(`Missing ${label}`);
};

[
  'getCategoryPortfolioSnapshot',
  'renderCategoryCommandHeader',
  'portfolio-rail',
  'asset-file-card',
  'asset-file-hero',
  'asset-file-stat-grid',
  'asset-file-status-strip',
  'asset-file-action-pill',
].forEach(token => mustInclude(token));

mustInclude('rounded-[2rem]', 'large modern rounded shop-style cards');
mustInclude('bg-white text-black', 'white shop-style primary action pill');
mustInclude('Palette', 'customize action palette icon');

if (source.includes('onClick={() => toggleRental(item)}')) {
  throw new Error('Asset detail should not show the List For Rent action button.');
}

if (source.includes('<Sparkles className="mb-3 text-indigo-300"')) {
  throw new Error('Customize action should use the palette icon, not the old sparkle icon.');
}

if (pkg.scripts?.['audit:lifestyle-assets-ui'] !== 'node scripts/audit-lifestyle-assets-ui.mjs') {
  throw new Error('Missing package script audit:lifestyle-assets-ui.');
}

console.log('Lifestyle assets UI audit passed.');
