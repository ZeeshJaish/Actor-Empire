# Befriend and shared relationship bond verification

## Behavior

Instagram networking remains independent before a successful Befriend. A matching name, an NPC identity in Social, or a high Instagram score alone does not establish a link. Existing `hasMet` (written by Befriend) plus the matching Social `npcId` proves a link; no save schema change is required.

After Befriend, Social closeness owns the shared bond. Instagram's bar, action eligibility and interaction calculations use that value. Social actions, weekly processing, save compaction and save migration mirror the linked Instagram score/contact week without moving the Social contact clock. A greeting adds its normal gain instead of restoring a stale Instagram 100. Negative outcomes also reach the shared bond. Repeated Befriend cannot duplicate contacts, farm gains or refresh the contact clock.

Migration does not charge missed historical decay, guess links by name, merge contacts, or modify actual Social bonds. Independent Instagram contacts, brand state, follows and chats stay intact. For legacy duplicate NPC identities, the first identity is resolved consistently; other relationship records remain preserved.

## Verification

- A failing regression run reproduced stale-score restoration, missing Social-to-Instagram updates, stale eligibility, duplicate Befriend gains, and missing save-cache reconciliation before repair.
- `npm run audit:relationship-sync`: 15 checks passed. Both 5- and 10-week maximum-maintenance cases used real action hooks and the weekly engine across year rollover, followed by neglect, both interaction paths, two verified save/reload cycles per case, and resumed decay. After 15 idle weeks both scores were 78; greeting raised them to 81, Social CALL to 83, and post-reload inactivity eventually reduced both to 81.
- `npm run audit:relationship-decay`: 12 weekly/migration cases and 3 real contact-action checks passed.
- Save migration, integrity, save-generation recovery, legacy inheritance, and all 130 Social event checks passed.
- The memory-guarded production build passed with output isolated at `/tmp/actor-relationship-sync-build`; Vite reported its existing large-chunk warning.
- Full workspace typecheck still reports TS2322 in the unrelated in-progress `scripts/audit-cinema-mature-policy.ts:18` (`string` versus `RoleType`). A read-only compiler-host comparison using HEAD versions of all pre-existing relationship files and excluding newly added relationship files reproduced exactly the same diagnostic. No unrelated source or compiler configuration was changed to suppress it.
- `git diff --check` passed. Unrelated workspace changes were retained. No personal save slot was accessed or modified, and nothing was committed or pushed in this task.

These are automated integration tests using real React action hooks, gameplay processing and the verified save coordinator with an in-memory store. They are not a manual mobile-device gameplay test.
