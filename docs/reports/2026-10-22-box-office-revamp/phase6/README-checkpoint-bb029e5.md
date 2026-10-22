# Phase 6: balance, save durability and measured performance

Local verification checkpoint; **not a release approval**. Baseline: `7079d1b8ae8085ac74b266884651bae122afe4d2`. Candidate uses market schema 1, tuning 2. The normal schema-1 path was already active before this phase; no rollout bypass or shipping action was added.

**Verified:** 832 conditional balance treatments, 23 tendencies and 130 selected existing-save engine weeks pass. **Still open:** ordinary cash-funded career proof failed in bounded attempts; late latency remains high, the global p95 comparison is inconclusive, and full App/device journeys are untested. See [the gate matrix](verification-matrix.json). This checkpoint does not close all Phase 6 readiness gates.

## What changed and why

- **Finite interest.** An opening announcement previously retained opening urgency indefinitely. Initial matched cases kept selling for the entire 104-week observation horizon. Future first-visit interest now halves over four weeks after a two-week opening grace; repeat interest halves over three. Real fresh word of mouth and local discovery carry fresh first-visit interest. This changes demand, not gross or budget multipliers. A quiet run ends through its existing booking logic. No dollar ceiling or forced maximum run was added.
- **Physical local discovery.** The previous poster path granted chain-wide other-film footfall from one screen, and could persist with zero shows and no booking cost. It now requires actual booked exhibition and scales contacts by that title's scheduled screens divided by the pool's physical screens. Other-film paid attendance remains the only source. Empty unused access generates no contacts. The existing positive discovery test now represents an actual small venue with room for both films.
- **A real premiere is an announcement.** Offered films with a preselected theatrical strategy could bypass the wizard and never announce their famous cast. The actual premiere commits the same idempotent announcement; it invents no paid campaign.
- **One paid-ledger retention bound.** A real founder soak failed verified save compaction at week 39: cinema retained up to 160 studio rows while canonical normalization/compaction retained 104. All now use the same 160-row constant. Protected receipt IDs and cash survive; the integrity guard, generation promotion and persisted-before-UI order remain in place.
- **Snapshot route lookup.** The CPU trace showed repeated full streaming route scans for every title and buyer source. One immutable country/platform projection now reuses route lists and ID sets, keyed by country, week, route and plan. Budgets, entitlements, readiness, language, dates and signed rights still decide access. All overlapping rights positions remain in the list. There is no global or persisted cache. Constructor output hashes match before/after, including 617,443 royalty rows; a separate next-week test with prior purchases also matches and prevents reselling the same permanent ownership.
- **Safe tuning upgrade.** Known tuning 1 verifies before migration. Upgrade changes the two tuning tags only and re-signs after normal migration. Nonempty paid receipts, gross, cash, IDs, existing audience and signed contracts stay intact. Future/partial/corrupt paid states still reject recoverably.

## Matched conditional balance

24 required contrasted cases x 32 fixed seeds, plus 64 matched cameo and weak-crossover controls: **832 treatments, 53,469 title-weeks** after calibration. All **23 tendency checks** and weekly hard constraints pass. Fixed cohorts are authored aggregates for three countries; prices and chain capacity come from the actual country/chain supply model. These are conditional scenarios, **not game-wide hit probabilities or forecasts**.

| Conditional fixture | Before median public gross | After median public gross | After median producer profit | After positive profit |
|---|---:|---:|---:|---:|
| targeted-indie | $1,278.4M | $157.3M | $70.3M | 32/32 |
| weak-two-stars | $329.8M | $122.1M | $5.6M | 27/32 |
| earned-crossover | $5,491.5M | $1,122.1M | $249.2M | 32/32 |
| weak-crossover | $1,608.5M | $596.1M | $-6.7M | 14/32 |
| late-sleeper | $1,111.9M | $14.4M | $4.6M | 32/32 |
| extreme-demand | $66,740.3M | $10,315.6M | $4,096.8M | 32/32 |

Profit above is realized producer receipts minus production, campaign and exhibition booking costs. Public gross does not go directly to the player. The targeted indie seeds deliberately all have good delivered quality (70–90), a real paid campaign and no rival; 32 profitable seeds do not imply every small film succeeds. The weak crossover seeds deliberately vary $150–350M production cost, so an earned universe can lose money after weak payoff. The extreme case deliberately quadruples its authored population, greatly raises spend and uses all chains; its multi-billion gross demonstrates no artificial $3B exit, not a normal earning expectation.

