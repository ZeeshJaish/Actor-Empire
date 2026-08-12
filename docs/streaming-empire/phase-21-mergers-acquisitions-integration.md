# Phase 21 — Mergers, Acquisitions and Integration

Status: complete.

Phase 21 turns the five persistent Phase 20 rivals into a real corporate-
development market. A founder may scout a platform, value it, negotiate a
control proposal, verify the data room, face a resource-backed counterbid,
obtain governance approval, pass regulatory review, lock a reconciled capital
stack, sign through a fact-backed cinematic, and operate the integration over
canonical game weeks.

This is the only intentional path for acquiring a streaming platform. The
existing studio-acquisition guard still returns `STREAMING_PLATFORM_RESERVED`,
so ordinary studio stock-control code cannot silently buy or duplicate a
platform.

## Player flow

1. Enter **Acquisition Command** from the physical Market Room.
2. Compare real Phase 20 targets by subscribers, valuation signal, technology,
   catalog power, CEO posture, strategic fit and current cash pressure.
3. Scout one target and commission an independent value bridge.
4. Choose full acquisition or strategic merger, write the headline price and
   select commitments that survive signing.
5. Accept or revise a seller counter.
6. Commission diligence. The persistent data room exposes content liabilities,
   technical debt, churn exposure and change-of-control risk.
7. If a rival enters, see its CEO, bid, pursuit cost and exact player control
   price. The rival pays the pursuit cost from its own Phase 20 cash reserve.
8. Call the governance review. Founder control is advisory; a diluted or
   investor-nominee board can become binding.
9. Select a regulatory strategy and accept its actual asset-retention terms.
10. Lock treasury, debt or hybrid financing. Strategic mergers include visible
    equity consideration and founder dilution.
11. Choose one of eight integration doctrines and sign.
12. Watch or skip the signing ceremony, then manage the real weekly integration
    until retained audience, catalog and technology become operating assets.

## Valuation and diligence

The acquisition service reads the same world-company and rival records as
Platform Wars. Subscriber, catalog, technology, brand, debt and strategic
premium values are stored as integer dollars. Independent valuation and
diligence fees debit company treasury once and remain sunk if the founder walks
away.

Diligence findings are deterministic for the save and target. They persist
severity, narrative, value pressure and integration risk. Opening the screen
again cannot reroll a more favorable target.

## Offers and counterbids

Seller response uses the stored fair value, seller floor and explicit
commitments. A low proposal creates a durable seller counter; accepting it
advances the same case rather than creating a second deal.

A qualifying contested target can attract one Phase 20 rival. That rival must
exist, have real resources and pay a disclosed pursuit cost. Beating the bid
changes the final purchase price. The system never invents a counterbid after
signing and never lets an acquired company continue making independent rival
moves.

## Governance and regulatory review

The four durable commitments are:

- service continuity
- employee protection
- creator guarantee
- data separation

They affect seller support, director support, regulatory relief and integration
reserve. Directors vote from their persistent independence, founder
relationship and current board confidence. Rejected terms can return with more
protection; the vote is not a decorative modal.

Regulatory scrutiny reads player market share, target catalog concentration,
active regions and the commitment package:

- **Commitment package:** preserves most assets with funded behavioral
  remedies.
- **Asset carve-out:** guarantees a structural path by surrendering overlapping
  subscribers, catalog and technology.
- **Contest review:** cheapest and preserves the full deal, but can genuinely
  be blocked.

A blocked deal may be resubmitted with a different strategy. Subscriber,
catalog and technology retention percentages feed the exact assets transferred
at signing.

## Financing and control

Three funding sources are available:

- treasury
- acquisition debt
- hybrid

Debt capacity derives from company treasury, annualized operating revenue and
existing debt. Acquisition debt creates a real loan, principal, weekly interest
and capital-action record. A strategic merger may issue consideration equity
to target shareholders. The founder sees ownership before and after locking
the capital stack.

Signing only debits the treasury contribution and funded integration reserve.
Debt-funded consideration does not briefly appear as fake cash. Equity
consideration does not appear as revenue. An unaffordable stack remains
blocked.

## Eight integration doctrines

| Doctrine | Core tradeoff |
|---|---|
| Preserve brand | Highest audience trust, slower dual-company operation |
| Operate as sub-platform | Distinct programming identity on shared company rails |
| Merge catalogs | Fast content value, less technology capture |
| Build a bundle | Highest near-term retention with light platform surgery |
| Fully absorb | Maximum technology and operating control with high churn and outage risk |
| Retain technology only | Strong systems transfer with almost no audience or catalog |
| Retain catalog only | Library value without the full operating company |
| Sunset and migrate | One-platform end state with material migration churn |

Each integration persists its reserve, weekly cost, duration, subscriber
retention, catalog asset count, technology delta, acquisition effect, churn
effect and reliability risk. Active integrations enter the canonical weekly
cash, audience and playback calculations. Completion occurs exactly once and
converts retained technology into permanent operating health and branch levels.

## Transactional signing

Signing is atomic and idempotent:

- purchase consideration and reserve reconcile once
- debt and merger equity enter canonical finance once
- founder ownership updates once
- only regulator- and doctrine-retained subscribers transfer
- the target leaves the rival field
- its open rival moves expire
- one integration record is created
- one `STREAMING_PLATFORM_ACQUIRED` ledger fact is stored
- one `ACQUISITION_SIGNING` cinematic references that fact

Skipping or replaying the cinematic only changes presentation status. It
cannot change the price, assets, capital stack or subscriber transfer.

## Visual and mobile contract

Acquisition Command is a cinematic corporate-development floor, not a generic
SaaS dashboard:

- Market Room hero with acquisition hotspot
- radial target-fit dossiers
- ten-stage transaction rail
- value bridge and offer meter
- confidential commitment cards
- severity-coded data-room findings
- rival-counterbid takeover moment
- governance, regulatory and capital chambers
- visual capital-stack bar
- signing table and full-screen ceremony
- weekly integration progress and operating assets
- keyboard focus, status announcements, reduced motion and mobile layouts

The room reuses the existing Market Room visual asset and renders deal
instrumentation in CSS. No new raster asset was required.

## Persistence

Schema v19 adds the corporate-development aggregate:

- acquisition cases
- valuation and offers
- diligence findings
- counterbids
- governance approvals
- regulatory decisions
- financing stacks
- acquired platform IDs
- active and completed integrations

Compaction bounds cases and integrations for mobile-save safety. Schema v18
saves migrate to empty corporate-development collections without fabricating
transactions.

## Validation

```bash
npm run audit:streaming-acquisitions-phase21
npm run lint
npm run build
```

The focused audit covers schema migration, target parity, exactly-once scouting
and fees, seller counter, diligence, resource-backed rival bid, final control
price, governance, structural clearance, debt/equity/treasury reconciliation,
founder dilution, retained subscriber transfer, rival removal, signing
cinematic, weekly integration effects, exactly-once completion, the preserved
legacy studio guard, HQ wiring, responsive treatment and future-phase
boundaries.

IPO and public-company governance remain Phase 22. Crisis, security and shadow
operations remain Phase 23. Monetization remains development-free until the
community and product decision is locked.
