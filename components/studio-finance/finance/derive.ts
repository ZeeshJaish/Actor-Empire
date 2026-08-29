/* ============================================================================
   Everything the screen needs that is not literally in StudioFinanceData.
   Kept out of the components so the numbers can be unit-tested without React,
   and so a host that already computes one of these can override it in the data.
   ========================================================================== */

import type {
  FinanceStatus,
  MarketFinance,
  PeriodKey,
  RevenueSource,
  StudioFinanceData,
  TitleFinance,
  TitleStatus,
  Transaction,
  WeekPoint,
} from './types';

export const PERIODS: Array<{ key: PeriodKey; label: string; weeks: number }> = [
  { key: '4W', label: '4 Weeks', weeks: 4 },
  { key: 'QUARTER', label: 'Quarter', weeks: 13 },
  { key: 'YEAR', label: 'Year', weeks: 52 },
  { key: 'ALL', label: 'All Time', weeks: Number.POSITIVE_INFINITY },
];

export function periodWeeks(period: PeriodKey): number {
  return PERIODS.find((p) => p.key === period)?.weeks ?? 13;
}

export function periodLabel(period: PeriodKey): string {
  return PERIODS.find((p) => p.key === period)?.label ?? 'Quarter';
}

/** The window as it belongs in a sentence: "+$1.34M this quarter". */
export function periodPhrase(period: PeriodKey): string {
  if (period === '4W') return 'in four weeks';
  if (period === 'QUARTER') return 'this quarter';
  if (period === 'YEAR') return 'this year';
  return 'all time';
}

/** The tail of the weekly series that belongs to the selected period. */
export function sliceWeeks(weeks: WeekPoint[], period: PeriodKey): WeekPoint[] {
  const span = periodWeeks(period);
  if (!Number.isFinite(span)) return weeks;
  return weeks.slice(Math.max(0, weeks.length - span));
}

export interface PeriodSummary {
  revenue: number;
  expense: number;
  net: number;
  opening: number;
  closing: number;
  /** Money that moved for reasons other than trading — injections, raises,
      principal repayments. Kept out of revenue so margins stay honest. */
  capital: number;
  firstWeek: number;
  lastWeek: number;
  weeks: WeekPoint[];
}

export function summarize(weeks: WeekPoint[], fallbackCash: number): PeriodSummary {
  if (weeks.length === 0) {
    return {
      revenue: 0, expense: 0, net: 0, capital: 0,
      opening: fallbackCash, closing: fallbackCash,
      firstWeek: 0, lastWeek: 0, weeks,
    };
  }
  const revenue = weeks.reduce((sum, w) => sum + w.revenue, 0);
  const expense = weeks.reduce((sum, w) => sum + w.expense, 0);
  const closing = weeks[weeks.length - 1].closingCash;
  // Opening is the balance before the first week in view actually settled.
  const first = weeks[0];
  const opening = first.closingCash - (first.revenue - first.expense);
  return {
    revenue,
    expense,
    net: closing - opening,
    capital: closing - opening - (revenue - expense),
    opening,
    closing,
    firstWeek: first.week,
    lastWeek: weeks[weeks.length - 1].week,
    weeks,
  };
}

export interface FinanceHealth {
  margin: number;        // operating margin, %
  burn: number;          // average weekly expense
  netWeekly: number;     // average weekly net — negative means burning cash
  runway: number;        // weeks of cash left at the current net burn
  /** Weeks the cash on hand could cover the FULL weekly cost base if the
      revenue stopped. A profitable company with two weeks of cover is still
      one cancelled settlement away from missing payroll, so this — not runway
      — is what decides Tight and At Risk. */
  coverage: number;
  debtPressure: number;  // weekly debt service as % of weekly revenue
  status: FinanceStatus;
}

