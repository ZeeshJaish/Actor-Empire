import type { StreamingIdentPreviewId } from '../../services/streamingIdentAudio';
import type { CustomPoster, Player } from '../../types';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../../services/ownedStreamingPlatform';
import { getStreamingPlayableCatalogProjectIds, getStreamingContentAvailability, CONTENT_AVAILABILITY_LABELS,
  getStreamingCatalogueReadContext, resolveStreamingCatalogueReadTitle, type StreamingCatalogueReadContext } from '../../services/streamingContentAvailability';
import { getOwnedPlatformPackageCountryIds } from '../../services/streamingContentAvailability';
import { getStreamingPublicMarkets } from '../../services/streamingPublicMarkets';
import { STREAMING_EXECUTIVE_ROLE_LABELS } from '../../services/streamingLeadershipGovernance';
import { getStreamingAudienceMarket } from '../../services/streamingAudienceMarket';
import { buildAudienceRoomModel } from './audienceRoomModel';
import { getStreamingWeeklyChartView } from '../../services/streamingWeeklyChart';
import { getProductionLocation } from '../../services/productionLocations';
import type { ContentDeskState } from './StreamingContentExperience';
import type { NetworkState } from './StreamingNetworkExperience';
import type { AudienceState } from './StreamingAudienceExperience';
import type { BoardroomState } from './StreamingBoardroomExperience';
import type { AppState } from './StreamingViewerExperience';
import { readNetworkSignals } from '../../services/streamingNetworkSignals';
import { normalizeStreamingRightsCalendarState } from '../../services/streamingRightsCalendar';
import { getOwnedStreamingProgramEntries } from '../../services/streamingOriginals';
import { planStreamingSlateAutoFill } from '../../services/streamingSlateProgramming';
import { getStreamingViewerPersonal, getStreamingViewerPlans, getStreamingViewerQuality, streamingNetworkPictureTier } from '../../services/streamingViewerQuality';
import { getStreamingViewerOutage } from '../../services/streamingViewerOutage';
import {
  getStreamingOpenIncidents, getStreamingServiceStatus, STREAMING_STATUS_LINE_WEEKS, streamingStatusLineWeeks, type StreamingStatusLevel,
} from '../../services/streamingStatusBoard';
import { getStreamingInfrastructureOperationsEffects } from '../../services/streamingInfrastructureOperations';
import { resolveStreamingPlatformTechDebt } from '../../services/streamingTechTreeCatalogue';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/* The Content Market's hue for the same id (content-market-exact adapter `hueFor`), so a
   title wears one colour in every room. Taking the remainder only at the end spreads ids
   that differ in one character; the old per-step `% 360` gave them neighbouring hues. */
const hueOf = (key: string) => [...key].reduce((sum, character) => ((sum * 31) + character.charCodeAt(0)) >>> 0, 2166136261) % 360;

