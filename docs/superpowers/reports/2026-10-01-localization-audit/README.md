# Existing language coverage and quality audit — 1 October 2026

The reports from players are supported by current code and runtime evidence. The main problems are untranslated English copies inside locale files, missing keys that silently fall back to English, newer UI/generator paths that bypass localization, and saved prose that cannot respond to a language change. There are also concrete terminology and clarity problems in translated strings.

This audit adds diagnostic scripts and evidence only. No gameplay, locale, settings, or production UI files were edited. The checkout already contained extensive unrelated changes, including English locale changes; these results describe the current working tree, not a clean release tag or the installed store build.

## Language file coverage

All dictionaries were parsed with the TypeScript AST, using actual string values rather than a line regex. English contains **8,173 unique keys**. Each other dictionary contains **8,086 keys**, with the same **87 missing keys**. No duplicate dictionary keys were detected.

| Language | Missing | Exact English copies | English copies with at least 4 words | Values different from English |
|---|---:|---:|---:|---:|
| Portuguese, Brazil | 87 | 429 | 72 | 7,657 |
| French | 87 | 4,731 | 2,330 | 3,355 |
| Spanish | 87 | 7,231 | 3,301 | 855 |
| Turkish | 87 | 7,518 | 3,411 | 568 |
| German | 87 | 7,528 | 3,411 | 558 |

Exact equality includes legitimate shared brands, names, abbreviations and units. These are inventory counts, not a translation accuracy score or the percentage of the game translated. A changed value can still be incorrect, and a translated dictionary entry may be bypassed by the active UI. Longer sentence copies establish that the problem extends well beyond shared names.

Portuguese has the strongest dictionary coverage. French has significant translated interface content but many English service banks. Spanish, Turkish and German have much narrower translated coverage. This does not establish that every Portuguese or French translation is good.

Examples of complete untranslated dictionary groups:

- `services.lifestyle`: **988/988 entries identical to English** in French, Spanish, Turkish and German.
- `services.instagram`: **205/205 entries identical to English** in those same four languages, including captions/comments.
- `production`: **342/342 English copies** in Spanish, Turkish and German.
- `x`: **133 English copies, 2 missing, 0 changed** in Turkish and German.
- Portuguese Guide: **109 English copies and 22 missing out of 316**, including 71 sentence copies.

Full domain counts: [domain-coverage.csv](domain-coverage.csv). Exact keys, line numbers, dictionary issues and template inventories: [coverage.json](coverage.json).

## Confirmed causes and priorities

### P1 — Release reaction composition ignores the selected language

`services/reactionTemplateEngine.ts` has 14 English text banks, plus the author bank. Commercial, budget, critical, performance, cast, career, genre, world, social opener and headline-frame banks all contain English prose. `composeReleaseReaction` has no language parameter or localization lookup. Additional special-case sentences are also English. Raw genre/role labels and optional cast/story summaries enter the same composition path.

The engine's `getReactionCombinationEstimate()` returns **8,000,000,000**. This is a product of bank sizes, not evidence of eight billion distinct reachable sentences. For localization the work unit is each base bank, frame, interpolation and conditional sentence, together with grammatical compatibility at composition boundaries.

Actual callers:

- `services/releaseMediaNarrative.ts:20`: opening news.
- `services/releaseMediaNarrative.ts:29`: critic news.
- `services/releaseMediaNarrative.ts:71`: X content and replies.
- `services/releaseMediaNarrative.ts:114`: Instagram captions and comments.
- `services/reactionTemplateEngine.ts:638`: role-aware critic review prose.
- `services/newsLogic.ts:67`: opening news prefers the contextual narrative. The helper always returns an object, so the translated hit/flop/opening alternatives are bypassed on this path.
- `services/newsLogic.ts:109`: critic narrative similarly overrides translated alternatives.
- `services/gameLoop.ts:6875` and `:6888`: release social reactions enter the weekly feeds.

Runtime result: identical opening news, critic news, X content/replies and Instagram captions/comments for English, Portuguese, French, Spanish, Turkish and German. The News component uses selected-language navigation while rendering the English headline/body verbatim.

### P1 — The active Social page bypasses the translated legacy page

`views/SocialPage.tsx:1240` renders `SocialScreen` using `buildSocialUiModel(player)` from `services/socialUiAdapter.ts`. The adapter constructs English groups, statuses, blurbs, interaction names and notes. `components/ui-overhaul/SocialScreen.tsx` also has literal English shell copy and receives no selected language.

The older localized Social implementation in the same file does not make the exported active page localized. Runtime rendering confirmed English group labels for all six selections. This is a concrete example of why counting locale keys alone overstates player-visible coverage.

### P1 — Missing keys create silent English fallback

