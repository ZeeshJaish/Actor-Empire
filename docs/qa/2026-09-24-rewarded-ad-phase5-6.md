# Rewarded ads — Phase 5 and Phase 6

## Outcome

Reward progress is now durable and the reward is consumed only after a verified game save. A watched ad is no longer tied to an in-memory modal promise.

## Durable session contract

Every rewarded-ad attempt stores a versioned receipt before an ad opens. The receipt contains:

- a unique reward session ID;
- player and save-slot identity;
- placement and exact context ID;
- required steps and unique completed native request IDs;
- the remaining step and the Wellness continuation deadline;
- grant attempt, verified-save, and granted state.

Duplicate or out-of-order native callbacks cannot advance progress. The Wellness Package restores `1/2` and only retries Ad 2 while its five-minute continuation remains valid.

## Verified grant contract

Store rewards and debt bailout follow:

`READY_TO_GRANT -> verified save -> VERIFIED_SAVE -> GRANTED`

The live player is not updated before persistence succeeds. If persistence fails, the earned receipt remains ready and the UI offers **Retry Reward Save** without replaying an ad. Each saved player stores the reward session ID in `flags.grantedRewardAdIds`, which prevents a duplicate grant after a crash between saving the player and clearing the receipt.

Golden life-event and production-crisis options use the same entitlement boundary. Their receipt is tied to the exact event and option, and the receipt is cleared only after that storyline resolution is saved. On restart, the matching modal resumes the earned choice. Storyline receipts are explicitly excluded from the generic cash-bailout grant handler.

## Automated coverage

- `npm run audit:rewarded-ad-phase1-2`
- `npm run audit:rewarded-ad-phase3-4`
- `npm run audit:rewarded-ad-phase5-6`
- `npm run audit:reported-bug-regressions`
- `npm run audit:life-event-phase5-6`
- `npm run lint`
- `npm run build`

## Remaining release work

Phase 7 still owns proactive availability, preload, no-fill/offline distinction, and bounded backoff. Phase 8 still owns production telemetry review and native-device interruption testing.
