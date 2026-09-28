# Rewarded ads — Phase 3 and Phase 4

## Delivered

- One-ad placements now distinguish player dismissal, an already-running ad, and technical unavailability.
- Failed ads grant nothing, close the loading layer, and leave the original choice or reward available for an explicit retry.
- Store rewards, debt bailout, life-event golden choices, and production-crisis golden choices use the same terminal-result handling.
- A synchronous flow lock rejects repeated taps before React can repaint, preventing duplicate reward sessions.
- The Wellness Package now discloses its two-ad requirement and shows `Ad 1` / `Ad 2` progress.
- Wellness ads are shown one at a time. Ad 2 never starts automatically.
- A failed or dismissed second ad preserves `1/2` for five minutes and retries only Ad 2.
- Duplicate or stale callbacks cannot advance the Wellness session.
- The reward is granted only after the successful `2/2` transition.

## Deliberate Phase 5–6 boundary

The five-minute `1/2` continuation is held in the current app session. It survives navigation inside the running game, but not a full process termination yet. Durable restart restoration, final grant persistence retries, and the `READY_TO_GRANT → VERIFIED_SAVE → GRANTED` sequence belong to Phase 5–6.

## Automated audit

Run:

```bash
npm run audit:rewarded-ad-phase3-4
```

The audit covers failure classification, explicit one-ad-at-a-time progression, overlap rejection, second-ad retry, five-minute expiry, stale callback rejection, and the final `2/2` transition.
