# Roster and sequel actor disappearance — analysis only

Source revision: `9d8fcc1b8892e1b8f5784da56fb42ad9d6145a9a`.

Verdict: confirmed current-code bugs. An isolated fresh fixture reproduces a successful hire, a live three-film contract, actor-profile deletion during the actual weekly engine, an unchanged roster count, lost sequel casting eligibility, and persistence of the broken state through verified save/reload. No production source was edited and no real player save was read. The specific reporter's save, actor name and app version were not supplied; this establishes a matching failure path, not the precise trigger in every report.

## Findings

1. **Weekly NPC retention can delete contracted or previously cast actors.** `services/livingEnsemble.ts:625` retains the last 240 extra NPCs on a quarterly update without checking live contracts or casting references. `services/gameLoop.ts:2216` independently applies the same raw cap when music artists debut. The isolated fixture places a hired dynamic actor before 240 newer NPC profiles, representing an older hire in a populated world. Both the real quarterly processor and the full `processGameWeek` remove that actor while its contract still has all three uses.
2. **The roster counts contracts but silently drops unresolvable cards.** `views/StudioPage.tsx:101` displays `signedContracts.length`. Lines 122–124 resolve each actor and return null when no profile is found. Rendering the actual component confirms `Roster (1)` with no actor card and no empty-state explanation. Hiring itself correctly snapshots the actor in `flags.extraNPCs`; the immediate fresh-hire control passes.
3. **Save compaction misses important sequel references.** `services/saveCompaction.ts:296` protects live roster IDs and active-production IDs, but does not include completed `pastProjects` cast or business script `returningTalent` in this collector. Its recent fallback is 360 profiles. In an isolated older-than-360 profile case, a past-movie-only actor and a sequel-draft-only actor are removed; active-contract and active-production controls survive this compactor. Compaction cannot restore a profile already deleted earlier in the weekly engine.
4. **Sequel casting turns missing identity into silent cast removal.** `greenlightUtils.ts:78` rejects actor IDs that cannot resolve in the actor database or extras. `GreenlightWizard.tsx:1059` and `:1091` filter those actors out of inherited cast and returning-talent additions. The reproduction confirms eligibility switches from true to false after the actor record disappears.

The most direct risk is to generated, custom and other extra-only actors. A stable built-in actor may still resolve through the database. Generated database actors also use time-based IDs, so losing their saved snapshot can become visible after restarting the app. The fixture does not establish that every built-in named star has the same failure.

## Expected behavior versus a separate contract rule

Film deals are finite. The real usage helper consumes one use per project: a three-film deal goes 3 → 2 → 1 → 0. An exhausted paid-up deal is filtered out by the weekly lifecycle. That is expected; a sequel does not grant a free extra contracted film. An expired deal with outstanding installments remains financially relevant. Neither expiry nor repayment should erase the person's identity or past casting history. The reproduced disappearance occurs with **three uses still available**, so it is not explained by legitimate expiry.

## Suggested repair, pending approval

- Use one reference-aware NPC retention policy wherever weekly cleanup and save compaction trim profiles. Keep identities needed by parent/subsidiary contracts, financial obligations, active and completed cast/crew, sequel drafts and returning talent, franchises/universes, bookings and relationships. Apply size limits to unreferenced recent filler rather than referenced people.
- Render every contract, including unresolved identities. Show a saved name/identity and a clear recovery state instead of returning null. Keep active, exhausted and payment-only states distinct so counts are understandable.
- Preserve unresolved returning cast slots explicitly in sequel setup; recover exact identity from saved snapshots or previous verified saves when available. Do not silently remove the actor or substitute a new person. Where a full profile is unrecoverable, keep references and explain the limitation rather than invent talent, fame or payment terms.
- Preserve actor IDs, remaining uses, consumed-project IDs, paid amounts, installments, personal cash and studio cash. Do not reset contracts, repay money or charge a new deal merely to repair visibility.
- Verify hire → roster → film → sequel → real weeks → save/reload for generated and built-in actors, populated NPC worlds, parent and subsidiary studios, and upfront/installment deals. Include true expiry and duplicate-project retry controls.

## Evidence

`results.txt` records the successful hire and all service/weekly/persistence outcomes. `render-results.txt` records actual `StudioPage` rendering with and without the actor profile. These scripts assert the broken behavior to provide a repeatable diagnosis; their passing result does not mean the bug is fixed.

Reproduce from the repository root:

```sh
./node_modules/.bin/esbuild output/analysis/roster-disappearance/reproduce.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/ae-roster-disappearance.mjs
node /tmp/ae-roster-disappearance.mjs
./node_modules/.bin/esbuild output/analysis/roster-disappearance/render-proof.ts --bundle --platform=node --format=cjs --loader:.csv=text --outfile=/tmp/ae-roster-render.cjs
node /tmp/ae-roster-render.cjs
```

This was service/weekly-engine, verified-persistence and actual React component-render coverage, not a manual gameplay/browser playthrough of the reporter's career. No fix, commit or push was performed.
