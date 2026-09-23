# Streaming launch S1: network and rehearsal reading

Date: 2026-09-23  
Scope: approved S1 only; no save migration, economy or energy rebalance, S2 flow change, commit, or push.

## Result

The career Build adapter now projects canonical geographic reach, well-served share, covered peak, and cloud share into the four Build stages. Region grade, map readout, and country rows use finite values from that projection. A missing or inconsistent value is shown as **Coverage unavailable**, not zero or `Strong`, and blocks the rehearsal/commissioning gate.

The load rehearsal now reports playing/buffering/down across **all** opening markets. Its monitor overflow is explicitly a subset; visible monitor cells open the existing viewer screen directly. The selected market explains its local route, load or physical limit, and next step. The main screen says why the worst market is down even with spare global compute. Buffering countries no longer appear among “held” countries.

The same eligibility function now controls which regional/residency-compliant facilities the career forecast and rehearsal consider. A country with zero geographic reach has no rehearsal route even if another market in its region has equipment. This does not change saved network structure or the configuration-signature rule.

**F27 rule approved and implemented:** geographic coverage and routed-load performance are separate conditions. Every opening country must reach the existing `SERVED` grade (at least 80% smooth geographic coverage) before commissioning. The Build Launch checklist names thin markets and their percentages; the canonical commission quote independently enforces the same condition before cash or filing energy moves. A passing load rehearsal remains valid evidence for routed traffic but cannot bypass geographic coverage. The former `override` draft flag does not bypass either commissioning condition. No new save field, partial-market failure model, or balance tuning was added.

## Verification

| Check | Result |
|---|---|
| S1 coverage audit | 8 pass, 0 fail: prior projection checks plus separate per-country coverage gate, threshold, override, missing-data and rehearsal-scope checks |
| S1 rehearsal audit | 2 pass, 0 fail: three-market all-market counts and no-route/routed-market diagnosis |
| S0 baseline | 5 pass, 1 fail: the sole remaining failure is S2’s seeded first Build |
| Regional placer | Pass |
| Build Test/autosave gates | Pass after updating its deliberately valid fixture to include the now-required coverage fields |
| Build lab/career parity | Pass |
| Regional network lifecycle | Pass: thin-country canonical commission rejected without cash/energy movement; covered new and migrated careers commission |
| Build/world integration and Build Phase 4 UI | Pass |
| Isolated browser fixture | 393×600, 393×852, 1280×800: no document horizontal overflow; market counts, direct UK selection, Belgium no-route explanation and local next step observed |
| TypeScript, production build, diff check | Pass; production build retains existing Vite warnings about `/index.css`, mixed imports, and large chunks |

The isolated browser fixture created three deterministic markets without reading the user's save. It showed 1 playing, 1 buffering, 1 down at 47% own capacity and 61% spare burst capacity. Belgium had no delivery route. United Kingdom buffered through London at 100% local load. Mobile viewer details remained scrollable.

## F27 disposition — partial geographic reach versus full-demand rehearsal

The Build map can call a country partly reached/covered while the canonical rehearsal allocates its **entire** peak demand to any eligible route. The approved rule makes that distinction explicit: a load rehearsal can pass, but a separate geographic gate prevents commissioning unless each opening country is `SERVED`. Rehearsal remains a routed-traffic stress test; uncovered audience is not silently converted into failed streams.

F27 is closed by the user-approved gate. S1 is not a full end-to-end release validation: S2's fresh-Build prefill remains red, and later phases still own registration, group filing, pricing and the saved-career walkthrough.

## Remaining phases

- **S2:** dashboard/tutorial route, no initial Build prefill, filing-status edit gate.
- **S3:** group geography/report/UI and filing-energy balance decision.
- **S4:** pricing/discount/AI demand parity.
- **S5:** Build presentation, performance, artwork, and agreement detail.
- **S6:** full saved-career and old-save end-to-end walkthrough.
