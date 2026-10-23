# Offered packages, NPC targeting and finance labels

Implemented and verified on 2026-10-23. Gameplay sources were included in workspace commit `205a93c40dcd95f30f8703d84591462f6714f427` by concurrent workspace work during this verification. This report does not reset or alter that work.

## Behavior

- Future generated offers contain a principal actor. The player's signed minor/cameo credit stays unchanged. Existing authored casting and explicit guest cameos are preserved; generic generated co-star credits can be repaired. Recognition comes from real catalogue facts or their saved identity snapshot.
- An offered film's premiere commits one affordable producing-studio campaign. Its NPC treasury pays, in exact cents converted to treasury millions, after reserving committed spend and four weeks of operating costs. Actor posts, followers and personal cash do not fund this campaign. Cash shortage reduces spend to available cash, including zero. A legacy studio can initialize its AI metadata without replaying historical expenses.
- The premiere decision is recorded on the project, with one studio ledger identity. Already released titles, paid campaigns, campaign reserves and player-owned studios are excluded. Existing active/history releases receive no retroactive cast repair, new marketing debit or receipt rewrite.
- New NPC releases and paid campaigns share explicit country IDs. Language compatibility, primary versus secondary language, eligible cinema households, purchasing power, priority-market preference and current theatrical competition guide limited placement. Broad releases retain broader compatible access. No subtitles/dubs are invented. Empty explicit geography grants zero access; absent legacy geography retains prior defaults.
- The finance panel separates theatrical cost recovery **before backend/financing**, collected all-media project profit, studio return after financing and recorded actor career earnings. It labels live runs as in progress, excludes future media revenue and describes a result within 5% of paid cost as near break-even without rounding away its actual loss. New NPC closures no longer publish a flop event for these small deficits. Material losses still do.
- Audience conversion, ticket pricing, physical supply, cash settlement and lifetime earning potential retain the shared engine. No earning cap, automatic-hit quota or blanket revenue multiplier was added.

## Matched comparisons

Twenty-one controlled runs: seven treatments over seeds 0, 1 and 2; canonical 197-country cohorts, rival slate and home-viewing alternatives. All closed naturally before the 104-week observation horizon. Each film costs $17M; paid treatments spend $1.36M on campaign. No investor/backend contracts were attached to these controlled packages. Profits below subtract production, paid campaign and booking costs from theatrical producer receipts, with no future streaming or soundtrack money.

| Controlled case | Gross across seeds | Theatrical profit / loss | Run | 95% of gross |
| --- | ---: | ---: | ---: | ---: |
| Old offered package, no studio campaign | $0.974M | -$16.533M | 17 weeks | week 10 |
| Repaired offer, quality 65, funded targeted campaign | $39.625–39.626M | +$1.056M | 37 weeks | week 14 |
| Same funded offer, quality 30 | $22.660M | -$7.257M | 33 weeks | week 13 |
| German, quality 81 / known lead, old Africa placement | $10.356–10.367M | -$12.871–12.865M | 26 weeks | week 13 |
| Same German package, compatible countries | $43.173–43.174M | +$3.658–3.659M | 37 weeks | week 14 |
| Spanish, quality 81 / known lead, old Africa placement | $10.398–10.409M | -$12.849–12.843M | 26 weeks | week 13 |
| Same Spanish package, targeted placement | $68.248M | +$15.081–15.082M | 39 weeks | week 14 |

The known-lead NPC cases are conditional strong packages, not typical no-star indie outcomes. These seeds vary audience allocation/rivals around a fixed package, so their close numerical results are not evidence of broad career outcome diversity. They demonstrate that the repaired inputs can support a modest profit while weak delivery still loses money. They do not establish a new population-wide hit rate or replace the earlier normal-career samples. Long low-volume tails remain visible: 95% of these films' revenue arrives by weeks 10–14, while final retirement occurs later.

Matched owner-route openings give the same paid result for accepted-role, player-studio and NPC routes. Extra unused worldwide access creates no extra opening tickets when awareness, interest and nonbinding capacity are held constant. Real organic awareness outside a narrow release may legitimately convert when access expands; that was excluded from the unused-access control.

The matched matrix preceded follow-up edge guards for signed cameos, explicit empty geography, prepaid legacy campaigns and studios without AI metadata. Those branches are absent from the measured packages; the final focused regressions and production browser checks exercise the completed patch.

## Verification

- **14 final suites, 238 passing assertions/logged cases**: inputs, offered/NPC package regressions, awareness, phase-two integration, audience, market, migration, live integration, finance contracts, finance render, presentation, rights, booking and release announcements.
- Actual premiere through `processGameWeek`; JSON reload; duplicate receipt rejection; investor/actor backend; verified candidate save; failed promotion; previous-good recovery and successful retry. Existing signed money terms stay intact.
- The live integration regression retains a migrated film above $3B and allows further paid receipts. This checks absence of an old lifetime cap, not the frequency of newly earned billion-dollar releases.
- Source TypeScript check passed over **861 application/audit roots** using a temporary bounded source configuration. This is not a claim about every generated/native JS root in the default repository-wide config.
- Guarded production build passed: 2048MB heap, **2678.3MiB peak owned process-tree RSS**, no memory stop.
- Production browser loaded the retained earned normal-career awaiting-release save into an isolated browser store. Real Age Up premiered **A Prime Moon**: $7,718,660.84 opening gross, $1,375,408.80 producing-studio campaign, same minor player credit and a principal co-star. Actor cash rose by exactly $9,675 salary + $400 job pay. **51 retained earlier receipt records were byte-identical**.
- Reload + next Age Up: gross $14,175,375.06, campaign ledger entry **one**, salary payment **one**, personal cash $42,700 (only another $400 job salary). The finance report explicitly showed an ongoing run, exact collected economics and exclusion of future revenue. Mobile panel had no horizontal overflow.
- Browser: no page errors/crashes; **2707.14MiB peak owned process-tree RSS**; browser and local server closed. This turn used one heavy verification worker at a time. Native testing was not performed, per the user's browser-only instruction.
- Static server rendering of the dashboard still emits its existing Recharts no-layout-size warnings; assertions pass. The production build retains its existing large-chunk advisory.

Evidence: [matched results](evidence/matched.json), [suite exits](evidence/checks.json), [browser facts](evidence/browser-checks.json), [build memory](evidence/build-memory.json), [browser memory](evidence/app-memory.json).

## Repeat

Run suites sequentially with `NODE_OPTIONS=--max-old-space-size=1536 node scripts/run-box-office-audit.mjs <suite>`. The controlled matrix uses suite `matched-package`; set `CINEMA_MATCHED_OUTPUT` to a writable report path. Production build: `LOW_MEMORY_BUILD_REPORT=/private/tmp/build-memory.json npm run build -- --outDir /private/tmp/cinema-dist`. Do not run build, matrix and browser concurrently. Browser QA bridge and test-save copies stay outside the shipped App entry and outside player storage.
