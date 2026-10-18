# Streaming balance fixes — final verification

16 October 2026 · Local working tree, including the earlier catalog/pricing, Premiere/HQ and Finance fixes.

**Green for the requested calculation fixes and tested money-integrity paths. Profit viability is conditional on content ownership, deal cost, pricing and infrastructure sizing. Subscription remains the strongest profit model in the matched expensive-rights benchmark; these results do not establish equal profitability across the three models.**

## Verification result

- **134 controlled setups; 4,160 complete `processGameWeek` turns; zero tested weekly accounting/state invariant failures.**
- Original comparison matrix: 126 setups / 3,926 turns. Additional genuine funded-refresh cases: 2 setups / 78 turns. Content-cost/terms sensitivities: 5 setups / 130 turns. Owned-library viability case: 1 setup / 26 turns.
- **18/18 defined balance acceptance gates passed.** These are directional, integrity and conditional-viability gates, not a universal target profit margin.
- **41/41 regression suites passed**, including the permanent **246-check balance-fix audit**, catalog/pricing, launch/Premiere, commercial C1–C6, country customer accounting, Finance, save migration/integrity and the new HQ viewing-truth audit.
- Fresh typecheck (`npm run lint`), production build and `git diff --check` passed. Build retains its existing bundle-size/Browserslist advisories.
- Independent review reproduced and then verified fixes for cross-kind ownership over-allocation, suspended-market legacy billing fallback, missing postlaunch title age, movement ID collisions and forecast ownership reservations. No remaining material correctness issue was found in that review.

## What changed

1. **Quality, freshness and delivery affect the shared economic offer.** Rights-valid paid titles determine subscription value; store-only titles cannot inflate paid appeal. Breadth now has smooth diminishing returns beyond 26 titles. New postlaunch licenses and scheduled Originals use canonical program entries, so demand and viewing use the same title facts. Only completed prior weeks feed delivered-service feedback.
2. **Gross churn is separate from net growth.** Cancellations and acquisition both occur during growth; stock, tenure and revenue still reconcile. Movement IDs include their reason so two real movements cannot share an identity merely because their counts match.
3. **Store conversion reflects content value and age.** Player, AI and preview use the shared bounded conversion/allocation rules. Rental and purchase consume the same weekly source wallet, after plan spend. Rights, membership eligibility, included-title exclusions, existing ownership and shared per-title reservations constrain sales.
4. **Suspended markets stop the actual money path.** Known live market records override the planned opening footprint. A valid zero-customer world result remains authoritative when the offer disappears; weekly processing cannot resurrect legacy subscribers or subscription/product receipts. Undeclared legacy saves and prelaunch planning keep their separate compatibility behavior.
5. **Replay guards survive ownership compaction.** Current-week transaction IDs remain recorded after purchase rows compact. Replaying the 1,025th compacted sale cannot create another purchase. Near-saturated rental/purchase settlement and preview remain valid regardless of transaction ordering.
6. **HQ stops inventing a realtime watcher count.** The old minimum-one/subscriber-derived counter is removed. HQ shows recorded weekly title accounts with “watched this week”; it waits for a completed viewing result before showing the spotlight.

## Measured quality and service response

Controlled eight-licensed-title catalog; same timeline, genres, funded Original and plan features. All paid tiers are $7.99. Values are week 26; store prices are $5.99 rental / $19.99 purchase. Income is gross, not profit.

| Licensed title quality | Paid accounts | Weekly subscription income | Weekly gross paid churn | Weekly store income |
| ---: | ---: | ---: | ---: | ---: |
| 20 | 43,710 | $76,626 | 4.23% | $65,720 |
| 80 | 584,628 | $1,024,877 | 2.54% | $300,378 |
| 95 | 861,575 | $1,510,374 | 2.12% | $391,956 |

The quality-95 subscription run records **226,345 gross cancellations over 26 weeks**, despite net subscriber growth. This replaces the old zero-cancellation behavior.

The capacity-pressure scenario delivers about 87% playback during weeks 14–17, before the simulation's capacity response restores service. At week 18 it has **449,644 paid accounts and 3.72% weekly churn**, versus **470,188 and 2.28%** for the healthy control. It subsequently recovers; a late recovered endpoint is not presented as proof that the earlier outage did no harm.

Keeping catalog size/quality constant while replacing one title every four weeks with a newly funded, distinct title yields **1,181,157 paid accounts and 2.04% churn at week 52**, versus **699,424 and 3.01%** for the static catalog. Every new license guarantee is debited: **$13M additional rights cash** in the subscription refresh run. The store refresh run also improves final gross income ($343,026 versus $300,378) while paying $6M for new rights. Simply editing an old title's slate date cannot reset its recorded age.

## Model comparison and rental viability

Actual `quoteStreamingNetworkPlan` network: NYC/LA/CHI, one rack each; **$11.25M upfront, $60,001 quoted weekly operations**, plus actual periodic maintenance. Table values average weeks 19–26, spanning a complete maintenance cycle.

Quoted-network runs receive the same $1B starting capital to keep stress scenarios funded; seed capital is excluded from earned income. The matched benchmark assumes **$1M per external title**, paid once, and the common **$20M funded Original**. It uses subscription $29.99, ads 6 minutes/hour, store $2.99/$9.99. These are comparison points, not universal recommended prices.

