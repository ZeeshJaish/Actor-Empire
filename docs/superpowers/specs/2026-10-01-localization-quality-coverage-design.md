# Localization quality and coverage design

The existing audit found missing translations, English dictionary copies, active pages that bypass localization, English-only combinable reaction banks and rendered strings stored in saves. Improve those in separate phases while preserving English output, deterministic variation, gameplay outcomes, custom text and work already underway in this checkout.

**Approved intent:** the user approved improving existing-language coverage/quality, preserving English and billions-of-combinations variety, and executing one phase at a time. This document makes that agreed approach concrete. Implementation proceeds in this chat without another general permission question; each completed phase receives an evidence checkpoint.

**Source evidence:** `docs/superpowers/reports/2026-10-01-localization-audit/README.md` and its JSON/CSV/runtime evidence. All counts refer to the working tree on 1 October 2026, not necessarily the store build.

## Requirements shared by every phase

- Existing English source strings and generated English output remain unchanged for covered identical inputs. New English keys may be added; silently changing old keys or refreshing baselines to hide differences is prohibited.
- Preserve release/news/post IDs, seed-to-variant selection, bank lengths/order, hashtags, authors and numeric interpolation. Translate wording and grammar without rerolling the underlying event or variant.
- UI language selection must not change money, rights, bids, exposure reserves, taxes, awards, stats, audience scores, simulation, save timing or energy use.
- UI localization and streaming content-language/subtitle/dubbing research are separate systems. `services/streamingGlobalLocalization.ts`, operating language assets, jobs, capability unlocks and charges are outside UI translation changes.
- Preserve user-authored titles, names, captions, messages, URLs and proper brands. Do not translate arbitrary rendered strings by guessing their meaning.
- English remains the fallback for incomplete target-language coverage; mark incompleteness honestly. Missing/invalid metadata must not block a save or weekly advance.
- Preserve dirty changes that existed before each batch. Capture a per-batch file manifest and constrain edits to the declared files. Do not roll back other work, broadly stage files, or auto-commit/publish this checkout.
- Use one subsystem and bounded translation group per batch. Full language completion can have multiple batches with counts reported after each.
- Read-only diagnosis success is not localization readiness. Broken-current-behavior assertions in `audit-localization-runtime.tsx` must be replaced as their associated bugs are fixed; do not retain assertions that require English defects forever.

## Architecture choice

Use the existing local dictionary approach, adding pure rendering helpers for generated content. English retains the current rendering path while localized templates use explicit semantic inputs. This avoids network translation, added latency and unnecessary runtime dependencies.

Do not mechanically translate final generated English sentences: that loses stable variant identities, semantic classifications and contextual grammar. Do not restructure streaming/gameplay state to solve UI copy. Translate phrase banks and frames together, with per-language grammatical review and complete-sentence examples.

For newly generated stored content, add optional versioned metadata containing a template or reaction descriptor, a stable variant identity and raw interpolation variables. Keep the existing rendered English/original fields for old consumers and safe fallback. Render the descriptor in the selected UI language. Old saves without descriptors retain original prose unless a stable producer-specific descriptor can be recovered without inventing data. Custom player text has no descriptor and remains untouched.

Metadata contract for ordinary keyed prose:

```ts
type LocalizedTextRef = {
  version: 1;
  key: string;
  vars?: Record<string, string | number>;
  variantIndex?: number;
};
// resolveLocalizedText(language, reference, fallback) is pure and never rerolls.
// Unknown versions/keys and malformed variables return the original fallback.
```

Composed release reactions need their own versioned descriptor: stable seed, focus, variant number, semantic classifications and authored title/player/studio names. Do not persist the whole Player or rerun career classification at display time. Rendering a stored descriptor must use the facts at publication, not the player's later career.

## Phase sequence and exit gates

