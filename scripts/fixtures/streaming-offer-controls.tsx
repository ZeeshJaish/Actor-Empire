/* #118 The offer's three controls (#107) with every stepper on show, for checking their symmetry at phone widths:
   `?open=STORE` (default), `ADS` (the passes on, each with its price stepper) or `DEALS`. Taps change the fixture's own
   pricing; nothing is saved. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/fonts.css';
import type { OwnedStreamingPricingConfiguration } from '../../types';
import { normalizeOwnedStreamingPlatformState } from '../../services/ownedStreamingPlatform';
import { configureStreamingPricingOffer } from '../../services/streamingCommercialOffers';
import { applyStreamingStoreChoice, getStreamingPlanBuilderView, replaceWithStreamingStarterPlans } from '../../services/streamingPlanBuilder';
import { OfferControls, type OfferControlId } from '../../components/streaming-transplant/OfferControls';

const query = new URLSearchParams(window.location.search);
const base = normalizeOwnedStreamingPlatformState(undefined, 'offer-controls-fixture').serviceConfiguration.pricing;
const grown = getStreamingPlanBuilderView({ technologyLevels: { PLAYBACK_QUALITY: 60, RELIABILITY: 40, DELIVERY_CAPACITY: 40, PRODUCT_EXPERIENCE: 30, ADVERTISING_COMMERCE: 10 } });
let start: OwnedStreamingPricingConfiguration = replaceWithStreamingStarterPlans(configureStreamingPricingOffer(base, { kind: 'CORE', coreModel: 'SUBSCRIPTION' }), grown);
start = configureStreamingPricingOffer(start, { kind: 'TOGGLE', offer: 'ADS', enabled: true });
start = configureStreamingPricingOffer(start, { kind: 'TOGGLE', offer: 'STORE', enabled: true });
start = applyStreamingStoreChoice(start, 'picture', 'PICTURE_4K', grown);
start = configureStreamingPricingOffer(start, { kind: 'PASS', duration: 'ONE_HOUR', price: .99 });
start = configureStreamingPricingOffer(start, { kind: 'PASS', duration: 'DAY', price: 2.99 });

const App = () => {
  const [pricing, setPricing] = useState(start);
  const [open, setOpen] = useState<OfferControlId | null>((query.get('open') as OfferControlId) || 'STORE');
  return <OfferControls pricing={pricing} tree={grown.tree} onChange={setPricing} open={open} onOpen={setOpen} adEstimate={{ cpm: 12.5, fill: .8 }} />;
};
createRoot(document.getElementById('root')!).render(<App />);
