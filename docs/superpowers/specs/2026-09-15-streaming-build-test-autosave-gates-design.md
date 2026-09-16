# Streaming Build Test, Autosave, and Launch Gates

**Date:** 2026-09-15  
**Status:** Approved in chat; awaiting written-spec review

## Goal

Make the Build Test stage a mandatory, player-controlled rehearsal and remove misleading manual-save requirements from Define the Launch. Team-assisted planning may choose Sites and Plans, but it must never disable or silently perform the player's load test.

## Current Problems

1. Approved-team mode wraps the Test stage in a disabled fieldset, so **Test the load** cannot be opened.
2. Commissioning currently runs a load test automatically, allowing a build to pass without the player performing the rehearsal.
3. Define Launch keeps some edits in a volatile UI draft while the launch blueprint is a separate manual checkpoint. The Launch stage therefore reports unsaved work even after the player has configured the wizard.
4. The rehearsal and launch gates do not present one consistent reason when an action is unavailable.

## Product Rules

### Player ownership

- Team-assisted mode may own Sites and Plans.
- Campaign and marketing choices remain player-controlled.
- Test is always player-controlled and interactive.
- Commission and Opening Night cannot bypass a missing, stale, or failed rehearsal.

### Autosave versus commitment

- Free configuration changes are persisted to the player save immediately.
- Paid actions, legal filings, purchases, leases, commissioning, and Opening Night remain explicit confirmation boundaries.
- A persisted draft is not treated as a paid commitment.
- The manual **Save blueprint** action is removed. When all required Define Launch inputs are valid, the current definition signature is checkpointed automatically.
- The Blueprint screen displays a read-only status such as **Autosaved · current** or a precise incomplete reason.

### Rehearsal validity

- A successful rehearsal is recorded against one deterministic readiness signature.
- The signature covers the selected opening markets, market clearances, service identity, storefront, pricing/commercial offer, catalogue readiness, marketing forecast, facilities, rack groups, power/cooling/fibre limits, and server allocation.
- Changing any covered input invalidates the earlier evidence and visibly requires another test.
- `BROKE`, missing, and stale results all block commissioning and Opening Night.
- The existing rehearsal simulation remains free and does not mutate treasury or live infrastructure.

## Data and Service Design

### Persisted Define Launch draft

Add a normalized optional draft snapshot to the owned streaming launch-program state. It stores free wizard intent needed to restore the current screen after navigation or application restart. Migration accepts saves without the snapshot.

All draft updates flow through one service-level save function. It sanitizes values, increments a revision only when data changes, and returns the updated `Player`. The React layer does not become authoritative.

Confirmed domain actions continue to update their existing canonical models. After any canonical launch-definition mutation, a shared auto-checkpoint helper recalculates the definition signature and records it only when all required prerequisites are complete.

### Rehearsal boundary

The existing explicit rehearsal action remains the only path that writes current load-test evidence. Commissioning validates that evidence but does not create it. Repeated commission attempts remain idempotent and cannot charge before validation succeeds.

### Gate projection

Build and launch surfaces consume a shared readiness result containing:

- `ready`
- stable blocker code
- player-facing reason
- destination stage
- current readiness signature

This prevents the Test button, Build Launch page, and wider launch program from disagreeing.

## UI and UX

### Test stage

- Do not wrap Test in the team-managed disabled state.
- Keep **Test the load** prominent.
- When unavailable, keep the control readable and show an adjacent reason rather than relying on disabled styling alone.
- After a run, show `HELD`, `RENTED`, or `BROKE`, the tested signature state, and whether another run is required.

### Blueprint

- Replace the manual save button with a compact autosave state.
- Incomplete requirements link to their existing wizard steps.
- Copy distinguishes saved draft intent from paid/approved commitments.

### Launch

- Remove the rehearsal override.
- Each red gate remains tappable and routes to the relevant stage.
- The primary action explains the first unresolved blocker rather than only reporting a count.

## Failure Handling

- Autosave failure leaves the last valid canonical state intact and displays a non-destructive retry message.
- A stale rehearsal is never silently reused.
- Missing handlers produce a visible reason instead of a dead disabled button.
- Legacy saves without autosaved draft or rehearsal metadata normalize safely and begin in a blocked, recoverable state.

## Verification

Use test-driven development with focused regression coverage for:

1. Team-assisted plans leave Test interactive.
2. Commissioning fails without a current player-run rehearsal.
3. A successful current rehearsal unlocks commissioning.
4. A failed or stale rehearsal blocks commissioning.
5. Changes to launch definition, marketing, or infrastructure invalidate the test.
6. Free Define Launch draft changes persist through remount/save normalization.
7. Paid actions remain explicit and are never triggered by autosave.
8. Blueprint checkpointing becomes automatic only when prerequisites are complete.
9. Test, Build Launch, and launch-program gate projections agree.
10. Mobile UI displays actionable blocker copy without overflow.

Run focused Build, launch-program, save/migration, marketing, and browser audits plus the production build. The 400-week soak is not required for this change.

## Out of Scope

- Team-selected marketing campaigns.
- Reworking the rehearsal animation itself.
- Changing market-clearance prices or processing time.
- New technology or research mechanics.
