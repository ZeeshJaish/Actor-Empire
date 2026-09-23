import type { Player } from '../../types';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../../services/ownedStreamingPlatform';
import { resolveStreamingCatalogTitle } from '../../services/streamingCatalog';
import { getStreamingContentAvailability, CONTENT_AVAILABILITY_LABELS } from '../../services/streamingContentAvailability';
import { getOwnedPlatformPackageCountryIds } from '../../services/streamingContentAvailability';
import { getStreamingPublicMarkets } from '../../services/streamingPublicMarkets';
import { getStreamingAudienceMarket } from '../../services/streamingAudienceMarket';
import { getProductionLocation } from '../../services/productionLocations';
import type { ContentDeskState } from './StreamingContentExperience';
import type { NetworkState } from './StreamingNetworkExperience';
import type { AudienceState, RecObjective } from './StreamingAudienceExperience';
import type { BoardroomState } from './StreamingBoardroomExperience';
import type { AppState } from './StreamingViewerExperience';
import { readNetworkSignals } from '../../services/streamingNetworkSignals';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const hueOf = (key: string) => [...key].reduce((sum, character) => ((sum * 31) + character.charCodeAt(0)) % 360, 53);
const movement = (current: number, previous: number) => previous === 0 ? 0 : ((current - previous) / Math.abs(previous)) * 100;

export const createCanonicalContentDeskState = (player: Player): ContentDeskState => {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const latestPerformance = platform.weeklyHistory.at(-1)?.operations?.titlePerformance ?? [];
  const performanceByProject = new Map(latestPerformance.map(item => [item.projectId, item]));
  const projectIds = [...new Set([...platform.catalogProjectIds, ...platform.originalCommissions.flatMap(c => c.canonicalProjectId ? [c.canonicalProjectId] : [])])];
  const countries = getOwnedPlatformPackageCountryIds(platform);
  const titles = projectIds.flatMap(projectId => {
    const title = resolveStreamingCatalogTitle(player, projectId);
    if (!title) return [];
    const license = platform.catalogLicenses.find(item => item.sourceProjectId === projectId && item.status === 'ACTIVE' && item.startsAtAbsoluteWeek <= absoluteWeek && item.expiresAtAbsoluteWeek > absoluteWeek);
    const original = platform.originalCommissions.find(item => item.canonicalProjectId === projectId);
    const performance = performanceByProject.get(projectId);
    const availability = getStreamingContentAvailability(player, projectId, countries);
    const status = CONTENT_AVAILABILITY_LABELS[availability.status].toUpperCase() as ContentDeskState['titles'][number]['status'];
    return [{
      id: projectId,
      title: title.title,
      kind: availability.source,
      format: title.projectType === 'SERIES' ? 'Series' : 'Film',
      genre: title.genre,
      status,
      rating: title.rating ?? (performance ? clamp(performance.satisfactionScore / 10, 0, 10) : undefined),
      views: performance?.viewingAccounts,
      completion: performance ? clamp(Math.round(performance.completionRate), 0, 100) : undefined,
      hue: hueOf(projectId),
      rights: license ? {
        licensor: license.licensorName,
        territory: license.territory.replaceAll('_', ' '),
        endsInWeeks: Math.max(0, license.expiresAtAbsoluteWeek - absoluteWeek),
        windowWeeks: license.durationWeeks,
        exclusive: license.exclusivity === 'EXCLUSIVE',
        renewCost: license.minimumGuarantee,
      } : undefined,
    }];
  });
  const entries = platform.launchSlate?.entries ?? [];
  const maxWeek = Math.max(12, ...entries.map(entry => entry.launchWeek));
  const slate = Array.from({ length: maxWeek }, (_, index) => {
    const week = index + 1;
    return {
      week,
      releases: entries.filter(entry => entry.launchWeek === week).map(entry => {
        const license = platform.catalogLicenses.find(item => item.sourceProjectId === entry.projectId && item.status === 'ACTIVE');
        return {
          id: entry.id,
          title: entry.title,
          kind: entry.source === 'ORIGINAL' ? 'ORIGINAL' as const : 'LICENSED' as const,
          marketing: entry.marketingPlan === 'EVENT' ? 'HEAVY' as const : entry.marketingPlan === 'STANDARD' ? 'LIGHT' as const : 'NONE' as const,
          hue: hueOf(entry.projectId),
          rightsRisk: Boolean(license && license.expiresAtAbsoluteWeek < absoluteWeek + week),
        };
      }),
    };
  });
  return { live: platform.lifecycle === 'ACTIVE', titles, slate };
};

