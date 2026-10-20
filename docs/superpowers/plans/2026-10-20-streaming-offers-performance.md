# Streaming Offers and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Functional and consistent private/collection offers, premium outcome UI, and substantially lower streaming work with a 5,000-title library.

**Architecture:** Keep canonical transactions current and atomic. Use explicit caller-owned read indexes and bounded immutable presentation reuse. Reuse the canonical per-component collection signer for negotiated collection settlement rather than introducing parallel ownership truth.

**Tech Stack:** React, TypeScript, Vite, Node/esbuild service and SSR audits; CUA production browser QA.

**Spec:** docs/superpowers/specs/2026-10-20-streaming-offers-performance-approved.md

## Global Constraints

- Preserve durable save generation verification, current/previous recovery and processed-week persistence.
- Cached presentation is not authorization. Current rights, country/window/mode, funds, energy and idempotency checks stay on actions.
- Expiry/production/localization/pricing/network/world changes invalidate dependent reads.
- Do not silently drop owned titles or erase legacy contracts.
- Actual Anshu save must not be reset, purchased from or advanced during disposable testing.
- Use exact same pinned 5,000-title fixture for before/after. Report immediate paint and later long tasks.
- Main local server remains the correct checkout on port 5174 and user browser stays open.
- No universal Android/iPhone claim. No artificial waiting timers or disabled durability to improve measurements.

### Task 1: Indexed catalogue reads and stable forecast reuse

**Files:** services/streamingCatalog.ts; services/streamingContentAvailability.ts; services/streamingOpeningCatalogue.ts; services/streamingPresentationInputs.ts; services/worldEconomy/worldStreamingPricingForecast.ts and closely required read helpers; components/StreamingPlatformHQ.tsx; components/StreamingDefineLaunchExperience.tsx; new focused scripts/audit-streaming-5000-read-index.ts and optional focused helpers.

**Interfaces:** Preserve public fresh defaults and existing `createStreamingCatalogueReadContext(player, previous?)`. Add explicitly prepared indexes/context inputs where required, never a mutable-player authorization cache. Existing component callbacks and canonical action signatures stay valid.

- [x] Write failing tests for one-time world-title conversion/licence grouping in a read batch, full output parity across title source precedence and rights modes, current invalidation and same-result reuse across step/network-draft-only updates.
- [x] Capture RED output with `esbuild ... --bundle --platform=node --loader:.csv=text --loader:.css=empty` and run the resulting audit. Use actual canonical availability/coverage results, including changed rights/expiry/country/offer/production and mutable-fixture fresh-default cases.
- [x] Replace full-pool map/filter/find per title with indexes built once per current batch; index licences/production as required. Reuse country membership/route keys without per-title full country serialization.
- [x] Share/reuse compatible presentation preparation between HQ, Define and Build. Keep dependent network/rehearsal forecasts current. Bound title previews instead of resolving all titles before slicing.
- [x] Verify complete cold/current projection equality, targeted catalogue/infrastructure/market rights audits and focused Node measurements with the pinned fixture. Do not run heavy browser/build work in parallel with timing capture. Profile residual hot paths before any worker decision.
- [x] Commit only this task's files and provide implementation report with RED/GREEN, commands, output, measured evidence and any remaining bottlenecks.

### Task 2: Canonical collection private offers and consistent new terms

**Files:** services/streamingContentMarket.ts; services/streamingRightsMarketplace.ts; a focused collection negotiation helper if needed; services/ownedStreamingPlatform.ts negotiation normalization; types.ts optional collection negotiation snapshot; relevant weekly/save handling only where required; scripts/audit-streaming-collection-private-offers.ts and focused fixtures.

**Interfaces:** Existing `submitContentMarketPrivateOffer(player, sourceId, terms)` must accept individual listing or a current non-auction collection. Existing `signStreamingRightsDeal(player, negotiationId)` and revision/response APIs must route appropriately. Export `getContentMarketPrivateOfferDefaults(player, sourceId): StreamingRightsTermsInput | null` so UI can map supported canonical defaults for either source. Confirm final interfaces to controller early.

