import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const productionHouse = read('views/lifestyle/business/ProductionHouseGame.tsx');
const home = read('views/HomePage.tsx');
const gameLoop = read('services/gameLoop.ts');
const messages = read('views/mobile/MessagesApp.tsx');
const mobile = read('views/mobile/MobilePage.tsx');
const app = read('App.tsx');
const episodeRatings = read('services/episodeRatings.ts');
const saveMigration = read('services/saveMigration.ts');
const pkg = JSON.parse(read('package.json'));

[
  'services.business.productionDashboard.outside.title',
  'outsideProductions.length > 0',
  'outsideProducerProfit',
  'getOutsideProductionStatusLabel',
  'getOutsideProductionOutcomeLabel',
  'getOutsideProductionSummary',
].forEach(token => {
  assert(!productionHouse.includes(token), `Production House dashboard should not render outside production UI: ${token}`);
});

[
  'triggerEpisodeRatingsProductionHouseQa',
  'Episode Ratings Production House QA',
  'Episode Ratings Production House QA series added',
  'Open Production House > Past Projects',
  'onOpenProductionHouseCheat?.()',
].forEach(token => {
  assert(home.includes(token), `HomePage should include Production House episode QA support: ${token}`);
});

[
  'getEpisodeRatingsGameplayImpact',
  'buildEpisodeRatingsStory',
  'episodeImpact.renewalModifier',
  'platform.reputation',
  'Episode scorecard:',
].forEach(token => {
  assert(gameLoop.includes(token), `Game loop should apply episode scorecard impact: ${token}`);
});

[
  'buildEpisodeRatingsReportMessage',
  'EPISODE_RATINGS_REPORT',
  'Studio Analytics',
].forEach(token => {
  assert(!episodeRatings.includes(token), `Episode ratings should not generate inbox scorecard reports: ${token}`);
});

[
  'episodeStory.message',
  'newInbox.unshift(episodeStory.message)',
].forEach(token => {
  assert(!gameLoop.includes(token), `Game loop should not send episode scorecard inbox reports: ${token}`);
});

[
  'shouldRemoveEpisodeRatingsReportMessage',
  'message.data?.kind ===',
  'EPISODE_RATINGS_REPORT',
].forEach(token => {
  assert(saveMigration.includes(token), `Save migration should remove stale episode scorecard reports: ${token}`);
});

[
  'selectedEpisodeRatingsReport',
  'onOpenProductionHouse',
  'Open Production House <ChevronRight',
].forEach(token => {
  assert(!messages.includes(token), `Messages app should not show scorecard report navigation: ${token}`);
});

assert(!mobile.includes('onOpenProductionHouse'), 'MobilePage should not pass Production House navigation to Messages.');
assert(!app.includes('onOpenProductionHouse={() =>'), 'App should not wire message reports back to Production House.');

assert(
  pkg.scripts?.['audit:production-house-scorecard-qa'] === 'node scripts/audit-production-house-scorecard-qa.mjs',
  'package.json should expose audit:production-house-scorecard-qa.'
);

console.log('Production House scorecard QA audit passed.');
