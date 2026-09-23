import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StepPricing } from '../../components/studio-finance/components/launch/StepPricing';
import type { Country, LaunchData, LaunchDraft, PricingSettings } from '../../components/studio-finance/finance/launch';
import '../../components/studio-finance/styles/tokens.css';
import '../../components/studio-finance/styles/studio-finance.css';
import '../../components/studio-finance/styles/launch.css';
import '../../components/studio-finance/styles/kit.css';

const pricing: PricingSettings = {
  streams: ['subs'],
  plans: [
    { id: 'BASIC', name: 'Essential', monthly: 7.99, featureIds: ['hd'], ads: false },
    { id: 'PREMIUM', name: 'Standard', monthly: 12.99, featureIds: ['hd', 'streams2', 'downloads'], ads: false },
    { id: 'FAMILY', name: 'Premiere', monthly: 17.99, featureIds: ['uhd', 'streams4', 'downloads', 'noads'], ads: false },
  ],
  annualDiscount: 0,
  introOffer: 50,
  introOfferPlanId: 'FAMILY',
  ads: { minutesPerHour: 4, cpm: 22 },
  rentals: { rent: 5.99, buy: 19.99, windowWeeks: 6 },
  premium: { price: 29.99 },
  daypass: { price: 7.99 },
  sponsor: { perTitle: 4_000_000, titles: 0 },
  metered: { perHour: 1 },
  patron: { monthly: 10 },
};

const country = {
  id: 'US', addressableHouseholds: 100_000,
  pricingCohorts: [{ households: 100_000, monthlyStreamingBudgetPerHousehold: 9,
    priceSensitivityIndex: 70, entertainmentAppetiteIndex: 65, piracyTendencyIndex: 20 }],
} as Country;

function Fixture() {
  const [draft, setDraft] = useState<LaunchDraft>({ pricing, selectedCountryIds: ['US'] });
  const data = {
    pricing, market: { rivalAveragePrice: 12, reachRate: .3 }, capabilityLocks: {},
  } as unknown as LaunchData;
  return (
    <div className="sf lw s4-fixture">
      <div className="lw-body">
        <StepPricing
          data={data} draft={draft} patch={(next) => setDraft(current => ({ ...current, ...next }))}
          chosen={[country]}
          treasury={{ available: 1_000_000_000, founderContributed: 1_000_000_000, planned: 0, committed: 0, paid: 0 }}
          free={1_000_000_000} gap={0} handlers={{}}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
