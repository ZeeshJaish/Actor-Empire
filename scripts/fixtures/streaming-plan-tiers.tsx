/* #105 The plan table as tier columns, for checking it at phone widths: a new service (the free tier, the starter plans,
   rows still locked in Tech) editable, and a service with more tech (Rent or buy on) read-only with who is on each plan.
   Taps change the fixture's own state; "Unlock ›" names the step it would open. Nothing is saved. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { OwnedStreamingPricingConfiguration, StreamingTechId } from '../../types';
import { normalizeOwnedStreamingPlatformState } from '../../services/ownedStreamingPlatform';
import { configureStreamingPricingOffer } from '../../services/streamingCommercialOffers';
import { applyStreamingPlanBuilderChoice, getStreamingPlanBuilderView, replaceWithStreamingStarterPlans } from '../../services/streamingPlanBuilder';
import { STREAMING_FREE_TIER_ID } from '../../services/streamingPlanOffer';
import { PlanBuilder } from '../../components/streaming-transplant/PlanBuilder';

const base = normalizeOwnedStreamingPlatformState(undefined, 'plan-tiers-fixture').serviceConfiguration.pricing;
const subscription = (pricing: OwnedStreamingPricingConfiguration) => configureStreamingPricingOffer(pricing, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });

const fresh = getStreamingPlanBuilderView(null);
const newService = configureStreamingPricingOffer(replaceWithStreamingStarterPlans(subscription(base), fresh), { kind: 'TOGGLE', offer: 'ADS', enabled: true });

const grown = getStreamingPlanBuilderView({ technologyLevels: { PLAYBACK_QUALITY: 60, RELIABILITY: 40, DELIVERY_CAPACITY: 40, PRODUCT_EXPERIENCE: 30, ADVERTISING_COMMERCE: 10 } });
let bigger = configureStreamingPricingOffer(replaceWithStreamingStarterPlans(subscription(base), grown), { kind: 'TOGGLE', offer: 'STORE', enabled: true });
const top = bigger.plans[bigger.plans.length - 1];
if (top) bigger = applyStreamingPlanBuilderChoice(applyStreamingPlanBuilderChoice(bigger, top.id, 'picture', 'PICTURE_4K', grown), top.id, 'screens', '4', grown);
// #106: the cheapest plan on phones and tablets only, with two screens
const cheapest = bigger.plans[0];
if (cheapest) bigger = applyStreamingPlanBuilderChoice(applyStreamingPlanBuilderChoice(bigger, cheapest.id, 'devices', 'mobile', grown), cheapest.id, 'screens', '2', grown);

const Editable: React.FC = () => {
  const [pricing, setPricing] = useState(newService);
  const [went, setWent] = useState('');
  return <>
    <PlanBuilder pricing={pricing} builder={fresh} onChange={setPricing} suggest colours={['emerald', 'ocean', 'rose']}
      onGoToTech={(techId: StreamingTechId) => setWent(`Unlock › would open Tech at ${techId}`)}
      footer={{ label: 'Forecast', cells: { [STREAMING_FREE_TIER_ID]: { value: '14.6M' }, ...Object.fromEntries(pricing.plans.map((plan, index) => [plan.id, { value: ['3.9M', '1.7M', '0.6M'][index] ?? '0.2M' }])) } }} />
    <div id="went">{went}</div>
  </>;
};

createRoot(document.getElementById('root')!).render(<>
  <h1>Define the Launch · a new service</h1><Editable />
  <h1>Offer tab · read-only, more tech, Rent or buy on</h1>
  <PlanBuilder pricing={bigger} builder={grown} onGoToTech={() => undefined}
    footer={{ label: 'On it', cells: Object.fromEntries(bigger.plans.map((plan, index) => [plan.id, { value: ['12.1M', '8.4M', '3.0M'][index] ?? '1M', detail: ['51%', '36%', '13%'][index] }])) }} />
</>);
