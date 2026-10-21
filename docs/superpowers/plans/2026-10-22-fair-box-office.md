# Fair Box Office Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace reward-driven box office with a fair shared audience market where real awareness, choices, paid visits, cinema supply and costs determine earnings.

**Architecture:** A pure, versioned cinema-week kernel consumes one frozen world snapshot and every eligible title. Separate adapters normalize player productions, accepted gigs and NPC films; one idempotent settlement feeds cash, charts, forecasts and audience insights. Build in shadow before connecting money, and retain existing streaming/population authorities.

**Tech Stack:** TypeScript, existing world-economy and industry state, React/Vite, Node assert audits bundled with the installed esbuild, existing deterministic RNG and save-generation safeguards. No additional runtime dependency.

**Spec:** [Fair Box Office Design](</Users/zeesh/Vibe code/Actor empire/docs/superpowers/specs/2026-10-22-fair-box-office-design.md>)

## Global Constraints

- Automatic country/chain ticket prices; no manual ticket-price slider.
- Availability is not awareness; awareness is not a sale.
- No fixed monetary box-office cap or guaranteed budget multiple in the new model.
- One canonical title and one committed market result per absolute week.
- Preserve earned money, historical gross, paid costs and signed contracts.
- Share population, spending, time and cinema capacity across owner routes.
- Preserve save-generation verification/recovery and the frozen English localization baseline.
- Full cinema-chain management, numerical IMDb redesign and series bug fixes are outside this change.

Execution choice: inline, one owner of world/week/accounting integration, using `executing-plans`. The user delegated the choice. Do not restart a choice/approval flow merely because a skill's default handoff offers two approaches. This document is the implementation handoff; writing it does not authorize silently treating proposed balance as verified.

## Baseline and checkpoints

Current audited HEAD: `612efbb1cb6c80a22d1ba30fde4a1d88f90cdc4e`; package 1.0.25. Recheck at execution time. Read applicable repository instructions before edits. Preserve the unrelated streaming Operations changes, including new untracked files. No blanket reset, clean, restore or `git add .`.

Create a timestamped manifest under `/private/tmp/actor-box-office-<timestamp>/` containing HEAD, status, binary diff, owned-file hashes and copies of preexisting untracked files that overlap planned work. After each task, review only that task's diff, stage only its owned hunks and make a scoped checkpoint commit. Shared dirty files require selective hunk staging. Do not push, merge or ship as part of a local checkpoint.

Use the audit's [report](</Users/zeesh/Vibe code/Actor empire/docs/reports/2026-10-22-box-office-analysis/report.md>), `results.json` and `verification.json` as preserved evidence. Do not rewrite the old measured results to make new assertions pass.

## File ownership map

All repository paths below resolve under `/Users/zeesh/Vibe code/Actor empire/`.

| New module | Responsibility |
|---|---|
| `services/boxOffice/boxOfficeTypes.ts` | Canonical title, exposure, choice, supply, market, ledger and saved-state contracts |
| `services/boxOffice/boxOfficeProfiles.ts` | Schema/tuning versions and explicit candidate parameters with units |
| `services/boxOffice/boxOfficeInputs.ts` | Identity/cast/owner normalization and continuous production inputs |
| `services/boxOffice/boxOfficeDelivery.ts` | Bounded craft/production contributions, expectation and delivered experience |
| `services/boxOffice/boxOfficeAwareness.ts` | Recognition, exposure sources, campaign saturation and forecast-safe projection |
| `services/boxOffice/boxOfficeAudience.ts` | First/repeat/defer intent, fit, experience, affinity and universe history |
| `services/boxOffice/boxOfficeSupply.ts` | Country prices, region-to-country access, shared shows and booking quotes |
| `services/boxOffice/boxOfficeMarket.ts` | Pure joint allocation and compact next market state |
| `services/boxOffice/boxOfficeSettlement.ts` | Realized gross splits, costs, financial facts and exactly-once money |
| `services/boxOffice/boxOfficeMigration.ts` | Legacy transition, schema and settlement-basis compatibility |
| `services/boxOffice/boxOfficeWeek.ts` | One world snapshot and common owner-route orchestration |
| `services/boxOffice/boxOfficeForecast.ts` | Same kernel with known inputs and uncertainty scenarios |
| `services/boxOffice/boxOfficePresentation.ts` | Committed finance/audience facts for all player surfaces |
| `services/boxOffice/boxOfficeRightsValue.ts` | Buyer-specific incremental post-theater rights value |
| `scripts/fixtures/boxOfficeScenarios.ts` | Deterministic isolated fixtures and 24 contrasted calibration scenarios |
| `scripts/run-box-office-audit.mjs` | Builds/runs only the selected cinema audit using installed esbuild |

Existing integration points: `types.ts`, `services/gameLoop.ts`, `services/roleLogic.ts`, `services/npcLogic.ts`, `services/characterIdentityLogic.ts`, `services/universeLogic.ts`, `services/productionRisk.ts`, `services/distributionRevenue.ts`, `services/theatricalRunLogic.ts`, `services/studioProductionEconomy.ts`, `services/businessLogic.ts`, `services/studioAi/studioAiCommercialResult.ts`, `services/studioAi/studioAiWeek.ts`, `services/audienceReception.ts`, `views/mobile/MobilePage.tsx`, `views/mobile/BoxOfficeApp.tsx`, `views/mobile/ImdbApp.tsx`, `views/lifestyle/business/GreenlightWizard.tsx`, `greenlightCalculations.ts`, `greenlightProjectBuilder.ts`, `ReleaseWizard.tsx` and `components/ProjectDashboardModal.tsx` in that same business directory. Trace exact streaming bid producers before changing them; Task 10 records their callers in its checkpoint.

