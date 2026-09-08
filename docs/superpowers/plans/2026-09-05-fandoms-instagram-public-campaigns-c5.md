# Project C5 Fandoms, Instagram, and Public Campaigns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bounded persistent fandoms and deterministic multi-week public campaigns to the existing Instagram/X media world without creating a repetitive player-management burden.

**Architecture:** Extend schema-version-5 `IndustryMediaWorldState` with normalized fandom and campaign records. A focused `industryMediaFandoms.ts` service consumes B7 facts, C1 stories, C2 identities, C3 outcomes, and C4 video outcomes after C4 in the entered-week coordinator; existing Instagram/X records and UI project saved campaign summaries rather than simulating individual fans.

**Tech Stack:** TypeScript, React 19, Vite, existing deterministic RNG, save migration/compaction, and executable esbuild audit scripts.

**Spec:** `docs/superpowers/specs/2026-09-05-fandoms-instagram-public-campaigns-c5-design.md`

## Global Constraints

- Canonical claims come only from retained B7 events and C1 stories; C3/C4 are read-only context.
- C5 cannot directly change money, energy, fame, general reputation, projects, releases, quality, ratings, revenue, rights, production, ownership, contracts, awards, companies, or `Player.youtube`.
- Silence is safe; player participation is optional and must publish through the existing Instagram composer.
- At most one campaign starts and two campaign moments publish per entered week.
- Retain at most 96 fandoms, 160 campaigns, 6 moments per campaign, 12 recent campaign IDs and 8 friendly/rival subjects per fandom, and 640 processed keys.
- No remote art, unpersisted random results, duplicate effects, every-title campaign spam, or unbounded histories.
- Preserve C1–C4 work and unrelated dirty-worktree changes.
- Do not stage, commit, or push without explicit user authorization.

---

### Task 1: Schema-5 fandom and campaign state

**Files:**
- Modify: `types.ts`
- Modify: `services/industryWorld/industryMediaLedger.ts`
- Create: `scripts/audit-industry-media-fandom-state-c5.ts`

**Interfaces:**
- Produces: `IndustryMediaFandom`, `IndustryMediaCampaign`, `IndustryMediaCampaignMoment`, related enums, schema-5 collections, and normalized bounds.
- Produces: `normalizeIndustryMediaFandomCollections(source, baseState)` consumed by the media ledger and later C5 processing.

- [x] **Step 1: Write the failing schema audit**

Create malformed, duplicated, oversized, orphaned, and valid fixtures. Assert schema 5; numeric clamps; valid archetype/type/stage/outcome fallbacks; unique fandom/campaign IDs and keys; active/player-relevant preservation; repaired campaign histories; evidence integrity; and all approved limits.

- [x] **Step 2: Run the state audit to verify RED**

Run `esbuild scripts/audit-industry-media-fandom-state-c5.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-industry-media-fandom-state-c5.mjs && node /tmp/audit-industry-media-fandom-state-c5.mjs`.

Expected: missing C5 types/collections/export.

- [x] **Step 3: Add the saved types and normalizer**

Define the exact spec enums and records. Implement finite-number clamps, normalized text/hashtags, stable deduplication, evidence cleanup, active-first campaign compaction, orphan removal, and repaired recent-campaign references without fabricating historical data.

- [x] **Step 4: Run the state audit to verify GREEN**

Expect every schema, bound, and referential-integrity assertion to pass.

### Task 2: Deterministic fandom qualification and identity

**Files:**
- Create: `services/industryWorld/industryMediaFandoms.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-fandom-formation-c5.ts`

**Interfaces:**
- Produces: `qualifyIndustryMediaFandoms(player, absoluteWeek, state): IndustryMediaFandom[]`.
- Produces: deterministic identity helpers and `getIndustryMediaFandomProfiles(state)` for Instagram projection.
- Consumes: normalized media state, event ledger, canonical subject references, C4 creator videos, and `createDeterministicRng()`.

- [x] **Step 1: Write the failing formation audit**

Assert that repeated/high attention, audience proof, franchise/release/award facts, and C4 hits can qualify fandoms while low routine stories cannot. Cover niche cult formation, a major subject failing to qualify, deterministic names/handles/local art, regional/language variation, all six archetypes, subject uniqueness, and no player/company mutation.

- [x] **Step 2: Run the formation audit to verify RED**

Run the focused audit and expect missing service exports.

- [x] **Step 3: Implement qualification and deterministic identity**

