# Streaming Commercial C2 Rights and Title Entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user requested inline phase work; do not delegate.

**Goal:** Make every streaming title offer and legitimate playback route depend on the same country-, week-, contract-, offer-, and viewer-entitlement decision.

**Architecture:** Persist a narrow versioned access grant on existing rights positions, snapshot legacy modes once, then resolve offerability and playback in a pure evaluator. Adapt catalogue and existing plan-cell viewing to that evaluator. Keep C3 buyer cohorts and C4 market pricing/settlement out of C2.

**Tech Stack:** TypeScript, Node assertion audits bundled with esbuild, Vite, existing rights and WE6 world-economy services.

**Spec:** `docs/superpowers/specs/2026-09-23-streaming-commercial-c2-entitlements-design.md` and its parent `docs/superpowers/specs/2026-09-23-streaming-commercial-offers-design.md`.

**Execution record:** C2 steps were implemented and run. The rights-finalization and catalogue-package audits retain separately verified baseline failures; a checked “run” item does not mean those inherited suites passed. Exact outcomes and the balance comparison are in `docs/superpowers/reports/2026-09-23-streaming-commercial-c2.md`.

## Global constraints and review gate

- Do not commit or push without a new explicit user request. Preserve existing dirty C1 and roadmap work.
- No new person-level account database, free/rental/purchase cohort model, ad market, or new treasury/royalty ledger. These belong to C3–C4.
- `StreamingRightsContract` remains schema 2; `accessGrant` is an optional saved field with its own schema 1, normalized to a complete value before access decisions.
- The existing `streamingAccessPolicy.ts` means entitlement to the game's streaming feature, not a viewer's title entitlement; never use it for playback.
- Only a grant with durable fulfillment can support a new permanent purchase. A rental offered at absolute week W requires rights through the exclusive end W + `pricing.rentals.windowWeeks`.
- Historical settled views/cash/royalties are immutable. An unchanged C0 controlled fixed-input result is required. If live reference-week gross revenue changes by more than 5% after rights correction, stop for a player-balance decision; do not tune coefficients to conceal the change.

## Stable C2 interfaces

Define these once, then keep call sites aligned:

```ts
type StreamingTitleAccessMode = 'SUBSCRIPTION' | 'AD_SUPPORTED' | 'RENTAL' | 'PURCHASE';
interface StreamingRightsAccessGrant {
  schemaVersion: 1;
  modes: StreamingTitleAccessMode[];
  earlyWindowWeeks: number; // integer 0..4
  purchaseFulfillment: 'NONE' | 'PERPETUAL';
  source: 'EXPLICIT' | 'LEGACY_SNAPSHOT';
}
type StreamingTitleAccessRoute =
  | { kind: 'SUBSCRIPTION'; planId: string }
  | { kind: 'AD_SUPPORTED' }
  | { kind: 'RENTAL' }
  | { kind: 'PURCHASE' };
```

`services/streamingRightsAccessGrant.ts` exports `normalizeStreamingRightsAccessGrant`, `snapshotLegacyStreamingRightsAccessGrants`, and `intersectStreamingRightsAccessGrants`. `services/streamingTitleAccess.ts` exports `evaluateStreamingTitleRoute` (can this platform offer the route now?) and `evaluateStreamingTitlePlayback` (does the viewer also possess the route?). Both return a stable `StreamingTitleAccessDecision` with `allowed`, `reasonCode`, `contractId`, playable interval, `priceSource`, and `adEligible`. The evaluator takes a compact normalized title/rights-position input, not `Player`, and does not mutate input.

---

### Task 1: Freeze baseline and migrate access grants

**Files:** Modify `types.ts`, `services/streamingRightsCore.ts`, `services/saveMigration.ts`, `package.json`; create `services/streamingRightsAccessGrant.ts`, `scripts/audit-streaming-commercial-c2.ts`, `tsconfig.streaming-commercial-c2.json`.

**Interfaces:** Consumes current `OwnedStreamingCatalogLicense`, `StreamingRightsContract`, C1 pricing streams, actor-neutral buyer identity, and existing migration. Produces normalized schema-1 grants persisted on canonical and buyer-local positions. Do not call weekly viewing or world offers from save migration.

- [x] Add a failing C2 audit case to `scripts/audit-streaming-commercial-c2.ts` and an `audit:streaming-commercial-c2` esbuild/Node script in `package.json`. A legacy player contract active for `['subs', 'ads', 'rentals']` must gain exactly those three modes after `migratePlayerSave`, no early weeks, and no perpetual purchase; changing pricing to add a fourth mode before a second migration must not expand its persisted grant. Run the script and observe the missing-grant assertion fail.