export const createCanonicalNetworkState = (player: Player): NetworkState => {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const latest = platform.weeklyHistory.at(-1);
  const peakLoad = clamp(Math.round(latest?.operations?.capacityUtilizationPercent ?? 0), 0, 140);
  const activeCrisis = [...platform.crisisSecurity.crises].reverse().find(crisis => crisis.stage !== 'RESOLVED');
  const history = platform.weeklyHistory.slice(-30).map(snapshot => {
    const load = snapshot.operations?.capacityUtilizationPercent ?? 0;
    const playback = snapshot.operations?.playbackSuccessRate ?? 100;
    return load >= 100 || playback < 92 ? 2 : load >= 82 || playback < 97 ? 1 : 0;
  });
  while (history.length < 30) history.unshift(0);
  const status = activeCrisis?.type === 'PLATFORM_OUTAGE'
    ? 'outage' as const
    : peakLoad >= 90
      ? 'degraded' as const
      : platform.infrastructureSetup
        ? 'operational' as const
        : 'maintenance' as const;
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
  const crisisStatus = (crisis: boolean): CompStatus => (!hasNetwork ? 'maintenance' : crisis ? 'degraded' : status);
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
    { id: 'ACCOUNTS', name: 'Accounts and payments', status: crisisStatus(activeCrisis?.type === 'ACCOUNT_BREACH' || status === 'outage'), uptime: hasNetwork ? Math.max(0, playback - .08) : 0, history: historyFor(crisisStatus(activeCrisis?.type === 'ACCOUNT_BREACH')) },
    { id: 'RECOMMENDATIONS', name: 'Recommendations', status: crisisStatus(activeCrisis?.type === 'RECOMMENDATION_BACKLASH'), uptime: hasNetwork ? 99.92 : 0, history: historyFor(crisisStatus(activeCrisis?.type === 'RECOMMENDATION_BACKLASH')) },
    { id: 'RIGHTS', name: 'Rights and publishing', status: crisisStatus(activeCrisis?.type === 'RIGHTS_COMPLIANCE'), uptime: hasNetwork ? 99.96 : 0, history: historyFor(crisisStatus(activeCrisis?.type === 'RIGHTS_COMPLIANCE')) },
  ];
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
  const tech = Object.entries(branchNames).map(([branch, name]) => {
    const project = [...platform.technologyProjects].reverse().find(item => item.branch === branch);
    return {
      id: branch,
      name,
      note: project?.riskNote || `Canonical ${name.toLowerCase()} research track.`,
      level: platform.technologyLevels[branch as keyof typeof platform.technologyLevels] ?? 0,
      maxLevel: 5,
      building: project?.status === 'UNDER_CONSTRUCTION' ? {
        weeksLeft: Math.max(0, project.readyAtAbsoluteWeek - absoluteWeek),
        doctrine: project.buildMode,
      } : undefined,
      debt: Boolean(project && project.technicalDebtDelta > 0),
    };
  });
  const products = platform.productLines.map(product => ({
    id: product.id,
    name: product.title,
    note: product.strategicConsequence,
    state: product.status === 'UNDER_DEVELOPMENT' ? 'LOCKED' as const : product.status,
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
  const technicalDebt = clamp(Math.round((platform.infrastructureSetup?.technicalDebt ?? 0) + platform.technologyProjects.reduce((sum, item) => sum + item.technicalDebtDelta, 0)), 0, 100);
  return {
    live: platform.lifecycle === 'ACTIVE', components, cities, tech, products, incidents, peakLoad,
    headroom: `${Math.max(0, platform.capacity.burstConcurrentStreams - (latest?.operations?.peakConcurrentStreams ?? 0)).toLocaleString()} streams free`,
    technicalDebt,
  };
};

export const createCanonicalAudienceState = (player: Player): AudienceState => {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  const livingMarket = getStreamingAudienceMarket(player);
  const history = platform.weeklyHistory.slice(-90);
  const latest = history.at(-1);
  const previous = history.at(-2);
  const sparkOf = (pick: (snapshot: typeof history[number]) => number) => {
    const values = history.slice(-12).map(pick);
    return values.length > 1 ? values : [0, values[0] ?? 0];
  };
  const metrics = [
    { id: 'SUBS', label: 'SUBSCRIBERS', value: platform.metrics.subscribers.toLocaleString(), delta: movement(latest?.subscribers ?? 0, previous?.subscribers ?? 0), spark: sparkOf(item => item.subscribers) },
    { id: 'CHURN', label: 'CHURN', value: `${(platform.metrics.churnRate * 100).toFixed(1)}%`, delta: movement(latest?.churnRate ?? 0, previous?.churnRate ?? 0), inverse: true, spark: sparkOf(item => item.churnRate) },
    { id: 'ENGAGE', label: 'ENGAGEMENT', value: `${Math.round(platform.metrics.engagementRate * 100)}%`, delta: movement(latest?.engagementRate ?? 0, previous?.engagementRate ?? 0), spark: sparkOf(item => item.engagementRate) },
    { id: 'ARPU', label: 'ARPU', value: `$${platform.metrics.averageRevenuePerUser.toFixed(2)}`, delta: movement(latest?.averageRevenuePerUser ?? 0, previous?.averageRevenuePerUser ?? 0), spark: sparkOf(item => item.averageRevenuePerUser) },
  ];
  const trend = history.length
    ? history.map(item => ({ label: `WK ${item.absoluteWeek}`, value: item.subscribers }))
    : [{ label: 'PRE-LAUNCH', value: 0 }];
  const titlePerformance = latest?.operations?.titlePerformance ?? [];
  const strongestPlayerAudience = Math.max(1, ...titlePerformance.map(item => item.viewingAccounts));
  const rivalPlatforms = livingMarket.platforms.filter(item => item.id !== 'PLAYER' && item.id !== 'REGIONAL');
  const playerChartCandidates = titlePerformance.map(item => ({
    id: item.projectId,
    title: item.title,
    platform: platform.identity?.name || 'Your platform',
    mine: true,
    hue: hueOf(item.projectId),
    score: item.viewingAccounts / strongestPlayerAudience,
  }));
  const rivalChartCandidates = [...player.world.projects]
    .filter(project => !titlePerformance.some(item => item.projectId === project.id))
    .sort((left, right) => (right.year - left.year) || (right.weekReleased - left.weekReleased) || (right.quality - left.quality))
    .slice(0, 20)
    .map(project => {
      const platformIndex = hueOf(`${project.id}-platform`) % Math.max(1, rivalPlatforms.length);
      const chartPlatform = rivalPlatforms[platformIndex];
      return {
        id: project.id,
        title: project.title,
        platform: chartPlatform?.name || 'Rival platform',
        mine: false,
        hue: hueOf(project.id),
        score: clamp(project.quality / 100 * .68 + (project.rating ?? project.quality / 10) / 10 * .2 + Math.min(1, project.boxOffice / 500) * .12, 0, 1.2),
      };
    });
  const chart = [...playerChartCandidates, ...rivalChartCandidates]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, 10)
    .map((item, index) => ({
      rank: index + 1,
      prevRank: index === 0 ? 1 : clamp(index + (hueOf(`${item.id}-movement`) % 3), 1, 10),
      title: item.title,
      platform: item.platform,
      mine: item.mine,
      hue: item.hue,
    }));
  const mix = titlePerformance[0]?.discoveryMix;
  const netAdds = Math.max(0, latest?.netSubscriberMovement ?? platform.metrics.netSubscriberMovement);
  const attribution = [
    { id: 'HOME', label: 'Homepage', value: Math.round(netAdds * (mix?.homepagePercent ?? 0) / 100), note: 'Hero and curated placement' },
    { id: 'REC', label: 'Recommendations', value: Math.round(netAdds * (mix?.recommendationsPercent ?? 0) / 100), note: 'Personalized discovery' },
    { id: 'SEARCH', label: 'Search', value: Math.round(netAdds * (mix?.searchPercent ?? 0) / 100), note: 'Viewer intent' },
    { id: 'DIRECT', label: 'Direct', value: Math.round(netAdds * (mix?.directPercent ?? 0) / 100), note: 'Known-title demand' },
  ];
  const campaigns = platform.growthActions.slice(-8).reverse().map(action => ({
    id: action.id,
    name: action.title,
    channel: action.channels.join(' · '),
    spend: action.cashCost,
    reachLow: action.outcome ? Math.round(action.outcome.attributedViewingAccounts * .85) : 0,
    reachHigh: action.outcome ? Math.round(action.outcome.attributedViewingAccounts * 1.15) : 0,
    weeksLeft: action.status === 'LOCKED' ? Math.max(0, action.targetAbsoluteWeek - getAbsoluteWeek(player.age, player.currentWeek)) : 0,
    live: action.status === 'LOCKED',
  }));
  const latestObjective = platform.growthActions.at(-1)?.recommendationObjective;
  const objective: RecObjective = latestObjective === 'CATALOG_DISCOVERY' ? 'DISCOVERY' : latestObjective ?? 'BALANCED';
  const selectedCountries = livingMarket.countries.filter(country => country.selectedForLaunch);
  const regionGroups = new Map<string, typeof selectedCountries>();
  selectedCountries.forEach(country => {
    const group = regionGroups.get(country.regionId) || [];
    group.push(country);
    regionGroups.set(country.regionId, group);
  });
  const regions = Array.from(regionGroups.entries()).map(([regionId, countries]) => {
    const totalViewers = countries.reduce((sum, country) => sum + country.activeViewers, 0);
    const weightedShare = countries.reduce((sum, country) => sum + country.playerSharePercent * country.activeViewers, 0) / Math.max(1, totalViewers);
    const weightedGrowth = countries.reduce((sum, country) => sum + country.annualGrowthPercent * country.activeViewers, 0) / Math.max(1, totalViewers);
    const topRivals = Array.from(new Set(countries.map(country => country.topPlatformName))).slice(0, 3);
    const subscriberShare = selectedCountries.reduce((sum, country) => sum + country.activeViewers, 0) > 0
      ? totalViewers / selectedCountries.reduce((sum, country) => sum + country.activeViewers, 0)
      : 0;
    return {
      id: regionId,
      label: countries[0]?.regionName || regionId,
      subs: Math.round(platform.metrics.subscribers * subscriberShare),
      sharePct: weightedShare,
      growthPct: weightedGrowth,
      latencyMs: Math.round(countries.reduce((sum, country) => sum + (country.selectedForLaunch ? 54 : 118), 0) / Math.max(1, countries.length)),
      rivals: topRivals,
    };
  }).sort((left, right) => right.subs - left.subs);
  return { live: platform.lifecycle === 'ACTIVE', metrics, trend, trendLabel: 'SUBSCRIBERS', chart, attribution, campaigns, objective, regions, market: livingMarket };
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
  const weeklyRevenue = latest ? [
    { id: 'SUBSCRIPTION', label: 'Subscription revenue', amount: latest.subscriptionRevenue },
    { id: 'PRODUCTS', label: 'Product revenue', amount: latest.productRevenue || 0 },
  ] : [];
  const weeklyCosts = latest ? [
    { id: 'RIGHTS', label: 'Rights and partner share', amount: latest.partnerRevenueShareCost },
    { id: 'NETWORK', label: 'Infrastructure', amount: latest.infrastructureCost },
    { id: 'LEADERSHIP', label: 'Leadership', amount: latest.leadershipCost },
    { id: 'FINANCING', label: 'Financing', amount: latest.financingCost },
    { id: 'OPERATIONS', label: 'Content, growth and operations', amount: Math.max(0, latest.totalCashCost - latest.partnerRevenueShareCost - latest.infrastructureCost - latest.leadershipCost - latest.financingCost), note: latest.headline },
  ] : [
    { id: 'LEADERSHIP', label: 'Leadership', amount: executiveCosts + boardCosts },
    { id: 'NETWORK', label: 'Infrastructure', amount: platform.infrastructureSetup?.weeklyOperatingCost ?? 0 },
  ];
  const execs = activeExecutives.map(item => ({
    id: item.id,
    role: item.role.replaceAll('_', ' '),
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
  return {
    live: platform.lifecycle === 'ACTIVE',
    absoluteWeek,
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

export const createCanonicalViewerState = (player: Player): AppState => {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const latest = platform.weeklyHistory.at(-1);
  const performance = latest?.operations?.titlePerformance ?? [];
  const ranked = [...performance].sort((a, b) => b.viewingAccounts - a.viewingAccounts);
  const countries = getOwnedPlatformPackageCountryIds(platform);
  const titles = platform.catalogProjectIds.flatMap(projectId => {
    const title = resolveStreamingCatalogTitle(player, projectId);
    if (!title || !getStreamingContentAvailability(player, projectId, countries).available) return [];
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
      progress: result ? clamp(Math.round(result.completionRate), 0, 99) : undefined,
      leavingInWeeks: license ? Math.max(0, license.expiresAtAbsoluteWeek - absoluteWeek) : undefined,
      rank: rank >= 0 && rank < 10 ? rank + 1 : undefined,
      newThisWeek: Boolean(slateEntry && latest?.operations?.programWeek === slateEntry.launchWeek),
      episodes: original?.projectType === 'SERIES'
        ? Array.from({ length: Math.max(1, original.episodes) }, (_, index) => ({ n: index + 1, title: `Episode ${index + 1}`, mins: 42 }))
        : undefined,
    }];
  });
  const peakLoad = clamp(Math.round(latest?.operations?.capacityUtilizationPercent ?? 0), 0, 140);
  const reliability = platform.metrics.technologyHealth;
  const tier = reliability >= 78 && peakLoad < 85 ? '4K' as const : reliability >= 45 ? 'HD' as const : 'SD' as const;
  const regional = platform.competitiveWorld.regionalLaunches;
  const latencyMs = regional.length
    ? Math.round(regional.reduce((sum, region) => sum + Math.max(18, 62 - region.localizationDepth * 2), 0) / regional.length)
    : 36;
  return {
    live: platform.lifecycle === 'ACTIVE',
    layoutId: platform.serviceConfiguration.storefrontLayoutId || 'cinema',
    titles,
    watchingNow: Math.max(0, Math.round((latest?.operations?.peakConcurrentStreams ?? 0) * .72)),
    network: { peakLoad, tier, latencyMs },
  };
};
