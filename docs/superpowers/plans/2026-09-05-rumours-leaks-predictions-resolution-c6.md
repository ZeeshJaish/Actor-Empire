# Project C6 Rumours, Leaks, Predictions, and Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, evidence-linked rumours, rare safe leaks, predictions, truth resolution, and source track records to Actor Empire's existing industry-media world.

**Architecture:** Extend `WorldState.industryMedia` with bounded atomic claims and category-specific source records. A focused claim engine derives at most one new claim from an existing C1 story/public B7 evidence or a safe AI-only intention snapshot; a separate resolver compares open claims with later canonical B7 facts before any new claim is created. Existing News, X, YouTube, Instagram, C2 identities, C3 discussions, C4 creators, and C5 fandoms render or react to the same claim lineage without becoming sources of truth.

**Tech Stack:** TypeScript, React, Vite, existing deterministic RNG/ID services, executable `tsx` audits, current save-migration and mobile-app architecture.

**Spec:** `docs/superpowers/specs/2026-09-05-rumours-leaks-predictions-resolution-c6-design.md`

## Global Constraints

- `WorldState.industryEvents` remains the sole authority for completed facts.
- Unconfirmed copy always carries an explicit `RUMOUR`, `LEAK`, or `PREDICTION` label and uncertainty wording.
- Player-controlled companies and acquired/delegated subsidiaries never expose private unpublished intentions.
- C6 cannot mutate money, energy, fame, project quality, ratings, box office, streaming revenue, rights, contracts, production, awards, ownership, company state, or AI plans.
- Create at most one claim per entered week and publish at most two claim/resolution beats per week.
- Retain at most 192 claims, 640 processed keys, 12 evidence event IDs, 4 resolution event IDs, 16 recent claim IDs per source, and 8 category summaries per source.
- Advance industry-media schema from 5 to 6 and save migration from 38 to 39.
- Use local/offline-safe visual identity only; add no remote asset dependency.
- Preserve the existing dirty worktree; do not stage, commit, or push unless the user explicitly asks.
- The combined 400-year, mature-save, and physical-device certification remains C8.

---

## File structure

- `types.ts` — C6 claim, target, resolution, source-record, and cross-surface lineage types.
- `services/industryWorld/industryMediaClaimsState.ts` — normalization, validation, compaction, and reconciliation helpers only.
- `services/industryWorld/industryMediaClaims.ts` — candidate discovery, evidence scoring, source selection, safe leak snapshots, claim creation, and fact-safe copy.
- `services/industryWorld/industryMediaClaimResolution.ts` — typed matching, lifecycle transitions, source-record deltas, and resolution presentation payloads.
- `services/industryWorld/industryMediaClaimPresentation.ts` — bounded News/X/Instagram publication and cross-surface lineage adapters.
- `services/industryWorld/industryMediaResponses.ts` — map optional claim responses onto existing C3 tones and resolve later contradiction once.
- `services/industryWorld/industryMediaLedger.ts` — compose C6 normalization with the existing C1–C5 collections and publish schema 6.
- `services/industryWorld/industryWorldWeek.ts` — call resolve before C3/C4/C5 and create/publish after C5.
- `services/industryWorld/index.ts` — export the focused C6 interfaces.
- `services/saveMigration.ts` — migration 39 and event/media reconciliation.
- `views/mobile/IndustryClaimContext.tsx` — reusable game-style claim label, evidence, resolution, and source-record UI.
- `views/mobile/NewsApp.tsx`, `XApp.tsx`, `YoutubeApp.tsx`, `InstagramApp.tsx` — mount the shared claim context in existing detail/profile surfaces.
- `package.json` and `scripts/audit-industry-media-*-c6.*` — focused C6 executable audits and aggregate command.
- C6 roadmap/report files — completion evidence and next-phase status after all verification passes.

---

### Task 1: Define and normalize the C6 saved model

**Files:**
- Modify: `types.ts`
- Create: `services/industryWorld/industryMediaClaimsState.ts`
- Modify: `services/industryWorld/industryMediaLedger.ts`
- Modify: `services/industryWorld/index.ts`
- Create: `scripts/audit-industry-media-claims-state-c6.ts`

