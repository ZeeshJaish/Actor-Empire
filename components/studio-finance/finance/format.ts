/* Money formatting. One implementation so the same amount never renders two
   different ways on two different rows. */

const UNITS: Array<[number, string]> = [
  [1_000_000_000, 'B'],
  [1_000_000, 'M'],
  [1_000, 'K'],
];

/** $18.42M · $680K · $412 — compact, never more than 4 significant figures. */
export function money(value: number, opts: { sign?: boolean } = {}): string {
  const n = Math.abs(value);
  let body = `$${Math.round(n)}`;
  for (const [size, suffix] of UNITS) {
    if (n >= size) {
      const scaled = n / size;
      const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      body = `$${trimZeros(scaled.toFixed(decimals))}${suffix}`;
      break;
    }
  }
  const negative = value < 0;
  if (negative) return `−${body}`;
  return opts.sign && value > 0 ? `+${body}` : body;
}

/** Preserve cents for player-set monthly prices while retaining compact
 * formatting for larger forecast values. */
export function moneyPrecise(value: number): string {
  const n = Math.abs(value);
  if (n >= 1000) return money(value);
  const body = `$${n.toFixed(2).replace(/\.00$/, '')}`;
  return value < 0 ? `−${body}` : body;
}

/** Signed money for anything that moved: +$5.00M / −$220K. */
export function delta(value: number): string {
  return money(value, { sign: true });
}

/** 26.6% — one decimal, never a runaway float. */
export function pct(value: number, decimals = 1): string {
  return `${trimZeros(value.toFixed(decimals))}%`;
}

export function signedPct(value: number, decimals = 1): string {
  const body = pct(Math.abs(value), decimals);
  /* A change of −0.4% rounds to "−0%", which reads as a loss that did not
     happen. Anything that rounds to nothing is reported as nothing. */
  if (Number.parseFloat(body) === 0) return body;
  if (value > 0) return `+${body}`;
  if (value < 0) return `−${body}`;
  return body;
}

export function compactCount(value: number): string {
  if (value >= 1_000_000) return `${trimZeros((value / 1_000_000).toFixed(1))}M`;
  if (value >= 1_000) return `${trimZeros((value / 1_000).toFixed(1))}K`;
  return String(Math.round(value));
}

function trimZeros(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
}

/** Weeks → the way a person would say it. */
export function runwayLabel(weeks: number): string {
  if (!Number.isFinite(weeks)) return 'Indefinite';
  if (weeks >= 520) return '10 yr +';
  if (weeks >= 104) return `${Math.floor(weeks / 52)} yr`;
  return `${Math.max(0, Math.round(weeks))} wk`;
}
