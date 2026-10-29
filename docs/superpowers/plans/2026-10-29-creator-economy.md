# Creator Economy and Spam Resistance Implementation Plan

> **For agentic workers:** Execute task-by-task with failing behavioral tests before each production change. This approved plan is being implemented in the current shared checkout, preserving dirty work.

**Goal:** Stop subscriber/library and cash snowballs, correct view accounting, and prevent upload/post stat farming while preserving earned balances and signed contracts.

**Architecture:** A read-only creator world snapshot supplies reachable internet audience, payment access, purchasing power and ad-market reference prices. A small additive creator ledger tracks weekly reach/spend and action rewards. YouTube growth shares one weekly audience across its library; future monetization uses engaged reach. Existing screens remain.

**Tech Stack:** TypeScript, React, esbuild audits, existing weekly engine and verified save-generation fixtures.

**Spec:** Approved design in this conversation; analysis evidence in `docs/superpowers/reports/2026-10-29-creator-economy-trace.md`.

## Global constraints

- Do not reset historical subscribers, followers, views, skills or money. Do not reprice accepted YouTube brand deals or other signed contracts.
- Do not debit streaming/cinema budgets for social reference pricing. Derive reach and affordability from existing world state, without a second population simulation.
- Preserve early discovery, quality rewards, evergreen income and useful paid energy. Additional same-week activity has diminishing audience/stat gains, rather than guaranteed wins or hard forced failures.
- No redesign. Keep current upload, integration, live, member, merch and social controls.
- Preserve all unrelated working-copy edits; do not commit/push unless asked.

## Task 1 — regressions and world-backed read model

Files: create `services/creatorEconomy.ts`, `scripts/audit-creator-economy.ts`; additive types in `types.ts`.

- [x] Assert current channel totals cannot fall from 305,000 event views to zero; assert quality zero ranks below quality one; assert library reach cannot grow without overlap.
- [x] Add `readCreatorWorld(player)` returning eligible internet people, eligible payers, reference RPM/CPM, purchasing power and a finite creator buyer budget, using worldPopulation/worldAudienceEconomy when present and a cached fallback only for absent legacy world state.
- [x] Add a persisted version-1 creator action ledger keyed by absolute week and platform. Positive stat rewards are limited to meaningful weekly actions; late posts keep bounded reach and cannot mint reputation/fame for no energy. Negative consequences still apply.
- [x] Test legacy data is read without being rewritten, lower world access/purchasing power lowers reach/value, and zero-subscriber discovery remains useful.

## Task 2 — channel growth, upload reach and lifetime accounting

Files: create `services/youtubeEconomy.ts`; modify `services/youtubeLogic.ts`, `views/mobile/YoutubeApp.tsx`, `services/youtubeEventLogic.ts`, narrow creator block in `services/gameLoop.ts`.

Interfaces: `resolveYoutubeWeek(player)`, `quoteYoutubeUpload(player,video,seededViews)`, `recordYoutubeViews(player,eventKey,views)`, and `applyCreatorAction(player,platform,key)`.

- [x] Replace per-video full-subscriber growth with one engaged weekly channel audience, apportioned by age and quality, with the channel pool reflecting recent viewer response; content plans and creator identity also affect publication. Conversions come from new reachable viewers and diminish near finite reachable audience.
- [x] Bootstrap a non-destructive lifetime view baseline from max(saved channel views, retained video total), then add deltas only. Keep bounded per-video recent histories and exact replay guards.
- [x] Base initial upload/trailer reach on active audience and quality plus a bounded plan/asset advantage. Apply weekly upload fatigue and bound positive trust/mood/stat awards. Do not grant negative cash or free uploads when energy is insufficient.
- [x] Route event and live view increments through the same lifetime counters. Preserve acceptance, payout, deadline and required content of saved deals; actual reach and subscriber estimates still obey audience limits.
- [x] Test same-week replay, date/year rollover, stale-video trust farming, repeated upload rewards, legacy inflated subscriber counters, event totals, trailer reach, and no source mutation.

## Task 3 — future monetization and repeat buyers

Files: `services/youtubeEconomy.ts`, `services/youtubeLogic.ts`, creator weekly block and existing UI handlers; preserve accepted offer values.

- [x] Price newly generated brand quotes with qualified engaged impressions and advertiser buying capacity. Retain saved base payout and penalty terms and normal expiration timing; quoted reach remains an estimate rather than an unlimited audience guarantee.
- [x] Price merch using buyer reach, unit price, unit manufacturing/fulfillment and setup costs. Use repeat-drop fatigue and a finite creator spending envelope. Retain six-week cooldown and atomic gross-minus-cost accounting.
- [x] Membership and live economics use the same affordable engaged audience. Preserve member price and historical earned cash; gradual engagement evolution must replace raw subscriber targets.
- [x] Verify 1K/1M/100M/10B counters with low/high engagement, poor/rich worlds, repeated drops, accepted old deals, and verified reload.

## Task 4 — other social spam and integration

Files: `services/instagramLogic.ts`, `views/mobile/XApp.tsx`, `App.tsx`, and shared creator ledger.

- [x] Keep Instagram's existing three-post UI rule, but replace percentage-only unsaturated conversion with finite reachable new audiences and diminishing post reach.
- [x] Enforce X energy eligibility before publishing, then limit same-week positive fame/reputation gains while allowing paid additional posts with diminishing reach.
- [x] Test repeated posts at zero energy, repeated safe-upload trust farming, cross-year weekly resets and independent platform follower identities.

## Task 5 — tuning and complete verification

Files: new curve/flow/browser audits, focused package commands and report.

- [x] Run multiple seed free/boosted cases, established engaged creators, dormant catalogues and legacy inflated counters. Record exact observed curves before freezing coefficients; distinguish subsystem projections from actual energy-verified careers.
- [x] Exercise upload → Next Week → offer acceptance/fulfillment → live/memberships → merch → verified save/reload with protected money/contracts/share assertions.
- [x] Run existing merch/event/social/sponsorship regressions; full TypeScript check and memory-guarded build. Verify actual 320/390px screens with existing controls and no new UI regressions.
- [x] Review the focused diff, confirm unrelated dirty work is preserved and report remaining limitations honestly.

## Completion evidence

See `../reports/2026-10-30-creator-economy-verification.md` and its JSON companion. The long-run simulations are explicitly creator-only; the weekly engine, verified save coordinator and rendered mobile paths have separate evidence. The user subsequently requested a scoped commit/push; unrelated working-copy changes are excluded.
