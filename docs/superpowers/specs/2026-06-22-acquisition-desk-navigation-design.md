# Acquisition Desk Navigation Design

## Goal

Make Acquisition Desk navigation predictable by using one back control and preventing submitted offers from reopening completed setup stages.

## Behavior

- Remove the redundant close (X) control from the Acquisition Desk header.
- Keep the back arrow as the desk's only header navigation control.
- Before an offer is submitted, the arrow continues moving through the existing stages in reverse: Review to Funding, Funding to its source stage, Offer Setup to Public View, and Public View back to the studio profile.
- When the acquisition case is `OFFER_SUBMITTED`, the arrow closes the Acquisition Desk immediately and returns to the studio profile.
- Do not change offer submission, funding, diligence, or persistence logic.

## Accessibility

- The arrow announces `Back to studio profile` when it will leave the desk.
- The arrow announces `Previous acquisition step` while it will move within the setup flow.
- Only one header navigation button is exposed to assistive technology.

## Verification

- Extend the existing source audit to reject the close button and require the submitted-offer exit guard.
- Verify the audit fails before the implementation and passes afterward.
- Run the acquisition logic audit, lint, and production build.
- In the in-app browser, verify a submitted offer exits directly to the studio profile and does not reopen Funding.