**Interfaces:**
- Produces: `IndustryMediaClaim`, `IndustryMediaClaimTarget`, `IndustryMediaClaimResolution`, `IndustryMediaSourceRecord`, `normalizeIndustryMediaClaimCollections(source, stories, institutions, personalities)`.
- Consumes: C1 story IDs, B7 event IDs, C2 institution/personality IDs, and existing C3/C4/C5 optional lineage IDs.

- [ ] **Step 1: Write the failing state audit**

Create malformed/oversized fixtures and assert schema 6, deduplication, enum fallbacks, numeric clamping, open-claim priority, 192/640/12/4/16/8 bounds, and orphan removal. The core assertion must include:

```ts
const normalized = normalizeIndustryMediaWorld({
    schemaVersion: 5,
    stories: [story],
    institutions: [institution],
    personalities: [personality],
    claims: oversizedClaims,
    sourceRecords: malformedSourceRecords,
    processedClaimKeys: oversizedKeys,
});
assert.equal(normalized.schemaVersion, 6);
assert.equal(normalized.claims.length, INDUSTRY_MEDIA_CLAIM_LIMIT);
assert.ok(normalized.claims.every(claim => claim.anchorStoryId === story.id));
assert.ok(normalized.claims.every(claim => claim.evidenceEventIds.length <= 12));
assert.equal(normalized.processedClaimKeys.length, INDUSTRY_MEDIA_CLAIM_PROCESSED_KEY_LIMIT);
```

- [ ] **Step 2: Run RED**

Run: `npx tsx scripts/audit-industry-media-claims-state-c6.ts`

Expected: FAIL because C6 types/normalizer/exports do not exist.

- [ ] **Step 3: Add exact claim types**

Add discriminated types with these names and values:

```ts
export type IndustryMediaClaimKind = 'RUMOUR' | 'LEAK' | 'PREDICTION';
export type IndustryMediaClaimStatus = 'OPEN' | 'CONFIRMED' | 'PARTLY_CONFIRMED' | 'REFUTED' | 'EXPIRED_UNVERIFIED' | 'SUPERSEDED';
export type IndustryMediaClaimCategory = 'CASTING' | 'PROJECT_STATUS' | 'PLATFORM_DESTINATION' | 'RELEASE_WINDOW' | 'FRANCHISE_DIRECTION' | 'AWARDS' | 'COMPANY_MOVE' | 'PROJECT_OUTCOME';
export type IndustryMediaClaimConfidence = 'TENTATIVE' | 'CREDIBLE_CHATTER' | 'STRONG_SOURCING';
```

Extend `IndustryMediaWorldState` with `claims`, `sourceRecords`, and `processedClaimKeys`, and add optional `mediaClaimId` to `NewsItem`, `XPost`, `InstaPost`, `IndustryMediaDiscussion`, `IndustryMediaPlayerResponse`, `IndustryMediaYoutubeVideo`, and `IndustryMediaCampaign`.

- [ ] **Step 4: Implement strict normalization and compaction**

Keep normalization independent from generation/resolution. Reject claims lacking a valid story, anchor event, source, typed target, non-empty copy, or valid weeks. Prioritize open, player-related, recent, and high-importance claims when bounding. Repair source histories against retained claim IDs while preserving aggregate counts.

- [ ] **Step 5: Run GREEN and existing state regressions**

Run:

```bash
npx tsx scripts/audit-industry-media-claims-state-c6.ts
npm run audit:industry-media-c5
```

Expected: both pass.

---

### Task 2: Generate evidence-grounded rumours and predictions

**Files:**
- Create: `services/industryWorld/industryMediaClaims.ts`
- Create: `scripts/audit-industry-media-claim-generation-c6.ts`
- Create: `scripts/audit-industry-media-claim-copy-c6.ts`

