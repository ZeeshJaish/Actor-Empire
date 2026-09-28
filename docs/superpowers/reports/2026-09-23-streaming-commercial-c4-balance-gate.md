# C4 live economy — implementation and balance gate

Date: 2026-09-23  
Status: **C4 economy and conditional forecast complete at the phase boundary.** C5 UI and C6 release regression remain separate gates. Not release-ready. Nothing committed or pushed.

## Rules now active

- WE5 paid accounts use C3 subscription choices. Free-ad and store households no longer become zero-price paid subscribers or subscription revenue.
- Free-ad player viewing requires an `AD_SUPPORTED` C2 title-country route. It earns only on delivered ad-eligible hours. New services build awareness over time; marketing and maturity drive the ramp.
- Player and AI ads use a deterministic country-week advertiser-demand market. The player sets ad minutes and a *target* CPM; the market resolves fill and realized CPM. Zero hours/load/demand means zero receipts, and a platform cannot spend more than its allocated advertiser budget.
- Player rentals and permanent purchases are uniform-price, C2 rights-checked, and offered to store-led viewers or subscribers/free viewers who cannot already watch that title through their primary offer. Monthly entertainment budget and existing ownership constrain sales. A purchase or live rental gets a compact saved aggregate entitlement; the week-boundary batch is fingerprint-idempotent.
- The optional one-hour and 24-hour ad-free passes are sold only to eligible ad viewers with payment budget. They change ad exposure, not title access. Covered hours are removed before ad clearing; both pass variants flow to the existing WE6 country/title/platform revenue, weekly operations, and company treasury. An old standalone `daypass` switch does not also charge when a new ad-free pass is configured. The conditional launch forecast uses the same pass-conversion and ad-clearing kernels.
- WE7 now includes free/store-led platforms with no WE5 paid-customer cell, so their incremental receipts and operating results do not disappear from the world economy.

## Measured comparison

Deterministic C4 US fixture, one licensed title, four-week-old service:

| Offer | Audience/accounts | Weekly receipts | Per active account/week |
| --- | ---: | ---: | ---: |
| Free with ads | 365,483 selected households; 230,161 viewing | $17,132 ads | $0.074 per viewing household |
| $7.99 subscription | 250,000 paid accounts | $438,424 subscription | $1.754 per account |

The same free service at two years has 2,036,118 selected households under the awareness ramp. This establishes the approved direction: free reaches more people but earns much less per viewer; later scale can make it viable. It is a balance fixture, not a revenue promise.

Optional $2 one-hour and $5 24-hour ad-free passes in the free fixture yield 2,813 and 922 sales, $5,626 and $4,610 respectively. They cover 5,579 viewing hours; ad revenue falls from $17,132 to $16,924. Pass + ad gross, commercial cost, and country/title/platform sums reconcile. A hybrid fixture has 250,000 subscribers, 45,649 store-led households, and 6,822 rights-valid rentals, including subscribers buying outside their plan.

The C0 US+India free-only scenario now has 1,164,810 free viewing accounts, 2,368,531 delivered hours, and $29,151 ads; US earns $20,492 and India $8,659. The earlier interim figure of 10,097,472 viewers and $23,290 ads was **before** the approved awareness/ad-market calibration and is superseded.

## AI title and save gate closed

AI viewing now resolves playable title-country routes through the shared C2 evaluator before counted subscription/free-ad viewing or ad cash. Authored core AI contracts and released originals are authoritative. A signed title with a denied mode, wrong country, expired/terminated position, or unreleased linked plan cannot produce store cash. Uncontracted legacy/abstract operators receive a **finite, saved opening-catalogue snapshot** (one to four titles, with a store-only title for hybrids); it is seeded once, not regenerated as a weekly sale or inferred afresh from catalogue strength. Later expansion does not silently grant those titles in new countries.

AI rental and purchase conversions now share the player's price-response curve. C3 cohort budgets and existing plan spend bound the buyer pool; a title already included in a subscription/free offer cannot be sold again to that cohort. Compact saved rental/purchase ownership prevents repeated sales during the rental window or after a permanent purchase. Every AI store receipt has a deterministic platform-country-title-contract-week transaction; those rows sum to each country and platform's rental/purchase cash. Existing same-week WE6 saves are not recalculated, while their next week freezes a catalogue; JSON save compaction/migration preserves that catalogue and ownership.

The launch forecast now includes **conditional** rent and buy weekly estimates from the same choice, affordability, and conversion rules, alongside the existing conditional ad/pass forecasts. These estimates assume one playable store-only title; they are not booked cash or a guarantee of opening rights. C5 must label and present that assumption in the UI.

## Balance impact requiring product observation

The corrected AI conversion raises the deterministic Apple TV fixture from **$4.48M** to **$8.24M** weekly rent/buy receipts (+84%) because its store-only opening title can now be bought by qualified paid viewers outside their plan. Across all 33 rivals, current-week rent/buy receipts are **$90.22M** versus **$1.592B** subscription receipts (5.7%); this is bounded by audience budgets, country rights, title ownership, and the existing player conversion curve. No conversion coefficients or country population totals were tuned to hide this shift. Observe long-run platform balance in C6 before release; if this uplift is not desired, choose a separate balance rule rather than silently adding an AI penalty.

Legacy sponsor/patron and standalone premium accrual are deliberately left unchanged; removing their historical income needs the separately approved conversion decision. AI title-level *store* transactions are saved, while AI general viewing analytics still retain their older country/platform aggregation; C5 must not present aggregate viewing as title-specific data.

## Verification performed

Passing after these edits: C0, C1, C2, C3, C4 targeted audits; WE5/WE6/WE7 including the WE6/WE7 400-year horizon checks; commercial economy audit; targeted C4 TypeScript check; Vite production build; `git diff --check`. C4 additionally verifies authored AI grant denial, territory, termination, finite legacy snapshots, country/title/platform receipt reconciliation, budget and plan-inclusion rules, purchase saturation, save compaction/round trip, and complete free/store/hybrid game weeks. WE6's 400-year state was 502.3 KiB; WE7's was 359.2 KiB.

The Vite build still reports existing missing `/index.css`, mixed dynamic/static import, and large-chunk warnings. The separately documented inherited baseline audit failures were not changed by this C4 work.
