import { PLATFORM_AI_RUNTIME_SCHEMA_VERSION, type Player } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import {
  externalizeCustomPostersInPlayer,
  stripEmbeddedPosterImageDataForPersistence,
} from './customPosterMedia';
import { compactOwnedStreamingPlatformForPersistence } from './ownedStreamingPlatform';
import {
  filterPlatformAiRightsContractsByRenewalState,
  normalizePlatformAiAudienceSettlements,
  normalizePlatformAiDistressEpisodes,
  normalizePlatformAiLocalizationJobs,
  markPlatformAiStateCanonicalForTurn,
  normalizePlatformAiState,
  normalizePlatformAiPendingOneTimeObligations,
  normalizePlatformAiRightsContracts,
  normalizePlatformAiRightsRenewals,
  reconcilePlatformAiLocalizationObligations,
  reconcilePlatformAiRightsRenewalObligations,
  reconcilePlatformAiRightsRenewalStatuses,
} from './platformAi/platformAiState';
import {
  normalizePlatformAiExternalCommitments,
  reconcilePlatformAiExternalCommitmentObligations,
} from './platformAi/platformAiExternalCommitments';
import { normalizePlatformAiCatalogueDistressDeals } from './platformAi/platformAiDistress';
import { getPlatformAiRightsMarketProjectUniverse } from './platformAi/platformAiContentSourcing';
import { normalizeStreamingRightsContractRegistry } from './streamingRightsCore';
import { normalizeStreamingBiddingSessionRegistry } from './streamingBidding';
import { normalizeStreamingRoyaltySettlementRegistry } from './streamingContractSettlement';
import { normalizeStreamingPlatformEcosystem } from './streamingPlatformEcosystem';
import {
  normalizeStreamingRightsCalendarState,
  normalizeStreamingRightsManagementState,
} from './streamingRightsCalendar';
import { normalizeStreamingRightsOfficeState } from './streamingRightsOffice';
import { normalizeDynastyCareerState } from './dynastyCareer';
import { compactIndustryIntelligenceState } from './industryIntelligence';
import { normalizeStudioAiState } from './studioAi/studioAiState';
import {
  reconstructSignedStreamingCataloguePackages,
} from './streamingCataloguePackages';
import { normalizeStreamingRightsTransactionRegistry } from './streamingRightsTransactions';
import {
  getCanonicalScheduledRivals,
  normalizeIndustryEventLedger,
  reconcileIndustryMediaWorldWithEvents,
} from './industryWorld';

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
const PLATFORM_AI_TERMINAL_SLATE_MAX_ITEMS = 104;
const PLATFORM_AI_TERMINAL_RIGHTS_MAX_ITEMS = 104;
const STREAMING_RIGHTS_TRANSACTION_SETTLED_MAX_ITEMS = 260;
const PLATFORM_AI_TERMINAL_PRODUCTION_MAX_ITEMS = 104;
const PLATFORM_AI_TERMINAL_TALENT_MAX_ITEMS = 208;
const AWARD_HISTORY_MAX_ITEMS = 104;
const STREAMING_RIGHTS_TERMINAL_MAX_ITEMS = 240;
const STREAMING_BIDDING_TERMINAL_MAX_ITEMS = 60;
const STREAMING_ROYALTY_SETTLEMENT_MAX_ITEMS = 520;
const STREAMING_CATALOGUE_PACKAGE_TERMINAL_MAX_ITEMS = 80;
const STUDIO_AI_LEDGER_MAX_ITEMS = 104;
const STUDIO_AI_EVENT_MAX_ITEMS = 48;
const STUDIO_AI_DECISION_MAX_ITEMS = 48;

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

const compactStudioAiCompanies = (value: unknown, absoluteWeek: number) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value as Record<string, any>).map(([studioId, studio]) => {
    if (!studio?.ai) return [studioId, studio];
    const compactedStudio = {
      ...studio,
      ai: {
        ...studio.ai,
        ledger: trimRecent(studio.ai.ledger, STUDIO_AI_LEDGER_MAX_ITEMS) || [],
        events: trimRecent(studio.ai.events, STUDIO_AI_EVENT_MAX_ITEMS) || [],
        decisions: trimRecent(studio.ai.decisions, STUDIO_AI_DECISION_MAX_ITEMS) || [],
        migrationKeys: trimRecent(studio.ai.migrationKeys, STUDIO_AI_LEDGER_MAX_ITEMS) || [],
        handoffKeys: trimRecent(studio.ai.handoffKeys, STUDIO_AI_LEDGER_MAX_ITEMS) || [],
        intelligence: studio.ai.intelligence
          ? compactIndustryIntelligenceState(studio.ai.intelligence)
          : undefined,
        legacyVenture: studio.ai.legacyVenture ? {
          ...studio.ai.legacyVenture,
          history: trimHead(studio.ai.legacyVenture.history, 24) || [],
        } : undefined,
      },
    };
    return [studioId, {
      ...compactedStudio,
      ai: normalizeStudioAiState(compactedStudio, { absoluteWeek }),
    }];
  }));
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
  (player.world?.talentBookings || []).forEach((booking: any) => {
    if (booking?.npcId) referencedIds.add(String(booking.npcId));
  });
  Object.values(player.world?.universes || {}).forEach((universe: any) => {
    (universe?.roster || []).forEach((character: any) => {
      [character?.actorId, character?.id].forEach(id => {
        if (id) referencedIds.add(String(id));
      });
    });
  });
  Object.keys(normalizeDynastyCareerState(player).members).forEach(id => referencedIds.add(id));
  return referencedIds;
};

