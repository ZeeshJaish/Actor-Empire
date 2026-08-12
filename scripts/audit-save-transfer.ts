import { INITIAL_PLAYER, type Player } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { __saveTransferTest } from '../services/saveTransfer';
import { readFileSync } from 'node:fs';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertThrowsMessage = (fn: () => unknown, needle: string, message: string) => {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error && error.message.includes(needle), message);
    return;
  }
  throw new Error(message);
};

const trimmed = __saveTransferTest.normalizeArchiveText(`\uFEFF  {"format":"actor-empire-save-transfer"}  `);
assert(trimmed === '{"format":"actor-empire-save-transfer"}', 'Transfer parser should tolerate BOM and whitespace.');

const doubleEncoded = __saveTransferTest.parseJsonTransfer(JSON.stringify(JSON.stringify({ format: 'actor-empire-save-transfer' }))) as any;
assert(doubleEncoded.format === 'actor-empire-save-transfer', 'Transfer parser should tolerate double-encoded JSON from buggy providers.');

assertThrowsMessage(
  () => __saveTransferTest.parseJsonTransfer('<html><body>Google Drive preview</body></html>'),
  'web page',
  'HTML/download-wrapper files should get a friendly wrong-file error.'
);

assertThrowsMessage(
  () => __saveTransferTest.parseJsonTransfer('1{"format":"actor-empire-save-transfer"}'),
  'Could not read this transfer file',
  'Malformed JSON should not expose raw JSON.parse errors.'
);

await __saveTransferTest.parseArchive(JSON.stringify({ currentWeek: 12, stats: {}, money: 5000 }))
  .then(() => {
    throw new Error('Unsigned raw player saves should be blocked.');
  })
  .catch(error => {
    assert(error instanceof Error && error.message.includes('raw save'), 'Raw legacy save rejection should explain the signed export requirement.');
  });

