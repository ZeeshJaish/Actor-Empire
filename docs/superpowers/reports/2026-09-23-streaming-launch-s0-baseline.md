# Streaming launch S0: career baseline and failure ledger

Date: 2026-09-23  
Scope: S0 diagnostics only, before S1 gameplay repairs  
Source: the 18 supplied mobile screenshots, read-only code inspection, and a synthetic career fixture. No player save, browser storage, cash balance, or energy balance was changed.

## How to repeat the baseline

Run `npm run audit:streaming-launch-s0-baseline` from the Actor Empire root. After S2, it exits **0 (6 pass)**. At the original S0 run it exited 1 with the coverage and prefill failures; after S1 it remained 1 with only prefill red. The historical boundary trace below preserves those original observations. The script uses real incorporation, market-plan, filing, canonical Build, career Build adapter, and rehearsal functions in memory. It does not read the user's save.

The screenshot baseline is preserved in [assets/streaming-launch-s0](assets/streaming-launch-s0/). Files `01.png`–`18.png` correspond in order to the screenshots attached at 2:07:41–2:27:12 AM. The first four concern market groups; 5–6 catalogue/pricing; 7–15 Build; 16–17 rehearsal; 18 commissioning agreement.

## Boundary trace

| Boundary | Observed value | Interpretation |
|---|---|---|
| Market selection | US and BR are `PLANNED`; zero energy charged | Selecting is a plan, not a filing. |
| Filing | US and BR become `CLEARANCE`; 100 → 90 energy; $73.4M filing cash | Two countries cost 10 energy under the current 5-per-country rule. This confirms the status distinction, not the fairness of the price. |
| First Build draft after planning | 0 persisted facilities, **2 seeded placements: LA and RIO** | The draft is not blank despite no player network choice. Red regression, S2. |
| Canonical country reach with LA/RIO facilities | US 21% `THIN`; BR 48.24% `THIN`; BE 0% `DARK`; all finite | The source coverage calculation is not the origin of the observed `NaN`. |
| Career adapter `CountryService` | Three projected services omit `reachedShare`, `coveredShare`, and `coveredPeak`; `coveredPeak` finite for 0/3 | This is the first non-finite-data boundary. The adapter knows market demand (600k/300k/100k) but does not supply the coverage fields the recipient requires. |
| Region/UI projection | Four `NaN% served` labels and `Strong` both appear in the same rendered Build | `regionReport` sums missing `coveredPeak` to `NaN`; its grade comparisons all fail and fall through to `Strong`. Red regression, S1. |
| Rehearsal fixture | 150k peak / 1M steady global capacity; US `HELD` via LA; BE `BROKE` with no route | Spare worldwide compute cannot serve a country with no regional delivery path. This is valid geography, not itself a compute bug. The UI must explain the distinction, S1. |

The real-player screenshot has 11.81M own capacity, 4.52M peak (38%), and a stream-unavailable viewer. That can occur with a missing market route. The synthetic test establishes the rule, **not** the exact cause of the user's saved configuration; that save was not inspected or modified.

## Failure ledger

Status: **Confirmed** means reproduced in code or the synthetic career fixture; **Observed** means visible in the supplied screenshot but not yet replayed from the same save; **Design** means an intentional presentation request; **Investigate** means the apparent defect is not yet proven. “Owner” is the next stabilization phase, not work completed in S0.