Score only eligible subjects, use persisted/canonical inputs and deterministic variance, materialize no more than one new fandom per entered week, create collision-safe non-official handles, and expose profile-safe projections without inserting records into the NPC database.

- [x] **Step 4: Run the formation audit to verify GREEN**

Expect identity, variety, qualification, isolation, and anti-spam assertions to pass.

### Task 3: Multi-week campaign lifecycle and outcomes

**Files:**
- Modify: `services/industryWorld/industryMediaFandoms.ts`
- Create: `scripts/audit-industry-media-campaigns-c5.ts`
- Create: `scripts/audit-industry-media-campaign-copy-c5.ts`

**Interfaces:**
- Produces: `processIndustryMediaFandoms(player, absoluteWeek): IndustryMediaFandomResult`.
- Produces: fact-safe campaign selection/copy, saved moment progression, final outcomes, and Instagram/X projections.

- [x] **Step 1: Write failing lifecycle and copy audits**

Cover all ten campaign types, valid story/type gates, `SPARK → RALLY → PEAK → AFTERMATH → CLOSED` week spacing, exact-once replay, active-before-new priority, maximum weekly publications, deterministic `BREAKOUT/STRONG/MODEST/FIZZLED/MESSY` outcomes, hashtag normalization/collision safety, fan-wish wording, prohibited claims, C3/C4 read-only reuse, and quiet weeks.

- [x] **Step 2: Run both audits to verify RED**

Expect missing campaign processing/copy behavior.

- [x] **Step 3: Implement selection, progression, templates, and effects**

Start at most one eligible campaign, advance due campaigns once per entered week, persist the performance roll/outcome, update only approved fandom/campaign/media-attention data, create no more than two lineage-safe major moments, and close terminal campaigns without deleting their history.

- [x] **Step 4: Run both audits to verify GREEN**

Expect lifecycle, outcome variety, factual safety, spacing, and idempotency assertions to pass.

### Task 4: Optional player participation through the existing composer

**Files:**
- Modify: `types.ts`
- Modify: `services/industryWorld/industryMediaFandoms.ts`
- Modify: `views/mobile/InstagramApp.tsx`
- Modify: `views/mobile/MobilePage.tsx`
- Modify: `App.tsx`
- Create: `scripts/audit-industry-media-campaign-participation-c5.ts`

**Interfaces:**
- Produces: `IndustryMediaCampaignParticipationMode = 'JOIN' | 'THANK'` and saved participation data.
- Produces: `applyIndustryMediaCampaignParticipation(player, campaignId, mode, absoluteWeek): Player`.
- Extends: Instagram `onPost(type, caption, image?, campaignParticipation?)` so participation and ordinary post creation happen inside the same authoritative player updater.

- [x] **Step 1: Write the failing participation audit**

Assert eligibility only for active player-related campaigns, suggested captions, composer-only publication, one participation per campaign, safe silence, deterministic/capped follower-loyalty-controversy effects, unchanged ordinary post behavior, stale/closed campaign rejection, and byte-for-byte protected-domain isolation.

- [x] **Step 2: Run the audit to verify RED**

Expect missing participation types/service behavior.

- [x] **Step 3: Implement atomic composer handoff and participation**

Campaign actions prefill `ANNOUNCEMENT` or `CELEBRATION` copy. Store a local pending participation only until normal post submission. Pass campaign metadata through the existing `onPost` callback, then apply ordinary post outcome and C5 participation in one `handleGenericUpdate` transaction. `Let fans lead` closes only the local detail prompt and writes no gameplay record.

- [x] **Step 4: Run the participation audit to verify GREEN**

Expect safe-silence, exact-once, effect-cap, composer, and isolation assertions to pass.

### Task 5: Entered-week integration and cross-platform bounds

**Files:**
- Modify: `services/industryWorld/industryWorldWeek.ts`
- Modify: `types.ts`
- Create: `scripts/audit-industry-media-fandom-week-c5.ts`

**Interfaces:**
- Consumes: `processIndustryMediaFandoms()` after `processIndustryMediaYoutube()`.
- Produces: C5-updated player/world and bounded X/Instagram feed projections through the existing coordinator result.

- [x] **Step 1: Write the failing coordinator audit**

Assert post-C4 order, later-week C4 seeding, exact-once entered-week behavior, maximum one start/two moments, correct event/story/fandom/campaign lineage, no duplicate C3 discussion, no C4 metric rewrite, and player/company protected-domain isolation.

- [x] **Step 2: Run the coordinator audit to verify RED**

Expected: C5 does not execute at the canonical seam.

