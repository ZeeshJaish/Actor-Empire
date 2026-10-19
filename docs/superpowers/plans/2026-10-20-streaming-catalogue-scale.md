# Streaming catalogue scale repair

Approved by user after the 52-title remaining-lag analysis. Work continues on the existing `codex/streaming-tap-lag` branch; rollback checkpoint and first repair remain committed.

- [x] Reproduce scaling at 52 titles and 197 markets; identify hidden HQ reads and global step updates.
- [x] Preserve equivalent 52/104-title baseline and failing active-screen workload test.
- [x] Share current catalogue context while preserving canonical rights/readiness results.
- [x] Resolve HQ view models only when consumed; keep hidden dashboard out of full-screen rooms.
- [x] Retain relevant presentation inputs across pure navigation/draft/auction-clock updates.
- [x] Make wizard step saves cheap and preserve immediate durable draft/step recovery.
- [x] Reuse market shelf across navigation/query changes, invalidate real market/right/config changes.
- [x] Pass save, rights, auction, launch and build regressions; TypeScript/build.
- [x] Verify actual Anshu save plus production lab at52/104 titles, compare equivalent medians, leave local ready.

Do not disable autosave, defer authoritative ownership/fund commits, alter filing energy or weaken transaction/launch validation. CPU/SSR timings and browser frame observations are separate evidence.
