import React, { useEffect, useRef, useState } from 'react';
import AccessibleDialog from '../../../AccessibleDialog';
import type { BuildData, BuildDraft } from '../../finance/build';
import { NetworkSuggestionResultView } from './NetworkSuggestionResultView';
import { budgetAmountAt, budgetPositionFor } from '../../finance/networkBudget';
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
const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compactUsdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const usd = (value: number) => usdFormatter.format(value);
const compactUsd = (value: number) => compactUsdFormatter.format(value);

function BudgetControl({ id, label, hint, text, initialCeiling, weekly, onChange }: {
  id: string; label: string; hint: string; text: string; initialCeiling: number;
  weekly?: boolean; onChange: (text: string) => void;
}) {
  // The range follows treasury. Editing never runs a quote, forecast or search.
  const ceiling = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(initialCeiling)));
  const amount = parseNetworkLimit(text);
  const position = budgetPositionFor(amount ?? 0, ceiling);
  const changeText = (value: string) => {
    onChange(value);
  };
  return <div className="bw-budget">
    <div className="bw-budget-label"><label htmlFor={id}>{label}</label><span>{amount === null ? '—' : compactUsd(amount)}{weekly && ' / wk'}</span></div>
    <p id={`${id}-hint`}>{hint}</p>
    <div className="bw-budget-amount"><span aria-hidden="true">$</span><input id={id} type="text" inputMode="numeric" autoComplete="off" value={text} onChange={event => changeText(event.target.value)} aria-invalid={amount === null} aria-describedby={`${id}-hint ${id}-summary`}/><span>USD</span></div>
    <input className="bw-budget-slider" type="range" min="0" max="1000" step="1" value={position} aria-label={`${label} slider`} aria-valuetext={amount === null ? 'Choose a valid amount' : `${usd(amount)}${weekly ? ' per week' : ''}`} onChange={event => onChange(String(budgetAmountAt(Number(event.target.value), ceiling)))} style={{ '--budget-fill': `${position / 10}%` } as React.CSSProperties}/>
    <div className="bw-budget-range" aria-hidden="true"><span>$0</span><span>{compactUsd(ceiling)}{weekly && ' / wk'}</span></div>
    {amount === null && <p className="bw-budget-error" id={`${id}-summary`}>Use a whole-dollar amount, such as 1000000.</p>}
    {amount !== null && <span className="bw-budget-sr" id={`${id}-summary`}>{usd(amount)}{weekly && ' per week'}</span>}
  </div>;
}