export const createCanonicalContentDeskState = (player: Player, preparedContext?: StreamingCatalogueReadContext): ContentDeskState => {
  const context = getStreamingCatalogueReadContext(player, preparedContext);
  const { platform } = context;
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const latestPerformance = platform.weeklyHistory.at(-1)?.operations?.titlePerformance ?? [];
  const performanceByProject = new Map(latestPerformance.map(item => [item.projectId, item]));
  const projectIds = [...new Set([...platform.catalogProjectIds, ...platform.originalCommissions.flatMap(c => c.canonicalProjectId ? [c.canonicalProjectId] : [])])];
  const countries = getOwnedPlatformPackageCountryIds(platform);
  /* The player's own art wins wherever they set it, read the way Viewer Mode
     reads it: released and active films, productions still in the works, the
     legacy studio list, and an Original's own script. Everything else draws
     its generated one-sheet. */
  const posterById = new Map<string, CustomPoster>();
  const addPoster = (id: unknown, poster: CustomPoster | null | undefined) => {
    if (poster && id !== undefined && id !== null && !posterById.has(String(id))) posterById.set(String(id), poster);
  };
  (player.pastProjects || []).forEach(project => addPoster(project.id, project.customPoster));
  (player.activeReleases || []).forEach(release => addPoster(release.id, release.projectDetails?.customPoster));
  (player.commitments || []).forEach(commitment => addPoster(commitment.id, commitment.projectDetails?.customPoster));
  (Array.isArray(player.flags?.legacyStudioProjects) ? player.flags.legacyStudioProjects as Array<Record<string, any>> : [])
    .forEach(project => addPoster(project.id, project.customPoster || project.projectDetails?.customPoster));
  const scripts = new Map(player.businesses.flatMap(business => (business.studioState?.scripts || []).map(script => [String(script.id), script] as const)));
  scripts.forEach((script, id) => addPoster(id, script.customPoster));
  platform.originalCommissions.forEach(commission => addPoster(commission.canonicalProjectId, scripts.get(String(commission.scriptId))?.customPoster));
  /* renewal talks the rights calendar has open for this platform's licences */
  const renewalByProject = new Map(Object.values(normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar).renewalCases)
    .filter(item => item.incumbentBuyer.type === 'PLAYER_PLATFORM' && item.sourceExpiresAtAbsoluteWeek >= absoluteWeek)
    .sort((left, right) => left.openedAtAbsoluteWeek - right.openedAtAbsoluteWeek)
    .map(item => [item.sourceProjectId, item] as const));
  const RENEWAL_STAGE = {
    WATCHING: 'TALKS', OFFER_AVAILABLE: 'OFFER', ACTION_REQUIRED: 'DECIDE', RENEWAL_SECURED: 'RENEWED',
    RETURNING_TO_MARKET: 'RETURNING', LETTING_EXPIRE: 'LETTING_GO', NO_OFFER: 'CLOSED', EXPIRED: 'CLOSED',
  } as const;
  /* What the service streams: the programme (the slate, cleared Originals, and
     licences bought after setup from their first rights week). */
  const launchedAt = platform.launchCommit?.committedAtAbsoluteWeek ?? null;
  const live = platform.lifecycle === 'ACTIVE';
  const programme = new Map(launchedAt === null ? [] : getOwnedStreamingProgramEntries(player, context).map(entry => [entry.projectId, entry] as const));
  const titles = projectIds.flatMap(projectId => {
    const title = resolveStreamingCatalogueReadTitle(context, projectId);
    if (!title) return [];
    const license = platform.catalogLicenses.find(item => item.sourceProjectId === projectId && item.status === 'ACTIVE' && item.startsAtAbsoluteWeek <= absoluteWeek && item.expiresAtAbsoluteWeek > absoluteWeek);
    const performance = performanceByProject.get(projectId);
    const availability = getStreamingContentAvailability(player, projectId, countries, false, context);
    /* The availability label reads only the opening slate, so a licence bought
       after setup, which the programme streams from its first rights week, read
       "Ready to schedule" while it was being watched. The programme decides. */
    const programmed = programme.get(projectId);
    const premiered = Boolean(programmed && launchedAt !== null && launchedAt + programmed.launchWeek - 1 <= absoluteWeek);
    const status = (availability.status === 'READY' && programmed ? (premiered ? 'LIVE' : 'SCHEDULED')
      : CONTENT_AVAILABILITY_LABELS[availability.status].toUpperCase()) as ContentDeskState['titles'][number]['status'];
    /* on the shelves, not on the service: the slate can give it a premiere week */
    const schedulable = live && launchedAt !== null && availability.source !== 'ORIGINAL' && availability.status === 'READY' && !programmed;
    /* A permanent window or purchase is stored with an expiry of about 9e15
       weeks; it is a licence kept for good, not one ending in 9e15 weeks. */
    const perpetual = Boolean(license && (license.windowType === 'PERMANENT' || license.expiresAtAbsoluteWeek - absoluteWeek > 100_000));
    const renewal = renewalByProject.get(projectId);
    /* completion is a 0–1 rate in the weekly loop (rounding it as a percent
       printed 1% for every title) */
    const completionRate = performance?.completionRate ?? 0;
    return [{
      id: projectId,
      title: title.title,
      kind: availability.source,
      format: title.projectType === 'SERIES' ? 'Series' : 'Film',
      genre: title.genre,
      status,
      rating: title.rating ?? (performance ? clamp(performance.satisfactionScore / 10, 0, 10) : undefined),
      views: performance?.viewingAccounts,
      completion: performance ? clamp(Math.round(completionRate <= 1 ? completionRate * 100 : completionRate), 0, 100) : undefined,
      hue: hueOf(projectId),
      year: title.releaseYear,
      poster: posterById.get(projectId),
      schedulable,
      /* Window: any title on a licence that runs out (an Original's own
         window included — it leaves when it ends). Kept: no licence end at
         all. Lapsed: a licensed title with no active licence — it was listed
         under "Owned outright" before. */
      rightsState: perpetual ? 'KEPT' as const : license ? 'WINDOW' as const : availability.source === 'LICENSED' ? 'LAPSED' as const : 'KEPT' as const,
      rights: license ? {
        licensor: license.licensorName,
        territory: license.territory.replaceAll('_', ' '),
        endsInWeeks: perpetual ? undefined : Math.max(0, license.expiresAtAbsoluteWeek - absoluteWeek),
        windowWeeks: perpetual ? undefined : license.durationWeeks,
        exclusive: license.exclusivity === 'EXCLUSIVE',
        renewCost: perpetual ? undefined : license.minimumGuarantee,
        perpetual,
      } : undefined,
      renewal: renewal && !perpetual ? {
        caseId: renewal.id,
        stage: RENEWAL_STAGE[renewal.status],
        pending: renewal.outcome === 'PENDING' && !renewal.replacementContractId,
        offer: renewal.offerDisposition === 'OFFERED' && renewal.proposedEconomics ? {
          cost: renewal.proposedEconomics.minimumGuarantee,
          durationWeeks: renewal.proposedEconomics.durationWeeks,
          expiresInWeeks: Math.max(0, renewal.proposedEconomics.offerExpiresAtAbsoluteWeek - absoluteWeek),
        } : undefined,
        deadlineInWeeks: Math.max(0, renewal.decisionDeadlineAbsoluteWeek - absoluteWeek),
        ...(renewal.decidedBy ? { by: renewal.decidedBy.name, byWeeksAgo: Math.max(0, absoluteWeek - renewal.decidedBy.absoluteWeek) } : {}),
      } : undefined,
    }];
  });
  /* --- the release schedule ----------------------------------------------
     Before launch the opening slate is counted in programme weeks (Week 1 is
     opening night). Once live it is read on the calendar: the opening slate
     at launch week + n − 1, and every Original with a premiere date, from
     this week on — the old view kept counting programme weeks from "now" and
     so placed every release, and its rights check, in the wrong week. */
  const slateEntries = platform.launchSlate?.entries ?? [];
  type SlateItem = ContentDeskState['slate'][number]['releases'][number] & { at: number };
  const kindOf = (source: string): 'ORIGINAL' | 'LICENSED' | 'OWNED' => (source === 'ORIGINAL' ? 'ORIGINAL' : source === 'OWNED_LIBRARY' ? 'OWNED' : 'LICENSED');
  const riskOf = (projectId: string, releaseWeek: number | null) => {
    if (releaseWeek === null) return false;
    const licence = platform.catalogLicenses.find(item => item.sourceProjectId === projectId && item.status === 'ACTIVE');
    return Boolean(licence && licence.windowType !== 'PERMANENT' && licence.expiresAtAbsoluteWeek <= releaseWeek);
  };
  const formatOf = (projectId: string, projectType?: string): 'Film' | 'Series' => ((projectType ?? resolveStreamingCatalogueReadTitle(context, projectId)?.projectType) === 'SERIES' ? 'Series' : 'Film');
  /* a licensed title's window, so a premiere is only offered weeks its rights cover */
  const windowOf = (projectId: string) => {
    const licence = platform.catalogLicenses.filter(item => item.sourceProjectId === projectId && item.status === 'ACTIVE')
      .sort((left, right) => right.startsAtAbsoluteWeek - left.startsAtAbsoluteWeek)[0];
    if (!licence) return {};
    const kept = licence.windowType === 'PERMANENT' || licence.permanentPurchase || licence.expiresAtAbsoluteWeek - absoluteWeek > 100_000;
    return { rightsFrom: licence.startsAtAbsoluteWeek, ...(kept ? {} : { rightsUntil: licence.expiresAtAbsoluteWeek }) };
  };
  const items: SlateItem[] = slateEntries.map(entry => {
    const at = launchedAt === null ? entry.launchWeek : launchedAt + entry.launchWeek - 1;
    return {
      id: entry.id, projectId: entry.projectId, title: entry.title, kind: kindOf(entry.source),
      marketing: entry.marketingPlan, hue: hueOf(entry.projectId), poster: posterById.get(entry.projectId),
      genre: resolveStreamingCatalogueReadTitle(context, entry.projectId)?.genre,
      rightsRisk: riskOf(entry.projectId, launchedAt === null ? null : at), at,
      format: formatOf(entry.projectId, entry.projectType),
      /* a premiere still ahead that the slate set can be moved or taken off (Originals premiere through their release) */
      editable: launchedAt !== null && live && entry.source !== 'ORIGINAL' && at > absoluteWeek,
      ...(entry.source === 'LICENSED_WINDOW' ? windowOf(entry.projectId) : {}),
    };
  });
  if (launchedAt !== null) {
    const scheduled = new Set(items.map(item => item.projectId));
    platform.originalCommissions.forEach(commission => {
      const premiere = commission.releasePlan?.premiereAtAbsoluteWeek;
      const projectId = commission.canonicalProjectId || commission.id;
      if (!premiere || scheduled.has(projectId)) return;
      items.push({
        id: `original-${commission.id}`, projectId, title: commission.title, kind: 'ORIGINAL',
        marketing: commission.releasePlan!.marketingPlan, hue: hueOf(projectId), poster: posterById.get(projectId),
        genre: commission.genre, rightsRisk: false, at: premiere, format: formatOf(projectId, commission.projectType),
      });
      scheduled.add(projectId);
    });
    /* a licence bought after setup goes on the service by itself when its rights
       start (a renewal of a title already on the service is not a premiere) */
    platform.catalogLicenses.forEach(licence => {
      if (licence.status !== 'ACTIVE' || licence.origin === 'STARTER' || licence.startsAtAbsoluteWeek <= absoluteWeek
        || scheduled.has(licence.sourceProjectId) || programme.has(licence.sourceProjectId)) return;
      items.push({
        id: `licence-${licence.id}`, projectId: licence.sourceProjectId, title: licence.titleAtSigning, kind: 'LICENSED',
        marketing: 'LEAN', hue: hueOf(licence.sourceProjectId), poster: posterById.get(licence.sourceProjectId),
        genre: licence.genre, rightsRisk: false, at: licence.startsAtAbsoluteWeek, format: formatOf(licence.sourceProjectId, licence.projectType), auto: true,
        ...windowOf(licence.sourceProjectId),
      });
      scheduled.add(licence.sourceProjectId);
    });
  }
  /* Before launch: the opening programme weeks. Once live: a year of the
     calendar from this week, each week named the way the game names it. */
  const firstWeek = launchedAt === null ? 1 : absoluteWeek;
  const lastWeek = launchedAt === null ? Math.max(firstWeek + 11, ...items.map(item => item.at)) : absoluteWeek + 51;
  const slate = Array.from({ length: Math.min(52, lastWeek - firstWeek + 1) }, (_, index) => {
    const week = firstWeek + index;
    const year = Math.floor(week / 52) + 1;
    const weekOfYear = (week % 52) + 1;
    return {
      week,
      ...(launchedAt === null ? {} : { year, weekOfYear }),
      label: launchedAt === null ? (week === 1 ? 'Opening night' : `Week ${week}`) : index === 0 ? 'This week' : index === 1 ? 'Next week' : `Week ${weekOfYear}`,
      now: launchedAt !== null && index === 0,
      releases: items.filter(item => item.at === week).map(({ at: _at, ...release }) => release),
    };
  });
  return {
    live, titles, slate, calendar: launchedAt === null ? 'PROGRAMME' : 'WEEKS',
    /* the auto-fill plans: around the premieres already planned (only when the shelves
       hold something), and fresh (only when something is planned to replace) */
    ...(launchedAt !== null && live ? {
      scheduleFrom: absoluteWeek + 1,
      autoFill: titles.some(title => title.schedulable) ? planStreamingSlateAutoFill(player) : [],
      autoFillFresh: items.some(item => item.editable) ? planStreamingSlateAutoFill(player, { fresh: true }) : [],
    } : {}),
  };
};