| ID / evidence | Status | Actual and reproduction | Expected / next acceptance condition | Owner |
|---|---|---|---|---|
| F01 [01](assets/streaming-launch-s0/01.png) | Observed | Caribbean bulk card offers 13 countries and 65 energy to file all. | Show exact per-country and batch costs; assess fair large-batch balance before changing charges. | S3 |
| F02 [02](assets/streaming-launch-s0/02.png) | Design | Bottom strip says 23 markets / $500B with an unlabeled center bar. | Label what progresses and what the money is available for. | S5 |
| F03 [03](assets/streaming-launch-s0/03.png) | Observed | `23` count circle crowds the North America selector. | Count remains legible at phone width and all six region controls remain usable. | S3 |
| F04 [04](assets/streaming-launch-s0/04.png) | Observed | `23 markets · 23 chosen · …` summary clips before its audience figure. | Selected count, audience, and Add/Remove action are fully readable. | S3 |
| F05 [05](assets/streaming-launch-s0/05.png) | Design | Storefront mockup uses composed title thumbnails. | Keep rich mockup art; audit listed-title/catalogue surfaces for the established production poster fallback. | S5 |
| F06 [06](assets/streaming-launch-s0/06.png) | Investigate | 100% Essential appears while Premiere is selected as a target, but the shown introductory discount is **Off**. | Confirm effective prices and cohort allocation for an enabled, targeted discount before calling this a bug; audit AI parity. | S4 |
| F07 [07](assets/streaming-launch-s0/07.png) | Confirmed | South America Build map/region shows `NaN served`, while region grade is positive. | Finite coverage and grade derived from the same canonical signal; no false health. | S1 |
| F08 [08](assets/streaming-launch-s0/08.png) | Confirmed | North America country rows show `NaN%`; region is called `Strong` without a player-selected node there. | Empty/no-route presentation must be explicit; region/country readings agree. | S1/S2 |
| F09 [09](assets/streaming-launch-s0/09.png) | Observed | Build header truncates `weeks to build` at short-phone width. | Clock and stage position remain readable without clipping. | S5 |
| F10 [10](assets/streaming-launch-s0/10.png) | Design | Cloud cards are terse text; provider differences are hard to scan. | Distinct fictional marks and reach/ceiling/cost/trade-off comparison. | S5 |
| F11 [11](assets/streaming-launch-s0/11.png) | Confirmed + Design | Cloud/owned choice still says `NaN% served`; room disclosure is separate from country coverage. | Fix the invalid coverage first; then clarify provider versus room location without duplicating a long list. | S1/S5 |
| F12 [12](assets/streaming-launch-s0/12.png) | Confirmed + Design | Many `NaN%` country rows push actionable controls far down. | Finite rows plus collapsed country drill-down behind a concise region summary. | S1/S5 |
| F13 [13](assets/streaming-launch-s0/13.png) | Confirmed | Map has colored nodes but summary still says `NaN served`. | Map tint, region summary, and country figures use compatible coverage definitions. | S1 |
| F14 [14](assets/streaming-launch-s0/14.png) | Design | Weekly total mixes cash, electricity, space, and build time in one dense line. | Separate weekly operating cost from one-time cost and construction duration. | S5 |
| F15 [15](assets/streaming-launch-s0/15.png) | Design | Money page carries a long region-by-region comparison with substantial vertical scrolling. | Scannable region summaries with details available on disclosure. | S5 |
| F16 [16](assets/streaming-launch-s0/16.png) | Confirmed mechanism; exact save unverified | 38% of own global compute, yet selected Belgium viewer says unavailable. Test proves no regional route can produce that outcome with spare global capacity. | Show total load, local path, and country-specific failure independently; say why this viewer was selected. | S1 |
| F17 [17](assets/streaming-launch-s0/17.png) | Confirmed | `12 down · 1 buffering · 15 playing` is computed only from **hidden overflow monitors**, not all markets; the wording looks like a total. | Full market verdict counts, with any overflow cell explicitly marked as “more markets”; individual viewer drill-down. | S1 |
| F18 [18](assets/streaming-launch-s0/18.png) | Observed | Commissioning agreement lists every room inline; many-city plans become very long. | Provider totals first, room details on demand; contract cost remains inspectable. | S5 |

### Cross-cutting failures and decisions from the same user report

