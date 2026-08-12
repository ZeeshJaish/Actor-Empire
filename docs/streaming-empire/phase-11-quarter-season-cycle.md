# Phase 11 — Quarter and Season Cycle

## Contract

Phase 11 turns the committed Phase 10 weekly record into an operating rhythm:

- every four completed post-launch weeks create one progress beat;
- every twelve completed weeks create one season review;
- the season review commits to the ledger before its board cinematic is queued;
- replaying or skipping the cinematic never recalculates metrics or moves money;
- records stay compact and bounded for mobile saves.

This phase includes strategic identity, company-level hits and misses, technical
health, cash contribution, subscriber movement and a lightweight rival market
signal. It does not add title-level performance analytics, market-share
simulation, hostile rival actions, board voting or Phase 12's analytics center.

## Player flow

1. Advance the real game week.
2. Phase 10 commits its exactly-once weekly result.
3. Week 4, 8 and 12 boundaries create a four-week progress beat.
4. Week 12 also creates the season review and queues the Board Review scene.
5. Platform HQ shows the twelve-week audience pulse, season track, latest
   strategic identity and the compact four-week archive.
6. The Board Review presents the committed verdict in three chapters: identity
   and performance, wins and warnings, then the next mandate and rival signal.
7. A viewed or skipped scene remains replayable from the latest season card
   without rerolling facts.

## Implementation map

- Cycle logic: `services/streamingQuarterSeason.ts`
- Exactly-once integration: `services/streamingWeeklyLoop.ts`
- Season room and board cinematic: `components/StreamingQuarterSeasonCycle.tsx`
- Visual system: `styles/streaming-quarter-season.css`
- Save schema and bounded normalization: `types.ts`,
  `services/ownedStreamingPlatform.ts`

## Validation

```bash
npm run audit:streaming-quarter-season-phase11
npm run audit:streaming-weekly-loop-phase10
npm run lint
npm run build
```
