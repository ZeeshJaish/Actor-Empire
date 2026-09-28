# Phase 7 Device-lab Sign-off

## Current status

Automated validation is complete. Every physical-device row is **NOT RUN — hardware not connected**. Do not convert a row to Pass from a simulator, desktop browser, build result, or inferred chipset specification.

## Release-candidate identity

- Build version:
- Git commit:
- Android WebView version:
- Tester and date:
- Analytics environment:

## Required matrix

| Row | Hardware class | Required graphics coverage | Cold start | Warm start | Onboarding | Rewarded ad | Process Week x10 | Studio acquisition | 30 min | 60 min | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | High-end iPhone | Apple GPU | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | NOT RUN |
| 2 | High-end Android | Current flagship GPU | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | NOT RUN |
| 3 | Mid-range Android | Mali or Adreno | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | NOT RUN |
| 4 | Low-RAM Redmi/Itel/realme class | Device's production GPU | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | NOT RUN |
| 5 | Android compatibility | PowerVR family | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | NOT RUN |
| 6 | Android compatibility | Mali family | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | NOT RUN |

One physical Android may cover multiple rows only when its RAM tier and GPU are recorded. The high-end, mid-range, and low-RAM behavior results must still remain separately visible.

## Run procedure

For each row:

1. Install the same signed release candidate used for every other row.
2. Record device model, OS, installed RAM, GPU family, and Android WebView version in the private test record. Do not send these identifiers through the new analytics event.
3. Cold start after force-stop and verify the Zedbury animation, temporary logo, loading screen, and first playable screen complete without a black screen or input block.
4. Warm start twice and confirm the saved slot and visual-quality preference remain intact.
5. Complete the new-player onboarding path.
6. Complete one rewarded-ad unlock, including returning from the native ad surface.
7. Process ten ordinary weeks. Confirm each advances exactly once, saves successfully, and returns input control.
8. Complete one studio acquisition through control, documents, and signing. Confirm it cannot loop or duplicate the acquisition.
9. Continue active play for 60 minutes. Exercise navigation, ads, weekly processing, and studio screens during the run; do not leave the game idle for the whole session.
10. Capture the `device_validation_checkpoint` events at 30 and 60 active minutes and attach any Android vitals, logcat, Xcode Organizer, or crash evidence.

## Evidence fields

Record these for both checkpoints:

- `status`
- `initial_level` and `current_level`
- `full_quality_maintained`
- `profile_changes`
- `healthy_windows`, `unhealthy_windows`, and `ignored_windows`
- `frame_p95_max_ms`
- `slow_frame_ratio_max_pct` and `long_task_ratio_max_pct`
- `min_available_memory_pct`
- `max_thermal_status`
- `low_memory_observations`

## Pass rules

- High-end iPhone: Full quality at both checkpoints, zero profile changes, no crash/restart/black screen, and all critical flows pass. iOS observation must never lower quality.
- High-end Android: Full quality remains when the device stays healthy. A downgrade requires captured runtime pressure, not merely its model name.
- Mid/low Android: no crash, ANR, blocked input, save rollback, duplicate week, or acquisition loop. Automatic profile changes are acceptable only at safe boundaries and must recover after sustained healthy evidence.
- All rows: 30- and 60-minute events emit at most once; background time does not count; telemetry contains no player content or save payload.

A row fails if a critical flow fails, if a save loses progress, if iOS changes quality automatically, or if an Android quality change has no corresponding evidence. Any failure blocks Phase 8 rollout until triaged.
