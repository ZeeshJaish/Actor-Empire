import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import { generateIndustryXPosts, generateXFeed, isIndustryInfoPost } from '../services/xLogic';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const player = {
  ...INITIAL_PLAYER,
  name: 'Test Star',
  age: 31,
  currentWeek: 18,
  stats: {
    ...INITIAL_PLAYER.stats,
    fame: 82,
    reputation: 88,
  },
  news: [
    {
      id: 'news_pop_base_live_action',
      headline: 'The live-action NARUTO movie is officially in pre-production',
      subtext: 'A global casting search is underway for Naruto, Sasuke, and Sakura.',
      category: 'INDUSTRY',
      week: 18,
      year: 31,
      impactLevel: 'HIGH',
    },
  ],
  activeReleases: [
    {
      id: 'release_billion_test',
      name: 'Golden Wind',
      type: 'MOVIE',
      roleType: 'LEAD',
      distributionPhase: 'THEATRICAL',
      weekNum: 7,
      weeklyGross: [420_000_000, 310_000_000, 180_000_000, 120_000_000],
      totalGross: 1_030_000_000,
      budget: 180_000_000,
      status: 'BLOCKBUSTER_TRACK',
      productionPerformance: 91,
      projectDetails: {
        title: 'Golden Wind',
        type: 'MOVIE',
        description: 'A test blockbuster.',
        studioId: 'WARNER_BROS',
        subtype: 'MOVIE',
        genre: 'ACTION',
        budgetTier: 'HIGH',
        estimatedBudget: 180_000_000,
        visibleHype: 'HIGH',
        hiddenStats: {
          scriptQuality: 90,
          directorQuality: 90,
          castingStrength: 90,
          distributionPower: 90,
          rawHype: 90,
          qualityScore: 90,
          prestigeBonus: 30,
          franchiseSynergy: 20,
          risk: 25,
        },
        directorName: 'A Director',
        visibleDirectorTier: 'AUTEUR',
        visibleScriptBuzz: 'HOT',
        visibleCastStrength: 'STACKED',
      },
    },
  ],
  awards: [
    {
      id: 'award_test',
      name: 'Academy Awards',
      category: 'Best Actor',
      year: 31,
      outcome: 'WON',
      projectId: 'release_billion_test',
      projectName: 'Golden Wind',
      type: 'OSCAR',
    },
  ],
  scheduledEvents: [
    {
      id: 'event_awards',
      title: 'Primetime Emmy Awards',
      type: 'AWARD_CEREMONY',
      week: 19,
      year: 31,
      description: 'Awards night.',
      data: {},
    },
  ],
  businesses: [
    {
      id: 'studio_test',
      name: 'Silver Screen Films',
      type: 'PRODUCTION_HOUSE',
      subtype: 'STUDIO',
      logo: '',
      color: '#111827',
      foundedWeek: 1,
      balance: 500_000_000,
      isActive: true,
      config: {} as any,
      stats: {} as any,
      staff: [],
      products: [],
      hiringPool: [],
      lastHiringRefreshWeek: 1,
      history: [],
    },
  ],
  commitments: [
    {
      id: 'commitment_studio_project',
      name: 'Studio Project',
      type: 'ACTING_GIG',
      energyCost: 10,
      income: 0,
      payoutType: 'WEEKLY',
      projectDetails: {
        title: 'Studio Project',
        type: 'MOVIE',
        description: 'A studio test project.',
        studioId: 'studio_test',
        subtype: 'MOVIE',
        genre: 'DRAMA',
        budgetTier: 'MID',
        estimatedBudget: 40_000_000,
        visibleHype: 'MID',
        hiddenStats: {
          scriptQuality: 70,
          directorQuality: 70,
          castingStrength: 70,
          distributionPower: 70,
          rawHype: 70,
          qualityScore: 70,
          prestigeBonus: 10,
          franchiseSynergy: 0,
          risk: 20,
        },
        directorName: 'A Director',
        visibleDirectorTier: 'PRO',
        visibleScriptBuzz: 'SOLID',
        visibleCastStrength: 'SOLID',
      },
    },
  ],
} as unknown as Player;

const industryPosts = generateIndustryXPosts(player);
assert(industryPosts.length >= 5, 'Industry accounts should generate multiple posts from live game state.');
assert(industryPosts.every(isIndustryInfoPost), 'All generated industry posts should be marked by industry account ids.');
assert(industryPosts.some(post => post.authorName === 'Pop Base'), 'Pop Base should be included as an info account.');
assert(industryPosts.some(post => post.authorName === 'Box Office Watch' && post.content.includes('Golden Wind')), 'Box office account should cover major active releases.');
assert(industryPosts.some(post => post.authorName === 'Awards Daily'), 'Awards account should cover awards and ceremonies.');
assert(industryPosts.some(post => post.authorName === 'Studio Wire'), 'Studio Wire should cover active studio slate movement.');

const fullFeed = generateXFeed(player);
assert(fullFeed.some(isIndustryInfoPost), 'The main X feed should include industry information posts.');

const xAppSource = readFileSync('views/mobile/XApp.tsx', 'utf8');
assert(xAppSource.includes("type FeedTab = 'FOR_YOU' | 'INDUSTRY' | 'FOLLOWING';"), 'X should expose an Industry feed tab.');
assert(xAppSource.includes("feed.filter(isIndustryInfoPost)"), 'Industry tab should filter to information-account posts.');
assert(!xAppSource.includes('likeBurst') && !xAppSource.includes('likeAnimation'), 'No special like animation should be added for this feature.');

console.log('X industry feed audit passed.');
