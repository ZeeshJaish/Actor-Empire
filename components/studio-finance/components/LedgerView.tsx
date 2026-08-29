/* ============================================================================
   LEDGER — the company passbook.

   The only place a long vertical list is right, because transaction history is
   supposed to grow. But it cannot grow without limit: eight years of play at
   eight entries a week is three thousand rows, which no phone should mount and
   nobody can read. Two things keep it bounded:

   · the grain coarsens with age — weeks for the recent past, then four-week
     months, then quarters, then whole years — and older groups arrive collapsed
     to one summary line the player can open;
   · only a slice of groups is mounted at a time, with the rest behind
     "Load earlier".

   Above the list, a totals strip answers the question the filters are really
   asking: what did this cost me?
   ========================================================================== */

import { useMemo, useState } from 'react';
import type { PeriodKey, StudioFinanceData, Transaction, TxCategory, TxLane } from '../finance/types';
import { groupLedger, ledgerTotals, periodLabel, txInPeriod } from '../finance/derive';
import { money } from '../finance/format';
import { Row, Sheet, Tag } from './ui';

type Filter = 'ALL' | TxLane;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'INCOME', label: 'Income' },
  { key: 'EXPENSE', label: 'Expenses' },
  { key: 'CAPITAL', label: 'Capital' },
  { key: 'OPERATIONS', label: 'Operations' },
];

const GROUPS_PER_PAGE = 10;

/* A glyph per category so a row is identifiable before it is read. */
const CATEGORY_GLYPH: Record<TxCategory, string> = {
  subscription: '◉',
  advertising: '◈',
  licensing: '§',
  distribution: '⇄',
  production: '⛭',
  marketing: '✦',
  infrastructure: '▤',
  payroll: '☰',
  rights: '¶',
  founder: '◆',
  investor: '◇',
  debt: '⌁',
  tax: '%',
};

const CATEGORY_LABEL: Record<TxCategory, string> = {
  subscription: 'Subscriptions',
  advertising: 'Advertising',
  licensing: 'Licensing',
  distribution: 'Distribution',
  production: 'Production',
  marketing: 'Marketing',
  infrastructure: 'Infrastructure',
  payroll: 'Payroll',
  rights: 'Rights',
  founder: 'Founder capital',
  investor: 'Investor capital',
  debt: 'Debt service',
  tax: 'Taxes & fees',
};

interface Props {
  data: StudioFinanceData;
  period: PeriodKey;
  titleName: (id?: string) => string | undefined;
}

