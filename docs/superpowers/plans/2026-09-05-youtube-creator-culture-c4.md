# Project C4 YouTube Creator Culture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish deterministic, fact-grounded videos from recurring media creators into the existing YouTube app while keeping NPC and player creator economies isolated.

**Architecture:** Extend the bounded `IndustryMediaWorldState` with saved creator-channel and industry-video records. A focused C4 domain service consumes retained B7 events, C1 stories, C2 identities, and resolved C3 responses during the entered-week seam; the existing YouTube feed adapts those records for display without inserting them into `Player.youtube.videos`.

**Tech Stack:** TypeScript, React 19, Vite, existing deterministic RNG and audit-script harness.

**Spec:** `docs/superpowers/specs/2026-09-05-youtube-creator-culture-c4-design.md`

## Global Constraints

- Canonical facts come only from `WorldState.industryEvents` and `WorldState.industryMedia.stories`.
- Speculation is explicitly labelled and cannot masquerade as a leak.
- C4 never mutates player YouTube statistics, player/company money, fame, reputation, controversy, relationships, rights, projects, quality, production, ownership, contracts, or awards.
- At most two industry videos publish per entered week and one per creator per week.
- No remote images, unpersisted random outcomes, duplicate publication, or unbounded history.
- Preserve all existing C1-C3 work and unrelated dirty-worktree changes.
- No commit or push without explicit user authorization.

---

### Task 1: C4 saved model and normalization

**Files:**
- Modify: `types.ts`
- Modify: `services/industryWorld/industryMediaLedger.ts`
- Test: `scripts/audit-industry-media-youtube-state-c4.ts`

**Interfaces:**
- Produces: `IndustryMediaCreatorChannel`, `IndustryMediaYoutubeVideo`, related enums, and schema-version-4 `IndustryMediaWorldState` collections.
- Produces: normalization and bounded reconciliation through `normalizeIndustryMediaWorld()`.

- [x] **Step 1: Write the failing state audit**

Create fixtures containing valid, malformed, duplicated, oversized, and orphaned C4 records. Assert schema 4, numeric clamps, unique IDs and keys, collection bounds, story/event reference cleanup, and repaired creator histories.

- [x] **Step 2: Run the state audit to verify RED**

Run: `esbuild scripts/audit-industry-media-youtube-state-c4.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-media-youtube-state-c4.mjs && node /tmp/audit-industry-media-youtube-state-c4.mjs`

Expected: failure because the C4 types and collections do not exist.

- [x] **Step 3: Add the minimal saved types and normalizer**

Add the approved formats, outcomes, thumbnail metadata, evidence references, performance counters, and creator-channel collections. Export exact limits from `industryMediaLedger.ts`, normalize finite values, deduplicate stable IDs/keys, keep high-importance/recent records, and remove invalid story/event references.

- [x] **Step 4: Run the state audit to verify GREEN**

Run the Step 2 command and expect every assertion to pass.

### Task 2: Deterministic editorial and creator-performance engine

**Files:**
- Create: `services/industryWorld/industryMediaYoutube.ts`
- Modify: `services/industryWorld/index.ts`
- Test: `scripts/audit-industry-media-youtube-publication-c4.ts`
- Test: `scripts/audit-industry-media-youtube-performance-c4.ts`

**Interfaces:**
- Produces: `processIndustryMediaYoutube(player: Player, absoluteWeek: number): IndustryMediaYoutubeResult`.
- Produces: `getIndustryMediaYoutubeCreatorChannel(...)` and display-safe accessors needed by the UI adapter.
- Consumes: normalized media world, event ledger, C2 personalities/assignments, C3 responses, and `createDeterministicRng()`.

- [x] **Step 1: Write failing publication and performance audits**

Assert format/category eligibility, explicit theory wording, retained evidence IDs, response-outcome references, maximum weekly/creator limits, same-week idempotency, deterministic replay, non-repetition, and zero player-channel mutation. Include a deterministic small-creator breakout and large-creator flop fixture.

- [x] **Step 2: Run both audits to verify RED**

Run each through the existing esbuild audit pattern and expect missing-module/export failures.

- [x] **Step 3: Implement deterministic C4 processing**

Normalize state, advance bounded long-tail metrics, choose eligible story beats, score creators, select a format, compose fact-safe copy and local thumbnail metadata, resolve performance once, update only creator-world data, append publication keys, and return the updated player/world plus optional promotional echoes.

- [x] **Step 4: Run both audits to verify GREEN**

Expect all editorial, performance, isolation, and idempotency assertions to pass.

### Task 3: Entered-week integration and cross-platform echoes

**Files:**
- Modify: `services/industryWorld/industryWorldWeek.ts`
- Modify: `types.ts`
- Test: `scripts/audit-industry-media-youtube-week-c4.ts`

**Interfaces:**
- Consumes: `processIndustryMediaYoutube()` after `resolveIndustryMediaResponses()`.
- Produces: updated `IndustryWorldWeekResult` with C4 X/Instagram echoes merged through existing bounded feed paths.

- [x] **Step 1: Write the failing entered-week audit**