Reuse existing `worldEconomy` and `industryIntelligence` modules through adapters. If extracting the private genre/persona table from `worldStreamingViewing.ts`, put the unchanged definitions in `services/worldEconomy/worldAudiencePreferences.ts` and prove streaming parity before adding cinema-specific weights. Do not restructure unrelated streaming UI.

## Shared contracts and numerical rules

Task 1 defines these exported types in `boxOfficeTypes.ts`; each later task extends its own declared payload, rather than inventing another title/result shape.

- `CinemaOwnerRef`: canonical owner ID and route `PLAYER_STUDIO | ACCEPTED_ROLE | NPC_STUDIO`.
- `CinemaTitleInput`: canonical ID/owner, credited people with role weights, normalized production delivery, visible estimates, country rights/language, requested footprint, campaign exposure events, signed terms and historical facts.
- `CinemaWeekInput`: `absoluteWeek`, deterministic `seed`, `tuningVersion`, immutable `titles`, `cohorts`, `supply`, prior `marketState` and `knowledge: OBSERVED | FORECAST`. Money fields use integer cents; people/admissions use nonnegative integer counts.
- `CinemaWeekResult`: `absoluteWeek`, versions, input fingerprint, title rows, cohort/supply audit totals, deduplicated cost events and `nextState`. Rows include `titleId`, `firstAdmissions`, `repeatAdmissions`, `grossCents`, `producerReceiptsCents`, `exhibitorReceiptsCents`, `distributionDeductionsCents`, country facts, experience and deferred-interest evidence.
- `CinemaMarketState`: schema/tuning versions, last committed absolute week and fingerprint, active title/cohort seen bands, compact affinity/familiarity/deferred state, and settled title facts. Keep bounded active detail and archive summaries.
- `CinemaLedger`: immutable historical opening balances plus deduplicated production, marketing, booking/localization, theater, soundtrack, streaming, financing and signed participation entries.
- `CinemaGrossSplit` and `CinemaFinanceSummary`: exact split totals; distinct public gross, producer receipts, paid costs, distributable profit and actor earnings.
- `CinemaExposureInput`, `CinemaExposureResult`, `CinemaKnownInputs`, `CinemaChoiceRequest`, `CinemaSupplyQuote`, `CinemaMigrationResult`, `CinemaCommitResult`, `CinemaPresentation`, `CinemaForecast`, `CinemaRightsValueInput`, `CinemaRightsQuote`: payloads owned by Tasks 4–10, named here so their boundaries remain stable.

The fixture module exports `makeCinemaFixture(variant: CinemaScenarioId, seed?: number): CinemaFixture`. `CinemaFixture` contains `player: Player`, `project: ProjectDetails`, `input: CinemaWeekInput`, `known: CinemaKnownInputs` and `rightsValueInput: CinemaRightsValueInput`. Export `CINEMA_SCENARIOS: readonly CinemaScenarioId[]`. Include variants named in the tests below; scenario-specific inputs belong in the fixture, not hidden audit side effects.

Audit invocation throughout this plan is `node scripts/run-box-office-audit.mjs <suite>`. The runner maps `<suite>` to `scripts/audit-box-office-<suite>.ts`, bundles it with installed esbuild, CSV as text, and executes a unique `/private/tmp` ESM bundle. Reject unknown suites; propagate nonzero exit status. It does not edit game data, source, old audit results or a real save.

Candidate calculations are explicit tuning inputs, not claims of real-world calibration:

~~~ts
// A and N describe a title/cohort's people; impressions are qualified exposure.
const nextAware = A + (N - A) * (1 - Math.exp(-qualifiedImpressions / Math.max(1, N)));
// Positive reach requires a real source. Capacity is absent from this equation.
const newGrossCents = paidAdmissions * ticketPriceCents;
const producerReceiptsCents = newGrossCents - exhibitorReceiptsCents - distributionDeductionsCents;
~~~

Deduplicate exposure source IDs and credited people before calculating incremental reach. Recognition/favorite overlap uses bounded cohort segments; never add follower counts. Choice retains an outside option and uses stable allocation/remainders. Apply shared money/time and seats jointly to first and repeat requests. One complete allocation is computed before any owner receives cash.

## Phase 1 — Repair the inputs and financial truth

### Task 1: Canonical identity and defect fixtures

**Files:** create types/profiles/inputs modules, fixture module, runner and `scripts/audit-box-office-inputs.ts`; modify `characterIdentityLogic.ts`, accepted-offer paths in `MobilePage.tsx`, `gameLoop.ts` cast normalization, `universeLogic.ts` and `npcLogic.ts`; register focused audit scripts in `package.json`.

**Interfaces:** produce `normalizeCinemaTitle(input: { titleId: string; owner: CinemaOwnerRef; project: ProjectDetails; player: Player }): CinemaTitleInput`. Produce the shared types and fixture/runner contracts above. Actor input IDs are normalized once; no implicit player fame if the player is not credited.

