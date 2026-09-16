import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StageMoney } from '../../components/studio-finance/components/build/StageMoney';
import {
  STREAMING_LAUNCH_MARKETING_CHANNELS,
  forecastStreamingLaunchMarketing,
  getStreamingLaunchMarketingRecommendations,
  type StreamingLaunchMarketingInput,
} from '../../services/streamingLaunchMarketing';
import type { OwnedStreamingLaunchMarketingDraft } from '../../types';
import '../../components/studio-finance/styles/tokens.css';
import '../../components/studio-finance/styles/studio-finance.css';
import '../../components/studio-finance/styles/launch.css';
import '../../components/studio-finance/styles/build.css';

const input: StreamingLaunchMarketingInput = {
  platformKey: 'money-browser-fixture', absoluteWeek: 900, buildWeeks: 8,
  availableTreasury: 120_000_000, protectedOperatingCash: 18_000_000,
  hasSellablePlan: true, hasFlagshipOriginal: true,
  pricingRevision: 4, catalogueRevision: 12, localizationRevision: 7, competitionRevision: 19,
  countries: [
    { countryId: 'US', countryName: 'United States', reachableHouseholds: 88_000_000, baseConcurrentStreams: 1_600_000, conversionHeadroom: .29, mediaCostIndex: 1.35, purchasingPowerIndex: .88, consumerConfidence: .64, internetAccess: .91, localizationCoverage: .9, catalogueCoverage: .8, competitionPressure: .88, priorAwareness: .05 },
    { countryId: 'CA', countryName: 'Canada', reachableHouseholds: 14_000_000, baseConcurrentStreams: 320_000, conversionHeadroom: .36, mediaCostIndex: 1, purchasingPowerIndex: .86, consumerConfidence: .66, internetAccess: .92, localizationCoverage: .72, catalogueCoverage: .8, competitionPressure: .68, priorAwareness: .04 },
    { countryId: 'MX', countryName: 'Mexico', reachableHouseholds: 31_000_000, baseConcurrentStreams: 510_000, conversionHeadroom: .44, mediaCostIndex: .82, purchasingPowerIndex: .48, consumerConfidence: .57, internetAccess: .7, localizationCoverage: .84, catalogueCoverage: .74, competitionPressure: .68, priorAwareness: .03 },
  ],
  channelAvailability: { TELCO_BUNDLES: { available: false, efficiency: 1, reason: 'Research Advertising Commerce.' } },
};

const initialDraft: OwnedStreamingLaunchMarketingDraft = {
  schemaVersion: 1, objective: 'PLATFORM_INTRODUCTION', timeline: 'BALANCED',
  budgetCeiling: getStreamingLaunchMarketingRecommendations(input).balanced,
  allocationMode: 'AUTO', countryWeights: {},
  channelAllocations: { SOCIAL_DIGITAL: .4, CREATORS: .25, TV_OUTDOOR: .15, DEVICE_STORES: .1, TELCO_BUNDLES: 0, PRESS_EVENTS: .1 },
  updatedAtAbsoluteWeek: 900, revision: 1,
};

function Fixture() {
  const [draft, setDraft] = useState(initialDraft);
  const marketing = useMemo(() => ({
    draft,
    recommendations: getStreamingLaunchMarketingRecommendations(input),
    forecast: forecastStreamingLaunchMarketing(input, draft),
    channels: STREAMING_LAUNCH_MARKETING_CHANNELS.map(channel => ({
      id: channel.id,
      label: channel.label,
      line: channel.line,
      available: input.channelAvailability?.[channel.id]?.available !== false,
      reason: input.channelAvailability?.[channel.id]?.reason,
    })),
  }), [draft]);
  const infrastructure = 32_000_000;
  const total = infrastructure + draft.budgetCeiling;
  const available = input.availableTreasury;
  const plan = {
    lines: [
      { id: 'infra', label: 'Network commissioning', amount: infrastructure, timing: 'COMMISSION' },
      { id: 'market', label: 'Market clearances', amount: 7_400_000, timing: 'SETTLED' },
      { id: 'campaign', label: 'Launch marketing ceiling', amount: draft.budgetCeiling, timing: 'OPENING_NIGHT' },
    ],
    total, commissionNow: infrastructure, deferred: draft.budgetCeiling,
    available, headroom: Math.max(0, available - total), shortfall: Math.max(0, total - available),
  };
  return <main className="sf lw bw" style={{ '--sf-brand': '#4b32ff', '--sf-brand-rgb': '75, 50, 255' } as React.CSSProperties}>
    <header className="sf-head"><div className="sf-head-titles"><h1>The Build</h1><p>Money · opening-night plan</p></div><span className="lw-count">3<i>/5</i></span></header>
    <div className="sf-scroll"><div className="lw-body">
      <StageMoney
        data={{
          treasury: { available, committedLaunch: 7_400_000 },
          pricing: { model: 'Subscriptions + flexible access', plans: 3, arpu: 13, reach: 2_430_000, problems: [] },
          campaigns: [], marketing,
        } as never}
        draft={{ campaignId: '' } as never}
        patch={() => undefined}
        totals={{} as never}
        plan={plan as never}
        services={{} as never}
        handlers={{ onChangeMarketing: patch => setDraft(current => ({ ...current, ...patch, revision: current.revision + 1 })) }}
        managed={false}
        teamProposal={null}
        setTeamProposal={() => undefined}
      />
      <div className="sf-tail" />
    </div></div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
