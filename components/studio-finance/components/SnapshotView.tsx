/* ============================================================================
   SNAPSHOT — how much money do I have, and is the company healthy?

   Five blocks, in the order a person actually asks the questions:
   see cash → understand the movement → check health → learn what caused it →
   find out who earned it. Everything deeper lives one tap away.
   ========================================================================== */

import { useMemo } from 'react';
import type { PeriodKey, StudioFinanceData } from '../finance/types';
import type { FinanceHealth, PeriodSummary, ResolvedCut } from '../finance/derive';
import { periodPhrase, topEarners, whatChanged } from '../finance/derive';
import { delta, money, pct, runwayLabel } from '../finance/format';
import { CashFlowChart } from './CashFlowChart';
import { Poster } from './Poster';
import { Meter, useCountUp, type Tone } from './ui';
import type { FinanceTab } from './StudioFinance';

interface Props {
  data: StudioFinanceData;
  cut: ResolvedCut;
  period: PeriodKey;
  summary: PeriodSummary;
  health: FinanceHealth;
  onNavigate: (tab: FinanceTab) => void;
  onOpenTitle: (titleId: string) => void;
}

export function SnapshotView({ data, cut, period, summary, health, onNavigate, onOpenTitle }: Props) {
  const cash = useCountUp(data.cash);
  const earners = useMemo(() => topEarners(cut.titles), [cut.titles]);
  const lowCash = health.runway < 20 || health.coverage < 12;

  return (
    <div className="sf-view">
      {/* --- treasury ---------------------------------------------------- */}
      <section className={lowCash ? 'sf-treasury is-warned' : 'sf-treasury'}>
        <div className="sf-treasury-top">
          <p className="sf-eyebrow">Available cash</p>
          <p className="sf-treasury-figure">{money(cash)}</p>
          <p className={`sf-treasury-delta ${summary.net >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}`}>
            {delta(summary.net)} <span>{periodPhrase(period)}</span>
          </p>
        </div>

        <CashLine weeks={summary.weeks.map((w) => w.closingCash)} />

        <div className="sf-flow">
          <Step label="Opening" compactLabel="Open" value={money(summary.opening)} />
          <Arrow />
          <Step label="Money in" compactLabel="Inflow" value={delta(summary.revenue)} tone="good" />
          <Arrow />
          <Step label="Money out" compactLabel="Outflow" value={delta(-summary.expense)} tone="bad" />
          <Arrow />
          <Step label="Closing" compactLabel="Close" value={money(summary.closing)} strong />
        </div>

        {Math.abs(summary.capital) > 1000 && (
          <p className="sf-flow-note">
            {summary.capital > 0
              ? `Includes ${delta(summary.capital)} raised outside operations.`
              : `Includes ${delta(summary.capital)} of principal repaid outside operations.`}
          </p>
        )}

        <button type="button" className="sf-btn sf-btn--primary" onClick={() => onNavigate('capital')}>
          Manage capital
        </button>
      </section>

      {/* --- cash flow --------------------------------------------------- */}
      <CashFlowChart
        weeks={summary.weeks}
        events={data.events}
        totals={{ revenue: summary.revenue, expense: summary.expense, net: summary.net }}
      />

      {/* --- health ------------------------------------------------------ */}
      <section className="sf-health">
        <Gauge
          label="Operating margin"
          value={pct(health.margin)}
          note={health.margin >= 20 ? 'Healthy' : health.margin >= 0 ? 'Thin' : 'Negative'}
          fill={(health.margin + 20) / 70}
          tone={health.margin >= 20 ? 'good' : health.margin >= 0 ? 'warn' : 'bad'}
        />
        <Gauge
          label="Weekly burn"
          value={money(health.burn)}
          note={health.netWeekly >= 0 ? `Covered ${money(health.netWeekly, { sign: true })}/wk` : `Short ${money(health.netWeekly)}/wk`}
          fill={health.burn / Math.max(1, summary.revenue / Math.max(1, summary.weeks.length))}
          tone={health.netWeekly >= 0 ? 'good' : 'warn'}
        />
        {Number.isFinite(health.runway) ? (
          <Gauge
            label="Runway"
            value={runwayLabel(health.runway)}
            note={health.runway >= 26 ? 'Comfortable' : health.runway >= 12 ? 'Watch it' : 'Critical'}
            fill={Math.min(1, health.runway / 52)}
            tone={health.runway >= 26 ? 'good' : health.runway >= 12 ? 'warn' : 'bad'}
            ticks={4}
          />
        ) : (
          /* Cash positive: runway is not the question any more — how long the
             cash on hand could carry the cost base is. */
          <Gauge
            label="Cash buffer"
            value={runwayLabel(health.coverage)}
            note={health.coverage >= 26 ? 'Deep cover' : health.coverage >= 12 ? 'Adequate' : 'Thin cover'}
            fill={Math.min(1, health.coverage / 52)}
            tone={health.coverage >= 26 ? 'good' : health.coverage >= 12 ? 'warn' : 'bad'}
            ticks={4}
          />
        )}
        <Gauge
          label="Debt pressure"
          value={pct(health.debtPressure)}
          note={data.capital.debt.outstanding > 0 ? `${money(data.capital.debt.outstanding)} outstanding` : 'No facilities drawn'}
          fill={health.debtPressure / 60}
          tone={health.debtPressure < 15 ? 'good' : health.debtPressure < 35 ? 'warn' : 'bad'}
        />
      </section>

      {/* --- what changed ------------------------------------------------ */}
      <section className="sf-changed">
        <p className="sf-eyebrow">What changed?</p>
        <p className="sf-changed-copy">{whatChanged(data, period)}</p>
        <div className="sf-changed-actions">
          <button type="button" className="sf-btn sf-btn--ghost" onClick={() => onNavigate('performance')}>See drivers</button>
          <button type="button" className="sf-btn sf-btn--ghost" onClick={() => onNavigate('ledger')}>Transactions</button>
        </div>
      </section>

      {/* --- top earners -------------------------------------------------- */}
      <section className="sf-earners">
        <header className="sf-sec-head">
          <h2>Top earners{cut.windowed.titles ? '' : ' · lifetime'}</h2>
          <button type="button" className="sf-link" onClick={() => onNavigate('performance')}>All titles</button>
        </header>
        <ol className="sf-earner-list">
          {earners.map((earner, i) => (
            <li key={earner.id}>
              <button type="button" className="sf-earner" onClick={() => onOpenTitle(earner.id)}>
                <Poster seed={earner.posterSeed ?? earner.id} size={34} rank={i + 1} />
                <span className="sf-earner-name">{earner.name}</span>
                <span className="sf-earner-amount">{money(earner.amount)}</span>
              </button>
            </li>
          ))}
        </ol>
        {earners.length === 0 ? <p className="sf-empty">Title economics appear after the first live week.</p> : null}
      </section>
    </div>
  );
}

