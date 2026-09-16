import type { BuildStageId, SpendLine } from '../finance/build';
import type { LaunchStageSummary, LaunchStepId } from '../finance/launch';
import type { LinkedBudgetSummary } from '../finance/budgetLinks';
import { money } from '../finance/format';
import { BudgetLinkSection } from './BudgetLinkSection';

interface LaunchBudgetContentProps {
  rows: LaunchStageSummary[];
  available: number;
  linkedSummary?: LinkedBudgetSummary;
  onSelectStep: (step: LaunchStepId) => void;
  onOpenLinked: () => void;
}

export function LaunchBudgetContent({
  rows,
  available,
  linkedSummary,
  onSelectStep,
  onOpenLinked,
}: LaunchBudgetContentProps) {
  const knownSubtotal = rows.reduce((sum, row) => sum + (row.cost || 0), 0);
  const paidSubtotal = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const dueSubtotal = Math.max(0, knownSubtotal - paidSubtotal);
  const completed = rows.filter(row => row.done).length;

  return (
    <>
      <section className="lw-plan-overview" aria-label="Launch plan summary">
        <div><span>Stages cleared</span><b>{completed}/{rows.length}</b></div>
        <div><span>Known subtotal</span><b>{money(knownSubtotal)}</b></div>
        <div><span>Still due</span><b className={dueSubtotal > available ? 'sf-tone-bad' : undefined}>{money(dueSubtotal)}</b></div>
      </section>

      <p className="sf-eyebrow sf-block-head">Launch checklist</p>
      <div className="lw-stage-bill-list">
        {rows.map(row => {
          const costLabel = row.cost === null ? 'Not priced' : row.cost === 0 ? 'Included' : money(row.cost);
          const paymentLabel = row.paymentState === 'paid'
            ? 'Paid'
            : row.paymentState === 'partial'
              ? `${money(row.paidAmount)} paid`
              : row.paymentState === 'planned'
                ? 'Due when confirmed'
                : row.paymentState === 'pending'
                  ? 'Pending'
                  : 'No charge';
          return (
            <button
              key={row.id}
              type="button"
              className={`lw-stage-bill-row ${row.done ? 'is-done' : 'is-open'}`}
              onClick={() => onSelectStep(row.id)}
            >
              <span className="lw-stage-bill-state" aria-hidden="true">{row.done ? '✓' : '!'}</span>
              <span className="lw-stage-bill-copy"><b>{row.label}</b><em>{row.done ? 'Done' : 'Not done'}</em></span>
              <span className="lw-stage-bill-money"><b>{costLabel}</b><em>{paymentLabel}</em></span>
            </button>
          );
        })}
      </div>

      <section className="lw-plan-totals" aria-label="Launch plan totals">
        <div><span>Known subtotal</span><b>{money(knownSubtotal)}</b></div>
        <div><span>Paid in this plan</span><b className="sf-tone-good">{money(paidSubtotal)}</b></div>
        <div><span>Still due</span><b className={dueSubtotal > available ? 'sf-tone-bad' : undefined}>{money(dueSubtotal)}</b></div>
      </section>

      {linkedSummary && (
        <BudgetLinkSection
          id="launch-build-budget"
          summary={linkedSummary}
          actionLabel="Open Build"
          onOpen={onOpenLinked}
        />
      )}
    </>
  );
}

export interface BuildBudgetStage {
  id: BuildStageId;
  label: string;
  done: boolean;
  detail: string;
}

interface BuildBudgetContentProps {
  stages: BuildBudgetStage[];
  lines: SpendLine[];
  total: number;
  available: number;
  headroom: number;
  shortfall: number;
  linkedSummary?: LinkedBudgetSummary;
  onSelectStage: (stage: BuildStageId) => void;
  onOpenLinked: () => void;
}

export function BuildBudgetContent({
  stages,
  lines,
  total,
  available,
  headroom,
  shortfall,
  linkedSummary,
  onSelectStage,
  onOpenLinked,
}: BuildBudgetContentProps) {
  const completed = stages.filter(stage => stage.done).length;
  const currentBuildLines = lines.filter(line => !line.locked);

  return (
    <>
      <section className="lw-plan-overview" aria-label="Build plan summary">
        <div><span>Stages cleared</span><b>{completed}/{stages.length}</b></div>
        <div><span>Current build</span><b>{money(total)}</b></div>
        <div>
          <span>{shortfall > 0 ? 'Still needed' : 'Headroom'}</span>
          <b className={shortfall > 0 ? 'sf-tone-bad' : undefined}>{money(shortfall > 0 ? shortfall : headroom)}</b>
        </div>
      </section>

      <p className="sf-eyebrow sf-block-head">Build checklist</p>
      <div className="lw-stage-bill-list">
        {stages.map(stage => (
          <button
            key={stage.id}
            type="button"
            className={`lw-stage-bill-row ${stage.done ? 'is-done' : 'is-open'}`}
            onClick={() => onSelectStage(stage.id)}
          >
            <span className="lw-stage-bill-state" aria-hidden="true">{stage.done ? '✓' : '!'}</span>
            <span className="lw-stage-bill-copy"><b>{stage.label}</b><em>{stage.detail}</em></span>
            <span className="lw-stage-bill-money"><b>{stage.done ? 'Cleared' : 'Open'}</b></span>
          </button>
        ))}
      </div>

      <p className="sf-eyebrow sf-block-head">Build costs</p>
      <div className="sf-budget-lines">
        {currentBuildLines.length > 0 ? currentBuildLines.map(line => (
          <div key={line.id} className="sf-budget-line">
            <span><b>{line.label}</b>{line.note && <em>{line.note}</em>}</span>
            <strong>{money(line.amount)}</strong>
          </div>
        )) : <p className="sf-budget-empty">No build costs have been planned.</p>}
      </div>

      <section className="lw-plan-totals" aria-label="Build plan totals">
        <div><span>Studio money</span><b>{money(available)}</b></div>
        <div><span>This build</span><b>{money(total)}</b></div>
        <div>
          <span>{shortfall > 0 ? 'Still needed' : 'After build'}</span>
          <b className={shortfall > 0 ? 'sf-tone-bad' : 'sf-tone-good'}>{money(shortfall > 0 ? shortfall : headroom)}</b>
        </div>
      </section>

      {linkedSummary && (
        <BudgetLinkSection
          id="build-launch-budget"
          summary={linkedSummary}
          actionLabel="Open Define the Launch"
          onOpen={onOpenLinked}
        />
      )}
    </>
  );
}
