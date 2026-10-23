# Actor reward pacing and boost-value verification

The user requested experiments before changing gameplay: regular earned early progress, gradual fame loss, useful money/energy boosts, and fair established-career challenge without guaranteed hits or forced flops. Saves, skills, money, ownership, signed contracts and unrelated work must remain intact. No new UI, store pricing changes or live purchases were requested.

## Evidence before implementation

Six current-rule strategies were tried first: the prior selective entry policy, courses alongside acting, cash-only, energy-only, combined resources, and paid agent/publicist. Five completed 52 weeks. The team policy became unfunded in week1 because the actual hire callback charged an annual fee and the weekly engine charged it again. Baseline continuations completed five104-week careers, for **521 baseline game-weeks** including the stopped team case.

Controlled experiments separately compared flat/proportional fame loss and bounded paid learning allowances. One fame point fell to0 under flat decay versus0.8775 after13 quiet weeks with proportional low-fame decay. Established fame retained the same weekly loss. A rookie publicist had positive calculated gain at zero, but the weekly zero-fame guard blocked it.

See [experiments](evidence/experiments.json), the retained RED logs, [scenario comparison](comparison.json), and [weekly samples](curve.csv). Baseline termination at52 was extended without changing player or RNG state. The additional checkpoint boundary means later world outcomes are not a strict causal A/B estimate. Purchases and decisions also change subsequent RNG consumption; these scenarios do not estimate hit probabilities.

## Implemented rules

- Low fame decays by1% weekly, capped at the previous0.18-point weekly decay. No work and no publicist still produce no fame. Existing high-fame challenge remains.
- Paid PR can start at zero. Its existing work/audience/ceiling constraints remain; PR alone cannot manufacture Legend standing.
- New projects receive `careerRewardPacingVersion=1`. Each paid rehearsal can improve role skills, with at most two learning increments per game-week, four before filming and24 across the project. Preparation can still improve after the weekly learning allowance is used. Mastered relevant skills plus100 preparation disable the action rather than wasting energy. Old active projects retain their original eight-action allowance and old finalized performances.
- The existing Career action reads the same learning eligibility as the handler. It permits bounded practice at100 preparation, closes when the weekly/project allowance is exhausted, and reopens next week when appropriate. Existing feedback reports when role skills improve. No screen, scheduling feature or extra button was added.
- A finalized personal performance can earn one small premiere recognition grant. The marker persists in project hidden stats; repeated processing/reload cannot repeat it. It creates no money and does not turn the film into a hit.
- Undisclosed external NPC streaming receipts do not establish producer failure. Newly archived unobserved outcomes are neutral; existing history remains intact while the career arc ignores unsupported commercial labels. Recorded contract receipts, player-owned companies, genuine theatrical losses and poor critical reception retain their consequences. Neutral is not evidence of financial break-even.
- New agent/manager hires record the paid absolute week; the next annual renewal is due52 weeks later. A generic staff member's prepaid first week is not debited twice. Legacy untracked renewals retain their calendar behavior. Signed fee amounts/commissions stay unchanged; no historical refunds or balance repairs are applied.

Base course rates, genre training, weekly free energy, product grants, store prices, signed salaries, cinema demand and profit rules were not increased by this pass.

## Observed104-week outcomes

These are in-game weeks, not real days. Craft is the average of seven acting skills. Purchased game cash is separately recorded in the comparison and is not earned income.

| Strategy | Average craft | Fame | Ending cash | First premiere |
|---|---:|---:|---:|---:|
| Selective free Drama |29.6|0.49|$36,027|Week50|
| Free Drama, classes alongside work |44.6|0.62|$30,124|Week78|
| Same conservative training +25,000 cash |44.6|0.62|$55,124|Week78|
| Free-budget Drama +500 energy |43.8|1.51|$22,332|Week59|
|25,000 cash +500 energy |43.8|1.51|$47,332|Week59|
|75,000 cash +500 energy, paid agent/PR |45.6|14.94|$18,616|Week31|
| Investment-focused free Comedy |43.4|1.27|$6,744|Week50|
| Same investment policy +25,000 cash/500 energy |46.1|0.46|$12,314|Week42|

