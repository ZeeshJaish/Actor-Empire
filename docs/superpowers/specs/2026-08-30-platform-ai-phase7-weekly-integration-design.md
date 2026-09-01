# Platform AI Phase 7 Weekly Integration Design

## Purpose

Phase 7 makes the streaming industry advance through the existing game-week
progression as one deterministic system. It does not introduce a second game
clock and does not replace the player-owned streaming weekly simulation.

## Existing systems that remain authoritative

- `processGameWeek` remains the only master week progression entry point.
- `processWorldTurn` continues to own the general film, studio, venture, awards,
  and wider-industry simulation.
- `processPlatformAiWorldTurn` remains the full operating simulation for the
  five canonical AI platforms.
- `processStreamingPlatformEcosystemTurn` remains the lighter simulation for
  established regional/global operators and generated fictional entrants.
- `processOwnedStreamingPlatformWeek` remains the player streaming-house
  simulation.
- Existing research, market, localization, rights, production, economy,
  distress, awards, release, news, inbox, and save systems are reused.

## Calendar contract

The save's `age` and `currentWeek` identify the week currently visible to the
player. Pressing the week-advance action completes the outgoing week, advances
the calendar, and then settles the streaming industry for the newly entered
absolute week.

All three streaming actors use that same entered absolute week:

1. Canonical AI platforms.
2. Regional/global/generated ecosystem operators.
3. The player-owned streaming platform.

The general world turn remains in its existing pre-increment position. Only
streaming-industry processing moves to the shared post-increment seam. This
avoids shifting theatrical releases, NPC projects, awards, or life events.

## Canonical streaming-industry coordinator

Create one coordinator that accepts an explicit `absoluteWeek` and:

1. Processes canonical Platform AI.
2. Processes the streaming ecosystem.
3. Leaves both results available to the canonical company-summary projection.
4. Returns high-signal news, diagnostic logs, and processing evidence.

The coordinator owns orchestration only. Economic and strategic calculations
remain in their existing domain services.

## Exactly-once behavior

- Core platforms retain `ai.lastProcessedAbsoluteWeek`.
- The ecosystem retains its global `lastProcessedAbsoluteWeek`.
- Each non-core operator also stores `lastProcessedAbsoluteWeek` so generated
  and regional companies have inspectable per-company evidence.
- The player platform retains `processedWeekKeys` and
  `lastProcessedAbsoluteWeek`.
- Replaying the same streaming-industry week produces no second financial
  settlement, release, operator movement, or news item.

Player-controlled or acquired companies are skipped by AI processors. Existing
state and progress remain, while AI efficiency, automatic planning, and rescue
advantages stop.

## Generated and regional operators

The lighter ecosystem model remains appropriate for companies that do not yet
need full content-slate simulation. It must still be deterministic, financially
bounded, and processed once per week. A company can remain hidden under
`Others` while its canonical state continues to advance. Existing visibility
thresholds promote it automatically into market, Forbes, and Platform Wars
views.

## Player-facing observability

Forbes and Platform Wars read company summaries derived from saved canonical
state. Summaries expose:

- Cash and valuation.
- Subscribers.
- Active countries.
- Technology, localization, catalogue, and prestige.
- Active project and research counts for full Platform AI companies.
- Active, distressed, acquired, or closed status.
- The last processed absolute week.

Normal news receives only material streaming events: major content decisions,
delivery, delay, cancellation, important release outcomes, market withdrawal,
distress, restructuring, rescue, acquisition opportunity, promotion, launch,
or closure. Routine weekly accounting remains diagnostic.

This phase supplies canonical events only. The postponed large social-reaction
template system is outside Phase 7.

## Compatibility and failure behavior

- Old saves normalize missing operator checkpoints to `-1` and begin tracking
  on the next processed week.
- Week 52 to Week 1 uses `getAbsoluteWeek`; no processor compares raw week
  numbers across years.
- A processor failure remains contained by the existing game-loop error
  boundary and does not replace unrelated week systems.
- News IDs remain deterministic and bounded by existing history compaction.

## Completion criteria

- All streaming actors settle against the same entered absolute week.
- Every unacquired canonical platform processes at most once per week.
- Every eligible non-core ecosystem operator processes at most once per week.
- Player-owned platforms receive no AI mutation or AI operating bias.
- The same-week replay is a no-op for financial and audience state.
- Forbes and Platform Wars use canonical saved values.
- The old streaming-only duplicate growth path is absent.
- Existing theatrical, studio, awards, life, and owned-streaming systems pass
  their focused regression audits.
- No duplicate streaming or theatrical release is created.

## Phase boundary

Phase 8 owns multi-seed 10-, 25-, and 50-year balance, performance,
scalability, and final endurance verification.
