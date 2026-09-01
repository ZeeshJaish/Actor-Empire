# Streaming Catalogue Packages Phase A5 Implementation Plan

**Status:** COMPLETE — verified 2026-09-01. See `../reports/2026-09-01-streaming-catalogue-packages-phase5-report.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add deterministic, rights-safe catalogue-package licensing for player studios, player-owned platforms, and AI platforms while retaining one canonical title contract per component.

**Architecture:** `services/streamingCataloguePackages.ts` owns package envelopes, eligibility, valuation, bounded hybrid allocation, atomic signing, management policy, and weekly proposals. Existing A3 compatibility constructs immutable component lots; existing A2 bidding supplies the shared clock and immutable revisions; accepted package rows become A1 title contracts and remain individual A4 renewal cases. Production House and EMPIRE+ render projections of the same registry.

**Tech Stack:** TypeScript, React, existing deterministic RNG/ID helpers, Node assertion audit scripts bundled with esbuild, Vite.

**Spec:** `docs/superpowers/specs/2026-09-01-streaming-catalogue-packages-phase5-design.md`

## Global Constraints

- `WorldState.streamingRightsContracts` remains the only legal rights authority; never create a package mega-contract.
- Packages contain 2–12 real completed titles; Rights Desk suggestions target 3–8.
- Future-output and multi-picture deals remain out of scope.
- Reuse the A2 15-second shared clock, six-second bidder cooldown, material-event extension, 45-second hard cap, and no player counteroffer or automatic winner.
- Revalidate every immutable A3 component lot before signature.
- Reserve `$1M` per title before applying the `15%` equal / `60%` independent reference / `25%` bidder-fit allocation.
- Keep each allocation between `50%` and `175%` of its floor-adjusted independent reference allocation.
- One package payment must reconcile exactly to title allocations, investor payouts, seller receipt, buyer cost basis, and canonical contracts.
- Custom Control remains the migration-safe default; protected packages require approval in every mode.
- Preserve unrelated dirty work. Do not stage, commit, or push unless the user explicitly requests it.

---

### Task 1: Package Domain Types and Save Defaults

**Files:**
- Modify: `types.ts:3900-4310`
- Modify: `types.ts:7339-7360`
- Modify: `types.ts:7695-8000`
- Test: `scripts/audit-streaming-catalogue-packages-phase5.ts`

**Interfaces:**
- Produces: `StreamingCataloguePackage`, `StreamingCataloguePackageComponent`, `StreamingCataloguePackageOfferRow`, `StreamingCataloguePackagePolicy`, `StreamingCataloguePackageRegistry`, and optional package fields on A2 sessions/offers.
- Consumes: existing streaming contract, rights-lot, offer, control-mode, project, and party types.

- [x] **Step 1: Write the failing schema/default audit**

Create an audit that asserts `INITIAL_PLAYER.world.streamingCataloguePackages` is `{}`, package session fields survive JSON transfer, and the default package policy is suggestion-only with sizes `3–6`, maximum automatic size `7`, maximum duration `104`, non-exclusive only, no automatic global scope, and valuation floor `0.85`.

```ts
assert.deepEqual(INITIAL_PLAYER.world.streamingCataloguePackages, {});
assert.equal(normalizeStreamingCataloguePackagePolicy(undefined).automation, 'SUGGEST_ONLY');
assert.deepEqual(normalizeStreamingCataloguePackagePolicy(undefined).preferredSize, { min: 3, max: 6 });
```

- [x] **Step 2: Run RED**

Run: `npx esbuild scripts/audit-streaming-catalogue-packages-phase5.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-streaming-catalogue-packages-phase5.mjs && node /tmp/audit-streaming-catalogue-packages-phase5.mjs`

Expected: FAIL because A5 types, registry, and normalizers do not exist.

- [x] **Step 3: Add compatible types and defaults**

Add schema-versioned package types with lifecycle `DRAFT | READY | LIVE | SIGNED | WITHDRAWN | INVALIDATED`, immutable component lots, exclusions, accepted commercial rows, result contract IDs, and digest facts. Extend `StreamingBiddingSession` with optional `subjectKind`, `cataloguePackageId`, and `componentLots`; extend `StreamingOfferVersion` with optional `cataloguePackageId` and `componentTerms`. Add optional `packagePolicy` to `StreamingRightsManagementState`, optional `streamingCataloguePackages` to `WorldState`, and `{}` to `INITIAL_PLAYER.world`.

- [x] **Step 4: Run GREEN and existing schema audits**

Run the A5 audit plus `npm run audit:streaming-contract-foundation-phase1` and `npm run audit:streaming-active-bidding-phase2`.

Expected: A5 default assertions pass and title sessions remain compatible.

---

### Task 2: Eligibility, Immutable Lots, and Reservations

**Files:**
- Create: `services/streamingCataloguePackages.ts`
- Modify: `scripts/audit-streaming-catalogue-packages-phase5.ts`

**Interfaces:**
- Produces: `normalizeStreamingCataloguePackageRegistry(value)`, `getEligibleStreamingCatalogueProjects(player, studioId, request)`, `createStreamingCataloguePackage(player, input)`, `getStreamingCataloguePackageReservationConflicts(registry, input)`.
- Consumes: `buildStreamingBiddingRightsLot`, canonical production/archive projects, commission ownership facts, and `createDeterministicId`.

- [x] **Step 1: Add RED fixtures for real titles and conflicts**

Cover completed player projects, outsourced commission exclusion, an already-licensed India title that retains remaining eligible markets, a fully blocked title, malformed IDs, duplicate selection, wrong studio, and overlapping `LIVE` reservation.

```ts
assert.deepEqual(created.package!.components.map(row => row.sourceProjectId), ['film-a', 'film-b']);
assert.equal(created.package!.excluded.some(row => row.projectId === 'commissioned' && row.code === 'NO_PROFIT_RIGHTS'), true);
assert.equal(created.package!.components.find(row => row.sourceProjectId === 'film-a')!.rightsLot.excludedCountryIds.includes('IN'), true);
```

- [x] **Step 2: Run RED**

Expected: FAIL because package composition APIs do not exist.

- [x] **Step 3: Implement normalized registry, canonical project adapter, composition, and reservation checks**

Use stable sorted project IDs; snapshot title, type, genre, language, studio, quality, audience, budget, performance, franchise/protection, and the A3 lot. Reject packages with fewer than two compatible titles. Reserve only overlapping project/country/window/exclusivity scopes while lifecycle is `LIVE`.

- [x] **Step 4: Run GREEN**

Expected: eligibility, partial-market, exclusion, and reservation cases pass deterministically.

---

### Task 3: Reference Valuation and Bounded Hybrid Allocation

**Files:**
- Modify: `services/streamingCataloguePackages.ts`
- Modify: `scripts/audit-streaming-catalogue-packages-phase5.ts`

**Interfaces:**
- Produces: `calculateStreamingCatalogueReferenceValue(component)`, `allocateStreamingCatalogueGuarantee(input)`, and `validateStreamingCatalogueOfferRows(input)`.
- Consumes: saved component snapshots, platform strategy inputs, and integer full-currency totals.

- [x] **Step 1: Add RED allocation tests with hand-derived expectations**

Assert an eight-title `$500M` fixture sums exactly, every row is at least `$1M`, every row lies within `50%–175%` of its floor-adjusted reference allocation, the same seed replays exactly, two platform-fit inputs produce different valid schedules, and malformed/missing/duplicate rows fail validation.

```ts
assert.equal(result.rows.reduce((sum, row) => sum + row.minimumGuarantee, 0), 500_000_000);
assert.ok(result.rows.every(row => row.minimumGuarantee >= 1_000_000));
assert.notDeepEqual(netflix.rows, prime.rows);
```

- [x] **Step 2: Run RED**

Expected: FAIL because allocation helpers are absent.

- [x] **Step 3: Implement floor-first hybrid weights and deterministic water-filling**

Normalize positive reference and bidder weights. Reserve `$1M * n`, allocate the remainder with `0.15/n + 0.60*referenceWeight + 0.25*bidderWeight`, clamp against the floor-adjusted reference bounds, redistribute clipped remainder among rows with available capacity, and use stable largest-remainder rounding. Return an explicit invalid result when total exposure cannot fund all floors.

- [x] **Step 4: Add title-specific backend schedule generation**

For each valid allocation, derive A2-bounded `licensorRevenueShare`, `platformRevenueShare`, `guaranteeRecoupment`, `backendCap`, expected royalty, and total exposure from saved uncertainty and bidder appetite. Never emit production or future-season funding.

- [x] **Step 5: Run GREEN and mutation checks**

Verify changing `60%` to `0%`, removing a bound, or assigning equal values would fail at least one real-behavior assertion.

---

### Task 4: Package-Aware A2 Bidding

**Files:**
- Modify: `services/streamingBidding.ts`
- Modify: `scripts/audit-streaming-catalogue-packages-phase5.ts`
- Regress: `scripts/audit-streaming-active-bidding-phase2.ts`

**Interfaces:**
- Produces: `createStreamingCatalogueBiddingSession(input)` and package-aware revision normalization through existing `advanceStreamingBiddingSession`, `acceptStreamingBiddingOffer`, registry restoration, and closing-table helpers.
- Consumes: allocator and package component lots from Tasks 2–3.

- [x] **Step 1: Add RED package-room tests**

Assert only platforms legal for every component and able to cover `$1M * titleCount` enter; the first real clearing offer has one row per component; revisions regenerate rows and preserve exact totals; closing never auto-selects; leaving preserves standing contracts; and title rooms remain unchanged.

- [x] **Step 2: Run RED**

Expected: FAIL on the package session factory and component terms.

- [x] **Step 3: Extend A2 without forking the clock engine**

Create the package factory as an adapter into the existing session state machine. Persist `subjectKind: 'CATALOGUE_PACKAGE'`, package ID, fixed component lots, aggregate offer fields, and per-title rows. Revisions call the hybrid allocator; offer normalization validates row totals and never labels a best offer.

- [x] **Step 4: Run GREEN plus A2/A3 audits**

Run A5, active-bidding A2, and rights-compatibility A3 audits.

---

### Task 5: Atomic Signing and Mirrored Accounting

**Files:**
- Modify: `services/streamingCataloguePackages.ts`
- Modify: `services/streamingRightsCore.ts`
- Modify: `scripts/audit-streaming-catalogue-packages-phase5.ts`

**Interfaces:**
- Produces: `acceptStreamingCataloguePackageOffer(player, input)` returning `{ player, package, contracts, changed, reason, detail }`.
- Consumes: A3 final validation, A1 registration, `calculateInvestorPayout`, business finance ledger, platform cash/state, and accepted A2 commercial rows.

- [x] **Step 1: Add RED exact-once and rollback tests**

Assert one buyer debit, one seller gross receipt, project-attributed investor payouts, matching buyer title cost basis, one package relationship event, one energy charge, canonical child contracts, and idempotent replay. Add failures for changed rights, insufficient cash, missing source, and malformed schedules and assert deep equality with the input player.

- [x] **Step 2: Run RED**

Expected: FAIL because atomic package signing does not exist.

- [x] **Step 3: Stage every child contract before committing**

Validate identity, lifecycle, session/offer, component membership, allocation schedule, seller control, buyer control/cash, and every exact A3 lot against cloned registries. Create one child contract per row with `cataloguePackageId`, bidding session ID, source offer ID, row guarantee/backend/recoupment/cap/scope, `PAID` settlement, and no production funding.

- [x] **Step 4: Apply one mirrored finance transaction**

Debit buyer once; credit seller with package guarantee minus project-specific investor payouts; update each project payout history; record one gross package ledger row plus investor rows; store title acquisition cost basis on the buyer content projection; spend one rights-deal energy cost; update the package and accepted session exactly once.

- [x] **Step 5: Run GREEN plus settlement regression**

Run A5, A1 contract, A2 economics, A3 compatibility, and contract-settlement audits.

---

### Task 6: Control Modes, Weekly Proposals, and Bulk Renewal Grouping

**Files:**
- Modify: `services/streamingCataloguePackages.ts`
- Modify: `services/streamingRightsCalendar.ts`
- Modify: `services/gameLoop.ts`
- Modify: `scripts/audit-streaming-catalogue-packages-phase5.ts`

**Interfaces:**
- Produces: `updateStreamingCataloguePackagePolicy`, `processStreamingCataloguePackagesWeek`, `getStreamingCataloguePackageDesk`, and `getStreamingCatalogueRenewalGroups`.
- Consumes: existing `StreamingRightsManagementState`, protected projects, A4 case registry, platform relationships, and absolute-week progression.

- [x] **Step 1: Add RED management/workload tests**

Assert one proposal per four-week cycle, at most three unresolved proposals, Strategy delegation only inside mandate, Custom suggestion-only default, Full manual behavior, protected/global-exclusive/large/long/under-floor packages never auto-sign, same-week replay no-op, and one grouped digest instead of title notices.

- [x] **Step 2: Add RED bulk-renewal grouping tests**

Assert child A4 cases remain separate but compatible cases with the same package/incumbent/window appear in one group; excluding a title leaves its original case untouched.

- [x] **Step 3: Run RED**

- [x] **Step 4: Implement bounded proposal cadence, policy decisions, digest, and grouping projection**

Call the package builder and existing A2 engine; do not create a parallel simplified contract path. Weekly delegated acceptance must use the same atomic signing service and persist its saved reason.

- [x] **Step 5: Wire weekly processing after A4 normalization and run GREEN**

Run A5, A4 Rights Calendar, week-processing save-safety, and game-loop-focused audits.

---

### Task 7: Replace Platform AI Equal-Split Catalogue Acquisition

**Files:**
- Modify: `services/platformAi/platformAiContentSourcing.ts`
- Modify: `services/platformAi/platformAiState.ts` only if normalization needs a title-cost projection field
- Modify: `scripts/audit-platform-ai-sourcing.ts`
- Modify: `scripts/audit-streaming-catalogue-packages-phase5.ts`

**Interfaces:**
- Produces: Platform AI `CATALOGUE_ACQUISITION` candidates and commits backed by the shared package builder, allocation rows, and canonical child contracts.
- Consumes: `buildPlatformAiStreamingCataloguePackage` and `commitStreamingCataloguePackageForPlatformAi` from the package service.

- [x] **Step 1: Add RED AI package tests**

Assert real same-studio projects, exact A3 scopes, runway, localization, catalogue gap, deterministic bidder fit, shared package ID, non-equal bounded allocations, and player-controlled platform rejection.

- [x] **Step 2: Run RED**

- [x] **Step 3: Replace ad hoc grouping/equal division with shared service calls**

Retain candidate ranking and weekly cadence. Preserve AI controller advantages only while AI-controlled. Populate plan rights IDs and per-title acquisition cost from the accepted schedule.

- [x] **Step 4: Run GREEN and Platform AI regressions**

Run A5, platform-ai-sourcing, rights-lifecycle, economy, release, scalability, and player-control audits.

---

### Task 8: Production House Package Desk and Package Bidding UI

**Files:**
- Create: `components/StreamingCataloguePackageDesk.tsx`
- Create: `styles/streaming-catalogue-packages.css`
- Modify: `components/StreamingRightsCalendar.tsx`
- Modify: `views/lifestyle/business/components/StreamingBiddingRoom.tsx`
- Modify: `scripts/audit-streaming-catalogue-packages-phase5.ts`

**Interfaces:**
- Produces: a `Packages` tab beside the Rights Calendar, package creator/review, active room, signed history, and expandable commercial schedule.
- Consumes: package desk projections and mutation functions from Tasks 2, 4, 5, and 6.

- [x] **Step 1: Add RED server-render tests**

Assert `Package Desk`, eligible count, selected titles, concise exclusions, exact remaining-market notice, package headline total, backend range, expandable title allocations, one accept action, and absence of `best offer`, horizontal table assumptions, or output-deal language.

- [x] **Step 2: Run RED**

- [x] **Step 3: Build the compact game-style UI**

Use one searchable title list, one scope/window/duration/exclusivity editor, proposal cards, and the existing bidding-room visual language. On mobile, show summary rows and disclose detailed terms vertically; never render 12 independent full-size offer cards.

- [x] **Step 4: Extend the offer slip for package rows**

For package offers, show total guarantee, title count, scope, duration, exclusivity, backend range, and a disclosure containing every title's guarantee/backend/recoupment/cap. Keep title-offer markup unchanged.

- [x] **Step 5: Run GREEN and browser checks**

Run A5 server render, Vite build, then inspect Package Desk and live/closing package rooms at mobile and desktop widths with no horizontal overflow.

---

### Task 9: EMPIRE+ Package Buying Surface

**Files:**
- Modify: `services/streamingRightsMarketplace.ts`
- Modify: `components/StreamingRightsExchange.tsx`
- Modify: `scripts/audit-streaming-rights-marketplace-phase16.ts`
- Modify: `scripts/audit-streaming-catalogue-packages-phase5.ts`

**Interfaces:**
- Produces: real NPC-studio package opportunities that open and sign through the shared package service.
- Consumes: existing Rights Exchange market-floor cadence, owned-platform treasury/negotiation state, package allocator, and atomic signing.

- [x] **Step 1: Add RED buyer-surface tests**

Assert package listings reference real projects, the player sees the seller's exact title schedule, changing total guarantee regenerates rather than manually edits allocations, buyer pays once, and title cost bases match seller attribution.

- [x] **Step 2: Run RED**

- [x] **Step 3: Add package opportunity projection and negotiation adapter**

Keep title opportunities unchanged. Route package signing through A5, not the legacy single-title signer. Platform-to-platform resale and permanent purchase remain disabled until A6.

- [x] **Step 4: Run GREEN plus marketplace audit**

---

### Task 10: Migration, Compaction, Full Audit, and Roadmap Completion

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `package.json`
- Modify: `scripts/audit-save-migration.ts`
- Modify: `scripts/audit-streaming-catalogue-packages-phase5.ts`
- Create: `docs/superpowers/reports/2026-09-01-streaming-catalogue-packages-phase5-report.md`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`