`services/i18n.ts:107` uses selected-language value, then English, then the key itself. Missing translations do not produce a visible audit signal at runtime.

The shared 87-key gap consists of:

| Area | Missing keys per translated language |
|---|---:|
| Health Guide | 22 |
| Baby surname UI | 3 |
| X industry tab labels | 2 |
| X industry generated content | 12 |
| Universe background and cast news | 26 |
| Business staffing/capacity copy | 11 |
| Health condition/care-team copy | 3 |
| Talent negotiation/rejection copy | 8 |

The audit reproduced `services.x.industry.boxOfficeRun` returning its English sentence in every translated language. These are current-working-tree gaps; some may be recent additions that are not yet in the released build.

### P2 — Saved generated prose stays in its original language

`views/SettingsPage.tsx:227` updates `settings.language`. News UI renders stored `item.headline`/`item.subtext`; it does not store or resolve a template key, variant identity and interpolation variables at display time. Release X/Instagram content is also built as final strings.

Runtime reproduction: a saved Portuguese headline remains Portuguese after switching the player's setting to French, while the news navigation switches to French. Existing English news likewise remains English. The check changes the setting and renders the component; it does not exercise disk reload or the save migration pipeline.

A future fix needs a decision about old generated content and preservation of user-authored captions. Treat template identity, stable variant choice and raw semantic variables separately from rendered prose; switching language must not reroll outcomes or rewrite custom text.

### P2 — Other generated surfaces have English prose outside dictionaries

- `services/audienceReception.ts:8`: genre quote banks, labels and summary sentences are English; `buildAudienceReception` takes no UI language. The weekly loop calls it for opening, theatrical and streaming reception. This is confirmed from source, not a full visual audit of every receiving panel.
- `services/youtubeLogic.ts:591`: music-video comments contain literal English sentences such as “The music scene is watching this rollout.”
- `services/industryWorld/industryMediaVoice.ts:53`: opinion/analysis wrappers use literal English, with no selected UI language input. Institutional `languageIds` describe world entities and do not themselves localize UI prose.
- Other industry media modules produce and forward rendered event/story sentences. Their localization boundary needs to cover headlines, commentary, replies, YouTube titles/scripts and notifications together.
- News/X categorization uses English keywords in rendered text (`services/xLogic.ts:91`; `views/mobile/NewsApp.tsx:35,52`). Localizing text without changing that classification approach can break source attribution, project filtering or topic tags. Much of the newer News card UI is currently inactive (`USE_LEGACY_NEWS_UI = true`); do not describe all of those tag issues as currently visible.

## Translation quality findings

The following are contextual linguistic review findings from actual source/target pairs. Suggested wording is illustrative and has not been applied or signed off by a native-language reviewer. Some are meaning defects; others are clarity, tone or orthographic issues. Do not equate every loanword with a translation bug.

| Language and key | Existing wording | Finding and suggested direction |
|---|---|---|
| Portuguese `developmentLab.franchise.role.supporting` | `Suporte` | In an acting-role selector this reads like support/help, rather than a supporting actor. Use `Coadjuvante`; the matching `roleType.supporting` needs the same terminology. |
| Portuguese `production.crisis.equipmentFailure.backup.log` | `O vidro reserva não é tão nítido...` | English camera slang “backup glass” was translated as glass. Here it means a backup lens; use `A lente reserva...`. This is a clear context loss. |
| Portuguese `forbes.studioProfile.status.rivalBid.action` | `Entrar na Guerra` | Drops the bidding context from “Enter Bidding War”. An acquisition action should explicitly say competing bids, such as `Entrar na disputa de ofertas`. |
| Portuguese `services.x.reply`, final variant | `Isso vai envelhecer de um jeito interessante.` | Literal rendering of the idiom about how a post will hold up later. Prefer a natural reaction about time showing whether the comment holds up. French and Spanish variants have the same literal pattern. |
| French `production.event.animeFandom.polish.log` | `La passe de polish transforme les sceptiques en soutiens bruyants.` | Mixed English editing jargon and literal “loud supporters” make the outcome awkward. Describe the revision turning skeptics into enthusiastic supporters. |
| French `guide.handbook.greenlight.p1` | `Le greenlight ... casting ... package final` | Several untranslated technical terms in an explanatory Guide paragraph. Choose a consistent accessible glossary and explain production approval rather than relying on English jargon. Product names may stay unchanged. |
| French `dating.tinder.modal.hookupLocked.title` | `Plan intime validé` | Source is “Hookup Happened”; target sounds like a plan was approved. Check the actual event state and use completed-encounter wording. |
| Spanish `services.x.reply` | `La timeline... Alguien de PR...` | English feed terminology and an unexplained PR abbreviation reduce accessibility. Use consistent local feed/public-relations terms where brands are not involved. |
| All five `app.ads.save.failedSubtext` | Targets describe ads as completed | Source explicitly assures that completed ads are secured. Targets weaken or omit preservation of earned progress. Restore that reassurance; this is a semantic omission, not a claim that the underlying ad state is broken. |
| Turkish `services.regulatorPressure.inbox.cleared.text` | `Sirket ... tamamlandi ... satin alma` | Missing Turkish orthography in an otherwise translated line: `Şirket`, `tamamlandı`, `satın alma`. Needs language polish. |
| German `services.regulatorPressure.inbox.cleared.text` | `Prufung ... Forbes-Ubernahmeangebote ... verfugbar` | Missing umlauts: `Prüfung`, `Übernahmeangebote`, `verfügbar`. |
| German `dating.tinder.modal.hookupLocked.title` | `Intimität passiert` | Awkward literal headline. Use a natural completed-encounter label consistent with the modal's event. |

