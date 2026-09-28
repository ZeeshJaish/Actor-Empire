# Phase 8 — streaming market long-save and balance closure

Date: 2026-09-27  
Status: **Local implementation and automated/browser QA complete; physical-device QA and release enablement not claimed.**

## Change made

- Generated public, brokered and paid-scout title names now use additional deterministic qualifiers before the base 2,100-name vocabulary wraps. An acquired old title no longer reappears under the same name in a later market cycle. Offer IDs, rights IDs, prices, talent and the saved RNG seed remain unchanged; already-persisted offers keep their original names.
- A mobile browser check found an awkward adjacent repetition such as “The Quiet Quiet…”. The qualifier and scout-prefix vocabulary was adjusted and the long-run audit now rejects adjacent repeated words.
- The approved 20 individual + 5 collection scheduled shelf, premium cadence, $450K linear paid-scout pricing, talent-point caps and bounded rival acquisition rules were not changed without a demonstrated balance failure.

## Evidence

- `npm run audit:streaming-market-long-save-phase8`: 30 years of public/brokered and private-scout names without repeats; 20 years of weekly market/rival/premiere transitions with annual compaction and JSON save/reopen; player shelf stayed at least 12 cards, live generated rights retained their canonical projects, no rival treasury went below zero, and late-game same-week replay was inert. At the end of the soak, the 30-plus rival field still had at least eight canonical historical/authored library positions per rival.
- The 20-year fixture produced 6,940 public film offers (1,041 premium, 15%), mean asking price $13.27M, and 1,226 generated acquisitions across the five core simulated streaming platforms. Thirty-plus additional world rival offers retain the historical-catalogue baseline; the brokered deal simulation is intentionally scoped to five core AI profiles, not all abstract rivals.
- The annual compacted fixture retained at most 900 world projects. Its serialized save rose from ~6.0 MB at start to a maximum ~8.6 MB over 20 years, below the fixture's +3.5 MB growth guard. This is a bounded synthetic fixture, not a device-heap measurement or a promise that every player save is under 8.6 MB.
- Existing Phase 1–2 writer/contract, Phase 3–4 talent, Phase 5–6 opportunity/rival, and Phase 7 paid-scout audits passed after the change. Save migration, legacy streaming-rights, save-transfer, save-transfer OOM and 50/100/400 MB large-save integrity audits passed.
- Isolated browser QA at 390×844 showed 25 initial cards, a visible $450K confirmation, then 45 cards, a $450K treasury debit and a $900K next quote. The QA page used a cloned fixture; it did not touch an actual career. The temporary page was removed.
- Production Vite build and targeted TypeScript checks passed. Build emitted existing large-chunk, Firebase mixed-import and Browserslist-age warnings. The browser's only logged React root warning arose from hot-reloading the temporary QA harness, which was then removed.

## Remaining release gate

No physical iOS/Android device run or real player-save restore was performed in this task. The existing game is not marked release-enabled by this report. Before release, run a native-device smoke test with an exported backup of a representative long career, verify one full cycle and an import/export round-trip, and confirm memory/ANR telemetry on target devices.
