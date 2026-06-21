# Owned IP Card Density Design

## Goal

Make the Rights Library faster to scan by replacing oversized ownership cards with compact IP dossiers, while using “IP” for creative assets and reserving “rights” for legal deal terms.

## Language

- The asset is an **IP**: Owned IP, IP Library, Develop IP.
- The legal arrangement remains **rights**: rights expired, rights type, buyout, option, and licence.
- Empty-state and helper copy refer to acquired IP, not property.

## Compact dossier

Each IP uses one compact card with:

1. A single header row containing deal type, rarity, title, genre/type, and ownership state.
2. One three-column performance rail containing acquisition price, projects made or left, and lifetime gross.
3. A slim full-width Develop IP action.
4. The creative guarantee appears only when present and remains visually secondary.

The card removes oversized metric pills, excessive vertical gaps, background initials, and decorative empty space. It keeps the existing accent edge, dark cinematic surface, and clear owned/expired state.

## Performance data

Lifetime gross is derived from existing active releases and past studio projects whose `subjectName` matches the owned IP title. It includes theatrical gross plus recorded streaming revenue. If no matching release has earned revenue, the card shows **Unproven** rather than `$0`.

No new revenue ledger or duplicate ownership system is introduced.

## Responsive behavior

The three metrics remain on one row at mobile widths with compact typography. Long titles may wrap, but badges and metrics must not create horizontal scrolling.

## Verification

- A source audit checks the approved IP terminology, compact metric labels, Unproven state, and existing-release revenue derivation.
- TypeScript lint and production build pass.
- Browser QA verifies the Rights lane at the current mobile viewport and the Develop IP interaction.
