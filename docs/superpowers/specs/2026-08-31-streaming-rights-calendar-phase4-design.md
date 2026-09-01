# Streaming Rights Calendar Phase A4 Design

**Status:** Approved for implementation on 2026-08-31
**Depends on:** A1 canonical contracts, A2 active bidding and settlements, A3 rights compatibility
**Next:** A5 catalogue packages and portfolio licensing

## Purpose

Phase A4 turns contract time into a persistent strategy layer. Every non-permanent streaming-rights contract must approach expiry, enter a renewal decision window, renew or expire, leave the affected catalogue, and return its exact scope to its legal owner without duplicate cases, payments, contracts, or notifications.

The player experience is portfolio-first. Deep title economics remain simulated, while routine work is grouped under a saved control policy so a 30-40 title slate does not become 30-40 weekly interruptions.

## Canonical timing

- `WorldState.streamingRightsContracts` remains the legal authority.
- A contract is active from `startsAtAbsoluteWeek` through `expiresAtAbsoluteWeek`, inclusive.
- Expiry, catalogue removal, schedule invalidation, and rights reversion happen at the beginning of `expiresAtAbsoluteWeek + 1`.
- A replacement renewal starts at `expiresAtAbsoluteWeek + 1`; it never overlaps the prior contract.
- Permanent purchases never create expiry or renewal cases.
- Processing a week again or reloading a save produces the same state and no second side effect.

Lifecycle:

`ACTIVE -> APPROACHING_EXPIRY -> RENEWAL_WINDOW -> RENEWED | EXPIRING -> EXPIRED/REVERTED`

Contract status remains the authoritative active/expired fact. Lifecycle labels are derived from dates plus a persisted renewal case rather than introducing a conflicting second contract status.

## Persisted renewal case

At the configured notice boundary, one deterministic case is created per eligible source contract. It stores:

- source contract and project IDs;
- title, project type, genre, exact territory, exact countries, exclusivity, and window;
- seller/rights owner and incumbent buyer snapshots;
- expiry week, renewal start, offer week, and decision deadline;
- renewal-option fact;
- realized performance and market-demand snapshots used for valuation;
- proposed guarantee, shares, duration, and offer disposition;
- saved control mode, policy, protection reasons, and delegation reason;
- player or delegated outcome and replacement contract ID;
- stable idempotency keys and last-processed week.

The deterministic case ID is derived from the source contract and next-window start. A replacement contract and financial settlement use stable keys derived from that case.

## Renewal valuation

Renewal economics are calculated from saved facts, never a fixed percentage increase and never a hidden guaranteed best deal. Inputs include:

- title-attributed subscription, advertising, and transactional revenue;
- viewing accounts, watch time, subscriber acquisition, and retention;
- royalties/backend already paid;
- project quality, audience rating, awards, and commercial performance;
- genre demand, exact territory value, catalogue need, and rival demand;
- platform-studio relationship and successful delivery history;
- scope, exclusivity, window, and original economics;
- incumbent platform cash, runway, debt/restrictions, and acquisition authority.

A breakout may receive materially better terms. A weak title may receive lower terms or no offer. A cash-constrained platform may decline a valuable title. A seeded, persisted market-pressure value prevents reload rerolls.

## Control modes

### Strategy

Routine cases follow a saved portfolio policy. The player can prefer successful renewals, market retesting, upfront security, backend upside, relationship continuity, or weak-title expiry. Protected titles and decisions outside hard authority limits still escalate.

### Custom (default)

Routine cases follow policy, while flagship/franchise/manual titles, worldwide exclusive terms, high-value or long-duration terms, relationship-sensitive choices, solvency exceptions, and mandate breaches require approval.

### Full

Every renewal, expiry, or return-to-market decision waits for the player. Changing mode affects future undecided cases only; it never changes signed contracts or rerolls saved offers.

Any title can be placed under manual control, and a pending delegated case can be taken over before resolution. Interactive bidding never auto-selects a winner. Only explicitly delegated renewal actions can execute automatically, with the policy and reason persisted.

## Outcomes

- **Accept renewal:** Run an A3 final compatibility check excluding only the source contract, settle once, and create one canonical replacement with identical exact scope starting the following week.
- **Let expire:** Preserve the incumbent's rights through the listed expiry week, then expire and revert the exact scope.
- **Return to market:** Mark the next exact window for the existing A2 flow. No buyer or payment is invented. Until the prior contract ends, the incumbent remains active.
- **No offer:** Expire and revert normally unless the player later markets the available scope.

## Projection synchronization

The universal lifecycle runs near the beginning of weekly progression, before streaming revenue and release decisions.

- Owned-platform licence projections mirror the canonical status and remove expired projects from eligible catalogue/schedules when no active replacement covers them.
- AI-platform projections and future schedules cannot retain expired scope. Legacy AI renewal records remain migration-compatible but do not create a second renewal for an A4-managed contract.
- Production House availability is the exact reverted territory/country/window scope determined by A3.
- Royalty settlement is allowed during the listed expiry week and blocked beginning the following week.

## Player surfaces

### Production House

A `Rights Calendar` division shows compact counts and opens grouped sections:

- Action required
- Expiring soon
- Renewal negotiations
- Returning to market
- Recently completed

### Owned streaming platform

Rights Exchange gains a `Calendar` tab. Vault timing labels use the universal clock. Renewal actions are enabled only inside the valid window and otherwise explain the opening week.

### Project detail and weekly digest

Project detail shows a secondary factual line such as `Netflix - Worldwide exclusive - 8 weeks remaining`. Weekly progression produces one grouped Rights Desk summary. Only an urgent protected decision may create one direct inbox item, keyed so it cannot repeat.

## Migration and bounded persistence

Missing A4 state normalizes to Custom Control and an empty registry. Valid legacy contracts are admitted without rewriting their economics. Renewal cases and digests are bounded for save size, but unresolved cases and lineage referenced by an active replacement are preserved.

## Out of scope

- Catalogue packages and portfolio licensing (A5); future-output deals are deferred
- Full two-sided resale and sublicensing market (A6)
- Complete Rights Office analytics and statements (A7)
- Industry news and social reactions
- Lawsuits and disputed termination

## Completion criteria

- Inclusive expiry timing is consistent in the canonical registry, royalty settlement, owned platform, and Platform AI.
- Every eligible contract has at most one persisted renewal case and replacement.
- Renewal economics vary from realized performance, demand, relationship, scope, and ability to pay.
- All three control modes and manual takeover behave deterministically.
- Exact expired scope reverts; unrelated territories stay granted.
- Catalogue and schedule projections cannot keep expired rights.
- Large libraries appear as grouped queues and one weekly digest.
- Save migration, compaction, repeat-week processing, and repeated resolution are idempotent.
- A1-A4, marketplace, Platform AI, migration, build, and browser regressions pass.