const compactDynastyCareerArchives = (player: any) => {
  const archives = player.flags?.dynastyCareerArchives;
  if (!archives || typeof archives !== 'object' || Array.isArray(archives)) return {};
  return Object.fromEntries(Object.entries(archives).map(([actorId, archive]: [string, any]) => [actorId, {
    ...archive,
    pastProjects: Array.isArray(archive?.pastProjects) ? archive.pastProjects.map(compactPastProject) : [],
    activeReleases: Array.isArray(archive?.activeReleases) ? archive.activeReleases.map(compactRelease) : [],
    awards: Array.isArray(archive?.awards) ? archive.awards.slice(-120) : [],
  }]));
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

const getUsableWorldProjectId = (id: unknown): string | null => (
  typeof id === 'string' && id.trim() ? id.trim() : null
);

const getReferencedWorldProjectIds = (player: any, absoluteWeek: number): Set<string> => {
  const referencedIds = new Set<string>();
  const add = (id: unknown) => {
    const usableId = getUsableWorldProjectId(id);
    if (usableId) referencedIds.add(usableId);
  };
  const playerStudioIds = new Set<string>([
    'PLAYER_STUDIO',
    ...(player.businesses || [])
      .filter((business: any) => business?.type === 'PRODUCTION_HOUSE')
      .flatMap((business: any) => [
        business.id,
        business.studioState?.acquisitionPortfolio?.sourceStudioId,
      ])
      .filter((studioId: unknown) => typeof studioId === 'string' && studioId)
      .map((studioId: string) => String(studioId)),
  ]);
  (player.world?.projects || []).forEach((project: any) => {
    const hasLiveWindow = (Array.isArray(project?.streamingWindows) ? project.streamingWindows : [])
      .some((window: any) => (
        !Number.isFinite(Number(window?.expiresAtAbsoluteWeek))
        || Number(window.expiresAtAbsoluteWeek) >= absoluteWeek
      ));
    if (playerStudioIds.has(String(project?.studioId || '')) || hasLiveWindow) add(project?.id);
  });
  Object.values(player.world?.platforms || {}).forEach((platform: any) => {
    const ai = platform?.ai;
    (ai?.slate || []).forEach((plan: any) => {
      (plan?.sourceProjectIds || []).forEach(add);
      (plan?.releaseEntries || []).forEach((entry: any) => {
        add(entry?.sourceProjectId);
        add(entry?.canonicalProjectId);
      });
    });
    (ai?.releaseMemory || []).forEach((memory: any) => add(memory?.projectId));
    (ai?.rightsContracts || []).forEach((contract: any) => add(contract?.sourceProjectId));
  });
  Object.values(player.world?.streamingRightsContracts || {})
    .forEach((contract: any) => add(contract?.sourceProjectId));
  normalizePlatformAiCatalogueDistressDeals(player.world?.platformAiCatalogueDistressDeals)
    .filter(deal => deal.status === 'PENDING_PAYMENT')
    .forEach(deal => add(deal.sourceProjectId));
  Object.values(player.world?.industryProductions || {}).forEach((production: any) => add(production?.canonicalProjectId));
  (player.world?.awardHistory || []).forEach((season: any) => {
    (season?.winners || []).forEach((winner: any) => add(winner?.projectId));
  });
  return referencedIds;
};

const compactWorldProjects = (player: any): any[] => {
  const projects = Array.isArray(player.world?.projects) ? player.world.projects : [];
  const absoluteWeek = getApproxAbsoluteWeek(Number(player?.age), Number(player?.currentWeek));
  const referencedIds = getReferencedWorldProjectIds(player, absoluteWeek);
  const seenProjectIds = new Set<string>();
  const canonicalProjects = projects.filter((project: any) => {
    const projectId = getUsableWorldProjectId(project?.id);
    if (!projectId) return true;
    if (seenProjectIds.has(projectId)) return false;
    seenProjectIds.add(projectId);
    return true;
  });
  const referenced = canonicalProjects.filter((project: any) => {
    const projectId = getUsableWorldProjectId(project?.id);
    return projectId !== null && referencedIds.has(projectId);
  });
  // Referential integrity wins over the ordinary history budget. With stale
  // windows removed from protection, only genuinely live/material state can
  // trigger this exceptional overflow.
  if (referenced.length >= WORLD_PROJECT_MAX_ITEMS) return referenced;
  const referencedToKeep = referenced;
  const retainedProjects = new Set<any>(referencedToKeep);
  const retainedIds = new Set(referencedToKeep
    .map((project: any) => getUsableWorldProjectId(project?.id))
    .filter((id: string | null): id is string => id !== null));
  const remainingCapacity = WORLD_PROJECT_MAX_ITEMS - referencedToKeep.length;
  getPlatformAiRightsMarketProjectUniverse(canonicalProjects, absoluteWeek)
    .filter((project: any) => !retainedIds.has(project.id))
    .slice(0, remainingCapacity)
    .forEach((project: any) => {
      retainedIds.add(project.id);
      retainedProjects.add(project);
    });
  const fillerCapacity = WORLD_PROJECT_MAX_ITEMS - retainedProjects.size;
  if (fillerCapacity > 0) {
    canonicalProjects
      .map((project: any, index: number) => ({ project, index }))
      .filter(({ project }: { project: any }) => {
        const projectId = getUsableWorldProjectId(project?.id);
        return !retainedProjects.has(project) && (projectId === null || !retainedIds.has(projectId));
      })
      .sort((left: any, right: any) => (
        getApproxAbsoluteWeek(Number(right.project?.year), Number(right.project?.weekReleased))
        - getApproxAbsoluteWeek(Number(left.project?.year), Number(left.project?.weekReleased))
        || String(left.project?.id || '').localeCompare(String(right.project?.id || ''))
        || right.index - left.index
      ))
      .slice(0, fillerCapacity)
      .forEach(({ project }: { project: any }) => retainedProjects.add(project));
  }
  return canonicalProjects.filter((project: any) => retainedProjects.has(project));
};

const stableHistoryId = (value: unknown): string => String(value || '').trim();

const retainBoundedHistory = <T,>(input: {
  items: T[];
  idOf: (item: T) => string;
  isProtected: (item: T) => boolean;
  activityWeekOf: (item: T) => number;
  terminalLimit: number;
}): T[] => {
  const protectedIds = new Set(input.items.filter(input.isProtected).map(input.idOf).filter(Boolean));
  const terminalIds = input.items
    .filter(item => !input.isProtected(item))
    .map(item => ({ item, id: input.idOf(item), week: input.activityWeekOf(item) }))
    .filter(entry => Boolean(entry.id))
    .sort((left, right) => right.week - left.week || left.id.localeCompare(right.id))
    .slice(0, input.terminalLimit)
    .map(entry => entry.id);
  const retainedIds = new Set([...protectedIds, ...terminalIds]);
  const seenIds = new Set<string>();
  return input.items.filter(item => {
    const id = input.idOf(item);
    if (!id || seenIds.has(id) || !retainedIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
};

const compactAwardHistory = (value: unknown): any[] => {
  const entries = Array.isArray(value) ? value : [];
  return entries
    .map((entry: any, index: number) => ({ entry, index }))
    .sort((left, right) => (
      Number(right.entry?.year || 0) - Number(left.entry?.year || 0)
      || String(left.entry?.type || '').localeCompare(String(right.entry?.type || ''))
      || left.index - right.index
    ))
    .slice(0, AWARD_HISTORY_MAX_ITEMS)
    .map(item => item.entry)
    .sort((left: any, right: any) => (
      Number(left?.year || 0) - Number(right?.year || 0)
      || String(left?.type || '').localeCompare(String(right?.type || ''))
    ));
};

const awardLinkedProjectIds = (awardHistory: any[]): Set<string> => new Set(awardHistory
  .flatMap((season: any) => Array.isArray(season?.winners) ? season.winners : [])
  .map((winner: any) => stableHistoryId(winner?.projectId))
  .filter(Boolean));

const activeStreamingWindowPlanIds = (world: any, absoluteWeek: number): Set<string> => {
  const planIds = new Set<string>();
  (Array.isArray(world?.projects) ? world.projects : []).forEach((project: any) => {
    (Array.isArray(project?.streamingWindows) ? project.streamingWindows : []).forEach((window: any) => {
      const planId = stableHistoryId(window?.platformContentPlanId);
      if (planId && Number(window?.expiresAtAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) >= absoluteWeek) planIds.add(planId);
    });
  });
  return planIds;
};

const compactPlatformAiSlate = (
  platform: any,
  world: any,
  catalogueDistressDeals: any[],
  retainedAwardProjectIds: Set<string>,
  absoluteWeek: number,
): any[] => {
  const ai = platform?.ai;
  const slate = Array.isArray(ai?.slate) ? ai.slate : [];
  const protectedPlanIds = activeStreamingWindowPlanIds(world, absoluteWeek);
  (Array.isArray(ai?.pendingAudienceSettlements) ? ai.pendingAudienceSettlements : [])
    .filter((settlement: any) => settlement?.status === 'PENDING')
    .forEach((settlement: any) => protectedPlanIds.add(stableHistoryId(settlement?.planId)));
  (Array.isArray(ai?.localizationJobs) ? ai.localizationJobs : [])
    .filter((job: any) => job?.status !== 'CANCELLED')
    .forEach((job: any) => protectedPlanIds.add(stableHistoryId(job?.contentPlanId)));
  (Array.isArray(ai?.rightsContracts) ? ai.rightsContracts : [])
    .filter((contract: any) => (
      contract?.status === 'ACTIVE'
      && Number(contract?.expiresAtAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) >= absoluteWeek
    ))
    .forEach((contract: any) => protectedPlanIds.add(stableHistoryId(contract?.platformContentPlanId)));
  (Array.isArray(ai?.rightsRenewals) ? ai.rightsRenewals : [])
    .filter((renewal: any) => renewal?.status !== 'CONTRACTED')
    .forEach((renewal: any) => protectedPlanIds.add(stableHistoryId(renewal?.platformContentPlanId)));
  Object.values(world?.industryProductions || {})
    .filter((production: any) => !['DELIVERED', 'CANCELLED'].includes(String(production?.status || '')))
    .forEach((production: any) => protectedPlanIds.add(stableHistoryId(production?.platformContentPlanId)));
  catalogueDistressDeals
    .filter((deal: any) => deal?.status === 'PENDING_PAYMENT' && deal?.buyerPlatformId === platform?.id)
    .forEach((deal: any) => protectedPlanIds.add(stableHistoryId(deal?.buyerPlanId)));

  const planTouchesAwards = (plan: any): boolean => (
    (Array.isArray(plan?.sourceProjectIds) ? plan.sourceProjectIds : []).some((id: unknown) => retainedAwardProjectIds.has(stableHistoryId(id)))
    || (Array.isArray(plan?.releaseEntries) ? plan.releaseEntries : []).some((entry: any) => (
      retainedAwardProjectIds.has(stableHistoryId(entry?.sourceProjectId))
      || retainedAwardProjectIds.has(stableHistoryId(entry?.canonicalProjectId))
    ))
    || Object.values(world?.industryProductions || {}).some((production: any) => (
      production?.id === plan?.industryProductionId
      && retainedAwardProjectIds.has(stableHistoryId(production?.canonicalProjectId))
    ))
  );
  const terminalStatuses = new Set(['RELEASED', 'CANCELLED', 'SOLD']);
  return retainBoundedHistory({
    items: slate,
    idOf: (plan: any) => stableHistoryId(plan?.id),
    isProtected: (plan: any) => (
      !terminalStatuses.has(String(plan?.status || ''))
      || protectedPlanIds.has(stableHistoryId(plan?.id))
      || planTouchesAwards(plan)
    ),
    activityWeekOf: (plan: any) => Math.max(
      Number(plan?.releasedAtAbsoluteWeek || 0),
      Number(plan?.scheduledAtAbsoluteWeek || 0),
      Number(plan?.committedAtAbsoluteWeek || 0),
    ),
    terminalLimit: PLATFORM_AI_TERMINAL_SLATE_MAX_ITEMS,
  });
};

const compactPlatformAiRightsContracts = (
  contracts: any[],
  slate: any[],
  renewals: any[],
  absoluteWeek: number,
): any[] => {
  const referencedIds = new Set<string>();
  slate.forEach((plan: any) => {
    (Array.isArray(plan?.rightsContractIds) ? plan.rightsContractIds : [])
      .forEach((id: unknown) => referencedIds.add(stableHistoryId(id)));
    (Array.isArray(plan?.releaseEntries) ? plan.releaseEntries : [])
      .forEach((entry: any) => referencedIds.add(stableHistoryId(entry?.rightsContractId)));
  });
  renewals.forEach((renewal: any) => {
    referencedIds.add(stableHistoryId(renewal?.previousLicenseId));
    referencedIds.add(stableHistoryId(renewal?.renewalLicenseId));
  });
  return retainBoundedHistory({
    items: contracts,
    idOf: (contract: any) => stableHistoryId(contract?.id),
    isProtected: (contract: any) => (
      contract?.status === 'ACTIVE'
      && Number(contract?.expiresAtAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) >= absoluteWeek
    ) || referencedIds.has(stableHistoryId(contract?.id)),
    activityWeekOf: (contract: any) => Math.max(
      Number(contract?.expiresAtAbsoluteWeek || 0),
      Number(contract?.startsAtAbsoluteWeek || 0),
      Number(contract?.signedAtAbsoluteWeek || 0),
    ),
    terminalLimit: PLATFORM_AI_TERMINAL_RIGHTS_MAX_ITEMS,
  });
};

const compactIndustryProductions = (
  value: unknown,
  platforms: any,
  retainedAwardProjectIds: Set<string>,
): Record<string, any> => {
  const productions = Object.values(value && typeof value === 'object' ? value as Record<string, any> : {});
  const referencedIds = new Set<string>();
  Object.values(platforms || {}).forEach((platform: any) => {
    (Array.isArray(platform?.ai?.slate) ? platform.ai.slate : [])
      .forEach((plan: any) => referencedIds.add(stableHistoryId(plan?.industryProductionId)));
  });
  const kept = retainBoundedHistory({
    items: productions,
    idOf: (production: any) => stableHistoryId(production?.id),
    isProtected: (production: any) => (
      !['DELIVERED', 'RELEASED', 'CANCELLED'].includes(String(production?.status || ''))
      || referencedIds.has(stableHistoryId(production?.id))
      || retainedAwardProjectIds.has(stableHistoryId(production?.canonicalProjectId))
    ),
    activityWeekOf: (production: any) => Math.max(
      Number(production?.updatedAtAbsoluteWeek || 0),
      Number(production?.createdAtAbsoluteWeek || 0),
    ),
    terminalLimit: PLATFORM_AI_TERMINAL_PRODUCTION_MAX_ITEMS,
  });
  return Object.fromEntries(kept.map((production: any) => [production.id, production]));
};

const compactTalentBookingHistory = (value: unknown, platforms: any, productions: Record<string, any>): any[] => {
  const bookings = Array.isArray(value) ? value : [];
  const referencedIds = new Set<string>();
  Object.values(platforms || {}).forEach((platform: any) => {
    (Array.isArray(platform?.ai?.talentBookingRefs) ? platform.ai.talentBookingRefs : [])
      .forEach((id: unknown) => referencedIds.add(stableHistoryId(id)));
  });
  Object.values(productions).forEach((production: any) => {
    (Array.isArray(production?.talentBookingIds) ? production.talentBookingIds : [])
      .forEach((id: unknown) => referencedIds.add(stableHistoryId(id)));
  });
  return retainBoundedHistory({
    items: bookings,
    idOf: (booking: any) => stableHistoryId(booking?.id),
    isProtected: (booking: any) => booking?.status === 'BOOKED' || referencedIds.has(stableHistoryId(booking?.id)),
    activityWeekOf: (booking: any) => Math.max(
      Number(booking?.releasedAtAbsoluteWeek || 0),
      Number(booking?.cancelledAtAbsoluteWeek || 0),
      Number(booking?.endAbsoluteWeek || 0),
    ),
    terminalLimit: PLATFORM_AI_TERMINAL_TALENT_MAX_ITEMS,
  });
};

const compactStreamingRightsContracts = (player: any): Record<string, any> => {
  const registry = normalizeStreamingRightsContractRegistry(player?.world?.streamingRightsContracts);
  const absoluteWeek = getApproxAbsoluteWeek(Number(player?.age), Number(player?.currentWeek));
  const referencedIds = new Set<string>();
  (Array.isArray(player?.activeReleases) ? player.activeReleases : []).forEach((release: any) => {
    const contractId = stableHistoryId(release?.streamingContractId || release?.streaming?.contractId);
    if (contractId) referencedIds.add(contractId);
  });
  (Array.isArray(player?.pastProjects) ? player.pastProjects : []).forEach((project: any) => {
    const contractId = stableHistoryId(project?.streamingContractId);
    if (contractId) referencedIds.add(contractId);
  });
  (Array.isArray(player?.ownedStreamingPlatform?.catalogLicenses) ? player.ownedStreamingPlatform.catalogLicenses : [])
    .filter((license: any) => license?.status === 'ACTIVE' && Number(license?.expiresAtAbsoluteWeek || 0) >= absoluteWeek)
    .forEach((license: any) => referencedIds.add(stableHistoryId(license?.id)));
  Object.values(player?.world?.platforms || {}).forEach((platform: any) => {
    (Array.isArray(platform?.ai?.rightsContracts) ? platform.ai.rightsContracts : [])
      .filter((license: any) => license?.status === 'ACTIVE' && Number(license?.expiresAtAbsoluteWeek || 0) >= absoluteWeek)
      .forEach((license: any) => referencedIds.add(stableHistoryId(license?.id)));
  });
  const contracts = Object.values(registry);
  const protectedContracts = contracts.filter(contract => (
    contract.status === 'ACTIVE' && contract.expiresAtAbsoluteWeek >= absoluteWeek
    || referencedIds.has(contract.id)
  ));
  const protectedIds = new Set(protectedContracts.map(contract => contract.id));
  const terminalContracts = contracts
    .filter(contract => !protectedIds.has(contract.id))
    .sort((left, right) => (
      Math.max(right.expiresAtAbsoluteWeek, right.startsAtAbsoluteWeek, right.signedAtAbsoluteWeek)
      - Math.max(left.expiresAtAbsoluteWeek, left.startsAtAbsoluteWeek, left.signedAtAbsoluteWeek)
      || left.id.localeCompare(right.id)
    ))
    .slice(0, STREAMING_RIGHTS_TERMINAL_MAX_ITEMS);
  return normalizeStreamingRightsContractRegistry(
    Object.fromEntries([...protectedContracts, ...terminalContracts].map(contract => [contract.id, contract])),
  );
};

const compactStreamingRightsTransactions = (
  value: unknown,
  contracts: Record<string, any>,
): Record<string, any> => {
  const transactions = Object.values(normalizeStreamingRightsTransactionRegistry(value));
  const contractReferencedTransactionIds = new Set(
    Object.values(contracts)
      .map((contract: any) => stableHistoryId(contract?.rightsTransactionId))
      .filter(Boolean),
  );
  const protectedTransactions = transactions.filter(transaction => (
    !['SETTLED', 'CANCELLED', 'INVALIDATED'].includes(transaction.status)
    || contractReferencedTransactionIds.has(transaction.id)
    || Boolean(contracts[transaction.sourceContractId])
    || Boolean(transaction.successorContractId && contracts[transaction.successorContractId])
  ));
  const protectedIds = new Set(protectedTransactions.map(transaction => transaction.id));
  const terminalTransactions = transactions
    .filter(transaction => !protectedIds.has(transaction.id))
    .sort((left, right) => (
      Number(right.resolvedAtAbsoluteWeek || right.settledAtAbsoluteWeek || right.listedAtAbsoluteWeek)
      - Number(left.resolvedAtAbsoluteWeek || left.settledAtAbsoluteWeek || left.listedAtAbsoluteWeek)
      || left.id.localeCompare(right.id)
    ))
    .slice(0, STREAMING_RIGHTS_TRANSACTION_SETTLED_MAX_ITEMS);
  return Object.fromEntries(
    [...protectedTransactions, ...terminalTransactions].map(transaction => [transaction.id, transaction]),
  );
};

const compactStreamingBiddingSessions = (value: unknown): Record<string, any> => {
  const sessions = Object.values(normalizeStreamingBiddingSessionRegistry(value));
  const active = sessions.filter(session => session.status === 'LIVE' || session.status === 'CLOSING');
  const activeIds = new Set(active.map(session => session.id));
  const terminal = sessions
    .filter(session => !activeIds.has(session.id))
    .sort((left, right) => right.absoluteWeek - left.absoluteWeek || left.id.localeCompare(right.id))
    .slice(0, STREAMING_BIDDING_TERMINAL_MAX_ITEMS);
  return Object.fromEntries([...active, ...terminal].map(session => [session.id, session]));
};

const compactStreamingCataloguePackages = (
  packageValue: unknown,
  contractValue: unknown,
): Record<string, any> => {
  const packages = Object.values(reconstructSignedStreamingCataloguePackages(packageValue, contractValue));
  const contracts = Object.values(normalizeStreamingRightsContractRegistry(contractValue));
  const referencedPackageIds = new Set(contracts
    .filter(contract => contract.status === 'ACTIVE' || contract.status === 'EXPIRED')
    .map(contract => contract.cataloguePackageId)
    .filter((id): id is string => Boolean(id)));
  const protectedPackages = packages.filter(cataloguePackage => (
    ['DRAFT', 'READY', 'LIVE'].includes(cataloguePackage.lifecycle)
    || referencedPackageIds.has(cataloguePackage.id)
  ));
  const protectedIds = new Set(protectedPackages.map(cataloguePackage => cataloguePackage.id));
  const terminal = packages
    .filter(cataloguePackage => !protectedIds.has(cataloguePackage.id))
    .sort((left, right) => (
      (right.signedAtAbsoluteWeek ?? right.createdAtAbsoluteWeek)
      - (left.signedAtAbsoluteWeek ?? left.createdAtAbsoluteWeek)
      || left.id.localeCompare(right.id)
    ))
    .slice(0, STREAMING_CATALOGUE_PACKAGE_TERMINAL_MAX_ITEMS);
  return Object.fromEntries([...protectedPackages, ...terminal].map(cataloguePackage => [cataloguePackage.id, cataloguePackage]));
};

const compactWorld = (player: any) => {
  const world = player?.world;
  if (!world || typeof world !== 'object') return world;
  const acquiredPlatformIds = new Set<string>(
    Array.isArray(player?.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds)
      ? player.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds
      : [],
  );
  const authoritativeRivalMoves = Array.isArray(player?.ownedStreamingPlatform?.competitiveWorld?.moves)
      ? player.ownedStreamingPlatform.competitiveWorld.moves
      : [];
  const absoluteWeek = getApproxAbsoluteWeek(Number(player?.age), Number(player?.currentWeek));
  const catalogueDistressDeals = normalizePlatformAiCatalogueDistressDeals(world.platformAiCatalogueDistressDeals);
  const awardHistory = compactAwardHistory(world.awardHistory);
  const retainedAwardProjectIds = awardLinkedProjectIds(awardHistory);
  const platforms = world.platforms && typeof world.platforms === 'object'
    ? Object.fromEntries(Object.entries(world.platforms).map(([platformId, platformValue]) => {
        const rawPlatform = platformValue as any;
        if (!rawPlatform?.ai) return [platformId, rawPlatform];
        if (acquiredPlatformIds.has(platformId)) return [platformId, rawPlatform];
        // Bypass the one-turn WeakMap marker with a shallow wrapper so save
        // compaction always starts from the same fully validated AI state that
        // migration would restore. Protection and retention are then computed
        // from canonical collections on the first pass, making compaction
        // idempotent instead of changing future sourcing decisions on reload.
        const platform = normalizePlatformAiState(
          { ...rawPlatform },
          String(player?.id || ''),
          absoluteWeek,
        ) as any;
        const externalCommitments = Number(platform.ai.schemaVersion) >= 7
          ? normalizePlatformAiExternalCommitments(
              platform.ai.externalCommitments,
              platform.id || platformId,
              platform.ai.pendingOneTimeObligations,
              authoritativeRivalMoves,
              absoluteWeek,
            )
          : [];
        const protectedDistressObligationIds = new Set(catalogueDistressDeals
          .filter(deal => deal.status === 'PENDING_PAYMENT' && deal.buyerPlatformId === (platform.id || platformId))
          .map(deal => deal.buyerObligationId));
        const normalizedRightsContracts = normalizePlatformAiRightsContracts(
          platform.ai.rightsContracts,
        );
        let rightsRenewals = normalizePlatformAiRightsRenewals(
          platform.ai.rightsRenewals,
          platform.id || platformId,
          normalizedRightsContracts,
        );
        const rawLocalizationObligationIds = new Set<string>(
          (Array.isArray(platform.ai.localizationJobs) ? platform.ai.localizationJobs : [])
            .map((job: any) => String(job?.obligationId || '').trim())
            .filter(Boolean),
        );
        let pendingOneTimeObligations = reconcilePlatformAiRightsRenewalObligations(
          platform.ai.pendingOneTimeObligations,
          rightsRenewals,
          rawLocalizationObligationIds,
        );
        rightsRenewals = reconcilePlatformAiRightsRenewalStatuses(rightsRenewals, pendingOneTimeObligations);
        pendingOneTimeObligations = reconcilePlatformAiRightsRenewalObligations(
          pendingOneTimeObligations,
          rightsRenewals,
          rawLocalizationObligationIds,
        );
        const rightsContracts = filterPlatformAiRightsContractsByRenewalState(
          normalizedRightsContracts,
          rightsRenewals,
        );
        const slate = compactPlatformAiSlate(
          platform,
          world,
          catalogueDistressDeals,
          retainedAwardProjectIds,
          absoluteWeek,
        );
        const compactedRightsContracts = compactPlatformAiRightsContracts(
          rightsContracts,
          slate,
          rightsRenewals,
          absoluteWeek,
        );
        const localizationJobs = normalizePlatformAiLocalizationJobs(
          platform.ai.localizationJobs,
          platform.id || platformId,
          pendingOneTimeObligations,
          new Set((Array.isArray(platform.ai.slate) ? platform.ai.slate : [])
            .filter((plan: any) => plan && ['RIGHTS_READY', 'DELIVERED', 'LOCALIZED'].includes(plan.status))
            .map((plan: any) => String(plan.id || ''))
            .filter(Boolean)),
          Array.isArray(platform.ai.slate) ? platform.ai.slate : [],
          platform.ai.languageCapabilities,
        );
        pendingOneTimeObligations = reconcilePlatformAiLocalizationObligations(
          pendingOneTimeObligations,
          localizationJobs,
        );
        pendingOneTimeObligations = normalizePlatformAiPendingOneTimeObligations(
          reconcilePlatformAiExternalCommitmentObligations(
            pendingOneTimeObligations,
            externalCommitments,
          ),
          new Set([
            ...externalCommitments.map(commitment => commitment.obligationId),
            ...protectedDistressObligationIds,
            ...localizationJobs
              .filter(job => job.status !== 'CANCELLED' && job.costMillions > 0)
              .map(job => job.obligationId),
            ...rightsRenewals
              .filter(record => record.paymentSettledAtAbsoluteWeek !== null)
              .map(record => record.obligationId),
          ]),
        );
        return [platformId, {
          ...platform,
          ai: {
            ...platform.ai,
            schemaVersion: PLATFORM_AI_RUNTIME_SCHEMA_VERSION,
            distressEpisodes: normalizePlatformAiDistressEpisodes(
              platform.ai.distressEpisodes,
              platform.id || platformId,
              getAbsoluteWeek(player.age, player.currentWeek),
              platform.ai.status,
            ),
            externalCommitments,
            slate,
            rightsContracts: compactedRightsContracts,
            localizationJobs,
            rightsRenewals,
            pendingOneTimeObligations,
            pendingAudienceSettlements: normalizePlatformAiAudienceSettlements(platform.ai.pendingAudienceSettlements),
            intelligence: platform.ai.intelligence
              ? compactIndustryIntelligenceState(platform.ai.intelligence)
              : undefined,
          },
        }];
      }))
    : world.platforms;
  const industryProductions = compactIndustryProductions(
    world.industryProductions,
    platforms,
    retainedAwardProjectIds,
  );
  const talentBookings = compactTalentBookingHistory(world.talentBookings, platforms, industryProductions);
  const streamingRightsContracts = compactStreamingRightsContracts({ ...player, world: { ...world, platforms } });
  const streamingRightsTransactions = compactStreamingRightsTransactions(
    world.streamingRightsTransactions,
    streamingRightsContracts,
  );
  const streamingBiddingSessions = compactStreamingBiddingSessions(world.streamingBiddingSessions);
  const streamingCataloguePackages = compactStreamingCataloguePackages(
    world.streamingCataloguePackages,
    streamingRightsContracts,
  );
  const streamingRoyaltySettlements = Object.fromEntries(
    Object.values(normalizeStreamingRoyaltySettlementRegistry(world.streamingRoyaltySettlements))
      .sort((left, right) => right.absoluteWeek - left.absoluteWeek || left.id.localeCompare(right.id))
      .slice(0, STREAMING_ROYALTY_SETTLEMENT_MAX_ITEMS)
      .map(settlement => [settlement.id, settlement]),
  );
  const streamingPlatformEcosystem = normalizeStreamingPlatformEcosystem(
    world.streamingPlatformEcosystem,
    absoluteWeek,
  );
  const streamingRightsCalendar = normalizeStreamingRightsCalendarState(world.streamingRightsCalendar);
  const streamingRightsOffice = normalizeStreamingRightsOfficeState(world.streamingRightsOffice);
  const industryEvents = normalizeIndustryEventLedger(world.industryEvents);
  const industryMedia = reconcileIndustryMediaWorldWithEvents(world.industryMedia, industryEvents);
  const retainedTalentBookingIds = new Set(talentBookings.map((booking: any) => stableHistoryId(booking?.id)));
  const platformsWithRetainedTalentRefs = platforms && typeof platforms === 'object'
    ? Object.fromEntries(Object.entries(platforms).map(([platformId, platformValue]) => {
        const platform = platformValue as any;
        if (!platform?.ai || acquiredPlatformIds.has(platformId)) return [platformId, platform];
        const compactedPlatform = {
          ...platform,
          ai: {
            ...platform.ai,
            talentBookingRefs: (Array.isArray(platform.ai.talentBookingRefs) ? platform.ai.talentBookingRefs : [])
              .filter((id: unknown) => retainedTalentBookingIds.has(stableHistoryId(id))),
          },
        };
        markPlatformAiStateCanonicalForTurn(compactedPlatform, String(player?.id || ''), absoluteWeek);
        return [platformId, compactedPlatform];
      }))
    : platforms;
  const compactedWorld = {
    ...world,
    studios: compactStudioAiCompanies(world.studios, absoluteWeek),
    platforms: platformsWithRetainedTalentRefs,
    platformAiCatalogueDistressDeals: catalogueDistressDeals,
    streamingRightsContracts,
    streamingBiddingSessions,
    streamingCataloguePackages,
    streamingCataloguePackageDigests: Array.isArray(world.streamingCataloguePackageDigests)
      ? world.streamingCataloguePackageDigests.slice(0, 52)
      : [],
    streamingRoyaltySettlements,
    streamingRightsCalendar,
    streamingRightsOffice,
    streamingPlatformEcosystem,
    industryEvents,
    industryMedia,
    awardHistory,
    industryProductions,
    talentBookings,
    upcomingRivals: getCanonicalScheduledRivals({ ...world, industryProductions }, absoluteWeek, 12),
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
  return {
    ...compactedWorld,
    projects: compactWorldProjects({ ...player, world: compactedWorld }),
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
  const protectedRivalMoveIds = new Set<string>();
  Object.values(nextPlayer.world?.platforms || {}).forEach((platform: any) => {
    (Array.isArray(platform?.ai?.externalCommitments) ? platform.ai.externalCommitments : [])
      .forEach((commitment: any) => {
        const moveId = stableHistoryId(commitment?.moveId);
        if (moveId) protectedRivalMoveIds.add(moveId);
      });
  });
  const safePlayer: any = stripEmbeddedPosterImageDataForPersistence({
    ...nextPlayer,
    commitments: Array.isArray(nextPlayer.commitments) ? nextPlayer.commitments.map(compactCommitment) : [],
    activeReleases: Array.isArray(nextPlayer.activeReleases) ? nextPlayer.activeReleases.map(compactRelease) : [],
    pastProjects: Array.isArray(nextPlayer.pastProjects) ? nextPlayer.pastProjects.map(compactPastProject) : [],
    businesses: Array.isArray(nextPlayer.businesses) ? nextPlayer.businesses.map(compactBusiness) : [],
    world: compactWorld(nextPlayer),
    ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(
      nextPlayer.ownedStreamingPlatform,
      nextPlayer.id,
      protectedRivalMoveIds,
    ),
    streamingRightsManagement: normalizeStreamingRightsManagementState(
      nextPlayer.streamingRightsManagement,
    ),
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
      dynastyCareer: normalizeDynastyCareerState(nextPlayer),
      dynastyCareerArchives: compactDynastyCareerArchives(nextPlayer),
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
