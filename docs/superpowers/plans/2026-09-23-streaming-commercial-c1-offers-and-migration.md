# Streaming Commercial C1 Offers and Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user requested inline work; do not delegate.

**Goal:** Represent the three core streaming business models and optional offer benefits in a versioned, save-safe projection without changing live revenue or audience coefficients.

**Architecture:** Existing `streams`, `plans`, `ads`, and `rentals` remain the stored price/feature authority and the current economy's inputs. A small versioned metadata object records the leading model, ad-free pass intent, and offer benefits without copying prices. A pure projection resolves that data into subscription, free-ad, and store offers for player and AI; the canonical save parser preserves explicit empty arrays rather than inventing subscription plans.

**Tech Stack:** TypeScript, Node assertions, esbuild audit scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-09-23-streaming-commercial-offers-design.md`

## Global Constraints

- C1 does not change world customer allocation, weekly viewing, ad fill, realized CPM, treasury, rights entitlement, or launch UI.
- `ads.cpm` remains the legacy live-calculation input in C1; the new projection calls it `targetCpm` as future player intent, but only C4 changes settlement.
- The current subscription monthly/annual billing paths and custom plans remain intact.
- Legacy sponsorship and patron fields are preserved, not newly offered or erased.
- Do not commit or push C1 unless the user explicitly asks.

---

### Task 1: Versioned intent and deterministic normalization

**Files:**
- Modify: `types.ts` (`OwnedStreamingPricingConfiguration` and related types)
- Modify: `services/streamingPricingEconomy.ts` (`normalizeStreamingPricingConfiguration`)
- Create: `scripts/audit-streaming-commercial-c1.ts`
- Modify: `package.json` (add `audit:streaming-commercial-c1`)

**Interfaces:**
- Consumes: existing normalized pricing fields and up to six saved subscription plans.
- Produces: optional saved `commercialOffers` metadata with `schemaVersion: 1`, `coreModel`, ad-free pass prices, and benefit settings. `normalizeStreamingPricingConfiguration` fills/validates it idempotently.

- [x] Write an audit assertion that a legacy `['ads']` configuration with `plans: []` normalizes to advertising-led intent, preserves all prices/streams, and is identical after a second normalization. Run it and observe the missing-metadata failure.
- [x] Add metadata types and normalization. Infer a legacy core in priority order: active subscriptions with plans, then advertising, then rentals/store, else internal `LEGACY`. Respect a valid explicit core if that stream is active. Bound benefit lead weeks to 0–4; retain only existing plan IDs; keep pass variants disabled with `null` prices unless explicitly configured.
- [x] Run the C1 audit until the normalization case passes. Add malformed metadata and six-plan regressions; observe red/green for the inconsistent ad-only intent case.

### Task 2: Pure offer projection and explicit core starter

**Files:**
- Create: `services/streamingCommercialOffers.ts`
- Modify: `scripts/audit-streaming-commercial-c1.ts`

**Interfaces:**
- Consumes: `OwnedStreamingPricingConfiguration` and `normalizeStreamingPricingConfiguration`.
- Produces: `projectStreamingCommercialOffers(pricing)` with a versioned `coreModel`, active subscription plan list, optional free-ad offer, optional uniform rent/buy store offer, pass intent, and `targetCpm`; `createStreamingPricingForCoreModel(pricing, coreModel)` prepares one core model without deleting inactive saved price settings.

- [x] First assert that a subscription-led configuration projects custom plan IDs/prices, an ad-led one projects one free offer with zero subscription plans, and a store-led one projects one uniform rent/buy offer. Run red against the absent projection.
- [x] Implement the projection without mutating input. It must never call a market/revenue routine and must not represent `OPEN_ACCESS` as a subscription plan.
- [x] Cover all three explicit core starters in the initially red projection audit. Implement the starter so only the selected core stream is active initially; inactive plan definitions and uniform prices remain available if the player later changes strategy.

### Task 3: Saved-game and AI representation adapters

**Files:**
- Modify: `services/streamingCanonicalState.ts` (`normalizePricingConfiguration`)
- Modify: `scripts/audit-streaming-commercial-c1.ts`
- Read: `services/worldEconomy/worldStreamingOffers.ts`, `services/saveMigration.ts`

**Interfaces:**
- Consumes: raw old/new save pricing and AI `commercialConfiguration` from `getWorldStreamingOffers`.
- Produces: a normalized saved pricing object with explicit empty ad/store plans preserved, missing legacy fields defaulted safely, and C1 projection available equally to player and AI.

- [x] Write a save migration test: explicit `streams: ['ads']`, `plans: []` remains ad-only after `migratePlayerSave`, JSON serialization, and a second migration; a truly missing `plans` field still receives legacy subscription defaults. Run red before editing the parser.
- [x] Change the parser to distinguish absent arrays from present empty arrays, and pass versioned metadata through its validator. Do not change existing world offer generation or activate pure AI strategies in the weekly economy yet.
- [x] Test AI configuration projection and pure ad/store strategy fixtures through the same projection helper; assert the current live AI field still uses its pre-C1 strategy until C3–C4.

### Task 4: Regression and handoff

**Files:**
- Create: `docs/superpowers/reports/2026-09-23-streaming-commercial-c1.md`
- Modify: this plan's checkboxes when verified

**Interfaces:**
- Consumes: C0 fixture and existing focused audits.
- Produces: C1 exact save/economy deltas and remaining C2–C4 limitations.

- [x] Run `npm run audit:streaming-commercial-c1`, `npm run audit:streaming-commercial-c0`, `npm run audit:streaming-pricing-world`, `npm run audit:streaming-billing-cohorts`, `npm run audit:world-streaming-we6`, `npm run audit:world-economy-we8-save`, a targeted TypeScript check, and `npm run build` sequentially where build output could race type checking.
- [x] Record every pass/failure, C0 numeric comparison, save round-trip, AI parity boundary, and `git diff --check` result. Do not claim the ad-only live revenue bug is fixed in C1.