```ts
const once = migratePlayerSave(legacyPlayer);
const grant = once.world.streamingRightsContracts![contractId].accessGrant!;
assert.deepEqual(grant.modes, ['SUBSCRIPTION', 'AD_SUPPORTED', 'RENTAL']);
assert.equal(grant.earlyWindowWeeks, 0);
assert.equal(grant.purchaseFulfillment, 'NONE');
const twice = migratePlayerSave(JSON.parse(JSON.stringify(once)));
assert.deepEqual(twice.world.streamingRightsContracts![contractId].accessGrant, grant);
```

- [x] Add the exact type contract above. Implement a finite, sorted, idempotent grant validator and a one-time snapshot inside the existing rights-contract save migration. Read player pricing for player positions and the existing deterministic AI commercial generator for AI positions; use historic title evidence where available. For imported production releases without mode evidence, snapshot `SUBSCRIPTION`. Preserve an explicit grant unchanged except validation. Record the same grant on linked buyer-local licences.
- [x] Add red/green cases for malformed grant data, an AI buyer, an old permanent acquisition, and a sale-enabled finite old licence. The last may retain historic sale data but must not acquire `PERPETUAL` fulfillment or authorize new permanent sales. Run C2, WE8 save, and rights-finalization audits.

### Task 2: Rights terms, signing, and transfer inheritance

**Files:** Modify `services/streamingRightsMarketplace.ts`, `services/streamingRightsCore.ts`, `services/streamingRightsTransactions.ts`, `services/streamingRightsCalendar.ts`, `components/StreamingRightsExchange.tsx`, `components/StreamingContentMarket.tsx`, and focused rights audit fixtures.

**Interfaces:** Consumes Task 1 grant. Produces an explicit grant frozen on each newly signed deal and an intersection on sublicence/transfer/renewal. A price switch never edits an existing grant.

- [x] First add an audit where a source grants only subscription in `US`, then attempt to sublicense ads or early access in `US` and subscription in `CA`. Assert denial or narrowing without creating a broader successor; run red.

```ts
assert.deepEqual(intersectStreamingRightsAccessGrants(sourceGrant, requestedGrant).modes, ['SUBSCRIPTION']);
assert.equal(intersectStreamingRightsAccessGrants(sourceGrant, requestedGrant).earlyWindowWeeks, 0);
```

- [x] Extend `StreamingRightsTermsInput` and saved negotiation with requested access modes and early weeks; normalize and display them on exchange/private-offer term sheets. Default terms may request only the buyer's currently active offer modes. The source holder's grant is an upper bound. Permanent purchase fulfillment is selectable only when the source position or outright owned/permanent deal supports it. The signed contract and buyer-local license store the same explicit grant.
- [x] Propagate the source grant through `settleStreamingRightsTransfer`, `settleStreamingRightsSublicense`, renewal, and package/auction signing paths. Intersect requested modes, early weeks, territory, and duration; never copy a permissive child grant from a narrower parent. Run `audit:streaming-rights-transactions-phase6`, `audit:streaming-rights-calendar-phase4`, and `audit:streaming-rights-finalization-phase8` after the C2 audit turns green.

### Task 3: Pure offerability and playback evaluator

**Files:** Create `services/streamingTitleAccess.ts`; modify `scripts/audit-streaming-commercial-c2.ts` and `types.ts` for compact position/result types.

**Interfaces:** Consumes a title readiness/general-release snapshot, normalized rights positions, country/week, C1 `StreamingCommercialOfferProjection`, a `StreamingTitleAccessRoute`, and optional viewer proof. Produces the stable decision. `evaluateStreamingTitleRoute` does not require a viewer; `evaluateStreamingTitlePlayback` requires the matching plan/free/rental/purchase proof.

- [x] Write table-driven assertions for missing rights, wrong country, week before start, expiry, transfer-out, mode not granted, production not ready, valid subscription, and early lead. Run red against the absent evaluator.

```ts
assert.equal(evaluateStreamingTitleRoute({ ...fixture, countryId: 'CA' }).reasonCode, 'TERRITORY_DENIED');
assert.equal(evaluateStreamingTitleRoute({ ...fixture, absoluteWeek: releaseWeek - 2,
  route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' } }).allowed, true);
assert.equal(evaluateStreamingTitleRoute({ ...fixture, absoluteWeek: releaseWeek - 2,
  route: { kind: 'SUBSCRIPTION', planId: 'ESSENTIAL' } }).allowed, false);
```

- [x] Implement a pure, deterministic evaluator. Effective early lead is `min(offerBenefit.earlyAccessWeeks, grant.earlyWindowWeeks, 4)` when premium access is enabled; earliest playable week is never before production readiness or contract start. For rental offerability require `absoluteWeek + windowWeeks <= contract.expiresAtAbsoluteWeek`. For purchase require `purchaseFulfillment === 'PERPETUAL'`; a previously purchased copy may use its vested fulfillment proof after ordinary distribution expiry. An ad-free-pass flag changes `adEligible` only after a valid underlying route exists.
- [x] Add red/green playback assertions: wrong plan; unpurchased rental; rental rewatch before and after its exclusive end; purchase fulfillment after the ordinary license window; pass without title entitlement; pass on a valid ad route. Assert the input objects are unchanged after evaluation.

