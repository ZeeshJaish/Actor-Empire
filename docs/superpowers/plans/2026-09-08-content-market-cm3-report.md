# Content Market CM3 Completion Report

**Completed:** September 8, 2026

## Player-visible result

Content Market now separates listed-price content, delayed private offers, and live buyer auctions. `Live auctions` opens a saved auction floor for eligible films, series, and catalogue collections. The room uses one shared countdown and a compact lower offer console for upfront payment, seller backend, marketing, and an allowed future-original promise.

The leading contract is determined by the seller's complete deterministic valuation rather than cash alone. Rival platforms revise or leave under one clock. A bid revision replaces the prior treasury commitment; withdrawal, loss, no-sale, or invalidation releases it. A win signs the canonical rights once and returns the title or complete allocated collection to the normal catalogue.

Auction outcomes arrive through Messages and open the exact persisted room. Existing Production House seller bidding remains unchanged.

## System behavior delivered

- Saved immutable lot scope, seller priorities, rival ceilings, bids, clock, history, and result.
- Fifteen-second opening clock, diminishing material-event extensions, and a forty-five-second hard cap.
- Wall-clock reconciliation on restore and forced terminal resolution during week progression.
- Existing treasury commitment, rights compatibility, canonical contract, package allocation, and catalogue establishment boundaries reused.
- Direct purchase and private negotiation disabled for auction-designated rights.
- Title wins and all-or-nothing collection wins, with the exact winning collection guarantee allocated across component contracts.
- Enforceable future-greenlight obligation satisfied only by a later original with the named producer; breach uses the existing compliance consequence path.
- AI winners receive canonical rights and pay from their saved platform reserve.
- Bounded normalized session persistence for old-save compatibility.

## Verification evidence

- `npm run audit:content-market-cm1` — passed.
- `npm run audit:content-market-cm2` — passed.
- `npm run audit:content-market-cm3` — passed.
- `npm run audit:content-market-cm3-browser` — passed at 390px and 320px, including bidding and exact Message deep link.
- `npm run audit:content-market-browser` — passed across CM1, CM2, and CM3.
- `npm run audit:streaming-active-bidding-phase2` — passed; seller-side bidding regression preserved.
- `npm run audit:streaming-rights-compatibility-phase3` — passed.
- `npm run audit:streaming-catalogue-packages-phase5` — passed.
- `npm run audit:streaming-rights-transactions-phase6` — passed.
- `npm run audit:streaming-weekly-loop-phase10` — passed.
- `npm run build` — passed with only the repository's existing Vite chunk-size and mixed-import warnings.
- `git diff --check` — passed.

## Scope boundary

CM4 upcoming auctions, watchlists, and wider news/social reactions are intentionally not included. No commit or push was performed.
