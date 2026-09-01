# Streaming Rights Compatibility Phase A3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make canonical streaming-rights contracts constrain every production auction, owned-platform acquisition, Platform AI rights action, catalogue use, and release through one deterministic compatibility authority.

**Architecture:** Add an actor-neutral compatibility resolver over `WorldState.streamingRightsContracts`, then make bidding rooms persist an immutable exact-country rights lot derived before the room opens. Existing A2 bidding timing and economics remain intact; Production House signing, owned-platform transactions, and Platform AI actions call the same resolver, with a final exact-term recheck before any money or catalogue mutation is committed.

**Tech Stack:** TypeScript, React, deterministic simulation services, esbuild audit scripts, Vite production build.

**Spec:** `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md` (Phase A3) plus the user-approved immutable-lot and pre-room filtering refinements in this task.

## Global Constraints

- `WorldState.streamingRightsContracts` is the sole legal authority; projection arrays may display contracts but may not decide compatibility.
- Every returned status is one of `AVAILABLE`, `PARTIALLY_AVAILABLE`, `AVAILABLE_IN_FUTURE`, `RESTRICTED`, or `UNAVAILABLE`.
- Every new bidding room has one immutable exact-country lot calculated before opening.
- Default Production House auctions cover all remaining eligible markets; Full Control lot selection remains a later UI extension.
- Impossible rights scopes and financially restricted platforms never enter the room; standing offers remain valid by construction.
- If India alone is excluded, use: `India is already licensed. This auction covers the remaining eligible markets.`
- Offers may rise, fall, restructure, become final, or withdraw; A2's 15-second room, equal six-second cooldowns, event extensions, 45-second cap, clearing offer, no auto-winner, and no player counteroffer remain unchanged.
- Signing persists the lot's exact country snapshot and may never label a partial lot `GLOBAL`.
- A hidden final recheck protects against concurrent/corrupt state; it is not the normal player flow.
- Conflict copy explains facts without recommending a deal.
- Preserve unrelated dirty Platform AI work and do not stage, commit, or push without explicit user authorization.
- Use strict sequential TDD: observe the focused audit fail before each production slice, then rerun it green.

---

### Task 1: Canonical compatibility authority

**Files:**
- Create: `services/streamingRightsCompatibility.ts`
- Modify: `services/streamingRightsCore.ts`
- Create/Test: `scripts/audit-streaming-rights-compatibility-phase3.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `WorldState.streamingRightsContracts`, `StreamingRightsContract`, and the stable country catalogue in `STREAMING_DAY_ONE_MARKETS`.
- Produces: `resolveStreamingRightsCompatibility(input)`, `validateStreamingRightsAvailability(input)`, `formatStreamingRightsCompatibilitySummary(result)`, and typed conflict/status structures.

- [x] **Step 1: Write the failing canonical-resolver audit**

  Add literal fixtures proving: a global proposal becomes `PARTIALLY_AVAILABLE` when India is exclusively licensed; an India-only proposal is `UNAVAILABLE` with the controlling contract and earliest future week; non-overlapping future windows are available; an overlapping exclusive grant is blocked by an earlier non-exclusive grant; compatible non-exclusive slots coexist until the configured limit; disallowed sublicensing and consent-required change of control return `RESTRICTED`; related-project rights are blocked only through explicit canonical IDs and never title matching.

- [x] **Step 2: Run the audit and record RED**

  Run: `npm run audit:streaming-rights-compatibility-phase3`

  Expected: FAIL because the new resolver module/export does not exist.

- [x] **Step 3: Implement the minimal pure resolver**

  Define the compatibility input with exact `territory`, `countryIds`, `windowType`, `exclusivity`, start/end weeks, buyer/seller, optional source contract/action, explicit related project IDs, exclusions, and non-exclusive slot limit. Normalize bounded scopes against the stable country catalogue; treat malformed empty bounded scopes conservatively. Evaluate active and future canonical contracts by project ID, country overlap, date overlap, window ordering, exclusivity, slot count, sublicensing authority, sequel/related-right grants, and change-of-control consent. Return sorted country/contract arrays, stable conflict codes, earliest compatible week, compatible window types, and concise factual summary.

- [x] **Step 4: Preserve the old validator name as a compatibility adapter**

  Re-export the richer `validateStreamingRightsAvailability` from `streamingRightsCore.ts` so existing callers compile while later tasks pass full scope. Keep `.available` as “the exact requested scope can proceed,” not “some countries remain.”

- [x] **Step 5: Run the focused audit GREEN**

  Run: `npm run audit:streaming-rights-compatibility-phase3`

  Expected: PASS with canonical country, date, window, exclusivity, clause, and explanation assertions.

---

### Task 2: Immutable auction lot and valid-by-construction offers

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingBidding.ts`
- Modify/Test: `scripts/audit-streaming-active-bidding-phase2.ts`
- Modify/Test: `scripts/audit-streaming-rights-compatibility-phase3.ts`

