# Project C7 Long-Term Narratives, Feuds, PR, and Media Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bounded evidence-backed media narratives, persistent relationships/feuds, automatic publicist amplification and damage control, and exact-once project promotion attribution to the existing C1–C6 media world.

**Architecture:** Extend `IndustryMediaWorldState` with normalized C7 collections owned by focused state, narrative, relationship, PR, and promotion services. B7/C1 remain truth/story authorities; C7 reads their stable lineage, modifies only bounded media/promotion effects, and uses the existing week coordinator plus existing social/project/marketing paths.

**Tech Stack:** TypeScript, React, Vite, existing deterministic RNG/ID helpers, executable `tsx` audits, current save migration and mobile app architecture.

**Spec:** `docs/superpowers/specs/2026-09-06-long-term-narratives-feuds-pr-c7-design.md`

## Global Constraints

- `WorldState.industryEvents` remains the sole authority for completed industry facts.
- Industry-media schema advances from 6 to 7 and save migration advances from 39 to 40.
- C7 may not change canonical facts, quality, reviews, IMDb ratings, awards, rights, contracts, production, company ownership, or outcome labels.
- Publicist modifiers never reverse an effect's sign and never auto-publish.
- Paid marketing remains owned by Release Wizard and is never charged again.
- Player silence remains safe; C7 adds no custom-control mode or weekly chore.
- Bounds are 120 narratives, 8 landmarks per narrative, 240 relationships, 12 relationship landmarks, 160 PR interventions, 160 promotion attributions, and 640 C7 exact-once keys.
- Create at most one new narrative per entered week and one dedicated retrospective inside an eight-week cooldown.
- Preserve the existing dirty worktree; do not stage, commit, or push.
- The combined 400-year/device certification remains C8.

---

## File structure

- `types.ts` — C7 narrative, landmark, relationship, PR, promotion, and lineage types.
- `services/industryWorld/industryMediaC7State.ts` — C7 validation, normalization, reconciliation, and compaction.
- `services/industryWorld/industryMediaNarratives.ts` — theme classification, qualification, progression, landmark creation, and retrospective payloads.
- `services/industryWorld/industryMediaRelationships.ts` — evidence-driven relationship and feud progression.
- `services/industryWorld/industryMediaPublicist.ts` — tier capacity, effect amplification/reduction, exact-once intervention records, and summaries.
- `services/projectPromotionAttribution.ts` — eligible projects, fatigue, campaign-fit scoring, and exact-once buzz attribution.
- `services/industryWorld/industryMediaLedger.ts`, `industryWorldWeek.ts`, `index.ts` — schema composition, entered-week order, and exports.
- `services/industryWorld/industryMediaResponses.ts` — raw C3 outcomes followed by shared C7 PR application.
- `hooks/useGameActions.ts`, `App.tsx`, `views/mobile/XApp.tsx`, `InstagramApp.tsx`, `YoutubeApp.tsx` — project-linked social promotion through the shared service.
- `views/mobile/IndustryNarrativeContext.tsx`, `NewsApp.tsx`, `XApp.tsx`, `TeamApp.tsx` — landmark, relationship, and PR after-action presentation.
- `services/saveMigration.ts` — migration 40 and C7 reconciliation.
- `scripts/audit-industry-media-*-c7.*`, `package.json` — focused audits and aggregate command.

---

### Task 1: Define and normalize C7 saved state

**Files:**
- Modify: `types.ts`
- Create: `services/industryWorld/industryMediaC7State.ts`
- Modify: `services/industryWorld/industryMediaLedger.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-state-c7.ts`

**Interfaces:**
- Produces: `normalizeIndustryMediaC7Collections(source, stories, personalities)`, C7 limit constants, and schema-7 `IndustryMediaWorldState` fields.
- Consumes: retained C1 stories, C2 personality IDs, and stable B7 event IDs.

- [ ] **Step 1: Write the failing state audit**

