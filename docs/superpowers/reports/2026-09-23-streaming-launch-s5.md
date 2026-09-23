# Streaming Launch S5 — Build presentation, responsiveness, and title art

## Outcome

The four-stage Build wizard is more usable on a short phone without changing placement, quote, save, treasury, rehearsal, or commissioning rules. The map and regional answer remain first, while server/cloud controls now precede the potentially long per-country list. That list, optional provider alternatives, Money comparisons, and commissioning room schedules remain available through keyboard-native disclosures. The Build header wraps instead of truncating, and the bottom strip labels the measure it is showing for each stage.

Scout, Workhorse, Titan, and the three fictional cloud providers have in-game vector marks and concise comparison cards. The provider cards disclose reach, ceiling, weekly unit price, and trade-off. No real-world provider branding was imported.

Listed streaming titles now share one artwork adapter across Define Launch, opening catalogue, content-market listings, and Studio Finance. It prefers saved production/custom poster media where the player record provides it; otherwise it uses the existing deterministic one-sheet. Storefront mockups and cinematic artwork remain image-rich and unchanged. The finance projection now carries the poster from the player record through title rankings, detail, and top earners; this is presentation data, not a save-schema or economics change.

## Verification

| Check | Observed result |
| --- | --- |
| Increment-sized probe, before/after | Same six-market lab fixture, seven warm Node rounds: baseline median **75.6 ms** (72.9–107.5), final median **21.9 ms** (19.4–25.3), about **71% less**. The probe includes placement, derived Build reads, and server rendering; it is not a field INP or device latency claim. |
| Live responsive lab | Checked 393×600, 393×852, and 1280×800 layouts with empty/partial/23-country and 14-room fixtures. No document horizontal overflow in the inspected states. On a 393×600 phone, the sticky map tucks from about 222 px to 114 px after scrolling and restores at the top. The 23-country list and provider agreement opened by touch and keyboard. |
| Live increment | Titan count 2→3, rack count 6→7, displayed coverage 51→55%, and costs updated without a non-finite display in the inspected fixture. |
| S5 audits | `audit:streaming-launch-s5-ui`, `audit:streaming-launch-s5-art`, and `audit:streaming-launch-s5-performance` pass. The art audit covers deterministic fallback, custom-media precedence, and finance ranking propagation. |
| Connected regression audits | `audit:streaming-region-placer`, `audit:streaming-build-test-autosave-gates`, `audit:streaming-linked-budget-sheets`, `audit:streaming-launch-phase8`, `audit:streaming-catalogue-anchors`, `audit:streaming-build-world`, `audit:streaming-pricing-world`, `audit:streaming-build-country-map`, `audit:streaming-launch-draft-continuity`, `audit:streaming-regional-network-lifecycle`, `audit:streaming-build-lab-career-parity`, `audit:streaming-regional-plan-migration`, `audit:streaming-launch-s2`, `audit:content-market-ui-transplant`, `audit:streaming-opening-catalogue-phase6`, and `audit:streaming-rights-marketplace-phase16` pass. |
| Static/release checks | TypeScript with an 8 GB Node heap, production Vite build, and scoped `git diff --check` pass. Existing bundle-size and CSS import warnings remain. |

## Failures and limitations

| Item | Status / treatment |
| --- | --- |
| `audit:world-streaming-we4`, `we5`, `we6` | Still fail at the inherited game-loop ordering source-text assertion that expects `const ownedStreamingResult`; current code uses `let`. This was documented in S4 and is not an S5 integration breakage. These later audit sections therefore have not passed. |
| `audit:streaming-finance-room` | Fails at “Founder injection should credit company treasury atomically.” Its fixture contributes **$25M** and verifies the founder was debited **$25M**, but the next assertion expects a **$26M** treasury. The capital service credits the exact contributed amount. This audit and that service are unchanged by S5; the assertion appears stale, but the remainder of this audit is not verified until it is reconciled in S6. |
| Default-heap `tsc` | Previously exhausted the default ~4 GB heap. The 8 GB run passed; this is a check-resource limitation, not a reported type error. |
| Full career and commissioned visual path | Not exercised end-to-end in S5. Lab fixtures are not a substitute for a saved-career register→commission→construction→reload walkthrough. |
| Real saved custom image in browser | The renderer and finance projection were audited with a custom-media fixture, but a real player's saved poster was not visually inspected in the live browser. |
| Performance | The Node probe isolates a repeatable increment-sized path; it does not prove a production handset's interaction-to-next-paint or autosave timing. S6 should measure those in the full journey if a device is available. |

No commit or push was made. **S6 is the next phase**, subject to the user's approval: whole-career regression, save and migration cases, mobile/desktop visual matrix, inherited-failure ledger, and a separate release decision. S5 by itself is not a release gate.
