/* ============================================================================
   STUDIO FINANCE — data contract
   ----------------------------------------------------------------------------
   The screen is a pure view over one object. It never fetches, never mutates
   game state, never invents a number. Everything it shows is either in
   StudioFinanceData or derived from it in derive.ts.

   All money is a plain number in whole dollars. Formatting happens once, in
   format.ts, so $18,420,000 always reads as $18.42M everywhere on the screen.
   ========================================================================== */

export type PeriodKey = '4W' | 'QUARTER' | 'YEAR' | 'ALL';

/** Headline condition shown in the header. Derived if the host omits it. */
export type FinanceStatus =
  | 'PROFITABLE'
  | 'EXPANSION'
  | 'STABLE'
  | 'TIGHT'
  | 'AT_RISK';

/** One simulated week of company money. Ordered oldest → newest. */
export interface WeekPoint {
  /** Absolute game week. Used to join transactions and events to the series. */
  week: number;
  /** Short axis label, e.g. "W28". */
  label: string;
  revenue: number;
  expense: number;
  /** Company cash at the end of this week. */
  closingCash: number;
}

export type EventKind = 'launch' | 'build' | 'capital' | 'record' | 'risk';

/** A game moment worth marking on the cash-flow timeline. */
export interface FinanceEvent {
  week: number;
  kind: EventKind;
  label: string;
}

export type TxLane = 'INCOME' | 'EXPENSE' | 'CAPITAL' | 'OPERATIONS';

export type TxCategory =
  | 'subscription'
  | 'advertising'
  | 'licensing'
  | 'distribution'
  | 'production'
  | 'marketing'
  | 'infrastructure'
  | 'payroll'
  | 'rights'
  | 'founder'
  | 'investor'
  | 'debt'
  | 'tax';

export interface Transaction {
  id: string;
  week: number;
  /** Display date, already localised by the host, e.g. "12 Mar". */
  date: string;
  name: string;
  category: TxCategory;
  lane: TxLane;
  /** Signed: money in is positive, money out is negative. */
  amount: number;
  /** Company cash immediately after this entry settled. */
  balanceAfter: number;
  titleId?: string;
  department?: string;
  market?: string;
  /** One sentence for the detail sheet: why this happened. */
  reason?: string;
}

export type TitleFormat = 'FILM' | 'SERIES' | 'DOC' | 'SPECIAL';

export type TitleStatus =
  | 'BREAKOUT'
  | 'PROFITABLE'
  | 'BUILDING'
  | 'UNDERPERFORMING'
  | 'LOSS';

export interface TitleFinance {
  id: string;
  name: string;
  format: TitleFormat;
  /** Release year, or the season/volume line. Free text, kept short. */
  releasedLabel?: string;
  /** Seed for the generated poster. Falls back to the id. */
  posterSeed?: string;
  subscriptionValue: number;
  advertising: number;
  licensing: number;
  productionCost: number;
  marketingCost: number;
  infrastructureCost: number;
  /** Percent change in contribution vs the previous period, e.g. -12.4. */
  trend: number;
  /** Host override. Omit and derive.ts classifies it from margin + trend. */
  status?: TitleStatus;
}

export interface RevenueSource {
  id: string;
  name: string;
  amount: number;
  /** Same source, previous period — powers the delta. */
  prior?: number;
}

export interface MarketFinance {
  id: string;
  name: string;
  /** Two-letter territory code. Drives the generated flag field when the game
      does not pass artwork of its own. */
  code: string;
  /** The game's own flag image. Given this, nothing is generated. */
  flagSrc?: string;
  revenue: number;
  cost: number;
  subscribers?: number;
  trend: number;
}

export interface OwnershipSlice {
  label: string;
  pct: number;
  kind: 'founder' | 'investor' | 'public';
}

/** A live term sheet the player can accept or reject. */
export interface EquityOffer {
  id: string;
  investor: string;
  amount: number;
  valuation: number;
  dilutionPct: number;
  /** "Limited", "Board seat", "Veto on slate" … */
  controlRights: string;
  weeklyObligation: number;
  conditions: string[];
}

export interface IpoRequirement {
  label: string;
  met: boolean;
  /** "2/3 years", "$320M / $500M" — the progress, not a restatement. */
  detail?: string;
}

export interface CapitalState {
  /** The player's own money, outside the company. */
  founderPersonalCash: number;
  ownership: OwnershipSlice[];
  valuation: number;
  debt: {
    outstanding: number;
    weeklyPayment: number;
    facilities: number;
  };
  cfoHired: boolean;
  /** Present once Private Equity is unlocked and an investor is at the table. */
  equityOffer?: EquityOffer | null;
  ipo: {
    unlocked: boolean;
    requirements: IpoRequirement[];
  };
}

/** The three list cuts, for one reporting window. */
export interface PeriodCut {
  titles: TitleFinance[];
  sources: RevenueSource[];
  markets: MarketFinance[];
}

export interface StudioFinanceData {
  company: {
    name: string;
    year: number;
    week: number;
    /** Brand accent, e.g. "#e0322f". Re-themes navigation and primary actions. */
    brandHex?: string;
  };
  cash: number;
  weeks: WeekPoint[];
  events: FinanceEvent[];
  transactions: Transaction[];
  /** The all-time cut. Always required — it is what every window falls back to. */
  titles: TitleFinance[];
  sources: RevenueSource[];
  markets: MarketFinance[];
  /**
   * The same three lists computed for a shorter window. The period control is
   * global, so Performance reports whatever window the player selected; supply
   * the windows you can compute and omit the rest. Anything omitted falls back
   * to the all-time lists above and the screen SAYS so — it never implies a
   * number is windowed when it is not.
   */
  windows?: Partial<Record<PeriodKey, Partial<PeriodCut>>>;
  capital: CapitalState;
  /** Host override for the header pill. Derived when absent. */
  status?: FinanceStatus;
  /** Host override for the "What changed?" line, per period. */
  whatChanged?: Partial<Record<PeriodKey, string>>;
}

/** Everything the screen hands back to the game. */
export interface StudioFinanceHandlers {
  onBack?: () => void;
  /** Borrowing stays in the existing Bank. Finance never duplicates it. */
  onOpenBank?: () => void;
  /** Listing and trading stay in the existing Public Markets system. */
  onOpenPublicMarkets?: () => void;
  /** Equity remains CFO-gated in the existing Leadership system. */
  onOpenLeadership?: () => void;
  /** Player moved personal money into the company. */
  onFounderInjection?: (amount: number) => { ok: boolean; message: string } | void;
  onAcceptOffer?: (offerId: string) => { ok: boolean; message: string } | void;
  onRejectOffer?: (offerId: string) => void;
  /** Optional deep link out to a title's own screen. */
  onOpenTitle?: (titleId: string) => void;
  /** Optional deep link to a territory screen. Without it the market cards are
      read-only rather than pretending to lead somewhere. */
  onOpenMarket?: (marketId: string) => void;
}