Assert that a qualifying story publishes exactly once, a resolved C3 response may be referenced without reapplying effects, repeat same-week calls are inert, echoes retain event/story/video lineage, and the player channel is byte-for-byte unchanged.

- [x] **Step 2: Run the audit to verify RED**

Expected: no C4 execution in the coordinator.

- [x] **Step 3: Connect the C4 processor at the canonical seam**

Run it after C3 resolution, merge only new bounded public echoes, retain the existing execution-order contract, and return the final C4 world on the player.

- [x] **Step 4: Run the audit to verify GREEN**

Expect exact-once processing and lineage assertions to pass.

### Task 4: YouTube feed adapter and deterministic filler

**Files:**
- Modify: `services/youtubeLogic.ts`
- Modify: `types.ts`
- Test: `scripts/audit-industry-media-youtube-feed-c4.ts`

**Interfaces:**
- Produces: `generateYoutubeFeed(player)` blending saved industry videos, music videos, and deterministic generic filler.
- Produces: optional industry metadata on the existing `YoutubeVideo` presentation shape.

- [x] **Step 1: Write the failing feed audit**

Assert stable IDs/order/metrics across repeated calls and save clones, C4 metadata preservation, correct creator subscribers, zero player-video duplication, deterministic generic filler, and no `Date.now()`/`Math.random()` dependency in feed generation.

- [x] **Step 2: Run the audit to verify RED**

Expected: existing random filler and missing C4 records fail.

- [x] **Step 3: Implement the adapter**

Map saved videos without copying them into `Player.youtube.videos`, retain music videos, derive generic filler from a deterministic week/player seed, and sort with stable tie-breakers.

- [x] **Step 4: Run the audit to verify GREEN**

Expect stable feed snapshots and isolation assertions to pass.

### Task 5: Player-visible YouTube culture UI

**Files:**
- Modify: `views/mobile/YoutubeApp.tsx`
- Test: `scripts/audit-industry-media-youtube-ui-c4.tsx`

**Interfaces:**
- Consumes: extended `YoutubeVideo` industry metadata and saved creator metrics.
- Produces: `All`, `Film & TV`, `Theories`, and `Industry` feed filters plus enriched cards/watch details.

- [x] **Step 1: Write the failing UI audit**

Assert filter controls, theory/fact labels, local creator presentation, confirmed-facts and interpretation sections, response-analysis context, and preservation of Upload/Studio/monetization controls.

- [x] **Step 2: Run the UI audit to verify RED**

Expected: C4 labels and sections are absent.

- [x] **Step 3: Extend the existing Home and Watch views**

Add compact mobile-first filters and conditional C4 metadata using the current YouTube visual language. Avoid a new app, modal stack, remote asset, or management chore. Update the feed memo dependencies so a newly entered week is visible.

- [x] **Step 4: Run the UI audit to verify GREEN**

Expect C4 presentation plus legacy control assertions to pass.

### Task 6: Save migration and compatibility

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `scripts/audit-industry-media-save-c1.ts`
- Create: `scripts/audit-industry-media-youtube-save-c4.ts`

**Interfaces:**
- Produces: save migration version 37 with schema-4 normalized industry media.

- [x] **Step 1: Write the failing migration audit**

Cover an old save with no media state, schema 1-3 media states, a valid schema-4 round trip, malformed C4 values, oversize collections, and canonical event compaction.

- [x] **Step 2: Run the migration audit to verify RED**

Expected: version 36/schema 3 cannot satisfy C4 assertions.

- [x] **Step 3: Advance migration and reconcile C4 records**

Set migration 37, normalize old saves through the existing migration seam, preserve pending C3 responses, remove orphan video references, and repair creator recent-video histories.

- [x] **Step 4: Run C4 and C1-C3 save audits to verify GREEN**

Expect new and legacy save fixtures to pass without data loss.

### Task 7: Commands, regression, roadmap, and report

**Files:**
- Modify: `package.json`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `docs/superpowers/plans/2026-09-05-youtube-creator-culture-c4.md`
- Create: `docs/superpowers/reports/2026-09-05-youtube-creator-culture-c4-report.md`

**Interfaces:**
- Produces: focused `audit:industry-media-c4` command and final evidence.

- [x] **Step 1: Register focused C4 audit scripts**

Add individual state, publication, performance, week, feed, UI, and save commands plus one aggregate C4 command.

- [x] **Step 2: Run focused and adjacent verification**

Run C4, C3, C2, core C1, all seven B7 audits, existing YouTube event/merch audits, `npm run lint`, and `npm run build`. Record unrelated pre-existing failures separately and do not disguise them as C4 failures.

- [x] **Step 3: Run a 390 × 844 local-browser smoke**

Open the existing dev server, inspect YouTube Home/Watch behaviour at mobile width, verify there are no console errors, and confirm player Studio remains accessible.

- [x] **Step 4: Update roadmap and final report**

Mark C4 complete only if its completion gate passes, advance `Current next phase` to C5 design approval, document schema/migration versions, visible behaviour, exact verification results, bounds, and intentional deferrals.

- [x] **Step 5: Review the final diff**

Confirm only C2/C3 preserved work plus approved C4 files are present. Leave all work uncommitted unless the user separately authorizes a commit or push.
