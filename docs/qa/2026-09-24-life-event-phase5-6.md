# Life-event reliability — Phase 5 and Phase 6

## Player-care policy for older saves

An event saved before the serializable impact contract is reconstructed only when stable structured context is still present. Recovery never reads English labels or descriptions to guess gameplay effects.

Recoverable legacy paths include:

- YouTube resolution payloads;
- legal hearing case IDs;
- world-reaction type plus stable option ID;
- regulator-pressure type plus stable option ID;
- talent-instability type plus stable option ID;
- rival-retaliation type plus stable option ID;
- shareholder vote ID plus stable option ID;
- government-audit option key and its structured exact penalty.

Funding-breach events and standard/luxury relationship events can contain captured business, partner, or match IDs that were never persisted in old saves. When that context is absent, the event is safely cancelled with a visible explanation. Money, relationships, ownership, businesses, and stats remain unchanged. These cases emit `legacy_event_unresolvable` instead of `life_event_impact_missing`.

No automatic compensation is granted because the missing original context makes it impossible to determine whether the selected outcome was beneficial, neutral, or costly.

## Transaction boundary

Life-event completion now follows this order:

1. The modal locks the Continue action.
2. The transaction service locks the player/event key against concurrent calls.
3. The proposed player is validated for identity, finite economic/stat values, and required protected structures.
4. The selected event is removed and a deterministic resolution receipt is added to the same candidate snapshot.
5. The verified generation is written and read back by the existing save-integrity layer.
6. Only the returned verified runtime player is committed to React state.

If preparation, writing, read-back, or promotion fails, the original UI player and queued event remain unchanged and the player can retry.

Receipts prevent effect replay. If a receipt exists and the event is already absent, the operation returns without another save. If a receipt exists alongside a stale queued copy, only that queue entry is removed and persisted; effects and logs are not replayed.

## Automatic safe fallback

If the primary resolver throws, the choice no longer leaves the player trapped on the event. The runtime creates a bounded `SAFE_FALLBACK` result and sends it through the same validation, receipt, verified-save, and exactly-once transaction described above. The event is removed only after persistence succeeds; a save failure leaves the original state and queued event available for retry.

The primary resolver runs on one runtime-safe clone that preserves live callbacks. If it mutates part of that working copy and then throws, the fallback is created from the untouched source player, preventing partial effects from leaking into the recovery save. This replaces the modal's older JSON clone rather than adding another full-player copy.

The fallback mutation surface is intentionally narrow:

- explicitly authored `safeFallback.statDeltas` take priority;
- otherwise, only structured preview keys for fame, reputation, or happiness may supply a direction;
- each allowed stat change is capped to one point and clamped to the normal 0–100 range;
- display labels, descriptions, and other English prose are never parsed;
- money, ownership, businesses, relationships, legal state, inventory, and progression cannot be changed by this path;
- when no approved structured signal exists, the result is a transparent no-op.

The player sees a normal continuation outcome explaining that a safe minor/no-change result protected the save. Analytics emit `life_event_safe_fallback_applied` with the event diagnostics, bounded fallback source, reason category, and effect count. The original exception is still recorded as `life_event_impact_failed` for engineering diagnosis.

## Automated gates

`npm run audit:life-event-phase5-6` covers:

- exact government-audit reconstruction;
- tagged world, regulator, talent, rival, and shareholder reconstruction;
- zero-mutation handling for irrecoverable legacy events;
- receipt creation and atomic queue removal;
- duplicate retry prevention;
- concurrent double-tap coalescing;
- stale queue/receipt repair without replay;
- persistence failure rollback;
- invalid economic-state rejection before persistence;
- preservation of background playtime during the outcome screen.

`npm run audit:life-event-safe-fallback` covers:

- explicit fallback capping;
- approved structured preview recovery;
- text-only and unsafe metadata no-op behavior;
- source-player immutability;
- thrown-resolver failover;
- `SAFE_FALLBACK` receipt creation and queue removal after persistence;
- save-failure rollback with the event still queued.
