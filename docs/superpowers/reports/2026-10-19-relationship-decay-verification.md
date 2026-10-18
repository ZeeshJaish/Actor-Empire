# Relationship decay repair and festival report analysis

## Implemented locally

The weekly relationship loop previously subtracted week-of-year values and ignored the saved absolute contact date. A contact in week 48 could remain immune indefinitely because the new year's week number never exceeded 48 by more than four. Maintaining maximum closeness does not intentionally unlock decay immunity.

The loop and interaction-age display now share an absolute contact clock. The existing `weeksSince > 4` grace rule, two-point weekly decay, and zero floor are unchanged. Each processed week applies at most one decay deduction; missed historical decay is not charged in bulk. Deceased parent bonds remain preserved.

Migration preserves known past absolute dates. Missing or zero legacy dates use only known same-year elapsed time; ambiguous yearless dates and future dates inherited from an older actor receive a fresh anchor. The repaired anchor persists, so it cannot reset grace every week. Successful NPC connections and friend-favor replies now refresh both contact date fields.

## Verification

- Observed failures against the previous implementation before repair.
- `npm run audit:relationship-decay`: 12 real weekly-loop/migration cases plus three actual hook contact actions passed.
- Save migration, save generations, save integrity, legacy inheritance, social events (130 checks), reported-bug regressions, and streaming-run progress (19 checks) passed.
- Social UI transplant and legacy phone restoration server-rendered audits passed.
- `npm run lint` (TypeScript no-emit check) passed.
- Production build passed with output isolated at `/private/tmp/actor-relationship-build`; Vite reported its large-chunk warning.
- Independent read-only review found no important issues and separately reran all 15 focused checks successfully.
- `git diff --check` passed. Existing unrelated streaming work was preserved. The user subsequently authorized committing and pushing this relationship repair.

## Festival complaint: analysis only

Current-build browser trace used a producer movie awaiting release at week 18, with Cannes opening in week 19. The festival page shows the future window but Back moves to the previous wizard step. Repeated Back actions eventually exit to the studio. The wizard obscures access to Next Week, and backing through steps changes the saved draft step; reopening can require crossing the earlier pages again.

The trace successfully exited, advanced one real game week, reopened the draft, and selected Cannes. The film remained awaiting release and no release commitment or payment occurred. A hard lock was not reproduced in this build; the reporter's exact historical build is unverified. Their reported experience is consistent with an unclear exit/wait/resume path.

The user reviewed the explanation and explicitly accepted the existing festival flow. Festival navigation is unchanged; no navigation follow-up is in scope.
