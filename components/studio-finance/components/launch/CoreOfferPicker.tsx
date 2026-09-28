import { useState } from 'react';
import type { StreamingCommercialCoreModel } from '../../../../types';

type Core = Exclude<StreamingCommercialCoreModel, 'LEGACY'>;
const MODELS = [
  { id: 'SUBSCRIPTION', title: 'Subscription', tag: 'Recurring', note: 'Membership, your way.', detail: 'Build plans with their own price and benefits.', tone: 'essential' },
  { id: 'ADVERTISING', title: 'Free with ads', tag: 'Free entry', note: 'Open the doors.', detail: 'Viewers watch free. Eligible ads earn income.', tone: 'standard' },
  { id: 'STORE', title: 'Rent or buy', tag: 'Per title', note: 'Every title, a ticket.', detail: 'Free to browse. Pay to rent or own.', tone: 'premiere' },
] as const;

export function CoreOfferPicker({ core, selected, onChoose }: {
  core: StreamingCommercialCoreModel; selected: boolean; onChoose: (core: Core) => void;
}) {
  const [changing, setChanging] = useState(false);
  const [pending, setPending] = useState<Core | null>(null);
  const active = MODELS.find(model => model.id === core);
  return <section className={`pr-choice${selected ? ' is-selected' : ''}`} aria-label="Your offers">
    <header><p className="sf-eyebrow">Your offers</p>{selected && <button type="button" className="sf-link"
      aria-expanded={changing} onClick={() => { setChanging(!changing); setPending(null); }}>{changing ? 'Done' : 'Change model'}</button>}</header>
    {selected && !changing ? <p className="pr-choice-current"><span data-tone={active?.tone} />{active?.title || 'Existing offer'}<small>Core model</small></p> : <>
      {!selected && <div className="pr-choice-intro"><h2>Your service.<br /><span>Your rules.</span></h2><p>Choose how people watch.<br />Make it yours next.</p></div>}
      <div className="pr-choice-options" role="group" aria-label="Core service model">
        {MODELS.map((model, index) => <button key={model.id} type="button" data-tone={model.tone}
          aria-pressed={selected && core === model.id}
          aria-label={`${model.title}, ${selected && core === model.id ? 'core offer' : 'set as core offer'}`}
          onClick={() => {
            if (selected && core === model.id) { setChanging(false); return; }
            if (selected) setPending(model.id);
            else onChoose(model.id);
          }}>
          <span className="pr-choice-index">0{index + 1}<i aria-hidden="true">↗</i></span>
          <b>{model.title}</b><small>{model.tag}</small>
        </button>)}
      </div>
      {!selected && <div className="pr-choice-notes">{MODELS.map(model => <p key={model.id}><b>{model.note}</b><span>{model.detail}</span></p>)}</div>}
      {pending && <div className="pr-switch-confirm" role="status">
        <b>Switch to {MODELS.find(model => model.id === pending)?.title}?</b>
        <p>Other active offers turn off. Your plan definitions, prices and premium benefits are kept; enable extra offers again inside Edit.</p>
        <div><button type="button" className="sf-btn sf-btn--ghost" onClick={() => setPending(null)}>Keep current</button>
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => { onChoose(pending); setPending(null); setChanging(false); }}>Switch model</button></div>
      </div>}
    </>}
  </section>;
}
