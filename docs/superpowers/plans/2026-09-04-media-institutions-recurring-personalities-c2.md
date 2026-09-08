# Media Institutions and Recurring Personalities C2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every eligible C1 industry-media story a deterministic, persistent institution and recurring personality without inventing facts or adding player chores.

**Architecture:** Upgrade the existing `WorldState.industryMedia` registry to schema version 2, seed and normalize a bounded media roster, score a small eligible coverage shortlist for each selected C1 story, and render fact-safe personality-authored items through the existing News, X, and Instagram models. B7 remains fact authority, C1 remains story authority, and `processIndustryWorldWeek` remains the only entered-week coordinator.

**Tech Stack:** TypeScript, React, Vite, deterministic RNG helpers, Node executable audit scripts, existing save migration/compaction services.

**Spec:** `docs/superpowers/specs/2026-09-04-media-institutions-recurring-personalities-c2-design.md`

## Global Constraints

- Do not create a second event, story, social-feed, company, or economic simulation.
- Do not change player fame, reputation, controversy, money, relationships, rights, production, awards, or company results.
- Preserve the C1 two-distinct-story weekly editorial budget.
- Every C2 publication must retain a canonical `industryEventId` and `mediaStoryId`.
- Every opinion or theory must be grounded in retained evidence; theory language must remain explicitly uncertain.
- Full replies and player response consequences remain C3; full YouTube video generation and economics remain C4.
- Use deterministic selection only; never use `Math.random()` in C2 services.
- Use local colour/avatar seeds and never add remote image dependencies.
- Preserve C1/B7/B8 save and runtime boundaries.
- Per user direction, do not add or run a new 400-year mobile/performance audit in C2; combined long-run certification remains C8.
- Execute inline in the current named feature branch. Do not stage, commit, merge, or push unless the user separately requests it.

---

### Task 1: Versioned media identity state and anchor roster

**Files:**
- Modify: `types.ts`
- Create: `services/industryWorld/industryMediaIdentities.ts`
- Modify: `services/industryWorld/industryMediaLedger.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-identities-c2.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `createDefaultIndustryMediaIdentities(): Pick<IndustryMediaWorldState, 'institutions' | 'personalities' | 'subjectStances' | 'storyAssignments'>`
- Produces: `normalizeIndustryMediaInstitution(value): IndustryMediaInstitution | null`
- Produces: `normalizeIndustryMediaPersonality(value): IndustryMediaPersonality | null`
- Produces: `normalizeIndustryMediaWorld(value): IndustryMediaWorldState` with schema version 2 and bounded identity collections.
- Produces: `getIndustryMediaSocialProfiles(mediaWorld): NPCActor[]` as a presentation adapter only.

- [x] **Step 1: Write the failing identity-state audit**

Create an executable audit that imports the wished-for identity functions, constructs an empty media world, and asserts literal outcomes:

```ts
const empty = normalizeIndustryMediaWorld(undefined);
assert.equal(empty.schemaVersion, 2);
assert.ok(empty.institutions.some(item => item.kind === 'TRADE'));
assert.ok(empty.institutions.some(item => item.kind === 'REGIONAL'));
assert.equal(empty.personalities.filter(item => item.signatureRole === 'ANTAGONIST').length, 1);
assert.equal(empty.personalities.filter(item => item.signatureRole === 'SUPPORTER').length, 1);
assert.ok(empty.personalities.some(item => item.role === 'THEORY_CREATOR'));
assert.ok(empty.personalities.every(item => !/^https?:/.test(item.avatar)));
```

Also feed duplicate, malformed, and oversized institutions/personalities/stances/assignments and assert the exact design bounds.

- [x] **Step 2: Run the audit and observe RED**

Run `npm run audit:industry-media-identities-c2`.

Expected failure: the script or `industryMediaIdentities` module does not exist.

- [x] **Step 3: Add exact C2 media types**

Add institution kind, personality role, signature role, voice archetype, claim mode, institution, personality, subject stance, and story-assignment types. Extend feed items with optional `mediaInstitutionId`, `mediaPersonalityId`, `sourceName`, and `byline`. Keep `IndustryMediaStory.schemaVersion` at 1; advance only `IndustryMediaWorldState.schemaVersion` to 2.

- [x] **Step 4: Implement the anchor roster and normalization**

Create a curated bounded global/regional roster containing trade, business, prestige, tabloid, streaming, regional, and fandom institutions plus recurring reporters, analysts, critics, commentators, and theory creators. Include exactly one signature antagonist and one signature supporter. Normalize IDs, handles, colours, traits, eligibility, links, cooldown memory, and local avatar seeds. Filter orphan personalities and story assignments.

- [x] **Step 5: Run GREEN and existing C1 state regression**

Run `npm run audit:industry-media-identities-c2` and `npm run audit:industry-media-state-c1`.

Expected: both pass.

### Task 2: Deterministic coverage assignment and media-only stance memory

**Files:**
- Create: `services/industryWorld/industryMediaCoverage.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-coverage-c2.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: normalized C2 `IndustryMediaWorldState`, `IndustryMediaStory`, `IndustryEventFact`, channel, player, and absolute week.
- Produces: `assignIndustryMediaCoverage(input): { institution; personality?: IndustryMediaPersonality; assignment; state }`.
- Produces: `getIndustryMediaSubjectKey(story, player): string`.
- Produces: `advanceIndustryMediaStance(state, assignment, event): IndustryMediaWorldState`.