- [x] Capture the baseline manifest and add fixtures for a $210M accepted lead role, complete ensemble, singleton legacy cast, `actorId`/`npcId` duplicates, no-player credit and a universe offer with a known template owner.
- [x] Write the failing assertions before the repair:

~~~ts
const f = makeCinemaFixture('accepted-universe-offer', 21);
const title = normalizeCinemaTitle({ titleId: f.input.titles[0].id,
  owner: f.input.titles[0].owner, project: f.project, player: f.player });
assert.equal(title.cast.filter(c => c.personId === 'PLAYER_SELF').length, 1);
assert.ok(title.cast.filter(c => c.roleWeight > 0).length > 1);
assert.equal(title.owner.id, f.project.studioId);
assert.equal(new Set(title.cast.map(c => c.personId)).size, title.cast.length);
~~~

- [x] Run `node scripts/run-box-office-audit.mjs inputs`; confirm a substantive assertion fails against the old normalization, not just a missing fixture or import. Record the old handoff's missing ensemble and owner mismatch.
- [x] Repair offer construction/acceptance so the player's credit merges with the actual package; a legacy singleton receives a deterministic missing-package reconstruction, not a second player or invented high-quality superstar cast. Carry template studio ownership explicitly. Normalize both cast ID fields and reject duplicate fame contribution.
- [x] Run the inputs suite and `npm run audit:studio-ai-commercial-result-b6`; inspect the actual accepted-offer handoff once. Expected: unique correct identities/owner, preserved player role/pay and no dummy co-stars counted as new population.
- [x] Review owned hunks and checkpoint as `fix: normalize theatrical package identities`.

### Task 2: Continuous production inputs and meaningful quality

**Files:** create `boxOfficeDelivery.ts`; modify `greenlightCalculations.ts`, `greenlightProjectBuilder.ts`, `studioProductionEconomy.ts`, `roleLogic.ts` and `productionRisk.ts` only at the canonical input boundaries; create `scripts/audit-box-office-delivery.ts`.

**Interfaces:** produce `buildCinemaDeliveryInput(project: ProjectDetails): CinemaTitleInput['delivery']`. The delivery payload contains `estimatedQuality`, optional `deliveredQuality`, craft/fit contributions and expectation inputs, each with explicit ranges. The cohort-aware `evaluateCinemaExperience` consumer is implemented with Task 5, independent of revenue/budget ROI; Phase 1 provides delivered/estimated craft facts without unused audience scaffolding.

- [x] Add fixed craft 70/equipment 0-versus-10, script/cast fit, weak execution, and $120M/$120M+1 cases. Document candidate contribution ranges in `boxOfficeProfiles.ts`; retain named budget tiers only for production categorization.
- [x] Write and run the regression assertions:

~~~ts
const f = makeCinemaFixture('ordinary-craft-max-equipment', 11);
const delivery = buildCinemaDeliveryInput(f.project);
assert.ok(delivery.estimatedQuality < 100);
const bumped = structuredClone(f.project);
bumped.estimatedBudget = (bumped.estimatedBudget ?? 0) + 1;
const next = buildCinemaDeliveryInput(bumped);
assert.ok(Math.abs(next.estimatedQuality - delivery.estimatedQuality) < 0.01);
~~~

Run `node scripts/run-box-office-audit.mjs delivery`; expected old behavior exposes the quality saturation or budget discontinuity, then the repaired suite passes.

- [x] Replace additive equipment inflation with bounded diminishing contributions; preserve script, acting, direction, crew, location/fit and realized execution. Normalize offer and player-production budgets consistently without a ticket multiplier at a tier boundary.
- [x] Provide separate delivered/estimated craft facts for Task 5's cohort-fit/expectation experience consumer. Do not add `buildAudienceReception`'s gross/budget proof as a new causal satisfaction input. Existing audience shortcuts and numerical IMDb scoring remain on the compatibility route until the corresponding consumer switches.
- [x] Run `npm run audit:greenlight-calculations` and `npm run audit:studio-production-economy`. Update assertions that intentionally encode superseded tier cliffs only with explicit before/after evidence; do not weaken unrelated guards.
- [x] Checkpoint as `fix: make film delivery inputs continuous`.

### Task 3: Realized gross, costs and one financial ledger

**Files:** create `boxOfficeSettlement.ts` finance functions and `scripts/audit-box-office-finance.ts`; modify cap-headroom handling in `gameLoop.ts`, `distributionRevenue.ts`, `businessLogic.ts` and archive totals at their finance boundaries.

**Interfaces:** produce `splitRealizedCinemaGross(input: { grossCents: number; exhibitorBasisPoints: number; distributionBasisPoints: number }): CinemaGrossSplit` and `summarizeCinemaFinance(ledger: CinemaLedger): CinemaFinanceSummary`. Later Task 8 adds live commit to this same module.

- [x] Reproduce cap-headroom overpayment and hybrid theater/streaming omission. Trace actual marketing/reserve debits and refunds and distinguish the unpaid booking quote. Finance adapters read paid facts without new debits. Live release-confirmation retries and one-time booking charges are verified with the new transaction in Tasks 6/8.
- [x] Write the exact reconciliation test:

~~~ts
const split = splitRealizedCinemaGross({ grossCents: 10001,
  exhibitorBasisPoints: 4700, distributionBasisPoints: 500 });
assert.equal(split.grossCents, split.producerReceiptsCents
  + split.exhibitorReceiptsCents + split.distributionDeductionsCents);
assert.ok(Object.values(split).every(Number.isSafeInteger));
~~~

- [x] Run `node scripts/run-box-office-audit.mjs finance`; first fail the old final-gross reapplication scenario, then implement splitting **realized** gross without another demand/distribution modifier. Existing legacy caps may remain until v1 activation; their clipped receipts must still reconcile.
- [x] Add pure-ledger cases for production/marketing/explicitly paid booking/localization, actor fee/backend, investor payout, combined media income, duplicate cost events and distinct currency adapters. Assert 100 cents/dollar and 100,000,000 cents/million. Preserve receipt gaps through migration and actual weekly/archive paths. Owned-exhibitor consolidation and live advance/deposit posting stay with supply/settlement Tasks 6/8.
- [x] Keep public gross rank separate from financial success and use canonical cost/receipt facts for current financial reports. Preserve signed participation bases. Activate outcome/reward policies and remaining commercial badges together in Tasks 8/9, after all owner routes consume committed shared-market facts; do not rebalance one legacy career route in isolation.
- [x] Run finance, `npm run audit:distribution-revenue` and the actual loop cap fixture. Expected: no receipt sum above ticket gross, no duplicated cost or hybrid income loss. Checkpoint as `fix: reconcile theatrical gross and settled costs`.

**Phase 1 gate:** all source-traced defect cases covered; historical receipts/pay/rights remain intact. Do not tune hit probability to compensate for broken inputs.

**Phase 1 execution:** implemented against recovery checkpoint `f693fd2`; see [evidence and dependency decisions](../../reports/2026-10-22-box-office-phase1/README.md). The new audience/market/save-schema contracts are introduced with their owning consumers in later phases.

## Phase 2 — Recognition, real awareness and honest Greenlight inputs

### Task 4: Exposure model and forecast-safe knowledge

**Files:** create `boxOfficeAwareness.ts` and `scripts/audit-box-office-awareness.ts`; extend types/profiles/fixtures. Prepare adapters in Greenlight builder and film campaign/promotion handlers; UI replacement occurs in Task 9.

**Interfaces:** produce `buildCinemaExposure(input: CinemaExposureInput): CinemaExposureResult` and `projectCinemaForecastInput(input: CinemaWeekInput, known: CinemaKnownInputs): CinemaWeekInput`. Exposure input carries bounded cohort recognition/history and dated, identified paid/organic/local source events; output carries attention potential, aware counts and source attribution. `CinemaKnownInputs` carries visible package data and quality ranges, excluding hidden final quality.

- [ ] Add fixtures `wide-unknown`, `narrow-unknown`, `two-stars-weak`, `healthy-new-studio`, repeated campaign source IDs and overlapping fans. Keep cohort awareness/interest identical in wide/narrow fixtures; their capacity is non-binding.
- [ ] Write the leakage and exposure assertions:

~~~ts
const f = makeCinemaFixture('wide-unknown', 8);
const a = projectCinemaForecastInput(f.input, f.known);
const changed = structuredClone(f.input);
changed.titles[0].delivery.deliveredQuality = 5;
const b = projectCinemaForecastInput(changed, f.known);
assert.deepEqual(a, b);
assert.equal(a.knowledge, 'FORECAST');
~~~

- [ ] Run `node scripts/run-box-office-audit.mjs awareness`; confirm missing separation fails, then add fame/tier recognition, role-weighted deduplication and earned favorite/studio trust. New-studio brand health cannot seed established global recognition. Streaming brand is a channel/access signal, not ticket buyers.
- [ ] Implement the qualified-impression saturation rule in the shared contracts. Actor recognition can produce organic exposure with zero paid spend. Local cinema discovery uses bounded real footfall; screen count is never direct worldwide awareness. Keep paid/organic channel overlap and one event/one application.
- [ ] Persist exposure events only on real announcements/promotions/spend commitments. Greenlight private previews are read-only. Replace raw buzz inputs with attention potential, current country awareness and forecast intent fields; retain a migration reader for old raw hype, with estimated-source labeling rather than 100% awareness.
- [ ] Verify no-budget marketing, marketing saturation, duplicate sources, cameo versus lead and misleading expectations. Run `npm run audit:streaming-launch-marketing-forecast` and `npm run audit:streaming-launch-marketing-lifecycle` to ensure reuse did not alter platform economics. Checkpoint as `feat: model film awareness from actual exposure`.

**Phase 2 gate:** worldwide footprint does not mint awareness; all three readings have distinct units and source truth. No hidden-quality leakage or repeated fame payout.

## Phase 3 — Build the market in shadow

### Task 5: Audience choices, favorites, repeats and universe history

**Files:** create `boxOfficeAudience.ts` and `scripts/audit-box-office-audience.ts`; adapt existing persona fit, fandom, novelty, universe blueprint and rights availability; optional unchanged genre-table extraction as described above.

