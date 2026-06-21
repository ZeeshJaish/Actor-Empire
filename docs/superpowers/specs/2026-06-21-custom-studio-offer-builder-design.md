# Custom Studio Offer Builder Design

## Goal

Replace the large fixed-offer cards in Phase 6 Offer Setup with a compact custom deal builder. Players choose the transaction structure and set the exact opening terms while retaining useful valuation guidance.

## Offer Setup Flow

The Offer Setup stage contains:

1. A two-way structure selector:
   - **Full Acquisition**
   - **Minority Stake**
2. An exact offer-amount control.
3. A stake-percentage control when Minority Stake is selected.
4. Live valuation analysis and seller-response guidance.
5. Compact quick-fill chips for Conservative, Fair, and Aggressive.
6. The existing **Choose Funding** action.

The current four large offer cards are removed. Conservative, Fair, and Aggressive remain guidance presets, not separate deal types. Minority Investment becomes a transaction structure instead of a preset card.

## Full Acquisition

The player enters the exact price offered for 100% control.

The amount control includes:

- editable currency input;
- decrement and increment controls;
- quick-fill chips:
  - Conservative: 88% of reference value;
  - Fair: 100% of reference value;
  - Aggressive: 115% of reference value;
- reference value label showing whether it comes from public valuation or completed due diligence.

The service stores the submitted amount exactly after normalizing it to a safe whole-dollar value.

## Minority Stake

The player chooses:

- exact ownership percentage from 5% through 49%;
- exact total amount offered for that block.

The UI shows:

- implied company valuation derived from `offer amount / stake percentage`;
- premium or discount against the reference company value;
- the target’s strategic-influence threshold;
- whether the selected block would remain Financial Stake or reach Strategic Stake;
- the player’s existing ownership position, so the result reflects combined ownership.

Quick stake controls include 10%, 20%, 25%, and 30%, but the percentage is also directly editable.

## Live Deal Intelligence

As the player edits terms, the panel updates:

- offer amount;
- reference value;
- premium or discount percentage;
- proposed ownership;
- combined post-deal ownership for minority offers;
- seller-response posture;
- affordability status.

Seller-response posture is guidance rather than a guaranteed outcome:

- **Dismissive:** materially below credible value;
- **Testing:** discounted but plausible;
- **Serious:** around fair value;
- **Compelling:** meaningful premium;
- **Overpaying:** excessive premium with unnecessary capital risk.

Due diligence improves the reference value but never removes the player’s freedom to enter another amount.

## Validation

The builder blocks continuing when:

- the amount is missing, non-finite, or not positive;
- a full acquisition offer is below 50% or above 200% of reference value;
- a minority stake is outside 5–49%;
- the implied company value is below 50% or above 200% of reference value;
- the chosen structure is unavailable for the company;
- no funding source can support the amount.

Publicly traded companies remain minority-only in this slice.

Validation must explain the exact issue without resetting the player’s entered amount or stake.

## UI Direction

The screen stays consistent with the Acquisition Desk:

- compact strategy-game control surface;
- one selected structure panel instead of four vertically stacked cards;
- prominent monetary figure with tactile plus/minus controls;
- quick-fill chips as secondary controls;
- live premium meter using blue for discount, emerald around fair value, amber for premium, and red for overpayment;
- minority stake meter showing progress toward the company’s 20%, 25%, or 30% strategic threshold;
- sticky **Choose Funding** button that displays the entered offer amount.

The first viewport should show the structure choice, amount, valuation response, and funding action without requiring excessive scrolling.

## Data and Architecture

`studioAcquisition` will:

- expose a custom-offer analysis helper;
- accept `offerAmount` when submitting an opening offer;
- retain the existing preset calculations as quick-fill helpers;
- validate full and minority custom terms;
- persist the normalized custom amount and minority percentage.

`StudioAcquisitionDesk` will:

- own the editable draft amount and stake;
- derive analysis during render;
- preserve values while moving between Offer Setup, Funding, and Review;
- show the custom amount in funding and final review.

No new app, route, message type, or duplicate acquisition state is introduced.

## Testing

Service audits cover:

- exact custom full-acquisition amounts;
- exact custom minority amounts and stakes;
- preset quick-fill values;
- premium and discount calculation;
- implied minority valuation;
- response-posture bands;
- minimum and maximum validation;
- public-company full-acquisition blocking;
- submitted custom amount persistence;
- no purchase-price deduction on submission.

UI audits and browser QA cover:

- removal of the four large preset cards;
- full/minority structure switching;
- amount editing;
- minority stake editing;
- quick-fill chips;
- live premium and seller-posture feedback;
- strategic-threshold feedback;
- validation messaging;
- funding and review screens using the custom value;
- responsive first-viewport density.

## Out of Scope

This change does not implement seller responses, counters, bidding wars, financing, split funding, closing, or ownership transfer.
