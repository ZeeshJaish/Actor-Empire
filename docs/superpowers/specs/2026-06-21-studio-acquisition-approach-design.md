# Studio Acquisition Approach — Phase 6 Slice 1 Design

## Goal

Turn an eligible Forbes studio profile into the beginning of a real acquisition process without creating another app or forcing the player through due diligence before making an offer.

This slice ends when the player has prepared and submitted an opening offer. Seller responses, counters, rivals, bidding rounds, final confirmation, and ownership transfer belong to later Phase 6 slices.

## Player Flow

The flow remains inside the existing company system:

1. Open Forbes.
2. Select an eligible studio.
3. Choose **Approach Studio** from the studio dossier.
4. Enter the Acquisition Desk overlay.
5. Either:
   - make an offer immediately using public company information; or
   - purchase optional due diligence before choosing an offer.
6. Select the offer structure and funding source.
7. Review the financial and compliance consequences.
8. Submit the opening offer.

Messages are not used for approaching a company or completing due diligence. Messages become relevant in the later negotiation slice when the seller accepts, rejects, counters, or a rival bidder enters.

## Eligibility

The player cannot approach:

- their own production studio;
- a company marked **Not for Sale**;
- a company without an active investment or acquisition route;
- a company that already has an unresolved player offer.

Eligible states behave as follows:

- **Open to Offers:** full acquisition and minority investment are available.
- **Seeking Investment:** minority investment is emphasized; a full acquisition offer may still be attempted at a meaningful premium.
- **Distressed:** full acquisition and minority investment are available, with increased hidden-liability risk.
- **Auction Expected:** the player may prepare and submit an opening position before the later bidding-war slice.
- **Publicly Traded:** direct full acquisition is not available in this slice; the player can pursue a negotiated minority block.
- **Not for Sale:** monitoring remains available, but Approach Studio is locked.

## Acquisition Desk UI

Approach Studio opens a focused overlay above the existing Forbes dossier. It is not a new phone app or route.

The visual direction should feel like a strategy-game command screen while remaining consistent with the Forbes editorial dossier:

- compact company masthead with valuation and acquisition state;
- strong hierarchy rather than oversized empty cards;
- a deal-stage rail showing Public View, Offer Setup, Funding, and Review;
- restrained gold for acquisition actions;
- emerald for healthy financial outcomes;
- red for liabilities and compliance exposure;
- blue for personal funding;
- violet for studio-capital funding;
- visible selection states, meters, and consequence summaries;
- a sticky final action that always names the next consequence.

The opening screen presents two clear paths:

- **Make Offer Now**
  - uses public valuation and visible company information;
  - carries an explicit Unknown Liabilities warning;
  - does not charge a research fee.
- **Run Due Diligence**
  - optional and paid;
  - reveals hidden liabilities, adjusted value, expected income, and a safer offer range;
  - never blocks the immediate-offer path.

## Due Diligence

The due-diligence fee scales with company valuation but is capped:

- base fee: 0.15% of valuation;
- minimum fee: $250,000;
- maximum fee: $25,000,000.

The fee and result persist per company. The player cannot accidentally purchase the same report twice.

Before diligence, the Acquisition Desk shows:

- public valuation;
- visible capital;
- estimated debt;
- public profitability;
- catalog, rights, facilities, talent, and management information already available in Forbes;
- an Unknown Liabilities risk state.

After diligence, it additionally reveals:

- verified debt;
- hidden liabilities;
- contractual and employee obligations;
- adjusted enterprise value;
- expected annual income;
- diligence confidence;
- recommended opening-offer range;
- primary acquisition risk.

The generated result must be deterministic for the same player save and company record. Reloading the save must not reroll liabilities or company value.

## Opening Offer Structures

The player chooses one of four structures:

- **Conservative**
  - below the public or adjusted value;
  - lowest acceptance chance;
  - preserves capital.
- **Fair**
  - near the public or adjusted value;
  - balanced acceptance chance and cost.
- **Aggressive**
  - meaningful premium;
  - strongest initial acceptance chance;
  - more likely to attract rivals later.
- **Minority Investment**
  - purchases a negotiated ownership block instead of the full company;
  - the offered percentage and price are shown together;
  - available for eligible private and public companies.

The exact seller response is not resolved in this slice. The submitted offer is stored as a pending acquisition case for the negotiation slice.

## Funding Choice

Due-diligence fees and opening offers use the same funding-choice popup:

### Personal Wealth

- uses `player.money`;
- represents a personally funded investment;
- has no acquisition compliance-risk increase;
- clearly shows available funds and remaining personal cash.

### Production Studio Capital

- uses the selected player-owned production studio balance;
- records the payment as a business investment or acquisition expense;
- may receive favorable tax treatment in later financial processing;
- creates acquisition compliance risk;
- clearly shows available studio funds, remaining studio capital, and projected risk.

Funding cannot be split between personal and studio balances in this slice. An unavailable or insufficient source is disabled with a precise reason.

Due-diligence fees are deducted immediately from the selected source because the service has been delivered. Submitting an opening offer does not deduct or reserve the purchase price. It validates that the selected source can currently support the offer, records the funding intent, and previews the post-deal balance. The acquisition price is deducted only if the seller accepts and the player confirms the final deal in a later slice.

## Compliance Risk

Studio-funded acquisition spending is not automatically tax evasion. It creates scrutiny based on the transaction’s structure and business justification.