Assert schema 7, enum fallback, number clamping, orphan removal, exact-once deduplication, active/pending retention priority, and all 120/8/240/12/160/160/640 limits:

```ts
const normalized = normalizeIndustryMediaWorld(malformedOversizedC7Fixture);
assert.equal(normalized.schemaVersion, 7);
assert.equal(normalized.narratives.length, 120);
assert.ok(normalized.narratives.every(item => item.landmarks.length <= 8));
assert.ok(normalized.mediaRelationships.length <= 240);
assert.ok(normalized.prInterventions.length <= 160);
assert.ok(normalized.promotionAttributions.length <= 160);
assert.equal(normalized.processedC7Keys.length, 640);
```

- [ ] **Step 2: Run the state audit and observe RED**

Run: `npm run audit:industry-media-state-c7`
Expected: FAIL because the C7 types, normalizer, and command do not exist.

- [ ] **Step 3: Implement the minimal schema and normalizer**

Add the approved types and compose:

```ts
const c7 = normalizeIndustryMediaC7Collections(source, stories, new Set(personalities.map(item => item.id)));
return { schemaVersion: 7, ...existingCollections, ...c7 };
```

- [ ] **Step 4: Run the state audit and observe GREEN**

Run: `npm run audit:industry-media-state-c7`
Expected: PASS.

---

### Task 2: Create evidence-backed narrative progression

**Files:**
- Create: `services/industryWorld/industryMediaNarratives.ts`
- Create: `scripts/audit-industry-media-narratives-c7.ts`
- Create: `scripts/audit-industry-media-narrative-copy-c7.ts`

**Interfaces:**
- Produces: `advanceIndustryMediaNarratives(player, absoluteWeek): IndustryMediaNarrativeResult` and `getIndustryNarrativeContext(media, subjectKey)`.
- Consumes: normalized B7 events, C1 stories, C6 claim resolutions, and C7 state types.

- [ ] **Step 1: Write failing deterministic narrative audits**

Use fixed facts for a risky greenlight, overrun, flop, later hit, and refuted C6 prediction. Assert one narrative maximum per week, distinct supporting/contradicting evidence, no duplicate event consumption, eight-landmark retention, deterministic replay, and factual copy.

```ts
const first = advanceIndustryMediaNarratives(fixture, week);
const replay = advanceIndustryMediaNarratives(fixture, week);
assert.deepEqual(first.player.world.industryMedia?.narratives, replay.player.world.industryMedia?.narratives);
assert.ok(first.createdNarratives.length <= 1);
assert.ok(first.player.world.industryMedia?.narratives.every(item => item.landmarks.length <= 8));
```

- [ ] **Step 2: Run the narrative audits and observe RED**

Run: `npm run audit:industry-media-narratives-c7 && npm run audit:industry-media-narrative-copy-c7`
Expected: FAIL on missing exports.

- [ ] **Step 3: Implement classification and progression**

Map supported event combinations to approved themes, score a bounded shortlist, save stable IDs/landmarks, progress stages and fade only when due, and reject copy without retained evidence.

- [ ] **Step 4: Run the narrative audits and observe GREEN**

Run both commands again.
Expected: PASS.

---

### Task 3: Add persistent relationships and qualified feuds

**Files:**
- Create: `services/industryWorld/industryMediaRelationships.ts`
- Modify: `services/industryWorld/industryMediaIdentities.ts`
- Create: `scripts/audit-industry-media-relationships-c7.ts`
- Create: `scripts/audit-industry-media-feuds-c7.ts`

**Interfaces:**
- Produces: `advanceIndustryMediaRelationships(player, absoluteWeek, context): IndustryMediaRelationshipResult` and `describeIndustryMediaRelationship(relationship)`.
- Consumes: C2 personalities/stances, C3 resolved responses, C6 resolved claims/source records, C7 narratives, and retained event lineage.

- [ ] **Step 1: Write failing relationship and feud audits**