Checks also cover no free worldwide tickets, new-country access without awareness, duplicate fans, meaningful lead versus cameo, streaming catch-up, cadence fatigue, local language, recession, competition, cheap versus unaffordable tickets, seats, campaign saturation, known streaming wait and late sleeper discovery. Every week checks integer cents, receipt conservation, aggregate wallets/time/seats, first admissions within unseen requested people, repeat admissions within eligible requested people, and unique <= aware <= population.

The initial 52-week run is preserved separately as `calibration-initial.*`. Its proposed rule that a larger campaign must have lower profit was rejected: a larger campaign may legitimately earn more. The final saturation check measures diminishing impressions/sales instead. Matched `calibration-before.*` and `calibration-after.*` use identical final authored scenarios and seeds; the before run intentionally fails old urgency, weak payoff risk and cadence tendencies. No hit/flop quota was tuned.

## Save and career evidence

The final selected source run completes **130 actual engine weeks** across founder-small, established-studio, offered-universe, legacy-active and late-handoff saves, with all persistence/financial assertions passing. The first four are 26 weeks each (104 total). Their windows are censored: paid opening/repeat/reload/retry does not prove a theater exit. The separate old playable title actually exits and signs streaming rights. These are explicitly authored existing saves; a prepared founder with studio capital is not a fresh $2,000 owner.

**Ordinary cash-funded career gate: not passed.** An initial 156-week aggressive starter reached production/opening/exit/streaming but ended at **-$240,948**, did not record campaign-time cash and lacked an alive/death assertion. It is not proof of a sustainable playable career. A separate job-and-recovery run never reached production in 156 weeks. A temporary-work-break observation subsequently entered deficit by week 104 without a campaign and was stopped. These bounded authored strategies do not establish that every normal player career fails; they leave life/choice handling and the real App journey unverified. No casting, health, initial skills or earnings rules were changed to manufacture success. The current harness explicitly rejects a dead or unfunded starter and requires a recorded positive earned-cash campaign before claiming that path passed.

The fresh fixture retains INITIAL_PLAYER's $2,000, age 15 and skills/fame, matching the base used by `handleStartGame`; the tutorial/premium/full UI path is not exercised. Attempts use catalogue courses, generated jobs/auditions, actual 20-energy practice and funding checks. The revised strategy ranks public difficulty/genre fit, saves a campaign reserve and takes temporary work breaks; future validation must also handle actual health conditions and life choices. Even a successful actor path would not prove fresh studio ownership.

Every saved week uses actual `processGameWeek` and `prepareVerifiedPlayerForPersistence`, then the actual current/candidate/previous generation coordinator. The test store implements atomic promotion and injected promotion failure; real IndexedDB is measured separately in the browser. Source player mutation, cash/receipt conservation, legacy gross preservation, repeated week IDs, duplicate settlement, JSON reload and failed-promotion retry are checked. Actual device crash/disk-failure testing is not represented by this memory adapter.

The large-save regression guard formerly rejected all JSON.stringify calls, including legitimate tiny route/receipt tuples; that failure reproduces on the baseline too. It now rejects direct or wrapped player/world graphs and self-tests those rejections while allowing small tuple keys. 50/100/400MB size estimation and verified migration checks remain. The English baseline is never recaptured.

## Performance evidence and limits

Serial desktop trials completed: three alternating paired early trials (16 warm Node samples each; 8 browser clicks, cold separate). Median trial p95 is **512.0 -> 517.2 ms (+1.02%)** for Node total and **482.5 -> 465.9 ms (-3.44%)** for warm browser event-to-summary-paint. These early comparisons meet the relative 10% threshold. One late candidate trial passed 8 warm Node samples and 8 browser clicks: Node total p95 **14,754.8 ms**, browser warm p95 **12,014.5 ms**, browser cold **17,569.7 ms**. Late latency remains high; this is not a device-readiness pass. `performance.json` records compute, persistence, market, size, heap, sample counts and limits. Fixed early/late JSON files are baseline-generated, clock-aligned authored saves, with matching SHA256 hashes; the late save has 1,500 projects, 2,000 plans and 6,000 rights. Module initialization and weekly randomness are seeded. Timed runs wait for all heavy soak/audit work to finish. The original malformed late fixture clock was repaired before matching; out-of-order diagnostic runs are excluded.