export function health(data: StudioFinanceData, summary: PeriodSummary): FinanceHealth {
  const span = Math.max(1, summary.weeks.length);
  const burn = summary.expense / span;
  const income = summary.revenue / span;
  const netWeekly = income - burn;
  const margin = summary.revenue > 0
    ? ((summary.revenue - summary.expense) / summary.revenue) * 100
    : summary.expense > 0 ? -100 : 0;
  const runway = netWeekly >= 0
    ? Number.POSITIVE_INFINITY
    : data.cash / Math.abs(netWeekly);
  const debtPressure = income > 0
    ? (data.capital.debt.weeklyPayment / income) * 100
    : data.capital.debt.weeklyPayment > 0 ? 100 : 0;

  const coverage = burn > 0 ? data.cash / burn : Number.POSITIVE_INFINITY;

  return {
    margin,
    burn,
    netWeekly,
    runway,
    coverage,
    debtPressure,
    status: data.status ?? classify(margin, runway, coverage, netWeekly, debtPressure),
  };
}

function classify(margin: number, runway: number, coverage: number, netWeekly: number, debtPressure: number): FinanceStatus {
  if (runway < 8 || coverage < 6 || (netWeekly < 0 && debtPressure > 55)) return 'AT_RISK';
  if (runway < 20 || coverage < 12) return 'TIGHT';
  if (margin >= 30 && netWeekly > 0) return 'EXPANSION';
  if (margin > 8 && netWeekly > 0) return 'PROFITABLE';
  return 'STABLE';
}

export const STATUS_COPY: Record<FinanceStatus, { label: string; tone: 'good' | 'warn' | 'bad' | 'flat' }> = {
  PROFITABLE: { label: 'Profitable', tone: 'good' },
  EXPANSION: { label: 'Expansion', tone: 'good' },
  STABLE: { label: 'Stable', tone: 'flat' },
  TIGHT: { label: 'Tight', tone: 'warn' },
  AT_RISK: { label: 'At Risk', tone: 'bad' },
};

/* --- transactions ---------------------------------------------------------- */

export function txInPeriod(data: StudioFinanceData, period: PeriodKey): Transaction[] {
  const weeks = sliceWeeks(data.weeks, period);
  if (weeks.length === 0) return data.transactions;
  const from = weeks[0].week;
  return data.transactions.filter((t) => t.week >= from);
}

/* --- titles ---------------------------------------------------------------- */

export interface TitleTotals {
  gross: number;
  cost: number;
  net: number;
  margin: number;
  status: TitleStatus;
}

export function titleTotals(title: TitleFinance): TitleTotals {
  const gross = title.subscriptionValue + title.advertising + title.licensing;
  const cost = title.productionCost + title.marketingCost + title.infrastructureCost;
  const net = gross - cost;
  const margin = gross > 0 ? (net / gross) * 100 : -100;
  return { gross, cost, net, margin, status: title.status ?? classifyTitle(net, margin, title.trend) };
}

function classifyTitle(net: number, margin: number, trend: number): TitleStatus {
  if (net < 0 && trend <= 0) return 'LOSS';
  if (net < 0) return 'BUILDING';
  if (margin >= 45 && trend > 10) return 'BREAKOUT';
  if (margin >= 18) return 'PROFITABLE';
  if (trend > 0) return 'BUILDING';
  return 'UNDERPERFORMING';
}

export const TITLE_STATUS_COPY: Record<TitleStatus, { label: string; tone: 'good' | 'warn' | 'bad' | 'flat' }> = {
  BREAKOUT: { label: 'Breakout Hit', tone: 'good' },
  PROFITABLE: { label: 'Profitable', tone: 'good' },
  BUILDING: { label: 'Building Audience', tone: 'flat' },
  UNDERPERFORMING: { label: 'Underperforming', tone: 'warn' },
  LOSS: { label: 'Loss Maker', tone: 'bad' },
};

export function rankTitles(titles: TitleFinance[]): Array<TitleFinance & { totals: TitleTotals }> {
  return titles
    .map((t) => ({ ...t, totals: titleTotals(t) }))
    .sort((a, b) => b.totals.gross - a.totals.gross);
}

/* --- snapshot extras -------------------------------------------------------- */

export interface Earner {
  id: string;
  name: string;
  amount: number;
  posterSeed?: string;
}

/** The strongest earning titles. Revenue streams are a different cut of the
    same money, so they are ranked on Performance › Sources, never mixed in
    here — a title's lifetime gross and a quarter of ad sales are not
    comparable figures and must not sit in one ranked list. */
