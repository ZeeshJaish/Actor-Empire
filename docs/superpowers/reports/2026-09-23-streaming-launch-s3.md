# Streaming launch S3: group markets, geography, and filing energy

Date: 2026-09-23. Implemented inline in the authoritative Actor Empire checkout. No commit, push, player-save edit, energy purchase change, or S4–S6 feature work.

## Outcome

The approved batch filing curve is now shared by the transaction, opening-programme quote, Markets preview, and Clearance action. One country costs **5E**. Filing **7/13/23 new countries together costs 17/25/30E**; the action caps at 30E. It applies to any batch, not just a named group. The transaction filters the current unfiled operations before quoting and charging, so a repeated or partially overlapping request cannot recharge an already-filed country. Country rights/compliance cash, independent government review, reapplication energy, and requirement energy did not change.

The group card remains a selection shortcut over country records. The report now displays a shared-atlas map, selected and unselected country markers, fallback pins for countries absent from the atlas silhouette, the aggregate calculation method, and each country's filing status, audience, access/compliance cash, expected review, standalone energy, and consumer requirements. The map is optional for input: the country list and individual report remain usable. Region tabs use a readable count pill; the summary wraps instead of clipping; a fully selected region offers **Remove all**.

## Original failure disposition

| ID | Result | Evidence |
|---|---|---|
| F01 / F22 | Resolved in code and synthetic career: Caribbean's 13-file action is 25E, not 65E; North America's 23-file action is 30E, not 115E. | S3 energy/UI audits and 393px fixture. |
| F03 | Resolved in the 393×600 and 393×852 fixture: the `23` count is a wider text pill, not a cramped circular badge. | Phone screenshots and no-overflow browser assertions. |
| F04 | Resolved in the fixture: count, chosen, audience, energy, and Add/Remove action wrap and remain visible. | Phone browser checks. |
| F23 | Resolved at the registry/model boundary: 197 countries occur exactly once across 24 groups and six regions; every member has a finite map point and shape or marker. Caribbean's 13 and NA's 23 reconcile; country-derived aggregate arithmetic is audited. | Geography audit, report browser check, small-island keyboard test. |
| F32, found during S3 | A zero-cash country report divided each cost by a zero total, rendering `NaN%` bars. Resolved with finite zero-width segments; filing energy remains visible even when cash due is zero. | Red-then-green S3 UI audit. |

The first browser assertion failed only because CSS capitalized its text; the assertion was corrected. The headless browser initially could not launch inside the filesystem sandbox and was rerun with approved isolated browser access. Neither was an application defect. No unresolved new S3 product failure remains.

## Verification

| Check | Result |
|---|---|
| `npm run audit:streaming-launch-s3-energy` | 6 pass: curve, 13/23 filings, partial/reload/repeat, cross-region batch, 0/29/30/100E, cash and treasury block. |
| `npm run audit:streaming-launch-s3-ui` | 4 pass: 13-file and partial 11-file previews match Clearance's real action quote; zero-cash filing energy and report bars stay finite. |
| `npm run audit:streaming-launch-s3-geography` | 4 pass: six regions, 197 unique countries, 24 group viewports, null-shape fallback, aggregate math. |
| Isolated browser at 393×600, 393×852, 1280×800 | Pass: 23 selected, 30E region quote, Caribbean 13-marker report and 25E group quote, keyboard toggle of Saint Vincent's marker to 12 selected / 24E, no horizontal or sheet clipping, no page errors. |
| S0/S1/S2, opening-programme domain/UI, regional lifecycle, draft continuity, Phase 8, region placer | Pass. S0's current trace shows a two-country filing at 7E; its original 10E trace remains historical evidence. |
| `NODE_OPTIONS=--max-old-space-size=8192 node_modules/.bin/tsc --noEmit` | Pass. |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run build` | Pass. Existing Vite mixed static/dynamic import and large-chunk warnings remain; `/index.css` is still a runtime reference. The new map is a lazy-loaded 2.28 kB chunk. |

The browser fixture uses in-memory catalogue-shaped country data on the current local Vite server, whose process directory was verified as this checkout. It does not inspect or mutate the player's saved career. All 24 group map models were audited programmatically, while only the North America/Caribbean path was visually and interactively checked. The whole-career S6 gate remains open; S4 pricing and S5 broader UI issues are outside this phase.
