import type { Player } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import {
  externalizeCustomPostersInPlayer,
  stripEmbeddedPosterImageDataForPersistence,
} from './customPosterMedia';
import { compactOwnedStreamingPlatformForPersistence } from './ownedStreamingPlatform';

export const FULL_LOCAL_MIRROR_BUDGET_BYTES = 3_500_000;

const RECENT_TIMELINE_WEEKS = 104;
const RECENT_TIMELINE_MAX_ITEMS = 180;
const LEGACY_HIGHLIGHT_MAX_ITEMS = 80;
const SOCIAL_POST_MAX_ITEMS = 200;
const SOCIAL_FEED_MAX_ITEMS = 80;
const YOUTUBE_VIDEO_MAX_ITEMS = 120;
const YOUTUBE_COMMENT_MAX_ITEMS = 12;
const YOUTUBE_WEEKLY_HISTORY_MAX_ITEMS = 24;
const PROJECT_WEEKLY_HISTORY_MAX_ITEMS = 52;
const PROJECT_REVIEW_MAX_ITEMS = 12;
const PROJECT_CAST_MAX_ITEMS = 28;
const PROJECT_CREW_MAX_ITEMS = 16;
const AUDIENCE_QUOTE_MAX_ITEMS = 10;
const BUSINESS_HISTORY_MAX_ITEMS = 520;
const STUDIO_FINANCE_LEDGER_MAX_ITEMS = 260;
const STUDIO_NOTICE_MAX_ITEMS = 80;
const STUDIO_DECISION_MAX_ITEMS = 120;
const WORLD_PROJECT_MAX_ITEMS = 900;
const EXTRA_NPC_RECENT_MAX_ITEMS = 360;

type CompactTimelineEntry = {
  id: string;
  week: number;
  year: number;
  absoluteWeek: number;
  title: string;
  kind: 'LOG' | 'NEWS' | 'MESSAGE';
  tone: 'positive' | 'negative' | 'neutral';
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
};

const getApproxAbsoluteWeek = (year: number, week: number) => {
  const safeYear = Number.isFinite(year) ? year : 18;
  const safeWeek = Math.min(52, Math.max(1, Number.isFinite(week) ? week : 1));
  return getAbsoluteWeek(safeYear, safeWeek);
};

const makeTimelineEntry = (
  sourceId: string,
  year: number,
  week: number,
  title: string,
  kind: CompactTimelineEntry['kind'],
  tone: CompactTimelineEntry['tone'],
  impact?: CompactTimelineEntry['impact']
): CompactTimelineEntry => ({
  id: `${kind}_${sourceId}_${year}_${week}`,
  year,
  week,
  absoluteWeek: getApproxAbsoluteWeek(year, week),
  title: title.replace(/\s+/g, ' ').trim().slice(0, 180),
  kind,
  tone,
  impact,
});

const isLegacyWorthyText = (text: string) => {
  const normalized = text.toLowerCase();
  return [
    'award', 'won', 'nominated', 'billion', 'festival', 'married', 'divorce',
    'child', 'baby', 'scandal', 'lawsuit', 'death', 'passed away', 'founded',
    'studio', 'franchise', 'universe', 'forbes', 'record', 'hit', 'flop'
  ].some(keyword => normalized.includes(keyword));
};

const trimRecent = <T>(value: T[] | undefined, limit: number): T[] | undefined => (
  Array.isArray(value) ? value.slice(-limit) : value
);

const trimHead = <T>(value: T[] | undefined, limit: number): T[] | undefined => (
  Array.isArray(value) ? value.slice(0, limit) : value
);

const stripEventCallbacks = (value: any, seen = new WeakMap<object, any>()): any => {
  if (typeof value === 'function') return undefined;
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => stripEventCallbacks(item, seen));

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  if (seen.has(value)) return seen.get(value);

  const copy: Record<string, any> = {};
  seen.set(value, copy);
  Object.entries(value).forEach(([key, item]) => {
    const safeItem = stripEventCallbacks(item, seen);
    if (safeItem !== undefined) copy[key] = safeItem;
  });
  return copy;
};

const compactEventQueue = (events: any) => (
  Array.isArray(events) ? events.map(event => stripEventCallbacks(event)) : []
);

const compactAudienceReception = (audienceReception: any) => {
  if (!audienceReception || typeof audienceReception !== 'object') return audienceReception;
  return {
    ...audienceReception,
    quotes: trimHead(audienceReception.quotes, AUDIENCE_QUOTE_MAX_ITEMS) || [],
  };
};

