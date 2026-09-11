export type RightsWindowKind = 'FIRST' | 'SECOND' | 'PERPETUAL';
export type Exclusivity = 'EXCLUSIVE' | 'SHARED';
export type SellerAppetite = 'CASH' | 'BACKEND' | 'MARKETING' | 'RELATIONSHIP';
export type Basis = 'Adjusted gross' | 'Net receipts' | 'Gross receipts';
export type Localization = 'Dubs + subtitles' | 'Subtitles only' | 'Original only';
export type Renewal = 'First option' | 'Automatic' | 'None';
export type Availability = 'LIVE' | 'CLOSING' | 'OPEN' | 'OPENS' | 'PRESALE' | 'WATCH';
export type ReleasePath = 'POST-THEATRICAL' | 'DAY AND DATE' | 'STREAMING ONLY' | 'FESTIVAL ONLY' | 'UNRELEASED' | 'LIBRARY';

export interface Territory {
  id: string;
  code: string;
  name: string;
  flag: string;
  weight: number;
  status: 'FREE' | 'HELD' | 'BLOCKED';
  note?: string;
}

export interface Terms {
  shape: 'GUARANTEE AND BACKEND' | 'PURE GUARANTEE' | 'BACKEND HEAVY';
  mg: number;
  recoupable: boolean;
  backendPct: number;
  basis: Basis;
  backendCap?: number;
  termWeeks: number;
  window: RightsWindowKind;
  excl: Exclusivity;
  scope: string;
  localization: Localization;
  renewal: Renewal;
  marketing?: number;
  bonusAt?: number;
  sublicense?: boolean;
  sequel?: boolean;
}

export interface PriorRun {
  rating: number;
  votes: number;
  boxOffice?: number;
  openingWeekend?: number;
  screens?: number;
  awards?: string;
}

export interface CollectionRow {
  id: string;
  name: string;
  year: number;
  alloc: number;
  share: number;
  genre: string;
  hue: number;
  runtime: string;
}

export interface Lot {
  id: string;
  sourceId: string;
  sourceKind: 'LISTING' | 'COLLECTION' | 'AUCTION' | 'UPCOMING' | 'STUDIO';
  title: string;
  year: number;
  runtime: string;
  format: 'FILM' | 'SERIES' | 'COLLECTION';
  genre: string;
  seller: string;
  sellerKind: 'STUDIO' | 'SALES AGENT' | 'PLATFORM RESALE' | 'YOUR STUDIO';
  appetite: SellerAppetite;
  hue: number;
  logline: string;
  synopsis: string;
  path: ReleasePath;
  prior?: PriorRun;
  heat: number;
  heatWhy: string[];
  terr: Territory[];
  listed?: Terms;
  mode: 'LISTED' | 'AUCTION' | 'STUDIO' | 'UPCOMING';
  avail: Availability;
  closesInDays?: number;
  chain?: string[];
  rows?: CollectionRow[];
  opensWeek?: number;
  deliversWeek?: number;
  note?: string;
  unavailableReason?: string | null;
  linked?: boolean;
}

export interface Offer {
  mg: number;
  recoupable: boolean;
  backendPct: number;
  basis: Basis;
  backendCap?: number;
  termWeeks: number;
  window: RightsWindowKind;
  excl: Exclusivity;
  localization: Localization;
  renewal: Renewal;
  marketing: number;
  sublicense: boolean;
  sequel: boolean;
  markets: string[];
}

export const yearsOf = (weeks: number) => Math.round((weeks / 52) * 10) / 10;
export const termLabel = (weeks: number) => `${weeks} weeks · ${yearsOf(weeks)}y`;
export const reachOf = (terr: Territory[]) => {
  const all = terr.reduce((sum, market) => sum + market.weight, 0);
  const free = terr.filter(market => market.status === 'FREE').reduce((sum, market) => sum + market.weight, 0);
  return all > 0 ? Math.round((free / all) * 100) : 0;
};

