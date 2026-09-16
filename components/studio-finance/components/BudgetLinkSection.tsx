import { useState } from 'react';
import type { LinkedBudgetSummary } from '../finance/budgetLinks';

interface BudgetLinkSectionProps {
  id: string;
  summary: LinkedBudgetSummary;
  actionLabel: string;
  onOpen: () => void;
}

export function BudgetLinkSection({ id, summary, actionLabel, onOpen }: BudgetLinkSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `${id}-details`;

  return (
    <section className={expanded ? 'sf-budget-link is-open' : 'sf-budget-link'}>
      <button
        type="button"
        className="sf-budget-link-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(value => !value)}
      >
        <span>
          <em>Connected budget</em>
          <b>{summary.program}</b>
          <small>{summary.status}</small>
        </span>
        <span className="sf-budget-link-primary">
          <em>{summary.primaryLabel}</em>
          <b>{summary.primaryValue}</b>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="sf-budget-link-details" id={panelId}>
          <dl>
            {summary.metrics.map(metric => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd className={metric.tone && metric.tone !== 'flat' ? `sf-tone-${metric.tone}` : undefined}>
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
          <button type="button" className="sf-btn sf-btn--ghost sf-budget-link-open" onClick={onOpen}>
            {actionLabel}
          </button>
        </div>
      )}
    </section>
  );
}

