# Responsive Layout Phases 0-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user prefers inline execution; do not dispatch subagents.

**Goal:** Establish an auditable Actor Empire screen baseline and a reusable, game-neutral responsive layout core without changing any live screen or gameplay behavior.

**Architecture:** Record routes and visual baselines, then add `ui-layout/` as a React/WebView-neutral-to-game-state module. Pure width policies choose allowed column counts; React primitives measure only their container. Actor Empire adopts them in later phases.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, esbuild, Node assertions, Playwright browser audit with the bundled workspace runtime.

**Spec:** `docs/superpowers/specs/2026-09-27-cross-game-responsive-layout-system-design.md`

## Global Constraints

- Preserve each screen's current visual style. No live screen integration in Phase 1.
- The iOS deployment target is 15.0. Do not rely exclusively on a newer CSS feature.
- The core must not import `Player`, services, save, purchase, or game-specific screens.
- Initial stat policy: 1/2/4 columns with a 96 CSS-pixel item minimum and 8-pixel gap.
- Initial full-action policy: 1/2 columns with a 144 CSS-pixel item minimum and 8-pixel gap.
- Touch targets must be at least 44 by 44 CSS pixels.
- Responsive changes must not remount children, reset forms, or alter callbacks.
- Preserve all unrelated dirty-worktree changes. Do not stage or commit without a direct user request.

---

### Task 1: Screen inventory and pre-change baseline

**Files:**
- Create: `docs/qa/2026-09-27-responsive-screen-inventory.md`
- Add binary test screenshots: `docs/qa/responsive-baseline/actor-empire-home-{320x740,393x852,430x932}.png`
- Read: `App.tsx`, `views/LifestylePage.tsx`, `views/mobile/MobilePage.tsx`, `views/lifestyle/business/ProductionHouseGame.tsx`, UI directories.

**Interfaces:** Produces a stable inventory ID, owner file, reachable route/mode, responsive risk, and validation status for each surface family. Later phases extend every family into an individual screen checklist.

- [x] **Step 1: Capture current Home baseline.** Run the existing `scripts/audit-home-responsive-browser.ts` on its isolated test save at 320, 360, 393, 412, and 430 CSS-pixel widths. Record that it currently requires four Condition columns at all widths. Preserve 320/393/430 screenshots.
- [x] **Step 2: Document navigation-derived surfaces.** List all `Page` values, `MobileAppMode` values, Lifestyle view values, StudioView values, and deep-flow families with exact owner paths. Distinguish reachable modes from ordinary component files; do not claim file count equals screen coverage.
- [x] **Step 3: Record the review gate.** Mark local browser reference images complete and physical iPhone 16 expected-versus-actual comparison pending until supplied or captured. State Phase 0 is provisional while that gate remains open.

### Task 2: Pure column-selection policy

**Files:**
- Create: `ui-layout/policy.ts`
- Create: `scripts/audit-responsive-layout-policy.ts`

**Interfaces:** Produces `ColumnPolicy`, `STAT_GROUP_POLICY`, `ACTION_GROUP_POLICY`, and `chooseColumnCount(containerWidthPx, policy)`.

- [x] **Step 1: Write failing policy assertions.** Test literal boundary outcomes:

```ts
assert.equal(chooseColumnCount(199, STAT_GROUP_POLICY), 1);
assert.equal(chooseColumnCount(200, STAT_GROUP_POLICY), 2);
assert.equal(chooseColumnCount(407, STAT_GROUP_POLICY), 2);
assert.equal(chooseColumnCount(408, STAT_GROUP_POLICY), 4);
assert.equal(chooseColumnCount(295, ACTION_GROUP_POLICY), 1);
assert.equal(chooseColumnCount(296, ACTION_GROUP_POLICY), 2);
assert.equal(chooseColumnCount(Number.NaN, ACTION_GROUP_POLICY), 1);
```

- [x] **Step 2: Run RED.** Bundle with `./node_modules/.bin/esbuild scripts/audit-responsive-layout-policy.ts --bundle --platform=node --format=esm --outfile=/tmp/ae-layout-policy-audit.mjs` and run `node /tmp/ae-layout-policy-audit.mjs`. Expect missing policy exports before implementation.
- [x] **Step 3: Implement the minimum policy.** `ColumnPolicy` has nonnegative `gapPx` and ordered `{ columns, minItemWidthPx }` variants. `chooseColumnCount` selects the greatest fitting column count using `columns * minItemWidthPx + (columns - 1) * gapPx`, and returns the smallest count for an unknown/invalid width. Reject empty or invalid policy definitions rather than silently rendering zero columns.

