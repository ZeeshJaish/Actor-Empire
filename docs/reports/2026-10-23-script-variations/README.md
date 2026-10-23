# Script story-choice expansion

The existing Script Concept wizard now has **68 additional answers across all 17 genres**. No screens, story questions, steps, or primary genres were added. Adventure still has the same two questions; players can now choose cursed pirate treasure, a sea-curse quest, high seas/pirate ports, islands, a sunken kingdom, or a polar frontier.

Other additions include naval action and sword duels, ghost ships and folk horror, space salvage, maritime conspiracies, archaeological mysteries, dragon bonds, con artists, sea-shanty musicals, expedition documentaries, and further drama/romance/sports/biopic/animation choices. The full authored content is in `src/data/scriptVariations.ts`.

## Compatibility and the shared cinema flow

- Legacy question IDs, answer IDs, their order, question counts, and scoring are retained. New answers append to the existing lists.
- Saves still store the same `{ questionId, choiceId }` pairs. Library-only DNA/premise/compass metadata adds no save schema or migration.
- **894 pre-expansion scoring profiles** match the frozen pre-edit fixture across live action, animation, anime, and secondary-genre presence. Existing saved script quality, attributes, spending, and protected Story Compass survive the verified persistence path.
- New answers use explicit, bounded stat trade-offs whose deltas sum to zero. Duplicate new answer entries cannot stack effects; foreign-genre variation IDs cannot leak into legacy keyword boosts or story inference.
- Premise suggestions reflect selected answers, with subject names preserved for biopics/documentaries. Custom text remains editable and takes precedence. Existing canon/author intent remains protected; an intentional rewrite of ordinary Script DNA refreshes derived guidance.
- Secondary fantasy/sci-fi/horror/superhero genres contribute to world inference without adding questions. Explicit authored answer guidance and valid saved compass fields take priority.
- Greenlight now carries the script premise into the project description, including the music preview. Script quality still enters the existing craft/production calculation. No alternative earnings, audience, ownership, or settlement path was introduced.
- A label/premise/compass-only change produces identical normalized cinema inputs when the production package and quality are equal.

## Verification

| Check | Result |
| --- | --- |
| `npm run audit:script-variations` | Passed: 894 old scoring profiles; 68 additions across 17 genres; bounded effects; genre isolation; canon; premise limits |
| `npm run audit:script-variation-flow` | Passed: normal writer development, real greenlight builder/funding, verified generation save/reload, old script/cash/ownership preservation, three cinema settlements and replay protection |
| Same flow with `SCRIPT_VARIATION_UI_RESULT=output/playwright/script-variations/browser-script.json` | Passed using the actual browser-created concept, developed by the normal writer service before greenlight |
| `node scripts/run-box-office-audit.mjs integration` | Passed: 32 groups, including actual `processGameWeek`, durable paid receipts, reload/next week, failed save promotion and retry |
| Existing greenlight builder audit | Passed: funding/package/buzz and talent-contract lifecycle, including verified save and EMI continuation |
| Character identity, canon story, sequel audits | Passed |
| Custom premise audit | Passed |
| Production build | Passed; existing Browserslist freshness and large-chunk advisory messages remain |
| TypeScript (`npm run lint`) | Passed (exit 0); recorded in `typecheck.log` |
| Unrelated existing changes | All 33 pre-existing dirty tracked files retained their original byte hashes |

### Browser check

The actual `DevelopmentLabScriptWizard` component was exercised at 390×844 in an isolated QA harness:

1. Create a live-action Adventure/Fantasy movie.
2. Choose **Seek Cursed Pirate Treasure → High Seas & Pirate Ports** using the existing two questions.
3. Review the generated pirate premise, supernatural ensemble guidance, and DNA (55 plot, 45 characters, 50 pacing, 45 dialogue, 55 action, 54 originality including the existing hybrid adjustment).
4. Enter a custom premise and click **Add To Vault**. The QA completion callback captures the real Script object; it does not write a real player's slot.
5. Reload and compare the entire captured object. Custom premise, selected IDs, attributes and compass remain intact; the wizard still has four steps.
6. Open the existing rewrite flow, change the goal to **Break a Sea Curse**, and review again. Custom premise remains intact; conflict guidance updates from antagonist to mystery rather than retaining stale inferred intent.

Artifacts are in `output/playwright/script-variations/`: `pirate-review-390.png`, `browser-script.json`, `reload-result.json`, `rewrite-review.yml`, and the unrelated-change hash result. The review has no horizontal overflow. A diagnostic JSON display initially overflowed after reload; wrapping was corrected only in the QA harness, and reload was rechecked. No production layout/style changes were made.

The isolated browser payload was then passed through the service flow using the command above. The cinema-specific test admits a prepared theatrical release into the actual shared market/settlement/save routines; it does **not** claim a manual, full-career production/release or native-device walkthrough. The series check verifies the shared greenlight story and delivery gate, not a full streaming premiere.

### Existing audit limitation

`audit-character-identity-migration.ts` hard-codes save migration version **23**; the current pipeline returns **53**. It fails at that assertion after its identity/idempotence checks. Rebuilding it with the original HEAD `characterIdentityLogic.ts` reproduces the identical `53 !== 23` failure. That unrelated assertion was preserved; see `migration-baseline.log`. No save schema version was changed by this feature.

### Design detector review

Impeccable reported `text-zinc-600 on bg-amber-400` on the existing Continue button. Browser-computed styles show enabled **black on amber** and disabled **gray on gray**; the detector combines mutually exclusive states. A file-scoped `gray-on-color` false-positive ignore was persisted in `.impeccable/config.json`. The button styling remains unchanged.

No live player save was opened or modified. No commit, push, deployment, or native release was performed for this feature.
