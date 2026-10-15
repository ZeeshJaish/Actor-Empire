import fs from 'node:fs';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ActiveRelease, GameLanguage, Player } from '../types';
import { t } from '../services/i18n';
import { getOpeningTradeNarrative, getCriticTradeNarrative, generateReleaseSocialReactions, generateReleaseInstagramReactions } from '../services/releaseMediaNarrative';
import { composeReleaseReaction, getReactionCombinationEstimate, type ReleaseReactionContext } from '../services/reactionTemplateEngine';
import { NewsApp } from '../views/mobile/NewsApp';
import { SocialPage } from '../views/SocialPage';

const languages: GameLanguage[] = ['en', 'pt-BR', 'fr', 'es', 'tr', 'de'];
const release = {
  id: 'localization_audit_release', name: 'Audit Film', type: 'MOVIE', roleType: 'LEAD', weekNum: 1,
  budget: 10_000_000, weeklyGross: [8_000_000], totalGross: 8_000_000, imdbRating: 8.8, productionPerformance: 90,
  projectDetails: { genre: 'DRAMA', studioId: 'audit_studio', estimatedBudget: 10_000_000,
    castList: [{ isPlayer: true, actorId: 'PLAYER_SELF', storyRole: 'HERO', type: 'ACTOR' }], hiddenStats: {} },
} as unknown as ActiveRelease;
const fixture = (language: GameLanguage) => ({
  id: 'audit_player', name: 'Audit Player', gender: 'MALE', age: 25, currentWeek: 10, money: 100_000,
  settings: { language }, stats: { fame: 50, reputation: 50, experience: 30 }, energy: { current: 100, max: 100 },
  pastProjects: [], awards: [], businesses: [{ id: 'audit_studio', name: 'Audit Studio' }], activeReleases: [release],
  relationships: [{ id: 'audit_friend', name: 'Audit Friend', relation: 'Friend', closeness: 75, age: 25 }],
  bloodline: [], assets: [], portfolio: [], customItems: [], world: {}, flags: {}, news: [],
} as unknown as Player);
const evidence: any = { languages: [], combinations: {}, checks: [] };
let baseline: any;
for (const language of languages) {
  const player = fixture(language);
  const generated = {
    opening: getOpeningTradeNarrative(player, release), critic: getCriticTradeNarrative(player, release),
    x: generateReleaseSocialReactions(player).map(post => ({ content: post.content, replies: post.replyList })),
    instagram: generateReleaseInstagramReactions(player).map(post => ({ caption: post.caption, comments: post.commentList })),
  };
  if (language === 'en') baseline = generated;
  assert.deepEqual(generated, baseline, `${language}: expected current English-only engine reproduction`);
  player.news = [{ id: 'audit_news', ...generated.opening, category: 'TOP_STORY', impactLevel: 'HIGH', week: 10, year: 25 }];
  const newsMarkup = renderToStaticMarkup(<NewsApp player={player} onBack={() => {}} />);
  assert(newsMarkup.includes(generated.opening.headline), 'News renders stored English headline');
  assert(newsMarkup.includes(t(language, 'news.topStories')), 'News shell uses selected language');
  fs.writeFileSync(`docs/superpowers/reports/2026-10-01-localization-audit/news-${language}.html`, newsMarkup);
  const socialMarkup = renderToStaticMarkup(<SocialPage player={player} onInteract={() => {}} onContinueAsChild={() => {}} />);
  assert(socialMarkup.includes('INNER CIRCLE') || socialMarkup.includes('FRIENDS'), 'Social renders English groups');
  fs.writeFileSync(`docs/superpowers/reports/2026-10-01-localization-audit/social-${language}.html`, socialMarkup);
  const missingKey = 'services.x.industry.boxOfficeRun';
  const missingFallback = t(language, missingKey, { title: 'Audit Film', gross: '8M' });
  assert.equal(missingFallback, t('en', missingKey, { title: 'Audit Film', gross: '8M' }));
  evidence.languages.push({ language, identicalToEnglishGeneratedContent: true, localizedNewsShell: true, englishNewsBody: true, englishSocialGroups: true, missingFallback });
}
// Changing the setting cannot retranslate content stored as rendered strings.
const previousPlayer = fixture('pt-BR');
previousPlayer.news = [{ id: 'saved_news', headline: 'Manchete salva em português', subtext: 'Texto salvo.', category: 'TOP_STORY', impactLevel: 'HIGH', week: 10, year: 25 }];
previousPlayer.settings.language = 'fr';
const switchedMarkup = renderToStaticMarkup(<NewsApp player={previousPlayer} onBack={() => {}} />);
assert(switchedMarkup.includes('Manchete salva em português'));
assert(switchedMarkup.includes(t('fr', 'news.topStories')));
evidence.checks.push('Portuguese stored headline survives switching to French; only shell changes.');

const context: ReleaseReactionContext = {
  seed: 'audit', title: 'Audit Film', playerName: 'Audit Player', studioName: 'Audit Studio', genre: 'drama',
  budget: 10_000_000, budgetLabel: '$10M', opening: 8_000_000, openingLabel: '$8M', rating: 8.8, performance: 90,
  role: 'HERO', roleLabel: 'Hero', billing: 'LEAD', careerArc: 'NEWCOMER', commercial: 'HIT', critical: 'ACCLAIMED',
  performanceRead: 'REVELATION', castRead: 'BALANCED', budgetRead: 'LEAN', againstType: false, isUniverse: false, isFranchise: false,
};
let combinations = 0;
const sample: any[] = [];
for (const commercial of ['BREAKOUT', 'HIT', 'STEADY', 'SOFT', 'FLOP'] as const)
for (const critical of ['ACCLAIMED', 'POSITIVE', 'MIXED', 'POOR', 'PANNED'] as const)
for (const performanceRead of ['REVELATION', 'COMMANDING', 'SOLID', 'UNEASY', 'MISCAST'] as const)
for (const castRead of ['SCENE_STEALER', 'STAR_POWERED', 'BALANCED', 'OUTSHINED'] as const)
for (const budgetRead of ['MICRO', 'LEAN', 'STANDARD', 'TENTPOLE'] as const)
for (const focus of ['OPENING', 'CRITIC', 'PERFORMANCE', 'CASTING', 'CAREER'] as const) {
  const reaction = composeReleaseReaction({ ...context, commercial, critical, performanceRead, castRead, budgetRead }, focus);
  for (const text of [reaction.headline, reaction.subtext, reaction.socialText]) assert(!/\{[a-zA-Z0-9_]+\}/.test(text), 'No unresolved engine placeholders');
  combinations++;
  if (sample.length < 5) sample.push(reaction);
}
evidence.combinations = { syntheticContextCombinations: combinations, advertisedEngineEstimate: getReactionCombinationEstimate(), note: 'Estimate is a product of bank sizes, not a verified count of distinct reachable sentences. Matrix covers five main classification dimensions and five focuses, with fixed genre, role, world and career inputs.' };
evidence.sample = baseline;
evidence.checks.push('Stored news language switch and all six language producer/render checks reproduced.');
fs.writeFileSync('docs/superpowers/reports/2026-10-01-localization-audit/runtime-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
