# Unified Streaming Contract Foundation Design

## Status

Approved in chat on 2026-08-26. This is Phase 1 of the Unified Rights and Active Bidding project described after the eight-phase Competitive Streaming Platform AI plan.

## Goal

Create one persistent, actor-neutral streaming-rights contract registry that both Production Houses and streaming platforms can reference without changing the current bidding-room UI yet.

## Existing mismatch

The Production House release flow accepts temporary `Bid` data, pays the guarantee immediately, and stores a lightweight `StreamingState`. The accepted duration is not retained, and the streaming run ends through viewership decay or a 52-week hard cap. The owned-platform and Platform AI systems already use richer `OwnedStreamingCatalogLicense` records with territory, exclusivity, dates, renewal, bonuses, and obligations, but those records live inside separate buyer states.

## Architecture

`WorldState.streamingRightsContracts` is the canonical registry. Each entry is a `StreamingRightsContract` keyed by a stable contract ID. Existing owned-platform `catalogLicenses` and Platform AI `rightsContracts` remain compatibility projections during this project; they are not a second source for cross-business resolution. New contract creation paths register the canonical record at the same moment they update their existing projection.

Production-side records gain a `streamingContractId` reference. A Production House title, owned platform, or AI platform resolves the same registry entry rather than synthesizing another contract. Pending bids are offers and do not become contracts until accepted.

## Contract model

Every canonical contract contains:

- Stable schema version, ID, and idempotency key.
- Canonical project ID and signing-time title/type/genre snapshot.
- Seller and buyer party records with actor type, stable ID, display name, and platform ID where applicable.
- Deal structure: flat licence, guarantee plus bonus, guarantee plus revenue share, permanent acquisition, pre-buy, or internal allocation.
- Territory, immutable bounded-country snapshot, exclusivity, window type, start, duration, expiry, and permanent-purchase flag.
- Upfront guarantee, each party's revenue share, marketing guarantee, viewership bonus, production funding, cancellation penalty, and optional future-season funding.
- Renewal, sublicensing, sequel-rights, localization, and change-of-control terms.
- Compatible lifecycle status and an exact-once settlement record.
- Origin and optional legacy-source metadata so migrated deals remain explainable.

The registry does not generate money. Settlement state records whether legacy cash was already paid, an internal allocation required no cash, or a new guarantee remains handled by its existing signing path.

## Deterministic migration

Save migration runs after owned-platform and Platform AI normalization:

1. Normalize any existing registry and retain valid entries.
2. Import player-owned `catalogLicenses` in stable array order.
3. Import each AI platform's `rightsContracts` in stable platform-ID order.
4. Backfill only active Production House streaming releases that have a platform but no contract reference.
5. Use stable IDs derived from project ID, buyer platform, and streaming start week.
6. Infer the start week from `startWeekAbsolute`, `releasedAtAbsoluteWeek`, or current week minus elapsed streaming weeks, in that order.
7. Preserve the legacy 52-week contract behaviour, existing upfront amount, royalty share, funding, and already-paid disposition.
8. Do not turn pending bids into contracts and do not fabricate active contracts for terminal archive entries without reliable terms.
9. Re-running migration returns the same registry and references without changing player, studio, or platform cash.

When duplicate legacy records share an ID, an existing canonical registry entry wins, followed by the player-owned projection, then AI platforms in sorted platform-ID order. Migration never rerolls or silently overwrites an established canonical contract.

## Compatibility boundary

Phase 1 does not redesign the Offer Board, negotiation, counteroffers, expiry/renewal UX, Content Desk, or weekly contract enforcement. It creates the data foundation, migrates saves, and registers contracts produced by current signing paths. Later phases replace the old auction and make the registry authoritative for expiry, renewal, finance, and UI.

## Failure handling

- Malformed registry entries are discarded by normalization.
- Finite non-negative money and week values are enforced.
- Revenue shares are clamped to a valid complementary pair.
- Bounded territories retain a deduplicated country snapshot; global rights use an empty snapshot.
- Registering the same ID/idempotency key is a no-op.
- Conflicting IDs never mutate the already-established canonical record.

## Verification

The focused audit must prove normalization, deterministic IDs, duplicate registration, rich-license import, active-release backfill, no pending-bid conversion, no cash mutation, migration idempotence, save compaction, and save transfer. Existing rights-marketplace and Platform AI rights audits must remain green, and the production build must pass.

## Constraints

- Inline implementation only; no subagents.
- Strict sequential RED to GREEN TDD.
- Preserve the dirty worktree and unrelated changes.
- Do not stage or commit.
- No `Math.random()` or `Date.now()` in contract creation or migration.
- Do not change the current player-facing bidding UI in Phase 1.
