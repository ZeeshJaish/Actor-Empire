# Actor Empire Player Stability and Performance Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task by task, with review and verification between independently testable changes. Checkboxes record future implementation; this audit does not implement fixes.

**Goal:** Resolve the workbook's player-facing defects while preserving fast interaction, existing careers, earned rewards, purchases, and streaming functionality.

**Architecture:** Keep critical gameplay code ready before interaction. Separate canonical game updates, UI rendering, persistence, and diagnostics. Preserve transactional weekly progression and durable financial grants while reducing repeated work and bounding the active working set.

**Tech stack:** React 19, TypeScript, Vite, Capacitor Android/iOS, IndexedDB, Firebase, AdMob, native Google Play Billing and StoreKit integrations.

**Spec:** The user's request in this chat: inspect the repository and Oct 15 workbook, evaluate the supplied Claude analysis, and propose a scalable plan without reintroducing code loading on button clicks. Workbook: `/Users/zeesh/Downloads/Actor Empire Analytics — Oct 15, 2026.xlsx`, latest register `Issues Oct15!A8:J32`. The historical `Issue Register` supplies additional symptoms; it does not override the newer evidence.

## Global constraints

- This deliverable is analysis and planning. No gameplay, save format, native bundle, production setting, purchase, or release is changed by this audit.
- Preserve existing careers, ownership, cash, energy, contracts, histories, awarded results, and pending reward receipts. Never require a reinstall/new career as a repair.
- Do not introduce first-tap loading for core navigation, modal actions, or Next Week. Measure cold first use as well as repeated taps.
- Never trade silent progress loss, duplicate economic effects, or erased history for speed.
- Give immediate interaction feedback. Background autosave is not a substitute for durable critical transactions.
- Treat workbook reports, source-confirmed mechanisms, synthetic reproductions, and real-device diagnoses as different evidence levels.
- Performance budgets below are proposed release gates, not achieved results or universal guarantees.
- Preserve unrelated work and re-inventory the checkout before implementation. No automatic commit, push, deployment, or store submission is included.

## Audit baseline and verified corrections

The final source baseline was `a635371` on `main`. The checkout initially contained auction changes; an external activity committed them during this audit. The audit did not perform that commit. Git was clean before this plan file was added. Rebase the investigation if source changes again.

| Supplied claim | Current evidence and consequence |
| --- | --- |
| Core screens and week engine load when tapped | Current `App.tsx:15-31` imports them statically. Keep that behavior. Existing native web assets contain different, split bundles; test the packaged artifact separately. |
| About 2,500 native calls every week | Repeated native publishing exists in `services/gameLoop.ts:1560-1577` and `services/firebaseService.ts:902-903,1015`. Some boundary suppression already exists. Instrument exact calls rather than accepting the arithmetic as measured. |
| Every UI update runs migration | `services/playerUiState.ts:20-35` has separate external, processed-week, and trusted-market paths. External component updates still trigger full migration; do not replace every call blindly. |
| Touch blur needs disabling in 199 places | `index.html:50-64` already disables these effects for coarse-pointer devices. Profile the remaining GPU/layer work before further visual changes. |
| One failing test loses two of three release runs | `npm run audit:streaming-release-runs` passed in this audit. Keep the regression test; investigate any different failing fixture before calling this an open defect. |
| Producer-only shows always cancel because missing role produces NaN | A raw missing-role calculation can produce NaN, but the current weekly path normalizes a missing role to `MINOR` (`gameLoop.ts:1205-1208,1687`). The blanket failure was not reproduced. Legacy invalid values and nonactor semantics still need testing. |
| Dividends stop entirely after year one | A targeted two-year probe paid four times in year one, then only once late in year two. The defect concerns the calendar marker, not a universal complete stop. |
| VerifyError means modified/cloned devices | Unproven. AE-017 and AE-018 remain active crash investigations. |
| iOS purchase telemetry is absent | StoreKit already calls native transaction analytics with deduplication. Reconcile delivery and analytics separately. |
| Optional symbol count means that many unprocessed crashes | Latest workbook explicitly distinguishes optional missing symbols from unprocessed crashes. Match UUIDs against the actual released binary. |

