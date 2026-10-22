# Full-world booking and audience calibration

Tuning 3; 19 conditional scenarios × 4 deterministic seeds = **76 runs**, **2,383 focal title-weeks**. Every run uses 197 canonical countries, 2,363 mixed audience cohorts and the existing cinema networks. The standard slate has 24 rotating authored rival films; the deliberate peak stress has 32 simultaneous heavily promoted same-market rivals. Reachable platform alternatives come from actual existing offers, prior customers and playable viewing proofs (1,560 aggregate rows).

All 52 paired tendency checks pass. Supply, seats, screen minutes, cohort wallets, leisure and receipt conservation are checked every week. All focal runs closed naturally before the 104-week observation horizon: **0 censored runs**. There is no implemented 104-week retirement rule, gross ceiling or budget-return cap.

Amounts below are **USD millions**. Profit means collected producer receipts minus production budget, campaign spend and actual booking charges; it excludes downstream streaming/music and is not public gross minus budget. Four seeds are a small conditional sample. The recorded p10/p90 estimators select the extrema at this sample size; these are not population confidence intervals or player-wide hit probabilities.

| Controlled scenario | Budget | Campaign | Gross range | Producer receipts | Theatrical profit | 95% of gross by week | Final local closure week | Profitable / 4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Unknown, no campaign, local | 2.00 | 0.00 | 0.00 | 0.00 | -2.00 | 0 | 3 | 0 |
| Unknown, no campaign, worldwide | 2.00 | 0.00 | 0.00 | 0.00 | -2.21 | 0 | 3 | 0 |
| Focused small film | 2.00 | 0.50 | 14.35–26.02 | 7.12–12.92 | 3.68–8.75 | 14 | 31–34 | 4 |
| Same small film, wider unused booking | 2.00 | 0.50 | 14.35–26.02 | 7.12–12.92 | 3.48–8.55 | 14 | 31–34 | 4 |
| Same small film, weak delivery | 2.00 | 0.50 | 6.80–9.63 | 3.37–4.78 | 0.41–1.63 | 12 | 26–28 | 4 |
| Strong film, low exposure | 2.00 | 0.03 | 1.25–1.80 | 0.62–0.89 | -1.51–-1.27 | 13 | 21–23 | 0 |
| Hindi local release | 2.00 | 0.50 | 5.41–9.55 | 2.49–4.39 | -0.49–1.06 | 14 | 30–33 | 3 |
| Two major stars, weak delivery | 50.00 | 5.00 | 139.88–159.58 | 68.52–78.31 | 3.12–11.68 | 12 | 37–38 | 4 |
| Two major stars, strong delivery | 50.00 | 5.00 | 310.84–355.86 | 152.45–174.81 | 75.75–95.67 | 14 | 43 | 4 |
| Earned universe event | 200.00 | 30.00 | 505.30–602.98 | 247.28–295.05 | -16.70–24.61 | 14 | 44 | 3 |
| Same event, no earned buildup | 200.00 | 30.00 | 443.78–528.02 | 217.17–258.39 | -43.25–-7.48 | 14 | 43–44 | 0 |
| Expensive event, weak delivery | 200.00 | 30.00 | 184.73–221.25 | 90.20–108.03 | -154.05–-138.44 | 12 | 37 | 0 |
| Small film, no rival slate | 2.00 | 0.50 | 14.34–26.01 | 7.12–12.92 | 3.68–8.75 | 14 | 31–34 | 4 |
| Honest expectations | 50.00 | 5.00 | 186.42–213.42 | 91.37–104.78 | 22.81–34.54 | 13 | 39–40 | 4 |
| Oversold expectations | 50.00 | 5.00 | 157.05–179.45 | 76.95–88.08 | 10.35–20.07 | 13 | 38–39 | 4 |
| Small film, no reachable home alternatives | 2.00 | 0.50 | 14.36–26.05 | 7.13–12.94 | 3.69–8.77 | 14 | 31–34 | 4 |
| Small film, known early streaming window | 2.00 | 0.50 | 13.69–24.76 | 6.80–12.29 | 3.40–8.20 | 14 | 31–34 | 4 |
| Small film, halved cinema wallet | 2.00 | 0.50 | 10.93–19.55 | 5.43–9.70 | 2.20–5.94 | 14 | 30–33 | 4 |
| Small film, 32 simultaneous major rivals | 2.00 | 0.50 | 4.83–7.00 | 2.53–3.61 | -0.23–0.77 | 18–20 | 31–34 | 2 |

