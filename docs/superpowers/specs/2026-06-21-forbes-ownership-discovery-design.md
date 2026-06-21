# Forbes Ownership Discovery — Phase 5 Slice 3 Design

## Goal

Make studio acquisition states actionable while keeping Forbes a discovery surface rather than building acquisition negotiations early.

## Contextual Commands

- Not for sale and Publicly traded: Monitor Studio.
- Open to offers: Express Interest.
- Seeking investment: View Investment Opportunity.
- Distressed and Auction expected: Prepare Acquisition.
- Player-owned studio: no self-targeting action.

## Flow

The command is executed from the existing Forbes studio dossier. It records one durable discovery state in player flags and creates an unread Forbes Business Desk message. Repeating an action is blocked and the button changes to a completed state. The message explains what has been recorded and that detailed investment or acquisition negotiations arrive in the next ownership phase.

## Architecture

A pure `forbesOwnershipDiscovery` service owns action selection, idempotency and message creation. `ForbesApp` passes its existing player updater into the dossier. `MessagesApp` needs no new application route because the result is a standard informational message.

## UI

Add an Ownership Command panel beneath the acquisition-state card. It includes one strong state-aware action, a short consequence description and completed feedback. The styling follows the editorial dossier instead of introducing a generic CTA footer.

## Testing

Audit all acquisition-state mappings, player-owned blocking, duplicate prevention, flag persistence and message generation. Source-audit the command UI and player update wiring. Browser-test market, player and NPC profiles plus the resulting inbox entry.

