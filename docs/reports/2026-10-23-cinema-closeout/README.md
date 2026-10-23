# Cinema closeout — 23 October 2026

Browser scope completed. One heavy worker at a time; no agents, simulator, real browser profile or user saves used. Native testing was explicitly deferred by the user. No hard earnings/run cap or blanket revenue multiplier was added.

## Changes

- Production-only Lucide import resolution preserves the installed package's SVG, aliases and helpers while avoiding unused icon traversal. Real Vite minification remains enabled. Both `npm run build` and `npm run build:low-memory` use a 2048MB heap, a 3GiB descendant-RSS guard, and macOS free-memory/swap stops. 1536MB did not fit; failed attempts were retained, not presented as passing builds.
- Country supply is indexed once per title; historical bookings use first-run and closed-run indexes. Existing prices, frozen booking rates, paid facts and result ordering are preserved.
- Retiring cinema history now indexes affinity identities and cohort buckets instead of repeatedly scanning the world's favorites. Duplicate old rows retain first-match updates, cast overlap, chronological merging, recency order and existing per-cohort bounds.
- Small campaign amounts display actual dollars below $1M. The browser reproduced a real $2,000 pool and $200 channel both appearing as `$0.0M`; the final build shows `$2,000`, `$200` and `$1,800` remaining. Draft edits still do not charge cash.
- Ordinary-career audit strategies now train the selected genre with real action costs. Checkpoints reject policy/source mismatches. Optional phase captures retain genuine earned players for UI testing; they grant no cash, craft, cast or audience.

## Verification

18 focused checks passed: audience, market, affinity-index, booking, migration, integration, finance-contracts, finance-ui, presentation, rights, save-boundary, release-announcement, career-actions, country supply cost, historical run lookup cost, history compaction cost, campaign presentation and build icon equivalence. The application/source TypeScript check passed with a 1536MB heap, using explicit source roots rather than generated/native JS trees. `git diff --check` passed.

Performance red/green checks:

| Work | Before | After |
| --- | ---: | ---: |
| Country identity reads, 100 cohorts/50 pools | 5,000 | 100 |
| Repeated booking searches, 50 current/1,000 archived | 150,502 | 0 |
| Affinity scans, 200 cohorts/9,601 rows | 1,939,804 | 0 |

Fixed whole-world and frozen late-market result hashes stayed equal after supply/run changes. A deterministic **complete player week**, including money, world companies, cinema audience/favorites and settlement, stayed byte-for-byte equal after the history change. Its profiled cinema stage fell from 5.69s to 4.43s; this is one controlled pair, not a percentile claim.

The browser-tested production build passed in **19.72s**, with **2383.9MiB** sampled descendant RSS. The standard `npm run build` entry was then connected to the same guard and reverified in **17.57s**, with **2231.5MiB** peak RSS. Its generated JavaScript asset hashes match the browser-tested build. An earlier guarded attempt stopped when system swap grew over 512MiB, despite the build using only ~1.3GiB at that point; a subsequent build passed without disabling the guard. Final build heap was 2048MB. `evidence/build-final2-memory.json` records the completed run.

## Normal careers

Two additional ordinary starts completed all 208 weeks each, using real training, jobs, applications, rehearsal and the actual weekly engine. These are action-policy engine runs, not 416 manually clicked browser weeks. Open runs are excluded from completed-film cost recovery figures.

| Current run | Final personal cash | Completed, cost-known films | Theatrical recouped | Theatrical losses | Small <=$25M completed / recouped |
| --- | ---: | ---: | ---: | ---: | ---: |
| DRAMA, seed 0 | $59,925 | 85 | 34 | 51 | 7 / 3 |
| COMEDY, seed 1 | $100,492 | 84 | 33 | 51 | 8 / 2 |

Combined observations: 169 completed films, 67 theatrical cost recoveries, 102 theatrical losses; 15 small films, 5 recoveries. These are correlated, policy-specific industry observations, not unbiased hit probabilities. The Comedy executable also included concurrent talent work; per-run source hashes are retained and results should not be pooled as identical-source independent seeds. Future streaming, soundtrack and investor ownership distributions are excluded from these theatrical comparisons.

The Drama player attempted an audition but earned no paid player film. The Comedy player earned two paid films: `A Prime Moon` ($17.19M production, quality 62, no recorded paid campaign, **$686,591.95** theatrical gross over 15 weeks) and `Dark Mountain` ($13.16M, quality 43, no recorded paid campaign, **$72,321.89** over 8 weeks). Their failures were retained; casting and outcomes were not forced.

Across the two new runs: **100 verified writes, 68 reloads, 416 duplicate-week settlement rejections**, and failed-promotion recovery checks passed. The largest recorded worker RSS was ~3225MiB; the passive process-tree watchdog sampled ~3178.5MiB and did not stop. Build and career memory ceilings are different; no claim of sub-3GiB careers is made.

## Small-film matrix