const bulkyPlayer = {
  ...INITIAL_PLAYER,
  id: 'bulky_transfer_save',
  name: 'Bulky Transfer',
  currentWeek: 45,
  logs: Array.from({ length: 260 }, (_, index) => ({
    week: (index % 52) + 1,
    year: 18 + Math.floor(index / 52),
    message: `Career log ${index}`,
    type: index % 9 === 0 ? 'positive' : 'neutral',
  })),
  news: Array.from({ length: 220 }, (_, index) => ({
    id: `news_${index}`,
    headline: index % 11 === 0 ? `Award record headline ${index}` : `Industry headline ${index}`,
    subtext: 'Saved from an old transfer build',
    category: 'INDUSTRY',
    week: (index % 52) + 1,
    year: 18 + Math.floor(index / 52),
    impactLevel: index % 11 === 0 ? 'HIGH' : 'LOW',
  })),
  inbox: Array.from({ length: 180 }, (_, index) => ({
    id: `msg_${index}`,
    sender: 'Studio',
    subject: `Offer ${index}`,
    text: 'Long contract history',
    type: 'SYSTEM',
    isRead: true,
    weekSent: 1,
  })),
  instagram: {
    ...INITIAL_PLAYER.instagram,
    posts: Array.from({ length: 260 }, (_, index) => ({ id: `ig_${index}`, image: '', caption: `Post ${index}`, likes: index, comments: 0, week: 1 })),
    feed: Array.from({ length: 140 }, (_, index) => ({ id: `feed_${index}`, image: '', caption: `Feed ${index}`, likes: index, comments: 0, week: 1 })),
  },
  x: {
    ...INITIAL_PLAYER.x,
    posts: Array.from({ length: 250 }, (_, index) => ({ id: `x_${index}`, text: `Post ${index}`, likes: index, reposts: 0, comments: 0, week: 1 })),
    feed: Array.from({ length: 130 }, (_, index) => ({ id: `xf_${index}`, text: `Feed ${index}`, likes: index, reposts: 0, comments: 0, week: 1 })),
  },
  youtube: {
    ...INITIAL_PLAYER.youtube,
    videos: Array.from({ length: 140 }, (_, index) => ({
      id: `yt_${index}`,
      title: `Video ${index}`,
      views: index * 100,
      likes: index,
      comments: Array.from({ length: 40 }, (_, commentIndex) => `Comment ${commentIndex}`),
      weeklyHistory: Array.from({ length: 80 }, (_, week) => ({ week, views: week * 100 })),
    })),
  },
  relationships: [
    ...INITIAL_PLAYER.relationships,
    {
      id: 'npc_keep_relationship',
      name: 'Important Friend',
      relation: 'Friend',
      closeness: 70,
      image: '',
      lastInteractionWeek: 1,
      lastInteractionAbsolute: 1,
      age: 31,
      gender: 'FEMALE',
    },
  ],
  flags: {
    ...INITIAL_PLAYER.flags,
    extraNPCs: Array.from({ length: 520 }, (_, index) => ({
      id: index === 5 ? 'npc_keep_relationship' : `npc_background_${index}`,
      name: `Background Talent ${index}`,
      occupation: index % 3 === 0 ? 'DIRECTOR' : 'ACTOR',
      age: 18 + (index % 50),
      image: '',
      stats: { charisma: 50, talent: 50 },
      fame: index % 100,
      reputation: 50,
      availability: 100,
    })),
  },
  world: {
    ...INITIAL_PLAYER.world,
    projects: Array.from({ length: 1200 }, (_, index) => ({
      id: `world_project_${index}`,
      title: `World Project ${index}`,
      genre: 'ACTION',
      studioId: 'WARNER_BROS',
      budgetTier: 'MID',
      quality: 50,
      boxOffice: index * 1000,
      year: 18 + Math.floor(index / 52),
      weekReleased: (index % 52) + 1,
      leadActorId: `npc_background_${index % 520}`,
      leadActorName: `Actor ${index}`,
      directorName: `Director ${index}`,
      reviews: 'MIXED',
    })),
    upcomingRivals: Array.from({ length: 50 }, (_, index) => ({
      id: `rival_${index}`,
      title: `Rival ${index}`,
      weekReleased: index + 1,
    })),
    musicIndustry: {
      chart: [],
      history: Array.from({ length: 320 }, (_, index) => ({ id: `chart_${index}`, week: index, year: 20, entries: [] })),
      recentReleases: Array.from({ length: 150 }, (_, index) => ({ id: `release_${index}`, title: `Song ${index}` })),
      scandals: Array.from({ length: 95 }, (_, index) => ({ id: `scandal_${index}`, heat: index })),
      rivalries: Array.from({ length: 95 }, (_, index) => ({ id: `rivalry_${index}`, heat: index })),
    },
  },
  activeReleases: [
    {
      id: 'release_big_history',
      name: 'Long Run Movie',
      type: 'MOVIE',
      roleType: 'LEAD',
      projectDetails: {
        title: 'Long Run Movie',
        castList: Array.from({ length: 50 }, (_, index) => ({ id: `cast_${index}`, name: `Cast ${index}`, isPlayer: false })),
        crewList: Array.from({ length: 30 }, (_, index) => ({ id: `crew_${index}`, name: `Crew ${index}` })),
        reviews: Array.from({ length: 24 }, (_, index) => ({ id: `review_${index}`, text: `Review ${index}` })),
        audienceReception: { quotes: Array.from({ length: 30 }, (_, index) => ({ id: `quote_${index}`, text: `Quote ${index}` })) },
      },
      weeklyGross: Array.from({ length: 90 }, (_, index) => index),
      weeklyStudioReceipts: Array.from({ length: 90 }, (_, index) => index),
      weeklyExhibitorReceipts: Array.from({ length: 90 }, (_, index) => index),
      weeklyDistributionBreakdowns: Array.from({ length: 90 }, (_, index) => ({ week: index, gross: index })),
      weekNum: 90,
      totalGross: 400000000,
      budget: 120000000,
      status: 'RUNNING',
      productionPerformance: 80,
      distributionPhase: 'THEATRICAL',
    },
  ],
  pastProjects: Array.from({ length: 14 }, (_, index) => ({
    id: `past_project_${index}`,
    name: `Past Project ${index}`,
    type: 'ACTING_GIG',
    roleType: 'LEAD',
    year: 20 + index,
    earnings: index * 1000,
    rating: 80,
    reception: 'Hit',
    projectQuality: 80,
    boxOfficeResult: 'HIT',
    outcomeTier: 'HIT',
    subtype: 'MOVIE',
    futurePotential: { sequelChance: 50 },
    studioId: 'WARNER_BROS',
    budget: 100000000,
    gross: 300000000,
    genre: 'ACTION',
    projectType: 'MOVIE',
    weeklyGross: Array.from({ length: 90 }, (_, week) => week),
    weeklyViews: Array.from({ length: 90 }, (_, week) => week),
    castList: Array.from({ length: 50 }, (_, castIndex) => ({ id: `past_cast_${index}_${castIndex}`, name: `Past Cast ${castIndex}` })),
    reviews: Array.from({ length: 24 }, (_, reviewIndex) => ({ id: `past_review_${index}_${reviewIndex}`, text: `Past review ${reviewIndex}` })),
    audienceReception: { quotes: Array.from({ length: 30 }, (_, quoteIndex) => ({ id: `past_quote_${index}_${quoteIndex}`, text: `Past quote ${quoteIndex}` })) },
    episodeRatings: [
      { season: 1, averageRating: 8.5, verdict: 'GREAT', episodes: Array.from({ length: 22 }, (_, ep) => ({ episode: ep + 1, rating: 8 + ep / 100 })) },
    ],
  })),
  commitments: [
    {
      id: 'commitment_big_cast',
      name: 'Active Production',
      type: 'ACTING_GIG',
      energyCost: 10,
      income: 1000,
      payoutType: 'WEEKLY',
      projectDetails: {
        title: 'Active Production',
        castList: Array.from({ length: 50 }, (_, index) => ({ id: `commit_cast_${index}`, name: `Commit Cast ${index}` })),
        crewList: Array.from({ length: 30 }, (_, index) => ({ id: `commit_crew_${index}`, name: `Commit Crew ${index}` })),
        reviews: Array.from({ length: 24 }, (_, index) => ({ id: `commit_review_${index}`, text: `Commit review ${index}` })),
        audienceReception: { quotes: Array.from({ length: 30 }, (_, index) => ({ id: `commit_quote_${index}`, text: `Commit quote ${index}` })) },
      },
    },
  ],
  businesses: [
    {
      id: 'studio_business_big_ledger',
      name: 'Long Studio',
      type: 'PRODUCTION_HOUSE',
      subtype: 'STUDIO',
      history: Array.from({ length: 900 }, (_, index) => ({ week: index, profit: index })),
      studioState: {
        financeLedger: Array.from({ length: 420 }, (_, index) => ({ id: `ledger_${index}`, week: index, year: 30, amount: index, type: 'THEATRICAL', label: `Ledger ${index}` })),
        rightsMarketNotices: Array.from({ length: 100 }, (_, index) => ({ id: `notice_${index}`, text: `Notice ${index}` })),
        subsidiaryDecisions: Array.from({ length: 160 }, (_, index) => ({ id: `decision_${index}`, title: `Decision ${index}` })),
        activeDecisionArcs: Array.from({ length: 160 }, (_, index) => ({ id: `arc_${index}`, title: `Arc ${index}` })),
      },
    },
  ],
} as unknown as Player;

