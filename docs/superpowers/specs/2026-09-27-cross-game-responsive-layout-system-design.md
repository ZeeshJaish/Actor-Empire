# Cross-game responsive layout system

Date: 2026-09-27
Status: Design for user review

## Decision and goal

Preserve each Actor Empire screen's current visual identity while standardizing how it fits different available widths, heights, safe areas, content lengths, and text settings. A small device may show two full-size actions per row instead of four compressed actions. Layout changes must preserve hierarchy, information, gameplay callbacks, and saved state.

Build the reusable rules as a game-neutral React/WebView layout module inside this repository. Validate the module across Actor Empire before extracting or publishing it for future React/WebView games. Games with another UI runtime can reuse the documented rules, but not the React components directly.

This is an architectural rollout, not one global CSS override. Every reachable Actor Empire surface is in scope. The project is complete only after the screen inventory and its regression matrix are closed.

## Existing constraints

- `App.tsx` owns the game shell, page routing, and bottom-navigation clearance. `index.html` defines the safe-area helpers.
- `components/BottomNav.tsx` owns the six-icon navigation. `components/ui-overhaul/theme.tsx` supplies shared presentation styles to several main screens, while `HomeScreen.tsx` has separate `ae-root` styles. Other systems have their own CSS and Tailwind layouts.
- Home currently forces four stat tiles into one row and makes labels smaller at compact widths. Other screens use unrelated fixed grids, wrapping rows, and truncation rules. A single screen-width breakpoint cannot reliably govern nested cards, sheets, and full-bleed phone scenes.
- The iOS deployment target is 15.0. The baseline implementation must be verified there; newer CSS features may be progressive enhancements but not its sole layout mechanism.
- The worktree contains unrelated ongoing changes. Migrations must preserve them and must not replace game state or handlers with demo state.

## Architecture

### 1. Game-neutral layout core

Create a small module under `ui-layout/` with no imports from Actor Empire `Player`, services, saves, purchase code, or game-specific screens. Actor Empire-specific adapters live under `components/layout-adapters/`. The core owns:

- semantic layout tokens: spacing, minimum readable widths, touch-target floor, maximum content width, safe-area offsets, and compact/regular/wide layout names;
- layout policies: an allowed column set per component role, such as `2 or 4` for a stat group and `1 or 2` for full-action buttons;
- focused primitives for a safe-area viewport, responsive content region, action group, information grid, adaptive header, and sheet action footer;
- development-only measurements that identify horizontal overflow, clipped primary labels, undersized hit targets, and content hidden behind fixed chrome.

The core accepts theme variables and slot content. It does not choose colors, artwork, copy, page destinations, game rewards, or performance-quality modes. Existing screen styles remain authoritative for visual treatment.

The layout decision is made from the actual content container's usable width, not a device model, screen ratio, or memory/power classification. Where a component needs an exact `2 or 4` transition, measure only that component's container and update a discrete layout class when its width bucket changes. Avoid per-frame measurement, measuring each child, or creating a ResizeObserver for every tile. CSS-only intrinsic layouts are preferred where they produce the intended column sets on the supported runtime.

Initial Actor Empire policy: a four-stat group uses four columns only when each card has at least 96 CSS pixels; otherwise it uses two columns. A full-label action group uses two columns only when each action has at least 144 CSS pixels; otherwise it uses one. Both policies keep source order. These are readable-width defaults for the first visual review, not global rules for every future game's component. The six-item icon navigation instead enforces its own 44-pixel hit-target gate. Component consumers can choose from named, documented policies; they cannot silently provide arbitrary breakpoints per screen.

### 2. Actor Empire adapters

Thin adapters bind the neutral primitives to Actor Empire's existing visual tokens and screen markup. They keep the current art direction for Home, Career, Improve, Social, Lifestyle, Mobile, Store, Settings, onboarding, studios, streaming, and overlays. They do not move `Player` data or callbacks into the layout module.

The app shell owns one safe-area and bottom-navigation clearance contract. Individual screens consume it rather than each adding an independent estimate. A full-bleed or immersive screen opts out explicitly. Keyboard, sheet, and modal variants share the same visible-area rules.

### 3. Component behavior contract

