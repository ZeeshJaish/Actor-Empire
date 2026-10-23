# Fair box-office economics fixes and verification

This follow-up implements the approved profit-reporting, booking-agreement and NPC budget/release-targeting repairs. The numerical acceptance evidence is collected in `evidence/`; normal-career aggregation only succeeds after all four 208-week runs finish alive, funded and without audit failures.

## Product changes

**Project profit and studio return are separate.** Whole-project profit uses collected receipts less full paid production/release costs and contracted talent backend. Investor distributions divide the financing return and are not deducted a second time against the full production cost. Studio profit uses net collected studio receipts minus its own funded cash at risk. Applied platform production cover is recognized once against the already paid production cost; it creates no new spendable cash. Public ticket gross, collected receipts, financing distributions and actor earnings remain separate. Future rights revenue is not forecast into collected profit.

**New standard bookings use the existing revenue-share arrangement.** A producer no longer pays an invented per-show rental on top of the cinema share and distribution deduction. Cinema operating costs remain part of the exhibitor's booking/viability decision. An explicitly quoted paid-show contract still charges its quoted fee. The contract and its per-pool price freeze into saved cinema facts. An already active tuning-1–4 film retains its legacy fee arrangement; no historical booking charge is refunded or recalculated. Tuning 5 changes future behavior without resetting audiences, signed shares or paid receipts.

**NPC release decisions match package, language and paid campaign geography.** A streaming-rights timeout can lead to a viable wide theatrical release rather than forcing every film into limited release. Prestige and explicitly limited packages retain those strategies. Limited campaigns target the fingerprint's actual priority market/language region; worldwide campaigns are funded worldwide campaigns. Cinema access itself creates no awareness or audience. If campaign cash is unavailable at planning or launch, the production holds and re-enters review without spending or claiming a release. A known selected fingerprint remains usable when an optional execution snapshot is absent.

**New NPC movie proposals price the production scope.** Modest story/star packages can use lower budgets; effects-heavy packages require more production cost. The curve uses story risk, commercial scope, nonlinear star package cost and an effects multiplier, with the existing affordability bands. This affects new production-studio MOVIE proposals only. Persisted fingerprint curves, greenlit production budgets, episodic/platform proposals and player-authored budgets retain their existing terms. No demand multiplier, gross ceiling, guaranteed recoupment or hit quota was added.

## Balance evidence

Pending final aggregation; do not infer completed-career rates from intermediate progress snapshots.

## Safety and verification

- Finance regression reproduces the previous investor double-count: a $100M project funded equally by studio and investor, collecting $100M and returning $50M to the investor, has $0 project profit and $0 studio profit. It previously displayed a $50M project loss.
- Migration/settlement regression checks retain exact historical money, paid title facts, receipt IDs and signed shares. A changed booking agreement invalidates a stale live result. Fresh standard fees are zero; legacy fees and explicitly paid custom quotes still charge once.
- Normal careers use actual weekly game-loop progression, real available jobs/auditions/actions and the verified current/previous-generation protocol. A corrected audit-only generated-crisis choice declines an unaffordable $25K option and accepts its real quality penalty. Original audit-policy failures are retained as evidence, not counted as successful careers.
- Browser verification uses a disposable context and isolated IndexedDB, six actual Age Up actions from an earned advanced premiere, opening/final reloads and the rendered finance report at 390px and 320px. It does not open or modify a real user's save.
- The pure controlled-world executable predates the final NPC proposal adjustment. A normalized executable comparison proves the only kernel delta is additive validation of the optional legacy show quote. NPC generation/release evolution is covered separately by final normal careers and the final actual earned-owner run.
- These desktop engine, persistence and browser checks do not certify native-device performance or prove an unbiased industry-wide hit probability. Four ordinary seeds use one policy and share studio seed profiles, so film observations are correlated. Ongoing films are excluded from lifetime recoup/hit/loss denominators. Theatrical losses exclude future home/streaming income.

## Reproduction

From the repository root:

```sh
CAREER_OUTPUT=/private/tmp/actor-cinema-fair-careers \
CAREER_SEEDS=0,1,2,3 CAREER_WEEKS=208 CAREER_CONCURRENCY=2 \
node docs/reports/2026-10-22-box-office-revamp/career-economics/run-audit.mjs

CAREER_OUTPUT=/private/tmp/actor-cinema-fair-careers \
node docs/reports/2026-10-22-box-office-revamp/fair-economics-fix/summarize.mjs
```

Use `node scripts/run-box-office-audit.mjs <suite>` for the cinema regression suites listed in `evidence/regression-index.json`. NPC planning/cost tests are bundled with esbuild using the same `.csv` text loader as the existing audit scripts. The full-world and actual earned-owner scenario environment settings are recorded in the final provenance, including censoring/observation rules.
