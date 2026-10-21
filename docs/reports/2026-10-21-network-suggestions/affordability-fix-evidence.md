# Final review fix — canonical unpaid commitments

Status: DONE. Scope: final-review P2 only, based on `e88e984`.

Local commit: `a42ea26` — `fix(streaming): reserve only unpaid canonical launch commitments`.

## Change and authority

`affordable()` now uses explicit canonical `MoneyPlan.deferred` as authority. Only when that accounting is absent does it fall back to the larger of legacy outstanding non-infrastructure cost and `treasury.committedLaunch`. The CAREER adapter marks historical Define the Launch, catalogue and originals payments `SETTLED`; these no longer reserve current cash a second time. Hard upfront/weekly caps and the minimum of current treasury and canonical available money remain enforced by the same Generate and Apply gate.

Only three tracked files changed: planner, focused audit, and its isolated CAREER capture helper. The helper accepts settled Build inputs and real marketing data for regression coverage. No visual, transaction, rights, commissioning, save-schema, browser, server, user's career, or broader optimization changes.

## Regression evidence

Real CAREER adapter with $100,000,000 treasury and $150,000,000 settled payments ($20M setup + $120M catalogue + $10M originals):

- Canonical Money reports all $150M as SETTLED and deferred zero.
- Zero-upfront/zero-weekly request generates and applies successfully.
- A real manually placed Scout quote with positive upfront below $100M is retained in a funded suggestion and applies successfully.
- A real $100M marketing ceiling reserves all cash: only zero-upfront suggestions pass; retaining positive-cost unbuilt infrastructure fails generation.
- A $100M + $1 unpaid campaign rejects even the empty plan.
- Changed campaign inputs invalidate the previous proposal at Apply.
- Fresh canonical money from the actual reserved CAREER bridge, behind unchanged proposal input identity, fails the Apply funds gate. The assertion checks the funds rejection, not merely a generic stale-evidence failure.
- Serialized disposable player remains unchanged, including money and rights.
- Existing lab legacy committedLaunch regression and full focused suite remain unchanged and pass, including caps, built-room preservation, rights/save round trip, cancellation and current-input validation.

The first funded test assumed the bounded planner would choose positive-upfront rooms. Diagnostic inspection showed a valid zero-upfront cloud choice with weekly cost, so the regression was corrected to seed a real positive-cost manual Scout room and require its preservation. This makes the funds assertion independent of the planner's mix preference. No production change was needed beyond the single deferred-authority fix.

## RED before production change

Command:

```
./node_modules/.bin/esbuild scripts/audit-streaming-network-suggestions.tsx --bundle --platform=node --format=cjs --loader:.csv=text --loader:.css=empty --outfile=/tmp/audit-streaming-network-suggestions.cjs
```

Exit 0:

```
../../../../tmp/audit-streaming-network-suggestions.cjs    9.1mb ⚠️
../../../../tmp/audit-streaming-network-suggestions.css  288.5kb
⚡ Done in 81ms
```

Command: `node /tmp/audit-streaming-network-suggestions.cjs`

Exit 1, direct rerun before production change:

```
US+IN generation=274.7ms validation=2.6ms candidates=144
AssertionError [ERR_ASSERTION]: Settled CAREER spend above current cash must allow a zero-upfront plan

'INVALID' !== 'READY'

    at main (/private/tmp/audit-streaming-network-suggestions.cjs:140605:25) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: 'INVALID',
  expected: 'READY',
  operator: 'strictEqual',
  diff: 'simple'
}
```

## GREEN and relevant checks

Same esbuild command, exit 0:

```
../../../../tmp/audit-streaming-network-suggestions.cjs    9.1mb ⚠️
../../../../tmp/audit-streaming-network-suggestions.css  288.5kb
⚡ Done in 79ms
```

`node /tmp/audit-streaming-network-suggestions.cjs`, exit 0:

```
US+IN generation=271.6ms validation=2.6ms candidates=144
CAREER settled $150M / cash $100M: zero and funded plans pass; unpaid $100M/$100M+1 and current-money Apply gates PASS
Network suggestions: planner, hard limits, current-input apply, preservation, cancellation, deterministic output and sheet render PASS
```

`npm run audit:streaming-build-lab-career-parity`, exit 0:

```
> pr-6.6.3@1.0.25 audit:streaming-build-lab-career-parity
> esbuild scripts/audit-streaming-build-lab-career-parity.tsx --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-streaming-build-lab-career-parity.mjs && node /tmp/audit-streaming-build-lab-career-parity.mjs

../../../../tmp/audit-streaming-build-lab-career-parity.mjs    1.3mb ⚠️
../../../../tmp/audit-streaming-build-lab-career-parity.css  787.7kb
⚡ Done in 41ms
Streaming Build lab/career canonical parity audit passed.
```

`npm run audit:streaming-launch-draft-continuity`, exit 0:

```
> pr-6.6.3@1.0.25 audit:streaming-launch-draft-continuity
> esbuild scripts/audit-streaming-launch-draft-continuity.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-streaming-launch-draft-continuity.mjs && node /tmp/audit-streaming-launch-draft-continuity.mjs

../../../../tmp/audit-streaming-launch-draft-continuity.mjs  3.9kb
⚡ Done in 4ms
Streaming launch draft continuity audit passed.
```

`git diff --check`: exit 0, no output.

Existing informational audit-bundle size notices and extra CSS outputs remain. No heavy TypeScript/build/scale gates were run by this worker; controller owns final amended-head verification. No unresolved concern in this fix scope. Previously disclosed whole-feature limitations remain in the original reports.

This execution report lives under the existing ignored `.superpowers` directory; the local commit includes only the three task-owned tracked source/audit files. Controller documents are left untouched and unstaged.
