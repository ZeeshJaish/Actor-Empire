# Streaming Launch S4 — pricing, discounts, AI rivals, and demand

## Outcome

The pricing phase now has one targeted-intro rule across the player offer, opening allocation, launch forecast, first-year subscription revenue, and weekly customer cells. The launch wizard explains each paid plan's list price, monthly introductory path, annual equivalent, opening blend, first-year value, budget affordability, and projected share. Free ad-supported access is identified separately instead of being shown as a discounted annual bill.

AI rivals' published annual and introductory discount percentages now match their commercial configurations and effective plan prices. The existing percentage formulas were retained. A deterministic strategy targets the highest paid plan for 16 of 33 sampled AI offers; the other offers remain broad. This changes which AI tiers receive a promotion, but does not change the discount caps, duration, annual share, utility coefficients, or cash generation formulas. No mandatory save field was introduced.

The local (non-world) pricing fallback also had a distinct allocation defect: a plan no cohort selected received generic subscribers. It now gives that plan zero and uses the canonical opening effective price for eligibility and price fit. World forecasts already use canonical effective prices.

## Evidence

- Regression tests were observed failing before fixes for the targeted first-year leakage, the AI offer/configuration mismatch, fallback phantom subscribers, fallback promo eligibility, missing price-path explanation, missing affordability explanation, and free-tier billing copy.
- `npm run audit:streaming-pricing-world` passes. It checks promo Off, targeted and untargeted first-year value, deep Premiere promotion changing allocation, 13-week expiry, AI broad/targeted plans, world and local cohort demand, allocation sums, Build demand totals, marketing draft treasury neutrality, weekly customer prices/revenue, and price-path markup. The fixture has 5,185,763 subscribers under normal pricing versus 458,749 with $78-only plans, ten eligible rivals, and 16/33 AI offers targeting one plan.
- `npm run audit:streaming-build-world`, `npm run audit:streaming-launch-marketing-build`, `npm run audit:streaming-launch-marketing-lifecycle`, `npm run audit:streaming-commercial-economy`, and `npm run audit:streaming-opening-programme` pass. The HQ path consumes country demand from the pricing forecast. An added adapter assertion feeds a real marketing country forecast into Build rehearsal and reconciles its country sum and likely total without a second multiplier. A draft does not charge treasury; reservation at commission and later weekly spend are covered by the lifecycle audit.
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`, `npm run build`, and `git diff --check` pass. The build still reports its existing CSS import and large-chunk warnings.
- The isolated real `StepPricing` UI was inspected in the local browser at 319 px viewport width (narrower than the target phone width): no document horizontal overflow; Premiere's $17.99 list, $8.99 targeted introductory, $11.96 opening blend and $197.79 first-year values were visible. Its 0% share was accompanied by the concrete explanation that the $11.96 blend exceeded every sampled household budget. This was a fixture, not a full saved-career journey.

## Failures and limits captured

| Check | Result | Diagnosis / treatment |
| --- | --- | --- |
| `npm run audit:world-streaming-we4` | Fails at game-loop ordering source-text assertion | The audit searches for `const ownedStreamingResult = processOwnedStreamingPlatformWeek`; both current code and `HEAD` declare `let ownedStreamingResult` before assigning it. Economic assertions ran before this source check. Not caused or altered by S4. |
| `npm run audit:world-streaming-we5` | Same source-text assertion failure | The same hard-coded `const` search blocks later customer assertions. S4 separately verifies live customer-cell price and revenue against the player offer. Not changed here. |
| `npm run audit:world-streaming-we6` | Same source-text assertion failure | The same ordering check fails before later viewing/settlement assertions. Not changed here. |
| `npx tsc --noEmit` at default heap | Node OOM near 4 GB | Retried with 8 GB heap and exited 0. This is a check-resource limit, not a TypeScript error. |
| Full career UI at 393×600/852 | Not exercised in this phase | The isolated phone-width fixture was inspected. A full saved-career click-through remains an honest follow-up for launch QA; the S4 code-path and economic audits above pass. |
| Separate billing-cohort allocation | Not introduced | World competition still evaluates household affordability using the established 33% annual / 67% monthly *blended* effective price; the monthly promo and annual path are priced and displayed separately but households are not stored as distinct billing-path cohorts. Replacing this with a true split would rebalance demand and require customer-state/save design approval. |
| First-year forecast | Projection, not a 52-week customer simulation | It correctly applies the 13-week promo only to targeted plans, while holding opening plan allocation constant for the year; the actual weekly customer economy can later change account counts and plan mix. |

S5 remains the Build presentation/performance/artwork phase. This report does not claim those visual tasks are done. No commit or push was made.
