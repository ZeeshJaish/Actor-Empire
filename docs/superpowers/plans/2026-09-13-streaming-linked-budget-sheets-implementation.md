# Streaming Linked Budget Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add canonical, linked Launch Budget and Build Budget sheets with read-only cross-wizard summaries and direct navigation between them.

**Architecture:** Finance derivations remain authoritative in `launch.ts`, `build.ts`, and the existing streaming services. The wizard shells receive small display-only summary objects and optional initial-sheet requests; `StreamingPlatformHQ` owns one-shot cross-wizard navigation state. A shared accordion component provides presentation without owning calculations.

**Tech Stack:** React 19, TypeScript 5.8, existing Studio Finance `Sheet` primitives, Vite audit scripts.

**Spec:** `docs/superpowers/specs/2026-09-13-streaming-linked-budget-sheets-design.md`

## Global Constraints

- Reuse `launchStageSummaries`, `moneyPlan`, `buildTotals`, `stageStates`, `getStreamingLaunchBudgetView`, and `getStreamingInfrastructureForecast`.
- Cross-wizard summaries are read-only; editing occurs only in the owning wizard.
- Navigation must preserve the existing Launch draft and Build selection.
- No new charge, commitment, funding, pricing, or save-migration behavior.
- Keep the mobile sheet compact by collapsing the linked summary initially.
- Preserve unrelated worktree changes and do not commit or push without the user's explicit request.

---

### Task 1: Shared linked-budget presentation contract

**Files:**
- Create: `components/studio-finance/finance/budgetLinks.ts`
- Create: `components/studio-finance/components/BudgetLinkSection.tsx`
- Create: `scripts/audit-streaming-linked-budget-sheets.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `LinkedBudgetStatus`, `LinkedBudgetMetric`, `LinkedBudgetSummary`, and `BudgetLinkSection`.
- `BudgetLinkSection` consumes `{ id, summary, actionLabel, onOpen }` and never mutates finance state.

- [ ] **Step 1: Write the failing audit**

Create an audit that imports and server-renders `BudgetLinkSection`, then asserts the collapsed summary contains the program name, status, primary amount, and `aria-expanded="false"`. The production change that makes this test pass is the new shared component; removing its accessible toggle or visible summary later makes it fail.

- [ ] **Step 2: Run the audit to verify RED**

Run: `npx esbuild scripts/audit-streaming-linked-budget-sheets.tsx --bundle --platform=node --format=cjs --loader:.csv=text --outfile=/tmp/audit-streaming-linked-budget-sheets.cjs && node /tmp/audit-streaming-linked-budget-sheets.cjs`

Expected: FAIL because `budgetLinks.ts` or `BudgetLinkSection.tsx` does not exist.

- [ ] **Step 3: Add the minimal shared contract and accordion**

Define:

```ts
export type LinkedBudgetStatus = 'Not planned' | 'Draft' | 'Approved' | 'Commissioned' | 'Live';

export interface LinkedBudgetMetric {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'bad' | 'flat';
}

