/* Development-only C6 visual fixture. It never reads or mutates a career save. */
import React, { Profiler, useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { INITIAL_PLAYER, type OwnedStreamingPricingConfiguration } from '../types';
import { StepPricing } from '../components/studio-finance/components/launch/StepPricing';
import { LaunchWizard } from '../components/studio-finance/components/launch/LaunchWizard';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import StreamingDefineLaunchExperience from '../components/StreamingDefineLaunchExperience';
import { createC6QaCareer } from './c6QaCareer';
import '../components/studio-finance/styles/tokens.css';
import '../components/studio-finance/styles/studio-finance.css';
import '../components/studio-finance/styles/kit.css';
import '../components/studio-finance/styles/launch.css';

const fixturePlayer = structuredClone(INITIAL_PLAYER);
fixturePlayer.id = 'c6-pricing-visual-only';
fixturePlayer.age = 40;
fixturePlayer.currentWeek = 12;
fixturePlayer.ownedStreamingPlatform.lifecycle = 'FOUNDING';
fixturePlayer.ownedStreamingPlatform.identity = {
  name: 'Empire+', slug: 'c6-visual-only', primaryColor: '#ec3134', secondaryColor: '#111',
  logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: '',
  dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 2092,
};

const initialPricing = normalizeStreamingPricingConfiguration(
  fixturePlayer.ownedStreamingPlatform.serviceConfiguration.pricing,
);
const chosen = [
  { id: 'US', name: 'United States', addressableHouseholds: 40_000_000, pricingCohorts: [] },
  { id: 'IN', name: 'India', addressableHouseholds: 80_000_000, pricingCohorts: [] },
];

/** Browser-lab measurements only: input to next animation frame, not real-device INP. */
function usePricingInteractionProbe() {
  useEffect(() => {
    const frameSamples: number[] = [];
    const longTasks: number[] = [];
    const onInput = (event: Event) => {
      if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'range') return;
      const started = performance.now();
      requestAnimationFrame(() => {
        frameSamples.push(Math.round((performance.now() - started) * 100) / 100);
        document.documentElement.dataset.pricingP3InputFrameMs = frameSamples.join(',');
      });
    };
    document.addEventListener('input', onInput, true);
    const observer = typeof PerformanceObserver === 'undefined' ? null : new PerformanceObserver(list => {
      for (const entry of list.getEntries()) longTasks.push(Math.round(entry.duration * 100) / 100);
      document.documentElement.dataset.pricingP3LongTasksMs = longTasks.join(',');
    });
    try {
      observer?.observe({ entryTypes: ['longtask'] });
      document.documentElement.dataset.pricingP3LongTaskObserver = observer ? 'attached' : 'unavailable';
    } catch {
      observer?.disconnect();
      document.documentElement.dataset.pricingP3LongTaskObserver = 'unsupported';
    }
    return () => { document.removeEventListener('input', onInput, true); observer?.disconnect(); };
  }, []);
}

function PricingLab() {
  const [pricing, setPricing] = useState<OwnedStreamingPricingConfiguration>(initialPricing);
  const forecast = useCallback((settings: OwnedStreamingPricingConfiguration, ids: string[]) => (
    forecastWorldStreamingLaunchPricing(fixturePlayer, settings, ids)
  ), []);
  return <div className="sf lw">
    <header className="sf-head" style={{ flex: 'none' }}>
      <div className="sf-head-titles"><h1>Define the Launch</h1><p>P0–P4 preview · no career changes</p></div>
      <button type="button" onClick={() => setPricing(initialPricing)}>Reset</button>
    </header>
    <main style={{ overflowY: 'auto', padding: '18px 16px 80px', minHeight: 0 }}>
      <StepPricing
        data={{ pricing, market: { rivalAveragePrice: 12, reachRate: .3 }, capabilityLocks: {
          'feature:uhd': 'Research locked', 'feature:spatial': 'Research locked',
          'feature:streams4': 'Research locked', 'feature:extraseat': 'Research locked',
        } } as any}
        draft={{ pricing, selectedCountryIds: chosen.map(country => country.id) }}
        patch={change => setPricing(current => normalizeStreamingPricingConfiguration({ ...current, ...change.pricing }))}
        chosen={chosen as any}
        treasury={{ available: 1_000_000_000, founderContributed: 1_000_000_000, planned: 0, committed: 0, paid: 0 }}
        free={1_000_000_000}
        gap={0}
        handlers={{ onForecastPricing: forecast } as any}
      />
    </main>
  </div>;
}