export const BASIS_WORTH: Record<Basis, number> = {
  'Gross receipts': 1.35,
  'Adjusted gross': 1,
  'Net receipts': 0.45,
};
export const WEIGHTS: Record<SellerAppetite, { cash: number; back: number; mkt: number }> = {
  CASH: { cash: 1, back: 0.35, mkt: 0.15 },
  BACKEND: { cash: 0.55, back: 1, mkt: 0.2 },
  MARKETING: { cash: 0.65, back: 0.4, mkt: 1 },
  RELATIONSHIP: { cash: 0.6, back: 0.55, mkt: 0.55 },
};

export const offerFrom = (terms: Terms): Offer => ({
  mg: terms.mg,
  recoupable: terms.recoupable,
  backendPct: terms.backendPct,
  basis: terms.basis,
  backendCap: terms.backendCap,
  termWeeks: terms.termWeeks,
  window: terms.window,
  excl: terms.excl,
  localization: terms.localization,
  renewal: terms.renewal,
  marketing: terms.marketing || 0,
  sublicense: Boolean(terms.sublicense),
  sequel: Boolean(terms.sequel),
  markets: [],
});

export const readOffer = (lot: Lot, offer: Offer): number => {
  const weights = WEIGHTS[lot.appetite];
  const base = lot.listed?.mg || 5_000_000;
  const cash = ((offer.mg * (offer.recoupable ? 0.72 : 1)) / base) * weights.cash;
  const listedBackend = lot.listed?.backendPct || 30;
  const backend = ((offer.backendPct * BASIS_WORTH[offer.basis] * (offer.backendCap ? 0.78 : 1)) / Math.max(1, listedBackend)) * weights.back;
  const marketing = (offer.marketing / Math.max(400_000, base * 0.25)) * weights.mkt;
  const concessions = (offer.excl === 'EXCLUSIVE' ? 0.22 : 0)
    + (offer.termWeeks / 260) * 0.18
    + (offer.sequel ? 0.14 : 0)
    + (offer.sublicense ? 0.09 : 0)
    + (offer.renewal === 'Automatic' ? 0.1 : offer.renewal === 'First option' ? 0.05 : 0)
    - (offer.localization === 'Dubs + subtitles' ? 0.07 : offer.localization === 'Subtitles only' ? 0.02 : 0);
  return cash + backend + marketing - concessions;
};

export const askOf = (lot: Lot): number => lot.listed ? readOffer(lot, offerFrom(lot.listed)) + 0.1 : 1.05;
export const verdictOf = (lot: Lot, offer: Offer): { tone: 'good' | 'warn' | 'bad'; line: string } => {
  const delta = readOffer(lot, offer) - askOf(lot);
  if (delta >= 0.18) return { tone: 'good', line: 'This is a strong position. The seller is likely to sign.' };
  if (delta >= 0) return { tone: 'good', line: 'This clears their current asking shape.' };
  if (delta >= -0.14) return { tone: 'warn', line: 'Close. Expect a counter on the term they value most.' };
  return { tone: 'bad', line: 'This reads as an opening position, not a deal.' };
};

export const repFor = (seller: string) => {
  const seed = [...seller].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { name: 'Head of Rights', role: 'Business Affairs', hue: seed % 360 };
};

export const sayOf = (lot: Lot, tone: 'good' | 'warn' | 'bad'): string => {
  const subject = lot.appetite === 'CASH' ? 'the guarantee'
    : lot.appetite === 'BACKEND' ? 'the backend'
      : lot.appetite === 'MARKETING' ? 'the release commitment'
        : 'the long-term relationship';
  if (tone === 'good') return `The shape works. ${subject} is where it needs to be.`;
  if (tone === 'warn') return `We are close, but I need more on ${subject}.`;
  return `This is too far from what we need on ${subject}.`;
};