| ID | Status | Evidence / required distinction | Owner |
|---|---|---|---|
| F19 Registration route | Confirmed by code | Founding completion opens Studio Finance. Desired route is Platform Dashboard with a dismissible capital-injection tutorial, not an automatic finance redirect. | S2 |
| F20 Build prefill | Confirmed by red fixture | Two merely planned markets seed LA/RIO placement drafts. A new unsaved Build must start blank while preserving saved drafts and commissioned facilities. | S2 |
| F21 Build gate | Confirmed by code | HQ's market projection includes any opening operation except `EXITED`, so `PLANNED` counts before filing. Browsing is fine; mutation should begin only after actual filing starts. | S2 |
| F22 Group filing energy | Confirmed current rule, balance pending | Current constant is 5 energy per country; 13 → 65 and 23 → 115. No balance numbers will be changed without the separate S3 review. | S3 |
| F23 Group geography/report | Investigate | Caribbean/Central America map shape, member counts, report rollups, and per-country costs require a registry-to-UI audit. | S3 |
| F24 Discount/AI economy | Investigate | The screenshot alone does not prove an allocation bug; targeted-intro revenue and competitor-offer behavior need scenario tests. | S4 |
| F25 Titan increment pause | Investigate | The user observed a click pause. Node SSR timings below do not identify browser interaction latency or its dominant step. | S5 |
| F26 Artwork outside mockup | Observed/requested | Catalogue and title lists should use real custom posters or the established production fallback, while mockup compositions remain. | S5 |

## Timing probe, not a performance verdict

With 31 and 32 Titan racks in a synthetic LA facility, eight warm canonical projection calls were approximately 0.03–0.14 ms each. Four warm Node server-side Build renders were usually about 160–180 ms, with one 309 ms outlier on the final run. This does **not** measure a tap, browser layout/paint, React commit, or autosave, so it does not establish the cause of the player's short pause. S5 must profile the real increment in a 393px browser before changing the calculation or interaction.

## Verification and limits

- `npm run audit:streaming-launch-s0-baseline`: **4 pass, 2 fail intentionally** (`NaN` UI, seeded first Build). The command exits 1 to keep those defects visible.
- `npm run audit:streaming-region-placer`: pass.
- `npm run audit:streaming-pricing-world`: pass.
- `npm run audit:streaming-build-lab-career-parity`: pass. These existing green audits do not exercise the failing career adapter contract.
- `npm run build`: pass, with existing Vite warnings about `/index.css`, mixed static/dynamic imports, and large output chunks. Build success does not validate the career coverage contract.
- `tsc --noEmit --pretty false`: inconclusive; Node reached its default approximately 4 GB heap limit and exited 134 before diagnostics. This is not reported as a TypeScript pass or a code failure.
- The report uses the user's supplied screenshots as the baseline visual set. No new click-through or save/reload capture was made in S0. The real saved career and 393×600/852 browser interaction remain verification work for S1/S2/S5/S6.

S0 records and isolates the original failures; it did not repair them. The approved S1 work and remaining decision are recorded below.

## S1 disposition — 2026-09-23

- **F07, F08, F11, F12, F13:** the career adapter now supplies finite reach, well-served share, covered peak, and cloud portion. Region grade, map readout, and country rows use those values. Malformed coverage shows **Coverage unavailable** and blocks rehearsal/commissioning instead of `Strong` or an invented `0%`. The layout portions of F08/F11/F12 remain S5.
- **F16:** rehearsal now says when a selected market has no regional route despite spare global compute. The viewer drill-down shows local route, load or limiting factor, and a next step. Career rehearsal excludes a country with zero canonical reach or a disallowed residency route.
- **F17:** an all-market playing/buffering/down tally appears next to the program monitor. The overflow cell explicitly says it counts only its hidden markets. Visible monitors open their individual viewer screen. A buffering market is no longer mislabeled as “held” in the detailed list.
- **F20:** still red and owned by S2. A fresh Build seeds two placements before any player network choice. No S1 change attempted to hide or repair this.
- **F27, newly found during S1 — partial reach versus rehearsal:** resolved by the approved separate readiness rule. The rehearsal still stress-tests routed traffic, while both the Build Launch checklist and canonical commission quote require every opening country to meet the existing `SERVED` geographic threshold (80%). A thin country blocks commissioning even after a passed load test or draft override; the transaction spends no cash or filing energy. No partial-market failure or save model was introduced.