```ts
export const STAT_GROUP_POLICY = {
  gapPx: 8,
  variants: [
    { columns: 1, minItemWidthPx: 96 },
    { columns: 2, minItemWidthPx: 96 },
    { columns: 4, minItemWidthPx: 96 },
  ],
} as const;
export const ACTION_GROUP_POLICY = {
  gapPx: 8,
  variants: [
    { columns: 1, minItemWidthPx: 144 },
    { columns: 2, minItemWidthPx: 144 },
  ],
} as const;
```
- [x] **Step 4: Run GREEN.** Rebuild and run the same audit. Run `npx tsc --noEmit` if the repository baseline permits it; report unrelated existing errors separately.

### Task 3: Container-based layout primitives

**Files:**
- Create: `ui-layout/useContainerWidth.ts`
- Create: `ui-layout/ResponsiveGrid.tsx`
- Create: `ui-layout/Viewport.tsx`
- Create: `ui-layout/layout.css`
- Create: `ui-layout/index.ts`
- Create: `lab/responsiveLayoutQa.tsx`
- Create: `scripts/fixtures/responsive-layout-qa.html`
- Create: `scripts/audit-responsive-layout-browser.ts`

**Interfaces:** Produces `ResponsiveGrid`, `ActionGroup`, `InformationGrid`, `AdaptiveHeader`, `GameViewport`, `ContentRegion`, and `SheetActionFooter`. All preserve their child elements and keys when the measured width bucket changes.

- [x] **Step 1: Write the browser contract first.** The fixture renders a four-card InformationGrid, two full-label ActionGroup buttons, a header, and a sheet footer. At container widths 199/200/407/408, assert the stat grid has 1/2/2/4 columns. At 295/296, assert actions have 1/2 columns. Assert no horizontal overflow and that buttons keep at least 44-pixel hit targets. Increment a child mount counter, resize across a threshold, and assert it stays at one.
- [x] **Step 2: Run RED.** Open the fixture through local Vite at `http://127.0.0.1:5178/scripts/fixtures/responsive-layout-qa.html`; run the browser audit using `PLAYWRIGHT_MODULE=/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`. Expect the missing layout module to fail before implementation.
- [x] **Step 3: Implement primitives.** Observe one container per responsive group with `ResizeObserver`; use a window-resize fallback. An unknown width starts in the safe compact mode. Update state only when the rounded width changes. The grid only changes CSS geometry, not the rendered child identity. The viewport/content/header/footer primitives share safe-area and size semantics without Actor Empire imports.

```tsx
const { ref, widthPx } = useContainerWidth<HTMLDivElement>();
const columns = chooseColumnCount(widthPx, policy);
return <div ref={ref} data-layout-columns={columns} className={className}
  style={{ ...style, display: 'grid', gap: policy.gapPx,
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{children}</div>;
```
- [x] **Step 4: Run GREEN.** Re-run the browser audit at all policy boundaries, plus representative 320/393/430 viewports and a short height. Verify no child remounts or console errors.

### Task 4: Development diagnostics and full Phase 1 gate

**Files:**
- Create: `ui-layout/diagnostics.ts`
- Extend: `scripts/audit-responsive-layout-browser.ts`
- Update: `docs/qa/2026-09-27-responsive-screen-inventory.md`

**Interfaces:** Produces `auditLayout(root): LayoutIssue[]` for development/test use only. It is not exported from the production `ui-layout/index.ts` barrel.

- [x] **Step 1: Write failing diagnostics checks.** Use a controlled browser fixture with one 30×30 touch target, one clipped primary label, and one horizontally overflowing region. Assert three distinct issue kinds. With corrected geometry, assert an empty issue list.
- [x] **Step 2: Run RED.** The browser audit must fail before diagnostics exists.
- [x] **Step 3: Implement diagnostics.** Inspect explicitly marked actionable elements and the root scroll width; report issue kind plus a stable `data-layout-id`. Never log player content or mutate the DOM.

```ts
export type LayoutIssue = {
  kind: 'horizontal-overflow' | 'clipped-primary-label' | 'undersized-touch-target';
  id: string;
};
export function auditLayout(root: HTMLElement): LayoutIssue[];
```
- [x] **Step 4: Run GREEN and regression gates.** Re-run policy and browser audits, `npm run build`, focused existing Home/Social responsive audits, and `git diff --check`. Record results and remaining physical-device/reference gaps in the inventory. Leave all live screens unchanged.

## Handoff

After Phase 0-1 checks, show the user the inventory, sample baseline images, core module API, and exact pending gates. Do not call Phase 0 complete until the iPhone 16 expected-versus-actual reference is reviewed. Phases 2-7 require separate implementation plans and screen-by-screen visual approval.

## Cross-check addendum

The approved design also requires semantic tokens and fixed-control overlap diagnostics. These were added under `ui-layout/tokens.ts` and `ui-layout/diagnostics.ts` with red/green assertions. Browser checks do not substitute for native WKWebView/Android WebView verification; that remains open before Phase 1 is called release-verified.
