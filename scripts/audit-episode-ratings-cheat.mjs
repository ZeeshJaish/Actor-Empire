import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const home = fs.readFileSync('views/HomePage.tsx', 'utf8');
const studioProductionQa = fs.readFileSync('views/home/homeStudioProductionQaActions.ts', 'utf8');
const homeQaSource = `${home}\n${studioProductionQa}`;
const packageJson = fs.readFileSync('package.json', 'utf8');

[
  ['triggerEpisodeRatingsQa', 'episode ratings cheat handler'],
  ['triggerEpisodeRatingsProductionHouseQa', 'production house episode ratings cheat handler'],
  ['Episode Ratings IMDb QA', 'visible cheat button'],
  ['Episode Ratings Production House QA', 'visible production house cheat button'],
  ['generateEpisodeRatings', 'real episode ratings generator usage'],
  ['cheat_episode_ratings_', 'repeatable QA cleanup prefix'],
  ['Open Phone > IMDb', 'test instruction alert'],
  ['Open Production House > Past Projects', 'production house test instruction alert'],
  ['setPage?.(Page.MOBILE)', 'direct phone navigation'],
  ['onOpenProductionHouseCheat?.()', 'direct production house navigation'],
].forEach(([needle, description]) => {
  assert(homeQaSource.includes(needle), `HomePage should include ${description}: ${needle}`);
});

[
  'Episode Ratings IMDb QA season',
  'Cheat QA prestige series for IMDb episode rating heatmap testing.',
].forEach(needle => {
  assert(!homeQaSource.includes(needle), `Episode ratings seeded project copy should not leak QA text: ${needle}`);
});

assert(
  packageJson.includes('audit:episode-ratings-cheat'),
  'package.json should expose the episode ratings cheat audit script.'
);

console.log('Episode ratings cheat audit passed.');