| Phase | Deliverable | Exit evidence |
|---|---|---|
| 1 | English baseline and safety checks | Frozen dictionary/generator outputs; checks demonstrably reject changed text; no production file changes |
| 2 | Portuguese pilot: missing keys and clear meaning errors | Missing Portuguese keys reduced from 87 to 0; selected terminology corrected; placeholders and English baseline pass |
| 3 | Combinable release engine localized in Portuguese | All 14 prose banks, frames and special branches covered; stable choices/IDs; localized news/X/Instagram/reviews; English baseline passes |
| 4 | Stored generated content responds safely to UI language | New descriptors render without gameplay changes; malformed/old saves/custom text retain safe original behavior; save/compaction checks pass |
| 5 | Active Social page localized in Portuguese | Active shell, groups, statuses, actions, notes, sheets and confirmations translated; interaction IDs/results unchanged |
| 6 | Remaining generated surfaces localized in Portuguese | Audience reactions, industry media, music/YouTube, notifications and generated logs covered by producer-specific inventories and examples |
| 7 | Active ordinary and streaming UI localized in Portuguese | Reachable screens/modals/actions translated; monetary meanings preserved; streaming subsystem checks pass |
| 8 | Extend proven coverage and quality to French, Spanish, Turkish and German | Per-language batches: no required missing keys; English sentence copies triaged; glossary/grammar checks and rendered flows pass |
| 9 | Integrated verification and release handoff | Browser/device layouts, switch/reload, old/long saves, performance, full scenario evidence and honest remaining language-review gaps |

### Phase 1 — English and gameplay protection

Create immutable English baseline data for all current English keys and reaction outputs. Cover a 10,000-classification matrix, alternate seeds/variants and additional no-role, genre, universe, franchise, story-fit/cast-summary and career branches. Include opening/critic/X/Instagram producer output, stable IDs, critic reviews and bank structure. Ignore only explicitly volatile timestamps in diagnostic comparisons; do not ignore engagement counts, text, IDs, money or gameplay fields.

Compare the player fixture before/after rendering and generating text to detect mutation. The baseline check must be read-only by default, and a capture command must refuse to overwrite an existing baseline. Verify the guard against synthetic changes to existing English keys, missing keys, changed reaction output and bank order/count. Permit additive English keys so unrelated unfinished features can add copy without requiring a baseline refresh.

Keep production/UI/locale files untouched in this phase. Existing subsystem audits establish the starting status; report pre-existing failures instead of fixing them inside localization setup.

### Phase 2 — Portuguese dictionary pilot

Files: `services/localization/locales/pt-BR.ts`; locale contract tests; audit reports. Preserve `en.ts` exactly. Translate the 87 missing keys grouped as health Guide (22), baby surname (3), X shell (2), X industry banks (12), universe/cast news (26), business capacity (11), health (3), talent negotiation (8). Correct supporting-role terminology, lens terminology, bidding-war context and ad-progress preservation wording.

For each group: reproduce missing lookup/meaning defect; add translations; verify exact placeholder names and alternative counts; render representative names, quantities and amounts; run the English guard. Review the 72 longer Portuguese English-copy candidates, including Guide sentences, preserving legitimate names/brands. Dictionary completeness is only this phase's exit criterion; active pages bypassing it remain scheduled work.

### Phase 3 — Release reactions and billions of combinations

Files: `services/reactionTemplateEngine.ts`, `services/releaseMediaNarrative.ts`, `services/newsLogic.ts`, dedicated `services/localization/reactionTemplates/` modules and consumer audits. Keep numerical context builders, deterministic hash/pick lanes and commercial thresholds unchanged.

Add a language-aware pure renderer. Its English/default-language branch runs the existing English path. Map the exact existing bank keys/indexes to Portuguese phrases; preserve each bank's item count and order. Cover commercial/budget/critical/performance/cast/career/genre/world/social opener banks, five frame banks, story-fit sentences, low-budget acclaim, tentpole financial risk and all overrides. Translate raw role labels for display without changing their classification values.

Compare English against Phase 1 snapshots. In Portuguese, check every bank/branch with natural complete sentences, all placeholders, same variant identities, same IDs/authors/hashtags and no player mutation. The theoretical eight-billion estimate remains stable; report tested contexts without claiming every theoretical output was executed. Do not translate optional stored story/cast summaries blindly; give those producers explicit localization references in Phase 4/6.

### Phase 4 — Stored prose and language switching

Files: a pure `services/localization/resolveLocalizedText.ts`, additive interfaces in `types.ts`, targeted producers/renderers in News/X/Instagram/IMDb, and focused save metadata preservation tests. Read `services/saveMigration.ts`, `saveCompaction.ts`, `savePreparation.ts` and `saveTransfer.ts` before editing their boundaries.

Implement the versioned contracts above. New generated entries retain published semantic inputs and chosen variant; UI renders selected-language prose without changing the original event. News source/topic categorization uses semantic metadata or the unchanged canonical English text, not translated text. Persist/compact/import/export descriptors without growing histories or changing save schedules.

