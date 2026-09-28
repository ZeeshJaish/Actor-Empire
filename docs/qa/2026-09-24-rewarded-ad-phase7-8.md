# Rewarded ads — Phase 7 and Phase 8

## Outcome

Actor Empire now uses one shared rewarded-ad preload slot, matching the Capacitor AdMob plugin's single native rewarded-ad object. Startup and player requests share the same in-flight load rather than preparing competing ads.

## Availability contract

- AdMob initialization remains guarded by one shared initialization promise.
- Native rewarded ads begin preloading after consent and SDK initialization.
- A successful preload remains ready until consumed.
- Showing an ad marks the preload slot as `SHOWING`; it cannot be reused.
- Dismissal or failed presentation triggers the next preload.
- Returning online triggers a preload attempt.
- Transient load failures receive at most three total attempts with `500 ms` and `1 s` backoff.
- Offline and no-fill stop immediately and are surfaced as different player messages.
- The removed `600 ms` retry was not an SDK readiness assumption; all readiness is now promise/event driven.

## Diagnostic events

- `reward_ad_requested`
- `reward_ad_loaded`
- `reward_ad_shown`
- `reward_ad_rewarded`
- `reward_ad_dismissed`
- `reward_ad_load_failed`
- `reward_ad_show_failed`
- `reward_ad_timeout`
- `reward_ad_preload_requested`
- `reward_ad_preload_retry`
- `reward_ad_preload_ready`
- `reward_ad_preload_failed`
- `reward_ad_resumed`
- `reward_ad_expired`
- `reward_ad_duplicate_rejected`
- `reward_ad_persisted`

Events include the request/session identity, reward type, placement, context, stage and failure reason when available. Diagnostic delivery is best-effort and cannot change whether a reward is granted.

## Automated release matrix

| Scenario | Automated evidence |
|---|---|
| Offline before request | Returns `OFFLINE` without calling the SDK loader |
| Native no-fill | Returns `NO_FILL` and does not retry repeatedly |
| Transient load failure | Bounded backoff and third-attempt success |
| Concurrent preload/request | One native load shared by both callers |
| Ad closed early | Terminal dismissal, no reward, listeners removed |
| Failed to show | Terminal failure and preload refresh |
| Load/show timeout | Terminal timeout and coordinator unlock |
| Wellness second-ad failure | `1/2` retained with five-minute continuation |
| Background/app termination | Durable `1/2` or ready-to-grant restoration |
| Repeated tap/callback | Active-request lock and duplicate callback rejection |
| Save failure | Retry verified persistence without another ad |

## Commands

- `npm run audit:rewarded-ad-phase1-2`
- `npm run audit:rewarded-ad-phase3-4`
- `npm run audit:rewarded-ad-phase5-6`
- `npm run audit:rewarded-ad-phase7-8`
- `npm run audit:admob`
- `npm run audit:reported-bug-regressions`
- `npm run lint:rewarded-ad-phase7-8`
- `npm run lint`
- `npm run build`

## Native release gate

Before store rollout, repeat the matrix on at least one Android device with live network changes and Google test ad units. Confirm Firebase receives each event in DebugView. Automated tests validate the application contract, but they do not prove live AdMob inventory, account approval, or device-specific SDK behavior.
