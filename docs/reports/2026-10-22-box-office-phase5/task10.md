# Task 10 — Incremental movie rights and streaming handoff

## Value and contract boundaries

`valueCinemaStreamingRights` is a pure cents-based quote. Unique interest is bounded by buyer reach; deferred interest overlaps the interested audience rather than being added again. Observed playback reduces the remaining opportunity. Later windows decay current intentions; short licences reduce contribution. The output cannot grant rights, cash, viewers or subscribers.

`quoteCinemaRightsForBuyer` supplies canonical population/economy, real buyer markets and pricing, country/language readiness, retained cinema awareness/waiting evidence, observed overlap, buyer treasury and pending obligations. It checks the exact offered country/window/exclusivity scope through the existing rights authority. New room offers have a hard fixed-exposure ceiling across guarantee and funding, including revisions and reload. Small bids can exist below the former $1M floor; there is no forced clearing bid.

Existing signed contracts and legacy rooms are not repriced. Acceptance of a newly valued structured movie offer revalidates current scope, buyer resources and value. Series keep their existing bidding economics.

## Changed producer and consumer paths

| Caller | Result and money owner |
| --- | --- |
| `ReleaseWizard.startAuction` | Applies buyer-specific quotes to new movie platform inputs; existing room/session authority builds offers. No payment from quote creation. |
| `ReleaseWizard` structured acceptance | Revalidates the exact accepted offer before the existing canonical registration and cash settlement. Previously signed source offers retain idempotent behavior. |
| `gameLoop.createTheatricalStreamingBids` | Shared movie value replaces automatic budget/gross bids; series branch remains separate. |
| `gameLoop` independent subsidiary close | Exact affordable countries/dates are validated before existing registry and rich producer settlement; no duplicate cash owner. |
| `gameLoop` offered-role/outside-studio cinema close | `settleQuotedCinemaStreamingSale` registers exact rights and moves buyer debit plus NPC producer credit in the same candidate once; unknown producers use the retained external-producer cents ledger. Missing destinations reject before any registration. |
| `gameLoop` no-buyer close | Archives the owned movie once instead of leaving an empty bidding state. |
| `worldStreamingViewing` | Actual playable subscription/free catalogue controls funded viewing; bounded deferred preference competes within that envelope. No added audience pool or payment. |
| `recordCinemaStreamingAudience` after weekly viewing | Retains maximum observed country homes across weeks/routes/platforms, without adding repeat starts as unique homes. Normalization and succession rebasing preserve valid evidence. |
| `readCinemaWorldAudience` | Uses conservative observed streaming catch-up as estimated familiarity, using exact IDs and existing cohort bounds. |
| `normalizeLiveTitle` and forecast projection | Use canonical signed country/date windows for theater waiting. Expired contracts cannot revive a stale worldwide release summary. |

`roleLogic.ts` did not need a new handoff owner: offered-role movie releases already enter the common cinema close in `gameLoop`. Archive snapshots now retain original language. Existing cash/entitlement settlement authorities remain responsible for player-owned UI sales and independent label deals.

## Behavioral evidence

18 rights groups cover purity, affordability after obligations, no-rights/already-signed cases, overlap exhaustion, late/short windows, valuable local small films versus unseen expensive packages, exact/shared country licences, future restrictions, room revision/reload caps, readiness/date/language/route gates, conserved actual streaming viewing, malformed evidence normalization, household-history succession, both cash legs and idempotent JSON reload, signed theater-wait windows, and actual no-buyer archiving across two game weeks.

The required rights transaction/calendar and Original readiness/playback audits also pass in the isolated final snapshot. The full WE6 regression passes 400 annual checkpoints. `verification.json` records all commands/results. A read-only targeted review returned no remaining actionable findings; review fixes are represented in the behavioral suite.

No population-wide hit quota, lifetime gross ceiling or calibrated rights payout target is claimed. Contribution, decay, reach and overlap approximations are explicit Phase 6 calibration inputs.
