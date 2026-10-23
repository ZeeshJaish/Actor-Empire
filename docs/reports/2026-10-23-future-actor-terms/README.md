# Future actor offers: late-game money balance

The prospective change reduces automatic windfalls while preserving existing wealth, displayed offers, signed packages and actual payout formulas. No quality, audience, hit/flop, energy, store, tax or operating-cost rule was changed.

## What changed

- Famous movie and series salary amounts are unchanged. New backend quotations depend on billing size and this actor's fame/reputation/recent personal work/audience; skill100 and wallet size alone do not earn lead-level points.
- Maximum new movie points: lead1.50, ensemble0.97, supporting0.67, cameo0.03, minor0. Series uses the existing lower base. Actual recent standing can quote less. These are new-offer rates, not caps on player wealth or existing contracts.
- New franchise guarantee reflects the number and billing size of remaining installments and the new package's production budget. The20% signing-bonus rule is unchanged; its value follows the newly quoted guarantee. One role-weighted quoted point rate covers the signed package. Its future installments are then protected.
- A new sequel's upfront concession follows its actual offered points rather than a flat25%. A new independent season offer receives a new quote rather than automatically copying a prior large point rate. Earlier installments and already displayed/signed offers retain their terms.
- Ordinary audition pay, player shares, savings, loans, NPC talent pay, revenue accounting, agent commission and settlement replay protection are unchanged.

## First: eight-seed quotation experiment

Before production edits,264 quotes covered seeds0/7/19/31/43/59/71/97, entry/free/boosted standing, five billing sizes, movie/series and actual remaining franchise packages. Light/balanced/strict options were compared. The moderate option keeps famous salaries and clear upside; the stronger option reduces lead points to at most1%, while the lighter option leaves larger automatic windfalls. The captured pre-change JSON and frozen executable are in evidence. Counterfactual backend on an assumed250M profit is a quotation sensitivity calculation, not an earned payout or simulated hit rate.

## Then: full real-engine multi-seed continuations

Both frozen variants used the identical existing actor policy and source snapshot except the five listed quotation files. Each runs free/boosted × future seeds0/7/19 for52 actual weeks: **12 completed cases,624 additional game weeks**. The free fixture starts at its earned week612, craft98.17; boosted starts at earned755, all seven acting skills100. No player stats, existing cash/contracts, histories, prior performances or resources were edited. Future RNG is explicitly forked per seed. These are two career fixtures under six future-seed branches, not six independent fresh careers or a free-versus-paid conversion experiment.

| Earned route | Future seed | Old-rule cash change,52w | New-rule cash change,52w |
|---|---:|---:|---:|
| free | 0 | $30,435,478 | $25,727,491 |
| free | 7 | $28,014,892 | $25,465,198 |
| free | 19 | $28,880,103 | $22,753,328 |
| boosted | 0 | $1,891,335 | $1,891,335 |
| boosted | 7 | $9,787,819 | $7,656,703 |
| boosted | 19 | $5,717,039 | $5,717,039 |

One matched newly accepted film directly exercises the new backend: **The Sixth Sense**, boosted seed7. Salary remained200,000; personal performance93 and project quality93.16 were identical. Theatrical gross was439,107,226.62 in both, and collected producer receipts were identical. New quoted points were1.37 versus the old2.5, so actual canonical actor payments were2,583,743 versus4,714,859. The cash difference is2,131,116. This is a smaller prospective contractual share of the same successful film, not a forced flop or weaker performance. See matched-payouts.json.

Cash change includes real spending, old backend income, new salaries/bonuses and all other ongoing obligations; it is not solely new-offer income. In particular, old deals can dominate the first year. Existing pending offers and every already accepted multi-film installment remain grandfathered. A signed backlog finishing after this horizon is not counted as future earned income merely because its guarantee is known. Newly observed role-pay totals include auditions, some old displayed offers and booked roles; they are quotation/booking totals, not earned income or exclusively finalized guarantees. See individual cases and payout attribution in cases.json. Changing future guaranteed pay may change subsequent role choices or NPC finances, so aggregate wealth differences are scenario results, not isolated causal film-quality penalties.

These actors remain wealthy. This patch cannot—and deliberately does not—make an existing millionaire poor. It removes uniform lead-level points and flat30–40M guarantees from future small/short packages. Strong personal work, substantial roles and successful films still retain real upside. The first-year actor-only comparison does not establish full studio/streaming empire balance, real-session friction, retention or monetization. A broader released-version cohort remains necessary for population claims.

## Safety and checks

Nine current quote/contract regressions passed after five intended RED failures. They cover billing and personal demand, unchanged quality/RNG and famous salary, new renewal/sequel terms, exact proportional salary concession, variable franchise quotes, no wallet surcharge, old displayed-offer acceptance and real verified save/reload.32-group cinema integration and legacy compatibility (14 actual weeks/15 reloads) passed. Seven earlier naturally earned endpoint checkpoints independently passed verified round trips. Every long case checks persistence and rejects duplicate cinema settlement; this matrix adds168 verified reloads and624 replay rejections. Existing signed acting terms and core streaming financial terms were compared with each source checkpoint.

Affected-source TypeScript and the guarded production build passed (heap2048MiB; peak2431.5MiB). Full-workspace TypeScript is not claimed green; previous unrelated audit errors and raw generated-JS heap exhaustion remain documented in the prior lifetime report. Independent read-only review found no critical production issue; evidence-overwrite and concession-test feedback was addressed. The first parallel build was stopped by its swap-growth guard and is retained in evidence; the final repeat passed. All180 initially dirty/untracked paths were retained, including concurrent unrelated cohort-audit/report edits. Only the scoped roleLogic additions changed an already dirty production file. No unrelated work was restored or overwritten; no personal save, real purchase, reset, stage, commit or push.

## Evidence and reproduction

- [Per-case cash, quoted pay and payouts](cases.json), [group comparison](comparison.json), [same-film payout comparison](matched-payouts.json), [source/prefix safety and checks](verification.json).
- evidence/ contains compressed full action/curve results, pinned source manifests, lineage and verification logs. Raw world checkpoints and executable bundles remain under `/tmp/ae-future-money-*`; their long-term availability is not guaranteed.
- Pre-change quote executable: decompress evidence/prechange-quote-experiment.mjs.gz and run with a **fresh** TERMS_EXPERIMENT_OUT. Its exact old generator code is pinned. The source experiment refuses overwrites or current-generator mislabeling.
- `FUTURE_VARIANT=<new-name> node scripts/prepare-actor-future-money.mjs` prepares a new snapshot from the two earned lifetime checkpoints; replay via the existing run-actor-lifetime runner with DRAMA, six-week batches, LIFETIME_DECISIONS=overbooked, seeds0,7,19 and per-route horizon664/free or807/boosted. This requires the recorded temporary source fixtures; do not substitute an invented maxed player and describe it as naturally earned.
