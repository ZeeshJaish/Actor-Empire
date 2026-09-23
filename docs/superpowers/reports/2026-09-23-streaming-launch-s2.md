# Streaming launch S2: registration, filing, and Build entry

Date: 2026-09-23. Implemented inline in the authoritative Actor Empire checkout. No commit, push, save edit, energy rebalance, or S3 work.

## Observed behavior

- Isolated real-component incorporation reached Platform Dashboard, not Studio Finance. Treasury stayed $0 after the $85M incorporation fee; the welcome guide offered **Inject capital**, **Take the Streaming Hall tour**, and **Explore on my own**. Exploring did not inject funds. Finance remains available by choice.
- Fresh Build from that HQ had zero opening markets, sites, facilities, and placements. It showed a Market Clearance explanation, a link to the filing step, and a collapsed illustrative unit-price disclosure. The Network, Money, Test, and Launch pages could be visited, but editing, rehearsal, and commissioning were disabled. Money showed **No market quote yet**; Launch showed **No commissioning agreement yet**. No visited-but-incomplete page carried a false completion tick.
- The access selector uses the canonical opening-country operation ledger. A planned-only selection remains read-only; a filed market can be planned while approval is pending; action-required clearance remains a filed market; exited operations do not unlock a new Build. Existing saved drawings and commissioned assets are not replaced by the blank default. An old day-one save with a saved drawing retains a compatibility path.
- The canonical commissioning quote refuses to auto-file unfiled opening operations. The rejection leaves cash and energy unchanged. Filing continues to be the explicit charged action; no filing-energy number changed in S2.

## Failures found and disposition

| ID | Reproduction / actual | Expected / disposition | Owner |
|---|---|---|---|
| F28 | Empty canonical CAREER inputs initially crashed an untouched Build preview. | Explicit empty drawing is valid; omitted canonical inputs still throw. Fixed and audited. | S2 resolved |
| F29 | First Build mount could emit an adapter-normalized selection as a player edit. | Initial projection must not write a draft. Fixed normalized-key comparison and locked callback. | S2 resolved |
| F30 | Read-only preview showed `$0 due`, `Money` as cleared, and ticks on pages only visited. | No quote/agreement or false completion before filing. Fixed and browser checked. | S2 resolved |
| F31 | A planned-but-unfiled opening operation could pass into a commission quote. | Filing must be explicit; rejection must spend nothing. Fixed and lifecycle-audited. | S2 resolved |

The inherited F19–F21 defects are resolved as recorded in the S0 ledger. Existing F01–F06, F09–F15 presentation and group/pricing issues belong to S3–S5; this phase did not silently alter their balance or visuals.

## Verification

| Check | Result |
|---|---|
| `npm run audit:streaming-launch-s2` | 7 pass, 0 fail |
| `npm run audit:streaming-launch-s0-baseline` | 6 pass, 0 fail |
| `npm run audit:streaming-regional-network-lifecycle` | pass, including unfiled no-spend rejection |
| `npm run audit:streaming-founding-phase3` | pass after route expectation update |
| `npm run audit:streaming-launch-draft-continuity` | pass |
| `npm run audit:streaming-opening-programme` and `:ui` | pass |
| `npm run audit:streaming-build-lab-career-parity` | pass after distinguishing explicit empty from missing canonical input |
| `npm run audit:streaming-launch-phase8` and `:regional-plan-migration` | pass |
| `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` | pass; default Node heap had previously been insufficient for this repository |
| `npm run build` | pass, with existing Vite bundle/mixed-import warnings |
| Isolated browser, actual founding and Build components | incorporation → HQ → optional capital/explore → blank read-only Build; Market Clearance route; all four Build stages and no false bill/agreement |

The browser walkthrough used synthetic in-memory player state and temporary local fixtures, not the user's actual save or browser storage. It does not prove every historic save migration or the whole S6 journey. A live filed-market click-through and full mobile/desktop visual matrix remain for the later whole-journey gate. S3 can begin without an S2 balance change, but the user must approve it separately.