### Checks actually run

- `npm run lint`: passed (TypeScript with no emit).
- `npm run audit:save-integrity`: passed.
- `npm run audit:save-migration`: passed.
- `npm run audit:streaming-release-runs`: passed.
- `npm run audit:reported-bug-regressions`: passed.
- `npm run audit:late-game-week-performance`: failed in its first worker. Twenty measured weeks advanced successfully; total p50 was 1095.45 ms, p95 1324.49 ms, maximum 1451.86 ms. Final serialized state was 42,066,839 bytes. Final Node heap reading was 533.98 MiB, not a device peak-memory measurement.

The performance fixture is synthetic, mature, and age 82. It is not evidence that a normal nine-year player save is 42 MB. Its timing excludes actual verified persistence, IndexedDB, the App callback's diagnostics, native bridge transport, React painting, and GPU work. The wrapper stopped before its three-run median. Its legacy comparison also adds synthetic overhead; it is not a benchmark of a historical shipped binary. Log: `/tmp/actor-empire-a635371-late-game-perf.log`.

A temporary source harness also reproduced life-event callback loss, an Emmy invite-week eligibility mismatch, stock ceiling behavior under persistent success, and inconsistent second-year dividends. These establish mechanisms in selected fixtures, not the cause of every production report. No physical-device or store-build validation was performed.

## Implementation sequence

### Task 1: Freeze the evidence and establish reproducible gates

**Files:** existing `scripts/audit-save-migration.ts`, `scripts/audit-late-game-week-performance.ts`, `scripts/run-late-game-week-performance.mjs`, `scripts/fixtures/lateGameWeekPerformanceFixture.ts`, `package.json`; new focused regression fixtures and a `scripts/release-gate.mjs` orchestrator.

- [ ] Record source commit, dependency lock, native versions, build identifiers, fixture identity, and packaged web hashes. Preserve any current dirty work using a patch and untracked-file backup before an isolated implementation checkout.
- [ ] Build fixtures for a fresh career, a sanitized actual 1.0.25 save, a year-9/10 career, a high-volume streaming career, active auctions, pending life/ad events, owned products, and a deceased character. Keep the synthetic stress fixture separately labeled.
- [ ] Record p50/p95/p99 input-to-next-paint, handler time, simulation stages, allocation/GC, persistence, native-call count and bytes, and startup-to-interactive on identical before/after artifacts.
- [ ] Add one release gate which runs type checking, production build, relevant existing audits, the new behavior regressions, deterministic progression, and performance checks. Device evidence remains an explicit external gate; a desktop command cannot certify device results.

**Exit:** Each issue has a reproducible case or a named missing production artifact. The baseline is reproducible without modifying the active native bundle.

### Task 2: Repair blocked ad and onboarding flows

**Files:** `services/adLogic.ts`, `services/rewardedAdRecovery.ts`, ad handlers in `App.tsx`, `components/CreateStarScreen.tsx`, `styles/intro.css`, `views/StartMenu.tsx`.

- [ ] Introduce a single-flight rewarded-ad lifecycle with attempt ID, original player/slot, loading/showing/rewarded/dismissed/failed states, and exactly one settlement. Subscribe to dismissal and failure as well as reward. Bound app-owned loading waits and dispose listeners.
- [ ] Preload inventory when consent and lifecycle allow. Offer another valid choice on no fill. Let players cancel the app's waiting state; do not assume the application can dismiss an SDK-owned full-screen ad. A timeout is not a reward signal.
- [ ] Preserve existing durable reward receipts and reconcile late callbacks without double grants, cross-slot grants, or lost earned rewards.
- [ ] Replace child-index-based intro animation. The optional portrait builder moves Begin Career to child nine while CSS only animates children one through eight. Add a visible portrait-builder Cancel action and ensure keyboard/safe areas cannot conceal progression.
- [ ] Show the push invitation after a successful first week or through Settings. It must not cover character-creation controls.