**Interfaces:**
- Produces: bounded A5 persistence, `audit:streaming-catalogue-packages-phase5`, completion evidence, and A6 as the next phase only after all verification passes.
- Consumes: all prior task APIs.

- [x] **Step 1: Add RED migration and compaction fixtures**

Assert missing/corrupt state normalizes safely, legacy title sessions normalize to `TITLE`, valid historical shared `cataloguePackageId` contracts reconstruct only a signed projection without money, live/signed lineage is preserved, stale withdrawn history is bounded, and save/reload does not reroll allocation rows.

- [x] **Step 2: Run RED**

- [x] **Step 3: Wire migration, compaction, and package script**

Increment the save migration version once. Normalize the package registry/policy/session extensions. Preserve live packages, signed packages referenced by active contracts/A4 lineage, and bounded recent terminal history.

- [x] **Step 4: Run focused verification**

Run:

```bash
npm run audit:streaming-contract-foundation-phase1
npm run audit:streaming-active-bidding-phase2
npm run audit:streaming-contract-economics-phase2
npm run audit:streaming-rights-compatibility-phase3
npm run audit:streaming-rights-calendar-phase4
npm run audit:streaming-catalogue-packages-phase5
npm run audit:streaming-rights-marketplace-phase16
npm run audit:platform-ai-sourcing
npm run audit:platform-ai-rights-lifecycle
npm run audit:platform-ai-economy
npm run audit:platform-ai-release
npm run audit:save-migration
npm run audit:save-transfer
npm run build
```

- [x] **Step 5: Run source/diff and browser verification**

Run `npx tsc --noEmit` and classify only pre-existing unrelated fixture failures; run `git diff --check`; verify the dev server's process cwd; inspect Production House Package Desk, package room live/closing/signed states, and EMPIRE+ listing on mobile and desktop.

- [x] **Step 6: Write evidence report and update roadmap only on success**

Mark A5 `COMPLETE`, A6 `NEXT`, record exact commands/results and any repository-wide pre-existing noise, and stop for user review. Do not begin A6.