**Interfaces:** produce `buildCinemaChoices(input: CinemaWeekInput): CinemaChoiceRequest[]`. Requests have `kind: FIRST | REPEAT | DEFER`, `cohortId`, `titleId`, `requestedAdmissions`, utility, price/time requirements and experience signals. Deferred requests carry interest counts and never request a paid admission. They are requests before shared allocation, not paid admissions. Define bounded seen bands and compact affinity updates in `CinemaMarketState`.

- [ ] Add `earned-event`, `unearned-event`, `streaming-wait`, `no-streaming-deal`, `satisfied-repeat`, `weak-repeat`, `indie-discovery`, `no-exposure` and `overlapping-favorites` fixtures.
- [ ] Write and run first/repeat/defer cases with actual code:

~~~ts
const f = makeCinemaFixture('satisfied-repeat', 13);
const requests = buildCinemaChoices(f.input);
assert.ok(requests.some(r => r.kind === 'REPEAT' && r.requestedAdmissions > 0));
assert.ok(requests.every(r => r.requestedAdmissions >= 0));
const unknown = makeCinemaFixture('no-exposure', 13);
assert.equal(buildCinemaChoices(unknown.input)
  .filter(r => r.kind === 'FIRST').reduce((n, r) => n + r.requestedAdmissions, 0), 0);
~~~

- [ ] Run `node scripts/run-box-office-audit.mjs audience`; implement awareness-gated first intent and satisfaction/attachment-based repeat intent with declining recent-repeat propensity. Every paid repeat later requires a fresh seat, money and time. Repeat requests never increase the unique-viewer pool.
- [ ] Build favorites from delivered experience and relevant roles; use bounded overlapping cohort segments for actor/studio/franchise attachment. Apply fatigue once. Seed recognition conservatively when old histories are absent.
- [ ] Connect universe familiarity to actual earlier theater/streaming exposure and satisfaction, meaningful returning roles/payoff, accessibility and cadence. The blueprint helper is not currently proven wired; explicitly connect canonical player/NPC history rather than treating existing tests as integration proof. Do not impose a universal precursor-film count.
- [ ] Add waiting/skip alternatives based on affordability, urgency, travel/time and known streaming windows. Deferred intent decays, reserves no money and cannot bypass future country rights, entitlement, readiness or platform capacity. Catch-up uses actual viewing, not catalogue presence.
- [ ] Implement word of mouth from satisfied exposed people to bounded net-new reachable contacts, with overlap/language/local fit and timing. High quality with no exposure cannot recruit an informed worldwide audience immediately.
- [ ] Run audience and existing universe-blueprint, fandom state/formation, novelty and WE6 viewing audits if those shared files changed. Checkpoint as `feat: model cinema audience history and choices`.

### Task 6: Country pricing, shared shows and bounded allocation

**Files:** create `boxOfficeSupply.ts`, `boxOfficeMarket.ts`, `scripts/audit-box-office-market.ts`; extend types/profiles/fixtures. Read world population/cohorts/participation, country registry and existing distribution chain terms.

**Interfaces:** produce `quoteCinemaSupply(input: CinemaWeekInput): CinemaSupplyQuote` and `simulateCinemaWeek(input: CinemaWeekInput): CinemaWeekResult`. Supply quote gives per-country/chain/format automatic price and feasible shared capacity/cost terms. The result includes compact next-state and complete audit totals; simulation never mutates Player, world, wallets or real ledgers.

- [ ] Add scarce-seat, scarce-wallet, low-access/language, runtime, saturated-market, costly-wide-release and non-binding-capacity fixtures. Map current region/chain inputs to country supply with explicit weights; optional location IDs support future cities.
- [ ] Write the key loophole and determinism tests:

~~~ts
const narrow = makeCinemaFixture('narrow-unknown', 41);
const wide = makeCinemaFixture('wide-unknown', 41);
const a = simulateCinemaWeek(narrow.input);
const b = simulateCinemaWeek(wide.input);
assert.equal(a.titles[0].firstAdmissions, b.titles[0].firstAdmissions);
assert.equal(a.titles[0].repeatAdmissions, b.titles[0].repeatAdmissions);
const reordered = { ...structuredClone(wide.input), titles: [...wide.input.titles].reverse() };
assert.deepEqual(simulateCinemaWeek(reordered), b);
assert.deepEqual(wide.input, makeCinemaFixture('wide-unknown', 41).input);
~~~

- [ ] Run `node scripts/run-box-office-audit.mjs market`; implement automatic prices from country economy/calendar + chain/format terms. Derive seats from shared screens, runtime/turnaround, opening time and days, without granting every title a chain's full footprint. Candidate supply constants have explicit units in the profile.
- [ ] Allocate all title/cohort first and repeat requests jointly. Stable ordering and keyed draws prevent player/NPC iteration preference. Respect participation's cinema budget, leisure time and seat capacities. Retain unspent budgets/outside choice; do not silently transfer the streaming allocation.
- [ ] Use exact integer remainders and `splitRealizedCinemaGross`. Assert first views <= reachable unseen population, paid repeats <= eligible seen demand, total spending <= cohort wallet, no negative time, booked seats <= supply, and all gross splits exact.
- [ ] Implement natural country/chain holds, reallocation and ends with bounded discovery grace for credible local/sleeper runs. New local exposure has its own bounded source; access by itself never mints intent. Remove new-model fixed opening/lifetime dollar caps and prior-final-gross multiplier recurrence.
- [ ] Expose a test-only shadow invocation that records diagnostics without cash, career consequences or persisted audience changes. Run market plus WE1/WE2/WE3 and shared streaming-budget audits. Checkpoint as `feat: simulate shared cinema market in shadow`.

