# Content Market CM2 Report

**Completed:** September 8, 2026
**Scope:** Private offers and weekly seller responses only. CM3 live buyer auctions and CM4 upcoming sales were not implemented.

## Player-visible result

- Every eligible individual listing now offers `Accept listed terms` or `Make private offer`.
- The private term sheet keeps upfront money, platform share, duration, rights type, and exact markets in the main view. Marketing, viewership bonus, renewal, sublicensing, sequel rights, cancellation, and change-of-control terms remain behind one optional disclosure.
- `Your offers` is a permanent Content Market deal ledger with awaiting, countered, accepted, declined, sold elsewhere, withdrawn, expired, and signed outcomes.
- Seller replies arrive after a saved deterministic two-or-three-week wait. Accepted and countered terms have a three-week action window.
- Each seller response creates one Message notification. Its action opens the exact offer in the streaming Content Market.

## Simulation and settlement

- Submission and revision persist the proposal version, submission week, response week, processed version, response, rationale, and signing deadline.
- The seller evaluates cash, revenue share, exclusivity, clauses, marketing/bonus value, market heat, rival value, and prior signed deals with that seller.
- A proposal does not reserve rights, grant a licence, or charge money. Signing rechecks uncommitted treasury, the current rights map, proposal state, and deadline; settlement remains idempotent through the existing rights transaction system.
- A competing rights sale closes an affected pending offer. Reprocessing the same week cannot reroll the seller or duplicate the SMS.
- Existing non-CM2 negotiations and CM1 instant purchases remain separate and backward compatible.

## Verification

- `npm run audit:content-market-cm2` — passed.
- `npm run audit:content-market-cm1` — passed.
- `npm run audit:streaming-rights-marketplace-phase16` — passed.
- `npm run audit:streaming-weekly-loop-phase10` — passed.
- `npm run audit:streaming-rights-calendar-phase4` — passed.
- Isolated Playwright mobile flow at 390px and 320px — passed, including editor disclosure, submission, Your Offers, and SMS-to-exact-offer navigation.
- `npm run build` — passed.
- Full `tsc --noEmit` is still blocked by the pre-existing unrelated `StepBlueprint.tsx(143,18): Cannot find name 'depth'` error; CM2 introduced no additional TypeScript diagnostics.
