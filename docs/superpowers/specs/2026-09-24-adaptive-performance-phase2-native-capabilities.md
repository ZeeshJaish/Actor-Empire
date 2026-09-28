# Actor Empire Adaptive Performance — Phase 2 Native Capability Bridge

Date: 2026-09-24

Status: implemented locally; read-only collection only.

## Purpose

Phase 2 adds a versioned Android-to-JavaScript capability contract. It gives later phases reliable native evidence without selecting a quality profile, changing Smooth Mode, delaying startup or modifying any visual surface.

## Native contract

The custom Capacitor plugin is registered as `DeviceCapabilities` and exposes one method: `getSnapshot()`.

Required fields:

| Field | Source | Intended use |
| --- | --- | --- |
| `schemaVersion` | Bridge contract | Safe migrations and payload validation |
| `apiLevel`, `androidRelease` | Android build | API availability and release diagnostics |
| `isLowRamDevice` | `ActivityManager` | Strong native low-memory signal, never a standalone downgrade decision |
| `memoryClassMb`, `largeMemoryClassMb` | `ActivityManager` | Per-app heap budget context |
| `totalMemoryMb`, `availableMemoryMb` | `MemoryInfo` | Device and current memory context |
| `lowMemory`, `memoryThresholdMb` | `MemoryInfo` | Current system pressure and threshold |

Optional fields:

| Field | Availability | Intended use |
| --- | --- | --- |
| `thermalStatus` | Android 10 / API 29+ | Current thermal severity |
| `thermalHeadroom` | Android 11 / API 30+ when the vendor reports it | Headroom evidence for later runtime adaptation |
| `webViewVersion` | Android 8 / API 26+ when visible | WebView regression segmentation |

The bridge does not expose the device model, manufacturer, advertising identifier, player identity or save data. Firebase already supplies standard device dimensions for aggregate analysis; Actor Empire must not build a model blacklist into gameplay logic.

## JavaScript boundary

`nativeDeviceCapabilities.ts` validates every required field before returning an `AVAILABLE` result. It derives:

- available-memory ratio;
- a stable thermal label from Android's numeric status;
- WebView major version;
- a bounded, versioned Firebase payload.

Failure is non-throwing and produces one of:

- `NOT_ANDROID`;
- `INVALID_PAYLOAD`;
- `PLUGIN_ERROR`.

This prevents an unavailable vendor API or stale native shell from blocking game startup.

## Telemetry

Android launches emit `device_capability_baseline` with at most 12 parameters. The payload fits exactly within the existing Firebase event budget after shared app and trace context are added.

The event contains API level, low-RAM state, heap classes, total memory, available-memory percentage, current low-memory state, memory threshold, and optional thermal/WebView values.

Crashlytics receives four compact keys:

- `device_low_ram`;
- `device_memory_class_mb`;
- `device_thermal_status`;
- `device_webview_major`.

Bridge failures on Android emit `device_capability_unavailable`; web and iOS return `NOT_ANDROID` silently.

## Reliability rules

- Available memory is transient and must not be used alone to label a device.
- Missing thermal headroom is normal and must not be treated as zero.
- Low-RAM status is evidence, not an automatic quality decision.
- No polling is introduced in Phase 2. The bridge takes one startup snapshot; the existing Android `onTrimMemory` event remains the asynchronous memory-pressure path.
- No profile, popup or CSS class is changed in this phase.
- Phase 3 startup calibration must combine this snapshot with measured frame/long-task evidence from Phase 1.

## Verification scope

- TypeScript audit verifies valid normalization, malformed payload rejection, non-Android fallback, native failure recovery and Firebase payload bounds.
- Java unit tests verify memory-unit and thermal-headroom normalization.
- Android debug compilation verifies the Capacitor plugin against the current SDK and native host.
- Production web bundling verifies the JavaScript bridge and startup integration.

Physical-device verification should confirm real values on at least one API 29 device and one API 30+ device before release. A missing optional field is acceptable; a missing required memory field is not.
