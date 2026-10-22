# Phase 6 follow-up: career, durability, performance and the full App

This follow-up starts at `bb029e5` and preserves all 69 unrelated dirty paths byte-for-byte. It uses isolated authored save slots; no real player's saves were loaded or replaced. The previous Phase 6 checkpoint and failed harness attempts remain historical evidence in this directory.

## Fixes supported by reproductions

- **Ordinary-career policy:** wait for real weekly jobs and auditions; fund catalogued training and wellbeing from actual job income; pay 25E for an application; pass the actual shortlist and audition; rehearse at actual energy and overwork costs; resolve queued saved choices. Actor publicity uses the Career Post/Hype/Press actions. The old harness's fabricated actor cash campaign is removed. Owned studios control their reserved cash marketing.
- **React updater replay:** job acceptance, application, job exit and organic publicity now clone energy/flags before mutation. StrictMode previously charged a 25E application twice and could return spent application energy on quitting a job. Publicity could spend 10E twice. IDs are stable across updater replay. Reproductions, immutable-source assertions and actual App saved-state checks cover the fixes.
- **Production crash:** three benign cast traits intentionally return no crisis. The crisis selector now accepts that result before assigning a trait. A real fresh career previously crashed there; forced-template regressions pass.
- **Cast portability:** procedural catalogue IDs contain a runtime timestamp. An earned film's co-star could disappear from lookup after loading in another runtime, reducing its opening to almost zero. Casting now saves real identity-matched fame/stature as a fallback; current canonical actors take precedence. Directors, anonymous credits and duplicate people gain no invented reach. Offered, authored and live NPC casts retain this fallback. Migration captures only resolvable legacy actors and leaves previously settled gross, receipts and payments untouched. Already-lost actor facts cannot be reconstructed reliably; legacy missing facts remain unknown rather than being replaced with celebrities.
- **Small campaign usability:** the former $250K minimum increment disabled all marketing controls for a $100K reserved budget. Allocation steps now permit smaller channel choices while remaining capped by the funded pool. A zero pool still disables increases. The actual App uses five $10K increments, not a fake grant.
- **Late-save computation:** per-close title-fact context replaces repeated immutable archive reconstruction; signed royalty gross and licence lookup use ordered per-contract maps. Receipt filtering, duplicate precedence, backend basis, caps, advances, permanent ownership, dates and replay behavior stay unchanged. No cross-week/global cache, payment shortcut or save-durability bypass is added.

## Verified progression and saved facts

The actual weekly engine plus verified generation coordinator completed **226 weeks** on the final gameplay source: 26 each of founder-small, established-studio, offered-universe, legacy-active and late-handoff, plus a 96-week ordinary newcomer. The four required existing styles therefore contribute 104 weeks; the late handoff adds another 26. Prepared owner saves do not demonstrate a newcomer's ability to buy a studio.

The ordinary run starts at $2,000 with no injected job, cast, money or guaranteed audition. Current jobs fund actual training/wellbeing. Three applications lead to two auditions; the first audition fails. The character remains alive and funded, completes production and 12 real organic publicity actions, and reaches an opening of **$285,303.27 public gross / $140,629.38 producer receipts**, ending at **$41,211 cash, 73.5 health and 64 mood**. These are one seeded career's opening results, not lifetime grosses or a success quota.

Save/reload checks include paid openings and repeats, failed generation promotion with recovery/retry, historical paid facts, natural theater exit and signed streaming handoff. Same-week/stale settlement and player/offered/NPC payment invariants are separately asserted by the integration, migration, save-boundary and finance suites. No theater exit is claimed inside a censored 26-week window when that title was still active.

## Actual App evidence

The follow-up runs the normal `index.tsx` / `App.tsx` under React StrictMode, actual navigation and verified IndexedDB. It is separate from the small performance summary and the Phase 5 component harness.

- Fresh creation, real wellbeing confirmations, current job/apply/quit, persisted costs and reload.
- Resume the **earned** 96-week audit's post-production checkpoint in a different runtime; actual 10E Career promotion, cast recognition and weekly paid opening.
- Explicitly prepared existing studio: production and $100K marketing reserve already funded. Normal distribution/chain choices, forecast, five $10K marketing allocations, confirmation, unused reserve return once, reload, actual weekly opening, financial detail and IMDb audience insights at 320px.

This combines a fresh 96-week engine/save career with fresh App action checks and earned-checkpoint App continuation. It does not claim that all 96 weeks were manually tapped in the App, that every unrelated game feature was exercised, or that a prepared owner was unlocked from $2,000.

## Balance numbers and interpretation

[All 26 scenario distributions](scenario-results.md) and [CSV](scenario-results.csv) retain the 832 controlled treatments / 53,469 title-weeks / 23 passing tendencies. Quality, market size, campaign and competition assumptions are explicit. Public gross is not player income. A high gross can still lose money after cinema share, campaign and booking costs. No hard revenue cap or universal hit/flop quota is imposed.

The targeted-indie fixture deliberately has good quality, a paid $0.5M campaign and no rival. Its 32 profitable seeds do not establish that all small films succeed. The extreme case uses four times the authored population and exceptional spending; it proves the absence of a $3B cap. The existing high-fame prepared owner's App run is also a conditional case, not a typical newcomer forecast.

## Measurement and remaining scope

Final paired complete-week and verified IndexedDB/paint measurements are recorded under `followup/`. The comparison baseline is the stable `bb029e5` checkpoint plus the **same 69 unrelated dirty files**, not the older unstable global baseline. Both sides use identical input JSON, runner, seed and durable save boundary. Full-state hashes may differ only because new cast fallback metadata exists; the comparable-state hash strips only `cinemaRecognition` and `cinemaCast` before comparing all remaining gameplay and money facts.

Desktop/headless Chromium measurements do not establish native bridge, mobile-device GPU, thermal behavior, store settlement or production readiness. No native release, push, merge or rollout action occurs here.