function Step({ label, compactLabel, value, tone = 'flat', strong }: { label: string; compactLabel: string; value: string; tone?: Tone; strong?: boolean }) {
  return (
    <div className={strong ? 'sf-flow-step is-strong' : 'sf-flow-step'}>
      <span className="sf-flow-label" aria-label={label}>
        <span className="sf-flow-label-full">{label}</span>
        <span className="sf-flow-label-short" aria-hidden="true">{compactLabel}</span>
      </span>
      <span className={`sf-flow-value sf-tone-${tone}`}>{value}</span>
    </div>
  );
}

function Arrow() {
  return <span className="sf-flow-arrow" aria-hidden="true">›</span>;
}

function Gauge({ label, value, note, fill, tone, ticks = 0 }: { label: string; value: string; note: string; fill: number; tone: Tone; ticks?: number }) {
  return (
    <article className="sf-gauge">
      <p className="sf-eyebrow">{label}</p>
      <p className={`sf-gauge-value sf-tone-${tone}`}>{value}</p>
      <Meter fill={fill} tone={tone} ticks={ticks} />
      <p className="sf-gauge-note">{note}</p>
    </article>
  );
}

/** The cash position under the treasury number — shape only, no axis. */
function CashLine({ weeks }: { weeks: number[] }) {
  if (weeks.length < 2) return null;
  const min = Math.min(...weeks);
  const max = Math.max(...weeks);
  const span = Math.max(1, max - min);
  const points = weeks.map((value, i) => {
    const x = (i / (weeks.length - 1)) * 100;
    const y = 22 - ((value - min) / span) * 18;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const rising = weeks[weeks.length - 1] >= weeks[0];
  return (
    <svg className="sf-cashline" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,24 ${points.join(' ')} 100,24`} fill={rising ? 'var(--sf-good-wash)' : 'var(--sf-bad-wash)'} />
      <polyline points={points.join(' ')} fill="none" stroke={rising ? 'var(--sf-good)' : 'var(--sf-bad)'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
