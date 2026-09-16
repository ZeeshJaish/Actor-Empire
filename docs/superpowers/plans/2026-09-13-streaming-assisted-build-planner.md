# Streaming Assisted Build Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the streaming Build wizard's team mode generate an exact, market-aware and budget-aware network proposal, reveal it through a mandatory 1–2 second planning cinematic, and keep player approval and commissioning as separate boundaries.

**Architecture:** Add a pure planner beside the transplanted Build finance model so both the UI and audits use one deterministic implementation. Adapt its proposal to the canonical Actor Empire infrastructure selection and persist only the proposal data and approval metadata needed to leave and reopen the wizard safely. Assisted stages become read-only projections of that approved plan; Hands-On continues to edit the same canonical draft.

**Tech Stack:** React, TypeScript, Vite, Actor Empire canonical streaming services, esbuild audit scripts, CSS.

**Spec:** `docs/superpowers/specs/2026-09-13-streaming-assisted-build-planner-design.md`

## Global Constraints

- Reuse canonical launch markets, World Economy demand, facility listings, infrastructure derivation, treasury, management policy, and rehearsal.
- Do not add a second demand, facility-price, or commissioning calculator.
- The planning cinematic is mandatory and lasts between 1 and 2 seconds.
- Planning and proposal approval do not spend money; commissioning remains the only treasury transaction.
- Assisted planning requires explicitly selected opening markets.
- Never select an unrelated region to satisfy a city count.
- Existing commissioned infrastructure and unrelated dirty work must remain untouched.
- Do not commit unless the user explicitly requests a commit.

---

### Task 1: Deterministic planner and exact package allocation

**Files:**
- Create: `components/studio-finance/finance/buildPlanner.ts`
- Modify: `components/studio-finance/finance/build.ts`
- Create: `scripts/audit-streaming-assisted-build-planner.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `BuildData`, `BuildDraft`, `BuildTotals`, `MoneyPlan`, `CountryService`, and the canonical callbacks already exposed on `BuildData.canonical`.
- Produces: `BuildNetworkClass`, `BuildBudgetSuggestion`, `BuildTeamProposal`, `BuildPlanningFailure`, `createExactTemplateDraft(data, draft, racks, cities)`, `getBuildBudgetSuggestions(data, draft)`, `createBuildTeamProposal(data, draft)`, and `classifyBuildNetwork(data, draft)`.

- [ ] **Step 1: Write the failing planner audit**

  Add cases that assert Growth distributes `[3, 2, 2]`, Premiere distributes `[3, 3, 2, 2]`, selected-region boundaries are respected, budget suggestions are ordered, a proposal never exceeds its ceiling, and missing markets returns `MARKETS_REQUIRED`.

- [ ] **Step 2: Run the audit and observe RED**

  Run: `npx esbuild scripts/audit-streaming-assisted-build-planner.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-streaming-assisted-build-planner.mjs && node /tmp/audit-streaming-assisted-build-planner.mjs`

  Expected: failure because `buildPlanner.ts` and its exports do not exist.

- [ ] **Step 3: Implement exact city and rack allocation**

  Candidate cities are ordered by recommended placement, opening countries, then other eligible cities within opening regions. Allocate `Math.floor(racks / cities)` everywhere and add one rack to the first `racks % cities` facilities. Return an explicit failure when the requested city count cannot be satisfied.

- [ ] **Step 4: Implement budget suggestions and proposal selection**

  Evaluate canonical quotes for viable candidates, derive Minimum, Recommended, and Premiere-safe ceilings from their real costs, and choose the best candidate within `draft.instructions.maxBudget` according to priority and risk. Return `BUDGET_TOO_LOW`, `NO_ELIGIBLE_FACILITY`, or `MARKETS_REQUIRED` rather than mutating the draft.

- [ ] **Step 5: Implement capability classification**

  Evaluate Premiere, Growth, Essential, then Starter using the exact spec thresholds and canonical service/capacity results.

- [ ] **Step 6: Run the focused audit and observe GREEN**

  Run the Task 1 audit command. Expected: `Streaming assisted Build planner audit passed.`

---

### Task 2: Persist pending proposal and approval metadata safely

**Files:**
- Modify: `types.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Modify: `services/streamingInfrastructure.ts`
- Modify: `components/streaming-transplant/StreamingBuildoutExperience.tsx`
- Modify: `components/StreamingPlatformHQ.tsx`
- Extend test: `scripts/audit-streaming-assisted-build-planner.ts`