const compacted = compactPlayerForPersistence(bulkyPlayer) as any;
assert(compacted.logs.length === 50, 'Compaction should keep bounded recent logs.');
assert(compacted.news.length === 80, 'Compaction should keep bounded recent news.');
assert(compacted.inbox.length === 120, 'Compaction should keep bounded inbox messages.');
assert(compacted.instagram.posts.length === 200 && compacted.instagram.feed.length === 80, 'Compaction should bound Instagram payloads.');
assert(compacted.x.posts.length === 200 && compacted.x.feed.length === 80, 'Compaction should bound X payloads.');
assert(compacted.youtube.videos.length === 120, 'Compaction should bound YouTube videos.');
assert(compacted.youtube.videos.every((video: any) => video.comments.length <= 12 && video.weeklyHistory.length <= 24), 'Compaction should bound YouTube nested payloads.');
assert(compacted.pastProjects.length === 14, 'Compaction should keep the full player filmography count.');
assert(compacted.pastProjects.every((project: any) => project.weeklyGross.length <= 52 && project.reviews.length <= 12 && project.castList.length <= 28), 'Compaction should trim bulky old project display payloads.');
assert(compacted.pastProjects.every((project: any) => project.episodeRatings?.[0]?.episodes?.length === 22), 'Compaction should preserve full season episode ratings.');
assert(compacted.activeReleases[0].weeklyGross.length === 52, 'Compaction should keep bounded active-release weekly curves.');
assert(compacted.activeReleases[0].projectDetails.castList.length === 28, 'Compaction should trim oversized active-release cast snapshots.');
assert(compacted.commitments[0].projectDetails.castList.length === 28, 'Compaction should trim oversized commitment cast snapshots.');
assert(compacted.businesses[0].history.length === 520, 'Compaction should keep bounded business operating history.');
assert(compacted.businesses[0].studioState.financeLedger.length === 260, 'Compaction should keep bounded studio finance ledgers.');
assert(compacted.world.projects.length === 900, 'Compaction should keep bounded world release history.');
assert(compacted.world.upcomingRivals.length === 32, 'Compaction should keep bounded upcoming rival slate.');
assert(compacted.flags.extraNPCs.some((npc: any) => npc.id === 'npc_keep_relationship'), 'Compaction should preserve referenced generated NPCs.');
assert(compacted.flags.extraNPCs.some((npc: any) => npc.id === 'npc_background_519'), 'Compaction should preserve recent generated NPCs.');
assert(!compacted.flags.extraNPCs.some((npc: any) => npc.id === 'npc_background_0'), 'Compaction should remove stale unreferenced generated NPCs.');
assert(Array.isArray(compacted.flags.recentTimeline) && compacted.flags.recentTimeline.length > 0, 'Compaction should preserve old history through recent timeline.');
assert(Array.isArray(compacted.flags.legacyHighlights), 'Compaction should preserve major history through legacy highlights.');

const appSource = readFileSync('App.tsx', 'utf8');
assert(
  appSource.includes('const persistedPlayerState = await persistCurrentSlotSnapshot(syncedPlayerState, {'),
  'Week advance should await persistence before showing the processed week.'
);
assert(
  appSource.includes('await saveGameData(`actorEmpireSave_${slot}`, playerToSave, { rethrow: options.rethrow });'),
  'Slot persistence should be able to rethrow critical save failures.'
);

console.log('Save transfer audit passed.');
