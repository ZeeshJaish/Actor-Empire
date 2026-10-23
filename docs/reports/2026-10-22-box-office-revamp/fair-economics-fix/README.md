# Fair box-office economics fixes and verification

This follow-up implements the approved profit-reporting, booking-agreement and NPC budget/release-targeting repairs. It also replaces concurrent long-career verification with one capped, resumable worker after the user reported severe computer memory pressure. Numerical evidence is in `evidence/`. Interrupted observations remain explicitly interrupted; they are not presented as completed careers.

## Product changes

**Project profit and studio return are separate.** Whole-project profit uses collected receipts less full paid production/release costs and contracted talent backend. Investor distributions divide the financing return and are not deducted a second time against the full production cost. Studio profit uses net collected studio receipts minus its own funded cash at risk. Applied platform production cover is recognized once against the already paid production cost; it creates no new spendable cash. Public ticket gross, collected receipts, financing distributions and actor earnings remain separate. Future rights revenue is not forecast into collected profit.

**New standard bookings use the existing revenue-share arrangement.** A producer no longer pays an invented per-show rental on top of the cinema share and distribution deduction. Cinema operating costs remain part of the exhibitor's booking/viability decision. An explicitly quoted paid-show contract still charges its quoted fee. The contract and its per-pool price freeze into saved cinema facts. An already active tuning-1–4 film retains its legacy fee arrangement; no historical booking charge is refunded or recalculated. Tuning 5 changes future behavior without resetting audiences, signed shares or paid receipts.

**NPC release decisions match package, language and paid campaign geography.** A streaming-rights timeout can lead to a viable wide theatrical release rather than forcing every film into limited release. Prestige and explicitly limited packages retain those strategies. Limited campaigns target the fingerprint's actual priority market/language region; worldwide campaigns are funded worldwide campaigns. Cinema access itself creates no awareness or audience. If campaign cash is unavailable at planning or launch, the production holds and re-enters review without spending or claiming a release. A known selected fingerprint remains usable when an optional execution snapshot is absent.

**New NPC movie proposals price the production scope.** Modest story/star packages can use lower budgets; effects-heavy packages require more production cost. The curve uses story risk, commercial scope, nonlinear star package cost and an effects multiplier, with the existing affordability bands. This affects new production-studio MOVIE proposals only. Persisted fingerprint curves, greenlit production budgets, episodic/platform proposals and player-authored budgets retain their existing terms. No demand multiplier, gross ceiling, guaranteed recoupment or hit quota was added.

## Balance evidence

**628 actual normal-career weeks were observed across five seeds:** four interrupted 105-week windows and one completed 208-week career. They use the same ordinary starter/action policy, with no studio capital grant. There are 268 title-by-career observations, representing 119 canonical title IDs; those observations are correlated across careers. Of 174 completed, cost-known theatrical observations, 70 recouped (40.2%), including 15 hits (8.6%); 104 had a theatrical loss (59.8%). Another 94 runs remain open and are excluded from those financial rates. A hit means theatrical project profit of at least 60% of production budget, matching the existing NPC threshold.

| Observed window | Closed films | Recouped, including hits | Hits | Theatrical loss |
| --- | ---: | ---: | ---: | ---: |
| Seed 0, 105 weeks | 22 | 9 | 2 | 13 |
| Seed 1, 105 weeks | 22 | 9 | 1 | 13 |
| Seed 2, 105 weeks | 21 | 10 | 2 | 11 |
| Seed 3, 105 weeks | 20 | 7 | 1 | 13 |
| Seed 4, completed 208 weeks | 89 | 35 | 9 | 54 |

The more mature cohort from seed 4 (released in its first 104 weeks, followed for at least another 104) has 37 closed films: 17 recouped, including 7 hits, and 20 had theatrical losses. The five closed NPC observations at budgets up to $10M include three recoupments, one of them a hit. Across all films up to $25M, only 5 of 16 closed observations recouped; that small and mixed-quality sample does not establish fairness for every small-film strategy. No normal-career film crossed $1B in these windows; the largest observed gross was $314.79M. The older four-by-208-week baseline uses different follow-up windows, so no causal before/after percentage is claimed.

**40 controlled full-world cases closed naturally**, across four seeds per package, with 197 countries and existing streaming alternatives. These isolate conditions; they do not measure industry-wide odds. Amounts below are millions of dollars, before financing and future streaming income.

| Controlled package | Gross range | Theatrical project profit | Last market closes, weeks | 95% of gross by week |
| --- | ---: | ---: | ---: | ---: |
| Focused small, $2M + $0.5M campaign | 14.35–34.97 | 4.62–14.87 | 31–51 | 14–21 |
| Same small film, wider access, same awareness | **Exactly the same per seed** | **Exactly the same** | 31–51 | 14–21 |
| Unknown worldwide film, no awareness | 0 | −2.00 | 3 | No paid tickets |
| High-quality sleeper, little initial awareness | 1.90–2.77 | −1.09 to −0.66 | 36–39 | 22–23 |
| Strong stars, $50M + $5M campaign | 481.64–541.42 | 180.87–210.59 | 69–71 | 21 |
| Earned universe event, $200M + $30M campaign | 1,866–2,084 | 680.92–787.47 | 89–90 | 23 |
| Same event without earned buildup | 850.33–1,003.21 | 185.32–260.19 | 87–88 | 27 |
| Weak delivery with an earned fanbase | 427.07–491.18 | −21.85 to +9.46 | 39–40 | 11 |
| Small film facing peak competition | 4.83–12.85 | 0.03–4.14 | 31–50 | 18–27 |

