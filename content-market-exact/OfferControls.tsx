import React, { useId, useState } from 'react';
import { Eye } from 'lucide-react';
import { parseOfferUsd } from './model';
import css from './ContentMarket.module.css';

export const OFFER_CLAUSE_HELP = {
  'Sequel rights': 'Includes only the sequel rights explicitly granted in this agreement. It does not fund or start a new production.',
  'Sublicensing': 'Permits onward licensing within the inherited grant. You cannot resell countries, viewing modes or weeks the seller does not control.',
  'Renewal option': 'Lets you negotiate a new term when this licence ends. Renewal is not free or automatic, and still needs an available grant and a new agreement.',
};

export function OfferClauseHelp({ label }: { label: keyof typeof OFFER_CLAUSE_HELP }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <span className={css.mkclausehelp}>
    <button type="button" aria-label={`About ${label}`} aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); }
      }}><Eye size={15} aria-hidden="true" /></button>
    {open && <span id={id} className={css.mkhelptext} role="note">{OFFER_CLAUSE_HELP[label]}</span>}
  </span>;
}

export function OfferUsdInput({ draft, onChange, maximum, label = 'Upfront offer', minimum = 0, increment = 1, readOnly = false }: {
  draft: string; onChange: (value: string) => void; maximum: number; label?: string; minimum?: number; increment?: number; readOnly?: boolean;
}) {
  const id = useId();
  const parsed = parseOfferUsd(draft, maximum);
  const error = parsed.error || (parsed.value !== null && parsed.value % increment !== 0 ? `Live bids use $${increment.toLocaleString('en-US')} increments.` : null) || (parsed.value !== null && parsed.value < minimum ? `The minimum is $${minimum.toLocaleString('en-US')}.` : null);
  return <div className={css.mkusd}>
    <label htmlFor={id}>{label} <span>USD</span></label>
    <input id={id} aria-label={`${label} in USD`} type="text" inputMode="numeric" autoComplete="off"
      value={draft} readOnly={readOnly} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={`${id}-summary`} />
    <small id={`${id}-summary`} className={error ? css.mkover : ''}>{error || `$${parsed.value!.toLocaleString('en-US')} · ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(parsed.value!)} USD`}{!error && increment > 1 ? ` · $${increment.toLocaleString('en-US')} increments` : ''}</small>
  </div>;
}
