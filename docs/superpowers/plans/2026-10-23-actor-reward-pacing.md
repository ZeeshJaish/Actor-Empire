# Actor reward pacing: experiments before tuning

The user approved the prior reward-distribution approach, with an additional gate: run combinations on current gameplay first, then change production rules only where evidence supports it. Existing saves, skills, money, signed contracts and unrelated changes must remain intact. Purchases must retain meaningful acceleration without guaranteeing hits, flops, mastery or Legend status.

## Constraints

- No extra UI, billing changes, price changes, forced outcomes, retroactive debits or skill reductions.
- Use isolated synthetic save stores, production action callbacks, current premium grant handlers with explicitly simulated receipts, and real weekly processing. Never access personal saves or make real purchases.
- Preserve the initial dirty workspace under `/tmp/ae-reward-pacing-preservation-20261023`; do not modify concurrent cinema cohort work.
- Distinguish cash purchased from income earned, preparation from durable skills, release from archive, engine results from actual retention/revenue evidence.
- Freeze baseline source and audit callback strings before implementation. Run workers sequentially with bounded heaps/checkpoints.

## Execution

- [x] Establish baseline: original entry strategy, balanced free training, cash-only, energy-only, combined cash/energy, and agent/PR combinations. Start with one-seed pilot, then extend useful cases through release and reload with another genre/seed.
- [x] Record weekly skill/genre/fame/recognition gaps, first booking/release/salary, wallet changes excluding purchased cash, energy spent/remaining, signed terms and outcomes. Purchases use published product grants in test saves only.
- [x] Compare minimal candidate rules in an audit-only experiment before production edits: proportional fame decay/recovery, bounded paid learning distributed over project weeks, and project-specific early recognition that cannot be farmed by repeated clicks or duplicate credits.
- [x] Write failing behavioral regressions for supported candidate changes; observe RED against unchanged production code.
- [x] Implement only the supported rules in the existing career helper and weekly/action consumers. Preserve old commitment progress and finalized performances; serialize optional new state through the existing whitelist.
- [x] Re-run the same frozen policies against final source, full fresh-to-release/save-reload curves, prepared established/concurrent cases, legacy money/contracts, and relevant regressions.
- [x] Verify TypeScript/build, preservation and honest limitations. Report measured free/boosted results separately from unverified revenue/retention impact. No Git push requested in this turn.

This is inline execution using systematic-debugging, test-driven-development and verification-before-completion. Any unsuitable candidate is rejected rather than expanded into unrelated systems.
