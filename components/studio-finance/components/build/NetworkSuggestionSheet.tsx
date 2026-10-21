import React, { useEffect, useRef, useState } from 'react';
import AccessibleDialog from '../../../AccessibleDialog';
import type { BuildData, BuildDraft } from '../../finance/build';
import { CLOUD_PROVIDERS, tiersOf } from '../../finance/build';
import {
  createNetworkSuggestion, NETWORK_SUGGESTION_TARGETS, parseNetworkLimit, validateNetworkSuggestion,
  type NetworkSuggestionMode, type NetworkSuggestionProposal, type NetworkSuggestionRequest,
} from '../../finance/networkSuggestions';

interface Props {
  data: BuildData;
  draft: BuildDraft;
  onApply: (patch: Pick<BuildDraft, 'facilities' | 'rehearsal'>) => void;
  onClose: () => void;
}
const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const delta = (value: number) => `${value >= 0 ? '+' : '−'}${usd(Math.abs(value))}`;

/** The editor stays local; only Generate searches and only Apply patches Build. */
export function NetworkSuggestionSheet({ data, draft, onApply, onClose }: Props) {
  const [mode, setMode] = useState<NetworkSuggestionMode>('BALANCED');
  const [upfrontText, setUpfrontText] = useState('');
  const [weeklyText, setWeeklyText] = useState('');
  const [replaceUnbuilt, setReplaceUnbuilt] = useState(false);
  const [proposal, setProposal] = useState<NetworkSuggestionProposal | null>(null);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ evaluated: 0, maximum: 0 });
  const job = useRef<AbortController | null>(null);
  const current = useRef({ data, draft });
  current.current = { data, draft };
  const generatedFrom = useRef<{ data: BuildData; draft: BuildDraft } | null>(null);
  const upfrontLimit = parseNetworkLimit(upfrontText);
  const weeklyLimit = parseNetworkLimit(weeklyText);
  const request: NetworkSuggestionRequest | null = upfrontLimit === null || weeklyLimit === null
    ? null : { mode, upfrontLimit, weeklyLimit, replaceUnbuilt };
  const stale = !!proposal && (generatedFrom.current?.data !== data || generatedFrom.current?.draft !== draft);
  const invalidate = () => {
    job.current?.abort(); job.current = null; setRunning(false); setProposal(null); setMessage('');
  };
  useEffect(() => () => { job.current?.abort(); }, []);
  useEffect(() => {
    if (job.current) { job.current.abort(); job.current = null; setRunning(false); setMessage('Build inputs changed. Generate again.'); }
  }, [data, draft]);
  const cancel = () => { invalidate(); setMessage('Generation cancelled.'); };
  const close = () => { job.current?.abort(); onClose(); };
  const generate = async () => {
    if (!request) { setMessage('Enter both limits as exact whole USD amounts.'); return; }
    invalidate();
    const controller = new AbortController(); job.current = controller;
    const source = { data, draft }; generatedFrom.current = source;
    setRunning(true); setProgress({ evaluated: 0, maximum: 0 });
    const result = await createNetworkSuggestion(data, draft, request, {
      signal: controller.signal,
      onProgress: value => { if (!controller.signal.aborted) setProgress(value); },
    });
    if (job.current !== controller || controller.signal.aborted) return;
    job.current = null; setRunning(false);
    if (current.current.data !== source.data || current.current.draft !== source.draft) {
      setMessage('Build inputs changed. Generate again.'); return;
    }
    if (result.status === 'READY') setProposal(result.proposal);
    else setMessage(result.status === 'INVALID' ? result.message : 'Generation cancelled.');
  };
  const apply = () => {
    if (!proposal || !request || stale) return;
    const result = validateNetworkSuggestion(current.current.data, current.current.draft, request, proposal);
    if (!result.ok) { setMessage(result.message); setProposal(null); return; }
    onApply(result.patch); onClose();
  };
  return <div className="bw-suggest-backdrop">
    <AccessibleDialog className="bw-suggest-sheet" aria-labelledby="bw-suggest-title" onEscape={close} initialFocusSelector="#bw-suggest-close">
      <header><div><p>BUILD NETWORK</p><h2 id="bw-suggest-title">Suggest network</h2></div><button id="bw-suggest-close" type="button" onClick={close} aria-label="Close network suggestions">×</button></header>
      <p>Plan for your selected opening markets within limits you choose. Preview first; applying changes only this drawing.</p>
      <fieldset className="bw-suggest-modes"><legend>Network target</legend>{(['BUDGET','BALANCED','PREMIUM'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { invalidate(); setMode(value); }}>{value[0] + value.slice(1).toLowerCase()}<small>{NETWORK_SUGGESTION_TARGETS[value]}× likely demand</small></button>)}</fieldset>
      <p className="bw-suggest-hint">{mode === 'BUDGET' ? 'Compare practical cost with enough capacity for likely demand.' : mode === 'BALANCED' ? 'Aim for geographic coverage and 20% capacity headroom.' : 'Aim for geographic coverage, 50% capacity headroom and more site diversity.'}</p>
      <div className="bw-suggest-limits">
        <label htmlFor="bw-suggest-upfront">Upfront limit · USD<input id="bw-suggest-upfront" type="text" inputMode="numeric" autoComplete="off" value={upfrontText} onChange={event => { invalidate(); setUpfrontText(event.target.value); }} aria-describedby="bw-suggest-upfront-summary"/><small id="bw-suggest-upfront-summary">{upfrontLimit === null ? 'Enter whole dollars' : usd(upfrontLimit)}</small></label>
        <label htmlFor="bw-suggest-weekly">Weekly limit · USD<input id="bw-suggest-weekly" type="text" inputMode="numeric" autoComplete="off" value={weeklyText} onChange={event => { invalidate(); setWeeklyText(event.target.value); }} aria-describedby="bw-suggest-weekly-summary"/><small id="bw-suggest-weekly-summary">{weeklyLimit === null ? 'Enter whole dollars' : `${usd(weeklyLimit)} / week`}</small></label>
      </div>
      <p className="bw-suggest-hint">Upfront includes infrastructure deposits and reserves in the current quote. Weekly covers the whole network. Deferred launch commitments still reserve your available funds.</p>
      <fieldset className="bw-suggest-choice"><legend>Current plan</legend><label><input type="radio" name="network-suggestion-replace" checked={!replaceUnbuilt} onChange={() => { invalidate(); setReplaceUnbuilt(false); }}/>Fill remaining gaps</label><label><input type="radio" name="network-suggestion-replace" checked={replaceUnbuilt} onChange={() => { invalidate(); setReplaceUnbuilt(true); }}/>Replace unbuilt plan</label><small>Built facilities and existing estate are always preserved.</small></fieldset>
      {running ? <div className="bw-suggest-progress" role="status"><span>Comparing networks · {progress.evaluated} / {progress.maximum || '…'}</span><button type="button" onClick={cancel}>Cancel generation</button></div> : <button type="button" className="bw-suggest-primary" disabled={!request} onClick={generate}>Generate suggestion</button>}
      {message && <p role="status" className="bw-suggest-message">{message}</p>}
      {stale && <p role="status" className="bw-suggest-message">Build inputs changed. Generate again before applying.</p>}
      {proposal && <section className="bw-suggest-result" aria-label="Network suggestion preview">
        <h3>{proposal.complete ? 'Network suggestion' : 'Partial suggestion'}</h3>
        <dl><div><dt>Upfront allocation</dt><dd>{usd(proposal.upfront)}<small>{delta(proposal.upfrontDelta)} vs current draft</small></dd></div><div><dt>Full weekly operation</dt><dd>{usd(proposal.weekly)}<small>{delta(proposal.weeklyDelta)} / week</small></dd></div><div><dt>Build time</dt><dd>{proposal.totals.weeks} weeks</dd></div><div><dt>Capacity target</dt><dd>{proposal.targetCapacity.toLocaleString('en-US')}<small>{proposal.targetMultiplier}× likely demand · {(proposal.totals.capacity + (data.canonical ? 0 : proposal.totals.burst)).toLocaleString('en-US')} steady capacity</small></dd></div></dl>
        <p>Full service coverage: <b>{proposal.fullCoverage ? 'Every selected market' : 'Gaps remain'}</b><br/>Launch geographic threshold: <b>{proposal.launchThresholdMet ? 'Met in every market' : 'Not met in every market'}</b></p>
        <ul className="bw-suggest-countries">{proposal.services.map(service => <li key={service.marketId}><b>{service.name}</b><span>{service.coverageAvailable === false ? 'Unavailable' : `${(service.coveredShare * 100).toFixed(1)}% service · ${((service.geographicCoveredShare ?? service.coveredShare) * 100).toFixed(1)}% geographic`}</span></li>)}</ul>
        <details><summary>Sites, servers and providers · {proposal.draft.facilities.length} rooms</summary><ul className="bw-suggest-sites">{proposal.draft.facilities.map(room => <li key={room.id}><b>{data.cities.find(city => city.id === room.cityId)?.name ?? room.cityId}</b><span>{room.tenure === 'CLOUD' ? `${CLOUD_PROVIDERS[room.provider ?? 'ATLAS'].name} · ${room.groups.reduce((sum,g)=>sum+g.racks,0)} cloud compute` : Object.entries(tiersOf(room)).filter(([,count])=>count>0).map(([tier,count])=>`${count} ${tier.toLowerCase()}`).join(' · ')}</span></li>)}</ul></details>
        <ul className="bw-suggest-warnings">{proposal.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
        <button type="button" className="bw-suggest-primary" disabled={stale || running || !request} onClick={apply}>Apply to draft</button><p className="bw-suggest-hint">No money is charged. Review Money and run Test before commissioning.</p>
      </section>}
    </AccessibleDialog>
  </div>;
}