**Regression cases:** no fill, early close, show failure, reward-before-dismiss, repeated callbacks, background/resume, kill after reward, two-step interruption, slot switching; Android 13+ fresh install with builder open/closed, permission denied, small viewport and keyboard.

**Exit:** Every ad attempt releases application control and earned rewards survive restart exactly once. Character creation always exposes a working forward/back path.

### Task 3: Make purchase delivery durable before finalization

**Files:** `services/iapService.ts`, `services/androidPurchaseVerifier.ts`, purchase handlers in `App.tsx`, native `AndroidPurchasesPlugin.java`, `ios/App/CapApp-SPM/Sources/CapApp-SPM/PurchasesPlugin.swift`, `functions/src/index.ts`.

Both platforms currently have a finalize-before-durable-grant window. Android finishes at `iapService.ts:278` before App grants; iOS finishes before JavaScript completion and persistence. This is a higher-priority correctness issue than missing analytics.

- [ ] Model pending, verified/completed, granted, and finalized states explicitly. Pending purchases grant nothing.
- [ ] Make verification ownership-aware and idempotent. Existing backend duplicate-token rejection must return the same owner's previous result safely; a replay is not necessarily fraud.
- [ ] Persist a transaction/grant ledger keyed by store transaction ID or purchase token. Atomically record the grant and its receipt before acknowledging/consuming/finishing. Retry finalization without repeating the grant.
- [ ] Process purchases arriving outside the active purchase dialog, and reconcile outstanding purchases on connection/resume/restart. Keep permanent ownership independent of the selected career slot.
- [ ] Separate restoring permanent ownership from recovering undelivered consumables. Never consume an undelivered item during Restore or replay previously consumed currency from an old save.
- [ ] Reconcile store order → verification → durable grant → finalization → analytics using matching platform, SKU and time windows. Preserve iOS native analytics and deduplicate transaction identity.

**Regression cases:** delayed pending completion after restart, cancellation, duplicate callback, same-owner retry, foreign-owner token, network loss, finalization failure, kill before/after grant, restore on reinstall and multiple slots.

**Exit:** Each verified completed payment yields exactly one durable entitlement. Finalization is retriable. Do not infer that this caused the reported revenue decline without order-level evidence.

### Task 4: Replace life-event callbacks with stable outcome data

**Files:** `types.ts`, `services/lifeEventLogic.ts`, `services/gameLoopClone.ts`, `components/LifeEventModal.tsx`, `services/saveMigration.ts`; add `services/lifeEventOutcomes.ts` and a focused serialization regression.

- [ ] Persist an event ID, outcome-version, selected choice, and either resolved outcome data or a seed plus every required captured input. Rehydration must not reroll rewards or consult changed live state accidentally.
- [ ] Resolve typed outcome operations through one application function. Rendering the modal never mutates the career.
- [ ] Record applied event/choice IDs so double taps, reloads and retries cannot apply the same impact twice.
- [ ] Add an idempotent legacy conversion. Where the original lost callback cannot be reconstructed, use a documented compatible fallback and classify it separately in telemetry; do not claim the original outcome was recovered.

**Regression cases:** generate → clone → save/load → display → choose → save/load; every event family, every choice, duplicate selection, old pending event, reward-ad branch, localized text.

**Exit:** New events survive serialization with identical outcomes. Missing-impact diagnostics distinguish genuinely broken events from migrated legacy fallbacks.

### Task 5: Preserve atomic weekly progression and schedule events correctly

**Files:** `services/gameLoop.ts`, `services/awardLogic.ts`, `services/stockTakeover.ts`, `services/saveMigration.ts`, `App.tsx`, premiere creation in `views/lifestyle/business/ReleaseWizard.tsx`.

