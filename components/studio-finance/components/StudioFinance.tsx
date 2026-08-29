/* ============================================================================
   STUDIO FINANCE — the shell.

   One screen, four focused pages: Snapshot, Performance, Ledger, Capital.
   The shell owns the header, the tab bar, the period, and the two things that
   can be opened from more than one page (a title's breakdown, and the cash
   movement animation after a capital decision). Everything else lives in its
   own view file.

   The component is pure: it renders `data` and calls back. It never mutates
   game state and it never fetches.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { PeriodKey, StudioFinanceData, StudioFinanceHandlers } from '../finance/types';
import { PERIODS, STATUS_COPY, cutFor, health as deriveHealth, sliceWeeks, summarize } from '../finance/derive';
import { money } from '../finance/format';
import { brandVars } from '../finance/brand';
import { Segmented } from './ui';
import { SnapshotView } from './SnapshotView';
import { PerformanceView } from './PerformanceView';
import { LedgerView } from './LedgerView';
import { CapitalView } from './CapitalView';
import { TitleSheet } from './TitleSheet';
import { CloseReport, type CloseReportData } from './CloseReport';
import '../styles/tokens.css';
import '../styles/studio-finance.css';

export type FinanceTab = 'snapshot' | 'performance' | 'ledger' | 'capital';

const TABS: Array<{ key: FinanceTab; label: string }> = [
  { key: 'snapshot', label: 'Snapshot' },
  { key: 'performance', label: 'Performance' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'capital', label: 'Capital' },
];

export interface StudioFinanceProps extends StudioFinanceHandlers {
  data: StudioFinanceData;
  initialTab?: FinanceTab;
  initialCapitalRoute?: 'founder' | 'equity';
  /** Set to show the end-of-period close moment; clear it on dismiss. */
  closeReport?: CloseReportData | null;
  onDismissCloseReport?: () => void;
}

export function StudioFinance({ data, initialTab = 'snapshot', initialCapitalRoute, closeReport = null, onDismissCloseReport, ...handlers }: StudioFinanceProps) {
  const [tab, setTab] = useState<FinanceTab>(initialTab);
  const [period, setPeriod] = useState<PeriodKey>('QUARTER');
  const [titleId, setTitleId] = useState<string | null>(null);
  const [moved, setMoved] = useState<{ amount: number; label: string; id: number } | null>(null);
  const [compact, setCompact] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const summary = useMemo(() => summarize(sliceWeeks(data.weeks, period), data.cash), [data.weeks, data.cash, period]);
  const cut = useMemo(() => cutFor(data, period), [data, period]);
  const health = useMemo(() => deriveHealth(data, summary), [data, summary]);
  const status = STATUS_COPY[health.status];

  const titleName = useMemo(() => {
    const map = new Map(data.titles.map((t) => [t.id, t.name]));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [data.titles]);

  // The tab bar thins out once the player is reading rather than orienting.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    const onScroll = () => setCompact(node.scrollTop > 24);
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  useEffect(() => {
    if (!moved) return undefined;
    const timer = window.setTimeout(() => setMoved(null), 1900);
    return () => window.clearTimeout(timer);
  }, [moved]);

  /* Every accent on the screen is a function of the platform colour the player
     picked when they founded the service. */
  const brand = useMemo(() => brandVars(data.company.brandHex), [data.company.brandHex]);
  const openTitle = (id: string) => setTitleId(id);

  return (
    <div className="sf" style={brand as CSSProperties}>
      <header className="sf-head">
        <button type="button" className="sf-icon-btn" onClick={() => handlers.onBack?.()} aria-label="Back">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2L4 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="sf-head-titles">
          <h1>Studio Finance</h1>
          <p>{data.company.name} · Y{data.company.year} W{data.company.week}</p>
        </div>
        <span className={`sf-status sf-tone-${status.tone}`}>
          <i aria-hidden="true" />{status.label}
        </span>
      </header>

      <nav className={compact ? 'sf-tabs is-compact' : 'sf-tabs'} aria-label="Studio Finance sections">
        <span
          className="sf-tabs-marker"
          aria-hidden="true"
          style={{ transform: `translateX(${TABS.findIndex((t) => t.key === tab) * 100}%)` }}
        />
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === tab ? 'sf-tab is-on' : 'sf-tab'}
            aria-current={item.key === tab ? 'page' : undefined}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* The window is global. Snapshot, Performance and Ledger all report the
          period selected here, so the three pages can never disagree about
          which weeks they are describing. Capital is current state, not a
          period, so the strip is hidden there rather than lying by omission. */}
      {tab !== 'capital' && (
        <div className={compact ? 'sf-periodbar is-compact' : 'sf-periodbar'}>
          <Segmented
            ariaLabel="Reporting period"
            variant="bar"
            options={PERIODS.map((p) => ({ key: p.key, label: p.label }))}
            value={period}
            onChange={setPeriod}
          />
        </div>
      )}

      <div className="sf-scroll" ref={scrollRef}>
        {tab === 'snapshot' && (
          <SnapshotView
            data={data}
            cut={cut}
            period={period}
            summary={summary}
            health={health}
            onNavigate={setTab}
            onOpenTitle={openTitle}
          />
        )}
        {tab === 'performance' && (
          <PerformanceView cut={cut} period={period} onOpenTitle={openTitle} onOpenMarket={handlers.onOpenMarket} />
        )}
        {tab === 'ledger' && <LedgerView data={data} period={period} titleName={titleName} />}
        {tab === 'capital' && (
          <CapitalView
            data={data}
            handlers={handlers}
            initialRoute={initialCapitalRoute}
            onCashMoved={(amount, label) => setMoved({ amount, label, id: Date.now() })}
          />
        )}
        <div className="sf-tail" />
      </div>

      {moved && (
        <div className="sf-cashmove" key={moved.id} role="status">
          <strong>{money(moved.amount, { sign: true })}</strong>
          <span>{moved.label}</span>
        </div>
      )}

      <TitleSheet
        title={data.titles.find((t) => t.id === titleId) ?? null}
        onClose={() => setTitleId(null)}
        onOpenTitle={handlers.onOpenTitle}
      />

      <CloseReport report={closeReport} onDismiss={() => onDismissCloseReport?.()} />
    </div>
  );
}
