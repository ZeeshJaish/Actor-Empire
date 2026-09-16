import type {
  OwnedStreamingLaunchMarketingDraft,
  StreamingLaunchMarketingObjective,
  StreamingLaunchMarketingTimeline,
} from '../../../../types';
import type { StageProps } from './BuildWizard';
import { compactCount, money, moneyPrecise, pct as formatPct } from '../../finance/format';

const OBJECTIVES: Array<{ id: StreamingLaunchMarketingObjective; label: string; line: string }> = [
  { id: 'PLATFORM_INTRODUCTION', label: 'Introduce the platform', line: 'Build broad familiarity and trial.' },
  { id: 'CATALOGUE_SHOWCASE', label: 'Showcase the catalogue', line: 'Sell range, discovery and household value.' },
  { id: 'FLAGSHIP_ORIGINAL', label: 'Lead with an original', line: 'Concentrate attention around the opening title.' },
  { id: 'VALUE_PROPOSITION', label: 'Sell the value', line: 'Lead with plans, bundles and flexible access.' },
];

const TIMELINES: Array<{ id: StreamingLaunchMarketingTimeline; label: string; line: string }> = [
  { id: 'FRONT_LOADED', label: 'Front-loaded', line: 'Build early awareness; some fades before opening.' },
  { id: 'BALANCED', label: 'Balanced', line: 'Steady pressure and the most stable forecast.' },
  { id: 'LAST_WEEK_PUSH', label: 'Last-week push', line: 'A louder opening moment with more volatility.' },
];

const pct = (value: number): string => formatPct(value * 100, 1);