- [ ] Give each weekly attempt a stable run ID and deterministic input/seed. Repeating recovery must produce the same authoritative result and never charge or grant twice.
- [ ] Keep required financial, contract, release, award, inheritance and ownership mutations inside an all-or-nothing week result. Invalid required state causes a recoverable failure with the original state intact.
- [ ] Isolate optional presentation/content failures only where a documented fallback preserves required effects. Do not universally catch an exception, skip an economic item, and call the week successful. Quarantined required items need an explicit repair/resolution path.
- [ ] Route an already-dead loaded career to the correct screen without replaying death or rewards.
- [ ] Use explicit award type, season, invite week, and ceremony absolute week. Merely replacing the invite argument with a ceremony week breaks existing type inference. Validate acting, music, trailer and producer categories against their real eligibility rules.
- [ ] Trace the full studio acquisition/control/signing flow, add dismissal/cooldown where valid, and persist dismissal. The repeating takeover event is one mechanism, not complete coverage of AE-007.
- [ ] Schedule premiere events for the intended date and queue simultaneous events. The current single pending-event slot can overwrite events, while release signing can trigger a premiere early. Preserve intentional campaign eligibility and explain when no premiere exists.

**Regression cases:** failure injected into required release/payment/award work leaves original state unchanged; retry produces one week and one set of payments; invite/ceremony boundaries, multiple premieres, two concurrent events, acquisition completion/dismiss/reload, loaded deceased character.

**Exit:** No silent loss of required weekly effects. Known corrupt saves have safe recovery and understandable action paths.

### Task 6: Correct stock behavior and verify renewal semantics

**Files:** `services/stockLogic.ts`, renewal logic in `services/gameLoop.ts`, related stock/renewal UI, `services/saveMigration.ts`; existing stock and awards audits plus focused multi-year regressions.

- [ ] Reproduce stock dynamics over multiple deterministic scenarios, including persistent success, failure, splits and takeovers. Calibrate a bounded economic model against expected returns and ownership behavior rather than adding arbitrary upward drift.
- [ ] Track dividend entitlement and last payment by absolute week. Test multiple years, import, repeated processing, and catch-up policy; never pay the same entitlement twice.
- [ ] Validate renewal inputs with finite, bounded values and explicit producer-only/actor credit semantics. Reproduce the actual successful-show complaint before changing balance or guaranteeing renewal.
- [ ] Repair old markers and malformed state once, preserving shares, cost basis, earned value, contracts and existing outcomes. Do not reset the portfolio or grant speculative compensation.

**Exit:** No permanent artificial saturation in the agreed scenarios; dividend scheduling is consistent across year boundaries; renewal is explainable and finite without silently treating a producer as an actor.

### Task 7: Remove repeated work from interactive paths

**Files:** `App.tsx`, `services/playerUiState.ts`, `services/gameLoop.ts`, `services/firebaseService.ts`, `content-market-exact/ExactContentMarket.tsx`, owned-streaming/industry/AI services identified by profiling.

- [ ] Capture the timeline `input → handler → data computation → state update → React commit → next paint`, then storage separately. Include cold navigation, bidding, scouting, casting, crew, release wizard, modal confirmation and Next Week.
- [ ] Migrate at load/import and untrusted boundaries. Add explicit canonical-state contracts for trusted in-session domain actions. Preserve validation of real external/partial component state.
- [ ] Use targeted immutable updates, stable selectors and cached derived catalogues keyed to the actual revision. Remove redundant whole-career normalization/copies only after equality/invariant tests prove correctness.
- [ ] Keep stage diagnostics in a bounded memory buffer. Publish sanitized summaries at lifecycle boundaries through a batched native endpoint; fix both `emitLoopStage` and `markTraceAction`, not just one wrapper. Count bridge crossings separately from key count and payload bytes.
- [ ] Profile the benchmark's large owned-streaming, industry, AI catalogue and customer-input stages. Cache or incrementally update repeated derived work without freezing simulation outcomes.
- [ ] Keep the current core preload behavior. Remove QA/dev-only dependencies from the shipped graph without idle-preloading all of them back. Load selected-language resources and only prefetch resources likely to be used.