The audit stores 13 selected source/target pairs for each of the five languages in `coverage.json` (65 comparison records). These samples establish quality problems; they do not certify or comprehensively score all 40,430 non-English entries. Gender agreement, plural forms, Turkish name suffixes, register and complete sentence composition still need wider language review.

## Template coverage verification

All **38 English ` || ` variant banks**, containing **145 alternatives**, were compared in every translated dictionary. Whole-entry and corresponding-variant placeholders match, and variant counts match. No placeholder mismatch was detected in the existing dictionaries. This verifies structural contracts only.

| Language | Alternatives identical to English / 145 |
|---|---:|
| Portuguese | 0 |
| French | 120 |
| Spanish | 130 |
| Turkish | 145 |
| German | 145 |

These 38 banks are only delimiter-based dictionaries. They exclude numbered Instagram/comment banks, hardcoded array banks, industry media generators and the release reaction engine. Those must not be counted as covered merely because delimiter checks pass.

The runtime audit executed **10,000 synthetic release-reaction contexts** across commercial, critical, performance, cast and budget classifications and five focuses. No unresolved engine placeholders appeared in that matrix. Genre, role, world/career inputs and optional story summaries were fixed; it does not enumerate eight billion outputs or validate all grammatical combinations.

The AST UI scan found **6,573 JSX text candidates**, and **10,574 total candidates** including string attributes and text fields. They include dev fixtures, names, fallbacks, inactive UI and internal data; these are a triage inventory, not 10,574 confirmed localization defects. No unknown literal `t`/`tr` key was found by the scan. Dynamic keys and runtime parameter completeness are outside that guarantee.

The repository's existing `audit:i18n` fails. Its 87-key gaps agree with the independent AST audit. It also reports numerous marker/reference failures and 1,728 hardcoded candidates. Some marker failures can reflect refactoring rather than broken behavior; use the saved output as investigation leads, not a blanket bug list.

## Recommended implementation sequence

1. Cover the active Social page and shared release reaction engine; localize frames, phrases, semantic labels and every special branch together.
2. Decide display-time localization for generated content and an honest policy for historic saved prose. Preserve template/variant identities and custom player text.
3. Fill the 87 shared missing keys, then complete untranslated domains. Portuguese is the best initial end-to-end pilot; use it to verify the architecture before scaling to the other four languages.
4. Establish a glossary for actor roles, production approval, lens/equipment terms, revenue, bid, reserves, equity, royalties and financing. Review translated sentences in game context rather than word-by-word.
5. Cover audience reception, industry media and music/YouTube paths, then triage the remaining UI candidates by actual reachability.
6. Gate future changes on missing/English sentence copy checks, generated bank contracts and selected-language runtime flow checks. A dictionary entry existing must not be treated as proof of translation quality.
7. Perform browser/device layout, language-switch/reload and native-speaker review before claiming release readiness.

## Reproduction and limits

Run from the repository root:

```sh
node scripts/audit-i18n.mjs > /tmp/actor-i18n-existing-audit.txt 2>&1
node scripts/audit-localization-coverage-quality.mjs
node_modules/.bin/esbuild scripts/audit-localization-runtime.tsx --bundle --platform=node --format=cjs --loader:.csv=text --loader:.css=empty --outfile=/tmp/actor-localization-runtime.cjs
node /tmp/actor-localization-runtime.cjs
```

The diagnostic runtime assertions intentionally reproduce current defects; success means reproduction completed, not that localization is fixed. Evidence is in [runtime-evidence.json](runtime-evidence.json), six News and six Social rendered HTML files, and [existing-audit.txt](existing-audit.txt).

This audit completed dictionary-wide structural/coverage analysis and scoped runtime reproductions. It did not run a full browser walkthrough, mobile layout check, store-build verification, all-gameplay branch traversal, disk save/reload migration check or native-speaker review. No streaming bug-hunting processes or other chats were stopped by this audit.
