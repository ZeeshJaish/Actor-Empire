import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const imdb = read('views/mobile/ImdbApp.tsx');
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
  'minmax(42px, ${episodeRatingSeasonColumnWidth})',
  'minWidth: episodeRatingGridMinWidth',
  'h-7 rounded',
  'text-xs font-black',
  "tr('imdb.project.episodeRatings')",
  "tr('imdb.project.noEpisodeRatings')",
].forEach(token => {
  assert(imdb.includes(token), `IMDb project detail should include ${token}.`);
});

[
  'imdb.project.episodeRatings',
  'imdb.project.seasonAverage',
  'imdb.project.noEpisodeRatings',
].forEach(key => {
  assert(en.includes(`'${key}'`), `English locale should define ${key}.`);
  assert(pt.includes(`'${key}'`), `PT-BR locale should define ${key}.`);
});

console.log('Episode ratings UI audit passed.');
