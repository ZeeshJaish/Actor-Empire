# Platform AI 400-Year Stress Attempt

**Date:** 2026-08-31
**Target:** 20,800 consecutive weekly turns (400 in-game years)
**Fixture:** deterministic adverse world, seed 201
**Outcome:** **FAILED — the full horizon is not computationally viable with the current weekly simulation cost**

## Result

The audit reached week 312 (Year 6, 1.5 percent of the requested horizon)
without a finance, rights, persistence, News, ecosystem, or canonical-reference
assertion failing. It was then interrupted deliberately because weekly runtime
had risen from 1.27 seconds at Year 2 to 6.67 seconds at Year 6.

At the Year 6 cost, completing the remaining 20,488 weeks would take about 38
hours even if weekly cost stopped increasing. It had not stopped increasing: a
simple continuation of the measured trend projects execution in weeks rather
than hours. Continuing the same brute-force run would therefore consume
substantial CPU time without providing a practical development feedback loop.

This is a failed 400-year scalability gate, not a completed 400-year pass. It
does not show that the simulation can survive for only six years; it shows that
the current implementation cannot *verify* 400 years in practical wall-clock
time.

## Command

```bash
PLATFORM_AI_LONG_RUN_HORIZON_WEEKS=20800 \
PLATFORM_AI_LONG_RUN_SEED=201 \
PLATFORM_AI_LONG_RUN_SKIP_PREFLIGHT=1 \
PLATFORM_AI_LONG_RUN_PROGRESS_INTERVAL=104 \
PLATFORM_AI_LONG_RUN_TRACE_PERFORMANCE=1 \
PLATFORM_AI_LONG_RUN_CONCURRENCY=1 \
PLATFORM_AI_LONG_RUN_INLINE=1 \
npm run audit:platform-ai-long-run
```

The audit harness was extended to accept a maximum stress horizon of 20,800
weeks, use a 10,400-week save/resume midpoint for that horizon, retain the
10-, 25-, 50-, 200-, and 400-year checkpoints, and print process-memory data.
No production gameplay rule was changed for this attempt.

## Preflight

A 52-week adverse preflight completed with exit code 0 before the long run.

| Metric | Result |
| --- | ---: |
| Weeks completed | 52 / 52 |
| Releases | 16 |
| Hits / solid / flops | 12 / 4 / 0 |
| Core-platform distress / rescue | 1 / 0 |
| News events | 20 |
| Duplicate News IDs | 0 |
| Incorrect News dates | 0 |
| Generated-platform launches | 2 |
| Maximum active generated platforms | 2 |
| Maximum compacted save | 1,546,872 bytes |

## 400-year attempt telemetry

| Checkpoint | Progress | Weekly simulation | Persistence | RSS | Heap | Projects | Productions | Platform plans |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Week 104 / Year 2 | 0.5% | 1,270.22 ms | 6.96 ms | 296.36 MB | 118.42 MB | 676 | 0 | 51 |
| Week 208 / Year 4 | 1.0% | 4,461.88 ms | 9.62 ms | 355.52 MB | 132.42 MB | 704 | 4 | 76 |
| Week 312 / Year 6 | 1.5% | 6,673.95 ms | 12.44 ms | 377.97 MB | 137.44 MB | 748 | 22 | 99 |

The Node process remained healthy and CPU-bound at approximately 99 percent.
It was not blocked on I/O. Resident memory remained below 400 MB at the final
checkpoint, so runtime growth—not an observed memory exhaustion—was the first
hard failure.

## Integrity boundary actually verified

Through week 312:

- every requested weekly turn completed in sequence;
- no canonical project, production, rights, or finance assertion fired;
- News IDs and dates remained valid and saved News stayed bounded;
- ecosystem event IDs and regional market-share totals remained valid;
- core and generated platform processing stayed synchronized; and
- the process stayed alive without an exception or out-of-memory condition.

The attempt did **not** reach the 10-, 25-, 50-, 200-, or 400-year report
checkpoints, nor the 200-year save/migration midpoint. No claim about those
horizons is supported by this attempt.

## Engineering conclusion

Before rerunning 400 years, weekly progression needs a focused performance
profile. The telemetry points toward growing scans over accumulated projects,
productions, platform slates, or related historical state. The next sensible
step is to locate the dominant hot paths, preserve exact deterministic results,
and add a runtime regression gate. Phase A4 remains paused while this result is
reviewed.
