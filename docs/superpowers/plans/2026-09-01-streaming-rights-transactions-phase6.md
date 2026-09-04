# Project A Phase A6 Rights Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one replay-safe transaction authority for full platform licence transfers, existing sublicences, AI background resale, and player resale-market visibility.

**Architecture:** `WorldState.streamingRightsContracts` remains the rights authority. A new `streamingRightsTransactions` registry records commercial lineage, while `services/streamingRightsTransactions.ts` validates and atomically settles buyer cash, seller proceeds, successor contracts, source closure, catalogue projections, and obligations. Existing owned-platform marketplace and Platform AI distress paths call this service instead of constructing separate platform-trade contracts.

**Tech Stack:** TypeScript 5.8, React 19, Vite, Node assertion audit scripts, existing deterministic random/ID helpers.

**Spec:** `docs/superpowers/specs/2026-09-01-streaming-rights-transactions-phase6-design.md`

## Global Constraints

- `WorldState.streamingRightsContracts` remains the sole authority for active rights.
- The original studio neither consents to nor participates financially in a downstream platform transfer.
- The buyer inherits exact countries, exclusivity, window, dates, backend, and unresolved obligations.
- A full transfer leaves exactly one active current holder and never resets expiry.
- Player and AI paths use the same settlement service and idempotency behavior.
- Existing unrelated worktree changes are preserved; no intermediate commits are created.

---

### Task 1: Canonical transaction and lineage schema

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingRightsCore.ts`
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `constants.ts`
- Create: `scripts/audit-streaming-rights-transactions-phase6.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `StreamingRightsTransaction`, `StreamingRightsTransactionRegistry`, `STREAMING_RIGHTS_TRANSACTION_SCHEMA_VERSION`, lineage fields on `StreamingRightsContract`, `normalizeStreamingRightsTransactionRegistry(...)`.
- Consumes: existing canonical contract party, territory, exclusivity, window, and settlement types.

- [ ] **Step 1: Write the failing schema audit**

Create a Node assertion audit that imports the new symbols, checks an explicit empty registry on `INITIAL_PLAYER.world`, normalizes malformed records away, preserves a valid settled transaction, and confirms a legacy contract self-roots without inventing a parent.

```ts
assert.deepEqual(INITIAL_PLAYER.world.streamingRightsTransactions, {});
assert.equal(normalizeStreamingRightsContract(legacy).rootContractId, legacy.id);
assert.deepEqual(Object.keys(normalizeStreamingRightsTransactionRegistry({ broken: null as never })), []);
```

- [ ] **Step 2: Run the audit and observe RED**

Run: `npm run audit:streaming-rights-transactions-phase6`

Expected: bundling fails because the transaction types/normalizer do not exist.

- [ ] **Step 3: Add minimal schema and normalization**

Add:

```ts
export type StreamingCatalogLicenseStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'TRANSFERRED_OUT';
export type StreamingRightsTransactionKind = 'LICENSE_TRANSFER' | 'SUBLICENSE' | 'PERMANENT_ACQUISITION';
export type StreamingRightsTransactionStatus = 'LISTED' | 'OPEN' | 'ACCEPTED' | 'SETTLED' | 'CANCELLED' | 'INVALIDATED';
export interface StreamingRightsTransaction {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  kind: StreamingRightsTransactionKind;
  status: StreamingRightsTransactionStatus;
  originalOwner: StreamingRightsContractParty;
  seller: StreamingRightsContractParty;
  buyer: StreamingRightsContractParty;
  sourceContractId: string;
  rootContractId: string;
  successorContractId: string | null;
  sourceProjectId: string;
  title: string;
  territory: StreamingLicenseTerritory;
  countryIds: string[];
  exclusivity: StreamingLicenseExclusivity;
  windowType: StreamingRightsWindowType;
  startsAtAbsoluteWeek: number;
  expiresAtAbsoluteWeek: number;
  askingPrice: number;
  acceptedPrice: number;
  sellerReceipt: number;
  originalOwnerParticipation: 0;
  controllerAtCommitment: { seller: 'AI' | 'PLAYER'; buyer: 'AI' | 'PLAYER' };
  groupId: string | null;
  listedAtAbsoluteWeek: number;
  committedAtAbsoluteWeek: number | null;
  settledAtAbsoluteWeek: number | null;
  resolvedAtAbsoluteWeek: number | null;
  resolutionReason: string | null;
}
export type StreamingRightsTransactionRegistry = Record<string, StreamingRightsTransaction>;
```

Normalize optional contract lineage and add `streamingRightsTransactions?: StreamingRightsTransactionRegistry` to `WorldState`. Add `{}` to the initial world. Migration normalizes it after contract migration; compaction retains unresolved, contract-referenced, and recent settled transactions.

- [ ] **Step 4: Run focused schema audit**

Run: `npm run audit:streaming-rights-transactions-phase6`

Expected: schema assertions pass; settlement assertions added in Task 2 still do not exist.

### Task 2: Atomic full-transfer settlement authority

**Files:**
- Create: `services/streamingRightsTransactions.ts`
- Modify: `scripts/audit-streaming-rights-transactions-phase6.ts`

