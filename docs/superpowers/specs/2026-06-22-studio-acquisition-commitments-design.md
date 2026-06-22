# Studio Acquisition Commitments Design

## Goal

Add takeover promises to Phase 6 studio acquisitions without creating another screen.

## Player Experience

During Offer Setup, the player can attach visible deal promises:

- Preserve Studio Name
- Protect Employees
- Guarantee Productions

These appear as compact toggles under the custom offer amount. They should feel like negotiation cards on a deal table: small, sharp, and game-like. Selected promises carry into review, seller responses, counters, rival bidding, and later final signing.

## Logic

Commitments are stored on the acquisition offer. Each commitment adds seller leverage because it makes the takeover safer for the board:

- preserving the name gives modest trust
- protecting employees gives stronger board/public trust
- guaranteeing productions gives the strongest creative continuity promise

The seller response uses an effective offer ratio: money ratio plus commitment leverage. Commitments can turn a near-miss into an acceptance or improve the quality of a counter. They do not deduct money immediately, because the actual obligations should matter in the final signing/ownership slice.

## UI

The existing Acquisition Desk gets one compact section in Offer Setup:

- Header: `Deal Promises`
- Supporting copy: `Promises can improve board trust, but they become obligations after signing.`
- Three toggle cards with short labels and one-line effects.

The Review step shows selected promises in a small strip so the player understands what is being sent. Submitted and response cards show promises attached so accepted/countered deals are visually traceable.

## Scope

This slice only adds promises to offer/counter/rival negotiation. Enforcement after the deal closes belongs to the next final-signing/ownership-transfer slice.
