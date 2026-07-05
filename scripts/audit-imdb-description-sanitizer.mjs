import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const imdb = fs.readFileSync('views/mobile/ImdbApp.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

[
  'getDisplayProjectDescription',
  'Episode Ratings IMDb QA season',
  'Audience response shifted across the season. Open this credit to see the S1-S3 heatmap.',
].forEach(token => {
  assert(imdb.includes(token), `IMDb should sanitize leaked QA description token: ${token}`);
});

assert(
  !imdb.includes('{selectedProject.description || tr('),
  'IMDb project detail should not render raw selectedProject.description directly.'
);

assert(
  pkg.scripts?.['audit:imdb-description-sanitizer'] === 'node scripts/audit-imdb-description-sanitizer.mjs',
  'package.json should expose audit:imdb-description-sanitizer.'
);

console.log('IMDb description sanitizer audit passed.');