**Interfaces:**
- Produces:

```ts
export interface SettleStreamingRightsTransferInput {
  sourceContractId: string;
  seller: StreamingRightsContractParty;
  buyer: StreamingRightsContractParty;
  price: number;
  absoluteWeek: number;
  idempotencyKey: string;
  controllerAtCommitment: { seller: 'AI' | 'PLAYER'; buyer: 'AI' | 'PLAYER' };
  groupId?: string | null;
}
export type StreamingRightsTransferResult =
  | { changed: true; player: Player; transaction: StreamingRightsTransaction; successorContract: StreamingRightsContract }
  | { changed: false; player: Player; reason: StreamingRightsTransferFailure; detail: string; transaction?: StreamingRightsTransaction };
export function settleStreamingRightsTransfer(player: Player, input: SettleStreamingRightsTransferInput): StreamingRightsTransferResult;
export function getStreamingRightsTransferChain(world: WorldState, contractId: string): StreamingRightsTransferChain;
```

- Consumes: `resolveStreamingRightsCompatibility`, `registerStreamingRightsContract`, owned/AI controller and finance projections.

- [ ] **Step 1: Add failing Empire → Hulu → Netflix assertions**

Build a literal fixture with an active Japan-exclusive Hulu contract worth `$100M`, original expiry Week 140, backend terms, and accrued royalty. Settle a `$55M` Week-80 transfer and assert:

```ts
assert.equal(result.successorContract.expiresAtAbsoluteWeek, 140);
assert.deepEqual(result.successorContract.countryIds, ['JP']);
assert.equal(result.successorContract.backendBasis, 'ATTRIBUTED_GROSS');
assert.equal(result.player.world.streamingRightsContracts![source.id].status, 'TRANSFERRED_OUT');
assert.equal(result.transaction.originalOwner.name, 'Empire Studios');
assert.equal(result.transaction.sellerReceipt, 55_000_000);
assert.equal(result.transaction.originalOwnerParticipation, 0);
```

Also assert exact buyer debit/seller credit, one current holder, preserved accrual, and chain `Empire Studios → Hulu → Netflix`.

- [ ] **Step 2: Run and observe RED**

Expected: import or behavioral assertions fail because the service does not exist.

- [ ] **Step 3: Implement staged validation and atomic settlement**

Implement deterministic transaction/successor IDs, source/current-holder checks, expiry checks, A3 exact-lot compatibility, buyer treasury/runway checks, successor creation, source `TRANSFERRED_OUT`, registry update, finance projections, and transaction registration. Return the original player unchanged on every failure.

- [ ] **Step 4: Add and pass mutation cases**

Cover insufficient cash, expired source, seller mismatch, buyer conflict, same buyer/seller, duplicate idempotency key, and source already transferred. Verify the replay returns `changed: false` without another debit, credit, contract, or transaction.

- [ ] **Step 5: Run focused audit GREEN**

Run: `npm run audit:streaming-rights-transactions-phase6`

Expected: all schema and atomic-transfer cases pass.

### Task 3: Route owned-platform market trades and sublicences

**Files:**
- Modify: `services/streamingRightsMarketplace.ts`
- Modify: `services/ownedStreamingPlatform.ts`
- Modify: `scripts/audit-streaming-rights-marketplace-phase16.ts`
- Modify: `scripts/audit-streaming-rights-transactions-phase6.ts`

**Interfaces:**
- Consumes: `settleStreamingRightsTransfer(...)` and canonical lineage resolver.
- Produces: resale opportunities with `originalOwnerName`, `currentHolderName`, exact country IDs, `remainingWeeks`, inherited obligation summary, and incompatibility detail.

- [ ] **Step 1: Add failing player-market tests**

Assert a platform trade opportunity is derived from a real active seller contract, never advertises a longer term, identifies original owner and reseller separately, and cannot open when A3 reports an exact-scope conflict. Assert signing debits the player treasury and credits the AI seller through the shared transaction record.

- [ ] **Step 2: Run marketplace and A6 audits RED**

Run: `npm run audit:streaming-rights-marketplace-phase16 && npm run audit:streaming-rights-transactions-phase6`

- [ ] **Step 3: Replace synthetic platform-trade construction**

Build inbound `PLATFORM_TRADE` opportunities only from active current-holder contracts. Route full transfer signing through `settleStreamingRightsTransfer`. Route existing `SUBLICENSE_OUT` through a sibling transaction entry while retaining the parent contract active. Ignore legacy change-of-control consent for downstream transfers.

- [ ] **Step 4: Normalize owned-platform projections**

Ensure `catalogLicenses`, `catalogProjectIds`, `sublicenseDeals`, `rightsObligations`, and event ledgers contain no duplicate and reflect the successor/current-holder state.

- [ ] **Step 5: Run both audits GREEN**

Expected: existing marketplace behavior plus exact A6 lineage and economics pass.

### Task 4: Route AI distress and weekly background resale