export function StageMoney({ data, plan, handlers }: StageProps) {
  const marketing = data.marketing;
  const draft = marketing?.draft;
  const forecast = marketing?.forecast;
  const setMarketing = (patch: Partial<OwnedStreamingLaunchMarketingDraft>) => handlers.onChangeMarketing?.(patch);
  const recommendations = marketing ? [
    { id: 'lean', label: 'Lean', amount: marketing.recommendations.lean, line: 'Credible presence in every market.' },
    { id: 'balanced', label: 'Balanced', amount: marketing.recommendations.balanced, line: 'Best cost-to-acquisition mix.' },
    { id: 'heavy', label: 'Heavy', amount: marketing.recommendations.heavy, line: 'Wider awareness, weaker marginal returns.' },
    { id: 'event', label: 'Event', amount: marketing.recommendations.event, line: 'A major simultaneous opening moment.' },
  ] : [];
  const billGroups = [
    { label: 'Settled', lines: plan.lines.filter(line => line.timing === 'SETTLED') },
    { label: 'Due at commission', lines: plan.lines.filter(line => !line.timing || line.timing === 'COMMISSION') },
    { label: 'Reserved', lines: plan.lines.filter(line => line.timing === 'OPENING_NIGHT') },
  ].filter(group => group.lines.length > 0);
  const currentAwareness = forecast
    ? Math.min(1, forecast.organicAwareness + forecast.likelyAwarenessLift)
    : 0;
  const baselineConcurrency = forecast?.baselineConcurrentStreams ?? 0;
  const concurrencyDelta = forecast
    ? Math.max(0, forecast.concurrentStreams.likely - baselineConcurrency)
    : 0;

  return (
    <>
      <section className={plan.shortfall > 0 ? 'bw-money bw-money--allocation is-short' : 'bw-money bw-money--allocation'}>
        <div className="bw-section-head">
          <div><p className="sf-eyebrow">Launch allocation</p><p className="bw-money-figure">{money(plan.total)}</p></div>
          <div className="bw-allocation-balance"><small>Projected treasury</small><b>{money(plan.headroom)}</b></div>
        </div>
        <div className="bw-allocation-grid">
          <span><small>Available now</small><b>{money(plan.available)}</b></span>
          <span><small>Launch already committed</small><b>{money(data.treasury.committedLaunch)}</b></span>
          <span><small>Infrastructure due</small><b>{money(plan.commissionNow || 0)}</b></span>
          <span><small>Marketing reserved</small><b>{money(plan.deferred || 0)}</b></span>
        </div>
        <p className={plan.shortfall > 0 ? 'sf-tone-bad' : 'sf-tone-good'}>{plan.shortfall > 0 ? `${money(plan.shortfall)} short. The value is preserved, but commissioning is blocked.` : `${money(plan.headroom)} remains after the complete plan.`}</p>
        {plan.shortfall > 0 && <button type="button" className="sf-btn sf-btn--primary" onClick={() => handlers.onOpenStudioFinance?.()}>Open Studio Finance</button>}
      </section>

      <section className="bw-money bw-marketing-ceiling">
        <div className="bw-section-head">
          <div><p className="sf-eyebrow">Marketing ceiling</p><h2>{draft?.budgetCeiling ? money(draft.budgetCeiling) : 'Organic launch'}</h2></div>
          <small>Authorization only · spent week by week</small>
        </div>
        {!marketing ? <p className="bw-note">Marketing recommendations become available when Day-One markets are confirmed.</p> : <>
          <div className="bw-budget-presets" role="group" aria-label="Recommended marketing ceilings">
            {recommendations.map(option => <button type="button" key={option.id} className={draft?.budgetCeiling === option.amount ? 'bw-budget-preset is-on' : 'bw-budget-preset'} onClick={() => setMarketing({ budgetCeiling: option.amount })}>
              <span><b>{option.label}</b><strong>{money(option.amount)}</strong></span><small>{option.line}</small>
            </button>)}
          </div>
          <label className="bw-custom-budget">
            <span><b>Custom allocation</b><small>Enter any planning value. Shortfalls stay visible.</small></span>
            <span className="bw-currency-input"><i aria-hidden="true">$</i><input type="number" min="0" step="100000" inputMode="numeric" aria-label="Custom marketing allocation" value={draft?.budgetCeiling || 0} onChange={event => setMarketing({ budgetCeiling: Number(event.currentTarget.value) })} /></span>
          </label>
        </>}
      </section>

      {marketing && draft && forecast && <section className="bw-money bw-campaign-plan">
        <p className="sf-eyebrow">Campaign plan</p>
        <div className="bw-choice-list" role="group" aria-label="Campaign objective">
          {OBJECTIVES.map(option => <button type="button" key={option.id} className={draft.objective === option.id ? 'bw-choice is-on' : 'bw-choice'} onClick={() => setMarketing({ objective: option.id })}><b>{option.label}</b><small>{option.line}</small></button>)}
        </div>
        <div className="bw-timeline" role="group" aria-label="Campaign timeline">
          {TIMELINES.map(option => <button type="button" key={option.id} className={draft.timeline === option.id ? 'is-on' : ''} onClick={() => setMarketing({ timeline: option.id })}><b>{option.label}</b><small>{option.line}</small></button>)}
        </div>
        <details className="bw-advanced">
          <summary>Channels and country allocation</summary>
          <div className="bw-channel-list">
            {marketing.channels.map(channel => <label key={channel.id} className={channel.available ? 'bw-channel' : 'bw-channel is-locked'}>
              <span><b>{channel.label}</b><small>{channel.available ? channel.line : channel.reason || 'Research required'}</small></span>
              <input type="number" min="0" max="100" step="5" disabled={!channel.available} aria-label={`${channel.label} weight`} value={Math.round((draft.channelAllocations[channel.id] || 0) * 100)} onChange={event => setMarketing({ channelAllocations: { ...draft.channelAllocations, [channel.id]: Number(event.currentTarget.value) / 100 } })} />
            </label>)}
          </div>
          <div className="bw-allocation-mode" role="group" aria-label="Country allocation mode">
            <button type="button" className={draft.allocationMode === 'AUTO' ? 'is-on' : ''} onClick={() => setMarketing({ allocationMode: 'AUTO' })}>Auto</button>
            <button type="button" className={draft.allocationMode === 'MANUAL' ? 'is-on' : ''} onClick={() => setMarketing({ allocationMode: 'MANUAL' })}>Manual</button>
          </div>
          <ul className="bw-country-allocation">
            {forecast.countryForecasts.map(country => <li key={country.countryId}>
              <span><b>{country.countryName}</b><small>{money(country.allocatedAmount)} · {pct(country.likelyAwarenessLift)} paid lift</small></span>
              {draft.allocationMode === 'MANUAL' && <input type="number" min="0" step="1" aria-label={`${country.countryName} allocation weight`} value={draft.countryWeights[country.countryId] || 0} onChange={event => setMarketing({ countryWeights: { ...draft.countryWeights, [country.countryId]: Number(event.currentTarget.value) } })} />}
            </li>)}
          </ul>
        </details>
      </section>}

      {forecast && <section className="bw-money bw-country-forecast" aria-live="polite">
        <div className="bw-section-head"><p className="sf-eyebrow">Country forecast</p><small>{forecast.confidenceScore}% · {forecast.confidence.toLowerCase()} confidence</small></div>
        <div className="bw-forecast-legend" aria-hidden="true"><span>Before campaign</span><i>→</i><span>With this plan</span></div>
        <div className="bw-forecast-strip">
          <span><small>Audience awareness</small><b><i>{pct(forecast.organicAwareness)}</i><em>→</em><strong>{pct(currentAwareness)}</strong></b><u>+{pct(forecast.likelyAwarenessLift)} paid lift</u></span>
          <span><small>New households</small><b><i>0</i><em>→</em><strong>{compactCount(forecast.acquiredAccounts.likely)}</strong></b><u>Forecast acquisitions</u></span>
          <span><small>Opening concurrency</small><b><i>{compactCount(baselineConcurrency)}</i><em>→</em><strong>{compactCount(forecast.concurrentStreams.likely)}</strong></b><u>+{compactCount(concurrencyDelta)} at opening</u></span>
          <span><small>Acquisition cost</small><b className="is-single"><strong>{forecast.customerAcquisitionCost === null ? 'Organic' : moneyPrecise(forecast.customerAcquisitionCost)}</strong></b><u>Per forecast household</u></span>
        </div>
        {forecast.efficiencyStatus === 'SATURATED' && <div className="bw-market-efficiency is-saturated" role="status"><span><b>Market saturated</b><small>{forecast.saturationPercent}% of useful paid reach is covered.</small></span><p>More budget is allowed, but it mostly increases acquisition cost instead of creating impossible audience growth.</p></div>}
        {forecast.efficiencyStatus === 'DIMINISHING' && <div className="bw-market-efficiency is-diminishing" role="status"><span><b>Diminishing returns</b><small>{forecast.saturationPercent}% of useful paid reach is covered.</small></span><p>Additional spend still helps, but each extra dollar reaches fewer new households.</p></div>}
        <p className="bw-note">Confidence combines market readiness, funded coverage, channel fit and campaign timing. Extra spend stops helping once useful reach is covered.</p>
        {forecast.warnings.length > 0 && <ul className="cr-risks">{forecast.warnings.map(warning => <li key={warning}><i aria-hidden="true">!</i>{warning.replaceAll('_', ' ').toLowerCase()}</li>)}</ul>}
      </section>}

      <section className="bw-money bw-launch-bill">
        <p className="sf-eyebrow">Complete launch bill</p>
        <div className="bw-bill-groups">{billGroups.map(group => <div key={group.label}><small>{group.label}</small>{group.lines.map(line => <p key={line.id}><span><b>{line.label}</b>{line.note && <small>{line.note}</small>}</span><strong>{money(line.amount)}</strong></p>)}</div>)}</div>
      </section>

      <section className="bw-pricing bw-commercial-recap">
        <header><p className="sf-eyebrow">Commercial setup</p><button type="button" className="sf-link" onClick={() => handlers.onEditPricing?.()}>Edit pricing</button></header>
        <div className="bw-commercial-row">
          <span><small>Revenue model</small><b>{data.pricing.model}</b></span>
          <span><small>Plans on sale</small><b>{data.pricing.plans} <small>plans</small></b></span>
          <span><small>Per household</small><b>{moneyPrecise(data.pricing.arpu)}</b></span>
          <span><small>Forecast reach</small><b>{compactCount(data.pricing.reach)}</b></span>
        </div>
        {data.pricing.plans === 0 && <p className="bw-blocker">Nothing is on sale. Commissioning is blocked until at least one plan exists.</p>}
        {data.pricing.problems.length > 0 && <ul className="cr-risks">{data.pricing.problems.map(problem => <li key={problem}><i aria-hidden="true">!</i>{problem}</li>)}</ul>}
      </section>
    </>
  );
}
