import {
  INITIAL_PLAYER,
  type OwnedStreamingCatalogLicense,
  type PlatformAiContentPlan,
  type PlatformAiReleaseEntry,
  type PlatformAiReleaseMemory,
  type Player,
} from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { normalizePlatformAiState } from '../services/platformAi';
import { __saveTransferTest } from '../services/saveTransfer';
import { readFileSync } from 'node:fs';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertDoesNotThrow = <T>(fn: () => T, message: string): T => {
  try {
    return fn();
  } catch (error) {
    throw new Error(`${message} ${error instanceof Error ? error.message : String(error)}`);
  }
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

const referenceAwarePlayer = structuredClone(bulkyPlayer) as any;
const lateProject = (id: string, extra: Record<string, unknown> = {}) => ({
  ...referenceAwarePlayer.world.projects[0],
  id,
  title: `Late ${id}`,
  ...extra,
});
const lateReferencedProjectIds = [
  'late-slate-project',
  'late-release-entry-project',
  'late-streaming-window-project',
  'late-release-memory-project',
  'late-rights-project',
  'late-production-project',
  'late-award-project',
  'late-player-project',
  'late-acquired-player-project',
];
const referencePlan = (
  id: string,
  sourceProjectIds: string[],
  releaseEntries: PlatformAiReleaseEntry[] = [],
): PlatformAiContentPlan => ({
  id,
  platformId: 'NETFLIX',
  controllerAtCommitment: 'AI',
  source: 'LICENSED_RELEASED_TITLE',
  status: 'RIGHTS_READY',
  title: `Reference plan ${id}`,
  projectType: 'MOVIE',
  genre: 'DRAMA',
  targetAudience: 'PG-13',
  sourceProjectIds,
  rightsContractIds: [],
  cataloguePackageId: null,
  commissionId: null,
  sourceStudioId: null,
  streamingWindow: 'POST_THEATRICAL_WINDOW',
  localizationLevel: 'DUBS_AND_SUBTITLES',
  releaseCountryIds: ['US'],
  minimumGuaranteeMillions: 0,
  rightsCostMillions: 0,
  productionFundingMillions: 0,
  paidSpendMillions: 0,
  marketingReserveMillions: 0,
  contingencyMillions: 0,
  committedAtAbsoluteWeek: 990,
  rightsReadyAtAbsoluteWeek: 991,
  localizationReadyAtAbsoluteWeek: null,
  premiereAtAbsoluteWeek: null,
  releasePattern: null,
  releaseEntries,
  scheduledAtAbsoluteWeek: null,
  releasedAtAbsoluteWeek: null,
  industryProductionId: null,
  forecast: { strategic: 50, creative: 50, commercial: 50, prestige: 50, risk: 50 },
});
referenceAwarePlayer.world.projects = [
  ...referenceAwarePlayer.world.projects,
  ...lateReferencedProjectIds.map(id => lateProject(
    id,
    id === 'late-streaming-window-project' ? { streamingWindows: [{ id: 'late-canonical-window' }] } : {},
  )),
];
referenceAwarePlayer.world.projects.find((project: any) => project.id === 'late-player-project').studioId = 'PLAYER_STUDIO';
const acquiredSourceStudioId = 'ACQUIRED_STUDIO_SOURCE';
referenceAwarePlayer.businesses[0].studioState.acquisitionPortfolio = {
  sourceStudioId: acquiredSourceStudioId,
};
referenceAwarePlayer.world.projects.find((project: any) => project.id === 'late-acquired-player-project').studioId = acquiredSourceStudioId;
const netflix = normalizePlatformAiState(
  referenceAwarePlayer.world.platforms.NETFLIX,
  referenceAwarePlayer.id,
  1_000,
);
netflix.ai.slate = [referencePlan('late-reference-plan', ['late-slate-project'], [{
    id: 'late-reference-entry',
    sourceProjectId: 'late-release-entry-project',
    canonicalProjectId: 'late-release-entry-project',
    rightsContractId: null,
    premiereAtAbsoluteWeek: 995,
    localizationReadyAtAbsoluteWeek: 994,
    countryIds: ['US'],
    releasePattern: 'MOVIE_SINGLE_PREMIERE',
    installmentAbsoluteWeeks: [995],
    status: 'SCHEDULED',
    releasedAtAbsoluteWeek: null,
    streamingWindowId: null,
  }])];
netflix.ai.releaseMemory = [{
  projectId: 'late-release-memory-project',
  releasedAtAbsoluteWeek: 990,
  genre: 'DRAMA',
  targetAudience: 'PG-13',
  leadActorId: null,
  directorId: null,
  quality: 70,
  commercialScore: 70,
  prestigeScore: 70,
  subscriberImpactMillions: 0.1,
  outcome: 'SOLID',
  awardWins: 0,
  observedAwardKeys: [],
} satisfies PlatformAiReleaseMemory];
netflix.ai.rightsContracts = [{
  id: 'late-reference-right',
  sourceProjectId: 'late-rights-project',
  titleAtSigning: 'Late Rights Project',
  licensorName: 'Audit Licensor',
  territory: 'GLOBAL',
  durationWeeks: 104,
  exclusivity: 'NON_EXCLUSIVE',
  minimumGuarantee: 0,
  platformRevenueShare: 70,
  licensorRevenueShare: 30,
  signedAtAbsoluteWeek: 990,
  startsAtAbsoluteWeek: 991,
  expiresAtAbsoluteWeek: 1095,
  status: 'ACTIVE',
} satisfies OwnedStreamingCatalogLicense];
(netflix.ai as any).pendingAudienceSettlements = [
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `settled-transfer-audience-${index}`,
    streamingWindowId: `settled-transfer-window-${index}`,
    projectId: `settled-transfer-project-${index}`,
    planId: `settled-transfer-plan-${index}`,
    subscriberImpactMillions: 0.1,
    status: 'SETTLED',
    createdAtAbsoluteWeek: index,
    settledAtAbsoluteWeek: index + 1,
  })),
  ...Array.from({ length: 105 }, (_, index) => ({
    id: `pending-transfer-audience-${index}`,
    streamingWindowId: `pending-transfer-window-${index}`,
    projectId: `pending-transfer-project-${index}`,
    planId: `pending-transfer-plan-${index}`,
    subscriberImpactMillions: index ? -0.25 : 0.5,
    status: 'PENDING',
    createdAtAbsoluteWeek: 200 + index,
    settledAtAbsoluteWeek: null,
  })),
];
referenceAwarePlayer.world.platforms.NETFLIX = netflix;
referenceAwarePlayer.world.industryProductions = {
  'late-reference-production': {
    id: 'late-reference-production',
    canonicalProjectId: 'late-production-project',
    title: 'Late Production Project',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    producerStudioId: 'WARNER_BROS',
    status: 'DELIVERED',
    productionCalendar: { startAbsoluteWeek: 970, plannedEndAbsoluteWeek: 990, currentMilestone: 'DELIVERY', milestones: [] },
    budgetMillions: 40,
    paidMillions: 40,
    talentBookingIds: [],
    writerSource: 'IN_HOUSE_TEAM',
    writerId: null,
    writerName: 'Audit Writer',
    writerSkill: 80,
    createdAtAbsoluteWeek: 970,
    updatedAtAbsoluteWeek: 990,
  },
};
referenceAwarePlayer.world.awardHistory = [{
  year: 40,
  type: 'OSCARS',
  winners: [{
    category: 'Best Picture',
    winnerName: 'Audit Producers',
    projectName: 'Late Award Project',
    projectId: 'late-award-project',
    isPlayer: false,
  }],
}];

