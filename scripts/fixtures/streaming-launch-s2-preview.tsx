import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StreamingBuildWizardExperience } from '../../components/streaming-transplant/StreamingBuildWizardExperience';
import type { BuildInputs, BuildSel } from '../../components/streaming-transplant/StreamingBuildoutExperience';
import type { Brand } from '../../components/streaming-transplant/StreamingBrandVisuals';

const brand: Brand = {
  name: 'S2+', markId: 'FRAME_PLAY', customMark: null, hue: 0, sat: 80,
  identId: 'pulse', customIdent: null, promiseId: 'BALANCED', publicManifesto: '',
  layoutId: 'wall', typeId: 'default', accentHue: 25, identMode: 'none', identLen: 2,
  ratingId: 'GENERAL', lockupId: 'default', serverCity: null,
};
const inputs: BuildInputs = {
  absoluteWeek: 22, treasury: 100_000_000, catalogueSpend: 0, catalogueTitles: 0,
  originalsSpend: 0, originalsCount: 0, premiereTitle: 'First Original',
  regions: ['NORTH_AMERICA'], markets: [], hasExplicitOpeningMarkets: false,
  marketPlanning: { editable: false, reason: 'File an opening market in Market Clearance first.' },
  homeCityId: null, audienceMul: 1,
  openingDemandForecast: { low: 0, likely: 0, high: 0, byMarket: {} },
};
const selection: BuildSel = { placements: [], facilities: [], arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE' };

function Fixture() {
  const [destination, setDestination] = useState('Build preview');
  return <>
    <div id="fixture-destination" style={{ position: 'absolute', left: -9999 }}>{destination}</div>
    <StreamingBuildWizardExperience
      brand={brand} inputs={inputs} sel={selection}
      onChange={() => { throw new Error('An unfiled Build must not change its drawing.'); }}
      onBack={() => setDestination('Dashboard')}
      onOpenDefine={step => setDestination(`Define Launch: ${step}`)}
    />
  </>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