Node measures actual week compute, verification preparation, verified in-memory generation persistence, UI projection, separate market module, bytes, retained heap and admission allocation row counts. Browser measures verified IndexedDB write/read before a React summary paint, in fresh headless Chromium contexts, 390x844 viewport, without CPU/network throttling. It is an isolated QA page, not the full App or a native device. The raw browser captures called JSON string length `saveBytes`; that value is UTF-16 code units, not UTF-8 bytes. The summary and current harness label it `saveJsonCodeUnits`; Node uses actual Buffer.byteLength. Heap readings are retained heap observations, not cumulative allocation volume; allocation rows are logical tickets, not JavaScript allocator counts. We do not claim a native bridge/GPU allocation profile.

The exact late baseline already failed the protected studio-ledger compaction guard and has zero valid late latency samples. Its elapsed failure time is not a p95. Therefore the **global <=10% p95 regression gate remains inconclusive**, even if individual early trials improve. The independent 121.5s -> 4.2s route-constructor observation is diagnostic and was concurrent with other tests; it is not the formal total-week speedup. A real-device/mobile check and full App career UI journey remain untested.

## Reproduce scoped checks

```sh
node scripts/run-box-office-audit.mjs calibration
node scripts/run-box-office-audit.mjs placement
node scripts/run-box-office-audit.mjs migration
CINEMA_LONG_CASES=founder-small,established-studio,offered-universe,legacy-active,late-handoff node scripts/run-box-office-audit.mjs long-save
node scripts/run-box-office-audit.mjs release-announcement
node scripts/run-box-office-audit.mjs save-boundary
node scripts/run-box-office-audit.mjs viewing-routes
npm run audit:save-integrity
npm run audit:save-generations
npm run audit:large-save-integrity
npm run audit:streaming-commercial-c4
npm run lint
npm run build
```

The selected existing-save command above passes 130 actual weeks. The **ordinary gate is explicitly open**: `CINEMA_LONG_CASE=ordinary-starter node scripts/run-box-office-audit.mjs long-save` is not an all-green claim and must fail when its living/funding/production/campaign conditions are unmet. The default all-style suite has a maximum 338-week horizon (208 starter, 26 each other style), but stops a starter only after an actual verified paid opening. Reports record executed weeks separately from the horizon. `CINEMA_LONG_STOP_AT_OPENING=0` requests the full observation; `CINEMA_LONG_CASE(S)`, `CINEMA_LONG_WEEKS`, `CINEMA_LONG_SAVE_OUTPUT` select a bounded subset. `CINEMA_STARTER_STYLE=overwork` retains the adverse action policy; default `sustainable` reserves recovery energy, funds a campaign and budgets work breaks. The style name is an intended policy, not a verified success label. Current future attempts also preserve offered-role energy costs and exclude explicitly streaming-only offers; no forced theatrical conversion is accepted as normal-UI proof.

For matched performance, use an isolated baseline archive and candidate containing only owned files, the same fixture directory, and alternating trials. `node scripts/run-box-office-benchmark.mjs --write-fixtures` prepares authored inputs; `CINEMA_BENCH_FIXTURES`, `CINEMA_BENCH_NAMES`, `CINEMA_BENCH_WEEKS`, `CINEMA_BENCH_OUTPUT` select the measurement. The runner seeds before importing game modules. The QA Vite config serves only the known early/late fixtures on localhost. `benchmark-box-office-browser.cjs` uses `PLAYWRIGHT_MODULE`, `CINEMA_QA_URL`, `CINEMA_BROWSER_FIXTURES/WEEKS/OUTPUT`; each run closes its isolated browser context. Never use a real player's save slot for this harness.

## Release decision

See the final verification matrix for measured pass, failure, inconclusive and untested rows. Source/audit pass, desktop diagnostic improvement and a build do not constitute device or production readiness. No push, merge, native release or rollout change is part of this checkpoint. Original unrelated dirty work stays untouched.