## What the controls show

- Unknown local and worldwide films both sell zero tickets without recognition/campaign/earned word of mouth in these fixtures; the wider footprint incurs more booking cost. These are intentionally empty-demand controls, not a claim that every unmarketed film earns zero.
- Focused-small and wide-small have exactly equal gross in each seed. The wider booking pays more. Extra unused access cannot turn into paid intent.
- Strong delivered films outperform matched weak delivery. Earned-universe viewing improves the event; weak and strong event versions have identical unviewed openings, proving that private final quality does not leak into opening demand.
- A strong $2M low-exposure film grows after opening but still loses money here. A small film can succeed with effective reach and delivery; small budget alone does not force either profit or failure.
- Weak cheap films and the $50M star packages remain profitable in these four standard-slate seeds. That is an observed outcome, not a forced-hit policy. Expensive weak events lose money and even strong earned events can fail to recoup all costs.
- The 32-rival peak stress reduces the same small film opening in all four seeds. The normal rotating slate is often slack; imposing an extra competition penalty in a slack market would not represent a binding resource.
- Removing all rivals leaves the identical public opening unchanged. Lifetime gross is slightly lower without rival patrons discovering the focal film’s real local posters later; this is earned delayed exposure, not generated opening intent.
- Reachable home alternatives and known early streaming windows reduce or preserve matched theatrical demand. Foreign, inaccessible or unplayable catalogue rows provide no alternative. Scarcer cinema wallets cannot force more spend.

## How long a film stays

Final closure is the last remaining country/chain pool closing after its local booking and quiet observations. It is not the duration of a wide release. Successful examples earn 95% by roughly weeks 12–18 while a small residual footprint can survive into weeks 30–44. Unknown controls close in week 3. The JSON records weeks with any actual show separately as `offeredWeeks`; `localRunWeeks` is the distribution of the final local booking-decision observation and includes quiet/discovery windows. It must not be presented as actual full-screen commercial tenure.

Renewal uses current funded demand, prior admissions, local occupancy and exhibitor contribution. Denied capacity does not make a viable film quietly expire. Discovery/quiet rules can end an unviable local run; no fixed film-age cutoff ends a healthy one.

## Interpretation limits

These are controlled aggregate market runs, not 76 complete procedural careers. Country macroeconomics and prior platform resources remain fixed during each scenario so paired comparisons isolate the requested change. Actual weekly career/save progression and live App settlement are verified separately. Four archetype seeds do not establish a universal hit/flop rate; broader telemetry and real-device measurements remain useful after release.

The event archetype explicitly supplies two fame-92 leads, English/Hindi/Spanish accessibility, urgency 95, prior satisfied universe viewing and a $30M campaign. Those are engine input assumptions, not a promise that the current release UI exposes each as a control. The live adapter currently supplies the original language and genre-based urgency; its shared forecast uses those actual live facts. Use the real release preview for a particular project rather than treating the archetype range as that project's payout.

[Booking and occupancy replays](booking-occupancy.md) show the commercial footprint shrinking from the opening to a final single quiet pool. All four replayed economic trajectories match the main matrix exactly.

## Reproduce

```sh
CINEMA_FULL_SEEDS=4 CINEMA_FULL_OUTPUT=/private/tmp/full-world.json node scripts/run-box-office-audit.mjs full-world
node scripts/verify-box-office-full-world.mjs /private/tmp/full-world.json
```

`CINEMA_FULL_RESUME=1` resumes a matching tuning/seed/horizon report. `CINEMA_FULL_CASES` selects explicit named scenarios. The complete per-seed inputs are authored in `scripts/fixtures/boxOfficeFullWorld.ts`; [saved results](full-world-results.json) and [per-seed CSV](full-world-results.csv) retain all amounts, weekly gross, censor flags and timing observations.