**Exit:** Common actions meet input-to-paint budgets with no expensive pre-paint serialization and no new first-use code-loading stall. Moving work into a Promise or timer alone does not pass this gate.

**Optional escalation:** If measured CPU work still blocks rendering after these changes, assess a dedicated simulation worker. Adopt it only after seeded-result parity, copy/transfer memory measurements, native WebView compatibility, cancellation and crash recovery pass. A worker rewrite or many yielded partial week mutations is not the default repair.

### Task 8: Optimize persistence without removing recovery guarantees

**Files:** `services/storage.ts`, `services/saveGenerations.ts`, `services/saveIntegrity.ts`, persistence orchestration in `App.tsx`; add `services/saveCoordinator.ts` if needed.

- [ ] Keep one ordered writer per career/slot with monotonically increasing revisions and immutable snapshot ownership. Coalesce superseded ordinary snapshots only; never discard unique financial/reward transactions.
- [ ] Reuse one canonical serialization/manifest result within a revision. Remove duplicate hashing/readbacks only after the replacement proves transaction completion, corruption detection and previous-good-generation recovery.
- [ ] Keep current/previous generation and integrity metadata consistent in one storage transaction where supported. Transaction completion, not request success or a fire-and-forget Promise, defines durability.
- [ ] Show immediate press/progress feedback. Ordinary autosaves can run after UI work; critical week, purchase, ad-reward and slot-change success must respect durable-commit boundaries. Keep a visible saving/error/retry state and explicit failure semantics.
- [ ] Background/visibility flush is best effort, not a guarantee against sudden process termination. If an intent journal is needed, make it durable before exposing a recoverable transaction as completed.

**Fault tests:** kill at each write/commit boundary; storage full/denied; transaction abort; corrupt current generation; stale save finishing after a newer revision; rapid taps; slot change during save; resume after suspended writes.

**Exit:** Reopen yields either the complete prior state or the complete committed next state. It never yields a mixed week, missing paid reward, or an older write overwriting a newer one.

### Task 9: Bound active memory and export in bounded chunks

**Files:** existing `services/saveCompaction.ts`, `services/saveTransfer.ts`, native save-transfer plugins, and save generation/storage files; create `services/saveTransferStream.ts` for bounded transfer if that is the chosen module boundary. Introduce archive modules only after the inventory identifies safe candidates.

- [ ] Measure bytes by field and retained heap over time on realistic and synthetic fixtures. Separate active career size, total history size, peak serialization copies, native bridge payload size and graphics memory.
- [ ] Archive only immutable or reconstructible history. Keep all active contracts, rights, sequel/legacy references, talent credits and financial obligations available to simulation. Use lightweight indexes for recent UI/history access.
- [ ] Commit archive chunks and their root/index references atomically, with a recoverable generation marker. Test interruption during migration and preserve the original until verified.
- [ ] Implement bounded export/import on both ends. Do not first construct the entire JSON/base64 archive and then divide it into chunks. Preserve checksums, cancellation, format versioning, export/import portability and restoration of archived history.
- [ ] Preserve existing touch blur fallback. Profile image decoding, duplicated assets, DOM growth, canvas snapshots, retained listeners and GPU layers; make a stable startup graphics choice with a user override only where evidence warrants it.

**Exit:** Memory plateaus during a 60–120 minute native soak and repeated navigation. Active snapshot target is <=8 MiB for the agreed realistic ten-year fixture, while full history remains available. Stress fixtures must have an explicit supported envelope rather than being deleted to satisfy the size target.

### Task 10: Close native crash, navigation, observability and product gaps

**Files:** `services/firebaseService.ts`, `services/pushRegistration.ts`, `firestore.rules`, `firebase.json`, startup/navigation components, localization resources, Android/iOS build configurations.

