import React from 'react';
import type { BuildTotals } from '../../finance/build';
import { compactCount } from '../../finance/format';
import '../../styles/capacity-panel.css';

/** Aggregate capacity only. Local delivery health stays in the regional forecast. */
export function FacilityCapacityPanel({ totals, expectedPeak }: {
  totals: Pick<BuildTotals, 'capacity' | 'burst'>; expectedPeak: number;
}) {
  const regular = Math.max(0, totals.capacity);
  const burst = Math.max(0, totals.burst);
  const demand = Math.max(0, expectedPeak);
  const ratio = regular > 0 ? demand / regular : 0;
  const shortfall = Math.max(0, demand - regular - burst);
  const aboveRegular = Math.max(0, demand - regular);
  const spare = Math.max(0, regular - demand);
  const percent = ratio > 0 && ratio < .01 ? '<1%' : `${Math.round(ratio * 100)}%`;
  const tone = shortfall > 0 ? 'bad' : aboveRegular > 0 || ratio >= .8 ? 'warn' : 'good';
  const status = shortfall > 0 ? 'Capacity shortfall' : aboveRegular > 0 ? 'Burst needed'
    : regular === 0 ? 'No capacity planned' : ratio >= 1 ? 'At regular capacity'
    : ratio >= .8 ? 'Approaching the limit' : 'Comfortable';
  return <section className={`bw-capacity-panel is-${tone}`} aria-label="Capacity forecast">
    <header className="bw-capacity-heading"><h3>Capacity</h3><span>Likely night · forecast</span></header>
    <div className="bw-capacity-demand"><b>{compactCount(demand)}</b><span>viewers expected<br/>at peak</span></div>
    <p className="bw-capacity-status"><i aria-hidden="true"/>{status}{regular > 0 && <span> · {percent} of regular capacity</span>}</p>
    <div className="bw-capacity-legend" aria-hidden="true"><span><i/>Expected demand</span><span><i/>Spare regular capacity</span></div>
    <div className={`bw-capacity-meter${regular === 0 ? ' is-empty' : ''}`} role="img" aria-label={`${compactCount(demand)} expected viewers; ${compactCount(regular)} regular capacity; ${compactCount(spare)} spare regular capacity; ${compactCount(burst)} extra burst reserve${shortfall > 0 ? `; ${compactCount(shortfall)} shortfall` : ''}`}>
      <i style={{ width: `${Math.min(100, ratio * 100)}%` }}/>
    </div>
    <p className="bw-capacity-scale"><span>{regular > 0 ? `${percent} needed` : 'No regular capacity'}</span><span>{compactCount(regular)} regular</span></p>
    <dl className="bw-capacity-summary"><div><dt>Regular headroom</dt><dd>{compactCount(spare)}</dd></div><div><dt>Burst reserve</dt><dd>+{compactCount(burst)}</dd></div></dl>
    {aboveRegular > 0 && <p className="bw-capacity-overflow">{shortfall > 0 ? <>Shortfall <b>{compactCount(shortfall)}</b> even with burst.</> : <><b>{compactCount(aboveRegular)}</b> above regular capacity; burst reserve is needed.</>}</p>}
  </section>;
}
