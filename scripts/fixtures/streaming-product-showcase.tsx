/* The Platform room's PRODUCT tab (#126): every product coming in a future update, as moving thumbnails. `?yours`
   adds the products an old save launched in the old Product Lab (one live, one paused, one still being built), which
   run on above the showcase with Pause and Resume; a press answers with a message and changes nothing. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PlatformDesk, type NetworkState, type PlatformProduct } from '../../components/streaming-transplant/StreamingNetworkExperience';
import type { Brand } from '../../components/streaming-transplant/StreamingBrandVisuals';

const brand: Brand = {
  name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
  publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
  lockupId: 'WORDMARK', serverCity: null,
};
const yours: PlatformProduct[] = new URLSearchParams(location.search).has('yours') ? [
  { id: 'line-live', lineId: 'LIVE', name: 'Live', note: '', state: 'ACTIVE', weeklyCost: 1_100_000, load: 28 },
  { id: 'line-fan', lineId: 'FAN', name: 'Fan', note: '', state: 'PAUSED', weeklyCost: 320_000, load: 7 },
  { id: 'line-kids', lineId: 'KIDS', name: 'Kids', note: '', state: 'BUILDING', readyIn: 2, weeklyCost: 260_000, load: 6 },
] : [];
const state: NetworkState = {
  live: true,
  components: [],
  cities: [], tech: [], products: yours, incidents: [],
  peakLoad: 41, headroom: '', technicalDebt: 22,
};

createRoot(document.getElementById('root')!).render(
  <PlatformDesk brand={brand} state={state} onBack={() => undefined} initialTab="PRODUCTS"
    onPauseProduct={(product, paused) => ({ ok: true, message: `${product.name} ${paused ? 'pauses' : 'is back'} from next week.` })} />,
);