**Files:**
- Modify: `services/platformAi/platformAiDistress.ts`
- Create: `services/platformAi/platformAiRightsResale.ts`
- Modify: `services/platformAi/platformAiTurn.ts`
- Modify: `services/platformAi/index.ts`
- Modify: `scripts/audit-platform-ai-distress.ts`
- Modify: `scripts/audit-platform-ai-turn.ts`
- Modify: `scripts/audit-streaming-rights-transactions-phase6.ts`

**Interfaces:**
- Consumes: shared settlement service, Platform AI controller/finance/capability/scoring helpers, existing distress candidate records.
- Produces:

```ts
export function processPlatformAiRightsResaleWeek(
  player: Player,
  world: WorldState,
  absoluteWeek: number,
): { world: WorldState; listedTransactionIds: string[]; settledTransactionIds: string[] };
```

- [ ] **Step 1: Add failing AI-to-AI transfer test**

Use a player with no owned streaming platform. Give Hulu a loss-making Japan licence and Netflix adequate JP reach/cash. Assert the weekly processor creates or settles a transfer using the same transaction authority, pays Hulu only, and makes Netflix the current holder.

- [ ] **Step 2: Run focused Platform AI audits RED**

Run: `npm run audit:platform-ai-distress && npm run audit:platform-ai-turn && npm run audit:streaming-rights-transactions-phase6`

- [ ] **Step 3: Route distress transfer through shared settlement**

Keep existing distress stages and obligations, but replace direct canonical contract construction inside `transferPendingDeal` with the shared authority. Preserve the existing distress record as a compatibility projection referencing the A6 transaction.

- [ ] **Step 4: Add throttled strategic resale market**

On deterministic four-week cycles, score active AI-held transferable licences. Reject player-controlled parties, expired/short positions, incompatible buyers, and buyers below runway. Create deterministic listings and select the highest eligible bid. Settle only accepted listings; leave unsold licences active.

- [ ] **Step 5: Run Platform AI and A6 audits GREEN**

Expected: distress remains compatible, background transfers work without a player platform, and same-week replay is inert.

### Task 5: Player-visible transfer truth

**Files:**
- Modify: `components/StreamingRightsExchange.tsx`
- Modify: `components/StreamingRightsExchange.css`
- Modify: `components/StreamingRightsCalendar.tsx`
- Modify: `styles/streaming-rights-calendar.css`
- Create or modify: focused UI source/server-render audit for A6

**Interfaces:**
- Consumes: `getStreamingRightsTransferChain(...)`, enriched resale opportunities, canonical current-holder resolver.
- Produces: compact transfer history in Production House and exact resale listing facts in EMPIRE+.

- [ ] **Step 1: Add failing UI audit**

Render or source-audit the real components and assert visible labels for `Original owner`, `Current holder`, `Reseller`, `Remaining term`, inherited obligations, and an incompatibility reason. Ensure there is no consent or transfer-participation action.

- [ ] **Step 2: Run UI audit RED**

- [ ] **Step 3: Implement compact UI**

In EMPIRE+, show platform resale cards only when backed by an exact canonical source. In Production House, show the current holder beside a collapsed transfer history without competing with project status badges. Use progressive disclosure and existing visual tokens.

- [ ] **Step 4: Run UI audit GREEN and inspect responsive browser**

Verify the market and ledger at mobile and desktop widths on the local Vite server, including a short incompatibility reason and no horizontal overflow.

### Task 6: Migration, compaction, regressions, and roadmap completion

**Files:**
- Modify: `scripts/audit-save-migration.ts`
- Modify: `scripts/audit-save-transfer.ts`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `docs/superpowers/specs/2026-09-01-streaming-rights-transactions-phase6-design.md`

**Interfaces:**
- Consumes: final transaction normalizer/service and all A1–A6 audits.
- Produces: fresh completion evidence and A7 as the next roadmap phase.

- [ ] **Step 1: Add failing persistence/reload cases**

Assert legacy self-rooting, transaction-chain survival, unsettled listing retention, recent settled retention, old settled compaction when unreferenced, and byte-equivalent repeated migration.

- [ ] **Step 2: Run save audits RED, then implement minimal fixes**

Run: `npm run audit:save-migration && npm run audit:save-transfer && npm run audit:streaming-rights-transactions-phase6`

- [ ] **Step 3: Run the full focused regression matrix**

Run:

```bash
npm run audit:streaming-contract-foundation-phase1
npm run audit:streaming-active-bidding-phase2
npm run audit:streaming-rights-compatibility-phase3
npm run audit:streaming-rights-calendar-phase4
npm run audit:streaming-catalogue-packages-phase5
npm run audit:streaming-rights-marketplace-phase16
npm run audit:platform-ai-distress
npm run audit:platform-ai-economy
npm run audit:platform-ai-release
npm run audit:platform-ai-turn
npm run audit:streaming-rights-transactions-phase6
npm run build
```

- [ ] **Step 4: Run diff and source checks**

Run `git diff --check`, inspect `git status --short`, and run `npm run lint`. Record any repository-wide pre-existing diagnostics separately from A6-owned errors.

- [ ] **Step 5: Update roadmap and design status**

Mark A6 complete only after fresh focused, build, persistence, and browser evidence. Set A7 as `NEXT` and document any deliberately deferred A7 news/digest polish.
