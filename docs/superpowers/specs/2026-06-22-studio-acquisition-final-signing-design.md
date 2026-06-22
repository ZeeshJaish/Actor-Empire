# Studio Acquisition Final Signing Design

## Outcome

Accepted studio acquisition offers become completed company ownership. The player sees one final deal-review surface, signs the documents, pays from the selected source, and the acquired company is added to the existing owned production-house/business system.

## UX direction

Keep the final step inside the current Forbes Acquisition Desk. The accepted state becomes a compact, cinematic "Final Deal Review" with assets, liabilities, funding source, promises, and a single "Sign & Acquire Studio" action. After signing, the desk shows a green/gold "Deal Signed" state so the player can immediately tell the transaction is complete.

## Gameplay rules

- Opening offers reserve intent only; no purchase funds move until signing.
- Signing is allowed only after seller terms are accepted.
- Full acquisitions create an owned production house using the existing `Business` and `studioState` structure.
- Minority investments remain tracked as investment stakes and do not create a full owned studio in this slice.
- If the chosen funding source no longer has enough money at signing, the signing action fails safely and the accepted case remains open.
- Diligence data, if present, supplies verified liabilities and income. Without diligence, public estimates are used in the final review.

## Data flow

`StudioAcquisitionDesk` calls a final signing callback. The service deducts the agreed price from personal wealth or selected studio capital, creates/updates the owned production-house business, marks the case `ACQUIRED`, writes a player log, and creates/updates a `STUDIO_ACQUISITION` inbox message. Forbes then uses the existing player-business profile path to display the studio as player-owned.

## Error handling

Signing returns structured failure reasons for missing accepted case, minority deal, missing funding source, insufficient funds, or duplicate ownership. UI feedback stays local to the desk and does not close the flow on failure.

## Testing

The acquisition audit covers personal-funded signing, studio-capital signing, and insufficient funds at signing. The UI audit checks for the final review, document signing action, signed state, callback wiring, and closing copy.