export function LedgerView({ data, period, titleName }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Transaction | null>(null);
  const [pages, setPages] = useState(1);
  /* Undefined means "however this grain opens by default"; a boolean is the
     player having decided otherwise. */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  /* Settlement order, newest first. A passbook is only readable if the running
     balance descends down the page, so rows are never re-sorted by amount. */
  const order = useMemo(() => {
    const map = new Map<string, number>();
    data.transactions.forEach((t, i) => map.set(t.id, i));
    return map;
  }, [data.transactions]);

  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return txInPeriod(data, period)
      .filter((t) => (filter === 'ALL' ? true : t.lane === filter))
      .filter((t) => {
        if (!needle) return true;
        const haystack = `${t.name} ${t.department ?? ''} ${t.market ?? ''} ${titleName(t.titleId) ?? ''} ${CATEGORY_LABEL[t.category]}`;
        return haystack.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.week - a.week || (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0));
  }, [data, period, filter, query, titleName, order]);

  const totals = useMemo(() => ledgerTotals(entries), [entries]);
  const groups = useMemo(() => groupLedger(entries, data.company.week), [entries, data.company.week]);
  const shown = groups.slice(0, pages * GROUPS_PER_PAGE);
  const remaining = groups.length - shown.length;

  return (
    <div className="sf-view">
      <section className="sf-ledger-head">
        <div>
          <p className="sf-eyebrow">Closing balance</p>
          <p className="sf-ledger-figure">{money(data.cash)}</p>
        </div>
        <p className="sf-ledger-count">{totals.count} entries<br />{periodLabel(period).toLowerCase()}</p>
      </section>

      <div className="sf-search">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M10.4 10.4L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        <input
          type="search"
          value={query}
          placeholder="Search transactions, titles, departments"
          onChange={(e) => { setQuery(e.target.value); setPages(1); }}
          aria-label="Search transactions"
        />
      </div>

      <div className="sf-chips" role="tablist" aria-label="Ledger filter">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={filter === f.key ? 'sf-chip is-on' : 'sf-chip'}
            onClick={() => { setFilter(f.key); setPages(1); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* What the filter is actually asking: what did this cost me? */}
      <section className="sf-ledger-totals">
        <div>
          <p className="sf-eyebrow">Money in</p>
          <p className="sf-tone-good">{money(totals.moneyIn, { sign: true })}</p>
        </div>
        <div>
          <p className="sf-eyebrow">Money out</p>
          <p className="sf-tone-bad">{money(-totals.moneyOut, { sign: true })}</p>
        </div>
        <div>
          <p className="sf-eyebrow">Net</p>
          <p className={totals.net >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}>{money(totals.net, { sign: true })}</p>
        </div>
      </section>

      {groups.length === 0 && <p className="sf-empty">No entries match that filter.</p>}

      {shown.map((group) => {
        const isOpen = toggled[group.key] ?? group.grain === 'week';
        return (
          <section key={group.key} className={isOpen ? 'sf-week is-open' : 'sf-week'}>
            <button
              type="button"
              className="sf-week-head"
              aria-expanded={isOpen}
              onClick={() => setToggled((prev) => ({ ...prev, [group.key]: !isOpen }))}
            >
              <span className="sf-week-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
              <span className="sf-week-label">
                <span>{group.label}</span>
                {group.grain !== 'week' && <span className="sf-week-span">{group.entries.length} entries · {group.span}</span>}
              </span>
              <span className={group.net >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}>{money(group.net, { sign: true })}</span>
            </button>

            {isOpen ? (
              <ul className="sf-entries">
                {group.entries.map((t) => (
                  <li key={t.id}>
                    <button type="button" className="sf-entry" onClick={() => setOpen(t)}>
                      <span className={`sf-entry-glyph sf-cat-${t.lane.toLowerCase()}`} aria-hidden="true">{CATEGORY_GLYPH[t.category]}</span>
                      <span className="sf-entry-body">
                        <span className="sf-entry-name">{t.name}</span>
                        <span className="sf-entry-meta">
                          {[titleName(t.titleId), t.department, t.market, t.date].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="sf-entry-money">
                        <span className={t.amount >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}>{money(t.amount, { sign: true })}</span>
                        <span className="sf-entry-balance">{money(t.balanceAfter)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sf-week-summary">
                <span className="sf-tone-good">{money(group.moneyIn, { sign: true })} in</span>
                <span className="sf-tone-bad">{money(-group.moneyOut, { sign: true })} out</span>
              </p>
            )}
          </section>
        );
      })}

      {remaining > 0 && (
        <button type="button" className="sf-btn sf-btn--ghost sf-loadmore" onClick={() => setPages((p) => p + 1)}>
          Load earlier · {remaining} more
        </button>
      )}

      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        eyebrow={open ? CATEGORY_LABEL[open.category] : undefined}
        title={open?.name ?? ''}
      >
        {open && (
          <>
            <p className={`sf-sheet-figure ${open.amount >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}`}>{money(open.amount, { sign: true })}</p>
            <p className="sf-sheet-tags"><Tag tone={open.amount >= 0 ? 'good' : 'bad'}>{open.lane === 'CAPITAL' ? 'Capital movement' : open.amount >= 0 ? 'Money in' : 'Money out'}</Tag></p>
            {open.reason && <p className="sf-sheet-copy">{open.reason}</p>}
            <Row label="Settled" value={`Week ${open.week} · ${open.date}`} />
            {open.titleId && <Row label="Title" value={titleName(open.titleId) ?? open.titleId} />}
            {open.department && <Row label="Department" value={open.department} />}
            {open.market && <Row label="Market" value={open.market} />}
            <Row label="Company cash after" value={money(open.balanceAfter)} muted />
          </>
        )}
      </Sheet>
    </div>
  );
}
