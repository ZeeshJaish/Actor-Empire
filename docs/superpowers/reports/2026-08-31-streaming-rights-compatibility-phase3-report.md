# Project A Phase A3 Completion Report

**Phase:** Rights Compatibility and Multi-Window Enforcement
**Date:** 2026-08-31
**Status:** Complete
**Next phase:** A4 — Rights Calendar, Expiry, and Renewal Market

## 1. What changed in the simulation

`WorldState.streamingRightsContracts` now controls whether a streaming-rights action is legally possible. One actor-neutral resolver evaluates canonical project identity, countries, dates, window type, exclusivity, non-exclusive slot limits, sublicensing authority, related-IP clauses, and change-of-control restrictions.

It returns a structured result—`AVAILABLE`, `PARTIALLY_AVAILABLE`, `AVAILABLE_IN_FUTURE`, `RESTRICTED`, or `UNAVAILABLE`—with the available and blocked countries, controlling contract IDs, conflict codes, compatible windows, earliest compatible week, and short factual copy.

Production House auctions now begin with one immutable exact-country rights lot. Every bidder values and revises the same lot. A partial lot is stored as `DOMESTIC` or `MULTI_REGION`, never mislabeled `GLOBAL`. If India is already licensed, the room says: `India is already licensed. This auction covers the remaining eligible markets.`

The same compatibility authority now governs:

- Production House auction entry and final signature;
- player-owned platform acquisitions, renewals, and sublicences;
- Platform AI sourcing and renewal;
- Platform AI distress sublicensing;
- Platform AI catalogue scheduling and release-country use.

## 2. What the player now sees or controls

- Before opening a normal full-market room: `Worldwide rights available.`
- Before a partial room: the exact excluded-market notice.
- Inside the room: every standing offer shows the real scope, such as `Worldwide · exclusive` or an exact bounded-market count.
- When an owned platform cannot acquire rights: a concise factual reason, such as `India is exclusively licensed to Hotstar until Week 38.`
- When no compatible market remains: the bidding room does not open.
- The player still chooses whether to accept a standing offer or walk away. There is no automatic winner, recommended contract, or player counteroffer.

The feature remains low-management by default: compatibility runs in the background and only exposes actionable scope or conflict information.

## 3. Existing systems reused

- A1 canonical schema-v2 rights contracts and exact-once registration.
- A2 shared auction clock, equal six-second bidder cooldown, event extensions, hard cap, immutable revisions, withdrawals, final offers, clearing-offer protection, same-week restoration, and contract economics.
- Existing Production House Release Wizard and bidding-room UI.
- Existing owned-platform Rights Exchange feedback surface.
- Existing Platform AI sourcing, renewal, distress, catalogue, and release lifecycle.
- Existing deterministic RNG, stable IDs, save normalization, and weekly simulation architecture.

## 4. Legacy paths and projections

Display projections remain available for UI and reporting, but they no longer decide legal compatibility. Platform AI release and lifecycle paths resolve the canonical contract by ID before scheduling or releasing. Legacy bidding sessions without an A3 lot receive a deterministic conservative global lot; their saved offers are not rerolled.

No A2 bidding mechanic was recreated or replaced.

## 5. Data and migration behavior

New bidding sessions persist:

- one immutable rights-lot ID;
- exact territory and sorted country IDs;
- excluded country IDs;
- start week, maximum duration, and window type;
- optional partial-market notice.

Every offer revision persists the lot's exact territory, country IDs, and window type. Owned-platform negotiation and distress-sublicence records also persist their exact scope and source-contract lineage.

Malformed bounded scopes cannot silently become global grants. Repeated normalization is deterministic and idempotent.

## 6. Verification

The A3 completion run covers:

- `npm run audit:streaming-contract-foundation-phase1`
- `npm run audit:streaming-active-bidding-phase2`
- `npm run audit:streaming-contract-economics-phase2`
- `npm run audit:streaming-rights-compatibility-phase3`
- `npm run audit:streaming-rights-marketplace-phase16`
- `npm run audit:platform-ai-sourcing`
- `npm run audit:platform-ai-rights-lifecycle`
- `npm run audit:platform-ai-distress`
- `npm run audit:platform-ai-release`
- `npm run audit:save-migration`
- `npm run build`

The live local Production House flow was also checked before and inside an auction at mobile and desktop widths. It showed the real worldwide lot, valid standing offers, shared clock, bidder revisions, and no horizontal overflow. Exact-country signature and concurrent-conflict rejection are covered by the focused A3 audit so browser verification does not alter the user's saved career.

`npx tsc --noEmit` was run as an additional repository-wide check. The A3-local typing errors it found were corrected. It still exits 2 on older owned-platform audit fixtures outside A3 that have not caught up with earlier required fields (`publicManifesto`, `networkPlacements`, expanded rival profiles) and obsolete fixture enum literals. The Vite production build exits 0, and no remaining compiler error points to an A3 service, component, or A3-focused audit.

## 7. Intentionally deferred

- Expiry events, renewal offers, reversion, and the Rights Calendar: A4.
- Catalogue bundles and portfolio licensing: A5. Future-output deals were deferred by the 2026-09-01 roadmap correction.
- Complete two-sided rights resale: A6.
- Full Rights Office, delegation policies, and portfolio reporting: A7.
- Final cross-system hardening and long-run Project A audit: A8.
- Industry-wide news and social reactions: the later shared Media World project.
- Lawsuits and contract disputes: the later legal pack.

## 8. Next phase

Phase A4 turns contract time into gameplay: deterministic expiry and reversion, renewal offers based on realized economics and relationships, catalogue removal when windows lapse, and a workload-safe Rights Calendar that respects Strategy, Custom, and Full Control modes.
