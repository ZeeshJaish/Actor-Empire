# Box-office Phase 1 — trustworthy inputs and money

Recovery checkpoint `f693fd248c861cedecf2fb78f74f57bdab0ddd28` was pushed to `origin/codex/streaming-tap-lag` before gameplay edits. [Approved design](../../superpowers/specs/2026-10-22-fair-box-office-design.md) · [Implementation plan](../../superpowers/plans/2026-10-22-fair-box-office.md).

## Task 1 — canonical package identity

Reproduced five input regressions before repairing them: accepted offers became a singleton player cast; legacy singleton packages stayed incomplete; duplicate actor IDs added fame; uncredited players added fame/talent; a fixed Monsterverse offer received Marvel's studio instead of Warner Bros. A separate actual `processGameWeek` test reproduced the `actorId` handoff loss before wiring normalization.

Offered empty/player-only packages now receive a deterministic reconstruction using real catalogue actors near the offered craft level. Existing ensembles, authored studio casting, salaries and story identities are preserved. New authored packages carry an explicit source marker. The release adapter recognizes both actor-ID formats, collapses people for fame/depth while retaining character credits, and excludes director rows from actor depth. Player fame/talent requires a real credit. Universe offers retain their template studio.

Validation: seven input cases, actual week handoff/source-save immutability, existing Studio AI B6 commercial-result audit and TypeScript pass. The legacy fame multiplier still exists; this is not the later bounded-awareness engine or final earnings balance.

## Execution notes

Contracts are introduced with working consumers. Phase 1 defines canonical production/finance types; the later week-market/forecast/migration payloads will be added in their owning phases instead of committing unused placeholder state or activating a new save schema prematurely.

The original audit results remain unchanged. New phase evidence is written here, not over the pre-revamp measurements. No historical player cash is reclaimed and no old contract is rewritten.