**Interfaces:**
- Consumes: `resolveStreamingRightsCompatibility` and stable market values.
- Produces: `StreamingBiddingRightsLot`, `buildStreamingBiddingRightsLot(input)`, `formatStreamingBiddingRightsLotScope(lot)`, and sessions/offers carrying exact lot scope.

- [x] **Step 1: Add failing immutable-lot and valuation assertions**

  Assert that a pre-existing India licence yields a `MULTI_REGION` lot containing every other canonical market, excludes `IN`, stores the exact notice, and gives every offer the same country snapshot/window. Assert that no-compatible-market input cannot open a room, legacy session normalization gains a safe global lot, and stronger strategic demand for a valuable eligible market increases (but never exceeds) a platform's financial ceiling.

- [x] **Step 2: Run both audits and record RED**

  Run: `npm run audit:streaming-rights-compatibility-phase3 && npm run audit:streaming-active-bidding-phase2`

  Expected: FAIL because bidding lots and exact offer country snapshots do not exist.

- [x] **Step 3: Add the persisted lot schema and deterministic builder**

  Add a rights-lot ID, territory, sorted `countryIds`, sorted excluded IDs, first-window start, maximum duration, and nullable notice. `GLOBAL` is permitted only when the lot contains the full canonical country universe; every subset is stored as `DOMESTIC` or `MULTI_REGION`. Session normalization must produce a conservative legacy global lot without rerolling saved offers.

- [x] **Step 4: Bind every offer and bidder valuation to the lot**

  Filter platforms before state creation using existing financial/restriction gates. Calculate title value from eligible-country market value, explicit strategic-country overlap, package/genre fit, relationship, competition, and cash/acquisition ceilings. Keep A2 response behavior unchanged. Copy lot territory, country IDs, and window type to every immutable offer revision and refuse selection when an offer's scope differs from its session lot.

- [x] **Step 5: Run both audits GREEN**

  Run: `npm run audit:streaming-rights-compatibility-phase3 && npm run audit:streaming-active-bidding-phase2`

  Expected: PASS, including save-transfer determinism and the existing timer/revision assertions.

---

### Task 3: Production House pre-room filtering and atomic signing

**Files:**
- Modify: `services/streamingRightsCore.ts`
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Modify: `views/lifestyle/business/components/StreamingBiddingRoom.tsx`
- Modify: `styles/streaming-bidding-room.css`
- Modify/Test: `scripts/audit-streaming-rights-compatibility-phase3.ts`
- Modify/Test: `scripts/audit-streaming-active-bidding-phase2.ts`

**Interfaces:**
- Consumes: `buildStreamingBiddingRightsLot`, session lot, and accepted immutable offer.
- Produces: exact-lot Production House contracts and a typed non-mutating signing failure for the hidden final recheck.

