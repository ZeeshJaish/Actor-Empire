# Streaming Launch S4 Implementation Plan

> **For agentic workers:** Execute inline in this task. Preserve the existing dirty worktree; do not commit or delegate. Each task uses a failing audit before production edits.

**Goal:** Make player and AI pricing, targeted discounts, launch demand, revenue, and Build marketing forecasts tell one consistent, explainable story.

**Architecture:** The existing `streamingPricingEconomy` remains the sole discount evaluator. The world-offer registry supplies effective plan prices to competition and weekly customers; the launch forecast consumes the same allocations. The pricing wizard displays the derived price paths and projected shares without introducing a parallel economy.

**Tech Stack:** TypeScript, React, esbuild-backed audit scripts, Vite.

**Spec:** `docs/superpowers/plans/2026-09-23-streaming-launch-stabilization-roadmap.md` (S4); `docs/superpowers/reports/2026-09-23-streaming-launch-s0-baseline.md` (F06, F24).

## Global constraints

- Keep discount duration at 13 weeks and annual billing share at 33%; do not rebalance the simulation coefficients in S4.
- A discount set to Off must not affect demand even when a target plan remains selected.
- Preserve other commercial streams and existing save compatibility; no new mandatory saved field.
- Marketing drafts may change forecasts but only a commissioned reservation and subsequent weekly processing may affect treasury.
- Work only in S4; Build visual layout, server art, and poster migration belong to S5.

## Task 1 — Canonical targeted offer and annual revenue

**Files:** `scripts/audit-streaming-pricing-world-integration.tsx`, `services/worldEconomy/worldStreamingPricingForecast.ts`, `services/worldEconomy/worldStreamingOffers.ts`, `services/streamingPricingEconomy.ts` if a shared price-path helper is needed.

- [x] Add an audit with paid plans, 0% annual discount, a 50% introductory offer targeted only to Premiere. Its first-year total charges all untargeted plans at list price and Premiere at the blended promo/annual path. Confirm the audit fails against the old forecast.
- [x] Pass `streamingIntroOfferAppliesTo(planId, introOfferPlanId)` into the first-year calculation. Verify the audit passes and an Off discount has no effect.
- [x] Add an AI-offer audit that its published annual/intro percentages equal `commercialConfiguration` and its effective plan prices follow that configuration. Confirm it fails before editing AI offer construction.
- [x] Build the AI commercial pricing once, select a deterministic broad or plan-targeted intro strategy, then calculate effective plan prices from that same normalized configuration. Verify at launch and after week 13.

## Task 2 — Explain plan economics in the launch wizard

**Files:** `components/studio-finance/components/launch/StepPricing.tsx`, `components/studio-finance/styles/launch.css`, S4 audit file.

- [x] Add a render audit asserting paid-plan list, intro, annual, blended, subscriber share, and first-year values. Confirm the old rendering fails.
- [x] Use canonical `streamingDiscountedMonthly`, `effectiveMonthlyStreamingPlanPrice`, and `firstYearStreamingPlanRevenuePerSubscriber` for displayed values; show targeted versus untargeted and Off states explicitly. The intro price is for monthly-paying customers; the blended price reflects annual and monthly cohorts.
- [x] Explain that household budgets, features, rival offers, and catalogue affect allocations. A zero-share plan must be legible as a projection, not a disabled plan.
- [x] Check mobile-width wrapping and accessibility; preserve the existing other-stream controls.

## Task 3 — Demand, marketing, and weekly parity

**Files:** S4 audit file and only the smallest production files required by failing assertions.

- [x] Add scenario assertions for Premiere below Essential during intro, annual versus monthly, expired offer, ad-supported access, AI broad versus targeted offers, and allocation totals. Do not assert that cheaper Premiere captures all households.
- [x] Assert that changing a canonical player offer changes Build's country demand; changing unrelated draft UI state does not. Assert country demand sums to likely demand.
- [x] Verify marketing's country forecasts feed Build's rehearsal inputs. Assert saving a marketing draft leaves treasury unchanged, commissioning reserves rather than immediately spends the campaign, and weekly processing charges only actual spend.
- [x] Compare live customer-cell subscription revenue to the offer price path and world forecast. The broader WE5 weekly audit remains blocked by the existing source-text assertion documented in the S4 report.

## Task 4 — Final verification and report

**Files:** `docs/superpowers/reports/2026-09-23-streaming-launch-s4.md`.

- [x] Run focused S4 audit, pricing/world, Build/world, marketing, weekly-customer, and TypeScript/build checks. Record every failure, including pre-existing or unrelated ones, with command and evidence.
- [x] Inspect the real pricing component in an isolated phone-width fixture and confirm values/labels are readable. Full saved-career navigation was not exercised.
- [x] Record behavior, balance preserved, changed files, tests, remaining limitations, and S5 handoff. No commit/push unless the user asks.
