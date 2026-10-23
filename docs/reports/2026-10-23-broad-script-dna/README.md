# Broader Script DNA expansion — 23 October 2026

118 authored answers have been appended to the existing Script DNA questions across all 17 existing genres. Together with the previous 68-answer expansion, the game now has 186 added answers. No new screen, question, wizard step, primary genre, save field, or migration was introduced.

The new answers support criminal transformation, dealership crime and comedy, specialist thieves and heists, getaway crews, racing and driver–engineer partnerships, time travel and loops, superhero alliances, protective AI, memory mysteries, unreliable investigators, institutional thrillers, shared-dream heists, journalism, family businesses, courtroom stories, psychological horror, animation, fantasy, musicals, biopics and documentary investigation. These are original reusable concepts; no named franchise or character was added to the game.

See [all 118 added answers](ADDED-ANSWERS.md) for the exact labels and existing questions where they appear.

## Implementation and compatibility

- `src/data/scriptStoryVariations.ts` supplies the new content and explicit DNA/Story Compass metadata.
- `src/data/scriptTemplates.ts` appends the content after all old choices. Existing answer IDs, order and metadata are untouched.
- Existing scoring, premise generation, character guidance, writer development, Greenlight and production services consume the same answer pairs as before. Each new answer trades five stat points between strengths; it does not add a flat quality or earnings bonus.
- The existing 180-character generated pitch limit remains. All chosen angles and saved answer pairs are retained even when the short pitch ends with an ellipsis. Players can still edit their premise.
- Existing CANON identity remains protected. No economy, save migration, stock, acquisition, ownership or UI source was changed for this expansion.
- Existing unrelated report edits, deleted temporary configuration and concurrent build-configuration work were preserved. No real player save was opened or rewritten. This expansion has not been committed or pushed in this task.

## Verification

| Check | Result |
| --- | --- |
| Frozen pre-broad compatibility fixture | 1,302 existing profiles match; every existing question and answer retains its metadata and order, including the previous 68 additions |
| Original pre-expansion compatibility fixture | 894 profiles match; original fixture was not recaptured |
| New answer validation | All 118 IDs are unique within their questions; questions already exist; stat deltas balance; required metadata exists |
| Story combinations | 26 representative combinations cover all 17 genres; selected premise terms, Story Compass and bounded stats pass across Live Action, Animated and Anime |
| Actual production matrix | 26 authored combinations plus one browser-created concept pass writer development, real Greenlight and funding, PRE_PRODUCTION → PRODUCTION → POST_PRODUCTION → AWAITING_RELEASE through `processGameWeek` |
| Production duration | Real calendars finish in 32 weekly-engine advances; no production phase was manually completed or shortened |
| Save/reload | Real persistence preparation, generation promotion/load and migration run at phase boundaries and throughout production; followed by three more game weeks with reloads |
| Save invariants | Selected IDs, premise and compass persist; legacy script fields, quality and costs remain; personal cash, corporate cash, nonempty stock holding and studio ownership match across each save/reload |
| Delivery gate | Streaming readiness remains false throughout production and becomes true only after actual delivery |
| Browser | Existing wizard at 390 × 844; seven-answer Action/Sci-Fi concept created and saved, reloaded into rewrite, answers restored; document width remains 390px |
| Existing integration regressions | Custom premise, character identity, canon story, sequel flow, Greenlight builder/contracts and prior pirate variation flow pass |
| Cinema integration | 32 groups pass, including real weekly settlement, reload, failed promotion/retry and duplicate-payment protection |
| Review | Independent read-only review found no actionable issues in the scoped content, integration or tests |

The production matrix uses an isolated funded studio slate, a real castable NPC, an in-house director and one-week writer fixtures. Production calendars are the actual Greenlight outputs. This is automated service/weekly-engine coverage plus a real wizard browser walkthrough; it is not a full manual career or native-device playthrough.

## Build and type checking

The production build passed. The focused TypeScript check covering the changed data, both new audits, fixtures, existing wizard and their imported dependencies passed with exit 0. `git diff --check` passed.

An initial full `npm run lint` passed. A later full run encountered TS2769 in concurrently edited `vite.config.ts`: the new icon-build plugin inferred `enforce` as `string` instead of `"pre" | "post"`. That unrelated source was left untouched. See [the full-check output](evidence/typecheck.txt); do not interpret the focused pass as a clean full-workspace lint result.

## Reproduce

```sh
npm run audit:script-broad-expansion
npm run audit:script-variations
SCRIPT_BROAD_UI_RESULT=output/playwright/script-broad-expansion/browser-script.json npm run audit:script-broad-flow
npm run audit:script-variation-flow
node scripts/run-box-office-audit.mjs integration
npm run lint
npm run build
```

The browser harness is `output/playwright/script-broad-expansion/index.html`; its local storage key is `ae-script-broad-qa-only`. It renders the actual production wizard and stores only the isolated QA concept.

Evidence: [production and reload log](evidence/production-flow.txt), [content compatibility](evidence/content-compatibility.txt), [original compatibility](evidence/original-compatibility.txt), [cinema integration](evidence/cinema-integration.txt), [build](evidence/build.txt), [browser verification](../../../output/playwright/script-broad-expansion/browser-verification.txt), [phone screenshot](../../../output/playwright/script-broad-expansion/review-mobile.png).
