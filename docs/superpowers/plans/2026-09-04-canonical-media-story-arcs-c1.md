# Project C Phase C1 — Canonical Media Story Arcs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn B7 canonical industry facts into deterministic, bounded, multi-week media stories shared by the existing News, X, and Instagram surfaces.

**Architecture:** Keep `WorldState.industryEvents` immutable and authoritative. Add a separate normalized `IndustryMediaWorldState`, advance stories from event references, then evolve the B7 projector to publish story-aware immediate and delayed beats without mutating any business domain.

**Tech Stack:** TypeScript, React data types, Vite, deterministic executable audits bundled with esbuild, existing save migration and compaction infrastructure.

**Spec:** `docs/superpowers/specs/2026-09-04-canonical-media-story-arcs-c1-design.md`

## Global Constraints

- `WorldState.industryEvents` remains the sole canonical public-fact ledger.
- `processIndustryWorldWeek` remains the single entered-week coordinator.
- C1 cannot create or mutate projects, productions, rights, transactions, finances, ownership, relationships, awards, or company outcomes.
- Existing News, X, Instagram, and YouTube applications remain the player surfaces.
- C1 adds no mandatory player decisions.
- Stories, event references, publication keys, and feeds remain bounded.
- Deterministic IDs and exactly-once checkpoints are required.
- Preserve unrelated dirty-worktree changes. Do not stage, commit, or push without explicit user authorization.

---

### Task 1: Versioned and bounded media-story state

**Files:**
- Modify: `types.ts`
- Create: `services/industryWorld/industryMediaLedger.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-state-c1.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `IndustryEventImportance`, `IndustryEventType`, and canonical subject IDs.
- Produces: `IndustryMediaStory`, `IndustryMediaWorldState`, `normalizeIndustryMediaWorld`, `INDUSTRY_MEDIA_STORY_LIMIT`, and `INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT`.

- [x] **Step 1: Write the failing state audit**

```ts
const normalized = normalizeIndustryMediaWorld({ stories: [valid, valid, malformed] });
assert.equal(normalized.schemaVersion, 1);
assert.equal(normalized.stories.length, 1);
assert.equal(normalized.eventStoryIndex.event_release, valid.id);
assert.ok(normalizeIndustryMediaWorld({ stories: many }).stories.length <= INDUSTRY_MEDIA_STORY_LIMIT);
```

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:industry-media-state-c1`

Expected: FAIL because `industryMediaLedger` and its exports do not exist.

- [x] **Step 3: Implement the minimal normalized registry**

```ts
export interface IndustryMediaStory {
  schemaVersion: 1;
  id: string;
  subjectKey: string;
  category: IndustryMediaStoryCategory;
  stage: IndustryMediaStoryStage;
  importance: IndustryEventImportance;
  primaryIndustryEventId: string;
  industryEventIds: string[];
  firstAbsoluteWeek: number;
  lastAdvancedAbsoluteWeek: number;
  nextEligiblePublicationWeek?: number;
  headline: string;
  detail: string;
  channelEligibility: IndustryMediaChannel[];
  publishedChannels: IndustryMediaChannel[];
  companyId?: string;
  companyName?: string;
  platformId?: string;
  projectId?: string;
  productionId?: string;
  rightsContractId?: string;
  transactionId?: string;
  awardEventId?: string;
  resolutionIndustryEventId?: string;
  resolutionAbsoluteWeek?: number;
}
```

Normalize malformed input, rebuild `eventStoryIndex` from retained stories, cap per-story event references, retain important and recent history, and deduplicate publication keys.

- [x] **Step 4: Run the audit and verify GREEN**

Run: `npm run audit:industry-media-state-c1`

Expected: PASS for malformed input, deduplication, index rebuilding, deterministic ordering, and bounds.

### Task 2: Canonical fact-to-story advancement and lifecycle

**Files:**
- Create: `services/industryWorld/industryMediaStories.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-arcs-c1.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `IndustryEventFact[]`, normalized `IndustryMediaWorldState`, and absolute week.
- Produces: `advanceIndustryMediaStories(input, events, absoluteWeek): IndustryMediaAdvanceResult` with `state`, `changedStoryIds`, and `eventStoryIds`.

- [x] **Step 1: Write the failing merge and lifecycle audit**

```ts
const first = advanceIndustryMediaStories(undefined, [releasePlanned], 500);
const second = advanceIndustryMediaStories(first.state, [releasePlanned, delayed], 501);
assert.equal(second.state.stories.length, 1);
assert.deepEqual(second.state.stories[0].industryEventIds, [releasePlanned.id, delayed.id]);
assert.equal(second.state.stories[0].stage, 'DEVELOPING');

const resolved = advanceIndustryMediaStories(second.state, [hit], 505);
assert.equal(resolved.state.stories[0].stage, 'RESOLVED');
assert.equal(resolved.state.stories[0].resolutionIndustryEventId, hit.id);
assert.deepEqual(advanceIndustryMediaStories(resolved.state, [hit], 505).state, resolved.state);
```

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:industry-media-arcs-c1`

Expected: FAIL because story advancement does not exist.

- [x] **Step 3: Implement deterministic subject, category, and stage policies**

Implement pure helpers that derive subject keys from canonical IDs, map event types to story categories and lifecycle stages, merge only compatible non-terminal stories, preserve canonical event order, and create deterministic story IDs from the subject plus first event ID.

- [x] **Step 4: Implement fading and replay protection**

On each entered week, fade unresolved stories whose last development is outside the relevance window. Skip every event already present in `eventStoryIndex`; repeated same-week calls must return identical state.

- [x] **Step 5: Run the audit and verify GREEN**