- [x] **Step 1: Write the failing coverage audit**

Use hand-authored company, rights, release, regional, franchise, and player fixtures. Assert that identical inputs select identical IDs, institution/channel mismatch is impossible, regional coverage chooses a matching regional outlet when eligible, recent authors receive fatigue penalties, and a player story can select the signature antagonist or supporter without selecting both for one primary item.

Use multiple sequential story fixtures to assert no non-signature personality owns more than the configured recent-appearance share and that stance shifts never escape its personality-specific bounds.

- [x] **Step 2: Run the audit and observe RED**

Run `npm run audit:industry-media-coverage-c2`.

Expected failure: `assignIndustryMediaCoverage` is unavailable.

- [x] **Step 3: Implement bounded deterministic scoring**

Score category fit, role fit, channel, region/language, importance, access, credibility, subject interest, media-only stance, signature relevance, cooldown, recent fatigue, and repeat-angle penalty. Evaluate a sorted shortlist only and use `createDeterministicRng` with story/week/channel/institution/personality identity for tie resolution.

- [x] **Step 4: Persist compact assignment and stance memory**

Reuse compatible active story assignments, keep at most four assignments per story, at most twelve recent story IDs per personality, and at most 320 stance records. Stance updates must remain media-only and must not mutate Player stats or canonical company relationships.

- [x] **Step 5: Run GREEN and determinism replay**

Run `npm run audit:industry-media-coverage-c2` twice.

Expected: both executions pass with identical selected IDs and state serialization.

### Task 3: Fact-safe voice construction and C1 projection integration

**Files:**
- Create: `services/industryWorld/industryMediaVoice.ts`
- Modify: `services/industryWorld/industryPresentation.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-voices-c2.ts`
- Modify: `scripts/audit-industry-media-presentation-c1.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: canonical event, C1 story, selected institution/personality, claim mode, and channel.
- Produces: `createIndustryMediaVoice(input): IndustryMediaVoiceResult` with headline/content/detail and a `usedNeutralFallback` flag.
- Produces: `validateIndustryMediaVoice(result, input): boolean`.
- Updates: `projectIndustryEvents` to return C2-authored `NewsItem`, `XPost`, and `InstaPost` items plus updated media identity memory.

- [x] **Step 1: Write the failing voice audit**

Create literal fixtures for a player greenlight, real overrun, hit, flop, rights transfer, award, and franchise story. Assert:

```ts
assert.equal(hostile.mediaPersonalityId, antagonist.id);
assert.match(hostile.content, /risk|expensive|prove|reckless/i);
assert.equal(hostile.industryEventId, event.id);
assert.equal(hostile.mediaStoryId, story.id);
assert.doesNotMatch(hostile.content, /\$999M|confirmed crossover|inside source/i);
assert.match(theory.content, /may|might|could|possibly|theory|suggests/i);
```

Inject an invalid candidate through the validator boundary and assert neutral fallback uses only the canonical event headline/detail.

- [x] **Step 2: Run the audit and observe RED**

Run `npm run audit:industry-media-voices-c2`.

Expected failure: the voice module does not exist.

- [x] **Step 3: Implement typed claim modes and templates**

Build small template banks keyed by event/story category, lifecycle stage, role, voice archetype, stance band, channel, and claim mode. Restrict factual insertions to values already present on the canonical event/story. Label every theory with uncertain language. Do not generate fake quotes or new numeric values.

- [x] **Step 4: Add fact-safety fallback**

Validate that required canonical names and lineage remain attached, forbidden confirmation phrases are absent for speculation, and any numeric token in the result came from canonical input. On failure, create the neutral C1-compatible direct restatement.

- [x] **Step 5: Integrate with the existing editorial budget**

Replace generic `Industry Desk` authoring only for newly emitted industry items. Keep the two-story selection and one-shot delayed beat behaviour. Save assignment and appearance memory exactly once; replay of the same week returns an exact no-op.

- [x] **Step 6: Run GREEN and C1/B7 regressions**

Run `npm run audit:industry-media-voices-c2`, `npm run audit:industry-media-presentation-c1`, and `npm run audit:industry-player-world-b7`.

Expected: all pass.

### Task 4: Existing News, X, and Instagram identity presentation

**Files:**
- Modify: `views/mobile/NewsApp.tsx`
- Modify: `views/mobile/XApp.tsx`
- Modify: `views/mobile/InstagramApp.tsx`
- Create: `scripts/audit-industry-media-ui-c2.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing feed arrays plus optional saved C2 identity fields.
- Reuses: `getIndustryMediaSocialProfiles(mediaWorld)` for X and Instagram profile resolution.
- Player-visible contract: News shows publisher/byline; X and Instagram show stable author identity; old items without C2 fields still render through existing fallbacks.

