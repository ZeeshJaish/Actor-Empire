# Content Market CM3 Live Buyer Auctions Design

**Approved:** September 8, 2026

## Purpose

CM3 lets the owner of a streaming platform enter a live rights auction as a buyer. It complements CM1 direct purchases and CM2 delayed private offers without changing the existing Production House bidding room, where the player is the seller.

## Auction contract

Every auction lot freezes the canonical rights scope before entry: source title or catalogue, seller, exact countries, window, exclusivity, duration, availability, reserve, and permitted offer ranges. Impossible rights never appear. If a market is already licensed, the lot explicitly covers only the remaining eligible markets.

The seller may permit four competitive terms:

- guaranteed upfront payment;
- licensor backend percentage;
- marketing commitment;
- one future-original greenlight with the seller's studio.

Terms outside the lot's ranges are rejected. Each bid version replaces the player's prior version. The winner is the highest seller-value contract, not necessarily the largest upfront payment. Seller value uses guaranteed cash, expected backend, marketing support, enforceable future-greenlight value, platform relationship, and deterministic risk. Seller priorities and rival ceilings are persisted when the room opens and never reroll.

## Room experience

The mobile room uses an approximately 70/30 vertical split. The upper venue contains the shared countdown, leader, rival offer cards, rights scope, and market tape. A sticky lower console contains the player's internal valuation, available funds, current commitment, upfront controls, backend, marketing, future-greenlight choice, and `Place bid` action.

The initial room clock is 15 seconds. A material valid bid adds a diminishing extension while a 45-second hard cap prevents an endless room. All bidders use the same clock. Entering starts a binding session; leaving the page or backgrounding the app cannot reset it. Elapsed time is reconciled from a persisted wall-clock checkpoint when the room is restored.

## Money and obligations

The player's active bid reserves its guaranteed exposure through the existing streaming cost-commitment registry. Revision replaces that reservation. Being outbid, withdrawing, losing, no-sale, or invalidation releases it. A win settles the upfront payment once through the existing rights signing boundary.

Marketing and future-greenlight promises are not decorative. Marketing remains a canonical rights obligation. A future-greenlight creates a dated obligation that is satisfied only by commissioning an original with the named producer studio before its deadline; otherwise the existing obligation consequence system applies the disclosed penalty.

## Closing and synchronization

At zero seconds or the hard cap, the room closes automatically. The highest valid seller-value offer wins if it meets the reserve. Equal seller values prefer the earlier offer. A player winner is settled once, receives the licence and catalogue entry, and gets one actionable Message. An AI winner receives the canonical rights contract and pays from its actual platform reserve. A below-reserve room closes with no sale.

An auction-designated lot cannot simultaneously be bought directly or opened as a private offer. Final settlement rechecks funds, rights compatibility, listing signature, and session version. Individual titles and catalogue packages use the same auction boundary; catalogue settlement remains all-or-nothing with the existing per-title allocation ledger.

## Scope boundary

CM3 includes active buyer auctions, saved history, outcome Messages, title auctions, and catalogue auctions. CM4 upcoming/watchlist presentation and wider news/social reactions remain out of scope. No 400-year endurance run is required.

## Completion criteria

- The Content Market visibly separates direct listings, private offers, and live auctions.
- Flexible offer versions produce an understandable seller rank and deterministic rival response.
- Reservations prevent the same treasury from backing simultaneous commitments.
- Resume/background cannot reset time, bids, ceilings, or outcomes.
- Winners settle once; losers are not charged; below-reserve rooms may close unsold.
- Rights cannot sell through another Content Market method while assigned to a live auction.
- Title and catalogue wins create correct canonical rights records and allocations.
- Existing seller-side bidding remains behaviorally unchanged.
