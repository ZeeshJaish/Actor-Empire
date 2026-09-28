# Rewarded-ad reliability — Phase 1 and Phase 2

## Scope

These phases replace the hanging rewarded-ad bridge contract and route every current rewarded placement through one coordinator. They do not change reward amounts, the Wellness two-ad requirement, five-minute partial progress, event-option fallback behavior, or final reward persistence; those belong to later phases.

## Phase 1: terminal lifecycle

The native Capacitor plugin can leave `showRewardVideoAd()` pending when an ad is dismissed or fails to present. Actor Empire now listens to the native rewarded lifecycle directly and resolves every request through one of these terminal outcomes:

- rewarded;
- user dismissed;
- load failed;
- show failed;
- load timeout;
- show timeout;
- initialization failure;
- unexpected error.

Listeners are registered before loading, removed after the terminal result, and guarded by a settle-once boundary. A reward callback wins over a later dismissal callback. Load attempts retain the existing single retry, while dismissal and show timeout never automatically launch another ad.

Default time limits are 20 seconds for initialization/consent handoff, 15 seconds for loading, and 120 seconds for the displayed ad lifecycle. Web rewarded requests also have a terminal show timeout.

## Phase 2: one coordinator

The coordinator allows one global rewarded request at a time. A concurrent tap receives a `BUSY` result without invoking AdMob again, and the lock is released after success, failure, timeout, dismissal, or an unexpected bridge rejection.

Current placements routed through the coordinator:

- Store rewards, including each existing Wellness step;
- debt bailout;
- life-event golden options;
- production-crisis golden options.

Interstitial ads remain on their existing path and are not affected.

Each coordinated result carries a request ID and placement. Durable multi-step session IDs, five-minute `1/2` recovery, progress UI, and verified final reward grants are intentionally deferred to the approved later phases.

## Automated gate

Run `npm run audit:rewarded-ad-phase1-2`.

The audit covers the original unresolved-dismissal bug, reward-before-dismiss ordering, failed-to-show termination, load and show timeouts, bridge rejection, complete and partial listener cleanup, concurrent request rejection, and coordinator recovery after runner failure.
