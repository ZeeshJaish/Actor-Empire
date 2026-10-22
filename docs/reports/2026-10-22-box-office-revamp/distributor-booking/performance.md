# Matched desktop performance

Both sides use frozen copies of the initial dirty checkout, with the same concurrent unrelated App/game-loop/stock changes. The candidate adds this revision. Unrelated read-only recovery-preview helpers inside the shared save files are included on both sides; after syncing those helpers, the Node baseline benchmark bundle remains byte-for-byte identical.

| Measurement | Warm samples per side | Baseline median | Revised median | Baseline p95 | Revised p95 | p95 change |
|---|---:|---:|---:|---:|---:|---:|
| Node early | 32 | 478 ms | 468 ms | 551 ms | 584 ms | +6.0% |
| Node late | 8 | 7.32 s | 8.29 s | 8.22 s | 8.63 s | +5.0% |
| App early | 4 | 526 ms | 451 ms | 593 ms | 465 ms | -21.7% |
| App late | 4 | 9.84 s | 7.30 s | 10.10 s | 8.56 s | -15.3% |

All four measured p95 comparisons meet the prior 10% regression allowance. The late Node median is higher (about 13%); the new real alternative projection has a measurable cost, and the p95 result does not mean every metric improved. Actual App results are a separate observation, not proof of a particular cause. The late stress input is about 208 MiB and remains heavy; desktop completion is not a mobile-memory or release approval.

Early Node sampling was expanded equally on both sides after an eight-sample tail was noisy. All 32 observations remain in the summary, including the revised maximum of 612 ms and baseline maximum of 593 ms. The 8/4/20 batches include a reversed order. No unfavorable sample was discarded. Late Node has eight warm samples and App has four: at these counts the p95 estimator is the maximum, not a reliable estimate of a production tail.

Node measures actual weekly compute, verified persistence preparation, generation saving to a memory store and UI-state preparation. The separately reported market diagnostic lies outside the total. App uses actual `index.tsx`/`App.tsx`, Age Up, verified IndexedDB before the displayed week and two animation frames. Each recorded App step verifies CURRENT, saved career clock, money and cumulative paid cinema facts. The first calculation is retained but excluded from the predefined warm metric. Medical/choice actions occur outside the timed interval. No heavy audit runs concurrently with the final timed samples.

## Profiling and controls

The first added rival implementation raised the late Node median. CPU profiling identified full-library route evaluation for each individual owned title. A local title index preserves the canonical permission evaluator and dated playback. The late alternative projection remains exactly 1,704 rows with SHA-256 `a30a6bab1021b850555e45080876067bb7488ff56226cc5434247a153ad678f7`; its warm profiled read falls from roughly 1.7 s to 0.31 s. This is a read-level control, not the whole-week result.

Exploratory direct Node runs seeded each week but had unseeded module defaults. They are excluded from formal comparisons. The new bootstrap seeds RNG and clock before game imports, as the existing audit runner and App harness do. The seeded pre/post optimization early state control matches in full, without omitting any field. Baseline/candidate gameplay hashes are not required to match across tuning 2 and 3: future earnings intentionally change; protected historical facts and exactly-once receipts have separate regression coverage.

The baseline App setup first failed because its old save files lacked a recovery-preview helper imported by concurrent unrelated App work. Startup diagnostics exposed that mismatch; the shared helper was restored to the matched baseline before collecting the final successful samples. Those failed setup logs remain under `/private/tmp/actor-distributor-booking-20261022/`. The candidate full App and final performance runs report no page errors. Older live-source/HMR and host-memory-pressure attempts are exploratory, not passing comparisons.

## Reproduce

Use `scripts/benchmark-box-office-week.ts` bundled once per frozen source root, then launch **through** `scripts/run-box-office-benchmark.mjs` with the same `CINEMA_BENCH_FIXTURES` directory on both sides. The existing `--write-fixtures` option authors inputs; exact measured input hashes/lengths are in [the summary](performance-summary.json). Do not substitute a real save.

```sh
CINEMA_BENCH_WEEKS=8 CINEMA_BENCH_OUTPUT=/private/tmp/node.json node --max-old-space-size=8192 scripts/run-box-office-benchmark.mjs /private/tmp/bench.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright CINEMA_APP_BENCH_URL=http://127.0.0.1:5262 CINEMA_APP_BENCH_OUTPUT=/private/tmp/app.json node scripts/benchmark-box-office-app.cjs
```

`lab/cinemaPhase6Vite.config.mjs` serves only the named authored fixture endpoints. Run one QA server/browser at a time. The full raw successful Node/App reports and rounded early sample logs are in [performance/](performance/). Wall-clock timings are hardware/session-specific; no claim is made for physical-device CPU, memory, native bridge or GPU.
