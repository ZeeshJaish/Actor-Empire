# Actor Empire Adaptive Performance — Phase 3 Startup Calibration

Date: 2026-09-24

Status: implemented locally in measurement-only mode.

## Purpose

Phase 3 combines Phase 1's observed startup behaviour with Phase 2's native Android snapshot. It produces a provisional recommendation and explanation without changing quality, showing a player prompt, adding loading time, or affecting iOS.

The calibrator is evidence-based rather than model-based. A device is not downgraded because of its brand, model, CPU count, total RAM or low-RAM label alone.

## Inputs

Runtime evidence from the existing loading period:

- valid animation-frame sample count;
- frame p95;
- proportion of frame intervals over 50 ms;
- time occupied by browser long tasks;
- whether the app became hidden during measurement.

Native evidence from the one-shot Phase 2 snapshot:

- Android low-RAM classification;
- current Android low-memory state;
- severe-or-higher thermal state;
- thermal headroom at or above the heavy/severe boundary, when supported.

The 50 ms frame interval and greater-than-25-percent proportion are aligned with Android vitals' slow-session definitions. This short startup sample is not presented as a Play slow session: Android vitals measures sessions after one minute and uses platform frame data, while Actor Empire measures its existing WebView loading animation.

## Decision contract

The output is one of:

| Recommendation | Meaning in Phase 3 |
| --- | --- |
| `KEEP_FULL_QUALITY` | Measured startup is healthy; retain the complete visual experience. |
| `CONSIDER_OPTIMIZED` | Runtime pressure and a native constraint agree; Phase 4/5 may later use this recommendation. |
| `OBSERVE_MORE` | Evidence is incomplete, interrupted or contradictory; do not make a quality decision. |

Guardrails:

- At least 120 measured frame intervals are required.
- A backgrounded/hidden startup is rejected as a calibration sample.
- Low RAM, low memory or thermal pressure without measured runtime pressure keeps full quality.
- Runtime pressure without a native constraint is recorded for analysis but does not recommend optimization.
- A native bridge failure never blocks startup and never changes visuals.
- iOS and web are excluded from the coordinator in Phase 3.

Runtime pressure means either:

- more than 25% of sampled frame intervals exceeded 50 ms; or
- long tasks occupied more than 20% of the measured window, or one long task lasted at least 250 ms.

These thresholds are exported constants and versioned with the calibration contract so they can be reviewed against production evidence instead of becoming hidden magic values.

## Coordination and reliability

The native snapshot and startup summary finish independently. A small coordinator accepts them in either order and emits exactly once. It is cancelled on React cleanup, does not poll, and does not delay the loading screen.

The result emits as `startup_calibration_result`, with a bounded 11-field Firebase payload. Crashlytics records the recommendation, confidence and primary reason so future ANR/crash clusters can be segmented without collecting device identity or save data.

## Explicit non-goals

Phase 3 does not:

- enable the old Smooth Mode;
- add or remove CSS classes;
- reduce blur, animation, image quality or content;
- persist a player preference;
- display a capability warning;
- alter iOS behaviour;
- claim that startup calibration alone fixes non-rendering ANRs.

Phase 4 must build granular visual capability tokens before any recommendation can affect presentation. Phase 5 must add cooldowns, recovery and player overrides before automatic adaptation is enabled.
