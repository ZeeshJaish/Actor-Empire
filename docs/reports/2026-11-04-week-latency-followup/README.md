# Weekly pipeline follow-up — 4 November 2026

**The completed forty-week confirmation passes the p95<3s target under its measured conditions. This is not a pressure-independent or physical-phone guarantee.** All exercised save/payment/archive checks pass. Every slow observation and the resource-aborted run are retained.

## Actual app timing

Primary acceptance measures from the start of the automation command, before its pre-click wait/input dispatch, through the actual click handler and verified save transaction to two-frame painted readiness. This conservative upper bound includes input queue/pre-click overhead. The click-handler-to-paint series is also retained; neither series excludes slow turns.

| Exact final artifact | Weeks | Median, command-to-paint | p95, nearest rank | Maximum | Under3s |
| --- | ---: | ---: | ---: | ---: | ---: |
| **Completed confirmation, including final reload** | **40** | **2.820s** | **2.943s** | **3.458s** | **38/40** |
| Resource-pressure run;40 turns completed, guard stopped closing reload | 40 | 2.639s | 3.350s | 3.422s | 32/40 |
| Missing APIs,2× CPU slowdown,512MiB JS heap | 3 | 7.509s | 7.549s | 7.549s | 0/3 |

The confirmation's actual click-handler-to-paint median is **2.802s**, p95 **2.928s**. Its original command-to-ready wall-clock p95 is2.944s. Two slow turns remain in the sample. All ready-frame observations follow the actual successful current-save transaction commit; no future week is published early.

The first final-artifact run triggered the shared-memory guard after all40 measured turns and before its closing reload. Its peak task-owned RSS was1749.98MiB, but global swap grew1703.5MiB and free-memory fell below30%. Once headroom recovered, a new complete confirmation ran against the **same artifact**. The interrupted sample is not relabelled as a passed session or discarded. Its last committed cash, age/week, cinema gross, film IDs and authored post IDs were independently reopened and matched before an old→new→old reader roundtrip.

The pressure and completed runs have different normal unseeded events and shared-host conditions. They do not prove that the code alone caused every timing difference. There is no guarantee of a3s maximum, p95 under sustained memory pressure, or3s on the declared older-device minimums.

[All measurements and earlier candidates](latency.json) · [Exact artifact and901 source/config hashes](artifact-manifest.json)

## Implementation

1. **Population reconciliation avoids a redundant whole-market clone.** A private read-only view copies changed population rows. The public proposal still detaches its audience/run state. Shrinking, growing, missing and legacy cohort cases preserve exact scaling and metadata. Frozen source/public-result mutation tests pass.
2. **Per-title facts are reused within one audience calculation.** Cast normalization happens once per title; cohort ordering is computed once per snapshot. Duplicate roles keep the strongest credit and union of character IDs. Recognition, favorites, repeat intent and all pricing/budget formulas are unchanged.
3. **Normal weekly settlement has a player-only synchronous owner.** It never exposes an input/proposal and therefore does not build a large detachable source string solely to compare it with itself. Clock, authority, cents conservation, ownership, receipt, payment and replay checks still run. Public/detached results and the explicit diagnostic-result path retain the complete source string and issued mutation guard. A proposal constructed from the internal marker is rejected by public commit before mutation.
4. **Protected intelligence reads derive only their actual projection.** Studio/platform normalizers share the same intelligence builders with integrity verification. Canonical branches, turn-marker week rules and absent optional keys retain their issued shape. Every verification reads fresh values; no protected hash cache is used. Unrelated slate, localization, rights and obligation histories are not rebuilt to read intelligence.
5. **Zero-funded rival streaming work is removed.** Zero sources retain their source ordinal without routing every catalogue title. Zero whole-unit pools return zero allocations without fractional sorting; positive totals are rounded once with the same exact result. A4096-row zero allocation no longer sorts. The frozen attribution fixture's zero source routes fell from96 to0 with every receipt ID, order and amount unchanged.

`App.tsx`, the browser-API fallbacks, package/lock files, Vite targets, stable hashing, cinema identity serialization and IndexedDB/save-generation protocol match the task-start source byte-for-byte. No signature schema, physical storage layout, earning formula, cap or record-retention limit changed. Full candidate/previous/stored-current verification and requested-generation binding remain in production.

