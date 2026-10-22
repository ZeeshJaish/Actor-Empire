# Existing Distributor Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans task by task. Review the shared calculation and settlement boundaries before completion.

**Goal:** Make existing distributor bookings and earnings respond fairly to finite supply, observed demand and cinema/streaming competition.

**Architecture:** Keep the pure weekly market and its existing exactly-once settlement. Add a stable existing-network footprint, a pure booking policy and a read-only streaming-choice projection. Persist compact optional run observations only.

**Tech Stack:** TypeScript, deterministic aggregate simulation, esbuild Node audits, Vite/Playwright App verification.

**Spec:** `docs/superpowers/specs/2026-10-22-distributor-booking-design.md`

## Global constraints

- Existing chains/release choices only; no ownership/expansion feature.
- No hard earning cap, budget return guarantee, hit quota or forced maximum run age.
- Historical cash/receipts/contracts stay immutable. Upgrade all known prior cinema tuning versions.
- Preserve unrelated dirty changes and verified save-generation durability.

## Task 1: Existing supply and booking policy

Files: `services/boxOffice/boxOfficeSupply.ts`, new `boxOfficeBooking.ts`, `boxOfficeTypes.ts`, `boxOfficeProfiles.ts`, `boxOfficeMarket.ts`, `boxOfficeMigration.ts`; audit `scripts/audit-box-office-booking.ts`.

- [x] Write and run failing partial-world/seed/population footprint invariants and nonviable-booking regressions.
- [x] Implement registry-wide fixed apportionment; keep current automatic country prices.
- [x] Implement public-demand opening, observed renewals, contribution-based shared scheduling and bounded local closure. Preserve denied demand and discovery.
- [x] Upgrade prior tuning safely; validate optional booking observations and replay receipts.
- [x] Run booking, market, audience, migration and integration audits; review this boundary.

## Task 2: Rival streaming choice

Files: new `services/boxOffice/boxOfficeAlternatives.ts`, audience adapter/types/forecast projection and `boxOfficeAudience.ts`; audit `scripts/audit-box-office-alternatives.ts`.

- [x] Write failing accessible/foreign/unplayable, subscription-overlap, genre-fit and same-title-window controls.
- [x] Project only existing offered/funded or free playable alternatives without creating customers, views or cash.
- [x] Combine home-viewing choice once; keep missing-access neutrality and cinematic-event urgency.
- [x] Run forecast/privacy, rights, playback, audience and money-conservation regressions.

## Task 3: Full-world calibration

Files: new `scripts/fixtures/boxOfficeFullWorld.ts`, `scripts/audit-box-office-full-world.ts`, profile coefficients and report under `docs/reports/2026-10-22-box-office-revamp/distributor-booking/`.

- [x] Build complete canonical countries/cohorts, seeded rotating NPC cinema competition and actual streaming-offer/evidence projections.
- [x] Measure paired small-film, campaign, stars, universe, crowding, access and economy controls; include all-in theatrical costs.
- [x] Tune behavior from measured bottlenecks; retain possible profitable small films and exceptional events without a forced outcome quota.
- [x] Report p10/median/p90, run censoring, weeks to 95% of gross, weeks with shows and final local closure. State that local decision windows include quiet/discovery observations. Verify no fixed gross cap separately.

## Task 4: Live safety, App and performance

- [x] Run all affected cinema/payment/save audits and a long run with existing active/closed releases, all owner routes, repeats, signed rights, reload and failed-write retry.
- [x] Verify the normal actual App release, financial and audience screens against committed settlement.
- [x] Compare matched baseline/current early and late weekly processing without concurrent heavy audits.
- [x] Run TypeScript, web build, frozen English comparison and independent source review.
- [x] Record source hashes, preserved unrelated paths, reproduction commands, measured outcomes and remaining physical-device limitations.

## Progress

Started on the existing `codex/streaming-tap-lag` checkout, HEAD `bb029e5`. The initial 183 dirty files and exact tracked diff are backed up under `/private/tmp/actor-distributor-booking-20261022/`. Baseline market audit: 36 groups pass; full-world opening diagnostic is 197 countries / 2,363 cohorts / 1,729 pools. No commits or pushes requested for this revision.

Implementation checkpoint: supply/booking and rival-choice source boundaries reviewed; 24 cinema suites and 10 streaming/save suites pass. Real owned-studio App route passes including reserve refund replay and 320px financial/audience presentation. Full-world four-seed matrix, ordinary career, existing-save soaks and matched performance are still in progress; no completion claim yet.

Safety follow-up: a deterministic interleaved-read test reproduced a separate player/manifest snapshot race. IndexedDB now reads both in one transaction; real browser tests pass both concurrent promotion and deliberate-tampering recovery. This does not relax verification or settlement. The first 112-week ordinary strategy did not reach an opening and remains recorded as failed; the next career verification uses fully cash-funded genre training to 100 through the existing action. Concurrent host work changed unrelated App/game-loop/stock sources during this run; preserve it and freeze matched snapshots for the final performance comparison.

Calibration is complete: 76 conditional runs, 2,383 focal title-weeks, 197 countries and 2,363 cohorts; 52 paired tendency checks pass. All runs close naturally before the observation horizon. The ordinary funded career reaches a real paid opening in 115 weeks; five authored existing-save routes pass 130 additional actual engine weeks. Full App and matched performance completion remain separate gates.

Final gates pass: full App, all 37 affected suites, 245 actual engine/save weeks, TypeScript, web build, frozen English and independent source review. Four booking/occupancy replays match original economic results. Seeded matched Node p95 is +6% early / +5% late; actual App p95 improves in both fixtures. A profiled rival scan is reduced without changing its 1,704-row projection. The Node late median remains about 13% higher; stress saves remain heavy and physical-device performance unverified. See `docs/reports/2026-10-22-box-office-revamp/distributor-booking/README.md` for results, source hashes, prior failed attempts and reproduction. No commit or push performed.
