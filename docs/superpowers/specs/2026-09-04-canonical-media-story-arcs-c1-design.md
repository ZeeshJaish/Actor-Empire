# Project C Phase C1 — Canonical Media Story Arcs Design

**Status:** Approved for implementation on 2026-09-04

## Purpose

C1 gives the existing public-industry presentation memory. B7's canonical `IndustryEventFact` ledger remains the immutable truth; C1 groups compatible facts into bounded, persistent stories, spaces their public beats across weeks, and lets News, X, Instagram, and later YouTube reference one story identity.

## Hard boundaries

- `WorldState.industryEvents` remains the sole canonical public-fact ledger.
- C1 may group, prioritize, restate, schedule, fade, or resolve saved facts. It may not create projects, productions, deals, rights, ownership changes, financial results, relationships, awards, or company outcomes.
- `processIndustryWorldWeek` remains the single entered-week coordinator.
- Existing News, X, Instagram, and YouTube applications remain the player surfaces.
- C1 adds no mandatory player decision. Interactive player responses begin in C3.
- Only active and recently changed stories receive weekly work; saves and feeds remain bounded.
- Existing B7 publication keys migrate without reposting old coverage.

## Architecture

`WorldState.industryMedia` stores a versioned `IndustryMediaWorldState`. Each `IndustryMediaStory` references canonical event IDs and canonical subject IDs. The story registry maintains an event-to-story index, bounded publication-beat keys, and deterministic processing checkpoints.

The weekly flow is:

```text
Platform AI / Streaming Ecosystem / Studio AI
                    -> B7 canonical facts
                    -> C1 story advancement
                    -> restrained story-aware projection
                    -> existing News / X / Instagram feeds
```

## Story identity and merging

Stories use the strongest canonical subject available for the event domain:

- project and award developments prefer `projectId`;
- rights developments prefer `rightsContractId`, then `projectId`;
- company developments prefer `companyId` or `platformId`;
- otherwise the event itself becomes the subject.

A compatible active story for the same subject is advanced. A resolved, faded, or superseded story is not reopened; a later event creates a new deterministic story. Multiple same-week facts for one subject update one story rather than flooding the feeds.

## Lifecycle

Internal stages are `EMERGING`, `DEVELOPING`, `CONFIRMED`, `RESOLVED`, `FADED`, and `SUPERSEDED`. They are engine state, not raw company-status badges.

- greenlights, casts, releases, rights deals, expansions, and nominations confirm a factual development;
- delays, overruns, holds, distress, funding, and restructuring keep a story developing;
- cancellations, commercial outcomes, recovery, acquisition, closure, and award wins resolve the current story;
- inactive unresolved stories fade after a bounded relevance window.

## Publication timing

Material new facts may receive immediate coverage under the existing two-story weekly editorial budget. A high- or medium-importance development may schedule one later public-conversation beat. That beat may only restate or interpret the already saved fact and may not imply another event occurred. A later canonical fact can advance or resolve the story and schedule another restrained beat.

Every emitted `NewsItem`, `XPost`, and `InstaPost` carries both `industryEventId` and `mediaStoryId`. Future C2-C6 content and YouTube videos will reuse the same story IDs.

## Migration and compaction

Old saves normalize missing media state to an empty registry. Retained B7 events already marked evaluated can be indexed as compact historical stories without generating new feed items. Migration and compaction are idempotent. The registry retains a bounded mix of important history and recent stories, bounds per-story event IDs, and bounds publication keys.

## Completion gate

C1 is complete when deterministic audits prove canonical traceability, compatible merging, lifecycle advancement, multi-week projection, cross-channel story IDs, no replay duplication, migration safety, bounded save growth, and B7/B8 regression compatibility.
