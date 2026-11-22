import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/* 22 Nov 2026: the shows' category lists moved to services/awardCategories.ts (real-world lists, one category table) */
const awardLogic = `${read('services/awardLogic.ts')}\n${read('services/awardCategories.ts')}`;
const redCarpet = read('views/RedCarpetEvent.tsx');
const awardFlow = read('views/AwardNightFlow.tsx');
const imdb = read('views/mobile/ImdbApp.tsx');
const home = read('views/HomePage.tsx');
const productionQa = read('views/home/homeProductionQaActions.ts');
const homeQaSource = `${home}\n${productionQa}`;
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
  'ceremonyResolvedWinners',
  'currentResults.map',
  'isPlayerResolvedWinner',
  'won: isPlayerResolvedWinner(result, fullBallot, currentResults)',
  'const playerWon = isPlayerResolvedWinner(res, fullBallot, currentResults)',
  "outcome: playerWon ? 'WON' : 'NOMINATED'",
  'if (playerWon)',
  'upsertAwardRecord(updatedAwards, awardEntry)',
  'generateSeasonWinners(updatedPlayer, awardType, awardYear, ceremonyResolvedWinners)',
  /* 21 Nov 2026: the win news moved into settleAwardNight (services/awardNightSettlement.ts), fed by that saved season */
  'settleAwardNight(updatedPlayer, {',
  'historyEntry,',
  'ballot: fullBallot,',
  'playerAttended: true',
].forEach(token => {
  assert(redCarpet.includes(token), `Red carpet ceremony should save the same winners it shows: ${token}`);
});

/* 21 Nov 2026: the player's wins are read back from the season just saved, and several wins make one story (this was
   winNewsItems and news_multi_win_ in RedCarpetEvent.tsx) */
const settlement = read('services/awardNightSettlement.ts');
[
  'const wins = input.historyEntry.winners.filter(winner => winner.isPlayer);',
  'wins.length === 1 ? PLAYER_SINGLE_HEADLINES : PLAYER_MULTI_HEADLINES',
].forEach(token => {
  assert(settlement.includes(token), `Award night news should come from the same saved winners, several wins in one story: ${token}`);
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
  'sanitizeAwardRecords(player.awards || [])',
  'const careerNominations = awardsWon.length + awardsNom.length;',
  'imdb.awards.totalNominations',
  'imdb.awards.nominationsIncludesWins',
  'awardWinRate',
].forEach(token => {
  assert(imdb.includes(token), `IMDb awards should reconcile career totals and explain them: ${token}`);
});

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
  assert(homeQaSource.includes(token), `Home cheat menu should expose awards polish QA: ${token}`);
});

assert(
  pkg.scripts?.['audit:awards-polish'] === 'node scripts/audit-awards-polish.mjs',
  'package.json should expose audit:awards-polish.'
);

console.log('Awards polish audit passed.');
