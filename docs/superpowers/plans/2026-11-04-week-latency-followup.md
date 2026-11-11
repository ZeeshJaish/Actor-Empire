# Weekly latency follow-up implementation plan

**Goal:** Verify tap-to-verified-save-to-ready-screen p95 below3s where measured, while preserving every paid fact, old reader, backup and older-browser fallback.

**Architecture:** Continue the user-approved bounded optimization in this checkout. Profile the exact final app and deterministic world loop before selecting a change. Prefer eliminating repeated derivation inside a single synchronous operation; no mutable-object hash caches, weakened checks, early UI success, format/schema changes or archive trimming.

**Execution:** One inline worker. Compiler heap≤2048MiB; tests/browser sampled owned process-tree RSS≤2560MiB. Production builds use the repository's existing medium-memory3GiB RSS/512MiB swap-growth guard plus the outer free-memory guard, after stricter attempts failed. Other chats remain running. Source/dirty-file snapshot is in `docs/reports/2026-11-04-week-latency-followup/context.json`.

## Tasks

- [x] Capture current901 runtime/config files and1010 dirty files before touching production code.
- [x] Profile current `processGameWeek` with `scripts/profile-weekly-pipeline.ts`, retained owned-career fixture, deterministic RNG/clock and prior-player immutability assertion.
- [x] Capture built-app CPU/interaction boundaries with `scripts/audit-week-latency-soak.cjs`. Record automation wall time, actual click event, durable transaction completion and rendered readiness separately; retain existing full wall-time measurement.
- [x] Identify measured repeated work and write RED/GREEN tests: whole-market population clone, intelligence-only projection, repeated title-cast normalization and source serialization for a synchronous player-only cinema close.
- [x] Separate the internal player-only close from public/detached proposals. The internal input/result never escapes; source-string generation remains mandatory for every exposed proposal. Keep all existing cash/authority/clock/conservation/replay and actual stored-current verification checks. Reject attempted public settlement of an internal marker.
- [x] Eliminate zero-funded sorting/rival catalogue routing while preserving zero-source receipt ordinals; verify exact frozen receipts and hand-checked integer rounding/conservation. Leave the read-back-body cache and slower hash prototypes unshipped.
- [x] Implement only confirmed repeated work. Leave slower hash and additional-body-cache prototypes unshipped. Public mutation/issuance checks and stored-current read-back verification retained.
- [x] Twelve full deterministic frozen/current weeks EXACT: complete player JSON, manifest, money, receipts, RNG/clock and prior-player immutability. Missing-API fallback replay also EXACT.
- [x]33 focused suites, root types and bounded2048MiB production build PASS. Chromium9/macOSWebKit9 atomic cases, actual old→new→old reader, quota and corrupted-current recovery PASS. Interrupted process's last committed40-week state preserved.
- [x] Final artifact completed40 uninterrupted UI weeks and reload: conservative command-to-paint p952.943s,38/40under3. A preceding same-artifact pressure run's40 turn observations remain recorded; its closing reload was guard-aborted and p953.350s misses the target. Missing-API/2xCPU/512MiBheap3-week functional smoke PASS~7.1–7.6s. No forced GC/mid-session restart.
- [x]1010 initially dirty/901runtime files preserved outside scoped changes; exact final artifact/source hashes recorded. Report conditional confirmation pass and all limitations.
- [ ] Pressure-independent3s acceptance, physical older-device certification and a new full-hour session remain unverified/unmet; do not describe those as completed.

Current prior evidence: final12-week median3.390s,p954.957s; preceding40-week artifact median3.175s,p953.442s. Missing-API/2xCPU/512MiBheap3-week run6.962–7.299s. Physical older devices and a new full-hour session are unverified. Do not reinterpret a component win or a faster tail as complete target acceptance.