/** The editor stays local; only Generate searches and only Apply patches Build. */
export function NetworkSuggestionSheet({ data, draft, onApply, onClose }: Props) {
  const [mode, setMode] = useState<NetworkSuggestionMode>('BALANCED');
  const [upfrontText, setUpfrontText] = useState('0');
  const [replaceUnbuilt, setReplaceUnbuilt] = useState(false);
  const [proposal, setProposal] = useState<NetworkSuggestionProposal | null>(null);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ evaluated: 0, maximum: 0 });
  const job = useRef<AbortController | null>(null);
  const current = useRef({ data, draft });
  current.current = { data, draft };
  const upfrontLimit = parseNetworkLimit(upfrontText);
  const overBudget = upfrontLimit !== null && upfrontLimit > data.treasury.available;
  const request: NetworkSuggestionRequest | null = upfrontLimit === null
    ? null : { mode, upfrontLimit, replaceUnbuilt };
  const invalidate = () => {
    job.current?.abort(); job.current = null; setRunning(false); setProposal(null); setMessage('');
  };
  useEffect(() => () => { job.current?.abort(); }, []);
  const cancel = () => { invalidate(); setMessage('Generation cancelled.'); };
  const close = () => { job.current?.abort(); onClose(); };
  const generate = async () => {
    if (!request || overBudget) { setMessage('Choose a setup budget within your available treasury.'); return; }
    invalidate();
    const controller = new AbortController(); job.current = controller;
    const source = { data, draft };
    setRunning(true); setProgress({ evaluated: 0, maximum: 0 });
    const result = await createNetworkSuggestion(data, draft, request, {
      signal: controller.signal,
      onProgress: value => { if (!controller.signal.aborted && (value.evaluated % 6 === 0 || value.evaluated === value.maximum)) setProgress(value); },
    });
    if (job.current !== controller || controller.signal.aborted) return;
    job.current = null; setRunning(false);
    if (result.status === 'READY') {
      if (current.current.data !== source.data || current.current.draft !== source.draft) {
        const checked = validateNetworkSuggestion(current.current.data, current.current.draft, request, result.proposal);
        if (checked.ok === false) { setMessage(checked.message); return; }
      }
      setProposal(result.proposal);
    }
    else setMessage(result.status === 'INVALID' ? result.message : 'Generation cancelled.');
  };
  const apply = () => {
    if (!proposal || !request) return;
    const result = validateNetworkSuggestion(current.current.data, current.current.draft, request, proposal);
    if (result.ok === false) { setMessage(result.message); setProposal(null); return; }
    onApply(result.patch); onClose();
  };
  return <div className="bw-suggest-backdrop">
    <AccessibleDialog className="bw-suggest-sheet" aria-labelledby="bw-suggest-title" onEscape={close} initialFocusSelector="#bw-suggest-close">
      <header><div><p>THE BUILD · NETWORK</p><h2 id="bw-suggest-title">{proposal ? 'Your network plan' : 'Suggest network'}</h2></div><button id="bw-suggest-close" type="button" onClick={close} aria-label="Close network suggestions"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      {!proposal && <>
      <p className="bw-suggest-intro">Choose your budget. We'll plan a network for your opening markets, ready for you to review.</p>
      <fieldset className="bw-suggest-modes"><legend>Network target</legend>{(['BUDGET','BALANCED','PREMIUM'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { invalidate(); setMode(value); }}>{value[0] + value.slice(1).toLowerCase()}<small>{NETWORK_SUGGESTION_TARGETS[value]}× likely demand</small></button>)}</fieldset>
      <p className="bw-suggest-hint">{mode === 'BUDGET' ? 'Compare practical cost with enough capacity for likely demand.' : mode === 'BALANCED' ? 'Aim for geographic coverage and 20% capacity headroom.' : 'Aim for geographic coverage, 50% capacity headroom and more site diversity.'}</p>
      <div className="bw-suggest-budget-head"><h3>Your budget</h3><span>{compactUsd(data.treasury.available)} in treasury</span></div>
      <div className="bw-suggest-limits">
        <BudgetControl id="bw-suggest-upfront" label="Setup budget" hint="Spend once to build, including deposits and reserves." text={upfrontText} initialCeiling={Math.max(0, data.treasury.available)} onChange={value => { invalidate(); setUpfrontText(value); }}/>
      </div>
      <p className="bw-suggest-hint">Weekly running cost is calculated with your plan. Unpaid launch costs still need to fit your treasury.</p>
      <fieldset className="bw-suggest-choice"><legend>How should we plan?</legend><label className={!replaceUnbuilt ? 'is-selected' : ''}><input type="radio" name="network-suggestion-replace" checked={!replaceUnbuilt} onChange={() => { invalidate(); setReplaceUnbuilt(false); }}/><span><b>Keep my current setup</b><small>Keep everything you've selected and suggest additions where needed.</small></span></label><label className={replaceUnbuilt ? 'is-selected' : ''}><input type="radio" name="network-suggestion-replace" checked={replaceUnbuilt} onChange={() => { invalidate(); setReplaceUnbuilt(true); }}/><span><b>Plan from scratch</b><small>Rework selections that haven't been built yet. Servers already built or owned stay in place.</small></span></label></fieldset>
      <button type="button" className="bw-suggest-primary" disabled={!request || overBudget || running} onClick={generate}>Generate suggestion</button>
      {overBudget && <p className="bw-budget-error">This budget exceeds your current treasury.</p>}
      </>}
      {message && <p role="status" className="bw-suggest-message">{message}</p>}
      {proposal && <NetworkSuggestionResultView data={data} proposal={proposal} onEdit={invalidate} onApply={apply} disabled={running || !request} />}
      {running && <div className="bw-suggest-working-backdrop">
        <AccessibleDialog className="bw-suggest-working" aria-labelledby="bw-working-title" onEscape={cancel} initialFocusSelector="#bw-working-cancel">
          <div className="bw-network-animation" aria-hidden="true"><i/><i/><i/><span/></div>
          <h3 id="bw-working-title">Comparing networks</h3>
          <p>Matching sites and servers to your markets.</p>
          <progress max={progress.maximum || 1} value={progress.evaluated} aria-label="Network comparison progress"/>
          <p role="status">{progress.maximum ? `${Math.round(progress.evaluated / progress.maximum * 100)}% · ${progress.evaluated} of ${progress.maximum} options` : 'Preparing your network…'}</p>
          <button id="bw-working-cancel" type="button" onClick={cancel}>Cancel generation</button>
        </AccessibleDialog>
      </div>}
    </AccessibleDialog>
  </div>;
}
