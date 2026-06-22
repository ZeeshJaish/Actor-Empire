# Studio Seller Response Slice Design

## Goal

Continue Phase 6 inside the existing Forbes Acquisition Desk by resolving opening offers into accepted, countered, or rejected seller responses.

## State and timing

- `OFFER_SUBMITTED` remains the pending state.
- Advancing one game week resolves each pending opening offer deterministically.
- Strong premiums are accepted, credible offers receive a counter, and weak offers are rejected.
- Each response is persisted on the existing acquisition case and creates one Business Affairs inbox message.

## Player actions

- Accepted: show a distinct green terms-agreed state. Final signing remains a later Phase 6 slice.
- Countered: show seller terms and allow Accept Counter, Revise Offer, or Walk Away.
- Rejected: show a distinct red closed state with the option to close the file.
- Revising reuses the original funding source and returns the case to `OFFER_SUBMITTED` for the next weekly response.
- Walking away closes the existing case without moving money.

## Navigation

- Acquisition messages contain a `Review Offer` button.
- The button opens Forbes, selects the matching studio, and opens its existing Acquisition Desk.
- No duplicate acquisition page or Messages-only negotiation system is introduced.

## Scope boundary

This slice does not transfer funds, add rivals, collect promises, or complete ownership. Those remain later Phase 6 slices.

## Verification

- Service audit covers accepted, countered, rejected, accept-counter, revise, and walk-away transitions.
- UI audit covers distinct visuals and actions.
- Browser QA covers message routing and the counter response screen.