- [x] **Step 3: Connect the C5 processor**

Run C5 after C4, return its final player/world, merge only new bounded X posts into `socialPosts`, and retain Instagram posts through the existing player feed path. Keep the public execution-stage contract unchanged.

- [x] **Step 4: Run the coordinator audit to verify GREEN**

Expect exact ordering, lineage, replay, bounds, and isolation assertions to pass.

### Task 6: Instagram fandom, trend, and campaign experience

**Files:**
- Modify: `views/mobile/InstagramApp.tsx`
- Create: `scripts/audit-industry-media-fandom-ui-c5.tsx`

**Interfaces:**
- Consumes: saved fandoms/campaigns and optional participation callbacks.
- Produces: campaign-aware feed detail, entertainment trends, searchable fandom profiles, derived profile grids, campaign timelines, and composer prefill.

- [x] **Step 1: Write the failing server-rendered UI audit**

Assert a local-art campaign card, hashtag, visible source context, entertainment-trends strip, fandom search/profile, derived nine-tile grid, campaign lifecycle/timeline, approximate participation, resolved outcome, Join/Thank/Let-fans-lead controls only when eligible, and preservation of posting, DM, profile, like, save, and ordinary NPC behavior.

- [x] **Step 2: Run the UI audit to verify RED**

Expected: fandom/campaign presentation is absent.

- [x] **Step 3: Extend the existing Instagram views**

Add conditional campaign treatment to the current feed/detail surfaces, include fandom profiles in the existing search pool, derive profile tiles without saving them, and use compact asymmetric mobile layouts with deterministic local SVG/gradient art rather than a new app or metric dashboard.

- [x] **Step 4: Run the UI audit to verify GREEN**

Expect C5 presentation and all named legacy controls to render without `undefined`, `NaN`, overflow-only details, or remote C5 art.

### Task 7: Save migration and compatibility

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `scripts/audit-industry-media-save-c1.ts`
- Modify: C2–C4 save audit version expectations where required
- Create: `scripts/audit-industry-media-fandom-save-c5.ts`

**Interfaces:**
- Produces: save migration version 38 and normalized schema-5 media state.

- [x] **Step 1: Write the failing save audit**

Cover no-media saves, schema 1–4 saves, valid schema-5 round trip, malformed records, oversized state, active/player-relevant preservation, orphan cleanup, campaign/fandom reference repair, and canonical event compaction.

- [x] **Step 2: Run the save audit to verify RED**

Expected: migration 37/schema 4 cannot satisfy C5 assertions.

- [x] **Step 3: Advance migration and reconciliation**

Set migration 38, normalize old saves without fabricated history, protect active/player-relevant campaigns during compaction, remove invalid references, and preserve all valid C1–C4 state.

- [x] **Step 4: Run C5 and C1–C4 save audits to verify GREEN**

Expect new and old fixtures to round-trip without protected-data loss.

### Task 8: Commands, regression, roadmap, and completion report

**Files:**
- Modify: `package.json`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `docs/superpowers/specs/2026-09-05-fandoms-instagram-public-campaigns-c5-design.md`
- Modify: `docs/superpowers/plans/2026-09-05-fandoms-instagram-public-campaigns-c5.md`
- Create: `docs/superpowers/reports/2026-09-05-fandoms-instagram-public-campaigns-c5-report.md`

**Interfaces:**
- Produces: individual C5 audit commands, aggregate `audit:industry-media-c5`, final evidence, and the C6 approval gate.

- [x] **Step 1: Register focused C5 commands**

Add individual state, formation, campaigns, copy, participation, week, UI, and save commands plus one aggregate command.

- [x] **Step 2: Run focused and adjacent verification**

Run C5, C4, C3, C2, C1, all seven B7 audits, existing Instagram and YouTube audits, `npm run lint`, and `npm run build`. Record unrelated pre-existing failures separately.

- [x] **Step 3: Run a 390 × 844 local-browser smoke**

Verify the correct repository server, Instagram feed/search/profile/campaign detail, composer handoff, Back navigation, and console behavior at mobile width. Do not claim a physical-device test.

- [x] **Step 4: Update roadmap and report**

Only after the completion gate passes, mark C5 complete, advance `Current next phase` to C6 design approval, record schema 5/migration 38, bounds, player-visible behavior, exact evidence, limitations, and intentional deferrals.

- [x] **Step 5: Review the final diff**

Confirm only preserved C2–C4 work plus approved C5 files are present. Run `git diff --check` and leave all work uncommitted unless the user separately authorizes integration.