Run: `npm run audit:industry-media-arcs-c1`

Expected: PASS for project merging, unrelated-story separation, terminal resolution, fading, stable IDs, and exact replay.

### Task 3: Story-aware multi-week public projection

**Files:**
- Modify: `types.ts`
- Modify: `services/industryWorld/industryPresentation.ts`
- Modify: `services/industryWorld/industryWorldWeek.ts`
- Create: `scripts/audit-industry-media-presentation-c1.ts`
- Modify: `package.json`

**Interfaces:**
- Extends: `NewsItem`, `XPost`, and `InstaPost` with optional `mediaStoryId`.
- Changes: `projectIndustryEvents(player, ledger, absoluteWeek, inputMediaWorld?)` returns `mediaWorld` and advances both new-fact coverage and due story beats.
- Changes: `processIndustryWorldWeek` persists `world.industryMedia` returned by the projector.

- [x] **Step 1: Write the failing cross-channel audit**

```ts
const weekOne = projectIndustryEvents(player, ledger, 700, undefined);
const storyId = weekOne.news[0].mediaStoryId;
assert.ok(storyId);
assert.equal(weekOne.xPosts[0].mediaStoryId, storyId);

const weekTwo = projectIndustryEvents(weekOne.player, weekOne.ledger, 701, weekOne.mediaWorld);
assert.equal(weekTwo.news.length, 0);
assert.equal(weekTwo.xPosts.length, 1);
assert.equal(weekTwo.xPosts[0].mediaStoryId, storyId);
assert.equal(weekTwo.xPosts[0].industryEventId, release.id);

const replay = projectIndustryEvents(weekTwo.player, weekTwo.ledger, 701, weekTwo.mediaWorld);
assert.equal(replay.news.length + replay.xPosts.length + replay.instaPosts.length, 0);
```

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:industry-media-presentation-c1`

Expected: FAIL because public items do not carry story IDs and no delayed story beat exists.

- [x] **Step 3: Make immediate projection story-aware**

Advance stories before selecting editorial events. Consolidate same-story same-week events, keep the existing two-story budget, attach `mediaStoryId`, and continue marking every evaluated event so lower-ranked backlog never leaks into a later week.

- [x] **Step 4: Add one restrained delayed conversation beat**

When an eligible story reaches `nextEligiblePublicationWeek`, publish at most one deterministic X discussion beat tied to the latest canonical event, record a story-beat publication key, and clear the due week. Do not emit a delayed beat in the same week as a new canonical development for that story.

- [x] **Step 5: Persist the media registry in the weekly coordinator**

Pass `collectedWorld.industryMedia` into `projectIndustryEvents` and assign `presentation.mediaWorld` to `nextWorld.industryMedia`. Preserve the existing industry exactly-once checkpoint and B7 result contract.

- [x] **Step 6: Run focused GREEN and B7 regression audits**

Run: `npm run audit:industry-media-presentation-c1`

Run: `npm run audit:industry-world-presentation-b7`

Run: `npm run audit:industry-world-coordinator-b7`

Expected: all PASS with shared story IDs, spaced beats, no replay, and unchanged B7 channel limits.

### Task 4: Migration, compaction, long-run bounds, and phase gate

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Create: `scripts/audit-industry-media-save-c1.ts`
- Create: `scripts/audit-industry-media-long-run-c1.ts`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Create: `docs/superpowers/reports/2026-09-04-canonical-media-story-arcs-c1-report.md`

**Interfaces:**
- Migration: normalize `world.industryMedia`, preserve existing B7 publication state, and advance `SAVE_MIGRATION_VERSION` from `33` to `34`.
- Compaction: normalize and bound `world.industryMedia` alongside `world.industryEvents`.
- Aggregate command: `npm run audit:industry-media-c1`.

- [x] **Step 1: Write the failing migration and compaction audit**

```ts
const migrated = migratePlayerSave(oldPlayerWithoutIndustryMedia);
assert.equal(migrated.world.industryMedia?.schemaVersion, 1);

const compacted = compactPlayerForPersistence(playerWithMalformedAndOversizedMediaState);
assert.ok(compacted.world.industryMedia!.stories.length <= INDUSTRY_MEDIA_STORY_LIMIT);
assert.equal(new Set(compacted.world.industryMedia!.publishedBeatKeys).size,
  compacted.world.industryMedia!.publishedBeatKeys.length);
```

- [x] **Step 2: Run the save audit and verify RED**

Run: `npm run audit:industry-media-save-c1`

Expected: FAIL because migration and compaction do not normalize `industryMedia`.

- [x] **Step 3: Integrate migration and compaction**

Normalize the C1 registry in both save paths and bump the migration version. Do not synthesize new public posts during migration; old evaluated B7 facts remain non-republishable.

- [x] **Step 4: Write and run the long-run audit**

Run a deterministic multi-century fixture that repeatedly advances project and company stories. Assert bounded story count, bounded key count, bounded per-story event references, unique IDs, identical replay output, and canonical traceability of every retained event ID.

Run: `npm run audit:industry-media-long-run-c1`

Expected: PASS with all bounds respected.

- [x] **Step 5: Run the complete C1 and regression verification**

Run: `npm run audit:industry-media-c1`

Run: `npm run audit:industry-player-world-b7`

Run: `npm run audit:shared-industry-final-matrix-b8`

Run: `npm run build`

Expected: all commands exit 0. Existing documented Vite chunk-size or dynamic-import warnings may remain; new errors are not acceptable.

- [x] **Step 6: Update roadmap and completion report**

Mark C1 complete only after fresh verification. The report records implemented behavior, reused systems, migration version, exact commands, long-run measurements, known warnings, and C2 as the next approval-gated phase.
