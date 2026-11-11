# Safe weekly latency implementation plan

Goal: reduce actual tap-to-verified-save-to-screen latency toward p95 <3s while preserving old careers, existing payments, rollback and previous-good recovery. User approved implementation and existing minimums: iOS 15 / Android 7. One bounded worker; no other chats stopped. No new earning cap or record trimming.

This continues the approved existing-pipeline optimization. Initial inventory: 924 dirty/untracked files, 845 runtime files; unrelated work must remain intact. Report and frozen source live in `docs/reports/2026-11-04-week-latency/context.json`.

- [x] Read current source and previous evidence; freeze current baseline and capture profiles.
- [x] Run equivalent actual-app baseline. First attempt had missing QA slot metadata and is excluded; corrected fixture uses slot3 and existing version.
- [x] Test per-call key-order reuse in exact cinema serialization. REJECTED and reverted after retained-data timing did not improve; exact identity source remains unchanged. Two other slower hash/fingerprint prototypes remained throwaway experiments.
- [x] Test first: classify each history row once and compute shared world-window protection once per compaction, preserving duplicate-ID, terminal-limit, active rights/awards/payment and ordering behavior exactly.
- [x] Reproduce missing browser APIs and install conditional compatibility fallbacks without overriding working native APIs. Add explicit opt-in diagnostic size measurement and verify old signatures with their issued projection once. Retain minimum targets; don't equate capability/CPU emulation to physical-device certification.
- [x] Compare complete deterministic player/manifests/RNG/clock against frozen current source. Twelve weeks match exactly; native and missing-API clone paths also match exactly.
- [x] Run integrity/migration/archive/payment suites, actual old-save update/reload, physical-write quota rollback and corrupted-current recovery on final artifact. Current Chromium and macOS WebKit storage checks pass; separate throttled/missing-API app journey passes.
- [x] Final root types/build, actual continuous gameplay latency samples and bounded-memory checks. Final twelve-week artifact: median3.390s,p954.957s. Preceding forty-week pipeline artifact: median3.175s,p953.442s. Full records and verified save barriers retained.
- [ ] Under3s end-to-end acceptance: NOT MET. Physical older-device and new full-hour session certification remain unverified. See the final results report; do not describe this plan's latency goal as completed.

Initial measurements: Node loop2330.6ms, prepare456.3ms, file-store write629.6ms (file transport is not browser proof). Actual browser storage preparation375/281/274ms and verified save910/898/857ms. Preparation CPU points at protected hashing and world/platform history compaction; week CPU includes exact canonical serialization. Retained payload is mostly world state, so archive-only migration is not selected.
