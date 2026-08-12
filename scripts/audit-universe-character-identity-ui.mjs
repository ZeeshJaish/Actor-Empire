import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const wizard = [
    read('views/lifestyle/business/GreenlightWizard.tsx'),
    read('views/lifestyle/business/components/GreenlightCastStep.tsx'),
    read('views/lifestyle/business/greenlightProjectBuilder.ts')
].join('\n');
const developmentLab = [
    read('views/lifestyle/business/components/DevelopmentLabFranchiseManager.tsx'),
    read('views/lifestyle/business/components/DevelopmentLabUniverseDashboard.tsx')
].join('\n');
const imdb = read('views/mobile/ImdbApp.tsx');
const universeLogic = read('services/universeLogic.ts');
const newsLogic = read('services/newsLogic.ts');
const reactionEngine = read('services/reactionTemplateEngine.ts');
const localePaths = [
    'services/localization/locales/en.ts',
    'services/localization/locales/de.ts',
    'services/localization/locales/es.ts',
    'services/localization/locales/fr.ts',
    'services/localization/locales/pt-BR.ts',
    'services/localization/locales/tr.ts'
];

assert.match(wizard, /greenlight\.characterIdentity\.autoFilled/, 'greenlight should explain that identity defaults are automatic and optional');
assert.match(wizard, /locked=\{Boolean\(selectedCharacterOption\)\}/, 'linked canon characters should inherit a locked identity instead of creating repetitive setup');
assert.match(wizard, /storyFunction: c\.storyFunction \|\| suggestedIdentity\.storyFunction/, 'project cast should persist its plot function');
assert.match(wizard, /storyRole: c\.storyRole \|\| suggestedIdentity\.storyRole/, 'project cast should persist its audience view');
assert.match(wizard, /abilityType: c\.abilityType \|\| suggestedIdentity\.abilityType/, 'project cast should persist its ability source');
assert.match(wizard, /nature: c\.nature \|\| suggestedIdentity\.nature/, 'project cast should persist its character type');

assert.match(developmentLab, /getCharacterIdentityOption\('storyFunction'/, 'universe and franchise rosters should show plot function');
assert.match(developmentLab, /getCharacterIdentityOption\('storyRole'/, 'universe and franchise rosters should show audience view');
assert.match(developmentLab, /getCharacterIdentityOption\('abilityType'/, 'universe and franchise rosters should show ability profile');
assert.match(developmentLab, /getCharacterIdentityOption\('nature'/, 'universe and franchise rosters should show character type');
assert.match(imdb, /character\.identity\.storyRole/, 'IMDb dossier should show story identity');
assert.match(imdb, /character\.identity\.ability/, 'IMDb dossier should show ability profile');

assert.match(universeLogic, /member\.type !== 'DIRECTOR'/, 'director credits must be excluded from universe characters');
assert.match(universeLogic, /NON_ACTING_UNIVERSE_CREDIT_PATTERN/, 'legacy non-acting credits should also be excluded');
assert.match(universeLogic, /existing\?\.storyFunction \|\| character\.storyFunction/, 'returning characters should preserve established plot function');
assert.match(universeLogic, /existing\?\.storyRole \|\| character\.storyRole/, 'returning characters should preserve established canon identity');
assert.match(universeLogic, /existing\?\.nature \|\| character\.nature/, 'returning characters should preserve established character type');
assert.match(newsLogic, /getCastStoryRead/, 'universe news should use the same ensemble interpretation as Greenlight');
assert.match(newsLogic, /generateUniverseSocialReactions/, 'universe releases should create role-aware social reactions');
assert.match(reactionEngine, /castStorySummary/, 'regular release coverage should understand the saved cast matchup');

for (const localePath of localePaths) {
    const locale = read(localePath);
    assert.doesNotMatch(locale, /'imdb\.franchise\.activeHeroes': '(?:Active Heroes|Heróis ativos|Héros actifs)'/, `${localePath} must not label every universe character a hero`);
    assert.match(locale, /'imdb\.franchise\.activeHeroes': 'Active Characters'/, `${localePath} should use the neutral Active Characters label`);
    assert.match(locale, /'character\.identity\.ability\.NONE': 'No powers'/, `${localePath} should include the neutral ability default`);
}

console.log('Universe character identity UI audit passed.');