**Interfaces:**
- Consumes: `Player`, absolute week, normalized B7 ledger, normalized C1–C5 media state.
- Produces: `createIndustryMediaClaim(player, absoluteWeek): { player: Player; claim?: IndustryMediaClaim }` and pure `buildIndustryMediaClaimCandidates(...)`/`renderIndustryMediaClaimCopy(...)` helpers.

- [ ] **Step 1: Write generation and copy audits**

Use fixtures for project release, rights, franchise, award, company distress, and outcome stories. Assert stable IDs across clones/reloads, at most one creation, no duplicate subject/category/target, correct source focus, and suppression when evidence or typed target is absent.

Require every open claim copy to match its label and uncertainty language:

```ts
assert.match(claim.summary, /reportedly|believed|may|could|prediction|unconfirmed/i);
assert.doesNotMatch(claim.summary, /has signed|has acquired|will definitely|confirmed that/i);
assert.ok(claim.evidenceEventIds.every(id => story.industryEventIds.includes(id)));
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx tsx scripts/audit-industry-media-claim-generation-c6.ts
npx tsx scripts/audit-industry-media-claim-copy-c6.ts
```

Expected: FAIL because the claim engine is absent.

- [ ] **Step 3: Implement candidate derivation and scoring**

Build typed candidates only from resolver-supported evidence. Score story importance, recency, uncertainty, source/category fit, region/language, cultural momentum, saturation, and deterministic variance. Suppress quiet/terminal/inadequate candidates and enforce one open equivalent claim plus consecutive-subject fatigue.

- [ ] **Step 4: Implement deterministic attribution and copy**

Select existing C2 institutions/personalities by focus, channels, access, credibility, sensationalism, independence, region, language, and recent workload. Create stable claim IDs/keys and category-specific minimum/expiry windows. Use bounded templates that always state uncertainty.

- [ ] **Step 5: Run GREEN**

Run both C6 generation/copy audits twice and compare serialized outputs; both runs must pass with identical claim data.

---

### Task 3: Add rare safe AI-intention leaks

**Files:**
- Modify: `services/industryWorld/industryMediaClaims.ts`
- Create: `scripts/audit-industry-media-leaks-c6.ts`

**Interfaces:**
- Consumes: existing Platform AI/Studio AI/shared-intelligence saved intentions without invoking their planners.
- Produces: sanitized `IndustryMediaLeakIntentSnapshot` values used only inside `IndustryMediaClaim`.

- [ ] **Step 1: Write the failing leak-boundary audit**

Create AI-controlled, player-controlled, acquired-subsidiary, abandoned, already-public, and malformed intention fixtures. Deep-clone all AI/company state before generation. Assert only the eligible AI case can create `LEAK`, snapshots contain no budget/bid/debug fields, and all source simulation remains byte-identical.

- [ ] **Step 2: Run RED**

Run: `npx tsx scripts/audit-industry-media-leaks-c6.ts`

Expected: FAIL because no leak adapter exists.

- [ ] **Step 3: Implement read-only leak adapters**

Recognize only safe commission consideration, franchise continuation, release window, rights target, and casting-direction intents that have a public subject/story anchor. Enforce AI control at publication time, active lifecycle, age limit, one-intention/one-claim key, and source access threshold. Copy only stable subject/target/window identifiers into the snapshot.

- [ ] **Step 4: Run GREEN plus AI isolation regressions**

Run the leak audit and `npm run audit:industry-player-world-b7`. Both must pass.

---

### Task 4: Resolve claims against later canonical facts

**Files:**
- Create: `services/industryWorld/industryMediaClaimResolution.ts`
- Create: `scripts/audit-industry-media-claim-resolution-c6.ts`
- Create: `scripts/audit-industry-media-source-records-c6.ts`

**Interfaces:**
- Consumes: `resolveIndustryMediaClaims(player, absoluteWeek): IndustryMediaClaimResolutionResult`.
- Produces: updated claims/source records plus bounded `resolvedClaims` for presentation; does not publish directly.

- [ ] **Step 1: Write typed resolution fixtures**

Cover confirmation, partial territory/window match, contradiction, supersession, and no-evidence expiry for every supported category. Verify the resolution event is later than publication and belongs to the expected subject/target family.