### Task 4: Rights-position adapter and player-facing explanations

**Files:** Modify `services/streamingContentAvailability.ts`, `services/streamingOpeningCatalogue.ts`, `components/StreamingOpeningCatalogueDesk.tsx`, `services/streamingRightsCore.ts`; modify the C2 audit.

**Interfaces:** Produces normalized player/AI rights-position snapshots from canonical contracts and unencumbered owned IP. Existing broad availability remains for compatibility; new route-specific availability and stable denial codes come only from Task 3.

- [x] Add a failing country report assertion: a `US`-only title can be offered there but shows `TERRITORY_DENIED` in `CA`; a scheduled title without early rights shows `NOT_RELEASED` before its general week. Check that an owned title with an exclusive grant elsewhere is not treated as globally free.
- [x] Implement the adapter with existing `doesStreamingLicenseCoverCountry` and compatibility rules. `getStreamingContentAvailability` exposes `routesByCountry`/denial reasons without changing unrelated consumers of its legacy `status` and `available` fields. Show concise reasons in the opening-catalogue report; do not redesign the pricing screen in C2.
- [x] Verify old-save migration and report calls remain deterministic and bounded; run `audit:streaming-opening-programme` and its UI audit.

### Task 5: Plan-specific weekly viewing and honest early appeal

**Files:** Modify `services/worldEconomy/worldStreamingViewing.ts`, `services/worldEconomy/worldStreamingCommercialEconomy.ts`, `services/worldEconomy/worldStreamingOffers.ts`; modify C2 and WE6 audit fixtures.

**Interfaces:** Consumes Task 3/4 route decisions. Produces title viewing only from eligible plan cells, with exact country/title reconciliation; commercial formula receives separate rental and purchase eligibility booleans. Does not create free/store buyer cohorts or replace existing monthly/annual billing paths.

- [x] Add a failing viewing fixture with two plan cells: `PREMIERE` has a 2-week playable early benefit, `ESSENTIAL` has none. Two weeks before general release, only `PREMIERE` legitimate views may land on that title. Add a no-rights variation in which neither plan plays it. Capture account and revenue totals before editing the engine.
- [x] Move title candidate selection inside the existing per-plan-cell allocation (including that cell's legitimate shared accounts); preserve the aggregate country and title totals and separate piracy. Allow an upcoming slate title only through a successful early route. Do not count an advertised `early` feature in `planAppeal` unless at least one title is actually early-playable for that plan and country/week; apply the same resolver to AI fixtures.
- [x] Add `isPurchaseEligible?: boolean` to the commercial input, defaulting to the existing `isRentalEligible` only for external fixed-input callers. The live player path passes distinct evaluator results for rental and purchase, so an expiring rental or non-durable purchase produces no new transaction/revenue. Test zeroing those specific lines while preserving subscription and ad formulas. Legacy `premium`-stream settlement remains separately identified for C4, not relabelled as the new benefit.
- [x] Run C2, C0, `audit:streaming-pricing-world`, `audit:streaming-billing-cohorts`, and WE6. Any new result must be explained by a rights/early-access case, not by a changed population, ad-fill, or billing coefficient.

### Task 6: Save, AI, balance, performance, and handoff

**Files:** Create `docs/superpowers/reports/2026-09-23-streaming-commercial-c2.md`; modify C2 audit; add a targeted C2 TypeScript project; update this plan's completed checkboxes only after verification.

**Interfaces:** Consumes all previous tasks. Produces evidence for C2 acceptance and a clear C3/C4 handoff.

- [x] Add an old-save double migration and one-week continuation fixture. Assert schema stability, same historical financial ledger values, valid player/AI access decisions, no title-grant widening on a pricing switch, and a second same-week run with no extra transactions.
- [x] Run `audit:streaming-commercial-c2`, C0, C1, opening-programme and UI, rights transactions/finalization, WE6, WE8 save, `npx tsc --noEmit --project tsconfig.streaming-commercial-c2.json`, `npm run build`, and `git diff --check`. Run TypeScript before build so generated output cannot race compilation. Record exact results and inherited failures.
- [x] Compare the C0 controlled numeric table and at least one live reference week before/after by title and revenue line. If controlled outputs drift unexpectedly or live gross shifts more than 5%, pause for user balance review. Otherwise write the C2 report with saved-game impact, reasons for every intended delta, remaining synthetic free/store-cohort and legacy premium limitations, and C3 prerequisites. Do not commit or push.