| Licensed titles | Subscription actual cash/week | Ads actual cash/week | Store actual cash/week |
| ---: | ---: | ---: | ---: |
| 2 | −$155,407 | −$41,554 | −$40,563 |
| 8 | +$496,388 | +$7,341 | −$18,486 |
| 32 | +$1,400,618 | +$32,536 | +$2,648 |

**Store's +$2,648/week at 32 externally licensed titles is only recurring cash.** Its operating accounting result remains negative after the modeled content amortization, and it has not recovered startup investment. Calling this setup fully profitable would overstate the evidence. Lower-cost counterfactual rights sensitivities were also tested and retained in the evidence; their assumed guarantees are not represented as actual content-market quotes.

**A supported owned-library setup is viable on an incremental platform basis:** 32 existing studio-owned quality-95 titles, $2.99/$9.99 store prices, the same actual three-rack network, and a separately funded $5M Original (the game's supported minimum). There is no invented cheap external rights quote or treasury subsidy. The pre-existing studio library is treated as a sunk studio asset; its original production cost is not claimed to disappear or be recovered by this platform.

- Last-eight-week gross: **$396,908/week**.
- Actual treasury movement after operating costs and periodic maintenance: **+$72,660/week**.
- Modeled content reserve/amortization: **$48,077/week**.
- Cash after maintenance and that content reserve: **+$24,583/week**.
- After 26 weeks, the new Original/network investment is **still unrecovered** (incremental cash after those upfront purchases: **−$16,779,012**). Positive mature-week cash does not mean immediate investment payback.

Subscription still has a large cash advantage when all models pay the same expensive rights bill. Rental works with a sufficiently strong owned library and cost discipline; expensive third-party catalog acquisition remains a weak rental strategy in this benchmark. A blanket “every catalog and all three models are equally balanced/profitable” green light is withheld.

## Money and data integrity

Every comparison week checks finite funded balances, paid-stock conservation, canonical/HQ paid equality, revenue minus cash costs, accounting contribution after amortization, and the Finance operating point. Ads/store-only cases have zero paid subscription income. Advertising uses a shared finite country-week budget; legacy target CPM cannot set receipts.

Additional regressions cover zero-ad income, inaccessible/expired rights, included titles not resold to members, membership-only store gates, remaining entertainment wallets, permanent ownership, active rental windows, malformed numeric inputs, repeated game-week settlement, compacted transaction replay and save/migration behavior. No infinite-money or duplicate-settlement exploit was found in these tested paths. This is evidence about the simulated game transactions; arbitrary manual rewriting of every save field is not an anti-tamper certification.

Suspension from week 14 onward produces **0 paid accounts, 0 subscription receipts, 0 total operating receipts and 0 title viewing**. Costs owed for infrastructure can continue; a suspended company does not receive a profit floor.

Browser smoke used an isolated in-memory career, without reading/writing real save slots. Store-only Premiere and HQ both showed **0 paid subscribers**. Advancing a real game week produced **$56.1K store income**, **$216K weekly operating outflow**, and separate **three $1.06M maintenance debits in the ledger**. Current treasury was **$196,660,118**. Finance's operating snapshot and separate cash-decision ledger are different views; the comparison tables above use actual treasury movements to include both. No browser runtime errors were captured. In-world launch reviews/polls remain narrative flavor, not claimed consumer telemetry.

## Evidence and reproduction

[streaming-economy-balance-fixed/analysis.json](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-economy-balance-fixed/analysis.json) contains all gates, comparisons and supplemental costs. [scenario-summary.csv](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-economy-balance-fixed/scenario-summary.csv) covers the original comparison grid; the additional refresh and content-cost cases are in the corresponding JSON files and analysis. Full per-week data, scripts, source SHA-256 hashes, regression logs, build/typecheck logs and the original failing regression are saved alongside it. Baseline pre-fix evidence remains separate and unchanged.

The original matrix is the same 126 configurations. Controlled license genres now match their slate/project genres; otherwise copied default license metadata incorrectly collapses the intended six-genre fixture when canonical entries are used. This fixture correction is documented rather than silently presented as a pure numeric comparison.

Independent setups were checkpointed and resumed in parallel. Completed cases were retained only from the final frozen source pass; no game weeks were skipped or shortened. The full economic source hashes remained unchanged throughout the retained/replayed runs.

Permanent local regressions:

```sh
npm run audit:streaming-economy-balance-fixes
npm run audit:streaming-commercial-c4
npm run audit:streaming-hq-viewing-truth
```

The saved `audit.ts` runs `matrix`, `sensitivity`, `longrun`; `extra.ts` and `quotedopt.ts` cover actual quotes. Supplementary scripts run `refresh`, `efficient`, `efficientprices`, `fixedfee`, `ownedlibrary`. Bundle using esbuild with `--bundle --platform=node --format=esm --loader:.csv=text`, then run their bundles and `analyze.py`. Output paths are documented in those saved scripts.

No commit or deployment was requested. The prior visual-hook triage remains recorded in [the design-hook report](/Users/zeesh/Vibe code/Actor empire/docs/superpowers/reports/2026-10-16-streaming-design-hook-triage.md): narrow icon/paper-texture false-positive ignores retained; pre-existing fonts/motion/HQ grid left unchanged. This balance work adds no design suppressions or CSS edits.
