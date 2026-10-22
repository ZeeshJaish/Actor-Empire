# Conditional box office results

These are controlled three-country simulation cases, not player-wide hit probabilities or promised earnings. Each row contains 32 fixed seeds. Amounts are USD millions. Gross is ticket cash; producer receipts are the producer share; profit subtracts production, paid campaign and actual exhibition booking costs. Rights quotes are excluded from theatrical profit.

| Scenario | Production budget range | Gross median | Gross p10–p90 | Producer receipts median | Producer profit median | Positive profit seeds | Run weeks median |
|---|---:|---:|---:|---:|---:|---:|---:|
| no-exposure-indie | 2.00–2.00 | 0.00 | 0.00–0.00 | 0.00 | -2.00 | 0/32 | 5 |
| targeted-indie | 2.00–2.00 | 157.31 | 121.07–199.09 | 77.66 | 70.33 | 32/32 | 69 |
| local-language | 2.00–2.00 | 75.17 | 60.26–111.31 | 34.58 | 27.64 | 32/32 | 72 |
| weak-wide | 50.00–50.00 | 0.00 | 0.00–0.00 | 0.00 | -50.00 | 0/32 | 5 |
| weak-two-stars | 50.00–50.00 | 122.07 | 105.56–138.15 | 60.04 | 5.61 | 27/32 | 65 |
| strong-two-stars | 50.00–50.00 | 276.17 | 226.82–314.78 | 136.14 | 76.96 | 32/32 | 73 |
| campaign-saturation | 2.00–2.00 | 613.39 | 524.41–685.72 | 302.71 | -218.05 | 0/32 | 75 |
| misleading-campaign | 50.00–50.00 | 348.36 | 310.23–370.58 | 171.04 | 78.94 | 32/32 | 71 |
| meaningful-lead | 158.56–343.63 | 1,122.05 | 1,005.90–1,211.93 | 552.61 | 249.22 | 32/32 | 76 |
| cameo | 158.56–343.63 | 959.16 | 853.20–1,060.85 | 471.90 | 178.90 | 30/32 | 76 |
| overlapping-favorites | 158.56–343.63 | 1,122.05 | 1,005.90–1,211.93 | 552.61 | 249.22 | 32/32 | 76 |
| healthy-new-studio | 2.00–2.00 | 0.00 | 0.00–0.00 | 0.00 | -2.00 | 0/32 | 5 |
| earned-crossover | 158.56–343.63 | 1,122.05 | 1,005.90–1,211.93 | 552.61 | 249.22 | 32/32 | 76 |
| unearned-crossover | 158.56–343.63 | 871.28 | 761.77–975.16 | 428.51 | 138.32 | 30/32 | 76 |
| weak-crossover | 158.56–343.63 | 596.10 | 539.31–629.48 | 292.97 | -6.72 | 14/32 | 74 |
| continuity-fatigue | 158.56–343.63 | 1,030.78 | 916.72–1,112.39 | 506.92 | 209.07 | 32/32 | 76 |
| streaming-catch-up | 158.56–343.63 | 1,122.05 | 1,005.90–1,211.93 | 552.61 | 249.22 | 32/32 | 76 |
| short-streaming-window | 2.00–2.00 | 99.18 | 76.47–127.27 | 49.01 | 43.47 | 32/32 | 67 |
| no-streaming-deal | 2.00–2.00 | 157.31 | 121.07–199.09 | 77.66 | 70.33 | 32/32 | 69 |
| high-price-low-income | 2.00–2.00 | 75.18 | 60.64–88.29 | 37.11 | 33.44 | 32/32 | 61 |
| recession | 2.00–2.00 | 110.64 | 85.41–142.08 | 54.71 | 48.82 | 32/32 | 67 |
| limited-seats | 2.00–2.00 | 2.83 | 2.70–2.92 | 1.41 | -1.10 | 0/32 | 70 |
| saturated-competition | 2.00–2.00 | 101.13 | 82.59–114.31 | 50.32 | 44.74 | 32/32 | 70 |
| satisfied-repeat | 2.00–2.00 | 358.74 | 310.03–412.16 | 177.06 | 163.57 | 32/32 | 72 |
| late-sleeper | 2.00–2.00 | 14.43 | 12.20–15.62 | 7.13 | 4.65 | 32/32 | 58 |
| extreme-demand | 158.56–343.63 | 10,315.63 | 10,315.63–10,315.63 | 4,938.03 | 4,096.82 | 32/32 | 93 |

The targeted indie assumes good delivered quality (70–90), a real $0.5M campaign and no rival. Its 32 positive seeds do not imply every small film wins. Weak-wide has no awareness; access cannot create viewers. Crossover costs vary $150–350M, with an actual $30M campaign and earned/uneared/weak-payoff controls. The extreme-demand fixture uses four times the authored population and unusually high available spending; its result proves no artificial $3B cap and is not a normal forecast.

Source: `calibration-after.json`; schema 1, tuning 2. p10/p90 describe the authored seeds, not a statistical prediction interval.
