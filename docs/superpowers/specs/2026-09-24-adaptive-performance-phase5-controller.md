# Adaptive Performance Phase 5 Controller Design

## Goal

Protect Android players from long-session freezing without lowering visual quality for devices that already run Actor Empire smoothly. Gameplay data, screen content, progression rules, and image source assets remain identical in every mode.

## Player Modes

- `AUTOMATIC` is the default and recommended mode. Android starts from measured startup evidence and may move one visual level at a time.
- `CINEMATIC` pins the full visual profile.
- `PERFORMANCE` pins the optimized visual profile.

The internal runtime levels are `FULL`, `BALANCED`, and `OPTIMIZED`. `BALANCED` reduces only expensive decorative work. It is the first automatic response; automatic mode never jumps directly from Full to Optimized for ordinary pressure.

## Startup Decision

The existing startup calibration result seeds the session:

- `KEEP_FULL_QUALITY` -> `FULL`
- high-confidence `CONSIDER_OPTIMIZED` -> `BALANCED`
- `OBSERVE_MORE` -> `FULL` while runtime monitoring continues
- iOS and web -> `FULL` in Automatic mode

Explicit player choices apply on every platform. Automatic adaptation is Android-only.

## Runtime Controller

The controller is a pure state machine. It owns a recommended level, an applied level, health streaks, cooldown timestamps, and a deferred transition. It does not own gameplay state.

- Three consecutive unhealthy eligible windows request one step down.
- Six consecutive healthy eligible windows request one step up.
- Ordinary applied changes have a two-minute cooldown.
- Memory pressure requests `OPTIMIZED` immediately, but visible profile changes still wait for a safe UI boundary.
- Hidden, interrupted, rewarded-ad, week-processing, or otherwise critical-flow windows are ignored.
- A pending transition is applied at the next safe boundary.

Automatic application is protected by `VITE_ADAPTIVE_PERFORMANCE_APPLY`. When the flag is off, the controller runs in shadow mode: it calculates and reports recommendations but leaves the applied profile at Full. Explicit Cinematic and Performance choices are never shadowed.

## Safe Boundary

Visible changes are allowed only while the game is on a stable main page and no critical activity is active. At minimum, changes are deferred during:

- weekly processing and recovery;
- rewarded ads;
- save recovery;
- modal life events, press events, medical/baby prompts, and debt resolution;
- startup/loading, creation, death, awards, and cinematics.

## Persistence and Migration

Player settings gain:

```ts
performance: {
  schemaVersion: 1;
  preference: 'AUTOMATIC' | 'CINEMATIC' | 'PERFORMANCE';
  noticeVersion: number;
}
```

Legacy `smoothMode: true` migrates to `PERFORMANCE`. False, missing, or malformed legacy values migrate to `AUTOMATIC`. Runtime levels, health streaks, and device observations are session-only and never enter save data. The deprecated `smoothMode` field remains readable for rollback compatibility and mirrors whether the explicit Performance mode is selected.

## Player Communication

Settings presents three clear choices and avoids language that labels a device as weak. The first applied automatic downgrade displays a non-blocking notice:

> Performance optimized — We adjusted a few visual effects to keep your game smooth during longer sessions. Your content and gameplay remain unchanged.

The notice offers Keep Automatic, Use Cinematic, and Use Performance, and its version is saved after dismissal or selection.

## Telemetry

Events record the startup decision, eligible/ignored health windows, recommended and applied transitions, deferred boundaries, recoveries, memory-pressure requests, preference overrides, and whether Automatic is in shadow or apply mode. Telemetry must never block rendering, saving, or week processing.

## Rollout

Ship Phase 5 with the automatic-application flag off first. Validate recommendation rates and false positives, then enable controlled Android cohorts. Cinematic and Performance remain immediately available to players throughout the rollout.

