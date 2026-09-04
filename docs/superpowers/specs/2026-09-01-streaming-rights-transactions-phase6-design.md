# Project A Phase A6: Two-Sided Rights Transfer Design

**Date:** 2026-09-01

**Status:** COMPLETE — implemented and verified on 2026-09-01

**Roadmap phase:** A6 — Two-Sided Acquisition and Resale Synchronization

## 1. Outcome

A streaming platform that currently holds a licence may sell its exact remaining contract position to another eligible streaming platform. The original studio keeps ownership of the movie or series and keeps the economics from its original deal, but it does not approve the downstream transfer and receives none of the resale price.

Example:

1. Empire Studios licenses the Japan rights to Hulu for `$100M` from Week 40 through Week 140.
2. Hulu later sells that licence position to Netflix for `$55M` in Week 80.
3. Hulu receives the `$55M` resale price.
4. Netflix becomes the current Japan rights holder only through Week 140.
5. Hulu can no longer stream those rights.
6. Empire Studios remains the title owner. Any original backend or contractual obligation continues unchanged against the inherited licence position.
7. The Production House ledger shows `Empire Studios → Hulu → Netflix` and identifies Netflix as the current holder.

This is a transfer of a distribution licence, not a sale of the underlying movie IP.

## 2. Locked commercial rules

### 2.1 Free downstream transfer

- An active platform-held licence is transferable without original-studio consent.
- There is no transfer-prohibited clause, notice requirement, consent requirement, or transfer-participation payment.
- The selling platform chooses whether to list the licence, subject only to simulation, controller, solvency, and rights-validity rules.
- The selling platform receives the entire resale price.
- The original studio is not charged and does not receive additional money from the transfer.

### 2.2 Exact inherited position

The buyer inherits the source contract's exact:

- title and project identity;
- countries or global territory;
- exclusivity;
- window type;
- start and expiry weeks;
- localization requirements;
- backend basis, revenue-share percentage, cap, and recoupment basis;
- unresolved marketing, bonus, payment, and settlement obligations; and
- package attribution and original-studio attribution.

The resale price is separate from the inherited original economics. A transfer never resets the term, expands the countries, upgrades exclusivity, adds sequel rights, or silently removes an obligation.

### 2.3 One current holder

- A full transfer closes the seller's current position for the transferred scope.
- The successor contract becomes the only active current-holder record for that exact scope.
- Historical source contracts remain persisted as lineage records and are never deleted.
- Release, catalogue, calendar, settlement, and availability systems use the current successor contract only.
- Same-week retries return the already-settled transaction instead of moving money or rights twice.

### 2.4 Sublicensing remains distinct

Existing sublicensing remains available as a different commercial action:

- A **transfer** replaces the current holder; the seller exits the transferred scope.
- A **sublicence** creates a permitted downstream window while the parent holder remains in the chain.

Both actions use the same transaction service and canonical compatibility checks. The UI labels them plainly so a player cannot mistake one for the other.

### 2.5 Permanent IP purchases remain owner-only

A permanent acquisition is separate from transferring a temporary platform licence:

- Only the actual title owner can permanently sell the underlying title rights.
- A temporary licence holder cannot convert or resell its licence as permanent ownership.
- Existing valid downstream windows remain attached after an owner sale; buying the IP does not erase them.
- Permanent sales of player-owned or protected IP require player approval in every control mode.

## 3. Canonical data model

`WorldState.streamingRightsContracts` remains the only authoritative registry for who can exploit a title, where, and for how long.

A6 adds a factual transaction registry for audit and UI reconstruction. It does not become a second rights authority.

### 3.1 Contract lineage additions

Canonical contracts gain normalized optional lineage fields:

- `rootContractId`: the original studio-to-platform contract;
- `parentContractId`: the immediately preceding contract position;
- `rightsTransactionId`: the transaction that created this successor;
- `transferredToContractId`: the successor when a full transfer closes this contract;
- `transferredAtAbsoluteWeek`: when the holder changed; and
- status support for `TRANSFERRED_OUT`.

Old saves without lineage normalize each contract as its own root. Existing `ACTIVE`, `EXPIRED`, and `TERMINATED` semantics remain intact.

### 3.2 Transaction record

`WorldState.streamingRightsTransactions` stores durable, replay-safe commercial history. Each transaction records:

- deterministic ID and idempotency key;
- kind: `LICENSE_TRANSFER`, `SUBLICENSE`, or `PERMANENT_ACQUISITION`;
- lifecycle: `LISTED`, `OPEN`, `ACCEPTED`, `SETTLED`, `CANCELLED`, or `INVALIDATED`;
- original owner party;
- seller/current-holder party;
- buyer party;
- source, root, and successor contract IDs;
- exact inherited rights lot and dates;
- asking price, accepted price, and currency units;
- buyer debit and seller receipt disposition;
- controller of each party at commitment;
- listing, commitment, settlement, and resolution weeks;
- package/group ID when several title transfers settle atomically; and
- a concise cancellation/invalidation reason when settlement does not occur.