- Primary actions never disappear through clipping, horizontal overflow, or an unlabeled icon substitution.
- A primary action's full label remains readable; when it cannot fit, the action moves to another row or grows vertically. Secondary metadata may truncate only when its full form remains reachable.
- A layout may change row count, but must not reorder actions, change their meaning, or fire different handlers.
- Touch targets meet the agreed minimum of 44 CSS pixels in each direction, including icon-only controls.
- Stats can use a different column policy from buttons. The six-icon bottom navigation is evaluated as navigation, not forced into the action-grid policy.
- Sheets, dialogs, and multi-step flows retain a visible route to their primary action and Back/Close controls on short screens, with internal scrolling where necessary.
- No blanket `overflow-x: hidden`, global scale, or tiny-font rule is accepted as an overflow fix.
- Layout mode is independent of the existing cinematic/performance rendering preference; a powerful phone does not receive more crowded buttons merely because it can render faster.

## Phased rollout

Each phase is separately reviewable. Do not mark the game-wide issue resolved until Phase 7 is complete.

| Phase | Delivery | Gate |
| --- | --- | --- |
| 0. Inventory and reference | List every reachable screen, nested flow, modal, fixed control, and current overflow/truncation. Capture reference compositions on the user's iPhone 16 and representative compact/wide viewports. | Screen list, owners, baseline images, and affected flows reviewed. |
| 1. Core contract | Add the game-neutral tokens, layout policies, primitives, and focused tests without replacing screen visuals. | Supported iOS/Android/WebView behavior verified; no game-state imports or page regressions. |
| 2. Shared chrome | Adopt one safe-area, app-shell, bottom-navigation, header, sheet, dialog, and keyboard-clearance contract. | Fixed controls remain visible and tappable on short and tall viewports. |
| 3. Home | Reflow the profile header and stat groups by available width while retaining the supplied visual design and week action. | Approved screenshots plus no lost tutorial hooks, callbacks, or feed content. |
| 4. Main pages | Migrate Career, Improve, Social, Lifestyle hub, Store, and Settings in bounded screen slices. | Each screen passes visual approval and interaction regression checks before the next slice. |
| 5. Deep flows | Migrate Mobile apps, onboarding, life events, studio/streaming/acquisition flows, ads, purchases, and remaining overlays using the same primitives. | Every row in the screen inventory is covered; no flow state, save, or purchase behavior changes. |
| 6. Stress and accessibility | Exercise long names, large amounts, all supported languages, larger text, reduced motion, keyboard, small heights, and safe areas. | No clipped primary action or unintended horizontal page scroll; hit targets and labels pass. |
| 7. Cross-game extraction and release gate | Freeze a documented public API and theme adapter, add examples and versioning, run complete automated/native regression, then extract the neutral module for reuse. | iOS/Android device evidence, screenshot review, and the full screen inventory are signed off. |

## Verification strategy

Use representative CSS viewport widths of 320, 360, 375, 393, 430, and 448 pixels, plus wider centered and full-bleed cases. Include short and tall heights, safe-area insets, and keyboard-visible states. These are test inputs, not device-specific breakpoints. The actual column transition is set by the component's minimum readable width and design policy.

For each screen slice, combine:

1. deterministic layout-policy tests at boundary widths;
2. rendered geometry checks for horizontal overflow, primary-label clipping, fixed-control overlap, and hit-target size;
3. screenshot comparisons against the approved screen composition;
4. interaction tests for the same handlers, route destinations, tutorial anchors, and unsubmitted drafts;
5. physical iPhone 16 and compact-iPhone checks, plus representative Android checks before release.

Automated success does not replace visual approval. A screenshot review does not replace gameplay regression tests. The current public build and the unreleased workspace should be compared explicitly; do not treat historical review data as evidence that a new build has passed.

## Failure handling and rollout safety

Adopt one screen slice at a time. If the measured container width is initially unknown, render the safe compact arrangement and upgrade after measurement without moving or resetting game state. If an unsupported runtime or layout measurement fails, keep readable stacked actions rather than squeeze or hide them. Any screen that cannot preserve its current hierarchy under these rules is reviewed as a screen-specific design decision; it is not globally restyled.

The size bucket changes styling and geometry only. It must not change child keys, remount a wizard, clear an input, reset scroll position, or change which callback is wired to a control.

Keep the neutral module internal until Actor Empire validates it. Reuse in another game requires its own theme and screen adapters, compatibility tests, and a versioned change process. Do not couple responsive layout to save migrations, analytics, or adaptive rendering quality.

## Explicit non-goals

- No redesign of artwork, color palettes, typography personality, or content hierarchy without separate approval.
- No changes to `Player` schema, save format, rewards, purchases, simulation, or navigation semantics as part of a layout migration.
- No promise of pixel-identical screens across devices; preserve intent, readability, and behavior instead.
- No blanket device detection, automatic low-quality mode, or forced four-column layout on narrow screens.
