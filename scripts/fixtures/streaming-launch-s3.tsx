import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Country, LaunchData, LaunchDraft } from '../../components/studio-finance/finance/launch';
import { StepMarkets } from '../../components/studio-finance/components/launch/StepMarkets';
import { StepClearance } from '../../components/studio-finance/components/launch/StepClearance';
import { STREAMING_MARKET_SUB_REGIONS } from '../../services/streamingMarketSubRegions';
import { WORLD_COUNTRY_DEFINITIONS } from '../../services/worldEconomy/worldCountryRegistry';
import '../../components/studio-finance/styles/tokens.css';
import '../../components/studio-finance/styles/studio-finance.css';
import '../../components/studio-finance/styles/launch.css';
import '../../components/studio-finance/styles/kit.css';

const regions: Record<string, string> = {
  NORTH_AMERICA: 'North America', SOUTH_AMERICA: 'South America', EUROPE: 'Europe',
  AFRICA: 'Africa', ASIA: 'Asia', OCEANIA: 'Oceania',
};
const byCountry = new Map(STREAMING_MARKET_SUB_REGIONS.flatMap(group =>
  group.countryIds.map(id => [id, group] as const)));
const countries: Country[] = WORLD_COUNTRY_DEFINITIONS.map((source, index) => {
  const group = byCountry.get(source.id)!;
  return {
    id: source.id, code: source.id, name: source.name, region: regions[source.regionId],
    subRegionId: group.id, subRegion: group.name, authored: false,
    competition: 'OPEN', difficulty: 'LOW', audience: Math.round(source.baselinePopulation * 0.025),
    addressableHouseholds: Math.round(source.baselinePopulation * 0.012), growth: 7 + index % 4,
    opportunity: '', languages: source.languages.map(name => ({ name, share: 100 / source.languages.length })),
    rightsEstimate: 100_000 + index * 1_000, complianceCost: 20_000 + index * 100,
    rivals: [], localizationNote: '',
    dossier: {
      approvalWeeks: '4–6 weeks', consumerRequirements: ['Local terms'],
      levels: { tax: 0, review: 1, privacy: 1, localContent: 0 },
      taxBaseline: '10%', privacyLevel: 'Standard', localContentObligation: 'None',
      regulatoryOverhead: 0, risks: [], clearances: [], regulatoryExpectation: 'Local terms apply.',
      edgeSites: 1, peakConcurrent: 25_000, bandwidthGbps: 40, infraCity: 'Regional hub',
    },
  } as Country;
});
const northAmerica = countries.filter(country => country.region === 'North America').map(country => country.id);

function Fixture() {
  const [draft, setDraft] = useState<LaunchDraft>({ selectedCountryIds: northAmerica });
  const [step, setStep] = useState<'MARKETS' | 'CLEARANCE'>('MARKETS');
  const chosen = countries.filter(country => draft.selectedCountryIds.includes(country.id));
  const data = {
    countries, regions: Object.values(regions), clearance: [], energy: { current: 100, max: 100 },
  } as unknown as LaunchData;
  const props = {
    data, draft, patch: (next: Partial<LaunchDraft>) => setDraft(current => ({ ...current, ...next })),
    chosen, treasury: { available: 1_000_000_000, founderContributed: 1_000_000_000, planned: 0, committed: 0, paid: 0 },
    free: 1_000_000_000, gap: 0, handlers: {},
  };
  return (
    <div className="sf lw s3-fixture">
      <div className="s3-fixture-controls">
        <button type="button" onClick={() => setStep('MARKETS')}>Markets</button>
        <button type="button" onClick={() => setStep('CLEARANCE')}>Clearance</button>
      </div>
      <div className="sf-scroll">
        <div className="lw-body">{step === 'MARKETS' ? <StepMarkets {...props} /> : <StepClearance {...props} />}</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
