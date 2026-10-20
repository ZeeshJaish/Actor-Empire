# Auction results, acquired hint and 5,000-title analysis

20 October 2026. Local changes preserve the preceding market UI repair. The cold-open optimization described below is a proposal, not an implemented performance fix.

## Delivered UI changes

Auction results now identify the project with its poster, title and seller. Won, rival-won, no-sale, invalidated and withdrawn results have distinct truthful headings. Sold results show the winner, upfront guarantee, backend share, rights duration and country coverage; production/future funding remains visible when present. Collections show Collection and their title count instead of the MOVIE placeholder. No-sale results show that rights were not transferred and no payment was charged, rather than an empty price badge. Existing canonical result reasons remain intact. The stale live-bid “Offer submitted…” text no longer appears on the closed screen; optional funding has its own feedback state and existing activation behavior.

The acquired overlay retains the three-second hold and gated skip. Its continue target is visually small plain text, with no border or background. It remains hidden until presentation completes; no Presenting label is shown. The hidden target reserves its space, so revealing it does not shift the poster. Keyboard/touch semantics remain. A real production-UI purchase increased the disposable 1,040-title catalogue to 1,041; the hint was absent before presentation, then visible with a transparent background and 0px border. The measured hold after presentation was 3001.6 ms.

Result layouts were inspected at desktop and 393 CSS pixels, and the winning deal was also checked at 320 CSS pixels with no document overflow and an accessible return action. The initial poster type was too large for its 112px container; it was corrected to the existing medium poster style. Controlled result fixtures are presentation proofs, not proof of live auction settlement.

## 5,000-title production browser stress case

The test contained 5,000 distinct licensed titles, 197 filed countries, 3,983 world projects and 5,024 canonical contracts including existing world contracts. The serialized synthetic save was 24,041,588 bytes. It starts from the pinned 1,040-title case (104 normal acquisitions and historical canonical grants) and adds 3,960 distinct synthetic released world projects with canonical subscription licences. This exercises real catalogue/world growth; it is not a history of 5,000 manual paid purchases.

| Interaction | Observed event-to-double-frame time |
|---|---:|
| First Build entry | 5,858.9 ms |
| Select North America | 16.1 ms |
| Add one Workhorse rack | 10,984.9 ms |
| Build Money stage | 25.6 ms |
| First Define entry in this session | 9,458.9 ms |
| Open Ident from clearance | 13,336.8 ms |
| Six bid amount controls | 70.9–79.3 ms |

The bid-control window also contained 68–238 ms long tasks. Build recorded a 5,850 ms task; the rack update recorded 150 ms and 10,830 ms tasks. Ident recorded 3,987 ms and 9,345 ms tasks. These later tasks matter alongside immediate button feedback.

These are a single production browser lab sequence at 393×852 CSS pixels, not p95/field INP or a hardware guarantee. Fixture construction is excluded. The fixture updates player state in memory and excludes App save persistence. Node/build/profile tasks were finished before the browser timing sequence. Some automation clicks timed out while the game was computing; the numbers above come from the in-page event/long-task recorder, not tool round-trip duration. The completed UI states were then read without repeating actions.

For context, the prior 1,040-title session recorded a 739.5 ms median first Build entry and 15.9–25.4 ms bid controls. This is a scale comparison, not before/after evidence for a new performance repair. The 5,000 fixture grows world projects as well as licences, so title count is not the only changing variable. No 5,000-title scalability green light is justified.

Normalization, migration/reload and a real auction tick each retained all 5,000 references and licences, complete canonical licence terms, every explicitly provided input term, the canonical rights registry and treasury. The opening catalogue showed all 5,000 as available. Seeded licences omit some optional default fields; the audit permits canonical migration to fill those defaults while preserving all supplied terms. It then compares complete canonical results. The separate bulk-owned starter selection cap remains outside this task.

## Concrete root cause evidence