The projected compliance-risk score ranges from 0 to 100 and considers:

- payment size relative to the funding studio’s valuation and balance;
- payment size relative to the target’s value;
- whether the target is a media or production company with a credible strategic fit;
- the funding studio’s profitability and debt health;
- prior studio-funded acquisition activity;
- whether the purchase is a full acquisition, minority stake, or diligence expense.

Risk bands:

- **0–24: Routine**
- **25–49: Reviewable**
- **50–74: High Scrutiny**
- **75–100: Investigation Likely**

This slice previews and stores the risk attached to the proposed funding structure. The player does not gain permanent compliance exposure merely by making an offer. Exposure is applied when a studio-funded deal closes. Investigation events, legal defence, fines, reputation consequences, and clearance are handled in a later acquisition-consequences slice.

## Forbes “Your Position” Panel

Every studio dossier gains a **Your Position** panel connected to the existing Stocks portfolio and future negotiated minority investments.

For a related public stock, it shows:

- shares owned;
- current holding value;
- exact ownership percentage;
- dividends received or estimated yield;
- influence status;
- progress to the company’s strategic-stake threshold;
- a button that opens the existing Stocks app.

For negotiated private or public minority investments, the same panel shows the recorded equity percentage and investment value. Stock-market holdings and negotiated blocks contribute to one combined company position.

If the player has no position, the panel says **No Current Stake** and explains whether stock purchases or a negotiated block are available.

## Real Ownership Percentages

Stock ownership percentage must not be estimated from share count alone. Each linked stock receives a stable outstanding-share count. The percentage is:

`player shares / outstanding shares × 100`

Outstanding shares persist with the stock definition and remain stable unless a future stock-system feature explicitly changes them.

## Strategic Influence Thresholds

Financial ownership and strategic influence are separate.

- ordinary holdings provide financial exposure and dividends;
- strategic influence begins only when the combined company stake reaches its threshold;
- this slice displays influence progress but does not yet add board-vote mechanics.

Thresholds vary by company structure:

- **Publicly traded or widely distributed ownership:** 20%
- **Strategic or widely held private ownership:** 25%
- **Founder-controlled, family-controlled, or protected ownership:** 30%

The dossier displays progress explicitly, for example:

`12.4% owned / 25% required for strategic influence`

Crossing a threshold changes the position label from **Financial Stake** to **Strategic Stake**. Full ownership uses **Controlling Owner**.

## State and Architecture

The implementation should extend current systems rather than duplicate them:

- Forbes remains the company discovery and approach surface.
- Existing studio profiles supply public company data.
- Existing Stocks and Portfolio data supply public holdings.
- Existing player-owned production houses supply studio-capital funding.
- A focused acquisition-case service owns eligibility, diligence, offer preparation, funding validation, compliance preview, and persistence.
- The Forbes studio dossier owns the Acquisition Desk overlay and Your Position presentation.

Player flags may hold migration-safe acquisition cases initially, but the stored records must be typed and isolated behind service accessors so they can move to a dedicated player field later without rewriting the UI.

## Persistent Acquisition Case

Each target may have one active case containing:

- target studio ID and name;
- acquisition state when approached;
- public valuation snapshot;
- approach week and year;
- diligence status, fee, funding source, and revealed report;
- selected offer structure;
- minority percentage when applicable;
- offer amount;
- funding source;
- compliance-risk preview;
- status: `DRAFT`, `OFFER_SUBMITTED`, `CLOSED`, or `ACQUIRED`.

Repeated clicks must reopen the existing case rather than charge fees or create duplicate offers.

## Error Handling

The UI must handle:

- insufficient personal funds;
- insufficient production-studio capital;
- missing player-owned production studio;
- ineligible target state;
- player-owned target;
- duplicate diligence purchase;
- duplicate submitted offer;
- stale stock or studio links;
- legacy saves without acquisition-case, outstanding-share, or compliance fields.

Failures keep the Acquisition Desk open, preserve the player’s selections, and explain the exact blocking reason. No money is deducted until validation succeeds.

## Testing

Service audits must cover:

- eligibility across every acquisition state;
- direct offers without diligence;
- optional diligence pricing, cap, persistence, and deterministic results;
- no duplicate diligence charge;
- each offer structure;
- immediate personal and studio deductions for diligence fees;
- offer funding validation without premature purchase-price deduction;
- insufficient-funds blocking;
- compliance-risk bands and inputs;
- pending-case persistence and duplicate-offer blocking;
- real stock ownership calculations;
- combined stock and negotiated equity positions;
- 20%, 25%, and 30% strategic thresholds;
- player-owned target blocking;
- legacy-save defaults.

UI audits and browser testing must cover:

- game-style Acquisition Desk entry from Forbes;
- immediate-offer and diligence paths;
- funding popup balances and risk preview;
- disabled unavailable funding sources;
- submitted-offer completed state;
- Your Position with no holding, public shares, strategic stake, and player ownership;
- return to the existing Stocks app;
- responsive behavior within the phone frame.

## Out of Scope

This slice does not implement:

- seller acceptance, rejection, or counteroffers;
- rival bidder entry;
- timed bidding rounds;
- acquisition promises;
- final asset-and-liability confirmation;
- cinematic signing;
- company ownership transfer;
- board votes or strategic-influence actions;
- compliance investigation events;
- split funding, loans, or acquisition financing.

Those systems build on the acquisition case in later Phase 6 slices.