Global run length includes the last local screenings; it is not the number of weeks of blockbuster-level sales. These long tails remain visible rather than being forcibly closed at a gross or week limit.

**The actual advanced-owner game loop also reached $2.314B**, with $627.06M theatrical project profit to date against $300M production and $200M paid campaign. Its last durable checkpoint is week 40 and the film remains open. Four earlier films earned their audiences through actual game weeks. The owner's starting capital and completed craft are authored, so this proves conditional attainability, not an ordinary founder's chance of reaching billions. No $3B milestone is established.

The evidence supports useful preparation, competition, weak-delivery risk and an absent worldwide-access earnings shortcut. It does not establish an unbiased probability for $2–3B films, certify every strategy as balanced, or justify a universal hit-rate target.

## Safety and verification

- Finance regression reproduces the previous investor double-count: a $100M project funded equally by studio and investor, collecting $100M and returning $50M to the investor, has $0 project profit and $0 studio profit. It previously displayed a $50M project loss.
- Migration/settlement regression checks retain exact historical money, paid title facts, receipt IDs and signed shares. A changed booking agreement invalidates a stale live result. Fresh standard fees are zero; legacy fees and explicitly paid custom quotes still charge once.
- Normal careers use actual weekly game-loop progression, real available jobs/auditions/actions and the verified current/previous-generation protocol. A corrected audit-only generated-crisis choice declines an unaffordable $25K option and accepts its real quality penalty. Original audit-policy failures are retained as evidence, not counted as successful careers.
- Browser verification uses a disposable context and isolated IndexedDB, six actual Age Up actions from an earned advanced premiere, opening/final reloads and the rendered finance report at 390px and 320px. It does not open or modify a real user's save.
- The pure controlled-world executable predates the final NPC proposal adjustment. A normalized executable comparison proves the only kernel delta is additive validation of the optional legacy show quote. NPC generation/release evolution is covered separately by corrected-source ordinary observations and the actual earned-owner checkpoint. Executables are pinned because unrelated script/DNA work also changed in this shared workspace.
- All 25 recorded regression suites passed. The final Middle East correction has its own failing/passing release regression: it uses existing ASIA geography and includes Saudi campaign reach. The scoped source typecheck passed at a 1536MB heap limit. The earlier production build passed; the latest minified build hit that limit and failed, so a current minified production build is **not** certified. The limit was not increased. Browser finance verification passed before the final NPC geography correction; finance/settlement behavior is unchanged by that correction. The interrupted later browser attempt is not counted as a pass.
- There were 95 verified writes, 75 reload/migration checks, 628 duplicate-settlement rejection checks and five failed-promotion recovery cases in the ordinary observations. These preserve the current/previous-generation safety protocol and use isolated audit storage. Real player saves were not opened.
- The completed 208-week run used one 1536MB-heap worker, restarted every 13 weeks. Its recorded process RSS high-water mark was 3,223,257,088 bytes (about 3GB); heap limit is not a total memory cap. A split 13+13-week run and continuous 26-week run have identical full-player hashes. Worker/controller kill and duplicate-start guards passed. See [efficient-verification.md](efficient-verification.md).
- These desktop engine, persistence and browser checks do not certify native-device performance or prove an unbiased industry-wide hit probability. Five ordinary seeds use one policy and share studio seed profiles, so film observations are correlated. Ongoing films are excluded from completed theatrical recoup/hit/loss denominators. Theatrical losses exclude future home/streaming income.

## Reproduction

From the repository root:

```sh
CAREER_OUTPUT=/private/tmp/actor-cinema-fair-careers \
CAREER_SEEDS=4 CAREER_WEEKS=208 CAREER_CONCURRENCY=1 \
CAREER_CHILD_HEAP_MB=1536 CAREER_BATCH_WEEKS=13 CAREER_MAX_BATCHES=1 \
node docs/reports/2026-10-22-box-office-revamp/career-economics/run-audit.mjs

node docs/reports/2026-10-22-box-office-revamp/fair-economics-fix/summarize.mjs
```

Repeat the first command with the same output directory to resume one batch; it reuses the pinned executable. Use a new directory for new source. Do not run a build, browser or another simulation alongside it. The second command only aggregates the archived observation manifest and does not start gameplay. `RUNNING` in an archived 105-week report describes the last interrupted snapshot, not a currently active process.

Use `NODE_OPTIONS=--max-old-space-size=1536 node scripts/run-box-office-audit.mjs <suite>` sequentially for the regression suites in `evidence/regression-index.json`. NPC planning/cost tests use esbuild's existing `.csv` text loader. Exact executable hashes, observation limits, resource proofs and compact paid facts are archived; huge raw player checkpoints remain in the task's temporary directory rather than being duplicated into the repository.
