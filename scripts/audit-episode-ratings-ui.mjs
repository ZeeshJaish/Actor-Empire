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

[
  'const franchiseId = details.franchiseId || original.franchiseId;',
  'const titleKey = normalizeSeriesTitleKey(project.name || details.title || original.name || original.title);',
  'const sourceScriptId = details.sourceScriptId || original.sourceScriptId;',
  '? `franchise:${franchiseId}`',
  '? `title:${titleKey}`',
  '? `script:${sourceScriptId}`',
].forEach(token => {
  assert(imdb.includes(token), `IMDb series grouping should prefer stable show identity before script id: ${token}`);
});

[
  'const franchiseId = details.franchiseId || project?.franchiseId;',
  "const titleKey = normalizeScorecardSeriesTitle(project?.name || project?.title || details.title || '');",
  'const sourceScriptId = details.sourceScriptId || project?.sourceScriptId;',
  '? `franchise:${franchiseId}`',
  '? `title:${titleKey}`',
  '? `script:${sourceScriptId}`',
].forEach(token => {
  assert(dashboard.includes(token), `Production dashboard scorecard grouping should prefer stable show identity before script id: ${token}`);
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