The transaction registry answers who sold to whom and for how much. The contract registry answers who currently has the rights.

## 4. Shared transfer authority

A new actor-neutral `streamingRightsTransactions` service becomes the sole settlement path for A6 platform-to-platform activity.

### 4.1 Validation

Before commitment it verifies:

1. The source contract exists and is active in the current week.
2. The seller is the source contract's current holder/controller.
3. The source has not already been transferred, terminated, or expired.
4. The buyer and seller are different parties.
5. The buyer can legally operate in the requested countries and can meet localization requirements.
6. The A3 compatibility authority finds no conflicting exclusive rights.
7. The buyer has sufficient cash and post-purchase runway.
8. The seller has not protected the asset under a player mandate.
9. Every package component remains eligible at signing time.
10. The idempotency key has not already settled.

The original studio is not asked for consent and is not treated as a settlement party.

### 4.2 Atomic settlement

The service stages and applies one complete state transition:

- debit buyer;
- credit seller;
- register the successor canonical contract;
- close the seller contract as `TRANSFERRED_OUT` for a full transfer;
- move the title into the buyer's active catalogue projection;
- remove it from the seller's active exploitation projection;
- move unresolved current-holder obligations to the buyer projection;
- preserve accrued and paid royalty history;
- retain original owner and root-contract attribution;
- append buyer, seller, and world transaction ledgers; and
- mark the transaction `SETTLED`.

If any validation or staging step fails, none of those mutations apply. Package transfers are all-or-nothing.

### 4.3 Backend settlement

Original backend is attached to the root commercial obligation, not recreated from the resale price.

- Revenue generated before the transfer remains attributed to the old holder's operating weeks.
- Revenue generated from the transfer week onward is attributed to the new holder.
- Accrued unpaid royalty evidence is preserved and cannot be reset by transfer.
- Future royalty charges use the inherited terms and current holder.
- The transfer payment itself produces no royalty or participation for the original studio.

## 5. AI background market

AI platforms may buy and sell rights without the player owning a streaming platform.

### 5.1 Seller decisions

The existing Platform AI distress and strategy systems supply candidates. Sale pressure considers:

- projected remaining-window loss;
- catalogue overlap and low strategic fit;
- weak local audience response;
- liquidity and runway pressure;
- localization burden;
- concentration in one genre or market;
- opportunity cost of keeping the title; and
- whether the licence is close enough to expiry to make a sale unrealistic.

Distress increases sale willingness but never bypasses compatibility, controller, cash, or exclusivity rules.

### 5.2 Buyer decisions

The existing Platform AI evaluation systems score:

- country reach and localization capability;
- catalogue gap and genre strategy;
- title quality and recent performance;
- remaining weeks;
- inherited backend and obligation load;
- asking price and forecast contribution;
- cash, runway, and competing commitments; and
- relationship and past title performance.

The existing AI-only operating and infrastructure cost advantage applies only while the buyer remains AI-controlled. Acquiring the platform removes that advantage without changing already-settled rights.

### 5.3 Market cadence

- AI resale evaluation runs on the existing weekly Platform AI progression.
- Listings are evaluated on a throttled market cadence so the market does not churn every title every week.
- A listing has a deterministic expiry and can receive several eligible AI bids.
- A later higher bid is not automatically valid if that bidder cannot support the inherited territory or obligations.
- If no valid buyer exists, the seller keeps the licence and may reconsider it in a later cycle.

## 6. Player control modes

### 6.1 No owned streaming platform

AI trades still happen. The player does not receive transaction popups. Relevant holder changes appear factually in the Production House rights ledger and later in the A7 digest/news presentation.

### 6.2 Strategy mode

The player's platform may automatically buy or sell temporary licences only inside saved mandates covering:

- permitted markets;
- minimum remaining duration;
- maximum purchase price;
- minimum sale price;
- post-deal cash/runway floor;
- excluded/protected titles; and
- allowed transfer versus sublicence actions.

### 6.3 Custom mode

The player chooses which rules are delegated. Anything outside the mandate becomes a compact approval item.

### 6.4 Full Control

Every listing, bid, acceptance, and signing step is controlled by the player.

Permanent IP purchases, player-owned original IP sales, and protected-title disposals always require explicit approval regardless of mode.

## 7. Player-facing surfaces

### 7.1 Production House rights ledger

Each licensed title shows a compact factual row:

- original owner;
- current holder;
- territory and exclusivity;
- remaining weeks or permanent status;
- original contract value; and
- latest holder change.

Expanding the row shows the transfer chain, for example:

`Empire Studios → Hulu (Week 40) → Netflix (Week 80)`

The player sees no fake approval action because the studio is not a party to the downstream trade.

### 7.2 EMPIRE+ resale market

When the player owns an active streaming platform, eligible resale listings appear alongside the existing rights market. Each listing shows:

- title;
- original owner;
- reseller/current holder;
- exact countries, exclusivity, and remaining weeks;
- inherited backend and unresolved obligations;
- asking price and market heat; and
- short incompatibility reason when the player's platform cannot bid.

Opening a listing uses the existing A2 timed bidding-room pressure and A3 compatibility messages. A listing never appears as acquirable if the player's platform cannot receive its exact scope.

### 7.3 Owned-platform catalogue and finance

- Acquired rights appear once in the catalogue with the inherited expiry.
- Sold rights stop contributing audience/revenue after transfer.
- Acquisition cost and disposal proceeds use the existing treasury and ledger units.
- Royalty statements retain original-studio attribution.

## 8. Existing-system reuse and replacement

### Reused unchanged

- A1 canonical `streamingRightsContracts` registry and contract normalization.
- A2 timed bidding sessions and offer acceptance behavior.
- A3 compatibility, territory, exclusivity, and short reason authority.
- A4 expiry, renewal, and remaining-term calculation.
- A5 package component allocation and atomicity rules.
- Existing owned-platform treasury, catalogues, obligations, and event ledger.
- Existing Platform AI finance, distress, rights lifecycle, release, and controller resolution.
- Existing save migration and compaction pipelines.

### Routed through the new authority

- `SUBLICENSE_OUT` signing in `streamingRightsMarketplace`.
- Inbound player platform trades from another platform.
- Platform AI distress catalogue transfers.
- Future AI strategy disposals and marketplace purchases.
- Change-of-control retention of contract positions.

### Removed from downstream transfer logic

- Original-studio transfer consent checks.
- Notice/consent termination penalties caused solely by a platform transfer or acquisition.
- Transfer-participation payments to the original studio.
- New duration or economics generated from the source contract when executing a full transfer.

Legacy change-of-control fields remain readable for old saves but do not block an A6 downstream licence transfer. Company acquisition keeps the acquired platform's valid licence positions and obligations intact.

## 9. Migration and persistence

- Add an explicit empty transaction registry to new worlds.
- Normalize missing registries to `{}`.
- Backfill lineage only from factual existing `PLATFORM_TRADE` source references; do not invent prices or transfer history.
- Preserve unresolved listings, unsettled transactions, all contract-referenced transactions, and recent settled history during compaction.
- Repeated migration and repeated same-week processing must be byte-equivalent after normalization.
- Existing contracts without a trustworthy parent remain valid self-rooted contracts.

## 10. Verification plan

A focused A6 audit must first fail, then pass, for these player-visible breaks:

1. Hulu-to-Netflix transfer gives the resale price only to Hulu.
2. Empire Studios receives no transfer participation.
3. Netflix inherits the exact Japan scope and original expiry.
4. Hulu's source contract becomes `TRANSFERRED_OUT` and cannot release the title afterward.
5. Netflix can release it after settlement.
6. Original backend terms and accrued royalty evidence survive.
7. A conflicting or incapable buyer cannot settle.
8. A buyer without cash/runway cannot settle.
9. Same idempotency key cannot duplicate cash, contracts, catalogue entries, or history.
10. An AI-to-AI transfer settles without a player-owned platform.
11. Player-controlled platforms never auto-act outside their mandate.
12. A multi-title package either settles every component or none.
13. Expiry and A4 renewal use the inherited original dates.
14. Save, reload, migration, and compaction preserve the transfer chain.
15. Company acquisition retains valid rights and obligations without studio consent.

Regression verification must include focused A1–A5 rights audits, Platform AI distress/economy/release/weekly audits, owned-platform acquisition/marketplace audits, build, server render, and responsive browser inspection.

## 11. Completion gate

A6 is complete only when:

- every full transfer produces exactly one current holder;
- seller proceeds equal buyer cost and exclude the original studio;
- inherited rights, expiry, backend, and obligations reconcile exactly;
- player and AI paths use the same transaction authority;
- AI-only transfers work with no player streaming house;
- Production House and EMPIRE+ resolve the same current holder and history;
- distress, acquisition, and delegation cannot bypass compatibility or mandates;
- all transaction paths are idempotent and save-safe; and
- the roadmap, focused audit, build, and browser verification record fresh evidence.
