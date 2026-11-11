# Verified save path and old-save safety — 30 October 2026

Local implementation and correctness checks pass. **The under-three-second p95 target is still open.** The final actual-app run measured median **3.728 s**, nearest-rank p95 **4.650 s**, range **3.009–5.346 s** over 65 consecutive weeks. Do not describe this as a completed latency target.

## Changes

- Production IndexedDB saves keep the same plain current-player record, integrity header, slot keys and previous-generation envelope. No physical-format or signature-schema migration was introduced.
- A single write transaction preserves the verified old current as previous, writes the new current/header, reads and fully verifies the actual serialized current, and checks its requested digest **before** publishing either generation. Any failure rolls the whole transaction back. The initial complete candidate verification remains. Generic and experimental block backends retain their existing staged protocol; batch import/recovery readers remain compatible.
- Rival streaming viewing checks production readiness once per title within one synchronous projection, sharing its existing production index and nested cinema-streaming evidence allocation. No cross-week or mutable-player cache.
- An internal, freshly calculated cinema result stays unexposed through owned settlement. It needs no detached-proposal mirror until a caller reads the result. The full mirror is issued exactly once before exposure; repeated reads cannot re-sign a mutation. Public simulation/commit guards, source checks, conservation, receipt replay and payment validation remain.
- **A real reload money bug was found and fixed.** The legacy venture cache could overwrite a generated NPC studio's newer canonical cash after cinema receipts/spending. One reproduced studio changed from 429.18885702 to 429.06485701976106 million on restart (about $124,000 lost). Already-promoted studios now remain authoritative. Only the actual weekly legacy processor explicitly submits new progress; loading, ordinary synchronization and same-week replay cannot reverse those transactions. First-time migration and real weekly progress still work. No retroactive grant or revenue multiplier was added.

## Latest correctness evidence

| Check | Result |
| --- | --- |
| Root TypeScript and production Vite build after the cash fix | PASS |
| Eighteen focused integrity, generations, migration, archives, ownership, studio-foundation, royalties and viewing suites | PASS |
| Final save-transfer audit | PASS |
| Eight deterministic venture reload/spending/weekly-progress/replay cases | PASS |
| Private-result mirror/public mutation-guard probe | PASS |
| Nine actual IndexedDB cases on full Chromium | PASS |
| Same nine cases on macOS system WebKit | PASS |
| Actual installed old build → final updated build/durable save → original reader on a copied legacy career | PASS |
| Final app: 65 consecutive gameplay weeks, normal paid clinic care/navigation, first-week double click, final reload | PASS |
| Fresh process on that completed final career: all tracked player/studio/NPC/talent balances unchanged | PASS |
| Real current-record write quota failure: failed week not applied, committed money/gross/records unchanged | PASS |
| Corrupt current: safe-backup dialog and verified previous-generation UI recovery | PASS |
| 816 initially dirty files and 842 runtime files checked for unrelated changes | PASS |

The nine storage cases include native Date/sparse/undefined/-0/NaN and authored archive fidelity, late quota rollback, actual stored-current corruption, a foreign matching player/signature pair, invalid/unsigned current preserving an existing good backup, retain-previous policy, a frozen genuinely issued schema-4 save upgrading while retaining its exact old body/signature as backup, and independent store-instance transaction coherence.

The real update roundtrip retained **37 film records and 200 posts**, comparing full authored-content SHA-256, protected projections, cinema state and producer/NPC/talent money. The large career's dynasty archive is empty; populated authored archives are covered separately by frozen/native and career-record fixtures.

The optimization-only frozen old/new replay matched every complete persisted-player JSON hash, manifest, payout, RNG count and clock across twelve weeks. That predates the additional intentional NPC treasury correction. On the **final source**, another twelve weeks preserve every prior player and retain identical player cash/receipt rows, RNG count (3,584,433) and clock (1,800,000,024,540); NPC treasury state intentionally retains its correctly credited money. Do not claim final whole-player byte equality with the buggy treasury implementation.

## Performance and memory

- Detailed retained-save component profile: verified save median **1459.1 → 991.1 ms**, about **32% lower**. This is an instrumented storage/preparation benchmark with controlled +$10 changes, not gameplay earnings or a whole-app speed guarantee.
- Readiness calls **426 → 24** for the same 24 titles; the unexposed owned result avoids its two detached-proposal serializations. No financial formula or hard earning cap changed.
- Final 65-week actual-app run lasted **569.494 seconds (9.49 minutes)**, with no forced GC or midrun reload and zero page errors. It is accelerated-cadence evidence, **not a new sixty-minute or physical-iPhone certification**.
- Final app sampled process-tree RSS peak **1779.75 MiB (~1.74 GiB)**; final type/build worker peak **2264.63 MiB (~2.21 GiB)**. One own heavy worker ran at a time; other chats' jobs were left running.
- Global shared swap grew by 4732.75 MiB during the 65-week run, generating a warning; the configured free-memory abort threshold was not crossed. This was not a quiet-machine performance benchmark. An earlier fresh original-build control was stopped by the memory guard and is excluded from performance gates.
- Throwaway checksum/Wasm/unrolling prototypes were not adopted. The issued hashing algorithm is unchanged.

## Remaining work

1. **Under-three-second p95 remains unachieved.** Current costs still include full retained-state processing, signature preparation and independently verified storage. Do not remove money/integrity checks or prune records to reach a number. A future optimization needs a fresh measured design and the same compatibility/fault gates.
2. A sixty-minute session on this final artifact and physical-phone testing remain unverified. The earlier hour-long report used the preceding artifact; it is historical evidence only. No claim covers every possible ninety-nine-hour save/device or all crash conditions.
3. Work is local; this report does not certify a published store build.

## Evidence

- `checks/final-focused-regressions.json`, `checks/release-build-check.json`, `checks/final-authority-comparison.json`, `checks/preservation.json`, `checks/resource-summary.json`.
- `output/playwright/save-path-release-65-weeks/results.json`.
- `output/playwright/save-path-release-storage-recovery/app-check.json` and its quota/recovery screenshots.
- `output/playwright/save-path-release-update-compatibility/results.json`.
- `output/playwright/atomic-save-chromium-verified/results.json`, `output/playwright/atomic-save-system-webkit-verified/results.json`.
- `progress.md` retains the investigation sequence, rejected prototypes, failed regression and interrupted control. Earlier candidates are explicitly superseded by `/private/tmp/actor-save-path-20261030/release-dist`.