## Safety verification

| Verification | Result |
| --- | --- |
|33 focused suites: money, ownership, archives, migration, viewing, stock, royalties, population, identity, replay and new owner/projection boundaries | PASS |
|Root TypeScript and real minified production build | PASS |
|12 complete frozen-source/current-source weeks: whole player, manifest, cash/receipts, RNG, clock, prior-player immutability | EXACT |
|The same12 weeks with missing browser APIs and the JS clone fallback | EXACT |
|Nine actual Chromium and nine macOS system WebKit atomic-save cases | PASS |
|Frozen issued schema-4 body/signature preserved exactly as previous-good after upgrade | PASS |
|Real interrupted process's last committed40-week facts reopened | PASS |
|Previous built reader→new built writer→previous reader, including actual durable menu saves and full protected/authored-content comparisons | PASS |
|Actual final app storage-full failure at physical current write | Committed cash/week/gross/records retained |
|Corrupted current→normal Safe Backup recovery UI | Verified previous restored |
|Completed40-week native session, double-click guard, career/lifestyle/phone/box-office navigation and final reload | PASS |
|Actual missing-API/2×CPU/512MiB-heap3-week app journey and reload | PASS,zero page errors |
|1010 initially dirty files and901 runtime/config files | No missing or unexpected modifications |

The exercised app careers retain **37 film records and200 authored posts**. Reader/update comparisons cover full authored-content SHA-256, protected projections, producer receipts and NPC/business/talent/streaming treasuries. The large UI career's dynasty archive is empty; populated archives and detailed authored records are covered separately by the frozen/native fixtures and the sixteen-check career-preservation suite. This does not certify every real ninety-nine-hour save.

[Focused suites/types](checks/regressions.json) · [Native/fallback replay](checks/replay.json) · [Complete-player proof](checks/complete-player-parity.json) · [Fallback proof](checks/legacy-clone-full-parity.json) · [App/storage checks](checks/safety.json) · [Preservation](checks/preservation.json)

## Memory and experiments

Only one task-owned heavy worker ran at a time; other chats/jobs were left untouched. Tests/browser used a2560MiB sampled descendant-RSS guard. Builds used the repository's existing2048MiB-heap/3GiB-RSS bounded runner and its512MiB swap stop, plus an outer free-memory guard. This bounds this task's sampled processes, not the entire Mac.

- Final build: outer peak **2764.27MiB**, swap growth0.
- Completed confirmation browser tree: **1732.64MiB** peak. Global swap growth817.12MiB was recorded as a warning; free-memory stayed above the abort threshold.
- Final compatibility/update/recovery sequence: **2070.56MiB** peak, global swap growth377.26MiB.
- Final focused/type sequence: **2183.45MiB** peak, swap growth0.

The stricter build attempts remain recorded: a2048MiB compiler hit the2.5GiB tree guard,1536MiB heap ran out of heap, and1792MiB hit the tree guard. The existing medium-memory build then completed. The resource-aborted browser run is also retained with its failure/guard report.

An exact-hash key-token batching prototype was slower and never entered production. A private last-read-back-body cache prototype kept all three full verification passes and reduced warm storage-only saves from876.6/820.8ms to732.7/734.7ms. It remains throwaway: retaining an entire private save and its additional backup/memory behavior need separate certification; it was not introduced into old-device runtime paths. Controlled+10-dollar storage benchmarks are not gameplay earnings evidence.

## Limits and remaining acceptance

- **Observed desktop confirmation p95 passes; pressure-independent latency does not.** The same artifact's interrupted pressure sample misses3s. All samples are available in latency.json.
- The declared **iOS15 / Android7** minimums and existing conditional API fallbacks are unchanged. Physical phones, their WebView engines, keyboard/layout behavior and real-device performance remain unverified. Current macOS WebKit and capability/CPU emulation do not replace that certification.
- The confirmation is about4.48 accelerated minutes, not a new60-minute session. No new full-hour or99-hour physical-session claim is made.
- Code changes are local; this task did not commit, push or deploy a release.