**Phase 3 gate:** physical, population, money and time invariants pass across owner routes; no shadow payouts. A $50M film may legitimately reach $500M but cannot get it merely by selecting worldwide chains.

## Phase 4 — Migrate and connect one live weekly settlement

### Task 7: Versioned state and existing-save transition

**Files:** create `boxOfficeMigration.ts`, `scripts/audit-box-office-migration.ts`; extend `WorldState`/project result fields in `types.ts` and existing canonical state validation. Preserve `saveGenerations.ts` behavior.

**Interfaces:** produce `migrateCinemaState(player: Player, absoluteWeek: number): CinemaMigrationResult`, returning a candidate player and structured diagnostics. Use schema version 1 plus an independent tuning version. Missing/old known schema migrates once; unsupported future schema is recoverably rejected without overwriting the save.

- [ ] Add absent, partial, old active release, fully settled NPC, negative/NaN-corrupt input, reload and future-schema fixtures. Distinguish `UNSETTLED_WEEKLY`, `LEGACY_ACTIVE` and `LEGACY_FULLY_SETTLED` settlement bases.
- [ ] Write and run the preservation test:

~~~ts
const f = makeCinemaFixture('legacy-active-save', 3);
const moneyBefore = f.player.money;
const grossBefore = f.player.activeReleases.map(r => r.totalGross);
const migrated = migrateCinemaState(f.player, f.input.absoluteWeek);
assert.equal(migrated.player.money, moneyBefore);
assert.deepEqual(migrated.player.activeReleases.map(r => r.totalGross), grossBefore);
assert.deepEqual(migrateCinemaState(migrated.player, f.input.absoluteWeek).player,
  migrated.player);
~~~

- [ ] Run `node scripts/run-box-office-audit.mjs migration`; implement the spec's next-unprocessed-week transition. Estimate old active seen history conservatively from known gross/footprint/prices, cap it to population, mark `LEGACY_ESTIMATE` and pay none of it. Begin tracked v1 attendance at activation.
- [ ] Preserve historical costs, receipts and signed deals. Exclude fully settled legacy NPC lifetime results from new ticket/cash settlement; keep any old synthetic chart history identified as legacy. NPC projects not yet settled enter the weekly engine.
- [ ] Bound active histories, retire closed title/cohort detail into summaries and retain compact affinity/universe aggregates. Persist exact committed result versions/fingerprint and the last week. Do not store every cohort/title/week matrix indefinitely.
- [ ] Test JSON roundtrip, double migration, unsupported schema diagnostic, old signed streaming deal and save fallback/recovery. Expected: no historic money/gross change, no duplicate title or payout, explicit estimated audience labels. Checkpoint as `feat: migrate cinema market state safely`.

### Task 8: One week, all owners, one settlement

**Files:** create `boxOfficeWeek.ts`, `scripts/audit-box-office-integration.ts`; extend settlement with live commit; modify `gameLoop.ts`, `studioAiCommercialResult.ts`, `studioAiWeek.ts`, `businessLogic.ts`, `theatricalRunLogic.ts`, `roleLogic.ts` adapters and event/reward consumers.

**Interfaces:** produce `buildCinemaWeekInput(player: Player, absoluteWeek: number): CinemaWeekInput`, `commitCinemaWeek(player: Player, result: CinemaWeekResult): CinemaCommitResult` and `processCinemaMarketWeek(player: Player, absoluteWeek: number): { player: Player; result: CinemaWeekResult }`. The commit result includes `applied: boolean`; replay returns `false`, same week/different fingerprint refuses a second settlement.

- [ ] Trace order: theater currently executes before world normalization. Prepare one target-week world snapshot before any owner cinema allocation; avoid an unrelated full week-loop reorder. Collect the entire eligible slate before simulating once.
- [ ] Write exactly-once assertions:

~~~ts
const f = makeCinemaFixture('mixed-owner-slate', 23);
const result = simulateCinemaWeek(f.input);
const once = commitCinemaWeek(f.player, result);
const twice = commitCinemaWeek(once.player, result);
assert.equal(once.applied, true);
assert.equal(twice.applied, false);
assert.deepEqual(twice.player, once.player);
~~~

- [ ] Run `node scripts/run-box-office-audit.mjs integration`; route accepted roles, player studios and unsettled NPC studios through the same input/kernel/result. Retire the NPC one-shot lifetime payout for new weekly titles and synthetic competing revenue calculation. Charts consume committed results.
- [ ] Settle ticket shares, actual due cost events, contract/actor/investor amounts, cash and summaries once in the candidate state. Preserve processed-week/save persistence order and crash recovery. No display component computes cash. Owner changes use canonical rights and the existing signed contract, not a copied second title.
- [ ] Feed career outcomes/media/awards/rewards from the same committed facts; distinguish financial return from actor performance and audience fit. An offered-role actor cannot inherit the entire producer loss as an unexplained career penalty.
- [ ] Test real `processGameWeek` using the mixed-owner fixture, release confirmation retries, title exit, same-week replay, reload, changed project ordering and ownership transfer. Inspect saved receipts/costs, not only formula results. Then rerun Phase 1 suites and current shared world-budget audits.
- [ ] Checkpoint as `feat: settle cinema market once per world week`.

