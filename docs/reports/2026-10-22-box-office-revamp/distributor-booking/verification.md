# Live safety and actual App verification

## Actual game-week/save progression

**245 actual engine weeks pass** across six routes. Each week uses `processGameWeek`, verified persistence preparation and save generations; writes are deliberately failed and retried, JSON reloads are verified, paid receipts are replayed and historical legacy gross is preserved. These are authored isolated fixtures, never a user's save.

| Route | Weeks | Observed behavior |
|---|---:|---|
| Founder small studio | 26 | Funded production, opening, repeats and reload |
| Established player studio | 26 | Funded production, opening, repeats and reload |
| Offered universe role | 26 | Common market receipts and signed actor route |
| Existing legacy active release | 26 | Historical gross preserved; future receipts and repeats |
| Late theatrical handoff | 26 | Natural local exit and signed streaming handoff |
| Ordinary starter | 115 | Current jobs, paid training, real applications/auditions, production, publicity and paid opening |

The ordinary starter retains `INITIAL_PLAYER`'s $2,000, skills and fame. The action policy pays for DRAMA training through the catalogue, applies to current public auditions with the actual energy charge, passes the real shortlist and practices production. No grant, fabricated job or casting override is used. It finishes the observed opening at $43,890, health 74.35, with 10 verified reloads and a failed-promotion retry. The 115-week run stops at the first paid opening; it does not establish the film's lifetime result. The earlier strategy targeting genre 85 did **not** reach an opening within 112 weeks; that failed observation is retained in `/private/tmp/actor-distributor-booking-20261022/ordinary-career.txt` rather than counted as a pass. Neither timeline is a promise for all careers.

[Per-route recorded facts](career-save-verification.json)

## Actual App

The full `index.tsx`/`App.tsx` StrictMode flow passes in isolated headless Chromium using verified IndexedDB:

- Fresh career creation; paid wellbeing; a current part-time job; a current audition application; quitting the job; and reload. Actual job reservation, application spend and quit refund agree with saved energy.
- The earned post-production save loads in another runtime. Career publicity spends 10 energy once, the known co-star's recognition survives runtime/reload, and normal Age Up reaches the paid actor opening: **$17,864.97 public gross / $9,468.66 producer receipts**. This unknown minor-role project is a UI/settlement proof, not the calibrated major-star archetype.
- A separately authored existing studio save completes footprint selection, shared forecast, five $10K campaign allocations, review and release confirmation. The $100K marketing reserve returns its unused $50K once; reload does not spend/refund again.
- That studio's actual opening is **$8,477,541.93 gross / $4,066,909.91 producer receipts**. The financial report displays collected receipts and production/release costs separately, showing roughly $3M profit after $1.1M costs. IMDb shows 743,866 first paid visits; waiting interest is not presented as guaranteed future streaming.
- No page errors; the 320px page has no document-level horizontal overflow. Screenshots were visually inspected. This does not claim that all 115 engine weeks were manually tapped, that every unrelated feature was tested, or that headless Chromium proves mobile/native performance.

[Actual App facts](app-verification.json) · [Release review](app-review.png) · [Financial screen](app-finance.png) · [320px audience screen](app-imdb-320.png)

The first cold-server attempt timed out during Vite dependency compilation before any gameplay step. Its evidence remains in `app-full-final/`; navigation now allows the same 90-second cold start as the other fixture-open steps. The complete subsequent run passes without weakening gameplay or payment assertions.

## Money, migration and save boundaries

**37 unique affected cinema/streaming/save suites pass**; [index](regression-index.json). The final live integration suite has 31 groups and migration has 22. TypeScript, production web build and frozen English comparison also pass (8,173 keys / 14,720 deterministic reaction cases); the English baseline was not recaptured.

Coverage includes player studios, offered-role films and NPC producers; signed actor/investor/talent splits; original receipt identity; replay after JSON reload; stale/conflicting result rejection; failed generation promotion and retry; previous-generation recovery; paid repeats; and calendar inheritance. A migrated $3.5B historical-gross control can continue earning new receipts without minting historical cash or triggering an old gross/age cutoff.

Tuning 1 and 2 migrate future behavior to tuning 3 without rewriting paid amounts or restarting discovery. Unsupported future tuning and corrupt financial state reject rather than silently reset. Sparse legacy releases keep an explicit unknown producer; only the same saved/current sentinel may use the external net-receipt ledger. An explicit missing producer, reassigned identity or unsettled forged sentinel rejects atomically. The exact net ledger amount and unchanged real studio balances are asserted.

A separate deterministic interleave reproduced the split player/manifest read race. Real IndexedDB now returns a consistent pair from one readonly transaction: the controlled old/current generations both verify as CURRENT, while deliberate monetary tampering still yields RECOVERY_AVAILABLE with a digest mismatch. Generation verification, promotion, recovery and durable-before-visible-week safeguards remain enabled. [Browser snapshot evidence](atomic-save-snapshot.json)

## Reproduce

```sh
node scripts/run-box-office-audit.mjs booking
node scripts/run-box-office-audit.mjs alternative-routes
node scripts/run-box-office-audit.mjs alternative-batching
node scripts/run-box-office-audit.mjs migration
node scripts/run-box-office-audit.mjs integration
npm run audit:save-transfer
CINEMA_LONG_CASE=ordinary-starter CINEMA_LONG_WEEKS=164 CINEMA_LONG_CHECKPOINT_DIR=/private/tmp/cinema-career node scripts/run-box-office-audit.mjs long-save
CINEMA_LONG_CASES=founder-small,established-studio,offered-universe,legacy-active,late-handoff CINEMA_LONG_WEEKS=26 node scripts/run-box-office-audit.mjs long-save
npm run lint
npm run build
```

The App harness is `scripts/audit-box-office-phase6-app.cjs`; it consumes the earned `POST_PRODUCTION.json` checkpoint and `scripts/write-box-office-app-fixture.ts`'s explicitly authored owner checkpoint. `PLAYWRIGHT_MODULE`, `CINEMA_APP_URL`, `CINEMA_APP_ACTOR_FIXTURE`, `CINEMA_APP_OWNER_FIXTURE` and `CINEMA_APP_OUTPUT_DIR` select local dependencies, isolated server and outputs. `scripts/audit-save-snapshot-app.cjs` controls the real IndexedDB interleave and tampering check. The normal dev server and real save slots are not used by these browser contexts.