export const createCanonicalNetworkState = (player: Player): NetworkState => {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const latest = platform.weeklyHistory.at(-1);
  const peakLoad = clamp(Math.round(latest?.operations?.capacityUtilizationPercent ?? 0), 0, 140);
  /* #102 (Zeesh: "service bhi launch se shuru karo"): a bar a week, from the launch while the service is younger than
     the strip (the weeks before it were filled with green), each its own week's close; a week without one (the launch's
     own) is green */
  const weeks = streamingStatusLineWeeks(absoluteWeek, platform.launchCommit?.committedAtAbsoluteWeek ?? null);
  const closes = new Map(platform.weeklyHistory.map(snapshot => [snapshot.absoluteWeek, snapshot]));
  const history = weeks.map(week => {
    const snapshot = closes.get(week);
    const load = snapshot?.operations?.capacityUtilizationPercent ?? 0;
    const playback = snapshot?.operations?.playbackSuccessRate ?? 100;
    return load >= 100 || playback < 92 ? 2 : load >= 82 || playback < 97 ? 1 : 0;
  });
  /* both incident systems (#49): a crisis and a server incident colour the strips alike */
  const service = getStreamingServiceStatus(
    getStreamingOpenIncidents(platform, absoluteWeek),
    peakLoad,
    Math.round((1 - getStreamingInfrastructureOperationsEffects(platform).capacityMultiplier) * 100),
  );
  const levelStatus = (level: StreamingStatusLevel) => (level === 'DOWN' ? 'outage' as const : level === 'SLOW' ? 'degraded' as const : 'operational' as const);
  const status = platform.infrastructureSetup ? levelStatus(service.DELIVERY) : 'maintenance' as const;
  /* --- where the rooms you built actually reach ---------------------------

     This listed six services, one per rack duty, and went red for the duty
     with no rooms — the right idea for a world where a player chose duties.
     Since #99 nobody does; every room expands into all six, so that reading
     could only ever fire by rounding, on a network too small to put a rack in
     each. Three signals now, from the same reach model the Build wizard's map
     is painted with: how much of your markets' audience is inside any ring,
     how much of it is close enough for a smooth stream, and how many markets
     fall between the two. That is geometry. The night's load is the video
     delivery line beside them, from the weekly loop as before. */
  const facilities = platform.infrastructureSetup?.facilities || [];
  const hasNetwork = facilities.length > 0;
  const signals = readNetworkSignals(
    facilities.map(facility => ({ cityId: facility.cityId, racks: facility.installedRacks, listingId: facility.lease?.listingId })),
    getOwnedPlatformPackageCountryIds(platform),
    /* The ladder position and the standard's clock, as the wizard reads them. */
    { fibre: platform.fibre, platformWeeks: Math.max(0, absoluteWeek - (platform.serviceStandardFromWeek ?? absoluteWeek)) },
  );
  type CompStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

  /* Nothing commissioned yet is not the same as everything broken, and it is
     certainly not ninety days of green. */
  const unknownHistory = new Array(30).fill(3);
  const historyFor = (componentStatus: CompStatus) => {
    if (!hasNetwork) return unknownHistory;
    if (componentStatus === 'operational') return history;
    return history.map(day => Math.max(day, componentStatus === 'outage' ? 2 : 1));
  };
  /* A share graded the way a status page grades: nine in ten is operational,
     six in ten is degraded, less than that is an outage. */
  const gradeShare = (share: number): CompStatus => (
    !hasNetwork ? 'maintenance' : share >= 0.9 ? 'operational' : share >= 0.6 ? 'degraded' : 'outage'
  );
  const reachStatus = gradeShare(signals.reached);
  const servedStatus = gradeShare(signals.served);
  const regionsStatus: CompStatus = !hasNetwork ? 'maintenance'
    : signals.dark.length > 0 ? 'outage'
      : signals.thin.length > 0 ? 'degraded'
        : 'operational';
  const serviceStatus = (id: 'ACCOUNTS' | 'RECOMMENDATIONS' | 'RIGHTS'): CompStatus => (!hasNetwork ? 'maintenance' : levelStatus(service[id]));
  const playback = latest?.operations?.playbackSuccessRate
    ?? platform.infrastructureSetup?.reliabilityTarget
    ?? 99.9;
  const marketsFine = signals.markets.length - signals.thin.length - signals.dark.length;

  const components = [
    { id: 'REACH', name: 'Reach', status: reachStatus, uptime: signals.reached * 100, measure: 'of your markets reached', history: historyFor(reachStatus) },
    { id: 'SERVED', name: 'Served well', status: servedStatus, uptime: signals.served * 100, measure: 'served to the standard', history: historyFor(servedStatus) },
    {
      id: 'REGIONS', name: 'Thin regions', status: regionsStatus,
      uptime: signals.markets.length > 0 ? (marketsFine / signals.markets.length) * 100 : 0,
      measure: `of markets served well · ${signals.thin.length} thin · ${signals.dark.length} dark`,
      history: historyFor(regionsStatus),
    },
    { id: 'DELIVERY', name: 'Video delivery', status: hasNetwork ? status : 'maintenance' as const, uptime: hasNetwork ? playback : 0, history: hasNetwork ? history : unknownHistory },
    { id: 'ACCOUNTS', name: 'Accounts and payments', status: serviceStatus('ACCOUNTS'), uptime: hasNetwork ? Math.max(0, playback - .08) : 0, history: historyFor(serviceStatus('ACCOUNTS')) },
    { id: 'RECOMMENDATIONS', name: 'Recommendations', status: serviceStatus('RECOMMENDATIONS'), uptime: hasNetwork ? 99.92 : 0, history: historyFor(serviceStatus('RECOMMENDATIONS')) },
    { id: 'RIGHTS', name: 'Rights and publishing', status: serviceStatus('RIGHTS'), uptime: hasNetwork ? 99.96 : 0, history: historyFor(serviceStatus('RIGHTS')) },
  ].map(comp => ({ ...comp, fromLaunch: hasNetwork && weeks.length < STREAMING_STATUS_LINE_WEEKS }));
  const placements = platform.infrastructureSetup?.networkPlacements || [];
  const weightedRacks = placements.reduce((sum, placement) => (
    sum + placement.racks * (placement.role === 'CORE_ORIGIN' ? 1 : placement.role === 'REGIONAL_HUB' ? .95 : .82)
  ), 0) || 1;
  const cities = placements.map(placement => {
    const location = getProductionLocation(placement.cityId);
    const weight = placement.racks * (placement.role === 'CORE_ORIGIN' ? 1 : placement.role === 'REGIONAL_HUB' ? .95 : .82);
    const campus = placement.racks <= 6 ? 'Rented cage'
      : placement.racks <= 20 ? 'Private server hall'
        : placement.racks <= 48 ? 'Data-centre campus' : 'Hyperscale campus';
    return {
      id: placement.cityId,
      city: location?.name || placement.cityId.replaceAll('_', ' '),
      region: location?.regionId || 'NETWORK',
      loadPct: peakLoad,
      latencyMs: Math.max(12, 48 - (location?.quality || 6) * 2
        + (placement.role === 'CORE_ORIGIN' ? 8 : placement.role === 'REGIONAL_HUB' ? 3 : 0)),
      capacityGbps: Math.max(1, Math.round((platform.capacity.baselineConcurrentStreams / 25_000) * weight / weightedRacks)),
      hub: placement.role !== 'EDGE_CACHE',
      racks: placement.racks,
      role: placement.role === 'CORE_ORIGIN' ? 'CORE ORIGIN' as const
        : placement.role === 'REGIONAL_HUB' ? 'REGIONAL HUB' as const : 'EDGE CACHE' as const,
      campus,
    };
  });
  const branchNames: Record<string, string> = {
    DELIVERY_CAPACITY: 'Delivery capacity', PLAYBACK_QUALITY: 'Playback quality', RELIABILITY: 'Reliability',
    DATA_RECOMMENDATIONS: 'Recommendations', SECURITY: 'Security', CONTENT_OPERATIONS: 'Content operations',
  };
  /* What a track is for, in the player's terms. The unlock levels are the ones
     the pricing and storefront services check (saveStreamingPricingPlan,
     STREAMING_STOREFRONT_LAYOUTS). */
  const branchNotes: Record<string, string> = {
    DELIVERY_CAPACITY: 'More streams at the busiest hour before buffering starts.',
    PLAYBACK_QUALITY: 'Unlocks 1080p at 20, spatial audio at 45 and 4K HDR at 55 for your plans.',
    RELIABILITY: 'Steadier playback; unlocks two screens per account at 10 and four at 35.',
    DATA_RECOMMENDATIONS: 'Better picks for every viewer, so more of the catalogue gets watched.',
    SECURITY: 'Protects accounts and titles from breaches and piracy.',
    CONTENT_OPERATIONS: 'No longer needed: nothing waits on it (#86).',
  };
  const tech = Object.entries(branchNames).map(([branch, name]) => {
    const project = [...platform.technologyProjects].reverse().find(item => item.branch === branch);
    return {
      id: branch,
      name,
      note: project?.riskNote || branchNotes[branch] || `${name} research.`,
      level: platform.technologyLevels[branch as keyof typeof platform.technologyLevels] ?? 0,
      /* technology levels run 0–100 (clamped in normalizeOwnedStreamingPlatformState);
         a 5-level scale showed every established track as MAXED */
      maxLevel: 100,
      building: project?.status === 'UNDER_CONSTRUCTION' ? {
        weeksLeft: Math.max(0, project.readyAtAbsoluteWeek - absoluteWeek),
        doctrine: project.buildMode,
      } : undefined,
      debt: Boolean(project && project.technicalDebtDelta > 0),
    };
  });
  /* #126: the products this save launched in the old Product Lab, which run on above the PRODUCT tab's showcase; named
     as the product, not "EMPIRE+ …", and one still being built says when it is ready (it used to read "Needs" and
     nothing after it) */
  const products = platform.productLines.map(product => ({
    id: product.id,
    lineId: product.lineId,
    name: product.title.replace(/^EMPIRE\+\s*/, ''),
    note: product.strategicConsequence,
    state: product.status === 'UNDER_DEVELOPMENT' ? 'BUILDING' as const : product.status,
    readyIn: product.status === 'UNDER_DEVELOPMENT' ? Math.max(1, product.readyAtAbsoluteWeek - absoluteWeek) : undefined,
    weeklyCost: product.weeklyOperatingCost,
    load: product.peakLoadPercent,
  }));
  const incidents = platform.crisisSecurity.crises.slice(-8).reverse().map(crisis => ({
    id: crisis.id,
    when: `WK ${crisis.detectedAtAbsoluteWeek}`,
    title: crisis.title,
    severity: ['MAJOR', 'CRITICAL'].includes(crisis.severity) ? 'major' as const : 'minor' as const,
    resolvedIn: crisis.resolvedAtAbsoluteWeek ? `${Math.max(0, crisis.resolvedAtAbsoluteWeek - crisis.detectedAtAbsoluteWeek)}w` : 'Open',
    note: crisis.outcomeNote || crisis.detail,
  }));
  /* The infrastructure's debt (a finished campus project's debt is already in it, so projects are not
     added again) plus the tech tree's own, from pushing quality fast; Stabilization pays both down. */
  const technicalDebt = clamp(Math.round(resolveStreamingPlatformTechDebt(platform)), 0, 100);
  return {
    live: platform.lifecycle === 'ACTIVE', components, cities, tech, products, incidents, peakLoad,
    /* #92: the room's BUILDING for a live company: regions with a network order under way (campus builds stay on TECH) */
    networkBuilding: (platform.networkOrders ?? []).filter(order => order.status === 'BUILDING').length,
    /* #97: the room strip's PLAYBACK, this week's share of plays that start and hold */
    playbackSuccess: latest?.operations ? Math.round(latest.operations.playbackSuccessRate * 10) / 10 : null,
    // capacity is counted in load units (an HD stream is 1, a 4K one 2.4), so headroom is in HD streams
    headroom: `${Math.max(0, platform.capacity.burstConcurrentStreams - (latest?.operations?.peakLoadUnits ?? latest?.operations?.peakConcurrentStreams ?? 0)).toLocaleString()} HD streams free`,
    technicalDebt,
  };
};

