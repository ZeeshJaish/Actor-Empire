export interface StreamingIpoPresentationCheck {
  id: string;
  label: string;
  ok: boolean;
  note: string;
}

export interface StreamingIpoPresentationRisk {
  id: string;
  label: string;
  detail: string;
  cost: number;
}

export interface StreamingIpoPresentationInputs {
  founderName: string;
  founderPct: number;
  subscribers: number;
  arpu: number;
  churnPct: number;
  peakLoad: number;
  techDebt: number;
  weeklyNet: number;
  treasury: number;
  checks: StreamingIpoPresentationCheck[];
  risks: StreamingIpoPresentationRisk[];
  rivals: string[];
  executiveNames?: { cfo?: string; cto?: string; coo?: string; counsel?: string };
  boardSeats?: { id: string; name: string; kind: string }[];
  preIpoShares: number;
  initialNewShares: number;
  simulationSeed: string;
  absoluteWeek: number;
}

export interface StreamingIpoPresentationMark {
  id: string;
  label: string;
  short: string;
  bookCost: number;
}

export interface StreamingIpoPresentationResult {
  ticker: string;
  founderPctAfter: number;
  bank: string;
  bankId: string;
  firmBook: boolean;
  price: number;
  raised: number;
  netProceeds: number;
  coverage: number;
  openPrice: number;
  closePrice: number;
  popPct: number;
  founderWorth: number;
  omitted: string[];
  marks: StreamingIpoPresentationMark[];
  preIpoShares: number;
  newShares: number;
  sharesOutstanding: number;
  employeeQuotaPercent: number;
  anchorDiscountAccepted: boolean;
  diligenceWeeks: number;
  regulatorAttempts: number;
  rank: number;
}

export interface StreamingIpoPresentationBank {
  id: string;
  name: string;
  desk: string;
  kind: string;
  low: number;
  high: number;
  feePct: number;
  firm: boolean;
  condition: string;
  line: string;
}

export const STREAMING_IPO_BANKS: StreamingIpoPresentationBank[] = [
  {
    id: 'hf', name: 'Halloway & Fen', desk: 'Equity Capital Markets', kind: 'Boutique',
    low: 21, high: 29, feePct: 3.5, firm: false,
    condition: 'Best efforts — if the book does not fill, the deal is pulled.',
    line: 'They will say the highest number out loud. They cannot promise it clears.',
  },
  {
    id: 'mc', name: 'Meridian Capital Markets', desk: 'Global Syndicate', kind: 'Bulge bracket',
    low: 16, high: 21, feePct: 7, firm: true,
    condition: 'Firm commitment — they buy the book whether or not anybody wants it.',
    line: 'The lowest range and highest fee. The deal receives a real floor.',
  },
  {
    id: 'cp', name: 'Corvin Partners', desk: 'Media & Technology', kind: 'Mid-market',
    low: 18, high: 25, feePct: 5, firm: true,
    condition: '270-day lock-up on founder shares, up from the usual 180.',
    line: 'A fair range and firm book, in exchange for holding your own shares longer.',
  },
];

export const streamingTickerOptions = (name: string) => {
  const clean = (name || 'EMPIRE').toUpperCase().replace(/[^A-Z]/g, '');
  const vowelless = clean.replace(/[AEIOU]/g, '');
  return [...new Set([
    clean.slice(0, 3),
    clean.slice(0, 4),
    vowelless.slice(0, 3) || clean.slice(0, 3),
    `${clean.slice(0, 2)}X`,
  ])].filter(value => value.length >= 2).slice(0, 4);
};