export interface LinkedBudgetSummary {
  program: 'Define the Launch' | 'Build the Platform';
  status: LinkedBudgetStatus;
  primaryLabel: string;
  primaryValue: string;
  metrics: LinkedBudgetMetric[];
}
```

Implement `BudgetLinkSection` as a controlled local accordion with `aria-expanded`, an identified content region, compact metric rows, and a full-width navigation button.

- [ ] **Step 4: Run the focused audit**

Run the command from Step 2. Expected: the shared component renders the truthful collapsed summary and exits 0.

---

### Task 2: Launch and Build budget sheets

**Files:**
- Modify: `components/studio-finance/components/launch/LaunchWizard.tsx`
- Modify: `components/studio-finance/components/build/BuildWizard.tsx`
- Modify: `components/studio-finance/finance/build.ts`
- Modify: `components/studio-finance/styles/launch.css`
- Modify: `components/studio-finance/styles/build.css`
- Test: `scripts/audit-streaming-linked-budget-sheets.tsx`

**Interfaces:**
- `LaunchWizardProps` consumes `initialSheet?: 'money' | 'plan' | null` and `buildBudgetSummary?: LinkedBudgetSummary`.
- `BuildWizardProps` consumes `initialSheet?: 'money' | 'build' | null` and `launchBudgetSummary?: LinkedBudgetSummary`.
- `BuildHandlers` produces `onOpenLaunchBudget?: () => void` in addition to existing local-step navigation.

- [ ] **Step 1: Extend the failing audit with both wizard contracts**

Server-render Launch with `initialSheet="plan"` and a Build summary, then assert the Launch Budget dialog and collapsed Build summary are visible. Server-render Build with `initialSheet="build"` and a Launch summary, then assert the Build Budget dialog, its real itemized lines, five-stage progress, and collapsed Launch summary are visible. Removing either trigger, summary, or canonical line-item mapping later makes the rendered-output assertions fail.

- [ ] **Step 2: Run the audit to verify RED**

Run the focused audit command. Expected: FAIL on the missing wizard contracts and Build sheet.

- [ ] **Step 3: Implement Launch integration**

Initialize Launch `openSheet` from `initialSheet`. Render `BudgetLinkSection` after launch totals when `buildBudgetSummary` exists. Its `Open Build` action closes the sheet before calling `onOpenBuildPlatform`.

- [ ] **Step 4: Implement Build sheets**

Add `openSheet` state. Make `Studio Money` open a company-money `Sheet`; make `This Build` open a Build Budget `Sheet`. Derive completed stages from `stageStates`, display `moneyPlan.lines`, preserve local stage navigation, show headroom or shortfall, and render the Launch cross-summary when supplied.

- [ ] **Step 5: Add compact responsive styling**

Use existing Studio Finance tokens, one summary strip, divider-led rows, existing good/warn/bad tones, and a collapsed cross-link. Do not add gradients, nested card grids, or a second oversized money rail.

- [ ] **Step 6: Run the focused audit to GREEN**

Run the focused audit command. Expected: `Streaming linked budget sheets audit passed.`

---

### Task 3: Canonical adapters and cross-wizard navigation

**Files:**
- Modify: `components/StreamingDefineLaunchExperience.tsx`
- Modify: `components/streaming-transplant/StreamingBuildWizardExperience.tsx`
- Modify: `components/StreamingPlatformHQ.tsx`
- Test: `scripts/audit-streaming-linked-budget-sheets.tsx`

**Interfaces:**
- `StreamingDefineLaunchExperience` consumes `initialSheet?: 'money' | 'plan' | null` and derives its Build summary from the saved infrastructure draft plus `getStreamingInfrastructureForecast`.
- `StreamingBuildWizardExperience` consumes `initialSheet?: 'money' | 'build' | null`; it derives the Launch summary from `BuildData.defineLaunchChecks`, `BuildData.spend`, and `BuildData.treasury.committedLaunch`.
- `StreamingPlatformHQ` owns `defineLaunchInitialSheet` and `buildInitialSheet` one-shot state.

- [ ] **Step 1: Extend the audit with adapter and HQ expectations**

Add pure adapter tests with hand-checked fixtures: a saved infrastructure draft must produce the expected racks, cities, transaction cost, weekly operation, and build weeks; canonical Define checks and commitments must produce the expected cleared-stage count, paid amount, and due amount. Test a small pure navigation resolver so Launch resolves to Build plus `build`, while Build resolves to Define plus `plan`. Removing canonical adapter inputs or swapping either destination later makes these assertions fail.

- [ ] **Step 2: Run the audit to verify RED**

Run the focused audit command. Expected: FAIL on missing adapters and HQ handoff state.

- [ ] **Step 3: Derive the Build summary for Define the Launch**

When an infrastructure draft or commissioned setup exists, calculate cost, weekly operation, build weeks, racks, cities, redundancy, and status from canonical saved state. When no draft exists, pass a truthful `Not planned` summary with zero topology and no invented cost.

- [ ] **Step 4: Derive the Launch summary for The Build**

Use the existing `defineLaunchChecks`, locked launch spend, and `committedLaunch` amount to show cleared stages, known subtotal, paid amount, and still due. Map canonical launch state to `Draft`, `Approved`, or `Live` without exposing internal enum names.

- [ ] **Step 5: Wire one-shot cross-navigation in HQ**

From Launch `Open Build`, close Launch, request Build's `build` sheet, and open Build. From Build `Open Define the Launch`, close Build, set opening mode, request Launch's `plan` sheet, and open Define the Launch. Reset the request after the destination consumes it so normal entry does not reopen a sheet.

- [ ] **Step 6: Run focused and regression audits**

Run:

```bash
npm run audit:streaming-linked-budget-sheets
npm run audit:streaming-launch-draft-continuity
npm run audit:streaming-assisted-build
npm run audit:streaming-assisted-build-ui
```

Expected: all commands exit 0.

---

### Task 4: Final verification and mobile browser pass

**Files:**
- Verify all files modified above.

**Interfaces:**
- Consumes the complete linked-budget implementation.
- Produces fresh automated and browser evidence only; no new behavior.

- [ ] **Step 1: Run static and production checks**

Run:

```bash
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 2: Verify Define the Launch in the browser**

At the mobile viewport, open Launch Plan, expand Build the Platform, verify the summary is readable and read-only, navigate to Build, then return and confirm the launch stage and draft remain intact.

- [ ] **Step 3: Verify The Build in the browser**

Open Studio Money and This Build separately, verify the Build checklist and itemized costs, expand Define the Launch, navigate to the Launch Budget sheet, close it, and confirm the prior Build selection remains intact.

- [ ] **Step 4: Review the final diff**

Confirm that no unrelated dirty files were staged, reverted, reformatted, or overwritten. Do not commit or push.