33 controlled shared-market cases finished naturally, across 197 countries/2,363 cohorts: 3 qualities × 3 campaigns × 3 seeds, plus worldwide-access and peak-competition contrasts. Budget views of $2M/$10M/$25M held audience inputs fixed. Production spending alone did not create viewers. All three seeds preserved exact results when only unused worldwide access was added; quality and competing demand mattered. Wallet, time, seats and gross splits conserved.

Representative lifetime gross ranges:

| Delivered quality | Paid campaign | Gross across 3 seeds | $2M production theatrical project profit |
| --- | ---: | ---: | ---: |
| 30 | $50K | $1.06–1.16M | -$1.53M to -$1.48M |
| 30 | $500K | $10.88–11.83M | $2.90–3.37M |
| 90 | $50K | $3.16–3.46M | -$0.48M to -$0.34M |
| 90 | $500K | $32.17–34.97M | $13.47–14.87M |
| 90, peak competition | $500K | $11.73–14.91M | $3.61–5.23M |

These are controlled market conditions, not guaranteed beginner outcomes. At the same quality/exposure, raising production cost to $25M made the $500K campaign quality-90 case lose about $8.13–9.53M. No payout ceiling was used. Observed controlled natural runs were 19–59 weeks, including long limited tails; this does not mean every release occupies a full wide footprint for that duration. The two ordinary player films closed after 15 and 8 weeks.

Earlier prepared advanced-career evidence reached $2.314B gross and ~$627M theatrical profit; it was an established, authored advanced-owner scenario, not an ordinary-founder probability estimate. The new ordinary windows produced no billion-gross films. A precise $2–3B rarity estimate, and a $3B attained endpoint, are not established by these samples.

## Actual production browser flows

Disposable contexts ran the minified production application, its real UI actions, forecast worker and verified IndexedDB:

- Fresh career creation, actual wellbeing costs ($150), job energy reservation, current audition application, reload and job quitting. Cash, applications and energy persisted.
- A genuine earned ordinary-career `AWAITING_RELEASE` checkpoint reached a paid offered-role premiere through the UI. Opening gross $177,910.06, receipts matched the shared ledger; BoxOffice and IMDb showed the same 14,504 first visits/0 repeats. Reload preserved cash and paid facts.
- A clearly authored funded $500K studio project progressed through 26 actual weeks of preparation/shoot/post-production, including a hurricane delay and production choices. The base fixture incorrectly inherited an unplanned theatrical route; that route alone was cleared at release readiness to enter the planner. No cash, delivered quality or production progress was changed by that QA correction. Forecasts did not alter cash/paid history. The actual $1,000 campaign charged once on lock (15E), and reload did not repeat it.
- The release preview estimated $2.5–3.4M opening gross. That studio film then premiered through actual weekly progression: **$2,916,981.32 gross, $1,546,001.65 theatrical producer receipts, $501,000 paid production/campaign costs**. The financial report included $14,636 collected soundtrack receipts, giving $1,059,637.65 collected project profit. This was a prepared studio package, not a guaranteed $500K film result. Studio balances and paid facts matched after reload.
- A legacy $150M gross remained intact; the next week added only **$144,632.55** new gross. Personal cash rose from $2,000 to $3,446, without replaying payment on the old $150M. Reload was stable.
- An authored aged, cold theatrical run naturally handed off to streaming through actual weeks. The signed license fee was $12,815,790; collected all-media receipts were $12,827,880 including $12,090 soundtrack receipts; zero theater gross did not prevent legitimate home value, and the film still lost money on its $50M production. Reload did not repeat the deal/payment.
- The actual earned week-195 save (about 75MB) processed weeks 196–198 and reloaded with cash, active releases and canonical title totals preserved. All sampled player/NPC weekly ticket splits conserved cents; no duplicate title rows appeared.
- 320px finance, IMDb audience and final small-campaign screens were visually checked without page overflow. Final campaign regression used an explicitly presentation-only authored release-ready fixture; it is not counted as a successful career.

Final current-build late-save internal processing times: **7397 / 7219 / 7144ms**. Click-to-visible times: **7607 / 7249 / 7170ms**. QA read-back verification is outside those timers. An earlier sample was 13,443ms. Three samples do not establish p95, device performance or universal speed; a large save still takes several seconds. Candidate verification, read-back, previous-generation recovery and persist-before-UI ordering remain enabled.

Both browser passes recorded **zero page errors/crashes**. The first browser tree peaked at 2386.2MiB; the final pass peaked at 1970.6MiB. Controllers/browsers were closed between builds/profiling; final-pass memory and closure are recorded alongside the action log.

QA transport note: JSON fixture serialization removes undefined object properties. A pre-serialization fixture manifest was correctly rejected, preserving the previous slot and its cash. Subsequent authored JSON fixtures were signed from their exact parsed payload before verified writing. No production integrity check was bypassed or disabled.

## Remaining limits

Native iPhone testing remains deferred at the user's request. Late-save processing is improved and bounded, but ~7 seconds on this 75MB desktop-browser save remains a noticeable wait. Broader device latency percentiles, every player strategy and unbiased blockbuster odds are not claimed. No unrelated source work was reset, committed or pushed by this closeout.
