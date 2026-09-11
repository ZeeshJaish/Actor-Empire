import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DistributionStep,
  CampaignStep,
  CalendarStep,
  FestivalsStep,
  FinalizeStep,
  ReleaseStrategyShell,
  StreamingWarRoomStep,
  TheatricalDeskStep,
} from '../../views/lifestyle/business/release-strategy-transplant';
import { buildReleaseFilmArt, getReleaseWizardProgress } from '../../views/lifestyle/business/release-strategy-transplant/adapter';
import type { ReleaseWizardRoute } from '../../views/lifestyle/business/release-strategy-transplant/model';
import { INITIAL_PLAYER, type Business, type Player } from '../../types';
import { createHomeStudioProductionQaActions } from '../../views/home/homeStudioProductionQaActions';
import { ReleaseWizard } from '../../views/lifestyle/business/ReleaseWizard';

function ControllerFixture() {
  const seeded = React.useMemo(() => {
    const studio = {
      id: 'cheat_studio', name: 'Cheat Studio', type: 'PRODUCTION_HOUSE', balance: 500_000_000,
      stats: { weeklyRevenue: 0, weeklyExpenses: 0, weeklyProfit: 0, lifetimeRevenue: 0, valuation: 500_000_000, brandHealth: 70, customerSatisfaction: 70, riskLevel: 10, hype: 50 },
      studioState: { scripts: [], concepts: [], writers: [], ipMarket: [], lockedStreamingFunds: [] },
    } as Business;
    const base: Player = { ...structuredClone(INITIAL_PLAYER), id: 'release-wizard-controller-player', age: 30, currentWeek: 18, energy: { ...INITIAL_PLAYER.energy, current: 100 }, money: 900_000_000, businesses: [studio], commitments: [], activeReleases: [], pastProjects: [] };
    let result = base;
    createHomeStudioProductionQaActions({ player: base, onUpdatePlayer: player => { result = player; }, closeMenu: () => undefined, ensureCheatStudio: () => ({ updatedPlayer: base, studio }), onOpenProductionHouseCheat: () => undefined }).triggerStudioScenario('AWAITING_RELEASE');
    const draftStep = Number(new URLSearchParams(location.search).get('draftStep') || 0);
    if (draftStep >= 2 && result.commitments[0]?.projectDetails) {
      result.commitments[0].projectDetails.releasePlanningDraft = {
        step: draftStep,
        releaseType: 'THEATRICAL',
        screeningStrategy: 'NATIONAL',
        selectedRegionIds: ['NORTH_AMERICA'],
        distributionChainSelections: { NORTH_AMERICA: ['NOVA_CIRCUIT'] },
        campaignPositioning: 'MASS_EVENT',
        campaignTimeline: 'BALANCED_ROLLOUT',
        channelAllocations: {},
        selectedPlatform: null,
        festivalPremiere: null,
        releaseWeek: result.currentWeek + 4,
        updatedAt: Date.now(),
      };
    }
    return result;
  }, []);
  const [player, setPlayer] = useState(seeded);
  const [completeCount, setCompleteCount] = useState(0);
  const initialEnergyRef = React.useRef(seeded.energy.current);
  const project = player.commitments[0];
  const studio = player.businesses.find(business => business.id === 'cheat_studio');
  (window as any).__releaseFixture = { player, completeCount, initialEnergy: initialEnergyRef.current };
  const postTheatrical = new URLSearchParams(location.search).has('postTheatrical');
  return <ReleaseWizard player={player} studio={studio} project={project} onBack={() => undefined} onUpdatePlayer={setPlayer} onComplete={() => setCompleteCount(value => value + 1)} isPostTheatricalBidding={postTheatrical} />;
}

