# Selective rollback — 15 October 2026

## Result

The approved repair layers and named later movie/small-bug changes were selectively rolled back. The complete latest local streaming implementation and Content Market/finance implementation were retained. This is a combined version, not an exact checkout of a historical commit.

No commit, push, deployment, app installation or personal career modification was performed.

## Full recovery backup

- Location: `/Users/zeesh/Vibe code/actor empire bugy streaming`
- Includes the original entire checkout: tracked/untracked/ignored files, Git history, dependencies, native source and build artifacts.
- Verified 57,753 regular files/symlinks; file contents SHA-256 compared with zero mismatches before source edits.
- Permanent verification manifest: `BACKUP-VERIFICATION.json` inside that backup.
- Git's live fsmonitor IPC socket is process state and was not copied.
- Retired files also remain under `/private/tmp/actor-empire-rollback-20261015-retired`; this temporary quarantine is supplemental. The full named backup is the durable recovery source.

## Restored execution paths

Reference `c11b909` (23 September) supplies the earlier implementations:

- Eager App and game-screen imports; the later bootstrap/readiness coordinator, startup watchdog and adaptive startup presentation are removed.
- Original Smooth Mode control replaces the later device/adaptive-performance system.
- Earlier life-event and production-crisis callbacks replace the transactional resolver/fallback layers.
- Earlier rewarded-ad/recovery handling replaces the new coordinator, lifecycle, grant transaction and retry UI.
- Earlier save transfer and native Android transfer plugin replace Transfer V2, streaming transfer and iOS transfer additions.
- Earlier persistence preparation, save generation/storage execution, memory checkpoint API and weekly clone/scheduler replace the later runtime/persisted split, transaction wrappers and cooperative checkpoints.
- Long-session diagnostic hooks/native registrations and unused archive foundation modules are retired.

These restore previous implementations; ordinary life events, ads, saves and weekly progression still exist. Existing pre-reference integrity/recovery protections remain. Streaming-required migration, historical catalogue, rights state, audience-choice state and signed-save digest compatibility were retained.

## Named local changes rolled back

Reference `d35f131` supplies the pre-local behaviour for:

- Country-ticket Box Office rewire and audience-response/risk changes.
- Release forecast and scaled cinema-booking/charge changes.
- Movie net-finance/country breakdown/outcome-classification changes.
- TV cancellation season-count correction.
- Returning sequel director selection/negotiation and self-directing corrections.
- Talent rejection feedback and acceptance changes.
- Multiple universe contracts, dynamic universe creation/casting and acting-workload changes.

Corresponding newly created services and obsolete diagnostics were quarantined. Relevant existing diagnostics were restored/adapted to the selected older APIs. Package commands were checked for dangling script paths.

## Preserved current streaming

- Platform registration, founder funding, market filing, treasury and finance.
- Regional infrastructure/network construction, capacity, launch/rehearsal/opening and expansion.
- Subscription, advertising, transactional and hybrid offers; audience choice, viewing and weekly settlement.
- Rights scope/terms, catalogue packages, licences, private offers, auctions, historical/shared library and rivals.
- Pricing V3 and its cycle/version compatibility.
- Paid rights guarantee separately from measured weekly revenue/cost; unavailable performance shown without false zero measurements.
- Upfront auction bid separately from total reserved budget.
- Studio eligibility/READY counts, offers/back/draft interactions, package finalization and trusted Market state-update path.

Final protected-file check: 376 streaming/Market/world-economy/platform-AI/style paths match the original backup byte-for-byte. Shared App/types/game-loop integration was reviewed separately. Independent review additionally compared 548 streaming-related paths without differences.

Unrelated baby naming, localization audit/baseline, responsive shell/keyboard layout, APNs registration and other unrequested changes were preserved. This is not a claim that every entry AE-001 through AE-016 in the spreadsheet was reversed.

## Verification

Passed on the combined source:

- Production web build; TypeScript `tsc --noEmit`; `git diff --check`.
- Android `:app:compileDebugJavaWithJavac --offline` using Android Studio JBR: BUILD SUCCESSFUL, 111 tasks.
- Save migration, save generations/signature compatibility, save integrity and legacy save transfer.
- Additional transfer regression preserves V3 policy/cycle, treasury, historical catalogue and integrity signature.
- Fresh-save progression/persistence across 12 weeks; weekly save-safety, scheduler and native memory checkpoint checks.
- Content Market CM1–CM4.
- Latest Market pricing V3, interaction/finance, back/draft and catalogue V3 UI checks.
- Streaming commercial C6, regional network lifecycle, rights transaction/finalization and weekly platform settlement checks.
- Greenlight calculations/project builder and episode ratings.
- Legacy AdMob/rewarded recovery, store rendering, reported-bug regressions, regulator/rival/talent/world reaction and stock-decision checks.

Some retained tests required fixture-only updates for the restored `prepared.player` API. The regional lifecycle fixture now explicitly selects the subscription core before saving pricing; the original fixture failed against the full pre-edit backup too. Gameplay streaming formulas were not changed for these tests.

Browser smoke used a separate Playwright session and origin (`127.0.0.1:4186`), with synthetic career `Rollback QA`:

- Start menu and empty save slots.
- New-career creation and Home.
- Career, Improve, Social, Lifestyle, Mobile and return Home.
- Week 1 to week 2 progression.
- Document reload, saved-career selection and verified week 2 reopen.
- 390 × 844 screenshot: `output/playwright/2026-10-15-rollback-home.png`.
- Browser console showed only a missing favicon request, with no game JavaScript error observed during this smoke.

Preview listener was verified to run from the current Actor Empire checkout. Production preview: `http://127.0.0.1:4186/`.

## Remaining failure and limits

`audit:shared-streaming-game-loop` fails its release-archive assertion: three signed platform runs are expected, one is retained. The same assertion fails with original HEAD game-loop code injected into the test bundle. Both logs are saved alongside this report. This is a pre-existing retained streaming issue, not a green result and not silently fixed in the rollback.

The web build warns about its large eager JavaScript bundle. Restoring eager loading does not prove every click is faster; no representative personal long-career/device latency comparison was performed.

No physical Android/iOS run, iOS build, native transfer picker/ad-inventory test, purchase or production deployment was performed. Android evidence is source compilation, not an installed APK smoke test.

Detailed logs, restoration inventory, quarantine inventory and preservation checks are in the adjacent `2026-10-15-selective-rollback/` evidence directory.
