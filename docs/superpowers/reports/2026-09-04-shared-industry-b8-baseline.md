# Shared Industry B8 — Untuned 10-Year Baseline

**Measured:** 2026-09-04  
**Horizon:** 520 canonical B7 weeks per regime  
**Runtime:** local Node.js v24.11.1, warm bundled audit, no browser UI  
**Status:** pre-tuning evidence; do not replace with final results

## Raw measurements

| Regime | Runtime | p50 week | p95 week | Max week | Major expensive failures | Small/regional breakouts | Company-closure facts | Public events | Silent years | Active companies |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 25,856.65 ms | 44.94 ms | 77.29 ms | 105.10 ms | 69 | 0 | 23 | 845 | 0 | 25 |
| Lean | 26,435.49 ms | 44.76 ms | 81.89 ms | 96.87 ms | 78 | 0 | 18 | 930 | 0 | 25 |
| Boom | 26,945.50 ms | 44.12 ms | 83.66 ms | 102.29 ms | 73 | 0 | 20 | 881 | 0 | 27 |
| Crowded | 28,459.93 ms | 48.48 ms | 86.71 ms | 111.14 ms | 75 | 0 | 20 | 844 | 0 | 31 |
| Adverse | 26,539.42 ms | 44.33 ms | 84.04 ms | 98.86 ms | 80 | 2 | 21 | 954 | 0 | 25 |

All five regimes recorded zero unexplained rescue-cash events, zero exact standalone fingerprint repeats, and zero routine-accounting publications.

Commercial-year leadership remained contested. The highest observed ten-year share was Lionsgate's 5 of 10 Lean years, below the approved 65% ceiling. Some regimes had years without a released title, so the evaluator uses released-title years as the dominance denominator and separately retains the public-silence check.

The player-visible publication range was 84.4–95.4 unique material industry events per year. B8 provisionally freezes a broad 24–120 annual band: it permits quieter worlds and ordinary variation while rejecting permanent drought or excessive event volume. This is unique event cadence across News, X, and Instagram, not three counts for the same event.

## Untuned failure

`NO_SMALL_BREAKOUT` failed. Baseline, Boom, and Crowded produced no small/regional breakout during the ten-year window. Adverse produced two, proving the commercial engine can create a breakout, but not in one of the three approved opportunity regimes.

The original Boom trace showed two generated entrants. One released one flop; the major-challenger entrant released five financial flops. A focused rerun with a deliberately high-potential challenger produced four financial flops but also a 9.4-rated film. That exposed an evaluator defect: “breakout” was incorrectly limited to profitable `HIT` outcomes and ignored exceptional critical breakthroughs. B8 now counts a small/regional breakout when the title is either a commercial hit or earns at least an 8.5 rating. The production economics, outcome roll, and possibility of failure remain unchanged.

No gameplay coefficient has been changed in this report.
