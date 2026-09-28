# Actor Empire Adaptive Performance — Phase 1 Quality Contract and Baseline

Date: 2026-09-24

Status: implemented locally; production cohort data begins with the first build that includes this instrumentation.

## Purpose

Phase 1 establishes evidence before adaptation. It must not select a device tier, change Smooth Mode, alter presentation, or block startup. Its only runtime responsibility is to measure the existing React loading window and send one bounded summary on native launches.

## Quality contract

The adaptive-performance programme must preserve these player-facing invariants:

- Game rules, calculations, choices, outcomes, saves and progression never change with a visual-performance profile.
- Story text, controls, navigation targets and information hierarchy remain complete.
- Actor Empire's artwork, typography, colour system and branded composition remain recognisable in every profile.
- Cinematic-capable devices retain the current full-quality presentation.
- Automatic mode may eventually reduce implementation cost, but it may not remove essential feedback or make an interaction ambiguous.
- A user-selected Cinematic or Performance preference must be respected except for emergency resource cleanup that prevents data loss or a crash.
- Adaptation must never occur during a choice, signing decision, purchase, rewarded-ad handoff or other critical interaction.

Phase 1 makes no changes to any of these surfaces.

## Current report baseline

The Sep 24 report records:

| Signal | Baseline | Interpretation |
| --- | ---: | --- |
| Android user-perceived ANR rate | 0.69% | Above the reported bad-behaviour threshold |
| Android threshold | 0.47% | Release success must move below this without harming visual quality |
| Minimum React loading-screen window | 8,600 ms | Existing product timing; Phase 1 does not extend it |
| Studio bumper window | 1,470 ms | 1,150 ms hold plus the existing 320 ms exit |

The ANR percentage is an external Play baseline, not a value calculated by the app. The new event below creates the per-launch evidence needed to segment future results by actual runtime behaviour.

## Passive startup measurement

Native launches emit one `startup_performance_baseline` analytics event when the existing loading screen closes. Web development runs collect the in-memory summary but the existing telemetry layer does not send native Firebase events from the web.

Measurement scope: `react_loading_shell`.

- `startup_ms`: navigation performance origin to loading-screen completion.
- `sampled_ms`: first React effect to loading-screen completion.
- Frame intervals: sampled using `requestAnimationFrame` during the loading window.
- Slow frame: interval greater than 34 ms.
- Severe frame: interval greater than 100 ms.
- Frame p50, p95 and maximum: rounded interval durations, not a quality decision.
- Long tasks: browser `PerformanceObserver` long-task entries when supported.
- JavaScript heap: Chromium `performance.memory` values when exposed.
- Capability hints: logical processor count and approximate device memory when exposed.
- Visibility interruption: marks launches sent to the background so they can be excluded from frame-timing analysis instead of being mistaken for weak-device performance.

Optional APIs are allowed to be absent. Missing heap, device-memory or long-task support produces a partial summary instead of an error. No model, advertising ID, player name, save contents or raw frame history is collected.

The telemetry payload is capped at 12 parameters including `measurement_scope`. This deliberately leaves room for the app version, platform and shared trace context that the existing analytics layer adds before enforcing its 25-parameter bound. Richer values remain in the in-memory summary instead of being silently truncated.

## Candidate rendering-cost inventory

This is a static candidate inventory, not a claim that each surface causes an ANR. Phase 2 and later runtime evidence must establish priority.

| Surface | Current cost indicators | Protected visual intent | Future scalable levers |
| --- | --- | --- | --- |
| Studio bumper and loading screen | Continuous grain, halo, shine, blur and filter animations | Studio mark, logo, gold identity and readable progress | Animation concurrency, grain frequency, blur radius |
| Award Night | High concentration of animations, filters and cinematic effects | Ceremony spectacle, winner reveal and readable results | Particle density, glow layers, background motion |
| Studio acquisition deal room | Multiple blurred overlays and animated panels | Negotiation clarity, documents and signing ceremony | Backdrop implementation, off-screen mounting, transition concurrency |
| Production Wizard and Greenlight maps | Large interactive trees, maps and modal overlays | Map-first selection and production decision clarity | Map detail while moving, containment, lazy mounting |
| Streaming command surfaces | Numerous cinematic CSS modules and wall/screen treatments | Premium studio-control identity and complete business data | Off-screen panels, animated screen count, shadow/filter layers |
| Global modals and navigation overlays | Repeated backdrop blur, shadows and entrance transitions | Focus, hierarchy and touch feedback | Shared blur/shadow tokens and safe-boundary transitions |
| Image-heavy lifestyle and mobile apps | Many artwork-bearing cards and nested views | Content fidelity and recognisable assets | Decode size, lazy loading, cache budget, list virtualisation |

Static inspection found the densest candidate files around `AwardNightFlow`, studio-finance cinematic CSS, streaming wall/screen modules, the startup intro, and the studio-acquisition deal room. These counts are discovery signals only; they must not become a device blacklist or justify a visual downgrade by themselves.

## Existing Smooth Mode boundary

The existing `smoothMode` boolean and global `.smooth-mode` CSS remain unchanged in Phase 1. Today that CSS broadly disables blur/filter effects and collapses animations. It is too coarse to become the adaptive controller directly; Phase 3 will replace that broad mechanism with independently adjustable performance tokens after baseline evidence is available.

## Known limitations

- Frame sampling begins after React's first committed effect, so it does not measure native process creation or initial JavaScript bundle parsing.
- JavaScript heap reporting is browser-specific and is not native Android memory accounting.
- Logical processors and device memory are supporting hints, not performance classifications.
- The first release can establish correlations, but it cannot by itself prove that a particular effect caused an ANR.
- Native low-RAM, thermal and memory-pressure signals belong to Phase 2.

## Phase 1 acceptance gates

- Measurement tests cover summary calculations, malformed samples, missing optional signals, collector cleanup, idempotent completion and bounded telemetry.
- The Phase 1 measurement module passes an isolated strict TypeScript check and the production bundle succeeds.
- Startup timing, UI, Smooth Mode and player settings are unchanged.
- Exactly one summary is reported per completed loading window.
- No raw sample arrays or personal/player data leave the device.

The repository-wide TypeScript gate must also be green before a release is cut. In the current dirty checkout it remains blocked by unrelated in-progress pricing work: missing `React` namespace types in `StepPricing.tsx` and a missing `selectedCountryIds` fixture in `lab/pricingLab.tsx`.

## Production baseline procedure

After this instrumentation ships, collect at least one normal release window and segment `startup_performance_baseline` by app version and Android device family. Compare frame p95, long-task time and heap availability with Play ANR clusters. Phase 2 thresholds must be derived from those distributions and device testing, not guessed in advance.