const compactProjectDetails = (details: any) => {
  if (!details || typeof details !== 'object') return details;
  return {
    ...details,
    castList: trimHead(details.castList, PROJECT_CAST_MAX_ITEMS),
    crewList: trimHead(details.crewList, PROJECT_CREW_MAX_ITEMS),
    reviews: trimHead(details.reviews, PROJECT_REVIEW_MAX_ITEMS),
    audienceReception: compactAudienceReception(details.audienceReception),
  };
};

const compactRelease = (release: any) => {
  if (!release || typeof release !== 'object') return release;
  const compactedStreaming = release.streaming && typeof release.streaming === 'object'
    ? {
        ...release.streaming,
        weeklyViews: trimRecent(release.streaming.weeklyViews, PROJECT_WEEKLY_HISTORY_MAX_ITEMS) || [],
      }
    : release.streaming;

  return {
    ...release,
    projectDetails: compactProjectDetails(release.projectDetails),
    weeklyGross: trimRecent(release.weeklyGross, PROJECT_WEEKLY_HISTORY_MAX_ITEMS) || [],
    weeklyStudioReceipts: trimRecent(release.weeklyStudioReceipts, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklyExhibitorReceipts: trimRecent(release.weeklyExhibitorReceipts, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklyDistributionBreakdowns: trimRecent(release.weeklyDistributionBreakdowns, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklyStreamingBreakdowns: trimRecent(release.weeklyStreamingBreakdowns, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklySoundtrackRevenue: trimRecent(release.weeklySoundtrackRevenue, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklySoundtrackBreakdowns: trimRecent(release.weeklySoundtrackBreakdowns, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    generatedNewsKeys: trimRecent(release.generatedNewsKeys, STUDIO_NOTICE_MAX_ITEMS),
    streaming: compactedStreaming,
  };
};

const compactPastProject = (project: any) => {
  if (!project || typeof project !== 'object') return project;
  return {
    ...project,
    weeklyViews: trimRecent(project.weeklyViews, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklyGross: trimRecent(project.weeklyGross, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklyStudioReceipts: trimRecent(project.weeklyStudioReceipts, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklyExhibitorReceipts: trimRecent(project.weeklyExhibitorReceipts, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklyDistributionBreakdowns: trimRecent(project.weeklyDistributionBreakdowns, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklyStreamingBreakdowns: trimRecent(project.weeklyStreamingBreakdowns, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklySoundtrackRevenue: trimRecent(project.weeklySoundtrackRevenue, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    weeklySoundtrackBreakdowns: trimRecent(project.weeklySoundtrackBreakdowns, PROJECT_WEEKLY_HISTORY_MAX_ITEMS),
    castList: trimHead(project.castList, PROJECT_CAST_MAX_ITEMS),
    reviews: trimHead(project.reviews, PROJECT_REVIEW_MAX_ITEMS),
    audienceReception: compactAudienceReception(project.audienceReception),
  };
};

const compactCommitment = (commitment: any) => {
  if (!commitment || typeof commitment !== 'object') return commitment;
  return {
    ...commitment,
    projectDetails: compactProjectDetails(commitment.projectDetails),
  };
};

const compactStudioState = (studioState: any) => {
  if (!studioState || typeof studioState !== 'object') return studioState;
  return {
    ...studioState,
    financeLedger: trimHead(studioState.financeLedger, STUDIO_FINANCE_LEDGER_MAX_ITEMS),
    rightsMarketNotices: trimHead(studioState.rightsMarketNotices, STUDIO_NOTICE_MAX_ITEMS),
    subsidiaryDecisions: trimHead(studioState.subsidiaryDecisions, STUDIO_DECISION_MAX_ITEMS),
    activeDecisionArcs: trimHead(studioState.activeDecisionArcs, STUDIO_DECISION_MAX_ITEMS),
  };
};

const compactBusiness = (business: any) => {
  if (!business || typeof business !== 'object') return business;
  return {
    ...business,
    history: trimRecent(business.history, BUSINESS_HISTORY_MAX_ITEMS) || [],
    studioState: compactStudioState(business.studioState),
  };
};

const getProjectReferencedNpcIds = (project: any, referencedIds: Set<string>) => {
  if (!project || typeof project !== 'object') return;
  [project.directorId, project.actorId, project.npcId, project.sourceNpcId].forEach(id => {
    if (id) referencedIds.add(String(id));
  });
  (project.castList || []).forEach((cast: any) => {
    [cast?.npcId, cast?.actorId, cast?.id].forEach(id => {
      if (id) referencedIds.add(String(id));
    });
  });
  (project.crewList || []).forEach((crew: any) => {
    [crew?.npcId, crew?.id].forEach(id => {
      if (id) referencedIds.add(String(id));
    });
  });
};

const getReferencedNpcIds = (player: any): Set<string> => {
  const referencedIds = new Set<string>();
  (player.relationships || []).forEach((relationship: any) => {
    [relationship?.id, relationship?.npcId, relationship?.sourceNpcId].forEach(id => {
      if (id) referencedIds.add(String(id));
    });
  });
  (player.studio?.talentRoster || []).forEach((contract: any) => {
    [contract?.npcId, contract?.actorId, contract?.directorId].forEach(id => {
      if (id) referencedIds.add(String(id));
    });
  });
  (player.businesses || []).forEach((business: any) => {
    (business?.studioState?.talentRoster || []).forEach((contract: any) => {
      [contract?.npcId, contract?.actorId, contract?.directorId].forEach(id => {
        if (id) referencedIds.add(String(id));
      });
    });
    (business?.studioState?.subsidiaryProjectProposals || []).forEach((proposal: any) => {
      getProjectReferencedNpcIds(proposal, referencedIds);
    });
  });
  (player.commitments || []).forEach((commitment: any) => getProjectReferencedNpcIds(commitment?.projectDetails, referencedIds));
  (player.activeReleases || []).forEach((release: any) => getProjectReferencedNpcIds(release?.projectDetails, referencedIds));
  Object.values(player.world?.universes || {}).forEach((universe: any) => {
    (universe?.roster || []).forEach((character: any) => {
      [character?.actorId, character?.id].forEach(id => {
        if (id) referencedIds.add(String(id));
      });
    });
  });
  return referencedIds;
};

const compactExtraNPCs = (player: any) => {
  const extraNPCs = Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs : undefined;
  if (!extraNPCs) return extraNPCs;
  const referencedIds = getReferencedNpcIds(player);
  const compactedById = new Map<string, any>();
  extraNPCs
    .filter((npc: any) => npc?.id && referencedIds.has(String(npc.id)))
    .forEach((npc: any) => compactedById.set(String(npc.id), npc));
  extraNPCs.slice(-EXTRA_NPC_RECENT_MAX_ITEMS)
    .filter((npc: any) => npc?.id)
    .forEach((npc: any) => compactedById.set(String(npc.id), npc));
  return Array.from(compactedById.values());
};

const compactWorld = (world: any) => {
  if (!world || typeof world !== 'object') return world;
  return {
    ...world,
    projects: trimHead(world.projects, WORLD_PROJECT_MAX_ITEMS) || [],
    upcomingRivals: Array.isArray(world.upcomingRivals) ? world.upcomingRivals.slice(0, 32) : [],
    musicIndustry: world.musicIndustry && typeof world.musicIndustry === 'object'
      ? {
          ...world.musicIndustry,
          history: trimHead(world.musicIndustry.history, 260),
          recentReleases: trimHead(world.musicIndustry.recentReleases, 120),
          scandals: trimHead(world.musicIndustry.scandals, 80),
          rivalries: trimHead(world.musicIndustry.rivalries, 80),
        }
      : world.musicIndustry,
  };
};

export const compactPlayerForPersistence = (nextPlayer: Player): Player => {
  const currentAbsoluteWeek = getApproxAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
  const recentCutoff = currentAbsoluteWeek - RECENT_TIMELINE_WEEKS;
  const existingTimeline = Array.isArray(nextPlayer.flags?.recentTimeline)
    ? nextPlayer.flags.recentTimeline
    : [];
  const existingHighlights = Array.isArray(nextPlayer.flags?.legacyHighlights)
    ? nextPlayer.flags.legacyHighlights
    : [];
  const logTimeline = Array.isArray(nextPlayer.logs)
    ? nextPlayer.logs.map((log, index) => makeTimelineEntry(
        `log_${index}_${log.message}`,
        log.year,
        log.week,
        log.message,
        'LOG',
        log.type
      ))
    : [];
  const newsTimeline = Array.isArray(nextPlayer.news)
    ? nextPlayer.news.map((item: any, index: number) => makeTimelineEntry(
        item.id || `news_${index}`,
        item.year || nextPlayer.age,
        item.week || nextPlayer.currentWeek,
        item.headline || item.subtext || 'Industry news',
        'NEWS',
        item.impactLevel === 'HIGH' ? 'positive' : 'neutral',
        item.impactLevel
      ))
    : [];
  const timelineById = new Map<string, CompactTimelineEntry>();
  [...existingTimeline, ...logTimeline, ...newsTimeline]
    .filter((entry: CompactTimelineEntry) => entry?.title && entry.absoluteWeek >= recentCutoff)
    .forEach((entry: CompactTimelineEntry) => timelineById.set(entry.id, entry));
  const recentTimeline = Array.from(timelineById.values())
    .sort((a, b) => b.absoluteWeek - a.absoluteWeek)
    .slice(0, RECENT_TIMELINE_MAX_ITEMS);
  const highlightById = new Map<string, CompactTimelineEntry>();
  [...existingHighlights, ...recentTimeline.filter(entry => entry.impact === 'HIGH' || isLegacyWorthyText(entry.title))]
    .filter((entry: CompactTimelineEntry) => entry?.title)
    .forEach((entry: CompactTimelineEntry) => highlightById.set(entry.id, entry));
  const legacyHighlights = Array.from(highlightById.values())
    .sort((a, b) => b.absoluteWeek - a.absoluteWeek)
    .slice(0, LEGACY_HIGHLIGHT_MAX_ITEMS);
  const safePlayer: any = stripEmbeddedPosterImageDataForPersistence({
    ...nextPlayer,
    commitments: Array.isArray(nextPlayer.commitments) ? nextPlayer.commitments.map(compactCommitment) : [],
    activeReleases: Array.isArray(nextPlayer.activeReleases) ? nextPlayer.activeReleases.map(compactRelease) : [],
    pastProjects: Array.isArray(nextPlayer.pastProjects) ? nextPlayer.pastProjects.map(compactPastProject) : [],
    businesses: Array.isArray(nextPlayer.businesses) ? nextPlayer.businesses.map(compactBusiness) : [],
    world: compactWorld(nextPlayer.world),
    ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(nextPlayer.ownedStreamingPlatform, nextPlayer.id),
    scheduledEvents: compactEventQueue(nextPlayer.scheduledEvents),
    pendingEvents: compactEventQueue(nextPlayer.pendingEvents),
    logs: Array.isArray(nextPlayer.logs) ? nextPlayer.logs.slice(-50) : [],
    news: Array.isArray(nextPlayer.news) ? nextPlayer.news.slice(0, 80) : [],
    inbox: Array.isArray(nextPlayer.inbox) ? nextPlayer.inbox.slice(0, 120) : [],
    shareholderVotes: Array.isArray(nextPlayer.shareholderVotes) ? nextPlayer.shareholderVotes.slice(0, 24) : [],
    stockTakeovers: Array.isArray(nextPlayer.stockTakeovers) ? nextPlayer.stockTakeovers.slice(0, 20) : [],
    flags: {
      ...(nextPlayer.flags || {}),
      extraNPCs: compactExtraNPCs(nextPlayer),
      recentTimeline,
      legacyHighlights,
      persistenceOptimizedAtWeek: currentAbsoluteWeek,
      persistenceCompaction: {
        week: currentAbsoluteWeek,
        keptPastProjects: Array.isArray(nextPlayer.pastProjects) ? nextPlayer.pastProjects.length : 0,
        keptActiveReleases: Array.isArray(nextPlayer.activeReleases) ? nextPlayer.activeReleases.length : 0,
        recentTimelineItems: recentTimeline.length,
        legacyHighlightItems: legacyHighlights.length,
      },
    },
  } as Player);

  if (safePlayer.instagram) {
    safePlayer.instagram = {
      ...safePlayer.instagram,
      posts: Array.isArray(safePlayer.instagram.posts) ? safePlayer.instagram.posts.slice(0, SOCIAL_POST_MAX_ITEMS) : [],
      feed: Array.isArray(safePlayer.instagram.feed) ? safePlayer.instagram.feed.slice(0, SOCIAL_FEED_MAX_ITEMS) : [],
    };
  }

  if (safePlayer.x) {
    safePlayer.x = {
      ...safePlayer.x,
      posts: Array.isArray(safePlayer.x.posts) ? safePlayer.x.posts.slice(0, SOCIAL_POST_MAX_ITEMS) : [],
      feed: Array.isArray(safePlayer.x.feed) ? safePlayer.x.feed.slice(0, SOCIAL_FEED_MAX_ITEMS) : [],
    };
  }

  if (safePlayer.youtube) {
    safePlayer.youtube = {
      ...safePlayer.youtube,
      videos: Array.isArray(safePlayer.youtube.videos)
        ? safePlayer.youtube.videos.slice(0, YOUTUBE_VIDEO_MAX_ITEMS).map((video: any) => ({
            ...video,
            comments: Array.isArray(video.comments) ? video.comments.slice(0, YOUTUBE_COMMENT_MAX_ITEMS) : [],
            weeklyHistory: Array.isArray(video.weeklyHistory) ? video.weeklyHistory.slice(-YOUTUBE_WEEKLY_HISTORY_MAX_ITEMS) : [],
          }))
        : [],
    };
  }

  return safePlayer as Player;
};

export const compactPlayerForTransfer = async <T extends Player>(player: T): Promise<T> => {
  let optimized = player;
  try {
    const posterResult = await externalizeCustomPostersInPlayer(optimized);
    optimized = posterResult.player;
  } catch {
    // Keep the transfer moving; persistence compaction still removes duplicate embedded poster data.
  }
  return compactPlayerForPersistence(optimized) as T;
};
