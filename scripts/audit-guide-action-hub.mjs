import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const guide = read('components/GuideView.tsx');
const mobile = read('views/mobile/MobilePage.tsx');
const pkg = JSON.parse(read('package.json'));
const localeFiles = [
  'services/localization/locales/en.ts',
  'services/localization/locales/fr.ts',
  'services/localization/locales/es.ts',
  'services/localization/locales/tr.ts',
  'services/localization/locales/de.ts',
  'services/localization/locales/pt-BR.ts',
];

[
  'PROBLEM_SOLVERS',
  'GuideActionButton',
  'ProblemSolverView',
  'STATUS_TIP_DEFINITIONS',
  'recommendedTips',
  'status.lowEnergy.title',
  'searchQuery',
  'filteredGuideResults',
  "'problem.roles.title'",
  "'problem.energy.title'",
  "'problem.awards.title'",
  "'problem.studio.title'",
  "guideText('problem.ui.what')",
  "guideText('problem.ui.whatNow')",
  "guideText('problem.ui.related')",
  'onOpenApp',
].forEach(token => {
  assert(guide.includes(token), `Guide should expose action-hub behavior: ${token}`);
});

[
  'I am not getting bigger roles',
  'Energy keeps stopping me',
  'Money or business is confusing',
  'Awards, IMDb, or release results feel unclear',
  'Relationships or dating are not making sense',
  'Studio, sequels, or universes feel complex',
].forEach(copy => {
  assert(!guide.includes(copy), `Guide problem-solver copy should be localized, not hard-coded: ${copy}`);
});

[
  "appMode: 'CASTLINK'",
  "appMode: 'TEAM'",
  "appMode: 'IMDB'",
  "appMode: 'BANK'",
  "appMode: 'LUXE'",
  "appMode: 'BOXOFFICE'",
].forEach(token => {
  assert(guide.includes(token), `Guide problem cards should deep-link to useful phone apps: ${token}`);
});

assert(
  mobile.includes('<GuideView') && mobile.includes('onOpenApp={(nextMode) => setAppMode(nextMode)}'),
  'MobilePage should pass phone-app navigation into GuideView.'
);

assert(
  pkg.scripts?.['audit:guide-action-hub'] === 'node scripts/audit-guide-action-hub.mjs',
  'package.json should expose audit:guide-action-hub.'
);

const requiredLocaleKeys = [
  'guide.problem.roles.title',
  'guide.problem.roles.what',
  'guide.problem.energy.title',
  'guide.problem.money.title',
  'guide.problem.awards.title',
  'guide.problem.relationships.title',
  'guide.problem.studio.title',
  'guide.problem.ui.what',
  'guide.problem.ui.whatNow',
  'guide.problem.ui.related',
  'guide.problem.search.placeholder',
  'guide.status.heading',
  'guide.status.lowEnergy.title',
  'guide.status.nominations.title',
  'guide.status.noRole.title',
  'guide.status.scriptsNoProduction.title',
  'guide.status.loanPressure.title',
];

localeFiles.forEach(file => {
  const source = read(file);
  requiredLocaleKeys.forEach(key => {
    assert(source.includes(`'${key}'`), `${file} should include ${key}`);
  });
});

console.log('Guide action hub audit passed.');
