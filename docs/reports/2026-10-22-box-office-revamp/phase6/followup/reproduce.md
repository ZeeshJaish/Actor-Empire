# Reproduce the follow-up

Use an isolated authored fixture directory and browser context. Never point these runners at a real user's save slot. `PLAYWRIGHT_MODULE` must resolve the installed Playwright package; the recorded run used the Codex bundled runtime.

## Source and career checks

```sh
node scripts/run-box-office-audit.mjs inputs
node scripts/run-box-office-audit.mjs career-actions
node scripts/run-box-office-audit.mjs royalty-batch
node scripts/run-box-office-audit.mjs viewing-routes
node scripts/run-box-office-audit.mjs integration
node scripts/run-box-office-audit.mjs migration
node scripts/run-box-office-audit.mjs save-boundary

CINEMA_LONG_CASE=ordinary-starter CINEMA_LONG_WEEKS=110 \
CINEMA_LONG_CHECKPOINT_DIR=/private/tmp/actor-career-checkpoints \
CINEMA_LONG_SAVE_OUTPUT=/private/tmp/actor-career-results.json \
node scripts/run-box-office-audit.mjs long-save

CINEMA_LONG_CASES=founder-small,established-studio,offered-universe,legacy-active,late-handoff \
CINEMA_LONG_WEEKS=26 CINEMA_LONG_SAVE_OUTPUT=/private/tmp/actor-existing-results.json \
node scripts/run-box-office-audit.mjs long-save
```

The sustainable newcomer audit stops at the first actual paid opening. It must wait for real jobs/applications and cannot grant starting money, casting or a paid actor campaign. The recorded seed closes at 96 weeks.

## Actual App flow

Generate the explicitly funded existing-owner fixture:

```sh
node_modules/.bin/esbuild scripts/write-box-office-app-fixture.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/private/tmp/actor-app-fixture.mjs
CINEMA_APP_FIXTURE_DIR=/private/tmp/actor-app-fixtures node /private/tmp/actor-app-fixture.mjs
node_modules/.bin/vite --host 127.0.0.1 --port 5197 --strictPort
```

In another terminal, with Playwright configured:

```sh
CINEMA_APP_URL=http://127.0.0.1:5197 \
CINEMA_APP_ACTOR_FIXTURE=/private/tmp/actor-career-checkpoints/POST_PRODUCTION.json \
CINEMA_APP_OWNER_FIXTURE=/private/tmp/actor-app-fixtures/owned-studio-awaiting.json \
CINEMA_APP_OUTPUT_DIR=/private/tmp/actor-app-results \
node scripts/audit-box-office-phase6-app.cjs
```

The normal version introduction and persisted action debounce are handled through real UI/verified reads. The actor checkpoint is earned by the preceding real-week audit. `CINEMA_APP_ROUTE=studio` runs only the prepared-owner route for focused scrolled screenshots; it does not replace the full fresh/earned audit. `CINEMA_APP_DEBUG_PORT` optionally exposes only the isolated test browser for diagnostics.

## Matched performance

Preserve the original checkout and unrelated changes. Create a separate baseline archive from `bb029e5`, overlay **the same unrelated dirty paths**, and use the same fixture JSON and measurement runner on both sides. Do not use an unstable baseline or compare different fixtures. The committed follow-up evidence records 8 and 4 warm Node samples in opposite trial order.

```sh
node scripts/run-box-office-benchmark.mjs --write-fixtures
CINEMA_BENCH_NAMES=early,late CINEMA_BENCH_WEEKS=8 \
CINEMA_BENCH_OUTPUT=/private/tmp/actor-week-results.json \
node scripts/run-box-office-benchmark.mjs
```

For the real-App benchmark, serve **each checkout** with `lab/cinemaPhase6Vite.config.mjs`, on different localhost ports. The added fixture HTTP route serves only known authored early/late files. Root `/` still loads the real `index.tsx`/`App.tsx`; do not open `cinema-phase6-qa.html` for this measurement.

```sh
node_modules/.bin/vite --config lab/cinemaPhase6Vite.config.mjs --port 5199

CINEMA_APP_BENCH_URL=http://127.0.0.1:5199 \
CINEMA_APP_BENCH_NAMES=early,late CINEMA_APP_BENCH_WEEKS=5 \
CINEMA_APP_BENCH_OUTPUT=/private/tmp/actor-app-week-results.json \
node scripts/benchmark-box-office-app.cjs
```

The first week is recorded separately; warm p95 uses the remaining four. An already-canonical authored fixture is signed and written through the normal verified generation API before load. Both sides retain actual App persistence, migration, readback and paint. The per-week clock advances by one second so the existing 500ms duplicate-click guard remains active. Normal medical alerts choose Later outside timing; no health/money is granted. Closing a fixture context releases its isolated save storage.

The initial transport experiment that sent a roughly 240MB fixture through Playwright's base64 response interception exhausted the renderer during seeding. Ordinary HTTP fixture delivery plus the normal verified write/load succeeds on both sides. Do not interpret that discarded transport attempt as a measured week or a native-memory pass.

## Final static verification

```sh
npm run lint
npm run build
node_modules/.bin/esbuild scripts/audit-localization-english-baseline.ts --bundle --platform=node --format=cjs --loader:.csv=text --outfile=/private/tmp/actor-english-guard.cjs
node /private/tmp/actor-english-guard.cjs
```

Never use `--capture` against the frozen English baseline. The 10 affected pre-existing audit names and all suite exits are retained in the adjacent JSON evidence. No release/push/merge is performed by these commands.
