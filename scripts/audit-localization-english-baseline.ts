import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { INITIAL_PLAYER, type ActiveRelease, type Player } from '../types';
import { enTranslations } from '../services/localization/locales/en';
import { getPlayerLanguage, t } from '../services/i18n';
import { composeReleaseReaction, generateRoleAwareCriticReview, getReactionCombinationEstimate, type ReleaseReactionContext } from '../services/reactionTemplateEngine';
import { getOpeningTradeNarrative, getCriticTradeNarrative, generateReleaseSocialReactions, generateReleaseInstagramReactions } from '../services/releaseMediaNarrative';
import { compareEnglishBaseline } from './helpers/localizationBaselineGuard.mjs';

const snapshotFile = path.resolve('scripts/fixtures/localization-english-baseline.json');
const capture = process.argv.includes('--capture');
assert(!capture || !fs.existsSync(snapshotFile), 'Refusing to overwrite the frozen English baseline. Review an intentional English change explicitly.');
assert(capture || fs.existsSync(snapshotFile), 'Frozen English baseline is missing; capture it once before localization changes.');
const hash = (value: unknown) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reactionCases: Record<string, string> = {};
const focuses = ['OPENING', 'CRITIC', 'PERFORMANCE', 'CASTING', 'CAREER'] as const;
const context: ReleaseReactionContext = {
  seed: 'english_guard', title: 'English Guard Film', playerName: 'Ari Guard', studioName: 'Guard Studio', genre: 'drama',
  budget: 10_000_000, budgetLabel: '$10M', opening: 8_000_000, openingLabel: '$8M', rating: 8.8, performance: 90,
  role: 'HERO', roleLabel: 'Hero', billing: 'LEAD', careerArc: 'NEWCOMER', commercial: 'HIT', critical: 'ACCLAIMED',
  performanceRead: 'REVELATION', castRead: 'BALANCED', budgetRead: 'LEAN', againstType: false, isUniverse: false, isFranchise: false,
};
const record = (id: string, input: ReleaseReactionContext, focus: typeof focuses[number], variant: number) => {
  assert(!Object.hasOwn(reactionCases, id), `Duplicate baseline case ${id}`);
  const before = structuredClone(input);
  const output = composeReleaseReaction(input, focus, variant);
  assert.deepEqual(input, before, `Reaction rendering mutated context: ${id}`);
  assert.deepEqual(output, composeReleaseReaction(input, focus, variant), `Reaction is not deterministic: ${id}`);
  assert(!/\{[a-zA-Z0-9_]+\}/.test(`${output.headline} ${output.subtext} ${output.socialText}`), `Unresolved output tokens: ${id}`);
  reactionCases[id] = hash(output);
};
let index = 0;
for (const commercial of ['BREAKOUT', 'HIT', 'STEADY', 'SOFT', 'FLOP'] as const)
for (const critical of ['ACCLAIMED', 'POSITIVE', 'MIXED', 'POOR', 'PANNED'] as const)
for (const performanceRead of ['REVELATION', 'COMMANDING', 'SOLID', 'UNEASY', 'MISCAST'] as const)
for (const castRead of ['SCENE_STEALER', 'STAR_POWERED', 'BALANCED', 'OUTSHINED'] as const)
for (const budgetRead of ['MICRO', 'LEAN', 'STANDARD', 'TENTPOLE'] as const)
for (const focus of focuses) {
  const id = `matrix/${commercial}/${critical}/${performanceRead}/${castRead}/${budgetRead}/${focus}`;
  record(id, { ...context, seed: id, commercial, critical, performanceRead, castRead, budgetRead }, focus, index++ % 11);
}
// Exercise composition switches absent from the classification-only audit.
for (const genre of ['action', 'drama', 'horror', 'comedy', 'family', 'documentary'])
for (const world of ['standalone', 'universe', 'franchise'])
for (const career of ['open', 'againstType', 'typecast'])
for (const story of ['none', 'NATURAL_FIT', 'BOLD_INTERPRETATION', 'STORY_CONFLICT'] as const)
for (const hasRole of [false, true])
for (const hasCastSummary of [false, true])
for (const focus of focuses) {
  const id = `branches/${genre}/${world}/${career}/${story}/${hasRole}/${hasCastSummary}/${focus}`;
  record(id, {
    ...context, seed: id, genre, isUniverse: world === 'universe', isFranchise: world === 'franchise',
    role: hasRole ? 'VILLAIN' : undefined, roleLabel: hasRole ? 'Villain' : 'Other',
    againstType: career === 'againstType', careerArc: career === 'typecast' ? 'VILLAIN_ERA' : 'NEWCOMER',
    storyFitLabel: story === 'none' ? undefined : story,
    storyFitWarning: story === 'STORY_CONFLICT' ? 'A published English story conflict.' : undefined,
    castStoryHeadline: hasCastSummary ? 'Published cast headline' : undefined,
    castStorySummary: hasCastSummary ? 'Published cast summary.' : undefined,
  }, focus, index++ % 17);
}
for (let variant = 0; variant < 80; variant++) {
  for (const focus of focuses) record(`variants/${focus}/${variant}`, context, focus, variant);
}