Assert one hostile story cannot create a feud; repeated separate evidence can move `NONE → BUILDING → ACTIVE`; inactivity can move `ACTIVE → COOLING`; reconciliation evidence can resolve; signature antagonist affinity stays inside its ceiling; supporter copy cannot deny a failure.

```ts
assert.equal(afterOneConflict.feudState, 'NONE');
assert.equal(afterRepeatedConflicts.feudState, 'ACTIVE');
assert.ok(afterRepeatedConflicts.landmarkInteractionIds.length <= 12);
assert.ok(afterPraise.affinity <= antagonist.stanceCeiling);
```

- [ ] **Step 2: Run the audits and observe RED**

Run: `npm run audit:industry-media-relationships-c7 && npm run audit:industry-media-feuds-c7`
Expected: FAIL on missing relationship service.

- [ ] **Step 3: Implement evidence-driven relationship progression**

Use stable event/response/claim IDs, clamp affinity/respect/trust/tension/familiarity, require separate evidence weeks for feud qualification, and mirror updated affinity into the existing C2 stance record without duplicating authority.

- [ ] **Step 4: Run the audits and observe GREEN**

Run both commands again.
Expected: PASS.

---

### Task 4: Replace recommendation-heavy publicist effects with shared automatic PR

**Files:**
- Create: `services/industryWorld/industryMediaPublicist.ts`
- Modify: `services/industryWorld/industryMediaResponses.ts`
- Create: `scripts/audit-industry-media-publicist-c7.ts`
- Create: `scripts/audit-industry-media-publicist-capacity-c7.ts`

**Interfaces:**
- Produces: `applyPublicistMediaModifier(player, input): PublicistMediaModifierResult`, `applyPublicistMediaBatch(player, inputs)`, and `getPublicistWeekSummary(player, absoluteWeek)`.
- Consumes: a raw signed effect vector, importance, publication key, week, player publicist tier, and existing C7 interventions.

- [ ] **Step 1: Write failing PR audits**

Assert tier percentages/capacity, exact-once keys, deterministic priority, no sign reversal, no outcome mutation, no banked capacity, and future-only hire/dismiss behavior.

```ts
const result = applyPublicistMediaModifier(playerWithElitePublicist, {
  key: 'response:r1', absoluteWeek: 44, importance: 'HIGH',
  rawEffects: { reputation: -3, controversy: 10, followers: -1000, projectBuzz: 0, mediaStance: -4, discussionHeat: 18, relationshipTension: 8, narrativeMomentum: -6 },
});
assert.equal(result.appliedEffects.reputation, -2);
assert.ok(result.appliedEffects.controversy >= 0 && result.appliedEffects.controversy < 10);
assert.equal(result.outcomeChanged, false);
```

- [ ] **Step 2: Run the PR audits and observe RED**

Run: `npm run audit:industry-media-publicist-c7 && npm run audit:industry-media-publicist-capacity-c7`
Expected: FAIL on missing service.

- [ ] **Step 3: Implement automatic PR and refactor C3**

Remove C3's embedded publicist score/mitigation from raw outcome calculation, apply the shared modifier after all due raw outcomes are known, save raw/applied effects and intervention records, and apply only final deltas.

- [ ] **Step 4: Run PR and C3 audits and observe GREEN**

Run: `npm run audit:industry-media-publicist-c7 && npm run audit:industry-media-publicist-capacity-c7 && npm run audit:industry-media-c3`
Expected: PASS.

---

### Task 5: Centralize exact-once project promotion attribution

**Files:**
- Create: `services/projectPromotionAttribution.ts`
- Modify: `types.ts`
- Modify: `hooks/useGameActions.ts`
- Modify: `App.tsx`
- Modify: `views/mobile/XApp.tsx`
- Modify: `views/mobile/InstagramApp.tsx`
- Modify: `views/mobile/YoutubeApp.tsx`
- Create: `scripts/audit-project-promotion-attribution-c7.ts`
- Create: `scripts/audit-project-promotion-integration-c7.tsx`