- [x] **Step 1: Write the failing server-rendered UI audit**

Render News, X, and Instagram with a player containing one C2-authored item and assert the saved institution name, byline, personality handle, and local avatar marker appear. Render a legacy C1 item without C2 identity and assert it still displays without throwing.

- [x] **Step 2: Run the audit and observe RED**

Run `npm run audit:industry-media-ui-c2`.

Expected failure: publisher/byline/profile identity is absent from rendered markup.

- [x] **Step 3: Update News source presentation**

Prefer saved `sourceName` and `byline`; retain keyword-derived `getSource` only for legacy content. Do not expose internal status, scoring, stance, or claim-mode fields.

- [x] **Step 4: Add media-profile adapters to X and Instagram**

Append C2 media profiles to the existing NPC/creator presentation pools without merging canonical databases. Permit C2-authored industry posts to open their stable media profile while retaining current behaviour for generic `Industry Desk` posts.

- [x] **Step 5: Run GREEN and build**

Run `npm run audit:industry-media-ui-c2` and `npm run build`.

Expected: audit and build pass; existing build warnings may remain unchanged.

### Task 5: Save migration, compaction, focused bounds, and aggregate gate

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `services/industryWorld/industryMediaLedger.ts`
- Create: `scripts/audit-industry-media-save-c2.ts`
- Create: `scripts/audit-industry-media-bounds-c2.ts`
- Modify: `package.json`

**Interfaces:**
- Advances: save migration version 34 to 35.
- Preserves: C1 story/event lineage and already-published keys.
- Normalizes: identity, assignment, stance, and appearance memory under explicit C2 bounds.

- [x] **Step 1: Write the failing migration/save audit**

Migrate a version-34 C1 save and assert save version 35, media schema version 2, populated anchor identities, unchanged existing feed counts, and zero republished items. Add malformed identity references and assert orphan assignments/personalities are discarded while valid C1 stories remain.

- [x] **Step 2: Run the save audit and observe RED**

Run `npm run audit:industry-media-save-c2`.

Expected failure: migration remains version 34 or media schema remains version 1.

- [x] **Step 3: Implement migration and compaction**

Initialize deterministic anchor identities during migration, retain existing story/event indexes and publication keys, reconcile assignments with retained stories/events/identities, and apply the explicit roster, assignment, recent-story, and stance bounds. Do not rewrite historical C1 feed items.

- [x] **Step 4: Write the focused bounded-state audit**

Run a controlled multi-year fixture with active and inactive periods. Assert exact identity caps, assignment/stance bounds, no work or publication during inactive weeks, regional coverage, signature identity continuity, and a reasonable distribution across non-signature personalities. Do not create a 400-year or device-performance run.

- [x] **Step 5: Run RED then GREEN for bounds**

First run `npm run audit:industry-media-bounds-c2` before the bounded implementation is complete and observe the specific limit assertion fail. Complete normalization/selection bounds, then rerun until it passes.

- [x] **Step 6: Add and run the aggregate C2 gate**

Add `audit:industry-media-c2` composing identities, coverage, voices, UI, save, and bounds audits. Run:

```bash
npm run audit:industry-media-c2
npm run audit:industry-media-state-c1
npm run audit:industry-media-arcs-c1
npm run audit:industry-media-presentation-c1
npm run audit:industry-media-save-c1
npm run audit:industry-player-world-b7
npm run build
```

Expected: all commands pass.

### Task 6: Completion report and roadmap handoff

**Files:**
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `docs/superpowers/plans/2026-09-04-media-institutions-recurring-personalities-c2.md`
- Create: `docs/superpowers/reports/2026-09-04-media-institutions-recurring-personalities-c2-report.md`

**Interfaces:**
- Records: exact changed architecture, player-visible behaviour, fresh audit evidence, known warnings, deferred 400-year/mobile gate, and C3 as the next approval gate.

- [x] **Step 1: Record fresh evidence**

Capture the aggregate C2 result, C1/B7 regression results, build result, focused bound counts, and save migration version.

- [x] **Step 2: Update the living roadmap**

Advance the roadmap version and date, mark C2 `COMPLETE`, and set `Current next phase` to `Project C Phase C3 design approval — X Discussions, Public Statements, and Player Responses`. Explicitly retain 400-year combined certification under C8.

- [x] **Step 3: Write the completion report**

Explain what changed, what the player sees, canonical-truth boundaries, identity/stance/save bounds, exact verification, intentional deferrals, and any remaining device QA.

- [x] **Step 4: Final self-review**

Search changed C2 docs for `TBD`, `TODO`, contradictory phase ownership, or claims unsupported by fresh command output. Fix any issue, mark every completed plan checkbox, and leave the worktree uncommitted for the user.
