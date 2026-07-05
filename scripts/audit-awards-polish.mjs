import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const awardLogic = read('services/awardLogic.ts');
const redCarpet = read('views/RedCarpetEvent.tsx');
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
  'ceremonyResolvedWinners',
  'currentResults.map',
  'PLAYER_CATEGORY',
  'winner: getCeremonyWinnerName(result)',
  'winnerEntry.isPlayer',
  'upsertAwardRecord(updatedAwards, awardEntry)',
  'generateSeasonWinners(updatedPlayer, awardType, awardYear, ceremonyResolvedWinners)',
].forEach(token => {
  assert(redCarpet.includes(token), `Red carpet ceremony should save the same winners it shows: ${token}`);
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
