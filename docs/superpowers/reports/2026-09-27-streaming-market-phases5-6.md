# Streaming content market phases 5–6 — local implementation

Date: 2026-09-27

## Delivered

- A saved, three-absolute-week market cycle with 20 complete fictional individual film/series offers and five references to rights-valid collections. Reading or reopening the Market does not regenerate it. Unsigned offers expire on the next cycle; no unsold project enters the world, NPC ledger, news or awards.
- Named fictional writer/director/cast and producing studio, deterministic premium candidates, asking price and upfront talent budget are part of each saved offer. A funded purchase atomically debits the owned platform, registers a canonical rights contract and one world project, pays credited talent from the guarantee and records the seller receipt. Repeated signing does nothing.
- Acquisition and public premiere are separate. Signing creates one rights-deal industry fact; the film only receives ratings/reviews, a release fact and award eligibility when an active platform premieres it in the weekly transition. Until then it is excluded from released-library and rival relicensing pools. Genuine studio productions stay in the existing Upcoming auction lane.
- The existing 33-rival ecosystem receives an 8–20-title historical-library baseline where a migrated historical catalogue exists. A narrow synthetic snapshot fallback is retained only for saves/fixtures without that catalogue; existing legacy snapshots remain untouched. Historical projections are suppressed if a later canonical exclusive right conflicts.
- AI buyers can fund up to two brokered new packages per three-week cycle without removing player cards. They can also acquire at most one public package in each non-opening week. The first 12 public cards stay protected. Purchases require cash runway, strategy/quality fit and compatible rights, and use canonical contracts with stable project identities.
- The paid $450,000 scouting refresh remains phase 7 and was not added here.

## Verification

- `scripts/audit-streaming-opportunity-market-phases5-6.ts`: saved-cycle determinism, old-save migration/reopen, 20+5 supply, purchase/rights/NPC/news accounting, pre/post-premiere awards, public first-look, funded rival lanes, 33-rival historical baseline, exclusive-rights suppression and replay.
- `npm run audit:historical-market-phase5-6`, `npm run audit:save-migration`, `npm run audit:streaming-rights-transactions-phase6`, `npm run audit:streaming-opening-catalogue-phase6`, `npm run audit:content-market-ui-transplant`, `npm run audit:platform-ai-sourcing`, and `npm run audit:world-streaming-we6` passed in local runs.
- `npm run build` passed. A full TypeScript check still reports four unrelated existing errors in `App.tsx`, `index.tsx` and `scripts/audit-ios-long-session-soak.ts`; no new diagnostic was reported in the changed phase 5–6 files.

## Release notes and boundaries

- The Content Market retains its pre-existing historical direct listings alongside the 25 new cycle cards. The 20+5 target describes the new opportunity lane, not the entire mixed Market screen.
- Rival baseline positions are legacy catalogue projections checked against the canonical rights registry, not newly charged purchases. They do not retroactively debit 33 platforms or rewrite older save rights.
- No manual phone-browser or device visual QA was completed in this phase. The existing Market presentation was reused and the focused UI transplant audit passed.
- The workspace already contained extensive unrelated local changes. No files were staged or committed.
