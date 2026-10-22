# Box-office Phase 2 — recognition, exposure and forecast-safe knowledge

Baseline: `849cf7d` on `codex/streaming-tap-lag`. [Approved design](../../superpowers/specs/2026-10-22-fair-box-office-design.md) · [Implementation plan](../../superpowers/plans/2026-10-22-fair-box-office.md). Phase 1 evidence remains unchanged.

## Behavior

Actor fame/stature now have a bounded recognition adapter with role weights, identity deduplication and conservative audience overlap. They do not create separate fan populations, favorite actors or ticket purchases. Favorite/studio-trust inputs require experienced people; actual affinity formation is Task 5. Studio recognition requires released career evidence, including inherited libraries, instead of a new business's healthy default score.

Private package construction computes attention potential without announcing the film. Public Greenlight/release confirmation records an identified, dated announcement. Its conservative organic-recognition share is frozen at announcement, so later fame cannot revalue old publicity. A zero-paid-marketing film can have earned organic reach; an unknown unexposed package has none merely because it can book worldwide cinemas.

Paid theatrical campaign records use the existing committed marketing amount and channel allocations. Exposure refuses a campaign above that recorded spend, records each channel once, and never debits money itself. Spend is a recorded fact; qualified impressions produced by the candidate spend-to-reach model remain explicitly estimated. Current choices target countries through the existing world country registry; there is no invented city precision or extra screen-driven awareness.

Actual career publication attribution emits dated exposure for the linked film. Studio-owned film commitments can use the same publication route. A publication cannot reapply exposure or legacy buzz, even after the general media attribution list is compacted. Zero observed reach stays zero; bad publicity can retain signed sentiment without inventing views. Existing series behavior is retained.

Exposure saturates the remaining people in each cohort. Shared people bound paid/organic sources rather than summed star followers. Duplicate event IDs apply once; conflicting identities fail. Future events are not applied. Local discovery requires actual local footfall and streaming-channel exposure requires accessible reach. These contracts do not emit live cinema footfall or equate a subscription with a ticket.

Forecast projection reconstructs an explicit whitelist from known package facts and visible quality ranges. It excludes delivered quality and cannot mutate cash, projects or world audiences. Legacy raw hype remains labeled legacy attention estimate, with no implied aware audience. The actual Greenlight builder is checked with different legacy buzz and hidden production variance.

Actual game-week release, save compaction, JSON/migration reload and completed-run archival preserve public-source identities. Inheritance retains the studio's released career and rebases live exposure dates onto the heir's age clock while retaining source IDs and the parent's original archive. Regression probes reproduced recognition resetting to zero and announcement week 1527 remaining future to an heir at week 903 before repair.

## Integration boundaries

This phase prepares the three readings honestly: attention is an index, awareness is a modeled people estimate, and forecast knowledge contains visible uncertainty. It does not fabricate a theater-intent percentage before price, tastes and shared choices exist. The full Greenlight/release UI replacement is Task 9. Legacy monetary buzz/fame behavior stays on its compatibility route until Tasks 8/9 activate all owner routes together.

Awareness here is **recomputed from dated event history against the current modeled cohorts**, not a committed ledger of unique people. Population growth can therefore change this read-only estimate. Tasks 7/8 must introduce persisted cohort awareness and applied-source history before live audience or ticket settlement; an old announcement must not replay as new committed viewers. No extra ticket revenue, streaming customer growth or paid money is activated by this phase.

Initial actor/studio recognition uses conservative legacy proxies when measured cohort experience is absent. Coefficients in `boxOfficeProfiles.ts`, including qualified impressions per dollar, are candidate game tuning and have not been calibrated to real advertising results or final hit/flop frequencies.

## Verification

Focused replay commands:

```sh
node scripts/run-box-office-audit.mjs awareness
node scripts/run-box-office-audit.mjs phase2-integration
npm run audit:greenlight-project-builder
npm run audit:streaming-launch-marketing-forecast
npm run audit:streaming-launch-marketing-lifecycle
```

The same seeded, isolated runner used in Phase 1 executes the new audits without loading a player save. Awareness has 18 grouped cases; integration has 10, including the real Greenlight funding, publication, inheritance, engine, persistence and archival paths. Independent read-only review found no remaining Critical/Important issue after both inheritance regressions were repaired.

Final command outcomes, source hashes, preserved baseline files and any verification limits are recorded in [verification.json](verification.json). Browser interactions, physical-device performance, full shared-market balance and final theater-intent accuracy are outside this checkpoint.

Unrelated streaming UI/economy edits arrived in the shared checkout during final verification. They are preserved and excluded from this checkpoint. Final replay/type/build verification uses an isolated archive of `849cf7d` with only Phase 2 files overlaid and the existing dependency runtime. Results therefore certify this scoped Phase 2 snapshot, not the concurrently changing combined checkout.