- [ ] Match missing dSYM UUIDs to the shipped archive and inspect symbolicated native stacks. Separate long-save crashes, native SIGSEGV, GPU waits and Java VerifyError rather than assigning one unproven cause to all of them.
- [ ] For AE-017/018, collect full stack/class/method, OS/device, dependency versions, installer/signature context and matching release artifact. Reproduce against supported devices and resolve verified compatibility defects. Do not dismiss players as modified-device users without evidence.
- [ ] Add persisted auth retry backoff with jitter and error classification. Preserve guest/local gameplay and identity; avoid a fresh sign-in storm on every boot.
- [ ] Use push permission/registration state and structured errors where available, retaining useful existing retries. Test APNs token not ready, denial and Settings changes.
- [ ] Convert locally cached reports into a durable, idempotent outbox with queued/delivered/failed status. A locally generated report ID must not imply server acknowledgement. Inspect effective deployed rules/configuration before proposing a rules deployment.
- [ ] Implement consistent modal/back navigation and restore drafts/scroll where appropriate. Test Android system Back, Apple in-app Back, nested modals, small-screen icon overflow, keyboard and safe areas separately.
- [ ] Remove arbitrary startup dwell after content is ready while measuring actual startup-to-interactive and first-use readiness. Do not replace the 8.6-second presentation with a universal 1.5-second readiness claim.
- [ ] Explain weekly cash movement using the existing transaction ledger and reconcile opening balance + inflows - outflows = closing balance. Evaluate energy pacing separately from the request for a permanent paid upgrade.
- [ ] Ship each requested language only after coverage, interpolation, layout and native-user review pass. Preserve the frozen English baseline. Translation percentage alone does not establish quality.
- [ ] Publish an accurate streaming roadmap only when the release candidate and compatibility gates support it. Keep product requests separate from defect closure.
- [ ] Validate edge-to-edge/layout/API compatibility. Experiment with R8 separately, retain mapping files and test reflection/plugin entry points; do not bundle it into the first stability repair by default.

## Complete workbook coverage

| Issue | Owner task and closure evidence |
| --- | --- |
| AE-001 | Task 10: matching dSYM UUIDs and readable relevant stacks; optional coverage correctly interpreted. |
| AE-002 | Tasks 7–9: device ANR/Perfetto/GPU traces, lower main-thread and bridge load, cluster-level follow-up. |
| AE-003 | Task 9: native heap/bridge measurements, bounded export, process-kill tests and OOM-cluster follow-up. |
| AE-004 | Task 4: serialized event round trips and exactly-once outcome application. |
| AE-005 | Task 2: every ad terminal path, no player lockout, exactly-once earned rewards. |
| AE-006 | Task 2: affected-device onboarding, portrait builder and keyboard tests. |
| AE-007 | Task 5: acquisition/control/signing/dismiss/reload regression. |
| AE-008 | Tasks 9–10: real long-save native soak plus matching symbolicated crash evidence. |
| AE-009 | Tasks 5 and 8: atomic week/retry and persistence-failure injection, production failure rate by build. |
| AE-010 | Task 10: permission/registration/retry state matrix. |
| AE-011 | Task 3: verified, durably granted and finalized order ledger, reconciled telemetry. |
| AE-012 | Task 10: edge-to-edge/API tests; separately evaluated mapped R8 build. |
| AE-013 | Task 10: Apple back/overflow and Android system-back regressions. |
| AE-014 | Task 5: award categories, explicit calendar semantics and non-overwriting scheduled premieres. |
| AE-015 | Task 10: reconciled cash-flow UI and separate energy pacing decision. |
| AE-016 | Task 10: offline outbox, retries, acknowledgement and effective rules verification. |
| AE-017 | Task 10: matching Android VerifyError stack/artifact and reproduced compatibility cause. |
| AE-018 | Task 10: MainActivity/class-verification compatibility evidence. |
| AE-019 | Task 10: native SIGSEGV stack diagnosis and specific device regression. |
| AE-020 | Task 10: restart-persistent backoff, identity preservation and deduplicated auth telemetry. |
| AE-021 | Tasks 7–10: cold/warm startup and cold/warm interaction metrics on affected devices. |
| AE-022 | Task 6: actual renewal eligibility reproduction, finite inputs and explained decision. |
| AE-023 | Task 6: deterministic multi-year prices/dividends without resetting ownership. |
| AE-024 | Task 10: verified Spanish/Portuguese release-quality coverage and unchanged English baseline. |
| AE-025 | Task 10: verified roadmap and compatible streaming release; product expectation is not a code bug. |

