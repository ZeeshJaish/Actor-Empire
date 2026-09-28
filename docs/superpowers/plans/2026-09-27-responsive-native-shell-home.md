# Responsive Native, Shell, and Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline in the existing checkout; preserve unrelated dirty changes and do not commit.

**Goal:** Validate the Phase 1 layout core in native iOS/Android WebViews, then migrate the shared Actor Empire shell and Home layout without changing visual identity, player state, navigation callbacks, or saves.

**Architecture:** A separate QA bundle loads the synthetic layout fixture in real WKWebView/Android WebView, displaying measurable pass/fail evidence without installing over Actor Empire. The live shell then owns one safe-area/nav/keyboard contract, and Home consumes the game-neutral container-width policy through a thin visual adapter. Layout decisions change geometry only; existing components, keys, and handlers remain.

**Tech Stack:** React 19, TypeScript, Vite, Capacitor iOS/Android WebViews, Xcode 26.2 iOS simulator, Android API 36.1 emulator, Playwright, Node assertions.

**Spec:** `docs/superpowers/specs/2026-09-27-cross-game-responsive-layout-system-design.md`

## Global constraints

- Leave the physical iPhone 16 expected-versus-actual comparison open by user request; do not call Phase 0 visually signed off.
- Preserve every current screen's visual style and all `Player`, save, purchase, tutorial, callback, and route behavior.
- The project deployment target is iOS 15.0. The available simulator runs iOS 26.2; record that version gap, never claim iOS 15 runtime verification.
- Use unique `com.zedfury.layoutqa` native test bundle IDs, synthetic data, and no installed-game replacement.
- Never change quality/performance mode in response to layout width.
- No global scale-down, tiny-font workaround, hidden primary action, or blanket overflow clipping.
- Keep the game-neutral core free of Actor Empire imports.
- Preserve existing dirty work; do not stage, commit, or release.

---

### Task 1: Native fixture evidence

**Files:** Modify `lab/responsiveLayoutQa.tsx`, `scripts/audit-responsive-layout-browser.ts`; create `lab/native-layout-qa/ios/LayoutQA.swift`, `lab/native-layout-qa/ios/Info.plist`, `lab/native-layout-qa/android/AndroidManifest.xml`, `lab/native-layout-qa/android/MainActivity.java`, `docs/qa/2026-09-27-responsive-native-validation.md`.

**Interfaces:** The fixture exposes a visible `#native-layout-status` result that derives from measured document overflow, action target rectangles, and observed grid columns. It never reads a player save. The native harnesses load only `http://127.0.0.1:5178/scripts/fixtures/responsive-layout-qa.html` (iOS) or `http://10.0.2.2:5178/scripts/fixtures/responsive-layout-qa.html` (Android emulator).

The fixture result must be computed from actual DOM geometry, not a hardcoded success label:

```ts
const buttons = [...document.querySelectorAll<HTMLElement>('#action-container button, .ae-layout-footer button')];
const pass = document.documentElement.scrollWidth <= document.documentElement.clientWidth
  && buttons.every(button => button.getBoundingClientRect().width >= 44 && button.getBoundingClientRect().height >= 44)
  && document.querySelector('#stat-container [data-layout-columns]')?.getAttribute('data-layout-columns') === '1';
status.dataset.result = pass ? 'pass' : 'fail';
```

- [x] Add a browser assertion for `#native-layout-status[data-result="pass"]`, run RED, then add a fixture self-check on mount/resize and run GREEN.
- [x] Build and install a uniquely identified iOS simulator WKWebView harness. Capture screenshot, inspect the visible result, and record iOS runtime/version and bundle ID. Never install over `com.zeeshapps.actorempire`.
- [x] Build and install a uniquely identified Android emulator WebView harness with JavaScript enabled and cleartext access limited to the local test host. Capture screenshot, inspect the visible result, and record API level and bundle ID. Never install over `com.zeeshapps.actorempire`.
- [x] Record unsupported iOS 15 runtime or unavailable emulator/device as an open compatibility gate rather than an assumed pass.

### Task 2: One shared shell contract

**Files:** Create `components/layout-adapters/actorEmpireShell.css`, `components/layout-adapters/shellGeometry.ts`, `scripts/audit-shell-geometry.ts`; modify targeted lines in `App.tsx`, `components/BottomNav.tsx`, `index.html`, and the Home energy-ledger sheet in `components/ui-overhaul/HomeScreen.tsx`; extend browser geometry audit.

