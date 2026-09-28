# Zedbury-first startup and screen readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not delegate: the user prefers direct inline execution in this shared checkout.

**Goal:** Show Zedbury as the first frame, prepare all player-visible UI before play, remove in-game page-code loaders, and show a separate truthful selected-career loading scene.

**Architecture:** A small bootstrap owns the studio ident and starts loading the full App while showing the Actor Empire progress shell. App's startup coordinator gates the menu on a screen-module registry; renderers use the ready registry rather than React.lazy. A separate career-open state tracks verified save loading, migration, and Home handoff.

**Tech Stack:** React 19, TypeScript, Vite, Capacitor Android/iOS, existing startup coordinator and save-generation storage, browser audit scripts.

**Spec:** `docs/superpowers/plans/2026-09-28-zedbury-first-startup-navigation-market-roadmap.md` Phase 1.

## Global Constraints

- Preserve current user changes; do not stage, commit, or deploy.
- Do not read, mutate, or benchmark the user's real career data. Use isolated synthetic saves.
- Preserve existing save verification, recovery, legacy migration, and native startup watchdog behavior.
- No fake percentage or cosmetic wait after the approved Zedbury ident; no in-game UI module fetch after Start Career.
- Keep `services/gameLoop` and optional telemetry deferred: they are not UI navigation modules.

---

### Task 1: Branded bootstrap and first-frame order

**Files:** `index.html`, `index.tsx`, `components/ZedburyStudiosIntro.tsx`, `App.tsx`; create a focused bootstrap module and browser audit under `scripts/`.

**Interfaces:** Bootstrap resolves `import('./App')` once and passes a flag/handoff so the App ident is not replayed; the App remains the owner of existing storage/save startup work.

- [x] Write a browser test that delays the main game import, observes the first HTML frame, and expects a Zedbury mark with no `Starting Actor Empire` text. Run it and observe failure.
- [x] Replace the pre-React shell with the approved inline Zedbury vector/black treatment; keep watchdog recovery actionable.
- [x] Move the first ident/loading presentation to a lightweight bootstrap and start importing App under it. Ensure only one ident sequence and no blank interstitial. Remove the extra fixed 650 ms reveal.
- [x] Run the first-frame audit, `npm run audit:actor-empire-intro-flow`, and `npm run build` until green.

### Task 2: Screen registry and startup readiness gate

**Files:** `App.tsx`, `services/startupHomeScreen.ts`, `services/startupCoordinator.ts`, `services/startupPresentation.ts`, `views/lifestyle/business/components/InteractiveRegionMap.tsx`, `components/studio-finance/components/launch/StepMarkets.tsx`, `components/studio-finance/components/build/CountryShape.tsx`; extend browser audit.

**Interfaces:** `loadAllGameScreens(): Promise<GameScreens>` caches all 11 page components. App starts it as the `HOME_SCREEN`/screen-readiness startup task, and reads the resolved registry only after startup is ready. Nested map components and detailed geometry are prepared with the UI before play.

- [x] Add a failing integration audit: after Start Career, first visits to Career, Phone, Lifestyle, and other pages must not render `Loading screen…`/`Preparing screen…` or request new UI JavaScript.
- [x] Add the typed, retryable screen registry and gate the menu on its resolution. Replace React.lazy/Suspense page wrappers with ready components and remove obsolete navigation-time idle preload calls.
- [x] Replace nested React.lazy map boundaries with startup-ready imports. Keep map failure/recovery visible and do not silently downgrade detail after entering the map.
- [x] Run the navigation audit, map audits, intro-flow audit, and production build. Compare slow-profile navigation with Phase 0; document current cold-start bytes/time. A pre-change cold-start measurement was unavailable, so no cold-start regression claim is made.

### Task 3: Separate selected-career loading state

**Files:** `App.tsx`, `components/ActorEmpireIntro.tsx`, `services/startupPresentation.ts`, save-related audit under `scripts/`.

**Interfaces:** Career-opening state is independent of `startupState`/`isStartupLoadingVisible`, exposes stage/progress and failure, and never reuses startup's completed 100%.

- [x] Add a failing synthetic-save test: selecting a slot gives immediate actor-themed `Opening your career` feedback before asynchronous verified load; the bar does not start at startup 100%.
- [x] Add stage transitions for verifying, migration only when needed, and preparing Home. Use generic lightweight actor art until save verification; use an honest indeterminate state if a stage has no fraction.
- [x] Keep recovery-available, missing, corrupt, legacy, and iOS renderer-recovery paths unchanged in save semantics; errors return to slot/recovery UI without erasure.
- [x] Run save-migration, save-generations, save-integrity, large-save-startup, and focused browser audits.

### Task 4: Native first-frame parity

**Files:** Android splash resources/theme, iOS `Splash.imageset`/launch storyboard, native startup audits.

**Interfaces:** Native splash is a still Zedbury frame matching the pre-React shell; the existing React ident supplies motion once WebView is live.

- [x] Capture existing Android/iOS launch artwork and compare it to the approved Zedbury vector/black brand frame.
- [x] Mechanically rasterize the exact approved vector into Android/iOS splash resources and wire them without changing app icons.
- [x] Run Android resource and iOS storyboard compilers and visually inspect rendered assets. No device/simulator was available, so on-device first-frame verification is pending.

### Task 5: Phase 1 closure

**Files:** focused audits and this plan only unless a failed gate requires a scoped fix.

**Interfaces:** No change to Market price, bids, rights, or current offers.

- [x] Run `npm run build`, startup/intro/navigation/map/save audits, and Phase 0 browser first-navigation paths on fresh and long synthetic saves.
- [x] Measure warm/cold production-preview startup on normal and 4× CPU, transferred bytes, errors, first-menu paint, first page transitions, and selected-save opening. The pre-change cold-start and peak-memory baselines were not available; see the QA report.
- [x] Review scoped diff and `git diff --check`; state native device-visual and unrelated type-check limitations explicitly. Do not claim mobile release sign-off before device QA.
