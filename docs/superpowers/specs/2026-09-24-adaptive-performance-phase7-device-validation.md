# Adaptive Performance Phase 7: Device and Long-session Validation

## Objective

Prove that capable devices retain full visual quality and that constrained Android devices complete long sessions without sustained frame, memory, or thermal pressure.

Phase 7 does not change gameplay or add a rollout flag. It adds observation and a repeatable validation contract. Controlled exposure remains Phase 8.

## Validation matrix

Every release candidate must cover:

- a high-end iPhone in full-quality observation mode;
- a high-end Android device in Automatic mode;
- a mid-range Android device;
- a low-RAM Redmi/Itel/realme-class device;
- at least one PowerVR-family Android GPU;
- at least one Mali-family Android GPU.

Each hardware row runs cold start, warm start, onboarding, rewarded ad, Process Week, studio acquisition, and a 30–60 minute active-play session.

## Evidence contract

Long-session validation records only bounded technical aggregates:

- active-play duration, excluding time in the background;
- healthy, unhealthy and ignored runtime windows;
- maximum frame p95, slow-frame ratio and long-task blocked ratio;
- minimum available-memory percentage;
- maximum thermal status and low-memory observations;
- applied performance level at the start and checkpoint;
- count of actual profile changes;
- whether full quality was maintained.

No player content, save data, device model, title history or identifiers are included in the summary.

## Checkpoints

- A 30-minute checkpoint validates the minimum long-session case.
- A 60-minute checkpoint validates extended thermal and memory stability.
- Each checkpoint emits once per active-play session.
- Background time does not advance the checkpoint clock.

## Platform rules

- Android Automatic may continue using the existing controller.
- iOS records runtime health in observation-only mode and must remain at Full quality.
- Web may use the pure audit but does not emit native device-validation telemetry.
- Validation telemetry must never block gameplay, saving or rendering.

## Pass criteria

High-end parity requires Full quality for the full checkpoint with no applied automatic downgrade. Low-end reliability requires completion of the scenario, no low-memory warning, no critical thermal state, and no sustained unhealthy-window majority. Physical-device sign-off is required; simulator and desktop results cannot substitute for it.