- [ ] **Step 2: Write source-record fixtures**

Assert exact-once count/reliability changes, category isolation, small bounded deltas, higher reward for a difficult correct leak, stronger penalty for a sensational refutation, and zero/near-zero movement for `EXPIRED_UNVERIFIED`.

- [ ] **Step 3: Run RED**

Run both resolution/source-record audits; expect missing resolver failures.

- [ ] **Step 4: Implement typed adapters and lifecycle rules**

Use stable event/evidence IDs and typed expected values, never headline matching. Evaluate only open claims whose `earliestResolutionAbsoluteWeek <= absoluteWeek`. Save status, resolution week/event IDs/explanation and source delta once; close expired claims only after their category window.

- [ ] **Step 5: Run GREEN and replay checks**

Run both audits twice against the first result and assert the second pass is byte-identical with no additional source delta.

---

### Task 5: Publish claims and resolutions through existing media apps

**Files:**
- Create: `services/industryWorld/industryMediaClaimPresentation.ts`
- Modify: `services/industryWorld/industryMediaDiscussions.ts`
- Modify: `services/industryWorld/industryMediaResponses.ts`
- Modify: `services/industryWorld/industryMediaYoutube.ts`
- Modify: `services/industryWorld/industryMediaFandoms.ts`
- Modify: `services/industryWorld/industryWorldWeek.ts`
- Create: `scripts/audit-industry-media-claim-week-c6.ts`
- Create: `scripts/audit-industry-media-claim-isolation-c6.ts`

**Interfaces:**
- Consumes: one newly created claim and the resolver's due resolutions.
- Produces: bounded News/X/Instagram records with `mediaClaimId`, plus adapters that let later C3/C4/C5 processing reference—not reapply—the claim.

- [ ] **Step 1: Write entered-week and isolation audits**

Assert order: B7 facts/C1 coverage → resolve old C6 claims → C3 → C4 → C5 → create new C6 claim. Verify a new claim cannot resolve the same week, replay is inert, only two claim beats publish, and all forbidden player/world fields remain byte-identical.

- [ ] **Step 2: Run RED**

Run the week and isolation audits; expect no C6 coordinator integration.

- [ ] **Step 3: Implement bounded presentation**

Reuse the existing 50 News/80 X/50 Instagram feed caps and prepend/dedup patterns. X is primary; News receives only high-importance claims/resolutions; Instagram receives only culturally relevant claim reaction; C4/C5 see the claim on later entered weeks. Every record retains claim, story, anchor-event, institution, and personality lineage. Map `Deny the report` to C3 `CLARIFY`, `Challenge the source` to `CHALLENGE`, and `Tease the audience` to `HUMOUR`; `No comment` and silence publish nothing. Store `mediaClaimId` on any submitted response so a later contradiction can apply one capped exact-once C3 credibility/controversy adjustment.

- [ ] **Step 4: Integrate two-pass C6 processing**

Call `resolveIndustryMediaClaims` immediately after C1/C2 projection and before C3 resolution. After C4/C5, call claim creation and presentation. Extend the returned social/news arrays without bypassing saved feeds or the existing exactly-once checkpoint.

- [ ] **Step 5: Run GREEN and C1–C5/B7 regressions**

Run the two C6 audits plus `audit:industry-media-c1` through `c5` and `audit:industry-player-world-b7`.

---

### Task 6: Add game-style claim context and source track records

**Files:**
- Create: `views/mobile/IndustryClaimContext.tsx`
- Modify: `views/mobile/NewsApp.tsx`
- Modify: `views/mobile/XApp.tsx`
- Modify: `views/mobile/YoutubeApp.tsx`
- Modify: `views/mobile/InstagramApp.tsx`
- Create: `scripts/audit-industry-media-claim-ui-c6.tsx`

**Interfaces:**
- Produces: `IndustryClaimBadge`, `IndustryClaimContextPanel`, `IndustryClaimResolutionStrip`, and `IndustrySourceTrackRecord`.
- Consumes: normalized claim/source records and existing detail/profile callbacks; never mutates gameplay.

