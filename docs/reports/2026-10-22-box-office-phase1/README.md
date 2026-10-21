# Box-office Phase 1 — trustworthy inputs and money

Recovery checkpoint `f693fd248c861cedecf2fb78f74f57bdab0ddd28` was pushed to `origin/codex/streaming-tap-lag` before gameplay edits. [Approved design](../../superpowers/specs/2026-10-22-fair-box-office-design.md) · [Implementation plan](../../superpowers/plans/2026-10-22-fair-box-office.md).

## Task 1 — canonical package identity

Reproduced five input regressions before repairing them: accepted offers became a singleton player cast; legacy singleton packages stayed incomplete; duplicate actor IDs added fame; uncredited players added fame/talent; a fixed Monsterverse offer received Marvel's studio instead of Warner Bros. A separate actual `processGameWeek` test reproduced the `actorId` handoff loss before wiring normalization.

Offered empty/player-only packages now receive a deterministic reconstruction using real catalogue actors near the offered craft level. Existing ensembles, authored studio casting, salaries and story identities are preserved. New authored packages carry an explicit source marker. The release adapter recognizes both actor-ID formats, collapses people for fame/depth while retaining character credits, and excludes director rows from actor depth. Player fame/talent requires a real credit. Universe offers retain their template studio.

Validation: nine input cases, actual week handoff/source-save immutability, existing Studio AI B6 commercial-result audit and TypeScript pass. The legacy fame multiplier still exists; this is not the later bounded-awareness engine or final earnings balance.

## Execution notes

Contracts are introduced with working consumers. Phase 1 defines canonical production/finance types; the later week-market/forecast/migration payloads will be added in their owning phases instead of committing unused placeholder state or activating a new save schema prematurely.

The original audit results remain unchanged. New phase evidence is written here, not over the pre-revamp measurements. No historical player cash is reclaimed and no old contract is rewritten.

## Task 2 — continuous production and meaningful craft

Before the repair, seven delivery assertions failed, including ordinary craft/max equipment reaching 100, zero craft becoming average, fame replacing acting craft, inconsistent generated budget labels, tier-only risk differences, and a $250M opening jump for one dollar across $120M. An additional regression exposed the incomplete/nondeterministic blockbuster fallback cast.

Craft now uses normalized script/direction/cast/crew weights, bounded diminishing equipment benefits, location/story fit and background delivery. Fame does not increase acting craft. Explicit zero values remain zero. Greenlight stores its visible estimate separately from hidden realized production quality. Existing money/cost formulas for equipment and staff were retained.

Generated budgets cover all four declared tiers consistently. The old opening/ceiling, risk, depth and distribution inputs use continuous cash-scale interpolation where the actual budget is known, rather than granting a reward when a label changes. Legacy label-only callers retain a compatibility fallback. This is an interim repair: legacy monetary caps, weekly retention shortcuts and timed theater exits are still replaced by the audience/supply engine in later phases, not certified as final balance here.

Validation: eleven delivery cases and the real release handoff pass; existing Greenlight, studio-production-economy and production-risk audits pass. Review reproduced further $35M/$90M event/sleeper opening and retention cliffs. Both opening and later retention now taper continuously with cash scale. The intentional Greenlight reference changes are 69→74 for talent-only casting and 97→80 for the craft/gear fixture; the new assertions separately protect the removed exploits.

## Task 3 — realized gross and financial facts

The final-gross branch reproduced an actual saved week with $10,001 ticket gross but $11,201 combined exhibitor/producer receipts. Distribution now applies the remaining ceiling before allocating shares and supports already-realized gross without applying the demand modifier again. An unavailable chain footprint cannot generate unallocated ticket money.

A further actual-week regression caught net receipt ledger entries followed by another investor deduction. New theater/soundtrack entries now record receipts before the separate investor payout, while cash still receives the correct net amount. Existing historical entries are not rewritten; the studio-sale earnings adapter retains its legacy net-entry compatibility.

The new finance boundary uses integer cents, exact basis-point allocation, safe-range checks, identified/deduplicated ledger events, and explicit player-dollar versus NPC-million adapters. Conflicting events and unknown categories are rejected. Upfront actor pay is reported separately and is already included in production cost, so it is not charged twice.

