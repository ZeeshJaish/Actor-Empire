# iOS long-session phases 3–8 closure plan

Date: 2026-09-25
Status: In progress; release gates remain closed until proven

## Contract

Preserve every history record still present in an existing save, unchanged weekly outcomes, complete signed backups, and full visual quality on healthy devices. Never overwrite the production app or a real player save during QA. Work in the existing checkout without staging unrelated edits.

## 1. Archive safety foundation

- Add `services/careerArchiveMigration.ts` with an explicit disabled-by-default domain registry, versioned migration marker, and a preparation result that never shortens a collection unless a domain is certified.
- Add `scripts/audit-career-archive-migration.ts`: legacy load, idempotence, failed chunk staging, exact array identity/count preservation, and downgrade rejection.
- Keep archive-backed migration off until domain and transfer gates pass.

## 2. Archive domain certification

- Inventory readers and writers for terminal world production/project history, filmography, X/Instagram, and YouTube. Record eligibility and late-mutation rules.
- For each domain, implement an archive-aware read/write adapter, page/detail UI, bounded append/revision chunks, and stable IDs.
- Require migration ID/count/digest parity, save/reopen, offline UI, failure rollback, and signed Android+iOS round trips before enabling that domain. Do not reconstruct records lost by older compaction.
- Set measured 468/1,000-week hot-state and peak-memory budgets before activation.

## 3. Weekly transaction ownership

- Inventory every in-place write in `processGameWeek` and its called systems, then mark each domain as owned or immutable per stage.
- Replace eager whole-player copying with explicit copy-on-write ownership for changed domains, retaining the verified single-week commit boundary.
- Add deterministic parity against the previous implementation and injected-stage-failure tests that show the input player, finance, and archive root never change.

## 4. Save/transfer and recovery gates

- Complete multi-chunk/multi-slot and old-format import/export tests, including corrupt/missing chunks and interrupted promotion.
- Verify iOS and Android bounded native transfer paths against a mature archived career. Keep archive activation off until both complete.
- Simulate WKWebView termination and save/restore on a separate QA bundle; never install over the production bundle.

## 5. Phase 8 release matrix

- Run repeatable 468- and 1,000-week deterministic simulations, 30/60/120-minute physical sessions on older and current iPhones, background during week/save, memory warning, renderer termination, and visual restoration.
- Capture actual memory, week latency, save size, generation integrity, restart/black-screen counts, and exact build/device IDs. Code audits and a desktop soak are not substitutes for physical evidence.
- Close the roadmap only after all gates pass. Otherwise report the precise open gate and leave the release feature disabled.
