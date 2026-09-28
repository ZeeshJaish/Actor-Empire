# Actor Empire Adaptive Performance Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans and test-driven-development. Work directly in the current checkout; do not delegate this user-approved phased task.

**Goal:** Add a reliable adaptive controller, runtime sampling, safe-boundary application, migrated player preferences, and understandable settings without lowering quality globally.

**Architecture:** Keep performance policy in pure services. Persist only player preference and notice version. Keep runtime controller state in `App`, translate its applied level through the existing Phase 4 capability root, and place all automatic mutations behind a disabled-by-default rollout flag.

**Tech Stack:** React 18, TypeScript, Capacitor, Vite, esbuild audit scripts, Firebase analytics wrappers.

**Spec:** `docs/superpowers/specs/2026-09-24-adaptive-performance-phase5-controller.md`

## Global Constraints

- Preserve all unrelated dirty work.
- Do not stage or commit; the user has not authorized either action.
- Never alter gameplay calculations, content, saves beyond the versioned preference, or iOS Automatic quality.
- Build every policy as a pure function first and test it before App integration.

## Task 1: Preference Contract and Migration

**Files:** `services/performancePreferences.ts`, `types.ts`, `services/saveMigration.ts`, `scripts/audit-adaptive-performance-phase5.ts`, `package.json`

1. Add failing assertions for defaults, legacy migration, malformed input, and notice persistence.
2. Implement the versioned preference normalizer.
3. Add the typed field to `PlayerSettings` and normalize it in canonical save migration and App's defensive loader.
4. Run the focused Phase 5 audit.

## Task 2: Balanced Capability Profile

**Files:** `services/performanceCapabilities.ts`, `scripts/audit-performance-capabilities-phase4.tsx`, `scripts/audit-adaptive-performance-phase5.ts`

1. Add failing assertions for `BALANCED`.
2. Extend capability resolution while preserving the legacy boolean input.
3. Verify Phase 4 remains backward compatible.

## Task 3: Pure Adaptive State Machine

**Files:** `services/adaptivePerformanceController.ts`, `scripts/audit-adaptive-performance-phase5.ts`

1. Test startup mapping, Android-only Automatic behavior, shadow mode, thresholds, one-step changes, cooldown, recovery, deferred boundaries, memory emergency, and explicit overrides.
2. Implement deterministic transitions and structured decisions.
3. Keep all time and environment input explicit.

## Task 4: Low-Overhead Runtime Monitor

**Files:** `services/runtimePerformanceMonitor.ts`, `scripts/audit-adaptive-performance-phase5.ts`

1. Test health classification and ignored-window behavior.
2. Implement short requestAnimationFrame bursts plus long-task observation.
3. Ensure stop/cancel removes timers, frames, and observers.

## Task 5: App Integration and Safe Boundaries

**Files:** `App.tsx`

1. Store startup calibration and initialize the controller from the normalized preference.
2. Feed eligible runtime windows and native memory warnings into the controller.
3. Apply pending transitions only at a stable main-screen boundary.
4. Resolve Phase 4 capabilities from the controller's applied level.
5. Emit non-blocking diagnostic events for decisions and deferrals.

## Task 6: Settings and Notice

**Files:** `views/SettingsPage.tsx`, `components/PerformanceOptimizedNotice.tsx`, `services/localization/locales/*.ts`, `scripts/audit-adaptive-performance-phase5.ts`

1. Replace the legacy toggle with Automatic, Cinematic, and Performance choices.
2. Add a non-blocking first-downgrade notice with all three actions.
3. Persist the notice version and chosen preference.
4. Verify localized key coverage and accessible selected-state semantics.

## Task 7: Verification

1. Run the new Phase 5 audit.
2. Run Phase 1-4 audits.
3. Run save migration and native memory checkpoint audits.
4. Run the production build.
5. Inspect the final diff and report shadow-mode status explicitly.

