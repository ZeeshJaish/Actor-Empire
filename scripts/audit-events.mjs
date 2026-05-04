import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const tempDir = await mkdtemp(join(tmpdir(), 'actor-event-audit-'));
const entry = join(tempDir, 'event-audit-entry.ts');
const bundle = join(tempDir, 'event-audit-bundle.mjs');

const source = `
	import { INITIAL_PLAYER, Player, Commitment, LifeEvent, InstaPost, InstaPostType, XPost } from '${root}types.ts';
	import { generateLifeEvent, generateLegalHearing, generateLuxeLifeEvent } from '${root}services/lifeEventLogic.ts';
	import { GENERAL_CRISIS_TEMPLATES } from '${root}services/productionEvents.ts';
	import { generateRandomCrisis } from '${root}services/crisisGenerator.ts';
	import { generateDirectorDecision } from '${root}services/directorGenerator.ts';
	import { SOCIAL_EVENTS_DB } from '${root}services/socialEvents.ts';
	import { calculateInstagramPostOutcome, getInstagramPostComments, getInstagramPresetCaption, INSTAGRAM_POST_CONFIGS, pickInstagramMicroBrand } from '${root}services/instagramLogic.ts';
	import { generateWeeklyFeed } from '${root}services/npcLogic.ts';
	import { generateTrendingTopics, generateXFeed } from '${root}services/xLogic.ts';
	import { createYoutubeBacklashEvent, createYoutubeCopyrightEvent, createYoutubeCreatorInviteEvent, createYoutubeRivalryEvent, processGameWeek } from '${root}services/gameLoop.ts';
	import { calculateStreamingAuctionOffer, getStreamingBidProfile } from '${root}views/lifestyle/business/ReleaseWizard.tsx';
	import { AWARD_CALENDAR, checkAwardEligibility, generateSeasonWinners, getAwardCeremonyYear, sanitizeAwardRecords } from '${root}services/awardLogic.ts';

type AuditFailure = { scope: string; item: string; error: string };
const failures: AuditFailure[] = [];
let checks = 0;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const makePlayer = (kind: 'early' | 'famous' | 'luxe' | 'legal' = 'famous'): Player => {
  const p = clone(INITIAL_PLAYER);
  p.name = 'QA Player';
  p.money = 5_000_000;
  p.currentWeek = 12;
  p.age = 32;
  p.flags = { ...(p.flags || {}), heat: kind === 'early' ? 0 : 45, activeCases: [] as any[] };
  p.news = [];
  p.inbox = [];
  p.logs = [];
  p.pendingEvents = [];
  p.scheduledEvents = [];
  p.stats = {
    ...p.stats,
    fame: kind === 'early' ? 4 : 78,
    reputation: 62,
    happiness: 75,
    health: 76,
    followers: 250000,
    talent: 70,
    experience: 70,
  };
  p.relationships = [
    ...p.relationships,
    { id: 'rel_partner', name: 'Avery Stone', relation: 'Partner', closeness: 58, image: '', lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 33, gender: 'FEMALE', npcId: 'npc_1' } as any,
    { id: 'rel_ex', name: 'Riley Vale', relation: 'Ex-Partner', closeness: 40, image: '', lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 35, gender: 'MALE', npcId: 'npc_2' } as any,
    { id: 'rel_friend', name: 'Jordan Friend', relation: 'Friend', closeness: 60, image: '', lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 31, gender: 'MALE' } as any,
  ];
  p.dating = {
    ...p.dating,
    isLuxeActive: true,
    matches: [
      { id: 'match_luxe_1', name: 'Luxe Star', age: 30, gender: 'FEMALE', image: '', bio: '', chemistry: 72, isPremium: true, officialStatus: 'MATCHED', scandalHeat: 18 } as any,
      { id: 'match_luxe_2', name: 'Second Flame', age: 34, gender: 'MALE', image: '', bio: '', chemistry: 55, isPremium: true, officialStatus: 'SEEING', scandalHeat: 20 } as any,
    ],
  };
	  p.businesses = [
    {
      id: 'biz_qa',
	      name: 'QA Cafe',
	      type: 'CAFE',
	      subtype: 'COFFEE_SHOP',
	      logo: '☕',
	      color: 'bg-zinc-800',
	      emoji: '☕',
	      balance: 150000,
	      foundedWeek: 1,
	      startedWeek: 1,
	      isActive: true,
	      config: {
	        theme: 'theme_min',
	        amenities: [],
	        marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
	      },
	      stats: {
	        valuation: 600000,
	        brandHealth: 55,
	        customerSatisfaction: 58,
	        hype: 44,
	        riskLevel: 10,
	        capacity: 50,
	        locations: 1,
	        weeklyRevenue: 0,
	        weeklyExpenses: 0,
	        weeklyProfit: 0,
	        lifetimeRevenue: 0,
	      },
	      staff: [],
	      products: [],
	      history: [],
	      hiringPool: [],
	      lastHiringRefreshWeek: 1,
	    } as any,
	  ];
	  p.youtube = {
	    ...p.youtube,
	    subscribers: kind === 'early' ? 25 : 250000,
	    totalChannelViews: kind === 'early' ? 500 : 4_000_000,
	    lifetimeEarnings: 25000,
	    isMonetized: true,
	    audienceTrust: 62,
	    fanMood: 66,
	    controversy: 35,
	    creatorIdentity: 'ACTOR_VLOGGER',
	    videos: [
	      {
	        id: 'yt_audit_video',
	        title: 'Audit Video',
	        type: 'VLOG',
	        thumbnailColor: 'bg-red-600',
	        views: 150000,
	        likes: 12000,
	        earnings: 3200,
	        weekUploaded: p.currentWeek,
	        yearUploaded: p.age,
	        isPlayer: true,
	        authorName: p.name,
	        qualityScore: 82,
	        uploadPlan: 'BTS',
	        controversyScore: 28,
	        trustImpact: 2,
	        weeklyHistory: [],
	        comments: [],
	      } as any,
	    ],
	  };
	  p.x = {
	    ...p.x,
	    followers: 80000,
	    posts: [],
	    feed: [],
	  };
	  p.instagram = {
	    ...p.instagram,
	    followers: 120000,
	    posts: [
	      {
	        id: 'ig_audit_post',
	        authorId: 'PLAYER',
	        authorName: p.name,
	        authorHandle: p.instagram.handle,
	        authorAvatar: '',
	        type: 'LIFESTYLE',
	        caption: 'Audit post',
	        week: p.currentWeek,
	        year: p.age,
	        likes: 1200,
	        comments: 75,
	        shares: 25,
	        saves: 40,
	        commentList: ['Audit comment'],
	        engagementScore: 22,
	        isPlayer: true,
	      } as any,
	    ],
	    feed: [],
	    npcStates: {},
	  };
	  if (kind === 'legal') {
    p.flags.activeCases = [{
      id: 'case_qa',
      title: 'QA Legal Case',
      description: 'Audit case',
      weeksRemaining: 0,
      severity: 'MEDIUM',
      evidence: 55,
      currentHearing: 1,
      totalHearings: 2,
      nextHearingWeek: p.currentWeek,
      evidenceStrength: 55,
      playerDefense: 48,
      status: 'ACTIVE',
      history: [],
    } as any];
  }
  return p;
};

const makeProject = (): Commitment => ({
  id: 'project_qa',
  name: 'QA Feature',
  roleType: 'LEAD',
  income: 0,
  energyCost: 0,
  type: 'ACTING_GIG',
  payoutType: 'LUMPSUM',
  projectPhase: 'PRODUCTION',
  phaseWeeksLeft: 4,
  totalPhaseDuration: 8,
  productionPerformance: 55,
  projectDetails: {
    title: 'QA Feature',
    type: 'MOVIE',
    genre: 'ACTION',
    studioId: 'PARAMOUNT',
    description: 'Audit project',
    subtype: 'STANDALONE',
    budgetTier: 'HIGH',
    estimatedBudget: 25_000_000,
    visibleHype: 'MEDIUM',
    hiddenStats: {
      scriptQuality: 62,
      directorQuality: 60,
      castingStrength: 60,
      distributionPower: 55,
      rawHype: 50,
      qualityScore: 55,
      prestigeBonus: 0,
    },
    castList: [],
    reviews: [],
  } as any,
} as Commitment);

const addAwardEligibleProject = (player: Player, mediaType: 'MOVIE' | 'SERIES' = 'MOVIE') => {
  player.pastProjects = [{
    id: \`award_project_\${mediaType}\`,
    name: mediaType === 'SERIES' ? 'QA Prestige Series' : 'QA Prestige Film',
    type: 'ACTING_GIG',
    roleType: 'LEAD',
    year: player.age,
    earnings: 1000000,
    rating: 9.3,
    reception: 'SUCCESS',
    projectQuality: 96,
    imdbRating: 9.3,
    boxOfficeResult: '$180.0M',
    outcomeTier: 'SUCCESS',
    subtype: 'STANDALONE',
    futurePotential: { sequelChance: 0, franchiseChance: 0, rebootChance: 0, renewalChance: 0, isFranchiseStarter: false, isSequelGreenlit: false, isRenewed: false, seriesStatus: 'N/A' },
    studioId: 'PARAMOUNT',
    genre: 'DRAMA',
    description: 'Audit awards project',
    projectType: mediaType,
    awards: [],
  } as any];
  player.activeReleases = [];
  player.awards = [];
};

const assertEvent = (event: LifeEvent | null, scope: string, item: string) => {
  if (!event) throw new Error('No event returned');
  if (!event.id || !event.title || !event.description) throw new Error('Missing id/title/description');
  if (!Array.isArray(event.options) || event.options.length === 0) throw new Error('Missing options');
  event.options.forEach((option, index) => {
    if (!option.label) throw new Error('Option missing label');
    if (typeof option.impact !== 'function') throw new Error(\`Option \${option.label} missing impact\`);
    const result = option.impact(makePlayer(scope.includes('legal') ? 'legal' : 'famous'));
    if (!result?.updatedPlayer) throw new Error(\`Option \${option.label} returned no player\`);
    if (typeof result.log !== 'string' || result.log.length < 2) throw new Error(\`Option \${option.label} returned bad log\`);
    checks += 1;
  });
};

const record = (scope: string, item: string, fn: () => void) => {
  try {
    fn();
  } catch (error) {
    failures.push({ scope, item, error: error instanceof Error ? error.message : String(error) });
  }
};

const assertScheduledLifeEvent = (event: any, scope: string, item: string) => {
  if (!event?.id || !event?.type || !event?.title) throw new Error('Bad scheduled event shape');
  const lifeEvent = event.data?.lifeEvent;
  assertEvent(lifeEvent, scope, item);
};

const assertInstaPost = (post: InstaPost, scope: string, item: string) => {
  if (!post?.id || !post.authorId || !post.authorName || !post.authorHandle) throw new Error(\`Bad Instagram post identity in \${scope}:\${item}\`);
  if (!post.type || !INSTAGRAM_POST_CONFIGS[post.type]) throw new Error(\`Bad Instagram post type in \${scope}:\${item}\`);
  if (typeof post.caption !== 'string') throw new Error(\`Bad Instagram caption in \${scope}:\${item}\`);
  ['week', 'year', 'likes', 'comments'].forEach((key) => {
    if (!Number.isFinite((post as any)[key])) throw new Error(\`Bad Instagram numeric field \${key} in \${scope}:\${item}\`);
  });
  if (post.commentList && !post.commentList.every(comment => typeof comment === 'string' && comment.length > 0)) {
    throw new Error(\`Bad Instagram comments in \${scope}:\${item}\`);
  }
  checks += 1;
};

const assertXPost = (post: XPost, scope: string, item: string) => {
  if (!post?.id || !post.authorId || !post.authorName || !post.authorHandle) throw new Error(\`Bad X post identity in \${scope}:\${item}\`);
  if (typeof post.content !== 'string' || post.content.length === 0) throw new Error(\`Bad X content in \${scope}:\${item}\`);
  ['timestamp', 'likes', 'retweets', 'replies'].forEach((key) => {
    if (!Number.isFinite((post as any)[key])) throw new Error(\`Bad X numeric field \${key} in \${scope}:\${item}\`);
  });
  if (!Array.isArray(post.replyList || []) || !Array.isArray(post.quoteList || [])) throw new Error(\`Bad X discussion lists in \${scope}:\${item}\`);
  checks += 1;
};

const withMockedRandom = async <T,>(value: number, fn: () => Promise<T>): Promise<T> => {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return await fn();
  } finally {
    Math.random = originalRandom;
  }
};

const recordAsync = async (scope: string, item: string, fn: () => Promise<void>) => {
  try {
    await fn();
  } catch (error) {
    failures.push({ scope, item, error: error instanceof Error ? error.message : String(error) });
  }
};

for (let i = 0; i < 300; i += 1) {
  record('life:famous', \`roll_\${i}\`, () => assertEvent(generateLifeEvent(makePlayer('famous')), 'life:famous', \`roll_\${i}\`));
}

for (let i = 0; i < 120; i += 1) {
  record('life:early', \`roll_\${i}\`, () => assertEvent(generateLifeEvent(makePlayer('early')), 'life:early', \`roll_\${i}\`));
}

for (let i = 0; i < 80; i += 1) {
  record('life:luxe', \`roll_\${i}\`, () => {
    const event = generateLuxeLifeEvent(makePlayer('luxe'));
    if (event) assertEvent(event, 'life:luxe', \`roll_\${i}\`);
  });
}

record('life:legal', 'active_case', () => assertEvent(generateLegalHearing(makePlayer('legal'), 'case_qa'), 'life:legal', 'active_case'));

GENERAL_CRISIS_TEMPLATES.forEach((template, templateIndex) => {
  record('production:general', \`template_\${templateIndex}\`, () => {
    const crisis = template(makeProject());
    if (!crisis.title || !Array.isArray(crisis.options) || crisis.options.length === 0) throw new Error('Bad crisis shape');
    crisis.options.forEach((option, optionIndex) => {
      const result = option.impact(makePlayer('famous'), makeProject());
      if (!result?.updatedPlayer || !result?.updatedProject || !result.log) throw new Error(\`Bad option result \${optionIndex}\`);
      checks += 1;
    });
  });
});

for (let i = 0; i < 100; i += 1) {
  record('production:random', \`roll_\${i}\`, () => {
    const crisis = generateRandomCrisis(makeProject(), makePlayer('famous'));
    if (!crisis.title || !Array.isArray(crisis.options) || crisis.options.length === 0) throw new Error('Bad random crisis shape');
    crisis.options.forEach((option, optionIndex) => {
      const result = option.impact(makePlayer('famous'), makeProject());
      if (!result?.updatedPlayer || !result?.updatedProject || !result.log) throw new Error(\`Bad random crisis option \${optionIndex}\`);
      checks += 1;
    });
  });
}

for (let i = 0; i < 60; i += 1) {
  record('production:director', \`roll_\${i}\`, () => {
    const decision = generateDirectorDecision(makeProject(), makePlayer('famous'));
    if (!decision.title || !Array.isArray(decision.options) || decision.options.length === 0) throw new Error('Bad director decision shape');
    decision.options.forEach((option, optionIndex) => {
      const result = option.impact(makePlayer('famous'), makeProject());
      if (!result?.updatedPlayer || !result?.updatedProject || !result.log) throw new Error(\`Bad director option \${optionIndex}\`);
      checks += 1;
    });
  });
}

Object.entries(SOCIAL_EVENTS_DB).forEach(([category, events]) => {
  events.forEach((event, eventIndex) => {
    record('social', \`\${category}_\${eventIndex}\`, () => {
      if (!event.title || !event.desc) throw new Error('Missing title/desc');
      if (!Array.isArray(event.options) || event.options.length === 0) throw new Error('Missing social options');
      event.options.forEach((option, optionIndex) => {
        if (!option.label || !option.logMessage || !option.impact || typeof option.impact !== 'object') throw new Error(\`Bad social option \${optionIndex}\`);
        checks += 1;
      });
    });
  });
});

(Object.keys(INSTAGRAM_POST_CONFIGS) as InstaPostType[]).forEach((postType) => {
  record('instagram:post_config', postType, () => {
    const config = INSTAGRAM_POST_CONFIGS[postType];
    if (!config.label || !config.shortLabel || !config.description) throw new Error('Missing Instagram config copy');
    if (!Number.isFinite(config.energy) || config.energy < 0) throw new Error('Bad Instagram energy cost');
    const caption = getInstagramPresetCaption(postType);
    if (typeof caption !== 'string' || caption.length === 0) throw new Error('Bad Instagram preset caption');
    const comments = getInstagramPostComments(postType, 6);
    if (comments.length === 0 || !comments.every(comment => typeof comment === 'string' && comment.length > 0)) throw new Error('Bad Instagram comment bank');
    const outcome = calculateInstagramPostOutcome(makePlayer('early'), postType, 0);
    ['likes', 'comments', 'shares', 'saves', 'followerGain', 'engagementScore'].forEach((key) => {
      if (!Number.isFinite((outcome as any)[key])) throw new Error(\`Bad Instagram outcome field \${key}\`);
    });
    if (!Array.isArray(outcome.commentList) || outcome.commentList.length === 0) throw new Error('Bad Instagram outcome comments');
    checks += 1;
  });
});

(['FASHION', 'FITNESS', 'TECH', 'BEVERAGE', 'LUXURY', 'AUTOMOTIVE'] as const).forEach(category => {
  record('instagram:brand_pool', category, () => {
    const brand = pickInstagramMicroBrand(category);
    if (!brand.id || !brand.name || !brand.handle || brand.category !== category) throw new Error('Bad Instagram brand pick');
    if (!Number.isFinite(brand.followers) || brand.followers <= 0) throw new Error('Bad Instagram brand followers');
    checks += 1;
  });
});

for (let i = 0; i < 25; i += 1) {
  record('instagram:weekly_feed', \`roll_\${i}\`, () => {
    generateWeeklyFeed(makePlayer('famous')).forEach((post, postIndex) => {
      assertInstaPost(post, 'instagram:weekly_feed', \`roll_\${i}_post_\${postIndex}\`);
    });
  });
}

for (let i = 0; i < 25; i += 1) {
  record('x:feed', \`roll_\${i}\`, () => {
    generateXFeed(makePlayer('famous')).forEach((post, postIndex) => {
      assertXPost(post, 'x:feed', \`roll_\${i}_post_\${postIndex}\`);
    });
  });
}

record('x:trends', 'default', () => {
  const trends = generateTrendingTopics(makePlayer('famous'));
  if (!Array.isArray(trends) || trends.length === 0) throw new Error('No X trends generated');
  trends.forEach((trend, index) => {
    if (!trend.tag || !trend.posts || !trend.category) throw new Error(\`Bad X trend \${index}\`);
    checks += 1;
  });
});

await recordAsync('social:weekly_sim', 'instagram_brand_dm', async () => {
  const player = makePlayer('famous');
  player.instagram.followers = 5000;
  player.stats.followers = 5000;
  player.flags.lastInstagramMicroEventAbsWeek = 0;
  player.flags.lastInstagramDmOfferAbsWeek = 0;
  player.activeSponsorships = [];
  const result = await withMockedRandom(0.01, () => processGameWeek(player));
  const states = Object.values(result.player.instagram.npcStates || {}) as any[];
  const brandAction = states.flatMap(state => state.chatHistory || []).find((message: any) => message.action?.kind === 'IG_BRAND_OFFER');
  if (!brandAction) throw new Error('No Instagram brand DM generated');
  const offer = brandAction.action.payload?.offer;
  if (!offer?.brandName || !Number.isFinite(offer.weeklyPay) || offer.weeklyPay <= 0 || !offer.requirements) throw new Error('Bad Instagram brand offer payload');
  checks += 1;
});

await recordAsync('social:weekly_sim', 'instagram_referral_dm', async () => {
  const player = makePlayer('famous');
  player.instagram.followers = 5000;
  player.stats.followers = 5000;
  player.flags.lastInstagramMicroEventAbsWeek = 0;
  player.flags.lastInstagramDmOfferAbsWeek = 0;
  player.activeSponsorships = [
    { id: 's1' } as any,
    { id: 's2' } as any,
    { id: 's3' } as any,
  ];
  const result = await withMockedRandom(0.01, () => processGameWeek(player));
  const states = Object.values(result.player.instagram.npcStates || {}) as any[];
  const referralAction = states.flatMap(state => state.chatHistory || []).find((message: any) => message.action?.kind === 'IG_REFERRAL');
  if (!referralAction) throw new Error('No Instagram referral DM generated');
  if (!Number.isFinite(referralAction.action.payload?.weeksLeft) || referralAction.action.payload.weeksLeft <= 0) throw new Error('Bad Instagram referral payload');
  checks += 1;
});

record('awards:calendar', 'stable_year_helpers', () => {
  const goldenGlobes = AWARD_CALENDAR[2];
  const oscars = AWARD_CALENDAR[10];
  if (getAwardCeremonyYear(goldenGlobes, 2, 17, 50) !== 18) throw new Error('Golden Globes should resolve to next age from week 50 invite');
  if (getAwardCeremonyYear(goldenGlobes, 2, 18, 2) !== 18) throw new Error('Golden Globes ceremony week should keep current age');
  if (getAwardCeremonyYear(oscars, 10, 17, 6) !== 17) throw new Error('Oscars same-year invite should keep current age');
  checks += 3;
});

record('awards:eligibility', 'dedupe_by_award_year', () => {
  const player = makePlayer('famous');
  player.age = 17;
  player.currentWeek = 50;
  addAwardEligibleProject(player, 'MOVIE');
  const noms = checkAwardEligibility(player, 50, 18);
  if (noms.length === 0) throw new Error('Expected Golden Globe nomination');
  player.awards.push({
    id: 'award_existing',
    name: 'Golden Globe Awards',
    category: noms[0].category,
    year: 18,
    outcome: 'NOMINATED',
    projectId: noms[0].project.id,
    projectName: noms[0].project.name,
    type: 'GOLDEN_GLOBE',
  } as any);
  const repeat = checkAwardEligibility(player, 50, 18);
  if (repeat.some(n => n.project.id === noms[0].project.id && n.category === noms[0].category)) throw new Error('Duplicate nomination returned for same award year');
  checks += 2;
});

record('awards:history', 'winner_history_uses_award_year', () => {
  const player = makePlayer('famous');
  player.age = 33;
  player.awards = [{
    id: 'award_win_stable',
    name: 'The Oscars',
    category: 'Best Actor',
    year: 17,
    outcome: 'WON',
    projectId: 'award_project_old',
    projectName: 'Old Win',
    type: 'OSCAR',
  } as any];
  const history = generateSeasonWinners(player, 'OSCAR', 17);
  const playerWinner = history.winners.find(w => w.category === 'Best Actor');
  if (history.year !== 17) throw new Error('History year changed to current age');
  if (!playerWinner?.isPlayer || playerWinner.projectName !== 'Old Win') throw new Error('Player win not preserved for old award year');
  checks += 2;
});

record('awards:sanitize', 'does_not_mutate_record_years', () => {
  const awards = sanitizeAwardRecords([
    { id: 'a1', name: 'The Oscars', type: 'OSCAR', year: 17, category: 'Best Actor', projectId: 'p1', projectName: 'Old', outcome: 'NOMINATED' },
    { id: 'a2', name: 'The Oscars', type: 'OSCAR', year: 17, category: 'Best Actor', projectId: 'p1', projectName: 'Old', outcome: 'WON' },
    { id: 'a3', name: 'The Oscars', type: 'OSCAR', year: 18, category: 'Best Actor', projectId: 'p1', projectName: 'Old', outcome: 'NOMINATED' },
  ] as any[]);
  if (!awards.some((award: any) => award.year === 17 && award.outcome === 'WON')) throw new Error('Missing preserved old win');
  if (!awards.some((award: any) => award.year === 18)) throw new Error('Sanitizer collapsed different award years');
  checks += 2;
});

await recordAsync('awards:weekly_sim', 'golden_globe_cross_year_schedule', async () => {
  const player = makePlayer('famous');
  player.age = 17;
  player.currentWeek = 50;
  player.scheduledEvents = [];
  player.news = [];
  addAwardEligibleProject(player, 'MOVIE');
  const result = await withMockedRandom(0.5, () => processGameWeek(player));
  const event = result.player.scheduledEvents.find((scheduled: any) => scheduled.type === 'AWARD_CEREMONY' && scheduled.data?.awardDef?.type === 'GOLDEN_GLOBE');
  if (!event) throw new Error('No Golden Globe ceremony scheduled');
  if (event.data.awardYear !== 18) throw new Error(\`Bad Golden Globe award year \${event.data.awardYear}\`);
  const nominationYears = result.player.awards.filter((award: any) => award.type === 'GOLDEN_GLOBE').map((award: any) => award.year);
  if (nominationYears.length === 0 || !nominationYears.every((year: number) => year === 18)) throw new Error('Golden Globe nominations not stamped with ceremony year');
  const newsCount = result.player.news.filter((news: any) => news.id === 'news_noms_GOLDEN_GLOBE_18').length;
  if (newsCount !== 1) throw new Error('Golden Globe nomination news missing or duplicated');
  checks += 3;
});

const auditPlatforms = [
  { id: 'NETFLIX', name: 'Netflix', baseBid: 12000000, qualityReq: 72, color: '#E50914', maxBudget: 140000000 },
  { id: 'APPLE_TV', name: 'Apple TV+', baseBid: 17000000, qualityReq: 82, color: '#FFFFFF', maxBudget: 180000000 },
  { id: 'DISNEY_PLUS', name: 'Disney+', baseBid: 11000000, qualityReq: 70, color: '#113CCF', maxBudget: 130000000 },
  { id: 'HULU', name: 'Hulu', baseBid: 7500000, qualityReq: 58, color: '#1CE783', maxBudget: 90000000 },
  { id: 'YOUTUBE', name: 'YouTube Premium', baseBid: 3000000, qualityReq: 38, color: '#FF0000', maxBudget: 35000000 },
];

[28, 40, 52, 66, 78, 88, 95].forEach(packageScore => {
  [false, true].forEach(isSeries => {
    [false, true].forEach(isPostTheatrical => {
      auditPlatforms.forEach(platform => {
        for (let i = 0; i < 12; i += 1) {
          record('production:bidding', \`\${platform.id}_score_\${packageScore}_series_\${isSeries}_post_\${isPostTheatrical}_roll_\${i}\`, () => {
            const budget = 100_000_000;
            const profile = getStreamingBidProfile(packageScore, isSeries, isPostTheatrical);
            const floor = Math.floor(budget * profile.floor);
            const bid = calculateStreamingAuctionOffer(platform, budget, packageScore, isSeries, 0, undefined, isPostTheatrical);
            if (!bid) throw new Error('No bid generated for opening auction');
            if (!Number.isFinite(bid.amount) || bid.amount <= 0) throw new Error('Bad bid amount');
            if (!Number.isFinite(bid.bidValue) || bid.bidValue <= 0) throw new Error('Bad bid value');
            if ((bid.fundingAmount || 0) < 0) throw new Error('Negative funding amount');
            if (bid.type === 'GREENLIGHT_DEAL' && bid.amount + (bid.fundingAmount || 0) !== bid.bidValue) throw new Error('Greenlight bid value mismatch');
            if (packageScore >= 45 && bid.amount < floor) throw new Error(\`Bid below safe floor: got \${bid.amount}, expected at least \${floor}\`);
            if (packageScore < 45 && bid.amount < Math.floor(budget * 0.8)) throw new Error('Low quality bid fell below acceptable discount floor');
            checks += 1;
          });
        }
      });
    });
  });
});

record('youtube:event', 'copyright', () => {
  assertScheduledLifeEvent(createYoutubeCopyrightEvent('Audit Video', 1250, 62), 'youtube:event', 'copyright');
});

record('youtube:event', 'backlash_low', () => {
  assertScheduledLifeEvent(createYoutubeBacklashEvent('Audit Video', 45), 'youtube:event', 'backlash_low');
});

record('youtube:event', 'backlash_high', () => {
  assertScheduledLifeEvent(createYoutubeBacklashEvent('Audit Video', 88), 'youtube:event', 'backlash_high');
});

(['PODCAST', 'CREATOR_GALA', 'PLATFORM_SUMMIT'] as const).forEach(kind => {
  record('youtube:event', \`invite_\${kind}\`, () => {
    assertScheduledLifeEvent(createYoutubeCreatorInviteEvent(makePlayer('famous'), kind), 'youtube:event', \`invite_\${kind}\`);
  });
});

for (let i = 0; i < 25; i += 1) {
  record('youtube:event', \`rivalry_\${i}\`, () => {
    assertScheduledLifeEvent(createYoutubeRivalryEvent(makePlayer('famous')), 'youtube:event', \`rivalry_\${i}\`);
  });
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, checks, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks }, null, 2));
`;

try {
  await writeFile(entry, source);
  await build({
    entryPoints: [entry],
    outfile: bundle,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
    external: ['@google/genai'],
  });
  await import(pathToFileURL(bundle).href);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