- [x] **Step 1: Add failing Production House assertions**

  Assert that an accepted partial-market offer signs `MULTI_REGION` plus the lot's exact country IDs; inserting a conflicting canonical contract after room creation causes the final recheck to return no contract and no changed player; and rendered room copy shows the remaining-markets notice plus the real lot instead of `Global exclusive/shared`.

- [x] **Step 2: Run focused audits and record RED**

  Run: `npm run audit:streaming-rights-compatibility-phase3 && npm run audit:streaming-active-bidding-phase2`

  Expected: FAIL on exact contract scope/final recheck/UI copy.

- [x] **Step 3: Build the lot before opening the room**

  In `ReleaseWizard`, resolve availability once from the canonical registry for the maximum offer term, construct the default all-remaining-markets lot, and pass it into `createStreamingBiddingSession`. If no eligible market remains, keep the player outside the room with a concise factual explanation.

- [x] **Step 4: Recheck and register before financial side effects**

  Make structured acceptance call the exact accepted offer/session recheck against the current canonical registry before studio cash, platform cash, investor payout, funding, energy, project phase, or catalogue state changes. Use the prepared registered player as the base only when compatibility succeeds. Persist `session.rightsLot.countryIds`, territory, and window type exactly; preserve idempotency.

- [x] **Step 5: Show compact lot truth in the existing room**

  Add one restrained scope line near the room clock for the pre-room notice and render each slip's actual exclusivity plus `Worldwide`, country name, or `N markets`. Do not add a recommendation, extra modal, counteroffer, or new timer behavior.

- [x] **Step 6: Run focused audits GREEN**

  Run: `npm run audit:streaming-rights-compatibility-phase3 && npm run audit:streaming-active-bidding-phase2`

  Expected: PASS with no financial mutation on a failed hidden recheck.

---

### Task 4: Owned-platform acquisition, renewal, and sublicensing enforcement

**Files:**
- Modify: `services/streamingRightsMarketplace.ts`
- Modify: `components/StreamingRightsExchange.tsx`
- Modify/Test: `scripts/audit-streaming-rights-marketplace-phase16.ts`
- Modify/Test: `scripts/audit-streaming-rights-compatibility-phase3.ts`

**Interfaces:**
- Consumes: exact negotiation territory/countries/window and source licence for resale.
- Produces: `RIGHTS_UNAVAILABLE`/`RIGHTS_RESTRICTED` action failures carrying concise `detail` text.

- [x] **Step 1: Add failing player-platform transaction assertions**

  Assert that an owned platform cannot sign overlapping exclusive India rights, the result explains `India is exclusively licensed to <platform> until Week <n>.`, compatible remaining countries still resolve as available, a renewal excludes only its source contract, and sublicensing fails without permission or outside the source contract's countries/dates.

- [x] **Step 2: Run marketplace and A3 audits and record RED**

  Run: `npm run audit:streaming-rights-marketplace-phase16 && npm run audit:streaming-rights-compatibility-phase3`

  Expected: FAIL because the marketplace omits exact scope/window and genericizes compatibility failures.

- [x] **Step 3: Enforce compatibility before money/catalogue mutation**

  Derive exact country IDs from the owned platform's active country operations for bounded negotiations, pass territory/window/source licence/action to the resolver, and stop before treasury, seller cash, catalogue, obligations, or canonical registry changes on failure. Validate outgoing sublicences against both the source contract's permission and its exact scope.

- [x] **Step 4: Surface factual short reasons**

  Extend `StreamingRightsActionResult` with rights-specific reason codes and `detail`; display that detail in the existing Rights Exchange feedback area. Do not choose alternative terms for the player.

- [x] **Step 5: Run both audits GREEN**

  Run: `npm run audit:streaming-rights-marketplace-phase16 && npm run audit:streaming-rights-compatibility-phase3`

  Expected: PASS with exact no-mutation failure behavior.

---

### Task 5: Platform AI, catalogue-use, and release-path integration

