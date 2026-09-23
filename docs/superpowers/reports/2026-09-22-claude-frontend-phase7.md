# Claude Frontend Integration — Phase 7 Report

Date: 2026-09-22

## Outcome

Phase 7 passes its interaction, responsive, motion, and accessibility gate. The integrated Build and Opening Programme surfaces are usable at the approved phone and desktop sizes without horizontal overflow, obscured primary content, or sticky-footer overlap.

This phase changed presentation and interaction contracts only. It did not change economy balance, capacity balance, pricing, or protected Claude entries #77–#79.

## Inherited failure adjudication

Two failures carried from Phase 6 were reproduced and resolved before the visual gate:

1. `audit:streaming-canonical-foundation-phase1` expected the guided flow to advance to market clearances. The real defect was that market clearance completion was inferred from launch readiness instead of the persisted market-review completion flag. `MARKET_CLEARANCES.complete` now reads `marketDecision.reviewComplete`; its in-progress state remains tied to readiness.
2. `audit:streaming-infrastructure-finale-phase10` depended on a brittle Patent Cinema source-text match. The audit now exercises the real research lifecycle and verifies the `AWAITING_IP` to `READY_TO_INSTALL` transition, patent-only treasury deduction, and queued event.

Both audits pass.

Phase 7 also found that the Boardroom and Finance adapters did not expose the shared `data-epx-root` interaction scope. That prevented the shared focus, touch-target, and reduced-motion contracts from applying. Both adapters now opt into the common scope, and the design-system audit passes across all 18 cinematic roots.

## Visual-state matrix

Automated browser coverage ran at:

- 393 × 600
- 393 × 852
- 430 × 932
- 1440 × 900

The matrix contains 44 state/viewport checks:

- Build: empty, configured, blocked, failed, commissioned, construction, complete
- Opening Programme: executing, action required, ready, live

Evidence is stored locally in `/tmp/actor-empire-phase7`.

## Accessibility and interaction work

- SVG regions and cities are keyboard reachable and respond to Enter and Space.
- The interactive network map exposes a group rather than hiding its controls behind an image role.
- Build stages announce their label, current/completed state, and health.
- Unavailable server increments explain when a room is full.
- Disabled Test, Opening Night, and Commission actions reference visible reasons.
- Opening readiness changes use a live status region.
- Primary blocker and readiness copy wraps instead of being silently truncated.
- Focus-visible treatment is present for map controls and shared cinematic surfaces.
- Focused-workstream scrolling respects reduced-motion preference.
- Reduced motion resolves to stable immediate states.

## Manual and automated browser review

The live local app was exercised through region selection, keyboard map navigation, server increment, cloud-provider selection, compute adjustment, room disclosure, Money to Test to Launch navigation, Test unavailability explanation, launch blockers, and back navigation.

Automated assertions cover:

- no horizontal overflow
- no sticky/footer collision
- no duplicate IDs
- no visible unnamed buttons
- no trimmed primary launch-blocker copy
- reduced-motion behavior
- reachable map controls
- disabled-action reasons

## Verification

Passed:

- `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit`
- `npm run build`
- `npm run audit:streaming-claude-ui-accessibility`
- `npm run audit:streaming-claude-ui-responsive -- http://127.0.0.1:3003`
- `npm run audit:streaming-design-system`
- `npm run audit:streaming-canonical-foundation-phase1`
- `npm run audit:streaming-infrastructure-finale-phase10`
- `git diff --check`

The production build retains pre-existing chunk-size and mixed static/dynamic import warnings; it completes successfully. This repository has no generic `npm test` script, so Phase 7 uses the focused audits above plus TypeScript, production build, live browser interaction, and diff hygiene.

## Gate decision

GO for Phase 7. Phase 8 remains the final regression, migration, and release gate; it is not included in this phase.
