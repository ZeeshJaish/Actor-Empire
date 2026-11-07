/**
 * What the opening night shows, worked out from the company: HQ's night and the developer's replay read this one function, so the two cannot drift apart.
 */
import type { Player } from '../../../types';
import { gameWeekLabel } from '../../../services/gameWeek';
import { streamingLaunchPlaybackFor, type getStreamingLaunchReadiness } from '../../../services/streamingLaunch';
import type { StreamingNetworkMapView } from '../../../services/streamingNetworkMapView';
import { openingNightMoments, openingNightStations } from '../../../services/streamingOpeningNight';
import { getStreamingOriginalLiveStatus } from '../../../services/streamingOriginals';
import type { StreamingIdentPreviewId } from '../../../services/streamingIdentAudio';
import { titleHue } from '../audienceRoomModel';
import type { PremiereInputs } from '../StreamingPremiereExperience';

type NightTitle = { id: string; title: string; genre: string; hue: number };

/** the opening title, and the opening catalogue's best-known titles, owned and licensed */
export const openingNightTitles = (player: Player): { flagship: NightTitle | null; catalogue: NightTitle[] } => {
  const platform = player.ownedStreamingPlatform;
  const original = platform.originalCommissions.find(item => item.canonicalProjectId
    && ['DELIVERED', 'RELEASED'].includes(getStreamingOriginalLiveStatus(player, item)));
  return {
    flagship: original ? { id: original.canonicalProjectId!, title: original.title, genre: String(original.genre), hue: titleHue(original.canonicalProjectId!) } : null,
    catalogue: [...new Set([...(platform.catalogProjectIds || []), ...(platform.catalogLicenses || []).map(licence => licence.sourceProjectId)])]
      .map(id => {
        const project = player.world.projects.find(item => item.id === id);
        const licence = (platform.catalogLicenses || []).find(item => item.sourceProjectId === id);
        return { id, title: project?.title || licence?.titleAtSigning || 'Untitled', genre: String(project?.genre || licence?.genre || 'DRAMA'), hue: titleHue(id),
          famous: project?.isFamous ? 1 : 0, boxOffice: project?.boxOffice ?? 0 };
      })
      .sort((left, right) => (right.famous - left.famous) || (right.boxOffice - left.boxOffice))
      .slice(0, 6)
      .map(item => ({ id: item.id, title: item.title, genre: item.genre, hue: item.hue })),
  };
};

export const openingNightInputs = (player: Player, parts: {
  readiness: ReturnType<typeof getStreamingLaunchReadiness>;
  network: StreamingNetworkMapView;
  flagship: NightTitle | null;
  catalogue: NightTitle[];
}): PremiereInputs => {
  const platform = player.ownedStreamingPlatform;
  const { readiness, network, flagship, catalogue } = parts;
  const commit = platform.launchCommit;
  const baseline = Math.max(1, commit?.protectedPeakConcurrentStreams || platform.capacity.baselineConcurrentStreams || 65_000);
  const titleName = commit?.openingOriginalTitle || readiness.openingOriginalTitle;
  const plan = platform.launchMarketingPlan;
  const customers = player.world.worldStreamingCustomers?.countries ?? {};
  const burst = Math.max(baseline, platform.capacity.burstConcurrentStreams || baseline);
  const activeInvestor = (platform.finance.equityHolders || [])[0];
  const engineer = (platform.leadership.appointments || []).find(appointment => (
    appointment.status === 'ACTIVE' && appointment.role === 'CTO'
  ));
  return {
    title: titleName,
    projectType: platform.originalCommissions.find(item => item.title === titleName)?.projectType,
    ceiling: baseline,
    burstCeiling: burst,
    expected: commit?.forecastLikelyConcurrentStreams || readiness.forecastLikelyConcurrentStreams,
    stations: openingNightStations({
      items: readiness.items,
      committed: Boolean(commit),
      cities: network.sites.length,
      countries: network.markets.length,
      titles: readiness.openingTitleCount,
      title: titleName,
      treasury: platform.treasuryCash,
    }),
    capacityOptions: readiness.capacityOptions,
    playbackFor: Object.fromEntries(readiness.capacityOptions.map(option => [option.id, streamingLaunchPlaybackFor(platform, option)])),
    network,
    ident: {
      sound: (platform.serviceConfiguration.customIdentAudio ? 'custom' : (platform.serviceConfiguration.soundIdentKey || 'PULSE').toLowerCase()) as StreamingIdentPreviewId,
      seconds: platform.serviceConfiguration.identDurationSeconds || 3,
      packageId: platform.serviceConfiguration.identPackageId || 'STANDARD',
      customAudio: platform.serviceConfiguration.customIdentAudio ?? null,
    },
    moments: openingNightMoments(plan),
    titleArt: flagship,
    posters: [...(flagship ? [flagship] : []), ...catalogue.filter(item => item.id !== flagship?.id)].slice(0, 4),
    titleCount: readiness.openingTitleCount,
    runwayWeeks: readiness.runwayWeeks,
    treasury: platform.treasuryCash,
    markets: network.markets
      .map(market => ({ countryId: market.countryId, name: market.name, subscribers: customers[market.countryId]?.platformSummaries?.find(row => row.platformId === 'PLAYER')?.endingPaidAccounts ?? 0 }))
      .filter(market => market.subscribers > 0)
      .sort((left, right) => right.subscribers - left.subscribers),
    weekLabel: gameWeekLabel(commit?.committedAtAbsoluteWeek ?? readiness.absoluteWeek),
    /* the morning paper's other stories are the week's real news */
    stories: (player.news || []).filter(item => item.category !== 'YOU' && item.impactLevel !== 'LOW' && !/^(UNVERIFIED|REFUTED|CONFIRMED)\b|\bproject [a-z0-9]{6,}\b/i.test(item.headline)).slice(0, 2).map(item => item.headline),
    checks: readiness.items.map(item => ({
      id: item.id,
      label: item.label,
      ok: item.tone !== 'BLOCKED',
      note: item.detail,
    })),
    investor: activeInvestor ? {
      name: activeInvestor.holderName,
      agenda: 'Expects the platform to deliver the operating case behind the investment.',
    } : null,
    rivals: (platform.competitiveWorld.rivals || []).map(rival => ({
      name: rival.platformName,
      subs: `${Math.round(rival.subscribersMillions)}M`,
    })),
    engineer: engineer ? { name: engineer.nameAtAppointment, role: 'CTO' } : null,
    simulationSeed: platform.simulationSeed,
    committedLaunch: commit,
    launchAllowed: Boolean(commit) || readiness.canLaunch,
    launchBlockerMessage: readiness.canLaunch
      ? undefined
      : `${readiness.blockerCount} launch requirement${readiness.blockerCount === 1 ? '' : 's'} still need attention. Return to HQ and clear the highlighted rooms.`,
  };
};