Source and a current Node CPU sample point to services/streamingCatalog.ts resolveStreamingCatalogTitle: resolving one title maps the complete eligible world-project pool and then searches it. Doing that once for each title repeats the same conversion thousands of times. Additional licence filters/finds occur in opening coverage and content-availability reads. Large released-world catalogues therefore reveal work that the smaller historical-heavy fixture did not stress as strongly.

HQ and Define still build overlapping catalogue/read contexts. Build demand calls the full world pricing forecast. Draft/step publication can cause these models to be prepared again even though the catalogue/rights did not change. Navigation data updates themselves are small; the subscriber calculations after publication are expensive. This is CPU calculation on first consumption, rather than a dynamic code download.

A disposable Node diagnostic measured these separate calls (with CPU sampling overhead; not browser timings):

| Diagnostic | Time |
|---|---:|
| Cold opening coverage with prepared context | 4,683.9 ms |
| Same coverage, same unchanged context | below 0.1 ms |
| Same coverage, rebuilt context | 3,615.5 ms |
| World Build demand forecast | 4,301.2 ms |
| Canonical Ident step-field update, excluding App/disk persistence | below 0.1 ms |

The three coverage results had identical complete output hashes. This proves reuse can avoid that duplicate work when inputs genuinely have not changed. It does not prove the whole screen becomes instantaneous, and the call times must not be added as independent browser shares. The repeated full SSR benchmark was stopped; no incomplete SSR timing is used as a headline result.

## Proposed implementation order

1. **Index once per current input snapshot.** Build title-by-ID, licence-by-title, production/slate and country-membership lookups once. Preserve existing owned/world/historical resolution priority, expired/transferred rights, windows, modes and exact countries. Readers use the same canonical facts rather than rebuilding a full world pool for each title.
2. **Share one current read model across HQ and wizards.** Keep catalogue/rights preparation stable during step-only and network-draft edits. Avoid republishing unchanged drafts. Reuse the same coverage/launch projection across parent and child. Keep caches bounded to current/recent inputs so memory does not grow with every tap.
3. **Separate invalidation by what changed.** A rack change recalculates network/cost/coverage against an existing audience baseline. Pricing, week, markets, rights, release/localization, technology/product and relevant world/rival changes invalidate their dependent forecast. Pure geography can have its own cache. Do not key every tap by serializing the full 24 MB player or keep stale results merely because the week is unchanged.
4. **Make previews proportional to what is visible.** Count from indexed records and resolve only the displayed poster/title preview. Paginate the full catalogue; never truncate saved ownership to make a list faster. Batch only canonically equivalent rights footprints.
5. **If the genuinely cold forecast still blocks, move the pure preview calculation to a worker.** Send compact versioned inputs or deltas, not the entire save every tap. Show the screen immediately with an honest forecast-pending state; discard stale worker results. Do not call a calculation ready or allow commissioning using an old revision.
6. **Retest correctness and user-visible work.** Cover 52/104/1,040/5,000 titles, cold and warm entries, changes and later long tasks, save/reload, expiry/transfers, purchases and once-only settlement. Then profile representative Android and iPhone hardware. A desktop ready-page tap goal below 50 ms and usable cold screen below 100 ms is a proposed target, not an achieved promise.

Purchases, bids, clearance and launch must still validate current rights/funds independently. Durable current/previous save-generation recovery must remain intact. Because this browser fixture excludes persistence, the real large-save serialization/durable-write path also needs separate profiling before device-scale claims.

## Checks and local handoff

- Six auction-result SSR cases passed, including a collection regression observed failing before its fix.
- Three presentation/scouting regression groups passed.
- Rights transactions Phase A6 passed.
- Final TypeScript and production build passed.
- Independent review found the collection labeling issue; after its correction, no actionable findings remained.
- Manual design detection found six advisory flags, all on unchanged HEAD source lines. No suppressions or unrelated style changes were added.
- Current Anshu gameplay was not reset, purchased from or advanced. The main local game remains at http://localhost:5174/; the user was in the MGM negotiation screen during the final read-only check.

Machine-readable measurements: [JSON](./2026-10-20-auction-result-5000-analysis.json). The new result/hint changes remain local and uncommitted; no GitHub push was requested for this turn.