- [x] Write failing normal-service cases: collection offer submission, no upfront charge, response after processed weeks, signing all components, preserved custom money/term/clauses, one fee/energy charge, duplicate signing, save/reload of pending deal, counter/revision and stale component/country/window refusal.
- [x] Observe RED before implementation. Test exact custom guarantee (e.g. 123456789), non-finite/negative/unsafe/out-of-range values and no silent money clamp/quarter-million rounding. Keep realistic limits explicit; collection aggregate must not be silently truncated.
- [x] Add a canonical persisted collection negotiation snapshot with stable IDs/signatures. Evaluate complete package offers, process responses with the existing weekly machinery and sign through the existing all-or-nothing component grant/contract path. Preserve economic allocation totals and grant constraints.
- [x] Remove Marketing from new incoming/outgoing private terms and response scoring/default generation. Preserve existing signed obligations and original grants. Enforce valid backend capability, clause ownership and exact country/window/mode coverage at submission and settlement.
- [x] Verify targeted rights transactions, collection packages, private offer lifecycle, save migration/idempotency and conditional insufficient-cash/energy cases. Record offered vs persisted vs signed exact money and rollback behavior on one incompatible component.
- [x] Commit only this task's files and provide RED/GREEN report, public interfaces and constraints the UI must obey.

### Task 3: Supported offer editor and cinematic auction results

**Files:** content-market-exact/ExactContentMarket.tsx; content-market-exact/ContentMarket.module.css; content-market-exact/model.ts; components/StreamingContentMarket.tsx; components/StreamingBuyerAuctionRoom.tsx; other active rights offer editors only for term consistency; focused SSR/component audits and disposable QA fixture.

**Interfaces:** Consume Task 2's generic submit/default APIs. UI field names map exactly to canonical signed terms; collection fixed or per-component restrictions remain visible. No nonexistent interaction or promised acceptance.

- [x] Write failing render/behavior cases for no new Marketing editor controls, custom upfront input, supported controls/explanations, functional collection send adapter and preserved presentation hold/skip.
- [x] Keep money draft text in local state, parse/validate exact dollars and show readable summary. Preserve input editing states; do not save/recalculate the world per keystroke. Replace fixed 250K plus/minus-only editing. Invalid input cannot submit or silently change amount.
- [x] Add accessible info controls for sequel rights, sublicensing and renewal, with clear supported behavior and keyboard/touch handling. Preserve fixed seller rights and current backend eligibility.
- [x] Restore subtle title/winner colour gradient and premium cinematic outcome composition. Preserve all terminal outcome truth and final terms, collection counts, subtle acquired hint, reduced motion and three-second hold after presentation.
- [x] Verify narrow phone and desktop layout in one batched inspection and at most one visual correction/confirmation round. Test real disposable collection and single-title offer UI through current services. Keep actual Anshu save untouched.
- [x] Commit only this task's files and report focused tests, visuals and any remaining limitations.

## Final integration and verification

Controller runs required focused checks once after integration: TypeScript, production build, durable save/migration boundaries, rights/collection negotiation audits, presentation tests. Compare the same 5,000-title before/after browser sequence: Build entry, region tap, rack update and later tasks, Define entry/Ident, bidding amount controls and idle tasks. Include 52/104/1,040 controls where useful, current-save read-only smoke, preserved 5,000 licences/terms/registry through normalize/reload/tick, and independent whole-change review. Fix load-bearing findings before handoff. Leave local port 5174 and browser ready; preserve checkpoint tag.

### Task 4: Active auction timer and presentation reuse

Integrated 5,000-title idle observation found repeated full-platform normalization on clock ticks even after amount edits became fast. Within the approved bidding-room performance scope, narrow timer/session preparation and presentation dependencies; stop terminal timer work. Preserve exact rival/clock/reconcile/anti-sniping outputs and all fresh canonical bid/settlement/withdraw/save checks. Focused RED/GREEN work-count/output/invalidation and 5,000-title retention tests precede implementation. Controller repeats bounded production idle window plus existing amount controls and final affected checks. See the final verification report for raw reproduction and measurements; no app-persistence bypass or cached authorization.