The conservative cash policy deliberately keeps buying cheap classes, so additional cash remains available rather than automatically creating skill. A separate investment policy uses faster affordable existing classes. That observed boosted Comedy premiere was eight weeks earlier; its eventual fame/credit count was lower than the free sample. Buying resources did not guarantee a better film career.

Action-genre free/heavily funded team scenarios also completed104 weeks. The heavily funded case used200,000 game cash,500 energy and real paid team callbacks. No sampled fresh career reached Legend, and no sampled acting skill reached100. A paid-energy controlled comparison also verified higher real preparation with the same bounded weekly learning. Existing advanced classes were affordable sooner after a cash grant; the grant itself changed no skills or fame.

One deliberately restrictive free Comedy routine had only one application by week81 and no premiere at104; it was in post-production at the cutoff. It is retained as an adverse case, not counted as a successful104-week release flow. Its continuation through premiere and later weeks is recorded separately. This warrants further opportunity/decision-funnel observation; the exact cause is not isolated enough to justify forcing auditions or film success. Universal fast progress is not established.

## Safety and full-flow coverage

- The tuned matrices cover twelve104-week cases across Drama, Comedy and Action, with four deterministic seeds. Final-source cases honor the visible Career action eligibility. Earlier tuned batches precede the UI alignment and no-waste mastery guard; their pin metadata is retained rather than presented as the final executable.
- The prepared established case completed five concurrent Greenlights, focused paid preparation, production, premieres, real sequel development/production/premiere and five later weeks: **72 game-weeks and19 verified save/reloads**. It began with prepared resources, not money earned in a fresh career.
- Legacy production/classes, existing skills/genre XP, signed salary/commission, sponsorship payments, shares and previously earned Legend standing passed **14 actual weeks and15 verified reloads**, without historical repairs.
- Verified persistence also preserves learning counters, fee timestamps/prepayment and one-time recognition markers. Existing project normalization may add canonical identity defaults; the financial/progression fields are checked explicitly.
-18 focused pacing/UI checks, four fee-renewal checks, three boost/persistence checks,29 original balance checks and nine affected regression commands passed. RED logs show failures before the relevant fixes.
- Three isolated matched cinema cases verified owner-route equality, real campaign costs and quality response. With the same$17M package, quality65 produced about$39.63M gross/$1.06M profit, while quality30 produced about$22.66M gross/$7.26M loss. No forced-hit/flop switch was introduced.

## Preservation and limits

The initial17 changed/untracked paths were backed up under `/tmp/ae-reward-pacing-preservation-20261023`. Unrelated cinema reports, cohort scripts and the pre-existing deleted configuration remain in their current state. Fifteen initial paths remained identical; two concurrently edited cohort files were left untouched by this task. No reset, clean, stash, branch switch, commit or push was performed. All existing npm commands were retained.

An optional matched-suite launch initially used its shared default scratch output. It was stopped after two rows. The authoritative21-case report was restored from the saved copy after all21 rows were verified against the original completed-run log. The task's three-case rerun used an isolated output path. The partial run is not counted as a completed suite.

These are synthetic engine/action/model tests with isolated save stores, not a manual phone playthrough or real billing validation. No personal save slot was accessed and no real purchase was made. Real retention, conversion, ad/IAP revenue and long-term monetization effects require matched released-version cohorts. Simulated acceleration is not a revenue guarantee.

Final completion status, extension totals, source hashes and bounded build diagnostics are recorded in the final verification evidence.

Final checks: **1,881 actual career game-weeks**, including521 baseline weeks,1,248 tuned fresh weeks,26 extension weeks,72 prepared established weeks and14 legacy weeks. Tuned/extension/established/legacy cases completed292 verified reloads. The slow case premiered atweek110 and continued to130. All final-source input hashes remained unchanged. Full TypeScript and the guarded production build passed; build peak2,984.9MiB, no guard stop. Existing non-blocking chunk-size/Browserslist notices remain in the build log. See [final verification](evidence/final-verification.json).
