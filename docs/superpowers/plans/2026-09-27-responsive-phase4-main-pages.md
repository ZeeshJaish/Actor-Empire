# Responsive Phase 4 Main Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline in this existing dirty checkout; do not commit, stage, or overwrite unrelated edits.

**Goal:** Make Career, Improve, Social, Lifestyle hub, Store, and Settings readable and operable across compact and wide phone viewports without changing game state, page content, purchases, rewards, or visual identity.

**Architecture:** Keep `views/*Page.tsx` adapters and all game callbacks authoritative. Reuse the game-neutral `ui-layout` container-width primitives for repeated stat/action grids, and use local scoped CSS only for screen-specific flex/scroll geometry. Extend one synthetic-save browser audit so each page has measured layout, touch-target, and navigation evidence.

**Tech Stack:** React 19, TypeScript, Vite, existing `ui-layout` primitives, Playwright browser audit, Capacitor WebViews.

**Spec:** `docs/superpowers/specs/2026-09-27-cross-game-responsive-layout-system-design.md`

## Global constraints

- Phase 0's physical iPhone 16 composition review remains deferred by the owner.
- Preserve current palettes, artwork, typography personality, content order, `Player` schema, saves, ads, purchases, tutorial IDs, callback identities, and route behavior.
- Do not change the startup “Starting Actor Empire” label, by explicit owner choice.
- Do not change performance/quality mode as a function of viewport width.
- No blanket clipping, global scale-down, or narrower font workaround for a layout overflow.
- Readonly synthetic-save QA must not touch existing game saves. Do not install over the native game bundle ID.
- A browser pass is not physical iPhone or full native-app approval.

---

### Task 1: Measured page contract and baseline

**Files:** Create `scripts/audit-main-pages-responsive-browser.ts`, update `docs/qa/2026-09-27-responsive-screen-inventory.md`.

**Interfaces:** The browser script creates a fresh context for each of 320×568, 360×800, 393×852, 430×932, and 448×956. It writes a synthetic `INITIAL_PLAYER` save to that context, enters the game, and visits the six main surfaces through their real navigation buttons. For each page it records `documentElement.scrollWidth`, the page root width, primary label clipping, tappable target rectangles, content scrollability, and whether the fixed dock intersects content. It captures baseline screenshots before any implementation change.

- [x] Add literal assertions for the six page identities, no document horizontal overflow, primary action and close/back targets ≥44×44, scroll access on the 320×568 case, and page-specific grid behavior. Run against current code and record expected RED failures, not merely syntax/runtime errors.
- [x] Record which failures belong to shared chrome versus each page. Do not alter other screens or native runtime files.

### Task 2: Shared main-page controls

**Files:** Modify `components/ui-overhaul/theme.tsx`, `components/ui-overhaul/ui.tsx`; extend `scripts/audit-main-pages-responsive-browser.ts`.

**Interfaces:** Existing `Segmented` tab keys, children and callbacks remain unchanged. The shared `.ae-seg-b` and `.ae-sheet-x` targets become at least 44px tall/wide. The shared `.ae-sheet` consumes `ae-shell-sheet` geometry without changing content or modal lifecycle. Tests measure rectangles and close/reopen behavior, not source strings.

- [x] Add a failing browser assertion for 44px segmented and sheet-close targets on Improve and Social.
- [x] Make the smallest shared control geometry change; keep the current colors and animation style.
- [x] Rerun the affected flow tests GREEN, including switching tabs and closing a sheet.

### Task 3: Career and Improve

**Files:** Modify `components/ui-overhaul/CareerScreen.tsx`, `components/ui-overhaul/ImproveScreen.tsx`; extend `scripts/audit-main-pages-responsive-browser.ts`.

**Interfaces:** Career schedule, promotions and task groups must choose readable columns from their *container* widths; Improve's four Condition dials must be 2×2 on compact screens and four in a row only when each dial has room. Workshop, genre, skill and sheet actions must not clip names or trap their buttons. Preserve `onProjectAction`, `onProductionTask`, `onWellbeingAction`, `onEnrollCourse`, `onCancelCourse`, `onTrainGenre` and all item IDs.

- [x] Write Career/Improve geometry and navigation assertions before editing; verify RED for compressed fixed grids or targets.
- [x] Use `InformationGrid` and `ActionGroup` where the same 2/4-stat and 1/2-action policies fit. Use local CSS for the three-column schedule and screen-specific cards, allowing wrapping or internal scroll only where the entire item remains reachable.
- [x] Verify compact and wide screenshots, an Improve tab switch, and a non-mutating open/close of a course/action sheet.

### Task 4: Social and Lifestyle hub

**Files:** Modify `components/ui-overhaul/SocialScreen.tsx`, `components/ui-overhaul/LifestyleHubScreen.tsx`; extend `scripts/audit-main-pages-responsive-browser.ts`.

**Interfaces:** Relationship, legacy and destination buttons keep their IDs and callbacks. Card flip remains intact. Narrow screens can reflow a two-column detail block or action group into one column; content-bearing labels must stay visible, and a close/back route remains ≥44×44.

- [x] Write a failing narrow-screen assertion for a dense Social/Lifestyle section and a real route interaction.
- [x] Apply scoped container-aware geometry, not global font shrinking. Preserve Social's continuation confirmation and Lifestyle's card/destination handlers.
- [x] Verify both pages at compact and wide widths and that opening/closing non-mutating details does not reset the page.

### Task 5: Store and Settings

**Files:** Modify targeted responsive CSS/markup in `components/ui-overhaul/StoreScreen.tsx` and `views/SettingsPage.tsx`; extend `scripts/audit-main-pages-responsive-browser.ts`.

**Interfaces:** Rewarded-ad and premium-purchase callbacks must remain untouched; tests open but never complete a payment or reward. Settings' save-transfer and support callbacks remain untouched; tests navigate and return without exporting/importing or modifying a save. Dense Store cards and Settings rows wrap according to available width, and every back/close control is ≥44×44.

- [x] Write failing compact-width assertions for Store reward cards/modal controls and Settings header/rows.
- [x] Apply scoped layout changes only; preserve text, art, reward progress state, purchase confirmation sequence, and Settings modes.
- [x] Verify tab/modal/back navigation, no horizontal overflow, and no unintended action triggers.

### Task 6: Regression and handoff

**Files:** Update `docs/qa/2026-09-27-responsive-screen-inventory.md`; add Phase 4 screenshots under `docs/qa/responsive-after/`.

- [x] Run the Phase 4 browser audit across all listed viewports, the existing Home/Social/shell audits, focused TypeScript, `npm run build`, and `git diff --check`. Record actual outputs and pre-existing warnings separately.
- [x] Visually compare compact/wide screenshots in one bounded pass and correct only verified defects in scope; rerun once.
- [x] Keep physical iPhone 16, iOS 15 runtime, full-game native interaction and owner screenshot approval explicit as open gates. Phase 4 is not release-signed until those gates are reviewed.