**Phase 4 gate:** actual week-loop and persistence paths prove one result/payment. Historical NPC curves are not represented as newly paid v1 attendance.

## Phase 5 — Connect the player experience and later rights value

### Task 9: Shared Greenlight/release forecast and audience/finance surfaces

**Files:** create `boxOfficeForecast.ts`, `boxOfficePresentation.ts`, `scripts/audit-box-office-presentation.ts`; modify Greenlight wizard/calculations/builder, release wizard, `ProjectDashboardModal.tsx`, `BoxOfficeApp.tsx`, IMDb audience panel and reception adapter. Add focused QA fixture under `lab/` following existing lab patterns.

**Interfaces:** produce `forecastCinemaWeek(input: CinemaWeekInput, known: CinemaKnownInputs): CinemaForecast` and `toCinemaPresentation(result: CinemaWeekResult, titleId: string): CinemaPresentation`. Forecast returns explicit low/mid/high scenarios and driver/cost/attendance ranges, not a promised payout. Presentation returns gross, receipts, costs, unique/repeat counts, evidence confidence and audience tags from committed facts.

- [ ] Write forecast purity and finance consistency assertions:

~~~ts
const f = makeCinemaFixture('targeted-indie', 17);
const before = structuredClone(f.input);
const forecast = forecastCinemaWeek(f.input, f.known);
assert.deepEqual(f.input, before);
assert.ok(forecast.openingGrossCents.low <= forecast.openingGrossCents.mid);
assert.ok(forecast.openingGrossCents.mid <= forecast.openingGrossCents.high);
const live = simulateCinemaWeek(f.input);
const card = toCinemaPresentation(live, live.titles[0].titleId);
assert.equal(card.grossCents, live.titles[0].grossCents);
~~~

- [ ] Run `node scripts/run-box-office-audit.mjs presentation`; call forecast-safe projection plus the same kernel for bounded uncertainty scenarios. Greenlight uses visible estimated delivery and rough future competition uncertainty; release preview uses current footprint, campaign, costs and country prices. Complete identical inputs must produce identical kernel allocations.
- [ ] Remove independent budget × screen/region/distribution demand math from `distributionDealSummary` and inherited raw-hype/fame preview shortcuts. Show attention potential, awareness by market and intent ranges. Show credible capacity constraints, booking/marketing costs and break-even admissions before commitments.
- [ ] Use one finance presenter for theater gross, receipts, cost recovery/profit and actor pay. Sum legitimate hybrid media income while preserving separate categories. Historical estimated unique counts must carry a clear label; observed repeat labels require settled evidence.
- [ ] Add IMDb audience insights: strong theater interest, paid repeat interest, growing word of mouth, franchise appeal, home-viewing appeal/waiting. Apply minimum evidence/confidence rules. Never equate home preference with bad quality; tags summarize behavior and are not extra demand multipliers. Leave numerical IMDb/series redesign outside scope.
- [ ] Verify normal taps: Greenlight → production → campaign → region/chain selection → confirm → week advancement → weekly box office → detail/IMDb → theater exit. Check narrow mobile layout and English/localization behavior; do not replace the frozen baseline.
- [ ] Checkpoint as `feat: show consistent cinema forecasts and audience facts`.

### Task 10: Rights-aware streaming handoff and buyer economics

**Files:** create `boxOfficeRightsValue.ts`, `scripts/audit-box-office-rights.ts`; trace/modify current post-theater streaming bid producers and consumers in `gameLoop.ts`, `roleLogic.ts` and streaming rights/availability adapters. Record exact changed caller paths in the task checkpoint manifest.

**Interfaces:** produce `valueCinemaStreamingRights(input: CinemaRightsValueInput): CinemaRightsQuote`. Inputs include country/window rights, reachable incremental households/viewing, overlap, signed obligations, buyer resources and scenario uncertainty. Output is an affordable buyer-specific bid range with value drivers; it creates no cash or entitlement itself.

- [ ] Add expensive low-demand title, strong local sleeper, exhausted/overlapping audience, no streaming rights, already-signed deal, deferred interest and low-resource buyer cases.
- [ ] Write the offer eligibility/affordability assertions:

~~~ts
const f = makeCinemaFixture('no-streaming-rights', 29);
const quote = valueCinemaStreamingRights(f.rightsValueInput);
assert.equal(quote.eligible, false);
assert.equal(quote.maximumBidCents, 0);
~~~

- [ ] Run `node scripts/run-box-office-audit.mjs rights`; replace automatic budget floors/theater-success multiples with buyer-specific incremental value and risk. Demand evidence may support a high bid, but cannot guarantee an oversized second reward. Keep signed deals unchanged.
- [ ] Route deferred/catch-up interest through actual readiness, premiere, country, language, entitlement and viewing rules. A waiting audience is not an instant subscription, guaranteed stream or cinema-equivalent payment. Subscription repeat starts do not become extra ticket cash.
- [ ] Prove signed settlement happens once and availability begins at the real date. When those adapters change, run `npm run audit:streaming-rights-transactions-phase6`, `npm run audit:streaming-rights-calendar-phase4`, `npm run audit:streaming-original-readiness-repair` and `npm run audit:streaming-original-playback-repair`. Checkpoint as `feat: value film streaming rights from incremental demand`.

