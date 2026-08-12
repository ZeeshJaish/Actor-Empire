# Phase 16 — Complete Rights Marketplace

Status: complete.

Phase 16 closes the core streaming-management game with one canonical rights
system shared by the Content Room, Market Room, weekly processor, treasury,
growth campaigns, title telemetry, and future corporate events.

## Player flow

1. Open the Rights Exchange from the Content Studio rights hotspot, the active
   rights ledger, or the Market Room competition wall.
2. Scan a deterministic four-week Market Floor containing studio windows,
   platform-to-platform catalog trades, and eligible outgoing sublicenses.
3. Enter a persistent Deal Room against a named counterparty and visible,
   financially bounded rival bid.
4. Negotiate for up to three rounds. The player can revise territory, window,
   term, exclusivity, guarantee, split, marketing promise, control clause,
   renewal, sublicensing, and sequel/franchise rights.
5. Accept a counteroffer or sign a cleared term sheet. Inbound guarantees debit
   company treasury exactly once; outgoing sublicenses credit treasury and
   reduce the buyer platform's modeled cash reserve.
6. Use the Contract Vault to track inbound rights, outgoing sublicenses,
   expiry countdowns, renewal options, and performance clauses.

## Contract truth

Schema v14 adds durable negotiation, sublicense, and obligation records. Each
advanced catalog license can preserve:

- studio or platform seller
- first, second, or permanent catalog window
- domestic, multi-region, or global territory
- exclusive or non-exclusive availability
- minimum guarantee and negotiated revenue split
- marketing guarantee
- viewership threshold and bonus
- renewal and sublicensing options
- sequel/franchise rights
- change-of-control notice or consent
- cancellation penalty

Permanent purchases use a non-expiring canonical window. Ordinary licenses,
sublicenses, and unfinished negotiations advance to expired state from absolute
game weeks without real-time waiting.

## Weekly compliance

Before a live platform week is committed, the rights service:

- expires due licenses, sublicenses, and negotiating windows
- measures marketing guarantees from applied Growth War Room spend for the
  contracted title
- measures viewership thresholds from canonical title-week telemetry
- marks obligations pending, on-track, satisfied, or breached
- adds a breached cancellation penalty to that week's operating cash cost
- records an idempotent ledger fact so the same breach cannot charge twice

This means the UI never injects viewers, cash, or success. It only creates a
contract that the existing simulation must satisfy.

## Change of control

The rights service includes an explicit change-of-control resolver for later
Phase 21 integration. A denied `CONSENT_REQUIRED` agreement terminates, applies
its stored penalty once, and removes catalog availability only when no other
active right covers the title. Notice-only and unrestricted agreements remain
valid.

## Visual and mobile contract

The exchange is a scene-first market floor with three physical zones:

- Market Floor
- Negotiation Table
- Contract Vault

Desktop uses two-column listing cards and a persistent live-table rail. Mobile
collapses to one-column cards, makes live tables horizontally scannable, keeps
44px actions, avoids wide data tables, and supplies reduced-motion focus-safe
states.

## Validation

- Phase 16 focused audit passes.
- Phase 1 through Phase 16 audits pass.
- TypeScript no-emit lint passes.
- Production build passes.
- Schema v13 saves migrate with empty Phase 16 collections.
- Acquisition, counteroffer, signature, sublicensing, renewal, obligation
  breach idempotency, and change-of-control termination are covered.

Phase 17 Technology Campus remains intentionally deferred.
