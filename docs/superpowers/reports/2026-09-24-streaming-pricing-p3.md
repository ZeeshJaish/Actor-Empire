# Streaming pricing P3 — responsive editing and concise forecast

**Date:** 2026-09-24  
**Status:** Implemented and technically checked. Creative approval and physical-device performance are not claimed.

## Delivered

- The yearly and introductory discount sliders now keep their visible handle, percentage and discounted-price preview local during a gesture. Pointer release/cancel, touch end, keyboard release, blur and unmount commit the final value once. A rapid second gesture may legitimately commit a newer value before the first React acknowledgement.
- The wizard owns one deferred pricing revision and passes the same forecast to the pricing page, sticky pricing strip and blueprint. Stable pricing, market and world-context inputs prevent unrelated draft autosaves from rerunning the world forecast. While a new revision is computing, the page and strip say Updating rather than present an old number as current. The blueprint shows an unavailable dash until its shared result is ready.
- The visible forecast is now opening audience and potential gross, explicitly conditional on playability and buyers. One disclosure holds stream and country rows, monthly/annual subscriber allocation, expected ad income and equivalent-billing explanation. Readiness blockers remain outside the disclosure. Unknown amounts are not presented as zero.
- The pricing strip's figure changes immediately with the committed forecast; its old count-up animation had temporarily disagreed with the page. Other wizard strip animations are unchanged.
- A disposable `?profile` lab fixture records world-forecast calls, draft writes, render work, range-input-to-next-animation-frame samples and available long-task observations. It neither reads nor mutates career slots.

## Measured browser evidence

The P0 report recorded repeated full-C6 discount-drag React updates of **82.7–84.3 ms**, with one **102.6 ms** sample. I recreated its C6 week-2039 ad-core plus subscription setup at an actual **320 CSS-pixel viewport**, renamed Essential Plus with three-week early access and set the annual discount to 30%. Three introductory-offer drags (0 → 30 → 60 → 0) then produced the larger React updates at **21.7–38.4 ms**; small intermediate renders were 0–0.3 ms. These are React Profiler render durations, not end-to-end input latency, and the browser is not a physical phone.

The 320px isolated counter received four native range input events during one 0 → 40 drag, but recorded **one** final draft write and **one** additional world forecast (counters 2 → 3 and 1 → 2). Its forecast call took **40.7 ms** after the commit; no world call was recorded for intermediate values. In the full 320px wizard, twelve range-input-to-next-animation-frame samples during the three drags were **0.8–1.3 ms**. The browser attached a Long Tasks observer and recorded no entry in that short run. These next-frame samples stop before paint and are not INP or a real-device smoothness guarantee. The document had **320px client and scroll width**, so no page-level horizontal overflow was observed.

The price preview updated to $5.59 at a 30% introductory offer, $3.20 at 60%, and $7.99 when off in the annual-30% C6 fixture. Page and sticky strip showed the same settled potential gross after each drag. On the full wizard, targeting an 80% introduction to Standard alone changed the preview to $2.60 then $12.99 and the expanded breakdown showed 9.9M monthly and 1.1M annual subscription buyers separately. The blueprint showed the same $33.3M monthly gross as pricing; navigating back preserved the 80% Standard targeting and the amount. This is a disposable session fixture, not a signed career-save test.

## Save and economy impact

P3 adds no schema, world-settlement or AI-pricing rule. A completed slider gesture sends one pricing draft instead of autosaving every intermediate value; navigating away flushes a pending draft. Forecast display and ownership changed, not the underlying commercial calculation. The C6 economic fixtures still passed, including subscription, ad-only, store-only, hybrid and delivery-capacity checks. P4's automatic CPM/ad-cadence rule and P5's audience/revenue calibration remain separate work.

## Checks

- `npm run audit:streaming-pricing-p3` — pass. The new audit was first observed failing before implementation; it checks gesture coalescing, unmount flush, rapid reversal, one shared world call, readiness and unavailable/pending states.
- `npx tsc --noEmit -p tsconfig.streaming-pricing-p3.json` and `npm run lint` — pass.
- `npm run audit:streaming-commercial-c5`, `npm run audit:streaming-commercial-c6`, `npm run audit:streaming-billing-cohorts` — pass.
- `npm run build` and `git diff --check` — pass. The build still reports the existing `/index.css`, mixed static/dynamic import and large-chunk warnings.
- Browser: actual 320px lab and full C6 wizard, discount previews, target-plan change, breakdown, blueprint and back navigation checked. A physical phone and OS reduced-motion preference were not tested.

## Next

P4, only after separate approval: replace the transitional player target-CPM control with market-decided player/AI rates and make ad frequency the clear player lever. P5 then investigates the billion-scale revenue concern; P3 does not claim the balance is fixed. P6 covers signed-career save/reopen and physical-device visual regression.