Current financial cards/archive records use collected producer receipts across theater, streaming and soundtrack. Actor personal earnings cannot become producer receipts. Explicit zero receipts remain zero; missing legacy receipts are labeled estimates. Paid marketing is included in return calculations. Fully funded production still exposes the studio's separately paid marketing, while zero cash at risk has no artificial ROI record. Signed backend with missing historical aggregate cost is marked estimated rather than presented as exact profit.

Actual Greenlight funding includes the marketing reserve in its initial debit. ROI now counts that package once, subtracts recorded reserve refunds, and adds only marketing outside the reserve. A real `prepareGreenlightFunding` regression catches the former 18.75% versus correct 46.15% result for $190M receipts/$130M paid exposure. Investor/production-fund financing and refunded reserve have separate coverage.

Migration preserves unrecorded legacy ticket gross separately from actual receipts. Later real weekly receipts append without turning the earlier gap into exact zero; this provenance survives reload and completed-run archives. No historical cash is changed. Numeric zero already persisted by an older migration cannot be distinguished from a genuine zero without independent evidence; it is retained rather than guessed away.

The actual dashboard render test verifies $130M theatrical receipts + $50M streaming + $10M soundtrack = $190M producer receipts and a 46% return against $100M production + $30M paid marketing. This is a server render/data check, not browser tap latency or physical-device certification. Recharts emits its usual zero-layout-size notice during server rendering.

Review also added regressions for duplicate player rows reducing an ensemble, self-directors receiving an uncredited acting-talent bonus, and custom actor fame being lost at the release handoff. All now pass through the actual consuming boundaries.

Production-house active/library presentation adapters preserve the original finance and funding fields before adding display values. The archive detail adapter retains receipt provenance and never substitutes actor pay. Both dashboard routes are rendered in the audit; Box Office detail uses the same canonical receipt/estimate basis. Actual theatrical and streaming soundtrack ledger entries record gross receipts with separate investor deductions; a mixed royalty/music week also reconciles studio-sale earnings.

An independent read-only review found no remaining Critical/Important issue after the reserve, continuity, provenance and detail-route corrections. This was focused Phase 1 review, not certification of later market phases.

### Paid-cost and integration limits

The current cinema booking fee was traced to a displayed quote, without a corresponding debit. It is **not** treated as a paid historical cost. The new ledger supports booking/localization costs, but the explicit one-time booking transaction will be connected with shared supply and live settlement in Tasks 6/8. No retroactive booking charge was introduced.

Financial facts and current money displays are repaired here. Global outcome/reward policies and remaining gross-based legacy commercial badges stay on their existing route until Tasks 8/9 can switch all owner routes together. Audience experience/affinity calculations belong to Task 5; no gross-based satisfaction feedback was added in Phase 1. These dependency choices avoid a partially activated market, duplicate cash or a sudden isolated career-penalty rebalance.

## Verification and replay

Self-contained Phase 1 suites (no external save fixture):

```sh
node scripts/run-box-office-audit.mjs inputs
node scripts/run-box-office-audit.mjs delivery
node scripts/run-box-office-audit.mjs finance
node scripts/run-box-office-audit.mjs finance-contracts
node scripts/run-box-office-audit.mjs phase1-integration
node scripts/run-box-office-audit.mjs finance-ui
```

The runner seeds module initialization, RNG and generated IDs before loading the bundled audit. An optional integer third argument selects a different seed. Audits use isolated authored player state; they do not access or update a user's saved career.

All 47 grouped focused cases pass: inputs 9, delivery 11, gross finance 3, finance contracts 12, actual engine/funding/migration integration 9 and finance UI/routes 3. Final outcomes, build/type checks, source hashes and preservation evidence are recorded in [verification.json](verification.json). The frozen English check passed 8,173 keys and 14,720 deterministic reaction cases without recapturing the baseline. Talent settlement, funded premiere and the 23-check studio-sale history audit pass, including actual engine/migration paths.

Two pre-existing structural audits remain failing with identical assertions on the recovery checkpoint and Phase 1: `audit:project-investors` searches for the removed English label `Lead Investor`; `audit:box-office-archive-migration` expects migration version 27. See [baseline-audit-failures.json](baseline-audit-failures.json). They were reproduced from isolated checkpoint files; their assertions were not weakened. New behavioral tests cover the changed investor and receipt paths.

Phase 1 does not certify final hit/flop frequency, the future population/awareness engine, full cinema-chain ownership, numerical IMDb changes, series fixes, or physical-device performance. The shared audience market remains inactive until its later phase gates pass.
