/* ============================================================================
   RENT, OR BUY.

   A building has been two separate ideas since Stage 2: the place, and how you
   hold it. The places have carried `tenures` all along — 151 of them can be
   rented, 128 can be owned, and **92 can be either**, which is the decision
   this file finally prices.

   Renting is cheap to start, and it never stops: a weekly bill, a term, and a
   renewal that comes round again. Owning is a wall of capital and then quiet —
   no rent, no renewal, and the only way into a campus, which is 64 to 108 racks
   against the 38 of the largest room anyone will lease you.

   The price is **five years of the equivalent rent**, Zeesh's number. That is
   the whole point of putting it in one constant: a player can work out the
   payback in their head, decide, and be right. Cheaper and renting is pointless;
   dearer and owning is a trophy nobody reaches.
   ========================================================================== */

import type { StreamingFacilityLeaseSnapshot } from '../types';
import type { StreamingTenure } from './streamingSitePlaces';

/** Five years of rent buys the building. */
export const PURCHASE_YEARS_OF_RENT = 5;
const WEEKS_PER_YEAR = 52;

/** What it costs to buy a building outright, given what it would rent for.

    Deliberately a plain multiple rather than a curve. A player who can multiply
    a weekly rent by two hundred and sixty knows exactly what they are looking
    at, and every building in the game answers the same way. */
export const purchasePriceFor = (weeklyRent: number): number => (
  Math.max(0, Math.round((weeklyRent * WEEKS_PER_YEAR * PURCHASE_YEARS_OF_RENT) / 1_000) * 1_000)
);

/** How long until buying has paid for itself, in weeks. Constant by
    construction, and stated so a screen never has to claim it. */
export const paybackWeeks = (): number => WEEKS_PER_YEAR * PURCHASE_YEARS_OF_RENT;

/** How a room is held. Older saves carry no tenure and can only ever have been
    rented, because owning did not exist when they were written. */
export const tenureOf = (lease: StreamingFacilityLeaseSnapshot | undefined | null): StreamingTenure => {
  if (!lease) return 'RENTED';
  if (lease.tenure === 'CLOUD' || lease.tenure === 'OWNED') return lease.tenure;
  return 'RENTED';
};

export const isOwned = (lease: StreamingFacilityLeaseSnapshot | undefined | null): boolean => tenureOf(lease) === 'OWNED';

/* --- renewals ---------------------------------------------------------------

   The reward for owning is an absence: an owned building never appears on the
   list below, ever again. That is a better argument than any number, and it
   only works because the list exists. */

export interface StreamingLeaseTerm {
  /** The week this contract runs out. Null when nothing ever expires. */
  expiresAtAbsoluteWeek: number | null;
  /** Negative once overdue. Null when nothing ever expires. */
  weeksRemaining: number | null;
  /** What signing on for another term would cost up front. */
  renewalCost: number;
  /** True inside the last eighth of the term, which is when a renewal stops
      being trivia and starts being a decision. */
  dueSoon: boolean;
  expired: boolean;
}

/** A term that never runs out. Owning, and the honest answer for a lease whose
    start week a save never recorded — guessing there would evict somebody over
    a field that did not exist when their career began. */
const PERPETUAL: StreamingLeaseTerm = {
  expiresAtAbsoluteWeek: null,
  weeksRemaining: null,
  renewalCost: 0,
  dueSoon: false,
  expired: false,
};

export function leaseTerm(
  lease: StreamingFacilityLeaseSnapshot | undefined | null,
  absoluteWeek: number,
): StreamingLeaseTerm {
  if (!lease || isOwned(lease)) return PERPETUAL;
  const started = lease.startedAtAbsoluteWeek;
  if (typeof started !== 'number' || !Number.isFinite(started)) return PERPETUAL;
  const weeks = Math.max(1, Math.round(lease.contractWeeks || 1));
  const expiresAtAbsoluteWeek = started + weeks;
  const weeksRemaining = expiresAtAbsoluteWeek - absoluteWeek;
  return {
    expiresAtAbsoluteWeek,
    weeksRemaining,
    /* Renewing costs the deposit again, not the setup — the room is already
       built out and the fit-out does not happen twice. */
    renewalCost: Math.max(0, Math.round(lease.depositCost || 0)),
    dueSoon: weeksRemaining > 0 && weeksRemaining <= Math.max(4, Math.round(weeks / 8)),
    expired: weeksRemaining <= 0,
  };
}

/** Everything coming due, soonest first — the ops list. Owned rooms are absent
    by construction rather than filtered, which is the point. */
export function leasesComingDue<T extends { id: string; cityId: string; lease?: StreamingFacilityLeaseSnapshot }>(
  facilities: readonly T[],
  absoluteWeek: number,
): Array<{ facility: T; term: StreamingLeaseTerm }> {
  return facilities
    .map(facility => ({ facility, term: leaseTerm(facility.lease, absoluteWeek) }))
    .filter(entry => entry.term.expiresAtAbsoluteWeek !== null)
    .sort((a, b) => (a.term.weeksRemaining ?? 0) - (b.term.weeksRemaining ?? 0));
}