const release = {
  id: 'english_guard_release', name: 'English Guard Film', type: 'MOVIE', roleType: 'LEAD', weekNum: 1,
  budget: 10_000_000, weeklyGross: [8_000_000], totalGross: 8_000_000, imdbRating: 8.8, productionPerformance: 90,
  projectDetails: { title: 'English Guard Film', genre: 'DRAMA', studioId: 'english_guard_studio', estimatedBudget: 10_000_000,
    castList: [{ isPlayer: true, actorId: 'PLAYER_SELF', storyRole: 'HERO', type: 'ACTOR' }], hiddenStats: {} },
} as unknown as ActiveRelease;
const player = structuredClone(INITIAL_PLAYER) as Player;
Object.assign(player, { id: 'english_guard_player', name: 'Ari Guard', age: 25, currentWeek: 10, money: 100_000,
  pastProjects: [], awards: [], businesses: [{ id: 'english_guard_studio', name: 'Guard Studio' }], activeReleases: [release] });
player.settings.language = 'en';
assert.equal(getPlayerLanguage(player), 'en');
assert.equal(getPlayerLanguage(null), 'en');
assert.equal(getPlayerLanguage({}), 'en');
assert.equal(getPlayerLanguage({ settings: { language: 'invalid' } } as any), 'en');
const beforePlayer = structuredClone(player);
const collectProducers = () => ({
  opening: getOpeningTradeNarrative(player, release), critic: getCriticTradeNarrative(player, release),
  criticReview: generateRoleAwareCriticReview(player, release),
  x: generateReleaseSocialReactions(player).map(({ timestamp, ...post }) => post),
  instagram: generateReleaseInstagramReactions(player),
});
const producers = collectProducers();
assert.deepEqual(collectProducers(), producers, 'English producers rerolled output');
assert.deepEqual(player, beforePlayer, 'English text producers mutated gameplay state');

const englishTranslations = Object.fromEntries(Object.entries(enTranslations).sort(([a], [b]) => a.localeCompare(b)));
for (const [key, value] of Object.entries(englishTranslations)) {
  // Current t() treats an empty English value as missing and returns the key.
  // Preserve that observed behavior here; fixing it is a separate UI-copy change.
  const resolved = value || key;
  assert.equal(t('en', key), resolved, `English dictionary lookup changed ${key}`);
  const vars = Object.fromEntries([...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(match => [match[1], `guard_${match[1]}`]));
  const expected = Object.entries(vars).reduce((text, [name, replacement]) => text.split(`{${name}}`).join(replacement), resolved);
  assert.equal(t('en', key, vars), expected, `English variable substitution changed ${key}`);
}
const source = ts.createSourceFile('reactionTemplateEngine.ts', fs.readFileSync('services/reactionTemplateEngine.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const literalShape = (node: ts.Node): unknown => {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return literalShape(node.expression);
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literalShape);
  if (ts.isObjectLiteralExpression(node)) return node.properties.map(property => ts.isPropertyAssignment(property)
    ? [property.name.getText(source), literalShape(property.initializer)] : property.getText(source));
  return node.getText(source);
};
const bankShape: Record<string, unknown> = {};
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^[A-Z][A-Z_]+$/.test(node.name.text) && node.initializer) bankShape[node.name.text] = literalShape(node.initializer);
  ts.forEachChild(node, visit);
};
visit(source);
const current = { schemaVersion: 1, englishTranslations, reactionCases, bankShape, combinationEstimate: getReactionCombinationEstimate(), producers };
if (capture) {
  fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
  fs.writeFileSync(snapshotFile, JSON.stringify(current, null, 2) + '\n', { flag: 'wx' });
  console.log(`Frozen English baseline captured once: ${Object.keys(englishTranslations).length} keys, ${Object.keys(reactionCases).length} reaction cases, ${Object.keys(bankShape).length} banks.`);
} else {
  const baseline = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
  assert.equal(baseline.schemaVersion, 1, 'Unsupported English baseline schema');
  assert(Object.keys(baseline.englishTranslations || {}).length > 0, 'Empty English baseline');
  assert(Object.keys(baseline.reactionCases || {}).length >= 10_000, 'Reaction baseline is incomplete');
  const differences = compareEnglishBaseline(baseline, current);
  assert.equal(differences.length, 0, `English baseline regression (${differences.length}):\n${differences.slice(0, 20).join('\n')}`);
  console.log(`English baseline passed: ${Object.keys(baseline.englishTranslations).length} frozen keys, ${Object.keys(reactionCases).length} deterministic reaction cases, producers and bank structure unchanged; player/context mutation checks passed.`);
}
