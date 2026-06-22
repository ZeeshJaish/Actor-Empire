# Rights Negotiation And Signing Design

## Goal

Turn every available property in Development Lab -> Market -> Properties into a
real acquisition opportunity. Investigation remains optional intelligence; it
improves the player's information and leverage but never blocks an offer.

## Player Flow

1. Open a public property file.
2. Choose `Acquire` immediately, or commission an optional Inside Report first.
3. Choose a deal structure:
   - Option: cheapest, temporary control, one development window.
   - License: mid-price, limited projects and time.
   - Permanent Buyout: expensive, permanent ownership.
   - Catalog Purchase: permanent package ownership, catalog listings only.
4. Submit an offer. The amount is held, not spent, while the offer is active.
5. Advance the week and receive an owner response in Messages.
6. Return to the same property file to accept, counter, satisfy a creative
   guarantee, enter a short bidding war, or walk away.
7. Review and sign a tactile contract sheet.
8. The studio pays once, the market listing closes, a public news item appears,
   and the property enters Development Lab -> Vault -> Rights.

## Owner Responses

The deterministic negotiation engine can return:

- Accepted
- Rejected
- Counteroffer
- Creative guarantee requested
- Rival offer received
- Formal bidding war

Negotiations allow at most three submitted rounds. The same save state cannot be
rerolled for a better answer by reopening the screen.

## Investigation Advantage

An Inside Report is not permission to buy. It provides:

- A small negotiation leverage bonus.
- A visible estimated value range.
- Hidden advantages, dangers, and rival activity.
- Better context for choosing the deal structure and offer.

## Money And Exploit Protection

- Active offers reserve capital so the same studio balance cannot fund several
  simultaneous offers.
- Money is deducted only when the final agreement is signed.
- A property supports only one active negotiation per studio.
- A signed deal cannot be signed or charged twice.
- Expired or dismissed listings cannot start a new deal.
- Walking away releases the held capital.

## UI

No new top-level page is added.

- Public File: `Acquire`, `Track`, and optional `Get Inside Report`.
- Inside Report: `Acquire` and `Walk Away`.
- Deal Room: a cinematic owner-response panel inside the existing property
  modal, with clear deal cards, offer controls, round count, and capital held.
- Contract: paper sheet, terms, signatures, and an animated approval stamp.
- Messages: a bespoke acquisition memo showing the owner's response.
- Vault -> Rights: collectible ownership cards with deal type, control,
  acquisition cost, expiry/project allowance, and a `Develop` action.

The visual language stays black, amber, paper, stamps, and studio-room drama.
It must feel like a Hollywood power play, not a finance dashboard.

## Owned Rights

Signed rights are stored separately from working scripts. Developing an owned
right creates a new concept in the existing script pipeline, preserving the
current Concept, Greenlight, Franchise, and Universe systems.

## Compatibility

Old saves normalize missing negotiation and ownership arrays to empty arrays.
Existing Market, Watch Desk, Inside Report, Script Vault, Franchise, and
Universe behavior remains available.