Current S0 baseline: **5 pass, 1 fail** (only F20). S1 coverage audit: **8 pass, 0 fail**. S1 rehearsal unit audit: **2 pass, 0 fail**. Isolated browser fixture: the three-market scenario showed **1 playing, 1 buffering, 1 down** at **47%** own capacity and **61%** spare burst capacity; Belgium had no route while UK showed its London route at 100% local load. No horizontal overflow at 393×600, 393×852, or 1280×800. The fixture is not the user's saved career.

## S2 disposition — 2026-09-23

- **F19:** resolved. Incorporation now lands on Platform Dashboard, where the guide offers Inject capital, a tour, or Explore on my own. The isolated career walkthrough reached HQ with $0 treasury and did not auto-inject capital.
- **F20:** resolved. Fresh and merely planned markets produce an empty canonical drawing, no placement, and no fabricated Build country. Previously saved drafts and existing facilities remain separate preserved data. The historical LA/RIO trace above remains as evidence of the original defect, not current behavior.
- **F21:** resolved. Opening-market operation status, not a regional fallback, controls Build access. `PLANNED`, `AWAITING_FUNDING`, and `EXITED` do not unlock editing; filed clearance, action-required clearance, and approved/ready operations do. A legacy day-one save with an existing drawing remains usable.
- **F28, discovered during S2 — empty canonical drawing crashed the career Build:** fixed by accepting explicitly supplied empty arrays while continuing to reject a CAREER projection that omits the canonical drawing entirely. Reproduced by an isolated Build browser fixture; covered by S2 and parity audits.
- **F29, discovered during S2 — opening Build could save without a player action:** fixed by comparing the adapter's normalized initial selection rather than the raw input. The read-only preview also guards its draft callback.
- **F30, discovered during S2 — preview implied a bill or completed steps:** no-market Money and Launch pages now say that no quote/agreement exists; the market-locked Money gate is not cleared and visiting a stage no longer draws a completion tick. Verified in an isolated browser and SSR audit.
- **F31, discovered during S2 — planned markets could reach commissioning:** canonical quote now rejects unfiled opening operations before a transaction; the lifecycle audit confirms no cash or energy movement on rejection.

S2 evidence and limitations are in [the S2 implementation report](2026-09-23-streaming-launch-s2.md). The real player save was not opened or modified; S3–S6 issues in this ledger remain open.

## S3 disposition — 2026-09-23

- **F01/F22:** resolved in the current implementation. The user-approved action quote is 5E for one country, 17E for seven, 25E for the 13-country Caribbean, and 30E for 23 North America countries. The original 65E and 115E screenshots remain historical evidence, not current prices. Only newly submitted files enter a batch quote; cash and review remain per country.
- **F03/F04:** the count badge is no longer a cramped circle and the region facts wrap into separate readable pieces, including the exact batch quote and Add all/Remove all. Verified in an isolated 393×600 and 393×852 browser.
- **F23:** resolved at the country-registry boundary. All 197 markets have one of 24 sub-regions, a finite shared-atlas position, and a silhouette or marker fallback. Group summaries use country-derived cash/audience and audience-weighted growth/rival figures. The group report lists per-country status, costs, timing, requirements, and standalone versus batch energy. Only North America/Caribbean was visually exercised; S6 retains the whole-career gate.
- **F32, discovered during S3:** a zero-cash country's Full report divided by zero for its access/compliance bar and rendered `NaN%`. The report now draws finite zero-width bars, and Clearance still shows the filing-energy cost even if cash due is zero. Red-then-green UI audit covers both.

S3 evidence and limits are in [the S3 implementation report](2026-09-23-streaming-launch-s3.md). S4 pricing and S5 presentation work remain open. The user's saved career was not inspected or modified.
