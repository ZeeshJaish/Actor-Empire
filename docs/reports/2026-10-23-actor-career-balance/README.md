# Actor career balance — 23 October 2026

The implementation reduces the time to useful early acting competence and makes established careers depend on preparation, craft, genre fit, current work and audience. There is no wealth-triggered flop rule, success quota or new scheduling screen.

## Implemented behavior

| Area | Behavior |
| --- | --- |
| Early learning | New actor classes and genre practice progress faster at low proficiency and taper toward mastery. Existing paid classes retain their original completion/gain rules. |
| Relevant practice | Paid rehearsal prepares its selected project. Up to four learning actions are available in audition/preparation, with the remaining allowance reserved for filming; eight learning actions maximum per project. Repeated table reads cannot generate global career XP. |
| Concurrent roles | Actual personal acting commitments share one weekly passive preparation budget, weighted by phase. Director-only, producer-only and inherited parent roles do not consume actor attention. Legacy acting jobs contribute to workload but retain their own old gains. |
| Delivered acting | New personal roles resolve once at wrap: 45% role preparation, 40% actor craft, 15% relevant genre, with an entry-role allowance. Personal acting makes a bounded contribution to package quality; it does not replace the script, director or market simulation. |
| Final shoot decisions | Pending production decisions settle against preparation before wrap. Paid reshoots retain production time. A completed shoot waiting for choices does not repeatedly generate new shoot events. |
| Agent | Existing tier/access systems remain; new direct/agent offers, including premium routes, check the actual project's genre and actor craft. Celebrity cameos remain possible. New offer pay accounts for actual production scale, including BLOCKBUSTER. |
| Manager | Existing deal discovery/negotiation remains. Bounded preparation support helps with current roles; new commercial quotes consider credible work and audience. |
| PR | Publicity supports recent performance and real audience, including YouTube subscribers. Genuine directing/writing credits support publicity/commercial demand without becoming acting credits for Legend. Existing PR perk copy now describes this dependency in all six locales containing those keys. |
| Legend | New attainment additionally requires 12 personal acting credits, five years since the first credit and three strong recent acting credits. Existing qualifying saves are grandfathered; the usual fame/reputation/experience requirements still apply. |
| Agent payout safety | Fixed an independently reproduced double commission debit. Future payouts record the signed gross salary and a single commission expense; the existing receipt message shows net pay. No historical cash or transactions are rewritten. |

## Save and financial compatibility

The policy adds optional flags and commitment fields. It does not restamp active legacy projects, reduce earned skills/genre XP, reprice signed contracts, debit a migration fee, regenerate ownership or alter stored share counts. App commitment normalization retains the new fields. Existing save-generation verification, candidate promotion, previous-generation recovery and cinema settlement safeguards remain in place.

A signed $123,456 role with a 10% commission previously produced $98,766 from a double debit. The tested prospective result is one $123,456 salary, one $12,345 expense and $111,111 net. Historical balances remain as saved.

## Verification

| Case | Result |
| --- | --- |
| Focused career rules and exact callbacks | 29 checks passed, including initial RED evidence for behavioral corrections. |
| Ordinary Drama career | 78 actual weeks, one archived personal acting credit, 12 verified save/reloads, $26,184 ending cash. Started with the ordinary $2,000 and zero actor craft. |
| Ordinary Comedy career | 78 actual weeks, one archived personal acting credit, 12 verified save/reloads, $33,484 ending cash. Started with the ordinary $2,000 and zero actor craft. |
| Five concurrent films and sequel | Five real studio Greenlights, actual owned-production focus/rehearsal handlers, full production/release, actual continuation development and a sixth Greenlight/premiere, followed by five next weeks. 73 actual weeks and 19 verified save/reloads. |
| Per-film attention | The focused film delivered 89/100 acting; the four less-prepared films delivered 46–50/100. Finalized performance remained frozen through subsequent events, weeks and reloads. |
| Existing save/contracts | 14 actual weeks and 15 verified save/reloads. Legacy production/class rules retained, signed salary paid once, commission deducted once, two signed sponsorship payments retained at $8,765 each, 57 shares preserved and prior Legend qualification retained. |
| Affected regression suites | Career arcs, owned production, role feedback, role market consequences, dynasty, save integrity, save generations, talent retention/recovery and streaming energy. Ten commands passed. |
| Existing cinema audience regression | 100 cohorts, 50 pools, 100 country reads and 300 choices passed. |
| Full TypeScript check | Passed. |
| Production build | Passed with the existing bounded build command: 2,048 MB heap, 2,382 MiB peak process-tree RSS; memory guard did not stop the build. Vite reports a non-blocking large-chunk warning. |

The ordinary cases use real paid course enrollment, jobs, genre actions, applications, rehearsals and weekly processing. They do not grant cash/craft to get through a gate. Signed fees are checked throughout; cinema settlement is replay-checked each week. Saves use the real preparation/migration/generation code with an isolated memory store; failed candidate promotion is also exercised. Existing App normalization and React action callbacks are extracted from the production source rather than rewritten for the test.

The established case is deliberately prepared with an experienced actor and funded studio. It proves concurrent work, continuation, release and persistence behavior; it is not evidence that those resources were earned in 73 weeks. These are engine/action-handler tests, not a manual phone playthrough or a statistical guarantee about every career.

Two additional 208-week ordinary progression soaks completed with five Drama and four Comedy archived credits, plus 32 save/reloads each. Those exploratory runs predate the final wrap/learning refinements and are retained separately from the final preparation-flow evidence. The final ordinary/established cases use the final preparation rules; the later commission-only correction is covered by the dedicated agent-contract flow.

## Evidence and reproduction

Evidence in `evidence/` includes RED/GREEN output, final run results, executable/source hashes, typecheck/build output and preservation checks. Complete synthetic checkpoints and pinned executables remain under `/tmp/ae-career-*`; personal save slots were not accessed.

```sh
npm run audit:actor-career-balance
npm run audit:actor-career-flow
npm run audit:actor-career-established
npm run audit:actor-career-compatibility
npm run lint
npm run build
```

The ordinary runner defaults to two 78-week cases in a fresh temporary directory and runs bounded 13-week workers sequentially. Set `ACTOR_CAREER_WEEKS=208` for the longer soak. An explicit `ACTOR_CAREER_OUTPUT` can resume a matching checkpoint; a changed executable is rejected before replacing its pinned bundle.

The first established save assertion exposed only an optional `undefined` serialization-shape difference; comparisons were adjusted to serialized contract terms while retaining cash/skills/shares checks. The initial legacy fixture used incomplete award objects that existing migration correctly deduplicated; the corrected fixture uses distinct, dated awards. Neither required relaxing production save protections.

## Workspace preservation

The initial snapshot contains 60 pre-existing files. All 59 non-package files remain byte-identical to that snapshot. `package.json` retains every pre-existing script unchanged and adds only the four career audit commands. Existing cinema history/campaign/build/report changes are preserved. No commit, push or branch reset was performed for this task. Streaming renewal/rights routing remains deferred as requested.

## Subsequent shipping request

The follow-up request to commit/push the complete workspace includes a new two-case 104-week gameplay-curve run and fresh established/legacy checks. See [shipping verification](ship-verification/README.md) for current results, coverage limits and the recorded source snapshot. The implementation-stage results above remain as dated evidence.