**Interfaces:**
- Consumes: Task 1 `BuildTeamProposal` presentation data and canonical `OwnedStreamingFacility` objects.
- Produces: `OwnedStreamingAssistedBuildProposal`, optional `assistedProposal`, `assistedPlanApproved`, and `assistedPlanClass` fields on `OwnedStreamingInfrastructureSetupDraft`; matching optional fields on `BuildSel`.

- [ ] **Step 1: Add RED persistence cases**

  Assert that normalization preserves a valid pending proposal, removes malformed facilities and invalid class values, old saves get empty optional fields, and commissioned infrastructure is unchanged.

- [ ] **Step 2: Run the focused audit and confirm persistence cases fail**

- [ ] **Step 3: Add the minimal persisted proposal type**

  Store proposal signature, input signature, class, facilities, architecture, doctrine, campaign, commissioning cost, weekly cost, allocation, created week, and approval requirement. Do not duplicate market population or World Economy data.

- [ ] **Step 4: Normalize and save proposal fields**

  Clone arrays and nested rack groups, validate finite non-negative numbers, whitelist enum values, and preserve absent fields for old saves.

- [ ] **Step 5: Bridge proposal fields through Build selection**

  Load them in `StreamingPlatformHQ`, include them in `canonicalInfrastructureDraft`, and include proposal metadata in the selection persistence key without treating the proposal's unapproved facilities as active infrastructure.

- [ ] **Step 6: Run the focused audit and existing save audit**

  Run the planner audit plus the most relevant existing streaming infrastructure/save audit scripts discovered in `package.json`.

---

### Task 3: Budget-first Sites experience and proposal boundary

