import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const imdb = read('views/mobile/ImdbApp.tsx');
const dashboard = read('views/lifestyle/business/components/ProjectDashboardModal.tsx');
const en = read('services/localization/locales/en.ts');
const pt = read('services/localization/locales/pt-BR.ts');

[
  'EpisodeRatingsHeatmap',
  'getEpisodeRatingCellTone',
  'selectedProjectEpisodeRatings',
  "selectedProject.mediaType === 'SERIES'",
  'episodeRatingSeasonColumnWidth',
  'episodeRatingGridMinWidth',
  'episode-rating-season-scroll',
  'max-h-[420px] overflow-auto',
  'minmax(42px, ${episodeRatingSeasonColumnWidth})',
  'minWidth: episodeRatingGridMinWidth',
  'h-7 rounded',
  'text-xs font-black',
  "tr('imdb.project.episodeRatings')",
  "tr('imdb.project.noEpisodeRatings')",
].forEach(token => {
  assert(imdb.includes(token), `IMDb project detail should include ${token}.`);
});

assert(dashboard.includes('max-h-[460px] overflow-auto'), 'Production dashboard scorecard should allow long seasons to scroll vertically.');

// #272: the IMDb page and the producer's scorecard share one idea of a show. audit-series-identity.ts tests it.
assert(imdb.includes('groupSeriesRows('), 'IMDb series grouping should use the shared series identity.');
assert(dashboard.includes('groupSeriesRows('), 'Production dashboard scorecard grouping should use the shared series identity.');

[
  'imdb.project.episodeRatings',
  'imdb.project.seasonAverage',
  'imdb.project.noEpisodeRatings',
].forEach(key => {
  assert(en.includes(`'${key}'`), `English locale should define ${key}.`);
  assert(pt.includes(`'${key}'`), `PT-BR locale should define ${key}.`);
});

console.log('Episode ratings UI audit passed.');