**Interfaces:** `getShellClearance(navVisible: boolean, safeBottomPx: number): number` is pure and returns `safeBottomPx` for hidden nav or `60 + 12 + 20 + safeBottomPx` when visible. CSS custom properties `--ae-shell-nav-height`, `--ae-shell-nav-edge`, `--ae-shell-nav-gap`, and `--ae-shell-nav-clearance` define matching DOM geometry; immersive screens opt out. The keyboard-visible state removes the nav clearance without resetting screen state.

The pure policy can start as:

```ts
export const NAV_HEIGHT_PX = 60;
export const NAV_BOTTOM_EDGE_PX = 12;
export const NAV_CONTENT_GAP_PX = 20;
export function getShellClearance(navVisible: boolean, safeBottomPx: number): number {
  const safe = Number.isFinite(safeBottomPx) ? Math.max(0, safeBottomPx) : 0;
  return safe + (navVisible ? NAV_HEIGHT_PX + NAV_BOTTOM_EDGE_PX + NAV_CONTENT_GAP_PX : 0);
}
```

- [x] Write literal shell clearance assertions for visible/hidden nav and safe inset, run RED, implement pure geometry, run GREEN.
- [x] Write a browser test on the current app that checks 320/393/430 widths and a short 320×568 viewport: fixed nav buttons each at least 44×44, no document horizontal overflow, and Home CTA does not intersect nav. Run RED for the new clearance/attribute contract.
- [x] Integrate CSS variables and classes only in the app shell and BottomNav, retaining the same colors, art, component tree, callback props, and tutorial IDs. Replace App's duplicated `pb-nav-safe` with the shared clearance; keep legacy deep-flow utilities compatible through the new variable fallback.
- [x] Define reusable safe-area header, sheet, and dialog geometry classes in `actorEmpireShell.css`. Apply the sheet contract to the Home energy ledger and use the shell's visible-area variable for global overlays; leave deep-flow modal migrations for Phase 5.
- [x] Run the browser shell audit GREEN. Test keyboard-visible geometry with a controlled `visualViewport`/resize fixture and verify nav clearance is removed only while the keyboard is open. Do not remount screens.

### Task 3: Home visual adapter

**Files:** Modify `components/ui-overhaul/HomeScreen.tsx`, `scripts/audit-home-responsive-browser.ts`; create `components/layout-adapters/homeLayout.ts` if the pair/four-tile policy cannot be expressed directly with `ui-layout` exports.

**Interfaces:** Four-tile groups use `STAT_GROUP_POLICY` to choose 2 or 4 columns based on the measured **group** width (1 only under 200px). Two-tile groups remain two columns when at least 200px. Existing tile keys, data values, Home callbacks, CTA, tutorial IDs, and portrait flow stay unchanged. Primary name and stat labels remain readable; Store/Settings targets are at least 44px.

Keep each tile node and key stable while changing only its parent geometry:

```tsx
<InformationGrid className={`ae-tiles${sec.tiles.length === 2 ? ' ae-tiles--pair' : ''}`}>
  {sec.tiles.map(tile => (
    <div className="ae-tile" key={tile.key} style={cssVar('--c', tile.color)}>
      <div className="ae-tile-top">
        <Ico name={tile.icon} size={13} sw={1.9} />
        <span className="ae-tile-v">{Math.round(tile.value * t)}<em>%</em></span>
      </div>
      <div className="ae-tile-n">{tile.label}</div>
      <div className="ae-tile-bar"><i style={{ width: tile.value + '%' }} /></div>
    </div>
  ))}
</InformationGrid>
```

- [x] Change Home's existing browser audit first: at compact widths assert two rows of two condition tiles; at sufficient content width assert four in one row; two-tile groups stay side by side; test long names, labels, avatar/store/settings targets, CTA/nav separation, no overflow, and Home-to-Mobile navigation. Run RED against current fixed four-column layout.
- [x] Replace only tile layout geometry with `ResponsiveGrid`/`InformationGrid` and container policy, then adjust local CSS for pair-column spans, label readability, and 44px tools. Keep the current palette, art, shadows, content, order, and handlers.
- [x] Run Home audit GREEN across 320/360/393/412/430/448 widths and short/tall heights. Capture after screenshots, compare to baseline, and record visual differences awaiting owner approval.

### Task 4: Regression and handoff

**Files:** Update `docs/qa/2026-09-27-responsive-native-validation.md` and `docs/qa/2026-09-27-responsive-screen-inventory.md`.

- [x] Run policy, responsive fixture, shell, Home, Social browser audits; focused TypeScript check; `npm run build`; and `git diff --check`. Record exact passes and pre-existing failures separately.
- [x] Verify scoped Git status contains only intended new/targeted edits, with unrelated dirty changes preserved.
- [x] Report Phase 0 iPhone 16 reference and iOS 15 runtime gaps explicitly. Do not mark the game-wide responsive issue resolved; Phases 4–7 remain.
