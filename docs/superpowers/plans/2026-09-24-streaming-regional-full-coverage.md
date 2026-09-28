# Streaming Regional Full Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a maximum cloud plan physically cover a selected region and fully serve its eligible entered-market demand without billing discarded compute.

**Architecture:** Keep market entry and physical reach separate. Preserve paid virtual cloud compute through the Build-to-canonical adapter, then use one threshold-based coverage contract for served clusters. Derive the slider end from a deterministic regional-footprint solver and keep the existing provider step-up price.

**Tech Stack:** React, TypeScript, Vite, esbuild audit scripts, canonical streaming services.

**Spec:** `docs/superpowers/specs/2026-09-24-streaming-regional-full-coverage-design.md`

## Global Constraints

- Green network reach may cross country borders; unentered countries create no customers or revenue.
- Existing in-country data-residency requirements remain in force.
- Existing saves and purchases are not deleted, rerolled, or charged again.
- Provider standard ceilings are pricing breakpoints, not cloud service caps.
- Preserve unrelated uncommitted files; do not commit or push without a separate request.

---

### Task 1: Prove and repair paid cloud preservation

**Files:**
- Modify: `scripts/audit-streaming-launch-s1-coverage.tsx`
- Modify: `components/streaming-transplant/StreamingBuildWizardExperience.tsx`
- Modify: `components/studio-finance/finance/placer.ts`
- Review: `services/streamingFacilities.ts`, `services/streamingRegionalNetworkPlan.ts`

**Interfaces:**
- Consumes: `placeRegion`, `buildSelectionFromDraft`, `createCanonicalBuildData`, `cloudWeeklyCost`.
- Produces: `BuildSel.facilities` whose cloud `installedRacks` and lease capacity equal the charged Build draft compute.

- [x] Write an integration assertion using real North America lab listings at the old slider end and at 445 compute. Reconstruct both selections and assert the larger quote has correspondingly larger **canonical** cloud compute and capacity, never just a larger bill.
- [x] Run `npm run audit:streaming-launch-s1-coverage` and record the expected failure at canonical cloud compute or capacity.
- [x] Preserve virtual cloud compute through Build conversion while retaining physical-room fitting; distribute above-standard units to regional cloud sites with the existing step-up rate.
- [x] Rerun the coverage and region-placer audits; assert retained compute, capacity and quote reconcile. Also cover expansion of an existing saved cloud allocation's power/bandwidth envelope.

### Task 2: Make full service mathematically attainable

**Files:**
- Modify: `scripts/audit-streaming-launch-s1-coverage.tsx`
- Modify: `services/streamingNetworkCoverage.ts`
- Review: `services/worldEconomy/worldStreamingCustomers.ts`, `services/worldEconomy/worldStreamingViewing.ts`

**Interfaces:**
- Consumes: `deriveStreamingNetworkCoverage({ facilities, openingCountryIds, fibreState })`.
- Produces: `StreamingCountryCoverage.coveredShare` as the sum of cluster shares whose signal meets the standard; no fractional deduction for a cluster that already passes.

- [x] Add strong, weak, and unopened-country coverage fixtures.
- [x] Observe the strong fixture fail below one from fractional service math.
- [x] Count each signal-qualified cluster fully; keep capacity limiting separate.
- [x] Rerun coverage, world/build, commercial customer/viewing and launch-rehearsal audits.

### Task 3: End the slider at real regional saturation

**Files:**
- Modify: `components/studio-finance/finance/placer.ts`
- Modify: `components/studio-finance/components/build/RegionBoard.tsx`
- Modify: `components/studio-finance/styles/network.css`
- Modify: `scripts/audit-streaming-build-pricing-interaction.tsx`

**Interfaces:**
- Consumes: `RegionView`, `BuildData`, `BuildDraft`, `CloudProviderId`, `placeRegion`, `audiencePlaces`, `expectedStandard`.
- Produces: `regionalCloudMaximum(data, region, providerId, draft): number`, memoized by data, region, provider, fibre and existing servers. The UI preserves a saved draft above this target.

- [x] Test absence of Extend, saved-plan range retention, and all six cloud-only regional maxima across eligible providers.
- [x] Observe the old Extend control in the Build UI audit before the change.
- [x] Compute a conservative deterministic per-site signal target over all supported regional clusters, cache it across slider updates, and reduce it where existing servers already qualify clusters. Provider availability still disables unsupported cloud choices; residency and load remain separate service gates.
- [x] Replace `sliderMax`, remove Extend, retain the normal-rate ceiling as a price breakpoint, and label physical reach separately from entered-market service.
- [x] Rerun UI/placer audits and inspect the phone-width Build lab.

### Task 4: Reconcile economy and persistence boundaries

**Files:**
- Modify: `scripts/audit-streaming-launch-s1-coverage.tsx`
- Modify: `scripts/audit-streaming-commercial-c6.ts`
- Review: `services/worldEconomy/worldStreamingCustomers.ts`, `services/worldEconomy/worldStreamingViewing.ts`, `services/streamingNetworkQuote.ts`, `services/saveMigration.ts`

**Interfaces:**
- Consumes: canonical `coverage.countries`, `BuildSel.facilities`, provider quote.
- Produces: regression proof that unentered country IDs never enter customer or receipt calculation, and that save/reopen retains the exact paid cloud compute.

- [x] Add US-only cross-border fixtures: Canadian physical signal without a Canadian offer or receipts; country coverage contains only filed markets.
- [x] Round-trip a 193-site worldwide cloud network through save normalization, preserving facility count, compute, provider, and weekly rent. Increase the former 48-facility save cap to 1,200 (bounded above the 1,059-site full catalogue) and the placement cap to 256 to prevent silent deletion.
- [x] Run the focused commercial, coverage, placer, UI, save, build, TypeScript, and diff checks.

## Review checkpoint

The original 267→445 screenshot case is the acceptance gate: increased spend must buy retained canonical capacity and better reach; the new slider maximum must close the eligible service gap. If geography or legal residency prevents a truthful full-region result, the UI must say so and the task must be reported as incomplete rather than paint false green.