**Files:**
- Modify: `components/studio-finance/finance/build.ts`
- Modify: `components/studio-finance/components/build/BuildWizard.tsx`
- Modify: `components/studio-finance/components/build/StageSites.tsx`
- Modify: `components/streaming-transplant/StreamingBuildWizardExperience.tsx`
- Modify: `components/studio-finance/styles/build.css`
- Create: `components/studio-finance/components/build/TeamPlanningCinematic.tsx`
- Create: `scripts/audit-streaming-assisted-build-planner-ui.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 planner results and Task 2 persisted proposal fields.
- Produces: assisted instructions UI, `onPrepareTeamPlan`, `onApproveTeamPlan`, `onRejectTeamPlan`, `onOpenMarkets`, and the mandatory planning cinematic.

- [ ] **Step 1: Write RED UI audit cases**

  Server-render or structurally inspect the Sites experience for dynamic budget choices, custom budget input, no-market warning, proposal review copy, take-control action, and the planning cinematic stage labels.

- [ ] **Step 2: Run the UI audit and observe RED**

  Run: `npx esbuild scripts/audit-streaming-assisted-build-planner-ui.tsx --bundle --platform=node --format=cjs --loader:.css=text --loader:.csv=text --outfile=/tmp/audit-streaming-assisted-build-planner-ui.cjs && node /tmp/audit-streaming-assisted-build-planner-ui.cjs`

- [ ] **Step 3: Replace assisted preset controls with budget-first instructions**

  Show Minimum viable, Recommended, Premiere-safe, and Custom; update `maxBudget` through the existing management policy; show budget as authorization, not spending. Keep exact package cards only in Hands-On mode.

- [ ] **Step 4: Add the explicit-market gate**

  Use a dedicated `hasExplicitOpeningMarkets` data field from the adapter rather than inferring from legacy fallback countries. Disable team planning and route the warning action to Define the Launch Markets.

- [ ] **Step 5: Add pending proposal review**

  Preparing a plan saves it as pending without applying facilities. Review displays real markets, cities, rack distribution, likely/high capacity, build and weekly costs, reserve, allocation use, projected treasury, class, reasons, warnings, and alternatives. Approval applies it without charging money.

- [ ] **Step 6: Add the mandatory planning cinematic**

  Render selected-market map points, city routes, rack blocks, budget trail, and load pulse from proposal data over 1–2 seconds. Do not include a skip control. Under reduced motion, cross-fade the same stages over the same bounded duration.

- [ ] **Step 7: Fix exact Hands-On template selection**

  Apply the Task 1 exact template result, select by exact result or explicit template id, and show a visible failure when a template cannot use enough eligible cities.

- [ ] **Step 8: Run UI and planner audits**

  Expected: both focused audits pass.

---

### Task 4: Managed read-only Plans, Money, and Test stages

**Files:**
- Modify: `components/studio-finance/components/build/BuildWizard.tsx`
- Modify: `components/studio-finance/components/build/StagePlans.tsx`
- Modify: `components/studio-finance/components/build/StageMoney.tsx`
- Modify: `components/studio-finance/components/build/StageTest.tsx`
- Modify: `components/studio-finance/styles/build.css`
- Extend test: `scripts/audit-streaming-assisted-build-planner-ui.tsx`

**Interfaces:**
- Consumes: approved assisted-plan state from Tasks 2–3.
- Produces: consistent `Managed by your team` presentation and persistent `Take control` action; all existing calculations remain visible.

- [ ] **Step 1: Add RED managed-stage UI assertions**

  Assert that assisted-approved stages show the managed state, hide or disable mutation controls, retain metrics and evidence, and expose takeover.

- [ ] **Step 2: Run the UI audit and observe RED**

- [ ] **Step 3: Add shared managed-stage state**

  Pass `managed = draft.mode === 'ASSISTED' && draft.teamPlanApproved` through stage props. Keep navigation available. Place one consistent takeover control at the stage boundary.

- [ ] **Step 4: Guard every mutating control**

  Plans cannot alter racks, duties, repairs, architecture, ownership or doctrine; Money cannot alter campaign; Test may display recorded evidence but must not silently change the approved network. Takeover preserves facilities and changes only management state.

- [ ] **Step 5: Preserve hand-back safety**

  Returning to Assisted creates a pending proposal and leaves manual facilities active until approval.

- [ ] **Step 6: Run the UI audit and planner audit**

---

### Task 5: Budget trail, commissioning boundary, and complete regression

**Files:**
- Modify: `components/studio-finance/components/build/BuildWizard.tsx`
- Modify: `components/studio-finance/components/build/StageMoney.tsx`
- Modify: `components/studio-finance/components/build/StageLaunch.tsx`
- Modify: `components/studio-finance/styles/build.css`
- Extend test: `scripts/audit-streaming-assisted-build-planner.ts`
- Extend test: `scripts/audit-streaming-assisted-build-planner-ui.tsx`

**Interfaces:**
- Consumes: canonical `MoneyPlan`, approved plan metadata, treasury, settled commitments, and existing commission handler.
- Produces: truthful treasury trail and unchanged exactly-once commissioning behavior.

- [ ] **Step 1: Add RED money-boundary cases**

  Assert that allocation does not reduce treasury, proposal cost appears as projected spend, unused allocation remains distinct, approval does not charge money, and commissioning retains the existing exact transaction amount.

- [ ] **Step 2: Run focused audits and observe RED**

- [ ] **Step 3: Implement the budget trail**

  Present treasury, settled/reserved launch commitments, team allocation, proposed cost, unused allocation, projected post-commissioning cash, weekly operating cost, and runway without double counting.

- [ ] **Step 4: Keep launch gates canonical**

  Pending or stale proposals cannot commission. Approved assisted plans use the existing rehearsal and Define-the-Launch gates. No new money mutation is introduced.

- [ ] **Step 5: Run full verification**

  Run focused planner/UI audits, existing infrastructure/world/save audits, `npm run build`, and `git diff --check`.

- [ ] **Step 6: Browser verification**

  In the real player-owned streaming Build wizard, verify missing markets, all budget suggestions, custom budget, low-budget failure, mandatory cinematic, proposal review, approve, managed stages, takeover, hand-back, exact Growth, exact Premiere, rehearsal staleness, and commissioning boundary. Restore the user's draft if diagnostic interactions alter it.

- [ ] **Step 7: Report completion without committing**

  Summarize files, gameplay changes, fresh command evidence, browser evidence, and any residual risks. Leave the local server and test tab available if they are already running.
