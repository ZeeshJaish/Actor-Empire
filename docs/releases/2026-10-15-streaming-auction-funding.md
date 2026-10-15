# 15 October 2026 — Streaming auction and funding checkpoint

Checkpoint tag: `actor-empire-streaming-checkpoint-2026-10-15`

## What this checkpoint contains

This is the current Actor Empire working game on `main`. It builds on the already published selective rollback `8061321`, retaining the latest streaming, Content Market and finance systems. It is not a blanket restore of the September game.

### Auction experience

- Own platform has its brand colour, YOUR PLATFORM badge and distinct standing/leader styling; rivals retain their own colours.
- Improved late bids add three usable seconds, including beyond the former45-second wall. Rooms remain bounded at75 seconds. Duplicate, repeated withdrawn and weaker revised bids do not extend time.
- Auction marketing promises removed. Offers use upfront, optional backend and eligible unfinished-title production funding.
- Backend defaults to0/off and survives signing and save/reload without being silently raised.
- Exact auction price and backend are preserved at signing; private-negotiation rounding and hidden bonus obligations are not inherited.

### Production and future funding

- Future funding is off by default. Selecting it offers a binding funded production.
- Compact customization: new original / film sequel / series next season,1–3 titles, budget per title, unrestricted / live-action / animated / anime format.
- Deal Type and misleading Platform Rights percentage controls removed. New funded titles use the existing100% platform streaming-revenue-share default; this is not copyright ownership. Historical signed terms are preserved.
- Firm budgets reserve during bidding and pay once when production begins. Available funded productions begin in the signing week.
- Canonical production calendars and talent bookings connect funding to Originals Studio, actual delivery, licences, rights contracts and release scheduling.
- NPC future-funded productions have52 weeks. New player production-house future-season funding contracts have26 weeks; old funds without an explicit deadline retain104 weeks.
- Save/reload and repeated processing preserve funding terms, production IDs and payment idempotency.
- Failed deliveries release unspent reservations, preserve spent costs, cancel unfinished productions, release talent bookings and notify once. Late production starts cannot invent earlier progress.
- Legacy optional agreements still retain their saved terms/activation support. New offers no longer expose the optional-deal selector.

### Content Market refinement

- One scouting button: Scout price -> Confirm -> Scouting -> refreshed offers. First click does not spend; confirmation charges once. Extra confirmation panel removed.
- Saved Funding Deals card removed from Market. Agreement data and processing remain; a future dashboard placement is deferred.
- Existing paid rights, streaming revenue/cost accounting and the retained rollback baseline remain in place.

## Verification for this publication

- Production web build and full TypeScript check.
- Content Market CM1, CM2, CM3 and CM4 audits.
- Auction terms audit, including zero-backend signing/reload, usable late clock extension, no duplicate clock abuse, exact settlement and funding through the real weekly processor.
- Funded-production lifecycle audit, including count/format/lineage, Originals scheduling, serialized normalization each week, replay protection, deadline failure and reserve release.
- New26-week / legacy104-week funding deadline audit.
- Prior isolated browser checks at320px and390px: own-platform distinction, compact controls, no horizontal overflow, same-button scout confirmation, no first-click charge, exactly$450K charged and20 new offers generated.
- Whitespace/staged diff check. Real career save slots were not modified during fixture tests. Physical-device gameplay and store billing were not exercised in this feature pass.

## Remaining work / evidence boundaries

- Dashboard placement for funded agreements is intentionally deferred.
- The supplied NO SALE screenshot retains the earlier “Your complete contract leads the room” feedback. That stale result-screen text remains a follow-up; leading a room does not itself guarantee the seller's reserve is met. This publication does not claim that text issue is fixed.
- Existing build size/dynamic-import warnings remain. The previously documented shared-streaming archive audit limitation remains recorded in the rollback report; this checkpoint does not claim a fix.

## Recovery and evidence

The complete earlier buggy-streaming backup remains local as `actor empire bugy streaming`, described in [main working version](../superpowers/reports/2026-10-15-main-working-version.md). It is separate from this Git source checkpoint.

- [Selective rollback scope](../superpowers/reports/2026-10-15-selective-rollback.md)
- [Auction implementation report](../superpowers/reports/2026-10-15-auction-terms.md)
- [Latest UX refinement — takes precedence over earlier UI descriptions](../superpowers/reports/2026-10-15-auction-ux-refinement.md)
- Current UI screenshots: `output/playwright/auction-compact-funding-320.png`, `auction-compact-funding-390.png`, `auction-own-platform-320.png`, `market-inline-scout-320.png`.
- Historical intermediate UI screenshots: `auction-future-funding-390.png`, `auction-saved-option-320.png`. These show superseded controls/Market placement.
