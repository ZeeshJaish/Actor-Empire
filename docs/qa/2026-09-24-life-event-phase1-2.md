# Life-event reliability — Phase 1 and Phase 2

## Scope

This checkpoint covers the live-session callback-loss defect and establishes the event-family inventory and diagnostics needed for the serializable resolver migration.

It deliberately does not claim that callback-based events can survive an app restart. That is the Phase 3 contract migration.

## Confirmed failure boundary

1. Week processing creates scheduled or pending life-event options with JavaScript `impact` callbacks.
2. `prepareVerifiedPlayerForPersistence` compacts those events into JSON-safe data and removes the callbacks.
3. The app previously returned that compacted object to the gameplay state after a successful save.
4. `LifeEventModal` received an option with no resolver and invoked its generic fallback.

## Runtime and persistence contract

`prepareVerifiedPlayerForPersistence` now exposes two deliberately named outputs:

- `runtimePlayer`: the canonical, integrity-repaired in-memory state. Live event callbacks remain available.
- `persistedPlayer`: the compacted JSON-safe snapshot used for manifests, IndexedDB, local mirrors, and transfers.

The app writes only `persistedPlayer`, then returns `runtimePlayer` to React and the in-memory slot cache. A save can no longer silently replace active gameplay state with its serialization representation.

## Event-source inventory

| Source family | Factory / resolver | Current persistence model | Phase 2 status |
| --- | --- | --- | --- |
| Standard and luxury life events | `services/lifeEventLogic.ts` | Runtime callbacks | Protected in the current session; not restart-safe |
| Funding breach and delayed government audit | `services/gameLoop.ts` | Runtime callbacks | Protected in the current session; not restart-safe |
| World reactions | `services/worldReactions.ts` | Runtime callbacks | Protected in the current session; not restart-safe |
| Regulator pressure | `services/regulatorPressure.ts` | Runtime callbacks | Protected in the current session; not restart-safe |
| Talent instability | `services/talentInstability.ts` | Runtime callbacks | Protected in the current session; not restart-safe |
| Rival retaliation | `services/rivalRetaliation.ts` | Runtime callbacks | Protected in the current session; not restart-safe |
| Shareholder voting | `services/shareholderVoting.ts` | Runtime callbacks | Protected in the current session; not restart-safe |
| Legal hearings | `services/lifeEventLogic.ts`, `services/studioNameRights.ts` | Persisted case ID, rebuilt at display time | Restart-safe pattern already present |
| YouTube decisions | `services/youtubeEventLogic.ts`, `services/gameLoop.ts` | Serializable resolution payload | Restart-safe pattern already present |

## Diagnostics

Choice-selected, missing-impact, and thrown-impact telemetry now shares a stable context:

- scheduled event ID and type;
- life-event ID, type, and category;
- classified source family and source detail;
- stable option ID when available, plus option index;
- golden-option flag;
- resolution path: serialized YouTube, rebuilt legal, runtime callback, or missing.

This makes the remaining reload-only failures measurable by source family during the resolver migration.

## Acceptance checks

- The persisted snapshot contains no executable impact callback and remains JSON serializable.
- The runtime result from the same preparation retains the exact callback.
- Applying the runtime callback after preparation produces the precise expected money and fame changes.
- Diagnostics classify callback, missing, and serialized-resolution paths.
- Existing save-integrity, generation, week-processing, and build checks remain green.
