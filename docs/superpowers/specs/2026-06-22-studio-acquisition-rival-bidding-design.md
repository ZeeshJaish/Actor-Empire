# Studio Acquisition Rival Bidding Design

## Goal

Extend Phase 6 inside the existing Forbes Studio Acquisition Desk so eligible deals can become limited bidding wars when a rival studio enters.

## Approach

This stays inside the current acquisition case state machine and current Acquisition Desk UI. No new page is created. A rival bid is treated as a special seller response: the board says another studio has entered, shows the rival, the rival offer, current round, and the max rounds left.

## Player Experience

When a submitted offer resolves, the seller can now respond in four visible ways:

- accepted terms
- seller counter
- rejected terms
- rival bidding round

The rival round should feel like a tense deal table: compact, high-contrast, amber/rose pressure styling, and a clear comparison between the player's offer and the rival's offer. The player can beat the rival bid with a prefilled amount, revise manually, or walk away. If the player does not improve enough by the final round, the case closes as lost to rival pressure.

## Logic

Rival entry uses deterministic game-state inputs so audits are stable: studio id, player id, offer round, acquisition state, and offer ratio. Auction-expected, distressed, and open-to-offers studios are more likely to invite a rival. Rival bidding is capped at three rounds.

The new response decision is `RIVAL_BID`. It stores:

- rival studio name
- rival bid amount
- minimum required player bid
- round
- max rounds
- summary

Responding with a bid at or above the required amount resubmits the case as `OFFER_SUBMITTED` for the next week. Responding below the requirement is rejected. Walking away closes the case.

## UI

The existing response card gets a fourth visual mode:

- title: `BIDDING WAR`
- hero copy: `Rival At The Table`
- comparison rows: `Your Offer`, `Rival Bid`, `Beat By`
- pressure strip: `Round X / 3`
- primary CTA: `Beat Rival`
- secondary CTA: `Custom Bid`
- tertiary CTA: `Walk Away`

The current accepted/counter/rejected visuals remain unchanged.

## Testing

Extend the existing acquisition audit to prove:

- a deterministic rival bid can be generated
- the rival response stores rival name, rival amount, required bid, and max rounds
- beating the rival resubmits the case
- bidding below the required amount is rejected
- final-round rival pressure closes as rejected/lost instead of looping forever

Extend the UI audit to prove the Acquisition Desk renders the bidding-war labels and actions.
