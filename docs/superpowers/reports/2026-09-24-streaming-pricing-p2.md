# Streaming pricing P2 implementation

**Date:** 2026-09-24  
**Status:** Implemented and technically verified; visual acceptance remains with the user.

## Delivered

- Subscription editing groups picture quality, stream count, extra benefits, and ad experience. Exclusive options resolve deterministically; legacy conflicts collapse to the higher tier. Ad-free follows the actual advert flag, and an orphaned early-access chip cannot promise access without its saved benefit.
- The store card offers **Everyone** or **Selected members**, with per-plan eligibility. Rental and purchase prices remain uniform across eligible titles; publisher rights are a separate requirement.
- Store eligibility lives in the canonical commercial offer. Missing fields in older saves remain public; an explicitly malformed policy fails closed. Removing an eligible plan leaves member-only access with zero eligible plans rather than silently opening the store.
- World audience allocation, launch forecast, player weekly sales, AI buyer pools, and saved player transactions use the same restriction. Weekly player transactions retain the source buyer plan and recheck active membership before recording an entitlement.
- A later restriction does not remove a previously purchased title or unexpired rental; original rights and expiry rules still apply.

## Verification

`audit:streaming-pricing-p2`, C1–C6 commercial audits, P1 audit, focused TypeScript checks, and production build passed. The mobile pricing lab was checked at 319px: grouped/locked features, member-plan selection, conditional early-week options and inline pass price were visible and operable. The lab changes no career and resets on reload.

## Deliberately deferred

P3 handles slider responsiveness and forecast simplification. P4 replaces player-controlled target CPM with the agreed market/system resolver. This phase does not claim either change.