- [ ] **Step 1: Write the failing server-rendered UI audit**

Render open rumour, leak, prediction, confirmed, refuted, and expired fixtures. Assert visible labels, `What we know`, `What is being claimed`, source context, `What happened next`, source record language/counts, no raw hidden score, and no `undefined`, `null`, or remote image URL.

- [ ] **Step 2: Run RED**

Run: `npx tsx scripts/audit-industry-media-claim-ui-c6.tsx`

Expected: FAIL because shared C6 UI components do not exist.

- [ ] **Step 3: Implement the shared visual language**

Use one compact editorial card with typography/dividers rather than metric-box grids. Apply distinct restrained label colours for rumour/leak/prediction and resolution states while inheriting the source's existing C2 palette/avatar. Keep mobile width, safe areas, and single-screen information hierarchy aligned with current message/media designs.

- [ ] **Step 4: Mount context in existing surfaces**

News detail shows full evidence/resolution; X shows a compact label and thread context; YouTube watch shows the linked prediction/resolution; Instagram detail labels fandom reaction; source profiles show a small track-record section. Do not add a new app or dashboard.

- [ ] **Step 5: Run GREEN and browser smoke**

Run the UI audit, then verify representative claim and resolution screens at 390 × 844 with no horizontal overflow or console exception.

---

### Task 7: Add migration 39 and full C6 audit command

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `package.json`
- Create: `scripts/audit-industry-media-claim-save-c6.ts`

**Interfaces:**
- Consumes: legacy saves with no C6 fields, malformed schema-6 saves, and valid round-trip C6 saves.
- Produces: migration version 39 with normalized schema-6 media state.

- [ ] **Step 1: Write the failing save audit**

Assert migration 38 → 39 creates empty collections without fabricated history, schema-6 round trips preserve deterministic claims/resolutions/source aggregates, reconciliation removes orphan evidence, and compaction retains open/player-important claims.

- [ ] **Step 2: Run RED**

Run: `npx tsx scripts/audit-industry-media-claim-save-c6.ts`

Expected: FAIL while migration remains 38.

- [ ] **Step 3: Implement migration and aggregate scripts**

Set `SAVE_MIGRATION_VERSION = 39`, keep old-save defaults empty, reconcile claims after the B7 event ledger is normalized, and add individual plus aggregate `audit:industry-media-c6` package scripts for all eight C6 audit families.

- [ ] **Step 4: Run GREEN**

Run `npm run audit:industry-media-c6` twice. Both runs must pass.

---

### Task 8: Full verification, roadmap, and report

**Files:**
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `docs/superpowers/specs/2026-09-05-rumours-leaks-predictions-resolution-c6-design.md`
- Create: `docs/superpowers/reports/2026-09-05-rumours-leaks-predictions-resolution-c6-report.md`

**Interfaces:**
- Produces: evidence-backed C6 completion record and advances the approval gate to C7 only after all required checks pass.

- [ ] **Step 1: Run focused and adjacent audits**

Run:

```bash
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
```

Expected: all focused/adjacent audits and the production build pass.

- [ ] **Step 2: Run repository TypeScript check**

Run: `npm run lint`

Expected: record an honest pass or the exact pre-existing unrelated B8/streaming fixture failures; no error may point to a C6 production or audit file.

- [ ] **Step 3: Perform local mobile experience smoke**

Verify the running server belongs to `/Users/zeesh/Vibe code/Actor empire`, open representative News/X/YouTube/Instagram claim and resolution surfaces at mobile width, and confirm readable labels, correct lineage, no horizontal overflow, and no JavaScript exception.

- [ ] **Step 4: Write completion evidence**

Update the C6 spec status only after verification. Write the report with delivered behaviour, source-truth boundary, player workload, data limits, migration, commands/results, known repository warnings, deferrals, and dirty-worktree status.

- [ ] **Step 5: Advance the living roadmap**

Set C6 to `COMPLETE`, C7 to `NEXT`, update the date/version/change log/evidence, and preserve C8 as the combined long-run/device gate. Do not stage, commit, or push without explicit user authorization.
