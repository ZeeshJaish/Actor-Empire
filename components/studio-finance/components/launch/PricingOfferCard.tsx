import { useId, type ReactNode } from 'react';

/** The same coloured cover / attached dark editor used by all public offers. */
export function PricingOfferCard({ title, tone, headline, summary, detail, open, onToggle, children }: {
  title: string; tone: 'essential' | 'standard' | 'premiere'; headline: ReactNode;
  summary: string; detail: string; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  const editorId = useId();
  return <section className={`pr-public-card${open ? ' is-open' : ''}`} data-plan-tone={tone}>
    <button type="button" className="pr-plan-tab pr-public-cover" data-plan-tone={tone}
      aria-label={`Edit ${title} offer`} aria-expanded={open} aria-controls={open ? editorId : undefined}
      onClick={onToggle}>
      <span className="pr-plan-tab-name">{title}</span>
      <strong>{headline}</strong>
      <span className="pr-plan-tab-features">{summary}</span>
      <span className="pr-plan-tab-foot"><span>{detail}</span><i>{open ? 'Close −' : 'Edit +'}</i></span>
    </button>
    {open && <div className="pr-attached-editor" id={editorId}>{children}</div>}
  </section>;
}
