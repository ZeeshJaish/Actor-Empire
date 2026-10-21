import React, { useEffect, useRef, useState } from 'react';
import type { BuildData } from '../../finance/build';
import { CLOUD_PROVIDERS, countryServiceCoverageValid, tiersOf } from '../../finance/build';
import type { NetworkSuggestionProposal } from '../../finance/networkSuggestions';
import { STREAMING_SERVED_COVERAGE_SHARE } from '../../../../services/streamingNetworkCoverage';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });
const full = (share: number) => share >= .999999;
const percent = (share: number) => `${full(share) ? 100 : Math.min(99.9, Math.round(share * 1000) / 10)}%`;

export function NetworkSuggestionResultView({ data, proposal, onEdit, onApply, disabled }: {
  data: BuildData; proposal: NetworkSuggestionProposal; onEdit: () => void; onApply: () => void; disabled: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const view = useRef<HTMLElement>(null);
  useEffect(() => {
    view.current?.closest('.bw-suggest-sheet')?.scrollTo({ top: 0 });
    view.current?.focus({ preventScroll: true });
  }, []);
  const regionByCode = new Map(data.countries.map(country => [country.code, country.regionId]));
  const served = proposal.services.filter(service => countryServiceCoverageValid(service) && full(service.coveredShare)).length;
  const footprintReady = proposal.services.filter(service => countryServiceCoverageValid(service) && (service.geographicCoveredShare ?? service.coveredShare) >= STREAMING_SERVED_COVERAGE_SHARE).length;
  const demand = proposal.services.reduce((sum, service) => sum + service.peak, 0);
  const covered = proposal.services.reduce((sum, service) => sum + (countryServiceCoverageValid(service) ? service.peak * service.coveredShare : 0), 0);
  const coverage = demand ? Math.min(1, covered / demand) : 0;
  const regions = data.regions.map(region => ({ ...region, services: proposal.services.filter(service => regionByCode.get(service.code) === region.id) })).filter(region => region.services.length);
  return <section ref={view} tabIndex={-1} className="bw-suggest-result bw-plan-result" aria-label="Network suggestion preview">
    <div className="bw-plan-hero">
      <div className="bw-plan-coverage"><div className="bw-plan-ring" role="img" aria-label={`${percent(coverage)} of expected viewers served`} style={{ '--coverage': percent(coverage) } as React.CSSProperties}><strong>{percent(coverage).slice(0, -1)}<small>%</small></strong></div><span className="bw-plan-hero-label">Viewers served</span></div>
      <div className="bw-plan-markets"><div className="bw-plan-market-summary"><p>{proposal.complete ? 'READY TO REVIEW' : 'GAPS REMAIN'}</p><h3>{served} <span>/ {proposal.services.length}</span></h3></div><span className="bw-plan-hero-label">Markets fully served</span></div>
    </div>
    <div className="bw-plan-costs">
      <div><span>Setup cost</span><strong>{currency.format(proposal.upfront)}<small>one-time</small></strong></div>
      <div><span>Running cost</span><strong>{currency.format(proposal.weekly)}<small>per week</small></strong></div>
      <div><span>Build time</span><strong>{proposal.totals.weeks}<small>weeks</small></strong></div>
    </div>
    <div className="bw-plan-readiness"><span data-ready={proposal.launchThresholdMet}>{proposal.launchThresholdMet ? '✓' : '○'} Launch footprint · {footprintReady}/{proposal.services.length} markets</span><span data-ready={proposal.capacityTargetMet}>{proposal.capacityTargetMet ? '✓' : '○'} Regional capacity · {proposal.capacityTargetMet ? 'Target met' : 'More needed'}</span></div>
    {!proposal.complete && <p className="bw-suggest-hint">Expand a region to inspect gaps. Extra reach, local capacity or another site mix may be needed.</p>}
    <div className="bw-plan-regions" aria-label="Coverage by region">
      {regions.map(region => {
        const total = region.services.reduce((sum, service) => sum + service.peak, 0);
        const share = total ? region.services.reduce((sum, service) => sum + (countryServiceCoverageValid(service) ? service.peak * service.coveredShare : 0), 0) / total : 0;
        const ready = region.services.filter(service => countryServiceCoverageValid(service) && full(service.coveredShare)).length;
        return <div key={region.id} className={expanded === region.id ? 'bw-plan-region is-expanded' : 'bw-plan-region'}>
          <button type="button" aria-expanded={expanded === region.id} aria-controls={expanded === region.id ? `bw-region-${region.id}` : undefined} onClick={() => setExpanded(expanded === region.id ? null : region.id)}><span><b>{region.name}</b><small>{ready}/{region.services.length} fully served</small></span><strong>{percent(share)} <i aria-hidden="true">{expanded === region.id ? '−' : '+'}</i></strong><span className="bw-plan-track"><i style={{ width: percent(share) }}/></span></button>
          {expanded === region.id && <ul id={`bw-region-${region.id}`} className="bw-plan-market-list" aria-label={`${region.name} markets`}>{[...region.services].sort((a,b) => a.coveredShare - b.coveredShare).map(service => <li key={service.marketId}><span>{service.name}</span><b>{service.coverageAvailable === false ? 'Unavailable' : percent(service.coveredShare)}</b></li>)}</ul>}
        </div>;
      })}
    </div>
    <details className="bw-plan-details"><summary>Sites and cost notes · {proposal.draft.facilities.length} sites</summary><ul className="bw-suggest-sites">{proposal.draft.facilities.map(room => <li key={room.id}><b>{data.cities.find(city => city.id === room.cityId)?.name ?? room.cityId}</b><span>{room.tenure === 'CLOUD' ? `${CLOUD_PROVIDERS[room.provider ?? 'ATLAS'].name} · ${room.groups.reduce((sum,g)=>sum+g.racks,0)} compute` : Object.entries(tiersOf(room)).filter(([,count])=>count>0).map(([tier,count])=>`${count} ${tier.toLowerCase()}`).join(' · ')}</span></li>)}</ul><ul className="bw-suggest-warnings">{proposal.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></details>
    <div className="bw-plan-actions"><button type="button" className="bw-suggest-primary" disabled={disabled} onClick={onApply}>Use this plan</button><button type="button" className="bw-plan-edit" onClick={() => { view.current?.closest('.bw-suggest-sheet')?.scrollTo({ top: 0 }); onEdit(); }}>Edit budget & target</button><p>Next: Money → Test → Commission. Nothing is purchased here.</p></div>
  </section>;
}
