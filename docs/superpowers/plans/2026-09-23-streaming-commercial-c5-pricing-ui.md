# C5 Pricing UI and Launch Gates Implementation Plan

**Follow-up, 2026-09-24:** Continue pricing redesign work from the [P0–P6 Pricing and Offer Editor Rebuild Roadmap](2026-09-24-streaming-pricing-rebuild-roadmap.md). This C5 plan records the earlier implementation, not visual acceptance of its card/control layout or the new automatic-CPM requirement.

> **For agentic workers:** Execute inline in this task; do not delegate or commit the existing dirty worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make launch pricing edit the C1-C4 commercial offer, show C4-qualified forecasts, and stop commissioning an unwatchable offer.

**Architecture:** Define the Launch is the pricing editor. The cinematic pricing entry point routes to it rather than maintaining a second sellable-plan model. The world forecast and shared title-access evaluator remain the authorities for money and entitlement; UI adapters only format their outputs.

**Tech Stack:** React, TypeScript, Vite, esbuild audit scripts.

**Spec:** `docs/superpowers/specs/2026-09-23-streaming-commercial-offers-design.md`

## Global Constraints

- Keep the existing card and sheet visual language, mobile width, native controls, and old-save fields.
- Three selectable core models; hybrids are optional; no new sponsored-title or fan-funding pricing controls.
- Premium access is a per-offer benefit with 0-4 early weeks; passes remove ads, not paid-title charges.
- One rental and one purchase price for every eligible title.
- Forecast cash is conditional on playable rights and delivery; target CPM is not realized CPM.
- Every opening-day country needs a playable route at commissioning; draft exploration remains available.
- Preserve unrelated dirty files. Do not commit or push without a fresh request.

---

### Task 1: Canonical offer editor

**Files:** `components/studio-finance/components/launch/StepPricing.tsx`, `components/studio-finance/finance/launch.ts`, `components/StreamingDefineLaunchExperience.tsx`, `components/StreamingPlatformHQ.tsx`; audit in `scripts/audit-streaming-commercial-c5.ts`.

- [x] **Step 1: Write failing audit** for core-switch persistence, six-plan limit, hybrid toggles, per-offer benefits, and passes. Example: after `createStreamingPricingForCoreModel(base, 'STORE')`, assert `projectStreamingCommercialOffers(next).storeOffer !== null` and `coreModel === 'STORE'`.
- [x] **Step 2: Run audit and confirm failure** from missing UI adapter behavior.
- [x] **Step 3: Implement** a pure settings adapter for each editor action; bind the existing cards and controls to it. Route the HQ cinematic pricing button into Define Launch pricing.
- [x] **Step 4: Re-run audit, TypeScript, and relevant existing C1-C4 audits.**

### Task 2: Truthful forecast presentation

**Files:** `services/worldEconomy/worldStreamingPricingForecast.ts`, `components/studio-finance/finance/launch.ts`, `components/studio-finance/components/launch/StepPricing.tsx`, `components/studio-finance/components/launch/StepBlueprint.tsx`; same audit.

- [x] **Step 1: Write failing audit**: free-only and store-only forecasts expose distinct conditional lines; unplayable-title scenarios are labelled conditional rather than booked cash; ad target/fill/realized are separately labelled.
- [x] **Step 2: Run audit and confirm expected failure.**
- [x] **Step 3: Build one forecast adapter** from `WorldStreamingLaunchPricingForecast`; remove launch UI's synthetic non-subscription accrual; show country rows and unknowns explicitly.
- [x] **Step 4: Re-run audit, TypeScript, and build.**

### Task 3: Commissioning gate and regression

**Files:** `services/streamingLaunch.ts`, `services/streamingOpeningCatalogue.ts` or a focused offer-coverage helper; same audit.

- [x] **Step 1: Write failing audit** for an opening country with titles but no current route, a rights-valid route, and a second country lacking access.
- [x] **Step 2: Run audit and confirm expected failure.**
- [x] **Step 3: Add a commissioning readiness item** using canonical title/offer/rights checks for every opening-day country. Leave the draft wizards navigable.
- [x] **Step 4: Re-run all C0-C5 audits, TypeScript, build, and `git diff --check`; record remaining failures.**
