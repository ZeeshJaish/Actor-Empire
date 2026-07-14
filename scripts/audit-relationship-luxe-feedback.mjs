import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const gameActions = read('hooks/useGameActions.ts');
const english = read('services/localization/locales/en.ts');
const localeFiles = [
  'services/localization/locales/en.ts',
  'services/localization/locales/es.ts',
  'services/localization/locales/fr.ts',
  'services/localization/locales/de.ts',
  'services/localization/locales/tr.ts',
  'services/localization/locales/pt-BR.ts'
];
const luxeApp = read('views/mobile/LuxeApp.tsx');
const mobilePage = read('views/mobile/MobilePage.tsx');
const rootMobilePage = read('views/MobilePage.tsx');
const datingLogic = read('services/datingLogic.ts');

assert(
  gameActions.includes("getPregnancyFeedbackCopy('NONE', partner.name, prev)") &&
    gameActions.includes('setToastMessage({ title: feedback.title, subtext: feedback.toast })'),
  'Relationship intimacy should use pregnancy feedback copy for non-pregnancy outcomes.'
);

assert(
  english.includes("'services.family.pregnancy.none.title': 'Intimacy Complete'") &&
    english.includes('No pregnancy risk from this intimacy.'),
  'English non-pregnancy intimacy feedback should say the action completed and avoid locked wording.'
);

for (const localeFile of localeFiles) {
  const source = read(localeFile);
  assert(
    !source.includes("'services.family.pregnancy.none.title': 'Intimacy Locked'") &&
      !source.includes("'services.family.pregnancy.none.title': 'Intimidade Bloqueada'"),
    `${localeFile} should not show locked wording for successful non-pregnancy intimacy.`
  );
}

assert(
  english.includes("'dating.tinder.modal.hookupLocked.title': 'Hookup Happened'"),
  'Tinder intimacy success title should avoid locked wording.'
);

[
  "type LuxeView = 'GATE' | 'BROWSE' | 'CHAT'",
  "setView(activeChatMatchId ? 'CHAT' : 'BROWSE')",
  'setCandidates(getLuxeCandidates(player, 5, rotationSeed))',
  'No Fresh Matches',
  'Luxe has run out of eligible picks.',
  "onClick={handlePaidRefresh}",
  "primaryAction?: 'MAKE_OFFICIAL'",
  "setChatActionMode('ASK')",
  'Make Official',
  'Ready to make this official',
  'If they say yes, this Luxe match becomes your partner in Connections.',
].forEach(token => {
  assert(luxeApp.includes(token), `Luxe app should expose a usable browse or empty state: ${token}`);
});

assert(
  mobilePage.includes("onOpenLuxe={() => setAppMode('LUXE')}") &&
    rootMobilePage.includes("onOpenLuxe={() => setAppMode('LUXE')}"),
  'Both mobile surfaces should route the Dating folder Luxe icon into LuxeApp.'
);

assert(
  datingLogic.includes('export const getLuxeCandidates') &&
    datingLogic.includes('if (ranked.length === 0) return []'),
  'Luxe candidate generation should return an empty list that the UI can explain instead of crashing.'
);

console.log('Relationship and Luxe feedback audit passed.');
