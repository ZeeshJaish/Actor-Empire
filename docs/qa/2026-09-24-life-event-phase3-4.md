# Life-event reliability — Phase 3 and Phase 4

## Delivered contract

Every callback-based life-event option that crosses the verified save boundary is now materialized into a JSON-safe resolution contract:

- stable option ID;
- `impactId: MATERIALIZED_PATCH_V1`;
- typed patch payload;
- exact outcome log, localization metadata, effects, and delayed-feedback metadata;
- deterministic resolution seed;
- life-event schema version.

The runtime callback remains temporarily available as a compatibility bridge, but both immediate post-week choices and choices reopened from storage prefer the serialized resolver.

## Single source of gameplay truth

Existing gameplay callbacks are not duplicated into a second hand-maintained implementation. During verified save preparation, each callback is executed once against an Immer copy-on-write draft with seeded randomness and time. Only the changed player paths and exact outcome receipt are persisted.

This design provides three reliability properties:

1. Current and reloaded choices produce the same planned result.
2. Random outcomes cannot reroll after a restart or retry.
3. Late-game players are not deep-cloned once per option; untouched player branches are shared while patches are produced.

Patches that manipulate the pending-event queue are excluded because queue removal is owned by the app's event-resolution boundary. This prevents one choice payload from embedding or overwriting other queued events.

## Central resolver

`services/lifeEventResolver.ts` is the only choice-resolution entrypoint used by the modal. Its registry handles materialized patches and adapts the existing serialized YouTube resolver and rebuilt legal-hearing callbacks.

Payload validation rejects unsupported operations, prototype-related paths, excessive patch counts, and oversized payloads before application.

## Migrated families

- Standard life events
- Luxury life events
- Funding-breach decisions
- Delayed government audits
- World reactions
- Regulator pressure
- Talent instability
- Rival retaliation
- Shareholder voting
- YouTube decisions through the existing serialized adapter
- Legal hearings through the existing case-ID rebuild adapter

The migration occurs at the common verified persistence boundary, so future callback-based families automatically receive the contract instead of requiring a second resolver implementation.

## Automated gates

- Immediate versus JSON-reloaded exact outcome
- Deterministic random-result replay
- Stable generated option IDs
- Callback-free persisted state
- Registered resolver and schema validation
- Pending and scheduled event queues
- Nine callback-source families
- Sixteen real standard/luxury event variants
- Real world-reaction, regulator, talent, rival, shareholder, YouTube, legal-hearing, and government-audit flows

## Deliberate remaining scope

Events in older saves whose callbacks were already removed before this release cannot be reconstructed by this phase. They remain the Phase 5 legacy-migration problem. Atomic exactly-once persistence remains Phase 6.