## Release gates and device matrix

Run on packaged release builds, not only a Vite development server. Include Galaxy A10s-class hardware, a device from the observed Mali/GPU cluster, Moto G45, an onboarding-affected Android 13/14 device, the oldest supported iPhone and a current iPhone. Confirm actual OS/app minimum compatibility before choosing iPhone 8 or a simulator as a substitute.

| Gate | Proposed acceptance |
| --- | --- |
| Common tap input-to-paint | p95 <=100 ms, p99 <=200 ms on agreed supported devices; include first use. No >10% regression from the same-device baseline for unaffected flows. |
| Next Week | p95 <=1.5 s end-to-end on the realistic ten-year fixture, including critical persistence; immediate feedback <=100 ms. Annual-heavy weeks reported separately. If this target is missed, defer release or explicitly revise support/budget with evidence. |
| Main-thread responsiveness | No repeated >50 ms interactive tasks without a documented measured reason; inspect frame pacing and touch latency, not just average CPU time. |
| Diagnostics | <=10 app-owned diagnostic bridge crossings per ordinary week after batching, with bounded payload bytes. Count ad/billing calls separately. |
| Save/recovery | All real supported saves migrate; migration twice has no further effect; no mixed generation, duplicate grant or lost acknowledged critical transaction under injected failures. |
| Active snapshot | <=8 MiB for the agreed realistic ten-year fixture; historical data preserved; separately recorded limits for larger stress fixtures. |
| Memory | No unbounded retained-memory rise after repeated actions and 60–120 minute soak; JS/native/GPU measured separately. |
| Gameplay | Deterministic 12-week smoke plus multi-year calendar/stock/legacy tests; required financial identities and contracts preserved. |
| Ads/purchases | Every documented terminal/recovery path passes on real native SDK sandbox builds. |
| Packaging | Web/native artifacts match approved commit and assets; correct dSYMs/mapping and build IDs retained. |

## Rollout and rollback

1. Merge independently verified blocker/purchase/gameplay repairs in reviewable units. Keep performance/persistence/archive changes independently reversible where their data contracts permit. Do not activate a new archive schema without its migration/recovery gate.
2. Build the candidate from an identified checkout, run the appropriate Capacitor sync and platform-specific patch process there, and verify packaged asset hashes. Never use an unsynced pre-existing native directory as evidence of the candidate.
3. Confirm available store version/build numbers at release time. Do not hardcode `1.0.26/22` as available from this audit.
4. Internal/native testing, then a small production cohort, then staged expansion (for example Play 10% → 50% → 100% and iOS phased release) after comparable usage is observed. Define exposure/sample requirements from current traffic before rollout; absence of a rare crash in a tiny cohort is insufficient.
5. Monitor by build/device/save age: save failures, week failures per attempt, ad outcomes per attempt, verified/granted/finalized purchases, missing new-event outcomes, startup/tap percentiles, ANRs and native crash clusters. Raw event reductions without denominators do not prove resolution.
6. Halt expansion for new progress/payment loss, a recurring new fatal cluster, or material latency/memory regression. A native rollout pause does not downgrade installed devices. Preserve pre-migration generations and use a compatible forward repair when the older binary cannot read new saves.

No responsible plan guarantees that no user will ever encounter another issue. This plan defines concrete mechanisms, compatibility protections and evidence required before calling each defect resolved.

## Platform references

- Google Play Billing completion, reconciliation and finalization: https://developer.android.com/google/play/billing/integrate
- Apple StoreKit transaction finishing after delivery: https://developer.apple.com/documentation/storekit/transaction/finish()
- Android process lifetime and limited background execution: https://developer.android.com/guide/components/activities/process-lifecycle