function Fixture() {
  const mode = new URLSearchParams(location.search).get('mode') || 'distribution';
  const [selected, setSelected] = useState<ReleaseWizardRoute | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [chains, setChains] = useState<Record<string, string[]>>({});
  const [campaignAllocation, setCampaignAllocation] = useState(0);
  const [festivalDone, setFestivalDone] = useState(false);
  const [festival, setFestival] = useState<string | null>('CANNES');
  const [calendarWeek, setCalendarWeek] = useState(54);
  const film = buildReleaseFilmArt({ name: 'Glass City', projectDetails: { genre: 'THRILLER' } });

  if (mode === 'controller') return <ControllerFixture />;

  if (mode === 'finalize') {
    return <ReleaseStrategyShell film={film} phase="FINALIZE" progress={getReleaseWizardProgress(6, 'THEATRICAL')} route="THEATRICAL" onBack={() => undefined}>
      <FinalizeStep
        film={film}
        route="THEATRICAL"
        campaignStyle="mass"
        campaignLabel="Mass Event"
        campaignPromise="The biggest movie in the room."
        timelineLabel="Balanced Rollout"
        channelCount={4}
        campaignSpend={64_000_000}
        campaignReturn={24_100_000}
        festivalLabel="Cannes"
        releaseWeek={54}
        screenCount={2_400}
        regionCount={1}
        partnerNames={['Nova Circuit']}
        bookingCost={4_200_000}
        studioShare={0.52}
        valueRange={[141_000_000, 221_000_000]}
        energyCost={15}
        disabled={false}
        onLock={() => undefined}
        onBack={() => undefined}
      />
    </ReleaseStrategyShell>;
  }

  if (mode === 'festivals') {
    if (festivalDone) {
      const slots = Array.from({ length: 52 }, (_, index) => {
        const week = 49 + index;
        const weekOfYear = ((week - 1) % 52) + 1;
        return { week, weekOfYear, selectable: week >= 53 && week <= 60, isCurrent: week === 49, selected: week === calendarWeek, season: weekOfYear <= 13 ? 'Spring' : weekOfYear <= 26 ? 'Summer' : weekOfYear <= 39 ? 'Fall' : 'Winter', event: null, rivals: [] };
      });
      return <ReleaseStrategyShell film={film} phase="CALENDAR" progress={getReleaseWizardProgress(5, 'THEATRICAL')} route="THEATRICAL" onBack={() => undefined}>
        <CalendarStep film={film} slots={slots} selectedWeek={calendarWeek} onSelectWeek={setCalendarWeek} onContinue={() => undefined} onBack={() => setFestivalDone(false)} />
      </ReleaseStrategyShell>;
    }
    return <ReleaseStrategyShell film={film} phase="FESTIVALS" progress={getReleaseWizardProgress(4, 'THEATRICAL')} route="THEATRICAL" onBack={() => undefined}>
      <FestivalsStep qualityScore={88} selectedFestivalId={festival} festivals={[
        { id: 'CANNES', name: 'Cannes', description: 'The prestige launch.', cost: 250_000, qualityRequirement: 82, qualityMet: true, affordable: true, timingRight: true, timingLabel: 'Available this week', weekLabel: 'Week 20', hue: 44 },
        { id: 'SUNDANCE', name: 'Sundance', description: 'Independent discovery.', cost: 90_000, qualityRequirement: 65, qualityMet: true, affordable: true, timingRight: false, timingLabel: 'Returns next year', weekLabel: 'Week 4', hue: 205 },
      ]} onSelectFestival={setFestival} onContinue={() => setFestivalDone(true)} onBack={() => undefined} />
    </ReleaseStrategyShell>;
  }

  if (mode === 'campaign') {
    return <ReleaseStrategyShell film={film} phase="CAMPAIGN" progress={getReleaseWizardProgress(3, 'THEATRICAL')} route="THEATRICAL" onBack={() => undefined} hue={28}>
      <CampaignStep
        film={film}
        positions={[{ id: 'MASS_EVENT', label: 'Mass Event', shortLabel: 'Spectacle', description: 'Make opening weekend feel unavoidable.', promise: 'The biggest movie in the room.', hue: 28, style: 'mass' }]}
        selectedPositionId="MASS_EVENT"
        timelines={[{ id: 'BALANCED_ROLLOUT', label: 'Balanced Rollout', description: 'Sustained heat into release.', weights: [0.2, 0.35, 0.5, 0.65, 0.8, 1, 0.9, 0.7, 0.5, 0.3, 0.15] }]}
        selectedTimelineId="BALANCED_ROLLOUT"
        forecast={{ score: 78, label: 'Strong Read', openingRange: '$141M–$221M', breakEvenChance: 74, weekTwoDropRisk: 41, streamingBidBoost: 18, awardsVisibility: 12, note: 'Market demand is carrying the campaign.' }}
        soundtrack={{ label: 'Original score', score: 82, openingLift: 9, trailerLift: 11, mismatchRisk: 3 }}
        channels={[{ id: 'TRAILER_LAUNCH', label: 'Trailer Launch', description: 'The primary reveal.', icon: 'play', amount: campaignAllocation }]}
        budget={88_100_000}
        spent={campaignAllocation}
        allocationStep={8_800_000}
        onSelectPosition={() => undefined}
        onSelectTimeline={() => undefined}
        onChangeChannel={(_, delta) => setCampaignAllocation(value => Math.max(0, Math.min(88_100_000, value + delta)))}
        onContinue={() => undefined}
        onBack={() => undefined}
      />
    </ReleaseStrategyShell>;
  }

  if (mode === 'war') {
    const offer = {
      id: 'offer-netflix-r2', sessionId: 'session-1', platformId: 'NETFLIX', platformName: 'Netflix', revision: 2,
      status: 'FINAL', replacesOfferId: null, isClearingOffer: true, dealStructure: 'GUARANTEE_PLUS_BACKEND',
      minimumGuarantee: 120_000_000, productionFunding: 0, futureSeasonFunding: 0,
      licensorRevenueShare: 18, platformRevenueShare: 82, backendBasis: 'ADJUSTED_GROSS_RECEIPTS',
      guaranteeRecoupment: 'NON_RECOUPABLE', backendCap: null, durationWeeks: 104,
      territory: 'WORLDWIDE', countryIds: ['us'], windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
      localization: 'DUBS_AND_SUBTITLES', renewalOption: false, fixedExposure: 120_000_000,
      expectedRoyaltyCost: 22_000_000, expectedTotalCost: 142_000_000, expectedPlatformValue: 190_000_000,
      createdAtActiveSecond: 8,
    } as any;
    const canalOffer = {
      ...offer,
      id: 'offer-canal-r2', platformId: 'CANAL_PLUS', platformName: 'CANAL+', isClearingOffer: false,
      minimumGuarantee: 165_000_000, licensorRevenueShare: 8, platformRevenueShare: 92,
      exclusivity: 'NON_EXCLUSIVE', fixedExposure: 165_000_000,
      expectedRoyaltyCost: 12_000_000, expectedTotalCost: 177_000_000,
    } as any;
    const session = {
      id: 'session-1', title: 'Glass City', status: 'CLOSING', roomSecondsRemaining: 0,
      rightsLot: { territory: 'WORLDWIDE', windowType: 'FIRST_WINDOW', maximumDurationWeeks: 156, countryIds: ['us'], notice: null },
      platformStates: [
        { platformId: 'NETFLIX', platformName: 'Netflix', color: '#e50914', status: 'FINAL', currentOfferId: offer.id, actionCooldownSeconds: 6, secondsUntilAction: 0 },
        { platformId: 'CANAL_PLUS', platformName: 'CANAL+', color: '#f2f2f2', status: 'FINAL', currentOfferId: canalOffer.id, actionCooldownSeconds: 6, secondsUntilAction: 0 },
      ],
      offers: [offer, canalOffer], events: [], subjectKind: 'TITLE',
    } as any;
    return <ReleaseStrategyShell film={film} phase="WAR" progress={getReleaseWizardProgress(2, 'STREAMING_ONLY')} route="STREAMING" onBack={() => undefined}>
      <StreamingWarRoomStep film={film} session={session} marketPlatforms={[]} canAccept energyCost={5} onStart={() => undefined} onSessionChange={() => undefined}
        onAccept={accepted => { (window as any).__releaseFixture = { acceptedOfferIds: [accepted.id] }; }} onFinish={() => undefined} onContinue={() => undefined} onLeave={() => undefined} onBack={() => undefined} />
    </ReleaseStrategyShell>;
  }

  if (mode === 'desk') {
    const regionModels = [
      { id: 'NORTH_AMERICA', label: 'North America', shortLabel: 'N. America', selected: regions.includes('NORTH_AMERICA'), marketWeight: 1.1, chains: [
        { id: 'NOVA_CIRCUIT', name: 'Nova Circuit', color: '#f8b84e', selected: (chains.NORTH_AMERICA || []).includes('NOVA_CIRCUIT'), screens: 2400, exhibitorCut: 0.48, bookingCost: 4_200_000 },
      ] },
    ];
    const chosen = regionModels.filter(region => region.selected);
    const screens = chosen.reduce((sum, region) => sum + region.chains.filter(chain => chain.selected).reduce((chainSum, chain) => chainSum + chain.screens, 0), 0);
    return <ReleaseStrategyShell film={film} phase="DESK" progress={getReleaseWizardProgress(2, 'THEATRICAL')} route="THEATRICAL" onBack={() => undefined}>
      <TheatricalDeskStep
        regions={regionModels}
        selectedRegionCount={chosen.length}
        totalScreens={screens}
        bookingCost={4_200_000}
        studioShare={0.52}
        expectedFootfall={1_800_000}
        openingRange={[12_000_000, 19_000_000]}
        onToggleRegion={id => setRegions(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id])}
        onToggleChain={(regionId, chainId) => setChains(value => ({ ...value, [regionId]: (value[regionId] || []).includes(chainId) ? [] : [chainId] }))}
        onAutoBuild={() => { setRegions(['NORTH_AMERICA']); setChains({ NORTH_AMERICA: ['NOVA_CIRCUIT'] }); }}
        onContinue={() => undefined}
        onBack={() => undefined}
      />
    </ReleaseStrategyShell>;
  }

  return (
    <ReleaseStrategyShell
      film={film}
      phase="DISTRIBUTION"
      progress={getReleaseWizardProgress(1, selected === 'THEATRICAL' ? 'THEATRICAL' : 'STREAMING_ONLY')}
      route={selected}
      onBack={() => undefined}
    >
      <DistributionStep
        film={film}
        selected={selected}
        theatricalDisabled={false}
        streamingDisabled={false}
        onSelect={setSelected}
        onContinue={() => undefined}
      />
    </ReleaseStrategyShell>
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
