# Summary alignment polish — 21 October 2026

Presentation-only change to the coverage/market-count hero and three cost metrics. Two equal centered columns replace the old left-heavy flex row. The104px ring contains only a centered percentage with a smaller percent suffix; captions sit below both columns. Cost labels, values and units are centered in three equal columns, with one-time/per-week/weeks occupying the same row. Calculations, data, Apply and purchases are unchanged.

Production QA build exited0 (existing chunk warnings retained). A real generated99.9%/195-of197 result was inspected in the disposable QA save. At normal width, both columns measured176.59px; percentage text62.56px fit within the104px circle with20.72px horizontal inset. At actual320×741CSSpx, both columns measured136.20px, both caption baselines matched, all three value baselines matched, all three unit baselines matched, and the sheet had no horizontal overflow. An initial viewport override resolved to152CSSpx because of browser zoom; it was recalibrated before the320px verification. Temporary viewport was restored. No extra behavioral tests were added for this cosmetic correction; `git diff --check` passed.

The user's actual game was already on Money and was left there; verification used a temporary QA tab. Images use the fixture's purple brand; the actual platform continues to use its own brand tokens.

[Normal width](summary425.png) · [320px width](summary320.png)
