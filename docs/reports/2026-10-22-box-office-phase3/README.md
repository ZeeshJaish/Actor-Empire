# Box-office Phase 3 — shared audience market in shadow

Phase 3 is implemented and verified in shadow. Base: `a75893a`; Task 5 checkpoint: `a25cdaf`. No new cinema audience, costs, payments or career consequences are persisted to the live game. Phase 4 connects this kernel to one common settlement.

## What is implemented

`buildCinemaChoices` produces first, repeat and deferred requests. Awareness gates first-time intent. Genre, language, eligible reach, affordability, leisure time, urgency, earned attachment, universe familiarity and publicly known streaming windows shape it. A request is not a ticket sale. DEFER carries interest with zero paid admissions; it reserves no money and creates no streaming rights, entitlement or playback access.

Delivered experience earns overlapping actor/studio favorites. Old and current role weights matter; duplicate people and character credits are merged. Disappointing films can weaken favorites. Universe familiarity uses earlier observed exposure/satisfaction, meaningful returning characters, payoff, accessibility and cadence. There is no mandatory precursor count. Compact universe memory survives retirement of detailed title matrices. Missing old theatrical audience counts stay unknown rather than being guessed from gross.

Seen, satisfied viewers may request another paid visit. Every realized repeat consumes a new seat, ticket payment and time while leaving the unique-viewer count intact. Recent repeats reduce propensity. Actual prior satisfaction also shapes remaining first-time interest; hidden final delivery does not become public knowledge before viewing. Forecast inputs retain visible estimates instead.

Word of mouth consumes a finite lifetime contact budget from satisfied viewers, saturates net-new awareness and respects local fit. The same people cannot create a fresh contact budget indefinitely. Separately, paid exhibitor release placement can create delayed local discovery from realized OTHER-film patrons at the same country/chain. Empty booked screens create no source. This compact dated footfall source is consumed once; it is not same-week ticket demand.

The canonical world adapter reads population, audience cohorts and participation. Cinema eligibility uses the cohort's own household size; the wallet uses participation's existing cinema allocation. Streaming/other allocations are not transferred. Canonical player/NPC project IDs join WE6 viewing observations to actual cast and universe lineage. Catalogue presence, starts, subscribers and gross do not establish lifetime unique viewers. WE6 catch-up is an explicitly conservative estimate from half the smaller observed account/viewer count, distributed across the country's cohorts. Measured satisfaction is preferred; completion is an explicitly limited fallback proxy.

## Shared supply and allocation

`quoteCinemaSupply` partitions each existing chain's regional screen footprint across registered countries using population and cinema-access weights, with exact integer remainders. Standard/premium formats share those screens. Country purchasing power, inflation, calendar, chain and format set automatic ticket prices. Optional location IDs leave room for future city supply; current estimates have country/chain precision.

`simulateCinemaWeek` allocates the complete slate with identical rules across player studio, offered-role and NPC studio routes. First and repeat demand compete for the same cohort cinema wallet, cinema leisure envelope and physical shows. Shows pack into screen-days with runtime, turnaround and opening-hour constraints. Unaffordable or seat-blocked requests release their resource share to feasible willing demand. Remaining money stays unspent; purchases are not forced.

Monthly cinema cents are prorated with exact 12/52 remainders. Fifty-two weekly envelopes sum to twelve monthly envelopes. Cinema leisure is a candidate life-stage/eligibility allocation, not a measured individual cross-media calendar. All realized tickets use `splitRealizedCinemaGross`; public gross, producer receipts, exhibitor receipts and distribution deductions conserve cents exactly, including country breakdowns.

The output contains a diagnostic input identity, admissions, satisfaction/deferred evidence, country receipts, cohort money/time audits, shared supply audits, identified booking-cost proposals and compact proposed next-state. Costs reflect paid launch placement and booked shows. The diagnostic fingerprint is not an authorization or exactly-once settlement receipt.

Country/chain holds have bounded discovery grace and demand-based exits. Physical denial does not count as audience rejection. There is no new-model opening/lifetime dollar ceiling or recurrence based on previous final gross. Production budget neither guarantees demand nor sets its ceiling. Worldwide access alone cannot create sales; wider launches can incur costs without an audience.

Proposed state retains bounded satisfaction bands, repeat counts, dated local sources, finite WOM contacts, deferred interest, compact affinities and run decisions. Omitted titles' deferred intent continues to decay. Old matrices retire into compact actor/studio/universe memory with stable ordering and actual viewing recency. Population decline scales current modeled segments conservatively; it does not rewrite historical financial facts.

## Verification

The focused runner passes **137 grouped cases**: 26 audience, 36 market and all 75 earlier Phase 1/2 groups. Independent read-only reviews found no remaining Critical/Important issue after the role, favorite, WOM, allocation, state-continuity and reconciliation regressions were fixed.

```sh
node scripts/run-box-office-audit.mjs audience
node scripts/run-box-office-audit.mjs market
npm run audit:world-population-we1
npm run audit:world-audience-we2
npm run audit:world-audience-we3
npm run audit:streaming-shared-budget
npm run lint
npm run build
```

Universe blueprint, fandom state/formation, novelty and WE6 viewing audits also pass. The frozen English baseline is unchanged. The existing Vite chunk-size warning remains.

The test-only full-world harness uses a fresh canonical world and all three owner routes: **197 countries, 2,363 cohorts, 1,729 country/chain/format pools, three films**. Indexed lookups reduced one measured invocation from 49,685.60 ms to 205.17 ms with identical admissions/gross on the same inputs. The final expanded snapshot measured 308.09 ms. These are local synthetic kernel timings after fixture preparation, excluding module startup, UI, persistence and device behavior. The controlled press exposure in this fixture is a test input, not a calibrated commercial forecast.

## Next integration boundary

Phase 4 must collect the entire live slate, construct trusted canonical supply, migrate/rebase existing and inherited saves, and commit source-identified money/audience changes exactly once. Until then, current live earnings continue through the compatibility system. Phase 5 exposes consistent player reports; Phase 6 establishes final balance and real journey/device evidence. IMDb numerical ratings, series bugs and cinema ownership UI remain outside this checkpoint.

Verification uses an isolated archive of `a75893a` with owned Phase 3 files overlaid and the existing dependency runtime. Concurrent streaming work is preserved and excluded; results certify this scoped snapshot. Recovery copies and source hashes are recorded in [verification.json](verification.json). Prior Phase 1/2 evidence is unchanged.