**Files:**
- Modify: `services/platformAi/platformAiContentSourcing.ts`
- Modify: `services/platformAi/platformAiRightsLifecycle.ts`
- Modify: `services/platformAi/platformAiDistress.ts`
- Modify other direct catalogue/release consumers discovered by the audit only when they currently bypass canonical compatibility.
- Modify/Test: `scripts/audit-platform-ai-sourcing.ts`
- Modify/Test: `scripts/audit-platform-ai-rights-lifecycle.ts`
- Modify/Test: `scripts/audit-streaming-rights-compatibility-phase3.ts`

**Interfaces:**
- Consumes: the same actor-neutral resolver and each AI platform's exact active-country/release-country scope.
- Produces: deterministic AI skip/renew/acquire/release decisions that cannot bypass encumbrances through ownership, distress, or projection drift.

- [x] **Step 1: Add failing AI path assertions**

  Assert that AI sourcing cannot commit an unavailable country/window, renewal respects its source-contract exclusion, distress resale cannot exceed the seller contract or sublicense clause, and an AI release uses only countries covered by the canonical contract.

- [x] **Step 2: Run relevant audits and record RED**

  Run: `npm run audit:platform-ai-sourcing && npm run audit:platform-ai-rights-lifecycle && npm run audit:streaming-rights-compatibility-phase3`

  Expected: FAIL on missing exact territory/country/window inputs or bypass behavior.

- [x] **Step 3: Route all AI decisions through canonical compatibility**

  Pass capability/release country snapshots, requested window, exclusivity, renewal exclusions, and sublicense source IDs into the shared resolver. Preserve existing deterministic scoring, financial restrictions, week cadence, commissioning, settlement, and save behavior.

- [x] **Step 4: Run relevant audits GREEN**

  Run: `npm run audit:platform-ai-sourcing && npm run audit:platform-ai-rights-lifecycle && npm run audit:streaming-rights-compatibility-phase3`

  Expected: PASS without changing the saved-decision determinism contract.

---

### Task 6: Migration, regression, roadmap, and final verification

**Files:**
- Modify if required: `services/saveMigration.ts`
- Modify if required: `services/saveCompaction.ts`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `docs/superpowers/plans/2026-08-31-streaming-rights-compatibility-phase3.md`

**Interfaces:**
- Consumes: completed A3 schemas and all focused audits.
- Produces: migrated deterministic saves, a current roadmap status, and verification evidence for the A3 completion gate.

- [x] **Step 1: Add and run malformed/legacy save assertions**

  Extend the A3/A2 audits so a schema-v2 session with a lot round-trips exactly, a valid legacy A2 session receives a conservative deterministic global lot, malformed country IDs cannot grant rights, and repeated normalization is idempotent.

- [x] **Step 2: Run all Project A and adjacent Platform AI audits**

  Run:

  ```bash
  npm run audit:streaming-contract-foundation-phase1
  npm run audit:streaming-active-bidding-phase2
  npm run audit:streaming-contract-economics-phase2
  npm run audit:streaming-rights-compatibility-phase3
  npm run audit:streaming-rights-marketplace-phase16
  npm run audit:platform-ai-sourcing
  npm run audit:platform-ai-rights-lifecycle
  ```

  Expected: every audit PASS.

- [x] **Step 3: Run production build**

  Run: `npm run build`

  Expected: Vite production build exits 0.

- [x] **Step 4: Verify the live local flow**

  Open the existing local game, enter a Production House streaming auction, and verify: actual lot scope appears before/inside the room; only valid standing offers appear; refresh restores the same room/lot; acceptance produces the exact-country canonical contract; owned-platform conflict copy is short and factual. Check both mobile and desktop widths and record any pre-existing unrelated console issue separately.

- [x] **Step 5: Update roadmap and this checklist**

  Mark A3 complete and A4 next only after every A3 gate is evidenced. Record implemented behavior, exact audit commands, build result, browser verification, migrations, and any intentionally deferred A4–A8 UI/control-mode work. Check every completed box in this plan.
