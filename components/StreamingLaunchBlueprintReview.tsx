import React from 'react';
import { ArrowLeft, Check, FileLock2 } from 'lucide-react';
import type { Player } from '../types';
import type { Brand } from './streaming-transplant/StreamingBrandVisuals';
import { getStreamingLaunchProgramView } from '../services/streamingLaunchProgram';

export default function StreamingLaunchBlueprintReview({ player, brand, onBack, onRefresh }: {
  player: Player; brand: Brand; onBack: () => void; onRefresh: () => void;
}) {
  const view = getStreamingLaunchProgramView(player);
  const platform = player.ownedStreamingPlatform;
  const service = platform.serviceConfiguration;
  const current = Boolean(view.milestones.find(item => item.id === 'LAUNCH_BLUEPRINT')?.complete);
  const checks = view.milestones.filter(item => item.trackId === 'DEFINE_LAUNCH' && item.id !== 'FUND_COMPANY' && item.id !== 'LAUNCH_BLUEPRINT');
  const canRefresh = checks.filter(item => item.id !== 'MARKET_CLEARANCES').every(item => item.complete);
  return <main className="sop" style={{ ['--sop-brand' as string]: `hsl(${brand.hue} ${brand.sat}% 58%)` }}>
    <header className="sop-header">
      <button type="button" className="sop-back" onClick={onBack} aria-label="Back to Streaming+"><ArrowLeft /></button>
      <span><small>{brand.name}</small><h1>LAUNCH BLUEPRINT</h1></span>
      <b className="sop-state">{current ? 'CURRENT' : 'REVIEW REQUIRED'}</b>
    </header>
    <section className="sop-controller"><FileLock2 /><div><b>Review the commissioned launch</b><p>Markets, service and infrastructure remain commissioned. Refresh this record after changing the opening slate or catalogue. This does not charge funds or restart construction.</p></div></section>
    <section className="sop-workstreams" aria-label="Current launch decisions"><ul>
      <li><span><b>Opening markets</b><small>{platform.marketOperations.filter(operation => operation.entryKind === 'OPENING' && operation.status !== 'EXITED').map(operation => operation.countryId).join(', ') || 'None selected'}</small></span></li>
      <li><span><b>Service and storefront</b><small>{service.soundIdentKey} · {service.identPackageId} · {service.storefrontLayoutId}</small></span></li>
      <li><span><b>Pricing</b><small>{service.pricing.plans.map(plan => `${plan.name}: $${plan.monthly.toFixed(2)}/month`).join(' · ')} · Annual discount {service.pricing.annualDiscount}%</small><small>Revenue models: {service.pricing.streams.join(', ')} · Rent ${service.pricing.rentals.rent.toFixed(2)} · Buy ${service.pricing.rentals.buy.toFixed(2)}</small></span></li>
      <li><span><b>Opening slate</b><small>{platform.launchSlate?.entries.map(entry => `${entry.title} — week ${entry.launchWeek}`).join(' · ') || 'No opening slate programmed'}</small></span></li>
    </ul></section>
    <section className="sop-workstreams"><ul>{checks.map(item => <li key={item.id}>
      <Check aria-hidden="true" /><span><b>{item.label}</b><small>{item.description}</small></span><em>{item.status.replaceAll('_', ' ')}</em>
    </li>)}</ul></section>
    <p role="status">{current ? 'The saved blueprint matches the current launch plan.' : 'The opening plan changed. Review these decisions and refresh the launch blueprint before Opening Night.'}</p>
    <footer className="sop-actions"><button type="button" className="sop-plan" onClick={onBack}>Back to Streaming+</button>
      <button type="button" className="sop-open" disabled={current || !canRefresh} onClick={onRefresh}>{current ? 'Blueprint current' : 'Refresh launch blueprint'}</button>
    </footer>
  </main>;
}