export function topEarners(titles: TitleFinance[], count = 3): Earner[] {
  return titles
    .map((t) => ({
      id: t.id,
      name: t.name,
      amount: titleTotals(t).gross,
      posterSeed: t.posterSeed ?? t.id,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count);
}

/** One sentence explaining the period. Host copy wins when it is supplied. */
export function whatChanged(data: StudioFinanceData, period: PeriodKey): string {
  const written = data.whatChanged?.[period];
  if (written) return written;

  const risingSource = [...data.sources]
    .filter((s) => typeof s.prior === 'number' && s.prior > 0)
    .map((s) => ({ s, growth: (s.amount - (s.prior as number)) / (s.prior as number) }))
    .sort((a, b) => b.growth - a.growth)[0];

  const heaviestTx = txInPeriod(data, period)
    // Capital movements are not operating costs — a loan repayment is not a
    // reason the quarter went the way it did.
    .filter((t) => t.amount < 0 && t.lane !== 'CAPITAL')
    .sort((a, b) => a.amount - b.amount)[0];

  if (risingSource && heaviestTx) {
    const direction = risingSource.growth >= 0 ? 'grew' : 'fell';
    const magnitude = Math.abs(Math.round(risingSource.growth * 100));
    return `${risingSource.s.name} ${direction} ${magnitude}%, while “${heaviestTx.name}” was the heaviest single cost of the period.`;
  }
  return 'Not enough settled weeks yet to explain the movement.';
}

/* --- sources & markets ------------------------------------------------------ */

export function sourceShare(sources: RevenueSource[]): Array<RevenueSource & { share: number; change: number | null }> {
  const total = sources.reduce((sum, s) => sum + s.amount, 0) || 1;
  return sources
    .map((s) => ({
      ...s,
      share: (s.amount / total) * 100,
      change: typeof s.prior === 'number' && s.prior > 0
        ? ((s.amount - s.prior) / s.prior) * 100
        : null,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function marketTotals(markets: MarketFinance[]): Array<MarketFinance & { net: number; margin: number; share: number }> {
  const total = markets.reduce((sum, m) => sum + m.revenue, 0) || 1;
  return markets
    .map((m) => ({
      ...m,
      net: m.revenue - m.cost,
      margin: m.revenue > 0 ? ((m.revenue - m.cost) / m.revenue) * 100 : 0,
      share: (m.revenue / total) * 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/* --- capital ---------------------------------------------------------------- */

export function ipoProgress(data: StudioFinanceData): { met: number; total: number } {
  const reqs = data.capital.ipo.requirements;
  return { met: reqs.filter((r) => r.met).length, total: reqs.length };
}

/* --- windowed cuts ---------------------------------------------------------- */

export interface ResolvedCut {
  titles: TitleFinance[];
  sources: RevenueSource[];
  markets: MarketFinance[];
  /** False for any list the host could not compute for this window, so the
      screen can label it "lifetime" instead of quietly implying otherwise. */
  windowed: { titles: boolean; sources: boolean; markets: boolean };
}

/** The three Performance lists for the selected window, with honest fallback. */
export function cutFor(data: StudioFinanceData, period: PeriodKey): ResolvedCut {
  const supplied = period === 'ALL' ? undefined : data.windows?.[period];
  return {
    titles: supplied?.titles ?? data.titles,
    sources: supplied?.sources ?? data.sources,
    markets: supplied?.markets ?? data.markets,
    windowed: {
      titles: period === 'ALL' || Boolean(supplied?.titles),
      sources: period === 'ALL' || Boolean(supplied?.sources),
      markets: period === 'ALL' || Boolean(supplied?.markets),
    },
  };
}

/* --- ledger grain ------------------------------------------------------------ */

/*
 * A week is the right unit for the last two months and noise after that. Left
 * as a flat weekly list, the ledger grows without limit: eight years of play is
 * three thousand rows, which is both unreadable and unrenderable on a phone.
 * So the grain coarsens with age — weeks, then four-week months, then quarters,
 * then whole years — and everything past the recent weeks arrives collapsed to
 * one summary line the player can open.
 */
export type LedgerGrain = 'week' | 'month' | 'quarter' | 'year';

const RECENT_WEEKS = 8;      // stays week-by-week
const MONTHS_UNTIL = 52;     // then four-week months, for a year
const QUARTERS_UNTIL = 156;  // then quarters, for three years; years beyond

export interface LedgerGroup {
  key: string;
  label: string;
  /** "Year 2 · weeks 53–56" — the span, for the collapsed summary line. */
  span: string;
  grain: LedgerGrain;
  entries: Transaction[];
  moneyIn: number;
  moneyOut: number;
  net: number;
}

export interface LedgerTotals {
  moneyIn: number;
  moneyOut: number;
  net: number;
  count: number;
}

export function ledgerTotals(entries: Transaction[]): LedgerTotals {
  return entries.reduce<LedgerTotals>(
    (totals, t) => ({
      moneyIn: totals.moneyIn + (t.amount > 0 ? t.amount : 0),
      moneyOut: totals.moneyOut + (t.amount < 0 ? -t.amount : 0),
      net: totals.net + t.amount,
      count: totals.count + 1,
    }),
    { moneyIn: 0, moneyOut: 0, net: 0, count: 0 },
  );
}

function grainFor(age: number): LedgerGrain {
  if (age < RECENT_WEEKS) return 'week';
  if (age < MONTHS_UNTIL) return 'month';
  if (age < QUARTERS_UNTIL) return 'quarter';
  return 'year';
}

function yearOf(week: number): number {
  return Math.floor((week - 1) / 52) + 1;
}

function weekOfYear(week: number): number {
  return ((week - 1) % 52) + 1;
}

/** Groups entries newest-first, coarsening the grain as they age. */
export function groupLedger(entries: Transaction[], currentWeek: number): LedgerGroup[] {
  const buckets = new Map<string, { grain: LedgerGrain; from: number; to: number; entries: Transaction[] }>();

  entries.forEach((t) => {
    const grain = grainFor(Math.max(0, currentWeek - t.week));
    const year = yearOf(t.week);
    const inYear = weekOfYear(t.week);
    let key = '';
    let from = t.week;
    let to = t.week;

    if (grain === 'week') {
      key = `w-${t.week}`;
    } else if (grain === 'month') {
      const month = Math.floor((inYear - 1) / 4);
      key = `m-${year}-${month}`;
      from = (year - 1) * 52 + month * 4 + 1;
      to = from + 3;
    } else if (grain === 'quarter') {
      const quarter = Math.floor((inYear - 1) / 13);
      key = `q-${year}-${quarter}`;
      from = (year - 1) * 52 + quarter * 13 + 1;
      to = from + 12;
    } else {
      key = `y-${year}`;
      from = (year - 1) * 52 + 1;
      to = from + 51;
    }

    const bucket = buckets.get(key);
    if (bucket) bucket.entries.push(t);
    else buckets.set(key, { grain, from, to, entries: [t] });
  });

  return [...buckets.entries()]
    .map(([key, bucket]) => {
      const totals = ledgerTotals(bucket.entries);
      return {
        key,
        grain: bucket.grain,
        label: groupLabel(bucket.grain, bucket.from, bucket.to),
        span: groupSpan(bucket.grain, bucket.from, bucket.to),
        entries: bucket.entries,
        moneyIn: totals.moneyIn,
        moneyOut: totals.moneyOut,
        net: totals.net,
      };
    })
    .sort((a, b) => b.entries[0].week - a.entries[0].week);
}

/* Week numbers are absolute everywhere on this screen — the game counts weeks
   from the start, and switching to year-relative numbering inside one row is
   how a label ends up reading "Weeks 1–4" for weeks 105–108. */
function groupLabel(grain: LedgerGrain, from: number, to: number): string {
  if (grain === 'week') return `Week ${from}`;
  if (grain === 'month') return `Weeks ${from}–${to}`;
  if (grain === 'quarter') return `Quarter ${Math.floor((weekOfYear(from) - 1) / 13) + 1} · Year ${yearOf(from)}`;
  return `Year ${yearOf(from)}`;
}

function groupSpan(grain: LedgerGrain, from: number, to: number): string {
  if (grain === 'week' || grain === 'month') return `Year ${yearOf(from)}`;
  return `Weeks ${from}–${to}`;
}
