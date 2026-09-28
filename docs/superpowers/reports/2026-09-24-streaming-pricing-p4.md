# P4 — Ad cadence and automatic market CPM

**Status:** Implemented and technically checked on 2026-09-24. Visual approval remains with the user. No commit, push, release, or P5 balance tuning is part of this phase.

## What changed

- The expanded ad offer has one player decision: no ads, or one 30-second ad opportunity every 5, 10, 15, 20, or 30 eligible viewing minutes. Every 10 minutes maps to six opportunities and three ad minutes per hour. The UI labels these as opportunities, not guaranteed impressions.
- Existing saved ad-minute loads, including zero and non-preset decimals, remain exact and appear as a custom saved load until changed. The historical `ads.cpm` field remains readable in saves but is neither an active offer nor an input to new market outcomes. Settled history is not replayed.
- Forecast and weekly viewing call the same deterministic country-week clearing resolver. It shares one finite advertiser demand budget across player and AI supply and derives price and fill from demand pressure, inventory, audience quality, brand suitability, country and week. No separate AI rate bonus is applied.
- Live supply is based on delivered eligible viewing. Player ad-free-pass-covered hours are removed before clearing. No delivered eligible hours, no ad load, or no demand yields no ad receipts. More load can increase inventory while reducing audience appeal.
- The card shows estimated CPM and fill with a disclosure explaining uncertainty. The pricing lab label advances to P4.

## Same-fixture receipts before and after

These are deterministic audit fixtures, not promised game-wide balance. P4 intentionally changes the ad market; P5 is the separate audience/revenue calibration phase.

| Fixture | Before P4 | After P4 |
| --- | ---: | ---: |
| C4 US free-ad player weekly ad revenue | $17,132 | $63,320 |
| C4 US free-ad player filled impressions | 1,175,051 | 3,687,856 |
| C4 AI aggregate weekly ad revenue | $31,163,016 | $117,910,228 |
| C6 first-live ad-only incremental gross | $34,237 | $84,905 |

In the C4 comparison, the free offer earned about $0.275 per active free viewer per week after P4, against $1.754 per paid account per week on the comparable subscription fixture. The C6 ad-only career remained operating-negative (about −$49,742 for the checked week). These checks show the requested free-reach versus paid-yield trade-off in these fixtures, not a universal profit guarantee.

## Verification

- Red/green P4 audit covered cadence conversion, one shared budget, player/AI parity, order independence, low/no demand, no view, zero load, high load, other-country isolation, custom/zero save migration, and ad-card output.
- C4 checked unchanged live and forecast results for a saved CPM changed from 22 to 99, total US player-plus-AI spend no greater than the US advertiser budget, ad-free pass inventory exclusion, and audience loss under excessive load.
- `npm run audit:streaming-pricing-p1`, `p2`, `p3`, `p4`; `npm run audit:streaming-commercial-c1`, `c4`, `c5`, `c6`; `npm run lint`; `npm run build`; and `git diff --check` passed. The build continues to print its pre-existing large-chunk/dynamic-import notices and missing `/index.css` notice.
- At 320 CSS px in the pricing lab, the expanded ad card showed the custom legacy load, market estimate, and all cadence buttons. Choosing 10 minutes updated the displayed six opportunities/three ad minutes and revised the conditional forecast. The document width remained 320 px. Browser emulation is not real-device proof.

## Next boundary

P5 should reproduce the user's reported billion-scale forecast and calibrate audience and receipts against real cohort affordability, catalogue, reach and costs. Do not hide a balance defect behind an arbitrary revenue cap. P6 remains the final career/save/mobile regression phase.