**Interfaces:**
- Produces: `getEligiblePromotionProjects(player)`, `applyProjectPromotionAttribution(player, input)`, and optional `promotedProjectId`/`promotionAttributionId` lineage on player posts/videos.
- Consumes: project/commitment ID, publication ID, channel/type, reach/engagement, absolute week, campaign fit/positioning, C7 PR service, and existing commitment buzz.

- [ ] **Step 1: Write failing attribution and integration audits**

Assert only the selected active project changes, duplicate publication is a no-op, repeated same-project promotion decays, projectless lifestyle posts do not change buzz, existing energy is charged once, paid marketing is unchanged, and eligible composer project selectors render only when useful.

```ts
const result = applyProjectPromotionAttribution(player, input);
assert.ok(result.appliedBuzzDelta > 0);
assert.equal(result.player.commitments.find(item => item.id === input.projectId)?.promotionalBuzz, originalBuzz + result.appliedBuzzDelta);
assert.equal(applyProjectPromotionAttribution(result.player, input).appliedBuzzDelta, 0);
assert.equal(result.player.money, player.money);
```

- [ ] **Step 2: Run the attribution audits and observe RED**

Run: `npm run audit:project-promotion-attribution-c7 && npm run audit:project-promotion-integration-c7`
Expected: FAIL on missing service/lineage/UI.

- [ ] **Step 3: Implement service and route existing actions through it**

Replace direct Career buzz increments with shared attribution, add minimal active-project selection to eligible X/Instagram/YouTube compose flows, preserve generic posts, and store exact lineage on the post/video.

- [ ] **Step 4: Run attribution plus adjacent social audits and observe GREEN**

Run the two C7 commands plus existing Instagram/X/YouTube focused checks available in `package.json`.
Expected: PASS with no duplicate spend or buzz.

---

### Task 6: Integrate entered-week narratives, relationships, and PR ordering

**Files:**
- Modify: `services/industryWorld/industryWorldWeek.ts`
- Modify: `services/industryWorld/industryMediaClaimPublication.ts`
- Modify: `services/industryWorld/industryMediaYoutube.ts`
- Modify: `services/industryWorld/industryMediaFandoms.ts`
- Create: `scripts/audit-industry-media-week-c7.ts`
- Create: `scripts/audit-industry-media-isolation-c7.ts`

**Interfaces:**
- Produces: exact C7 coordinator order and optional `mediaNarrativeId`/`mediaRelationshipId` presentation lineage.
- Consumes: Task 2–5 result objects and existing C1–C6 week results.

- [ ] **Step 1: Write failing entered-week and isolation audits**

Assert claims resolve before relationship/narrative advancement, raw responses precede PR application, C4/C5 receive saved resolved context, one new narrative maximum, exact replay no-op, and no canonical project/rights/company/economic mutation.

- [ ] **Step 2: Run both audits and observe RED**

Run: `npm run audit:industry-media-week-c7 && npm run audit:industry-media-isolation-c7`
Expected: FAIL because C7 is not in the coordinator.

- [ ] **Step 3: Implement the approved coordinator order**

Compose claim resolution, raw response resolution/shared PR, C4/C5, relationship advancement, narrative advancement, claim creation, and bounded publication while preserving `lastProcessedAbsoluteWeek` exact-once behavior.

- [ ] **Step 4: Run both audits and observe GREEN**

Run both commands again.
Expected: PASS.

---

### Task 7: Present narrative history, relationships, and PR after-actions

**Files:**
- Create: `views/mobile/IndustryNarrativeContext.tsx`
- Modify: `views/mobile/NewsApp.tsx`
- Modify: `views/mobile/XApp.tsx`
- Modify: `views/mobile/TeamApp.tsx`
- Modify: `views/mobile/YoutubeApp.tsx`
- Modify: `views/mobile/InstagramApp.tsx`
- Create: `scripts/audit-industry-media-ui-c7.tsx`

