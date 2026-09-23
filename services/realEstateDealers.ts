/* ============================================================================
   DEALERS — who is showing you the property.

   Zeesh's framing: Amazon or Flipkart. Not a velvet rope, not a tier you unlock
   — just different shops with different stock, and you can walk into any of
   them. A dealer may well have something cheap and something absurd on the same
   page; what makes them different is taste, not price.

   Which matters, because a dealer that is only a price filter with a name is
   two extra taps before anyone sees a number. These have to earn the tap, so
   each one is given a clear character and an overlap with the others — the same
   loft can sit on two lists, the way a real listing does.

   The catalogue is hand-written, per his instruction: no generator. A property
   not claimed by any dealer would be unbuyable, so the check at the bottom
   fails the build rather than letting one go quietly missing.
   ========================================================================== */

import { PROPERTY_CATALOG } from './lifestyleLogic';
import type { Property } from '../types';

export interface RealEstateDealer {
  id: string;
  name: string;
  /** What this shop is for, in a line a player reads before tapping in. */
  line: string;
  /** Decides the shelf. Every property must be claimed by at least one. */
  stocks: (property: Property) => boolean;
}

const PRESTIGE_CITIES = new Set(['Monaco', 'Dubai', 'Paris', 'London', 'Aspen', 'Caribbean', 'Iceland', 'France']);
const isLuxury = (property: Property) => property.price >= 6_000_000;
const isStarter = (property: Property) => property.price < 1_500_000;

export const REAL_ESTATE_DEALERS: RealEstateDealer[] = [
  {
    id: 'MERIDIAN',
    name: 'Meridian & Vale',
    line: 'Trophy homes and the kind of address that is its own sentence.',
    stocks: property => isLuxury(property) || PRESTIGE_CITIES.has(String(property.location || '')),
  },
  {
    id: 'KEYSTONE',
    name: 'Keystone Residential',
    line: 'First places and second places. Nothing here needs explaining.',
    stocks: property => isStarter(property) || property.price < 4_000_000,
  },
  {
    id: 'HARBOURLINE',
    name: 'Harbourline Commercial',
    line: 'Offices, lofts and floors that were built to be worked in.',
    stocks: property => /loft|studio|penthouse|tower|warehouse|office/i.test(property.name),
  },
  {
    id: 'ATLAS',
    name: 'Atlas Global',
    line: 'Everything, everywhere, at whatever the market is asking.',
    stocks: () => true,
  },
];

export const getRealEstateDealer = (id: string): RealEstateDealer | undefined => (
  REAL_ESTATE_DEALERS.find(dealer => dealer.id === id)
);

export const getDealerStock = (dealerId: string): Property[] => {
  const dealer = getRealEstateDealer(dealerId);
  return dealer ? PROPERTY_CATALOG.filter(dealer.stocks) : [];
};

/* A property no dealer carries cannot be bought, and would simply be absent
   from the game with nothing to say so. */
(() => {
  const orphans = PROPERTY_CATALOG
    .filter(property => !REAL_ESTATE_DEALERS.some(dealer => dealer.stocks(property)))
    .map(property => property.name);
  if (orphans.length > 0) {
    throw new Error(`Properties no dealer carries: ${orphans.join(', ')}`);
  }
})();
