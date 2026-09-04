# Former Family Career AI Design

## Status

Approved on 2026-09-02. A living former main character becomes an autonomous industry person after succession and may accept work from rival studios without player approval. Empire Studios must hire that person through the normal talent flow.

## Purpose

Succession changes which family member the player controls; it does not automatically end the previous character's acting or directing career. The former character can keep working, become selective, pause, retire, or die according to persistent AI decisions while the heir continues controlling inherited businesses.

## Existing systems to preserve

- `services/legacyLogic.ts` remains responsible for succession, `PLAYER_SELF` credit rewriting, inherited studio projects, and the immediate-parent compatibility archive.
- The former character continues to use the existing `NPCActor` identity already inserted into `player.flags.extraNPCs`.
- `WorldState.industryProductions` remains the canonical AI production registry.
- `WorldState.talentBookings` remains the canonical record of actor/director commitments.
- Platform AI commissioning remains responsible for creating and funding outside productions.
- Production House remains responsible for projects owned by the player's inherited studio.
- `services/healthConditions.ts` remains the source of the shared old-age risk curve, while family AI gets an actor-neutral state transition rather than mutating the current `Player`.
- Connections > Legacy is the home for living/deceased dynasty status. Career continues to show only the current playable character's personal work.

## Canonical state

`player.flags.dynastyCareer` is the single durable registry for former playable family members. It is keyed by the existing legacy NPC actor ID and stores:

- Stable player, actor, and generation identity.
- Age at succession and the rebased absolute week of succession.
- Health, career status, and life status.
- Stable personality values for ambition, selectivity, and family loyalty.
- Current and completed canonical project IDs.
- Decision dates, retirement date, death date, and death cause.
- A bounded event history containing succession, project, hiatus, return, retirement, and death events.

`player.flags.dynastyCareerArchives` stores one `LegacyCareerArchive` per actor ID. `legacyCareerArchive` remains as a most-recent-parent compatibility projection for older UI and older saves.

`extraNPCs` remains a talent-pool projection, not the dynasty authority. A missing projection is rebuilt from the canonical dynasty member. Save compaction must protect every living or historically referenced dynasty actor.

## Time model

The active-player age clock can move backwards when control passes to a younger heir. Therefore a dynasty member's current age is:

`ageAtSuccession + floor((currentAbsoluteWeek - successionAbsoluteWeek) / 52)`

When succession rebases the game clock, all existing dynasty dates are shifted by the same delta before the new parent is inserted. This preserves elapsed time, bookings, decisions, retirement, and death chronology across any number of generations.

## Career states

- `ACTIVE`: broadly open to suitable work.
- `SELECTIVE`: accepts only strong-fit offers.
- `HIATUS`: temporarily unavailable until a persisted review week.
- `RETIRED`: unavailable for normal work. A comeback is not added in this phase.
- `DECEASED`: terminal and never castable.

Succession itself never sets `RETIRED` for a living character.

## Weekly decision model

Only living former playable characters are processed. Decisions are deterministic and idempotent for a given member and absolute week.

1. Read canonical bookings and productions first.
2. If the member has an accepted `BOOKED` role, including work whose physical window has not started yet, set the visible state to working and do not make a contradictory retirement decision.
3. Record newly joined or completed canonical projects exactly once.
4. Apply modest workload and age-related health movement.
5. At the persisted decision week, choose active, selective, hiatus, or retirement from age, health, fame, talent, workload, ambition, and selectivity.
6. Starting at age 68, use the same exported old-age incident curve as the player health system. Critical health may cause deterministic death.
7. On death, freeze their recorded age, mark the dynasty member and matching family relationship deceased, remove their talent-pool projection, and emit one news/log event.

No replacement, lawsuit, or special recasting system is introduced. Affected ordinary industry productions use their existing cancellation state. Platform AI originals enter the existing forced-hold path, cancel the canonical booking, and settle through the normal cancellation/refund logic on their following production turn.

## Outside-work autonomy

Platform AI sees the dynasty NPC in the normal talent pool. Before ranking the person, it asks the dynasty service whether this particular offer is acceptable.

- Active members normally accept suitable consideration.
- Selective members require stronger genre/prestige fit and a deterministic offer roll.
- Hiatus, retired, deceased, or critically unhealthy members are excluded.
- Existing overlap behavior remains unchanged: bookings record workload, but this phase does not create a new hard exclusivity rule.

When a platform selects the former character, the existing production and booking records are authoritative. The dynasty weekly processor observes those records and updates the Legacy presentation. It does not create a parallel project.

## Player-control boundary

- The heir controls the inherited studio, budget, greenlight, production, and release decisions.
- The former character controls their personal career through AI.
- Ancestor performance never consumes the heir's energy or grants the heir acting XP, fame, salary, or personal credits.
- If Empire Studios wants the former character, it uses the existing talent selection and offer flow.
- Outside offers do not require player approval; they produce concise Legacy/news updates.

## Player-visible presentation

Connections > Legacy shows a compact status line for every former playable member:

- Current age or age at death.
- Active, selective, on hiatus, retired, deceased, or working.
- Current project when one exists.
- Recent career/life event.

IMDb's Legacy Archive supports more than one generation and preserves each member's recorded projects and awards. The current-player Career page excludes commitments where the current player is not actually cast or directing.

## Persistence and compatibility

- Older saves with only `legacyParent` or `legacyCareerArchive` are migrated into the new canonical registry.
- New saves continue writing compatibility projections.
- All IDs and weekly decisions are deterministic.
- Histories are bounded; project details use existing save-compaction functions.
- Dynasty actor IDs, archives, current projects, and lifecycle dates are included in save integrity protection.
- Missing or malformed optional dynasty state is normalized rather than corrupting a save.

## Explicit exclusions

- No player micromanagement of the former character.
- No separate dynasty film simulator.
- No contracts/lawsuit pack.
- No forced retirement merely because control transferred.
- No post-retirement comeback system in this phase.
- No separate personal bank account or inheritance economy for the autonomous former character.

## Completion criteria

- A living character handed to an heir remains a real NPC and is not automatically retired.
- Their age, health, career state, projects, retirement, and death persist deterministically.
- They can be selected for real outside AI productions and receive canonical bookings.
- Their work never becomes the heir's personal Career activity or rewards.
- Multiple generations remain visible in Legacy and survive save migration/compaction.
- Deceased and retired dynasty members are not selected for new normal productions.
- Focused audits, legacy regression audit, save audit, and production build pass.