/** #136: the Audience room reads the market and the room model; the old made-up metrics, trend, Top 10 (hash arrows,
    random services), attribution, campaign ranges and region rows are gone. */
export const createCanonicalAudienceState = (player: Player): AudienceState => {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  const livingMarket = getStreamingAudienceMarket(player);
  return { live: platform.lifecycle === 'ACTIVE', market: livingMarket, room: buildAudienceRoomModel(player, livingMarket) };
};

export const createCanonicalBoardroomState = (player: Player): BoardroomState => {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const foundedAt = platform.identity?.foundedAtAbsoluteWeek ?? absoluteWeek;
  const latest = platform.weeklyHistory.at(-1)?.operations;
  const previous = platform.weeklyHistory.at(-2)?.operations;
  const publicMarkets = getStreamingPublicMarkets(player);
  const listing = platform.publicCompany.listing;
  const latestQuote = platform.publicCompany.quoteHistory.at(-1);
  const activeExecutives = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
  const executiveCosts = activeExecutives.reduce((sum, item) => sum + item.weeklyCompensation, 0);
  const boardCosts = platform.governance.directors.filter(item => item.status === 'ACTIVE').reduce((sum, item) => sum + item.weeklyCompensation, 0);
  /* Every line the weekly loop counts as operating revenue (subscription +
     products + the viewing layer's incremental revenue). Ad, store and
     sponsorship money was missing, so an ad-only or store-only service read
     as all cost and no income here. */
  const viewingAds = latest?.worldViewingAdvertisingRevenue ?? 0;
  const viewingStore = latest?.worldViewingTransactionRevenue ?? 0;
  const viewingSponsor = latest?.worldViewingSponsorshipRevenue ?? 0;
  const viewingOther = Math.max(0, (latest?.worldViewingIncrementalRevenue ?? 0) - viewingAds - viewingStore - viewingSponsor);
  const weeklyRevenue = latest ? [
    { id: 'SUBSCRIPTION', label: 'Subscriptions', amount: latest.subscriptionRevenue },
    { id: 'ADVERTISING', label: 'Advertising', amount: viewingAds },
    { id: 'STORE', label: 'Rentals and purchases', amount: viewingStore },
    { id: 'SPONSORSHIP', label: 'Sponsorship', amount: viewingSponsor },
    { id: 'PASSES', label: 'Ad-free passes and other viewing', amount: viewingOther },
    { id: 'PRODUCTS', label: 'Products', amount: latest.productRevenue || 0 },
  ].filter((line, index) => index === 0 || line.amount > 0) : [];
  /* the bandwidth bill (Phase 2): every viewing hour by its picture, after Optimisation */
  const delivery = latest?.streamingDeliveryCost ?? 0;
  const phaseIn = latest?.streamingDeliveryPhaseIn ?? 1;
  const weeklyCosts = latest ? [
    { id: 'RIGHTS', label: 'Rights and partner share', amount: latest.partnerRevenueShareCost },
    { id: 'NETWORK', label: 'Infrastructure', amount: latest.infrastructureCost },
    // a save from before Phase 2 pays it in eighths over 8 weeks
    ...(delivery > 0 ? [{ id: 'DELIVERY', label: phaseIn < 1 ? `Streaming delivery · ${Math.round(phaseIn * 8)}/8` : 'Streaming delivery', amount: delivery }] : []),
    { id: 'LEADERSHIP', label: 'Leadership', amount: latest.leadershipCost },
    /* #163: directors' pay and the investors' weekly profit share were hidden inside operations */
    ...((latest.governanceCost || 0) > 0 ? [{ id: 'GOVERNANCE', label: 'Board and investors', amount: latest.governanceCost || 0 }] : []),
    { id: 'FINANCING', label: 'Financing', amount: latest.financingCost },
    { id: 'OPERATIONS', label: 'Content, growth and operations', amount: Math.max(0, latest.totalCashCost - latest.partnerRevenueShareCost - latest.infrastructureCost - delivery - latest.leadershipCost - (latest.governanceCost || 0) - latest.financingCost), note: latest.headline },
  ] : [
    { id: 'LEADERSHIP', label: 'Leadership', amount: executiveCosts + boardCosts },
    { id: 'NETWORK', label: 'Infrastructure', amount: platform.infrastructureSetup?.weeklyOperatingCost ?? 0 },
  ];
  const execs = activeExecutives.map(item => ({
    id: item.id,
    /* #163: "Chief Financial Officer", not "cfo" */
    role: STREAMING_EXECUTIVE_ROLE_LABELS[item.role] || item.role.replaceAll('_', ' '),
    name: item.nameAtAppointment,
    loyalty: item.loyalty,
    salary: item.weeklyCompensation,
    unlocks: `Level ${item.level} · ${item.preferredStrategy.replaceAll('_', ' ')}`,
  }));
  const activeDirectors = platform.governance.directors.filter(item => item.status === 'ACTIVE');
  const seats = Array.from({ length: Math.max(3, activeDirectors.length) }, (_, index) => {
    const director = activeDirectors[index];
    return { id: director?.id || `EMPTY-${index}`, holder: director?.name, votes: director ? 1 : undefined };
  });
  const holders = [
    { id: 'FOUNDER', name: player.name, pct: platform.founderOwnershipPercent, since: `WK ${platform.identity?.foundedAtAbsoluteWeek ?? 0}`, you: true },
    ...platform.finance.equityHolders.map(holder => ({ id: holder.id, name: holder.holderName, pct: holder.ownershipPercent, since: `WK ${holder.issuedAtAbsoluteWeek}` })),
  ];
  if (listing) holders.push({ id: 'PUBLIC', name: 'Public float', pct: Math.max(0, 100 - holders.reduce((sum, holder) => sum + holder.pct, 0)), since: `WK ${listing.listedAtAbsoluteWeek}` });
  /* #163: the cap table by size */
  holders.sort((left, right) => right.pct - left.pct);
  return {
    live: platform.lifecycle === 'ACTIVE',
    absoluteWeek,
    /* #163: the company's own week (31), not the career's (759) */
    companyWeek: Math.max(1, absoluteWeek - foundedAt + 1),
    companyYear: Math.max(1, Math.floor(Math.max(0, absoluteWeek - foundedAt) / 52) + 1),
    treasury: platform.treasuryCash,
    treasuryDelta: latest?.netCashContribution,
    weeklyNetDelta: latest && previous
      ? latest.netCashContribution - previous.netCashContribution
      : undefined,
    weeklyRevenue,
    weeklyCosts,
    execs,
    seats,
    holders,
    listed: platform.publicCompany.lifecycle === 'PUBLIC',
    ipoChecks: publicMarkets.readiness.map(item => ({ id: item.id, label: item.label, done: item.passed, note: item.passed ? item.value : item.requirement })),
    share: listing && latestQuote ? {
      ticker: listing.ticker,
      price: latestQuote.close,
      changePct: latestQuote.changePercent,
      marketCap: latestQuote.marketCap,
      history: platform.publicCompany.quoteHistory.slice(-24).map(quote => ({ label: `WK ${quote.absoluteWeek}`, value: quote.close })),
    } : undefined,
    successor: platform.legacy.successionPlan ? { name: platform.legacy.successionPlan.candidateName, role: platform.legacy.successionPlan.mandate.replaceAll('_', ' ') } : null,
    legacyTitle: platform.legacy.closedEras.at(-1)?.title,
  };
};