function WizardLab() {
  usePricingInteractionProbe();
  const freshWizard = new URLSearchParams(location.search).has('fresh');
  const storageKey = `actor-empire:pricing-p1-lab:${freshWizard ? 'fresh' : 'configured'}`;
  const [player, setPlayer] = useState(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) { try { return JSON.parse(saved) as typeof fixturePlayer; } catch { /* disposable fixture */ } }
    const fixture = createC6QaCareer('BUILD');
    if (freshWizard) {
      fixture.ownedStreamingPlatform.serviceConfiguration.pricing = structuredClone(initialPricing);
      fixture.ownedStreamingPlatform.serviceConfiguration.pricingApproach = null;
      fixture.ownedStreamingPlatform.launchProgram.defineDraft = null;
    }
    return fixture;
  });
  // Isolated preview persistence only. Never reads/writes game career slots.
  useEffect(() => { sessionStorage.setItem(storageKey, JSON.stringify(player)); }, [player, storageKey]);
  const noop = () => undefined;
  return <Profiler id="PricingWizard" onRender={(_id, phase, duration) => {
    console.info('PRICING_PROFILE', phase, Math.round(duration * 100) / 100);
  }}><StreamingDefineLaunchExperience player={player} onUpdatePlayer={setPlayer}
    initialStep="PRICING" onClose={noop} onOpenFinance={noop} onOpenCatalogue={noop}
    onOpenBuild={noop} onOpenPricing={noop} onOpenTechnology={noop} /></Profiler>;
}

/** Disposable same-fixture interaction counter for the P3 drag audit. */
function ProfileLab() {
  usePricingInteractionProbe();
  const [autosaveRender, setAutosaveRender] = useState(0);
  const metrics = useRef({ worldRuns: 0, draftSaves: 0, durationsMs: [] as number[] });
  const data = {
    company: { name: 'P3 isolated', week: 12 },
    treasury: { available: 1_000_000_000, founderContributed: 1_000_000_000, planned: 0, committed: 0, paid: 0 },
    energy: { current: 100, max: 100 }, capitalRoutes: [], regions: [],
    countries: [{ ...chosen[0], code: 'US', rightsEstimate: 0, complianceCost: 0 }],
    selectedCountryIds: ['US'], clearance: [], identSounds: [], identPackages: [],
    ident: { commissioned: false, committedCost: 0, purchasedPackageIds: [] },
    storefronts: [], storefrontTitles: [], pricingApproaches: [], pricing: initialPricing,
    market: { rivalAveragePrice: 12, reachRate: .03 }, offer: { saved: false },
    catalogue: { titles: 0, hours: 0, hoursNeeded: 1, readiness: 0 },
    forecast: { audience: 0, peakConcurrent: 0, bandwidthGbps: 0, edgeSites: 0 },
    blockers: [], blueprintSaved: false, capabilityLocks: {},
  };
  return <div data-autosave-render={autosaveRender}
    onKeyDownCapture={event => { document.documentElement.dataset.pricingP3KeyDown = `${event.key}:${(event.target as HTMLInputElement).value}`; }}
    onKeyUpCapture={event => { document.documentElement.dataset.pricingP3KeyUp = `${event.key}:${(event.target as HTMLInputElement).value}`; }}
    onInputCapture={event => { document.documentElement.dataset.pricingP3Input = (event.target as HTMLInputElement).value; }}>
    <LaunchWizard data={data as any} initialStep="pricing" forecastWorldState={fixturePlayer.world}
      forecastContextKey="p3-unchanged-world"
      onForecastPricing={(settings, ids) => {
        const start = performance.now();
        const result = forecastWorldStreamingLaunchPricing(fixturePlayer, settings, ids);
        performance.mark('pricing-p3-world-forecast');
        metrics.current.worldRuns += 1;
        metrics.current.durationsMs.push(Math.round((performance.now() - start) * 100) / 100);
        document.documentElement.dataset.pricingP3WorldRuns = String(metrics.current.worldRuns);
        document.documentElement.dataset.pricingP3Durations = metrics.current.durationsMs.join(',');
        return result;
      }}
      onDraftChange={() => {
        performance.mark('pricing-p3-draft-save');
        metrics.current.draftSaves += 1;
        document.documentElement.dataset.pricingP3DraftSaves = String(metrics.current.draftSaves);
        setAutosaveRender(current => current + 1);
      }} />
  </div>;
}

const root = ReactDOM.createRoot(document.getElementById('pricing-lab')!);
root.render(
  new URLSearchParams(location.search).has('profile') ? <ProfileLab />
    : new URLSearchParams(location.search).has('wizard') ? <WizardLab /> : <PricingLab />,
);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
