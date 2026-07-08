import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const awardLogic = read('services/awardLogic.ts');
const redCarpet = read('views/RedCarpetEvent.tsx');
const awardFlow = read('views/AwardNightFlow.tsx');
const home = read('views/HomePage.tsx');
const pkg = JSON.parse(read('package.json'));

[
  'playerCreditRole',
  'getPlayerAwardNomineeName',
  'getPlayerCreativeCreditFlags',
  'Best Original Screenplay',
  'Best Director',
  'Best Picture',
  'PRODUCER',
  'WRITER',
  'DIRECTOR',
  'createAwardHistoryFromBallot',
].forEach(token => {
  assert(awardLogic.includes(token), `Award logic should support player creative awards: ${token}`);
});

[
  'buildAwardPressQuestions',
  'buildPremierePressQuestions',
  'newspaperLead:',
  'winNewsItems',
  'news_multi_win_',
  'ceremonyResolvedWinners',
  'currentResults.map',
  'isPlayerResolvedWinner',
  'won: isPlayerResolvedWinner(result, fullBallot, currentResults)',
  'const playerWon = isPlayerResolvedWinner(res, fullBallot, currentResults)',
  "outcome: playerWon ? 'WON' : 'NOMINATED'",
  'if (playerWon)',
  'upsertAwardRecord(updatedAwards, awardEntry)',
  'generateSeasonWinners(updatedPlayer, awardType, awardYear, ceremonyResolvedWinners)',
].forEach(token => {
  assert(redCarpet.includes(token), `Red carpet ceremony should save the same winners it shows: ${token}`);
});

[
  'AwardNomineeDisplay',
  'playerCategories?: PlayerAwardCategory[]',
  "winner: category.won ? playerNominee : category.rivals[0] || 'Another Nominee'",
  'nomineeProject(n)',
  'playerCategories.filter(category => category.won).length',
  'cfg.playerCategories?.some(category => category.won) ?? cfg.playerWins',
].forEach(token => {
  assert(awardFlow.includes(token), `Award night flow should display multi-category award outcomes from shared resolved winners: ${token}`);
});

assert(
  !redCarpet.includes('const result = currentResults[0]; // Focusing on primary nomination'),
  'Red carpet ceremony should not only stage the first player nomination.'
);

[
  'triggerAwardsPolishQa',
  'Awards Polish QA',
  "awardDef: { type: 'OSCAR'",
  'Best Original Screenplay',
  'Best Director',
  'Best Picture',
  'fullBallot',
  'playerCreditRole',
].forEach(token => {
  assert(home.includes(token), `Home cheat menu should expose awards polish QA: ${token}`);
});

assert(
  pkg.scripts?.['audit:awards-polish'] === 'node scripts/audit-awards-polish.mjs',
  'package.json should expose audit:awards-polish.'
);

console.log('Awards polish audit passed.');