const productionRoundTrip = migratePlayerSave(compactPlayerForPersistence(referenceAwarePlayer));
const productionRoundTripProjectIds = new Set(productionRoundTrip.world.projects.map(project => project.id));
for (const projectId of lateReferencedProjectIds) {
  assert(
    productionRoundTripProjectIds.has(projectId),
    `Production compaction and migration must retain late canonical reference ${projectId}.`,
  );
}
const productionRoundTripAudienceSettlements = (productionRoundTrip.world.platforms!.NETFLIX.ai as any).pendingAudienceSettlements;
assert(
  Array.isArray(productionRoundTrip.world.platforms!.NETFLIX.ai!.externalRecapitalizations),
  'Save transfer must preserve the canonical Platform AI recapitalization collection.',
);
assert(
  productionRoundTrip.world.platforms!.NETFLIX.ai!.administration === null,
  'Save transfer must preserve an explicit empty Platform AI administration state.',
);
assert(productionRoundTripAudienceSettlements.length === 105, 'Production compaction and migration must retain pending audience work beyond settled-history capacity.');
assert(productionRoundTripAudienceSettlements.filter((item: any) => item.status === 'PENDING').length === 105, 'Production compaction and migration must retain every pending audience settlement.');
assert(productionRoundTripAudienceSettlements.filter((item: any) => item.status === 'SETTLED').length === 0, 'Production compaction and migration must retain zero settled audience rows when capacity is zero.');

