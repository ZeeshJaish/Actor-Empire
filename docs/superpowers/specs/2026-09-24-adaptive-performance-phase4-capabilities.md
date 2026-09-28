# Actor Empire Adaptive Performance — Phase 4 Capability System

Date: 2026-09-24

Status: implemented locally; manual selection only.

## Purpose

Phase 4 replaces the old all-or-nothing `.smooth-mode` styling mechanism with a versioned set of independent rendering capabilities. It creates the shared contract that current and future systems can consume without changing game rules, content, information hierarchy or player progression.

Phase 4 does not use the Phase 3 startup recommendation. Automatic profile selection, player-facing mode choices and runtime adaptation remain Phase 5 work.

## Capability contract

Every profile resolves all seven capabilities:

| Capability | Values | Consumer responsibility |
| --- | --- | --- |
| Blur | `FULL`, `REDUCED`, `OFF` | Use shared blur variables or the root data attribute. |
| Shadows | `FULL`, `REDUCED`, `OFF` | Mark expensive decorative shadows with `ae-perf-heavy-shadow`. |
| Animation density | `FULL`, `REDUCED`, `MINIMAL` | Mark nonessential repeating motion with `ae-perf-decorative-motion`. |
| Background motion | `FULL`, `REDUCED`, `PAUSED` | Mark ambient moving backgrounds with `ae-perf-background-motion`. |
| Particle density | `FULL`, `REDUCED`, `OFF` | Mark repeated decorative particles with `ae-perf-particle`. |
| Image-quality budget | `FULL`, `BALANCED`, `CONSTRAINED` | Ask `getImagePixelRatioBudget` before generating or decoding responsive imagery. |
| Off-screen mounting | `KEEP_MOUNTED`, `UNMOUNT_INACTIVE` | Ask `shouldMountOffscreenContent` before retaining inactive heavy surfaces. |

The contract and root DOM attributes are schema-versioned. CSS systems can consume the attributes and shared custom properties; React systems can consume the context through `usePerformanceCapabilities`.

## Current profile mapping

The existing player setting remains the only selector in Phase 4:

| Existing setting | Capability profile |
| --- | --- |
| Smooth Mode off | `FULL` |
| Smooth Mode on | `OPTIMIZED` |

`FULL` preserves every capability. `OPTIMIZED` independently disables blur, reduces decorative shadows and repeating animation, pauses explicitly marked background motion, reduces explicitly marked particles, caps generated-image pixel ratio at 1.5, and recommends unmounting inactive heavy surfaces.

The old selector that forced every descendant animation and transition to `0.01ms` has been removed. Essential progress, navigation and interaction feedback are therefore not globally destroyed. The blanket coarse-pointer blur shutdown has also been removed: a touch screen is not evidence that a device is weak.

## Adoption rules

- Do not branch game calculations or content on these capabilities.
- Essential feedback must never use the decorative-motion or particle markers.
- New expensive visual systems must consume the shared contract instead of introducing another local Smooth Mode boolean.
- Existing heavy systems can migrate incrementally and must preserve their full-quality appearance when the `FULL` profile is active.
- Off-screen unmounting must preserve serializable state outside the component tree.
- Image budgets control decode/render resolution, never which artwork or information the player receives.

## Phase boundary

Phase 4 does not add `Automatic`, `Cinematic` or `Performance` settings, does not persist a new preference, does not apply Phase 3 recommendations, does not show a device warning, and does not implement runtime cooldown or recovery.

Phase 5 will map player choices and verified Android runtime evidence onto these capabilities. Until that controller exists, only the player's existing manual Smooth Mode choice selects `OPTIMIZED`.