**Interfaces:**
- Produces: compact `The story so far`, qualitative relationship copy, publicist capacity/after-action cards, and legacy-safe fallbacks.
- Consumes: normalized C7 state and existing C1–C6 detail/profile contexts.

- [ ] **Step 1: Write the failing server-rendered UI audit**

Assert landmark summaries, qualitative relationship language without raw scores, PR prevented/amplified values, no recommendation/custom-control copy, project selector eligibility, mobile-safe wrapping, and legacy cards without C7 state.

- [ ] **Step 2: Run the UI audit and observe RED**

Run: `npm run audit:industry-media-ui-c7`
Expected: FAIL on missing component/presentation.

- [ ] **Step 3: Implement minimal existing-surface UI**

Mount shared context in existing detail/profile views, add a compact publicist performance block to the existing Team card, and avoid a new app/dashboard.

- [ ] **Step 4: Run the UI audit and observe GREEN**

Run the UI audit again.
Expected: PASS.

---

### Task 8: Migrate saves and complete focused regression

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `package.json`
- Create: `scripts/audit-industry-media-save-c7.ts`
- Modify: C1–C6 schema/migration expectations where they intentionally assert the latest version.

**Interfaces:**
- Produces: migration 40, aggregate `audit:industry-media-c7`, and old-save compatibility.
- Consumes: all C7 normalizers plus existing save integrity/compaction boundaries.

- [ ] **Step 1: Write the failing migration audit**

Assert v39→v40, empty old-save C7 collections, malformed recovery, no synthetic history, retained C1–C6 state, pending/high-value retention, and load/save/reload stability.

- [ ] **Step 2: Run save audit and observe RED**

Run: `npm run audit:industry-media-save-c7`
Expected: FAIL because migration remains 39.

- [ ] **Step 3: Implement migration and aggregate scripts**

Advance the version once, reconcile C7 after B7/C1–C6 data, update intentional current-version assertions, and add all focused C7 commands to `audit:industry-media-c7`.

- [ ] **Step 4: Run focused and adjacent verification**

Run:

```bash
npm run audit:industry-media-c7
npm run audit:industry-media-c6
npm run audit:industry-media-c5
npm run audit:industry-media-c4
npm run audit:industry-media-c3
npm run audit:industry-media-c2
npm run audit:industry-media-c1
npm run audit:industry-player-world-b7
npm run audit:youtube-events
npm run audit:youtube-merch
npm run audit:youtube-merch-ui
npm run audit:youtube-merch-cheat
npm run build
npm run lint
git diff --check
```

Expected: focused/adjacent audits, build, and whitespace check pass. If repository-wide lint remains red only in documented unrelated legacy fixtures, report exact files without hiding the failure.

---

### Task 9: Browser smoke, roadmap, and completion report

**Files:**
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `docs/superpowers/specs/2026-09-06-long-term-narratives-feuds-pr-c7-design.md`
- Create: `docs/superpowers/reports/2026-09-06-long-term-narratives-feuds-pr-c7-report.md`

**Interfaces:**
- Produces: browser evidence, C7 completion evidence, and C8 as the next approval gate.
- Consumes: verified implementation and commands from Task 8.

- [ ] **Step 1: Run a meaningful local browser smoke**

Boot Vite from this repository, load an existing save, inspect News/X/Team plus an eligible project-promotion surface, and confirm no horizontal overflow or new console failure. Do not claim a generated C7 fixture was visually inspected unless one is actually present.

- [ ] **Step 2: Update design and roadmap only after verification**

Mark C7 complete, advance the roadmap to C8 design approval, record schema 7/migration 40, delivered behavior, bounds, exact commands, warnings, and deferrals.

- [ ] **Step 3: Write the completion report**

Record simulation changes, player-visible result, existing-system reuse, legacy paths, migration, audits/build/browser evidence, limitations, repository state, and C8 as next.

- [ ] **Step 4: Final integrity check**

Run `git diff --check`, inspect `git status --short`, and confirm nothing was staged, committed, or pushed.