const malformedRightsTransferPlayer = structuredClone(referenceAwarePlayer) as any;
const validTransferRight = malformedRightsTransferPlayer.world.platforms.NETFLIX.ai.rightsContracts[0];
malformedRightsTransferPlayer.world.platforms.NETFLIX.ai.rightsContracts = [
  validTransferRight,
  null,
  {},
  { ...validTransferRight, id: '' },
  { ...validTransferRight, id: 'malformed-numeric-right', minimumGuarantee: Number.NaN },
  { ...validTransferRight, id: 'malformed-range-right', platformRevenueShare: 110, licensorRevenueShare: -10 },
];
const compactedMalformedRights = assertDoesNotThrow(
  () => compactPlayerForPersistence(malformedRightsTransferPlayer),
  'Save compaction must validate malformed rights rows before renewal filtering dereferences them.',
);
assert(
  JSON.stringify(compactedMalformedRights.world.platforms!.NETFLIX.ai!.rightsContracts.map(contract => contract.id))
    === JSON.stringify([validTransferRight.id]),
  'Save compaction must retain valid rights while dropping null and malformed rows.',
);
const migratedMalformedRights = assertDoesNotThrow(
  () => migratePlayerSave(compactedMalformedRights),
  'Migration must be able to repair a save after malformed rights rows are compacted safely.',
);
assert(
  JSON.stringify(migratedMalformedRights.world.platforms!.NETFLIX.ai!.rightsContracts.map(contract => contract.id))
    === JSON.stringify([validTransferRight.id]),
  'Malformed rights rows must not reappear after migration.',
);

const overCapReferencePlayer = structuredClone(bulkyPlayer) as any;
const overCapReferenceIds = Array.from({ length: 905 }, (_, index) => `over-cap-reference-${index}`);
overCapReferencePlayer.world.projects = [
  ...overCapReferencePlayer.world.projects,
  ...overCapReferenceIds.map(id => lateProject(id)),
];
const overCapNetflix = normalizePlatformAiState(
  overCapReferencePlayer.world.platforms.NETFLIX,
  overCapReferencePlayer.id,
  1_000,
);
overCapNetflix.ai.slate = [referencePlan('over-cap-plan', overCapReferenceIds)];
overCapReferencePlayer.world.platforms.NETFLIX = overCapNetflix;
const overCapRoundTrip = migratePlayerSave(compactPlayerForPersistence(overCapReferencePlayer));
const overCapRoundTripIds = new Set(overCapRoundTrip.world.projects.map(project => project.id));
assert(overCapReferenceIds.every(id => overCapRoundTripIds.has(id)), 'Reference overflow must retain every canonical project beyond the legacy cap.');
assert(overCapRoundTrip.world.projects.length >= overCapReferenceIds.length, 'Reference overflow may exceed 900 rather than corrupt canonical state.');

const duplicateReferencePlayer = structuredClone(bulkyPlayer) as any;
const duplicateReferenceId = 'duplicate-canonical-reference';
const firstDuplicatePayload = lateProject(duplicateReferenceId, { title: 'First canonical payload' });
duplicateReferencePlayer.world.projects = [
  firstDuplicatePayload,
  ...Array.from({ length: 904 }, (_, index) => lateProject(duplicateReferenceId, {
    title: `Conflicting duplicate payload ${index}`,
  })),
  ...Array.from({ length: 905 }, (_, index) => lateProject('', {
    title: `Ordinary id-less project ${index}`,
  })),
];
const duplicateReferenceNetflix = normalizePlatformAiState(
  duplicateReferencePlayer.world.platforms.NETFLIX,
  duplicateReferencePlayer.id,
  1_000,
);
duplicateReferenceNetflix.ai.slate = [referencePlan('duplicate-reference-plan', [duplicateReferenceId, ''])];
duplicateReferencePlayer.world.platforms.NETFLIX = duplicateReferenceNetflix;
const duplicateRoundTrip = migratePlayerSave(JSON.parse(JSON.stringify(
  compactPlayerForPersistence(duplicateReferencePlayer),
)));
const duplicateRows = duplicateRoundTrip.world.projects.filter(project => project.id === duplicateReferenceId);
assert(duplicateRoundTrip.world.projects.length === 900, 'Duplicate referenced IDs must not multiply rows or defeat the 900-project cap.');
assert(duplicateRows.length === 1, 'Compaction must retain one unambiguous canonical row per usable project ID.');
assert(duplicateRows[0].title === 'First canonical payload', 'Canonical project deduplication must preserve the first source occurrence.');
assert(
  duplicateRoundTrip.world.projects.filter(project => !project.id).length === 899,
  'Projects without usable IDs may fill ordinary capacity but must not be promoted as references.',
);

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
