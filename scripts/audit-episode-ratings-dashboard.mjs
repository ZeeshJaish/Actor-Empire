import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const dashboard = read('views/lifestyle/business/components/ProjectDashboardModal.tsx');
const en = read('services/localization/locales/en.ts');
const pt = read('services/localization/locales/pt-BR.ts');
const pkg = JSON.parse(read('package.json'));

[
  'SeasonEpisodeRatings',
  'SeriesScorecardPanel',
  'getSeriesScorecardTone',
  'scorecardRatings',
  'getScorecardSeriesKey',
  'scorecardRatingMap',
  'player.pastProjects',
  'player.activeReleases',
  "project.type === 'SERIES'",
  'scorecardSeasonColumnWidth',
  'scorecardGridMinWidth',
  'scorecard-season-scroll',
  "tr('services.business.productionDashboard.scorecard.title')",
  "tr('services.business.productionDashboard.scorecard.renewalSignal')",
  "tr('services.business.productionDashboard.scorecard.bestEpisode')",
  "tr('services.business.productionDashboard.scorecard.weakestEpisode')",
  'minmax(38px, ${scorecardSeasonColumnWidth})',
  'minWidth: scorecardGridMinWidth',
].forEach(token => {
  assert(dashboard.includes(token), `Project dashboard should include ${token}.`);
});

[
  'services.business.productionDashboard.scorecard.title',
  'services.business.productionDashboard.scorecard.description',
  'services.business.productionDashboard.scorecard.average',
  'services.business.productionDashboard.scorecard.signal.strong',
  'services.business.productionDashboard.scorecard.signal.viable',
  'services.business.productionDashboard.scorecard.signal.risky',
  'services.business.productionDashboard.scorecard.signal.weak',
].forEach(token => {
  assert(en.includes(token), `English locale should include ${token}.`);
  assert(pt.includes(token), `Portuguese locale should include ${token}.`);
});

assert(
  pkg.scripts?.['audit:episode-ratings-dashboard'] === 'node scripts/audit-episode-ratings-dashboard.mjs',
  'package.json should expose audit:episode-ratings-dashboard.'
);

console.log('Episode ratings dashboard audit passed.');
