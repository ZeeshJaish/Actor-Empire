# Talent settlement and AI studio parity — phases 3–4

Date: 2026-09-27

## Delivered

- Player Greenlight now records named cast/director/writer project credits. Actor/director upfront amounts are credited from the already-funded Greenlight budget; a writer's fee is credited at the actual script-assignment or sequel-writing debit, not a second time at Greenlight.
- Positive, title-attributed studio receipts from theatrical, streaming-upfront, streaming-royalty and soundtrack paths settle optional backend contracts once per source/week. The player studio records the expense separately from revenue; older projects without contracts owe nothing.
- A save-local, bounded NPC career ledger records project credits, upfront income, backend income and new awards. Forbes ranks named writers as well as actors/directors, including paid locally generated writers, and overlays this saved income without mutating the static NPC database.
- New screenplay ballots/winners use the credited writer, including eligible player-studio films with hired writers; uncredited legacy films use an honest team fallback. Existing award history is not rewritten.
- New independent AI-studio productions deterministically select and book a stable writer alongside cast/director, allocate affordable upfront fees within the existing milestone budget, credit those fees only after production financing reaches the paid production-start milestone, and settle optional backend from actual release receipts. Canonical released projects and ownership handoffs retain writer identity and contract state. Existing in-progress AI productions with an in-house writer remain valid and have no retroactive talent obligations.
- Production normalization and save compaction/migration preserve new writer IDs, talent terms and paid receipt keys.

## Verification

- PASS: focused phase 3–4 career/receipt/award/save-roundtrip audit; Greenlight phase 1–2 and project-builder audits; AI-studio talent, economy, turnaround, commercial-result and live audits; industry talent-booking audit; AI-studio 400-year deterministic audit (520 releases, zero duplicate IDs); save migration, fresh-save weekly progression, week-processing save safety, award-season timing and deterministic-awards audits; production Vite build; scoped `git diff --check`.
- TypeScript with an 8 GB Node heap reports only four existing errors outside this phase: `App.tsx` (union narrowing), `index.tsx` (two root-boundary errors), and `scripts/audit-ios-long-session-soak.ts` (missing `aiCatalogue` type). Default-heap TypeScript checking OOMs in this checkout.
- Two broad audits in the current checkout remain failing: `audit:studio-ai-production-state-b6` expects 105 compacted production records but current compaction returns 111; `audit:award-competition` fails in its year-boundary world-scheduling setup. The new focused assertions within the state audit pass before its count assertion. Attribution for those broad failures is not established. No device-level UI run was performed.

Phases 5–8 (content-market generator, rival competition, paid scouting and long-save balance closure) are not included.
