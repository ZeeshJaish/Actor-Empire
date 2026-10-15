# Localization Phase 1 safety checkpoint — 1 October 2026

Phase 1 is complete. The nine-phase roadmap and first-phase execution plan are saved. English comparison guards and a one-time baseline now provide regression evidence for later translation batches. No translations or game behavior were changed in this phase.

## Protected evidence

- **8,173 existing English dictionary keys** captured as actual values. Changing/removing any captured key fails the guard. Adding a new English key is allowed for ongoing development.
- **14,720 deterministic reaction cases**: 10,000 classification/focus cases, 4,320 genre/world/career/role/story-fit/cast-summary cases, and 400 fixed-context variant cases. Outputs include IDs, headlines, subtext, social text, authors, handles and hashtags.
- **15 banks**: 14 prose banks plus the author bank, preserving semantic keys, item order and text.
- Real opening news, critic news/reviews, X and Instagram producer outputs captured. Only X wall-clock timestamps are excluded. Other returned fields remain compared, including IDs and engagement values.
- Repeated rendering must return identical output. Inputs and the Player fixture must remain unchanged after pure text generation.
- Existing theoretical reaction estimate remains **8,000,000,000**. This is a bank-size estimate, not a count of eight billion executed or proven-unique sentences.
- **821 existing production/config files verified byte-identical** against the pre-phase manifest, including services, locales, UI, hooks, App, types and package configuration. See `2026-10-01-localization-phase1/source-manifest.json`.

The baseline is `scripts/fixtures/localization-english-baseline.json`. It was captured once before any translation changes. Default checking is read-only; repeat `--capture` fails rather than overwriting expectations.

## Verification results

| Check | Result |
|---|---|
| Guard test before implementation | Expected FAIL: altered existing English wording was not rejected by the empty stub |
| `node scripts/audit-localization-baseline-guard.mjs` after implementation | PASS: unchanged/additive English accepted; eight regression types rejected |
| Frozen English baseline comparison | PASS: 8,173 keys, 14,720 cases, producer outputs and banks unchanged |
| Attempt to capture the same baseline twice | Expected nonzero refusal; snapshot preserved |
| `npm run audit:reaction-template-engine` | PASS; eight-billion theoretical estimate remains |
| `npm run audit:release-media-narratives` | PASS |
| `npm run audit:streaming-global-localization` | PASS; streaming subtitle/dubbing gameplay remains separate |
| `npm run audit:save-integrity` | PASS |
| Pre/post production-file manifest | PASS: all 821 existing files unchanged |

The esbuild sizes reported during these audits describe temporary diagnostic bundles under `/tmp`; these scripts are not imported into the production game bundle.

## Existing behavior discovered while freezing

An empty English dictionary value currently falls through to the key text because `t()` uses `||`. For example, `startup.loadingEyebrow` has an empty source value. The guard preserves that current lookup behavior instead of changing the production helper inside safety setup. Any later correction must be reported as an intentional English UI bug fix, not hidden by refreshing snapshots.

The localization defects from the original coverage audit remain: missing keys, English copies, generated English prose, active Social bypass and old stored prose. The historical runtime audit asserts those defects for diagnosis; later fixes will replace the affected assertions with the desired localized behavior. It is not a permanent release gate requiring English content in non-English languages.

## Scope and next checkpoint

Created only planning/spec/report files, diagnostic scripts and English snapshot data. No gameplay/UI/locale/service changes, commits or publication. Streaming, rights, economy and save work already present in this dirty checkout was preserved.

Next is **Phase 2: Portuguese coverage and meaning-quality pilot**, grouped by producer/domain and checked against this English baseline. Phases 2–9 are pending, as described in `../specs/2026-10-01-localization-quality-coverage-design.md`.

These checks are focused evidence. They do not establish zero future risk, full browser/device coverage, all simulation branches, long-save performance or native-speaker review. Each later phase has its own targeted checks and checkpoint.