/** "Leaving Soon" lists licences ending within this many weeks. */
const STREAMING_VIEWER_LEAVING_WEEKS = 8;

export const createCanonicalViewerState = (player: Player, preparedContext?: StreamingCatalogueReadContext): AppState => {
  const context = getStreamingCatalogueReadContext(player, preparedContext);
  const { platform } = context;
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const latest = platform.weeklyHistory.at(-1);
  const performance = latest?.operations?.titlePerformance ?? [];
  const ranked = performance.filter(item => item.viewingAccounts > 0).sort((a, b) => b.viewingAccounts - a.viewingAccounts);
  /* #143: the app's "Top 10 on <service>" is the Audience room's own chart (#142), by views on your own hours; before a
     week has settled, by the accounts watching */
  const ownChart = getStreamingWeeklyChartView(player).own;
  const chartRanks = new Map(ownChart.available ? ownChart.lists.ALL.map(row => [row.id, row.rank]) : []);
  const countries = getOwnedPlatformPackageCountryIds(platform);
  const titles = getStreamingPlayableCatalogProjectIds(player, context).flatMap(projectId => {
    const title = resolveStreamingCatalogueReadTitle(context, projectId);
    if (!title || !getStreamingContentAvailability(player, projectId, countries, true, context).available) return [];
    const result = performance.find(item => item.projectId === projectId);
    const rank = ranked.findIndex(item => item.projectId === projectId);
    const license = platform.catalogLicenses.find(item => item.sourceProjectId === projectId && item.status === 'ACTIVE');
    const original = platform.originalCommissions.find(item => item.canonicalProjectId === projectId);
    const slateEntry = platform.launchSlate?.entries.find(item => item.projectId === projectId);
    return [{
      id: projectId,
      title: title.title,
      kind: original ? 'ORIGINAL' as const : title.source === 'OWNED_LIBRARY' ? 'OWNED' as const : 'LICENSED' as const,
      format: title.projectType === 'SERIES' ? 'Series' : 'Film',
      genre: title.genre,
      hue: hueOf(projectId),
      logline: `${title.genre} ${title.projectType === 'SERIES' ? 'series' : 'film'} from ${title.studioName}.`,
      /* completionRate is a 0–1 share and the card draws progress × 100%: rounding it drew
         every bar empty or full */
      progress: result && result.viewingAccounts > 0 ? clamp(result.completionRate, .02, .98) : undefined,
      /* only a licence that really ends soon: a permanent one never leaves (its expiry is
         Number.MAX_SAFE_INTEGER), and one ending in a year is not "Leaving Soon" */
      leavingInWeeks: license && license.expiresAtAbsoluteWeek - absoluteWeek <= STREAMING_VIEWER_LEAVING_WEEKS
        ? Math.max(0, license.expiresAtAbsoluteWeek - absoluteWeek) : undefined,
      rank: chartRanks.size ? chartRanks.get(projectId) : rank >= 0 && rank < 10 ? rank + 1 : undefined,
      newThisWeek: Boolean(slateEntry && latest?.operations?.programWeek === slateEntry.launchWeek),
      episodes: original?.projectType === 'SERIES'
        ? Array.from({ length: Math.max(1, original.episodes) }, (_, index) => ({ n: index + 1, title: `Episode ${index + 1}`, mins: 42 }))
        : undefined,
    }];
  });
  const peakLoad = clamp(Math.round(latest?.operations?.capacityUtilizationPercent ?? 0), 0, 140);
  const tier = streamingNetworkPictureTier(platform.metrics.technologyHealth, peakLoad);
  const regional = platform.competitiveWorld.regionalLaunches;
  const latencyMs = regional.length
    ? Math.round(regional.reduce((sum, region) => sum + Math.max(18, 62 - region.localizationDepth * 2), 0) / regional.length)
    : 36;
  const allocations = latest?.operations?.worldCompetitionPlanAllocations;
  const viewerPlans = getStreamingViewerPlans(platform, absoluteWeek, allocations);
  /* an open incident viewers would notice (#58): the banner, stalls, paused downloads */
  const outage = getStreamingViewerOutage(platform);
  const personal = getStreamingViewerPersonal(platform);
  /* #115: the ident the service paid for opens the app, with its sound (an uploaded one where it uses it) and its length */
  const config = platform.serviceConfiguration;
  const opening = config.identPackageId && config.soundIdentKey ? {
    sound: (config.customIdentAudio ? 'custom' : config.soundIdentKey.toLowerCase()) as StreamingIdentPreviewId,
    seconds: config.identDurationSeconds || 3,
    packageId: config.identPackageId,
    customAudio: config.customIdentAudio ? { dataUrl: config.customIdentAudio.dataUrl } : null,
  } : null;
  return {
    live: platform.lifecycle === 'ACTIVE',
    layoutId: platform.serviceConfiguration.storefrontLayoutId || 'cinema',
    titles,
    watchingNow: Math.max(0, Math.round((latest?.operations?.peakConcurrentStreams ?? 0) * .72)),
    network: { peakLoad, tier, latencyMs },
    /* the tech tree, as a subscriber meets it: badges, the player's quality menu, "Now in 4K" */
    quality: getStreamingViewerQuality(platform, absoluteWeek, allocations),
    /* the plans, as a viewer meets them (#48): the plan picker, each plan's view, ad breaks */
    plans: viewerPlans.plans,
    currentPlanId: viewerPlans.currentId,
    ...(outage ? { outage } : {}),
    /* Because you watched rows and "Who's watching?" (#63); neither: as before */
    ...(personal ? { personal } : {}),
    ...(opening ? { opening } : {}),
  };
};