**Phase 5 gate:** normal player choices and reports use the same source as money. Theater balancing is not undone by guaranteed post-theater bids.

## Phase 6 — Calibrate, profile and verify the complete journey

### Task 11: Conditional balance, old saves and measured performance

**Files:** extend fixture scenarios; create `scripts/audit-box-office-calibration.ts`, `scripts/audit-box-office-long-save.ts`, `scripts/benchmark-box-office-week.ts`; save new results under `docs/reports/2026-10-22-box-office-revamp/` with versions/seed/manifests; tune only `boxOfficeProfiles.ts` when evidence supports it.

**Interfaces:** consume `simulateCinemaWeek`, `processCinemaMarketWeek`, `forecastCinemaWeek`, actual `processGameWeek` and the existing save roundtrip. Export no new gameplay API. Audit outputs identify whether they measure a pure formula, real week integration, browser UI or actual device.

- [ ] Define 24 contrasted scenario variants: no-exposure indie; targeted indie; local-language success; weak film/wide no campaign; weak film/two stars; strong film/two stars; paid campaign saturation; misleading campaign; meaningful lead versus cameo; overlapping favorites; healthy new studio; earned crossover; unearned crossover; continuity fatigue; streaming catch-up; short known streaming window; no streaming deal; high-price low-income market; recession; limited-seat bottleneck; saturated competition; satisfied repeat; late word-of-mouth sleeper; extreme demand beyond legacy $3B.
- [ ] Run each at 32 fixed seeds (768 conditional runs). Enforce hard invariants on every run and compare matched seed pairs for expected tendencies. Report distributions of gross, receipts, profit, attendance/unique/repeats, awareness, budget usage, run duration, forecast coverage and rights value. Do not impose a universal hit/flop quota or hard gross target.
- [ ] Include the mandatory anti-loophole test:

~~~ts
for (let seed = 0; seed < 32; seed += 1) {
  const narrow = simulateCinemaWeek(makeCinemaFixture('narrow-unknown', seed).input);
  const wide = simulateCinemaWeek(makeCinemaFixture('wide-unknown', seed).input);
  assert.equal(narrow.titles[0].grossCents, wide.titles[0].grossCents);
}
~~~

- [ ] Run `node scripts/run-box-office-audit.mjs calibration`; adjust one documented parameter family at a time, retaining prior output for comparison. Hard constraints must hold exactly; qualitative outcome tendencies are judged across the matched seed distribution, not forced every single run. The extreme-demand case must prove no artificial monetary exit while demand remains viable.
- [ ] Run at least 104 actual game weeks across founder/small studio, established studio, offered-universe actor and legacy-active saves. Include save/reload at opening, paid repeat weeks, theater exit and streaming handoff, plus a crash/retry at commit. Separate prepared-rich fixtures from an ordinary self-funded career; complete at least one ordinary career production/campaign/release path without injected money.
- [ ] Measure the same fixed early/late saves before/after: week compute, persistence, total event-to-paint, market module, serialized state size and allocations. Candidate rollout gate is <=10% p95 total-week regression on the same environment with no durability shortcut; if baseline is unstable, report inconclusive and profile, rather than declaring a pass. Measure mobile/actual-device interaction before claiming device readiness.
- [ ] Run new suites, affected existing audits, `npm run lint` and `npm run build`. If unrelated baseline failures exist, record their exact baseline and diff ownership; do not conceal them or label the whole project green. Run localization comparison against the frozen baseline if visible strings changed.
- [ ] Verify all spec sections map to tasks, all implementation toggles use schema/tuning compatibility, no shadow money path is enabled and old payout routes cannot run for v1 titles. Review complete diff and resulting saved facts.
- [ ] Save a release verification matrix with measured/passed, failed and untested rows. Checkpoint as `test: verify shared box office economy and progression`. Enable the normal v1 path only after the gates pass; shipping remains a separate release action.

## Coverage and completion checklist

| Requirement | Owning tasks |
|---|---|
| Accepted-cast, cast ID, universe owner and budget/quality defects | 1, 2 |
| Exact gross/costs, hybrid reporting, actor/investor rights | 3, 8, 9 |
| Fame/stature, studio/platform signals and no free worldwide awareness | 4, 5, 6 |
| Greenlight attention/awareness/intent and shared safe forecasts | 4, 9 |
| Paid repeats, favorites, waiting, discovery and earned events | 5, 6, 10 |
| Population/economy, automatic country prices, shared time/money/shows | 6, 8 |
| All owner routes, natural run, no fixed cap, deterministic settlement | 6, 8 |
| Existing saves, historical facts and already-paid NPC safeguards | 7, 8 |
| IMDb audience insights, fair financial verdicts | 9 |
| Streaming bids/rights/catch-up with no duplicate money | 10 |
| Cinema-chain foundation and vertical ownership | 3, 6, 8 |
| Loophole matrix, normal career/UI, durability, localization/performance | 11 and each phase gate |

Completion means the gates are evidenced, not merely that these files exist. Phase 1 has source-traced regression and integration evidence. Later proposed audience-market outcomes, fairness distributions and performance targets remain unverified until their phase gates run.
