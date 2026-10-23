# Series valuation and mod inheritance fixes

Implemented the approved approach inside the existing calculations and flows. No controls, review panels, budget-range screens or wizard steps were added.

## What changed

**Series offers:** production budget and actor salary no longer multiply the selling value. New series rooms use the existing buyer-market scale, package quality, genre/rights coverage and studio relationship calculations, plus bounded observed viewing/rating evidence from this series or its previous released season. A different franchise cannot supply renewal evidence. A breakout actor can still negotiate a higher fee; the fee itself creates no minimum resale return.

The release room and automatic studio bidding share the new series input helper. Signing rechecks current value, pending obligations, spending restrictions and buyer resources. Old oversized unsigned automatic bids are refreshed, preventing an endless retry loop. Already signed contracts and their amounts are not repriced. Series affordability ceilings round down so a $2.06M balance cannot support a $2.10M opening offer. Compatible shared rights can still be sold to a second buyer.

**Mods:** succession clones enabled pack IDs and mod history as save-level settings. It does not copy parent death/career flags. Old affected heirs can recover missing pack selections from valid surviving pack history or exact known actor IDs/names. Exact contract snapshots are restored before pack hydration, so regenerated catalogue rows cannot overwrite a signed actor's saved statistics. Existing profiles take priority, duplicates are prevented, and known deceased actors are not resurrected.

**Regional streaming buyers:** the complete two-season test found an existing next-week breakdown crash after signing a non-core buyer. Distribution now receives the same subscriber-size simulation profile already used by viewership. The actual buyer ID, signed terms, allocated views and revenue remain unchanged.

## Verification

The final integrated run passed **88 actual game weeks and 39 verified save/reloads**:

1. Enable a country pack and hire an actor.
2. Greenlight and finish the actual Season 1 production calendar.
3. Sign a real bidding offer through the exact ReleaseWizard signing handlers, checking one payment and separate funding buckets.
4. Premiere and process viewing weeks, then create and write the continuation through the existing services.
5. Exercise a breakout actor's higher demand and a new installment contract, produce and license Season 2, then process subsequent weeks/reloads.
6. Run the actual App succession callback for living/deceased parent → son/daughter. Each of the four branches continues three game weeks with verified reloads. Enabled mods, creator options, actor presence, signed amounts and the existing inheritance tax/portfolio calculations are checked.

Fixtures are isolated and highly funded. Production/weekly/save services and the current UI callback source are real; React setters, slot-storage sinks and UI draft-input collection are captured in test utilities. This is automated engine/handler verification, not a manual browser career. No personal save was accessed.

| Check | Evidence |
| --- | --- |
| Full two-season and four-way succession journey | [flow.txt](evidence/flow.txt) |
| $10M/$1B/$1T budgets with identical movie/series offers, four App handoffs and old-heir recovery | [focused-tests.txt](evidence/focused-tests.txt), [results.json](evidence/results.json) |
| Weak/successful season evidence, rising actor ask, shared second buyer, fractional cash, pending obligations, stale offers, one payment, real funded deal | [focused-tests.txt](evidence/focused-tests.txt) |
| Legacy automatic oversized bids and next-week idempotence; regional buyer view/revenue totals | [focused-tests.txt](evidence/focused-tests.txt) |
| Existing bidding and rights calendar | [bidding](evidence/bidding-regressions.txt), [calendar](evidence/calendar-regressions.txt) |
| Movie rights valuation/settlement | [18 passing groups](evidence/cinema-rights.txt) |
| Existing talent contracts, last-use EMI, Greenlight and save/reload | [contracts](evidence/contracts-regressions.txt), [retention](evidence/talent-regressions.txt) |
| Legacy/dynasty, distribution, integrity and generation safety | [legacy](evidence/legacy-regressions.txt), [dynasty](evidence/dynasty-regressions.txt), [distribution](evidence/distribution-regressions.txt), [integrity](evidence/save-integrity.txt), [generations](evidence/save-generations.txt), [profile recovery](evidence/save-recovery.txt) |
| Full repository TypeScript check | Passed, exit 0; [output](evidence/full-typecheck.txt) |
| Final focused TypeScript compilation | [output](evidence/typecheck.txt) |
| Production build | Passed, exit 0; [output](evidence/build.txt) |

Reproduce the main checks with `npm run audit:series-mod-safety` and `npm run audit:series-mod-flow`.

## Save and workspace preservation

No migration version or signed-contract schema was changed. Pack repair runs idempotently in the existing migration path. It recovers only proven selections; it does not enable every pack or invent an unavailable historical actor profile. Existing money, prices, shares and ownership are not reset. Normal existing inheritance taxes and paid-up contract retirement remain in effect.

Twenty pre-existing dirty files outside the three shared files intentionally edited here matched their starting hashes. The shared-file additions retain the earlier actor-retention and other existing work. Concurrent unrelated changes were left in place. See [preservation.json](evidence/preservation.json) and [provenance.json](provenance.json). No stage, commit, push, reset or restore was performed in this task.

Independent read-only review covered affordability, shared rights, old automatic bids, signed-contract safety, mod recovery and the regional mapping. Its actionable findings were fixed and checked; no remaining actionable findings were reported.
