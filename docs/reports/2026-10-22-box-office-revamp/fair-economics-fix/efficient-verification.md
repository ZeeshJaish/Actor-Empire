# Bounded verification after reported memory pressure

The user reported that verification was associated with 25–26GB memory usage and computer stalls. Earlier parallel long careers, browser verification and compilation were excessive for this computer. There is no process trace attributing that entire total to a single component, so this report does not claim a fix for the Codex application's own memory usage.

## Operating limits

- One heavy verification job at a time. No career simulation alongside a browser or build.
- The ordinary-career controller accepts exactly one worker and at most a 1536MB Node heap.
- Workers exit after 13 game weeks, releasing process memory. The next batch restores a gzip checkpoint, deterministic random position and audit clock.
- `CAREER_MAX_BATCHES=1` permits one bounded batch per command. The latest result and previous complete checkpoint survive interruption.
- Existing completed, dead, failed and unfunded outcomes are retained. Source/horizon mismatches refuse to overwrite earlier evidence. No failures are silently retried as fresh successful careers.
- macOS kernel locks protect both controller and worker. An orphaned worker still blocks a second heavy import after its controller is killed. A killed worker automatically releases its kernel lock. Empty lock files are harmless and are not removed while another process may own them.
- Executables are pinned in each output folder. Later shared-workspace edits do not silently change a resumed experiment.

These controls are in the audit harness, not gameplay persistence. The real player's saves and game random stream are not modified.

## Measured verification

| Check | Result |
| --- | --- |
| Resumed 13+13 vs continuous 26 weeks | Identical full-player SHA-256, including financial state |
| Duplicate controller / worker | Blocked |
| Controller forcibly killed with live worker | New heavy import blocked until worker exits |
| Worker forcibly killed | Kernel lock released; next isolated worker can run |
| Completed/dead/failed result retention | Passed |
| Partial checkpoint write | Prior complete checkpoint retained |
| Seed 4, 208 actual game weeks | Completed, alive and funded; 15 bootstrap resumptions |
| Recorded seed-4 process RSS high-water mark | 3,223,257,088 bytes, about 3GB |
| Capped application + changed-audit source typecheck | Passed, exit 0 |
| Latest minified production build, 1536MB heap | Failed at chunk rendering with heap-limit OOM; not retried with a larger allowance |

The 1536MB heap allowance is not an RSS limit. Native allocations, buffers, module loading and serialization add process memory. The recorded high-water sample may precede final checkpoint serialization; it is not a guarantee that all future saves stay under 3GB. Native-device performance is unverified.

The full 208-week run used a pinned financial-candidate executable. Unrelated script/DNA edits continued in the shared workspace during verification, so this evidence is scoped to that executable and the recorded financial files. The final typecheck checked current source separately.

## Evidence and reproduction

See `evidence/checkpoint-parity-after.json`, `efficient-runner-guards.json`, `efficient-runner-lifecycle.json`, `audit-runner-lifecycle.py`, `batched-executable-metadata.json`, `career-4.json` and `typecheck-result.json`. The lifecycle fixture uses tiny stub workers, not extra long game simulations. It deliberately kills only its own temporary processes.

From the repository root, run one batch:

```sh
CAREER_OUTPUT=/private/tmp/actor-cinema-safe-verification \
CAREER_SEEDS=4 CAREER_WEEKS=208 CAREER_CONCURRENCY=1 \
CAREER_CHILD_HEAP_MB=1536 CAREER_BATCH_WEEKS=13 CAREER_MAX_BATCHES=1 \
node docs/reports/2026-10-22-box-office-revamp/career-economics/run-audit.mjs
```

Repeat the exact command to resume. To test new source, use a fresh output directory. Do not launch the command while another heavy verification job is active. The controller's lock prevents duplicate career workers; the no-build/no-browser rule is an operational restriction, not a machine-wide scheduler.

No long verification worker, test browser, task Vite server or compiler was left running at the final process check. Unrelated user applications were not terminated.
