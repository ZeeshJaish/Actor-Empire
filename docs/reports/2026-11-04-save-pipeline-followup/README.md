# Verified save and audience optimization — 4 November 2026

The approved bounded optimization round is complete locally. Three sources of repeated work were reduced, with exact controlled outcomes and fresh stored-data verification retained. **Consistent under-three-second latency across runs and older devices is still unmet.** One desktop run passed; the matched desktop tail and slow-CPU sample did not. Shared-host variation prevents a causal whole-app speedup claim.

## Retained changes

Only three production files changed from the verified task-start artifact `/assets/index-BCSTCJCG.js`:

- `services/saveIntegrity.ts`: construct a temporary intelligence digest view containing the fields the issued projection actually reads. Keep the existing core/content normalization and proposal validation/truncation order. Ignored comparison/evidence histories and proposal scores are not reconstructed for this digest. The actual player, histories and persisted data are untouched.
- `services/stableSaveHash.ts`: reuse small-object key ordering within one hash invocation. The metadata trie stops growing at2048prefix nodes; objects over32keys and unseen shapes after that bound use ordinary sorting. No player objects, values or completed hashes are cached. Every independent verification still reads and hashes its actual input.
- `services/boxOffice/boxOfficeAudience.ts`: normalize each title/cohort language list once within the current audience snapshot. Later calls see edits freshly. Audience equations, release supply, prices, awareness and paid tickets are unchanged.

The physical save layout, digest schema, archive retention, dependencies, minimum OS declarations, earning formulas and earning limits are unchanged. All three independent save-verification passes remain. Success is still published after verified durable commit.

## Measurements

| Case | Task start | Current | Scope |
| --- | ---: | ---: | --- |
| Complete save verification median |116.25ms|111.45ms|16 alternating measured pairs in one browser, same retained player/manifest; about4.1% less component time |
| Audience snapshot median |93.45ms|86.65ms|10 alternating measured pairs, same12titles/2363cohorts/197countries; about7.3% less component time |
| Same-host ABBA built-app median |2.872s|2.997s|20 observations/build,10weeks/run, identical signed starting fixture, normal unseeded UI/events |
| Same-host ABBA built-app p95 |3.185s|3.100s|All observations retained;10/20 old and11/20 current turns under3s |
| Current continuous desktop run |—|Median2.481s/p952.698s/max2.955s|40weeks in4.131 actual minutes;40/40under3s; navigation, year rollover and final reload pass |
| Missing-API/2×CPU/512MiB-heap median |6.837s|6.745s|3weeks/build, functionality and normal reload pass; current maximum7.315s |

Component comparisons load frozen task-start and current functions into **the same browser bundle/process**, alternate balanced call order, exclude two warm-up pairs and do not force GC. All complete audience snapshots have the same SHA-256; the player and input remain unchanged. These are CPU measurements, not app/device benchmarks. Old/current verification both accept the identical signed player.

The unchanged old app's two ABBA runs had medians3.115s and2.529s. That host variation is larger than the expected gain. Pooled app medians are worse while the observed tail is lower; neither establishes a causal improvement or regression. The faster40-week run is reported separately and does not erase the slower samples. It lasted about4.1minutes, **not a full hour**. The preceding completed-hour test exercised a different artifact and is not reused as current-build hour proof.

The older-API pair imports identical tracked starting facts and ends with equal cash, records, posts and non-gross facts. One of369 title grosses differs across these normal, unseeded UI runs; cross-build end-state equality is not asserted for those observations. Each build separately passes exact pre/post-reload checks. Numerical parity is established by the controlled full-player replay below.

Initial instrumented IndexedDB probes measured preparation363.9/277.9/270.9ms and writes879.8/910.3/938.9ms. Candidate writes were863.5/871.8/837.2ms. Every write retained three independent verifications and90hash calls. Separate-time probes are descriptive, not causal app-speedup evidence. Their controlled+10-dollar updates are storage fixtures, not gameplay earnings. Alternative short-key/combined hash prototypes were not retained.

[All timing cases](latency.json) · [Same-process comparison](profiles/component-comparison.json) · [ABBA raw observations](checks/same-host-ab.json) · [Current40-week observations](../../../output/playwright/2026-11-04-save-continuous-40/results.json)

## Correctness and compatibility

- 38 focused suites and the full root TypeScript check pass. The first type attempt caught a new test oracle's overly narrow Set type; correcting that test allowed the full type check to pass. That failed attempt remains recorded.
- RED→GREEN work checks: ignored digest-only history rows40→0; repeated-layout key sorts2000→1; language normalizations4320→184. Their18/169/17 checks cover issued signatures, truncation/default quirks, invalid rows, sparse/Unicode values, bounded metadata, frozen full snapshots, fresh mutations and source preservation.
- 12native and12missing-API checkpointed career weeks each match the complete task-start golden output: player SHA-256, manifest digest, cash, receipts, RNG count and deterministic clock. Prior players remain immutable. All901 task-start runtime/config hashes match the preceding verified artifact. These replays are controlled correctness checks, not UI career-balance or continuous-session evidence.
- Minified production build passes: `/assets/index-BMCL_uNx.js`, SHA-256 `ce590aca14a00785d3c075ade2e918a7a8398ddef618514a0401161be50306ca`. Test-only hooks are absent.
- Nine Chromium and nine current macOS WebKit atomic-save cases pass. Actual old-reader→new-writer→old-reader UI saves pass. Full-storage rollback and corrupted-current Safe Backup recovery pass in the built app.
- Completed app cases retain37 film records and200 authored posts; normal reload preserves tracked money/gross/content and does not pay twice. This large fixture's dynasty archive is empty; populated archive/content preservation is covered separately by focused suites.
- All901 built source/config hashes remain exact. All1242 initially dirty files remain present with no unexpected changes; only the three intended production files differ from that initial set. New test fixtures, probes and this report are separate additions.

[Suites/types](checks/regressions.json) · [Safety groups](checks/safety.json) · [Exact native replay](checks/complete-player-parity-native.json) · [Exact fallback replay](checks/complete-player-parity-legacy.json) · [Provenance](checks/baseline-provenance.json) · [Artifact](artifact-manifest.json) · [Preservation](checks/preservation.json) · [Completion assertions](checks/completion.json)

## Memory and remaining limits

Only one task-owned heavy worker ran at a time; other chats/jobs were untouched. Tests/browser retained the2560MiB sampled process-tree guard. The compiler retained2048MiB heap/3072MiB tree and its existing swap stop. Build admission at55% free memory timed out before starting a heavy worker; the retry at50% passed with the same caps/stops.

Build peak owned RSS was2351.38MiB; type check2078.98MiB; maximum completed app worker1839.08MiB; current40-week worker1812.73MiB; same-process comparison1244.13MiB. The40-week run and build recorded no swap growth. The two slower legacy app cases recorded global swap warnings of2815.63MiB/1414.24MiB without crossing the combined abort condition. These are shared-host swap observations, not an attribution to our worker. No completed check hit an RSS/free-memory abort. Subsecond probes with a zero RSS sample were too short for the sampler, not zero-memory operations.

All task-owned heavy workers are stopped. Physical iOS15/Android7 compatibility/performance and a continuous-hour test of this new artifact remain unverified. Missing-API emulation and current macOS WebKit do not certify older phones. No commit, push or deployment was performed.