Check English default and explicit-English rendering; switch Portuguese → French → English; old missing descriptors; unknown versions; unknown keys; malformed vars; imported saves; player-authored posts; characters with accents; repeated render equality; and unchanged IDs/outcomes. No bulk rewrite of old saved prose. Recovery is permitted only where producer IDs and retained facts identify the exact published variant.

### Phase 5 — Active Social page

Files: `services/socialUiAdapter.ts`, `components/ui-overhaul/SocialScreen.tsx`, `views/SocialPage.tsx`, Portuguese locale keys. Add language-aware labels through adapter/screen props; use default English to preserve current callers. Reuse suitable `connections.*` keys, add keys for genuinely missing active-screen copy, and remove hardcoded prose only in the active path.

Verify friend/family/romantic/network/pet/deceased relationships, gifts, insufficient money/energy, divorce, custody, child continuation and legacy sheets. Same action IDs/arguments, costs and disabled decisions across languages. English wording and layout remain unchanged for the same inputs. Confirm labels visually at narrow widths.

### Phase 6 — Generated world and media coverage

Files: `services/audienceReception.ts`, `services/industryWorld/industryMediaVoice.ts` and associated discussion/narrative/YouTube modules, `services/youtubeLogic.ts`, relevant `gameLoop.ts` producer calls, locale banks and rendering consumers.

Translate producer-owned templates using semantic data; carry versioned references where text is persisted. Audience scores/trends/thresholds remain unchanged. Media factual validation continues to use canonical content; translated words must not drive numeric/fact detection. Music titles/artist names remain authored names. Cover quotes, summaries, news commentary, X replies, Instagram comments, YouTube titles/scripts/comments, event logs and notifications.

Run focused audience/media/music tests and English baseline checks. Build a producer checklist with every bank and special branch marked covered or explicitly deferred with its reason. Test low/high scores, rising/falling/stable trends, supporter/antagonist/critic voices, uncertainty, rights/company/project outcomes, custom titles and no-data fallback.

### Phase 7 — Active UI, including streaming

Files: reachable `components/Streaming*.tsx`, `components/streaming-transplant/*`, `content-market-exact/*`, business/production/release pages and remaining phone apps identified in the candidate inventory. Edit presentation only; avoid changing streaming services, pricing or rights transaction math.

Start with screen reachability and visible text; do not count inactive UI/dev fixtures as completed gameplay translation. Separate market/catalogue/launch/infrastructure/operations screens into their own batches. Resolve money wording through a glossary: upfront bids, reserved exposure, paid rights, earned revenue, projections and unreleased performance must remain distinct. Never turn unknown/unreleased metrics into displayed measured zero values while editing copy.

Verify English and Portuguese screen renders, long names, narrow layouts, accessible labels, currencies/percentages and interpolation. Run market rights/pricing/catalogue audits appropriate to touched screens plus subtitle/dubbing gameplay audits to catch accidental system coupling. Screenshot visible flows; retain working checkout/server identity when handing off local testing.

### Phase 8 — Remaining four languages

Order: French, Spanish, Turkish, German. Each language repeats the established Portuguese producer/UI checklist and is a separate set of batches. Translate English copies by domain, complete new keys, then review glossary, gender/plural agreement, Turkish suffixes, accents/umlauts, idioms, tone and film-industry terms in rendered context.

Use all bank indexes and branch samples, not only menus. Require explicit handling for every sentence-copy candidate; brands/names/units can remain shared. Changed dictionary values are not an accuracy score. Native-language review remains a separate evidence category and must not be claimed without that review.

### Phase 9 — Integration and handoff

Run English guard, complete dictionary/bank contracts, focused subsystem tests and production build. Test selected-language persistence through reload/import, ongoing weeks, new/old generated posts, language changes and large/long saves. Measure rendering/save payload changes where descriptors were added. Use actual browser/mobile-width screens and native devices where available.

The handoff records per-language coverage, quality samples, remaining intentional fallback areas, English output evidence, financial/UI behavior checks, performance changes and untested device/native-speaker gaps. No claim of zero risk or complete translation without corresponding evidence. Deployment/store upload is a separate action.

## Checkpoint and rollback policy

Each batch records its touched files and changed keys, test commands/results and before/after counts. If the English guard or gameplay evidence regresses, correct the current batch or restore only its own hunks from the batch snapshot. Never use `git reset`, a whole-file checkout over dirty work, or baseline regeneration to make a failure disappear.

Phase 1 is the first implementation checkpoint in this request. Later phases start from their documented evidence and current working tree; do not silently expand a completed phase into other subsystems.
