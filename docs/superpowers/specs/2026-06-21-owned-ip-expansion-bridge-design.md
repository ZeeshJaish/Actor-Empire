# Owned IP Expansion Bridge Design

## Goal

Complete Phase 4 by making the IP Library the single ownership index for both acquired IP and released studio-original IP, then bridge expansion into the existing Franchise and Universe systems.

## Ownership hierarchy

- **IP Library and Dossier:** the ownership root. Shows what the studio owns, its provenance, performance, releases, and current development activity.
- **Franchise Command:** the continuation layer. Owns sequel, spin-off, finale, and reboot creation.
- **Universe Command:** the shared-continuity layer. Owns universe membership, sagas, phases, characters, and event projects.

The dossier links to Franchise and Universe Command. It does not copy their continuation or canon controls.

## Unified IP sources

### Acquired IP

Uses persisted `OwnedRight` records. Cards retain contract type, acquisition cost, expiry, project allowance, restrictions, and renewal eligibility.

### Studio Original IP

Is derived from released studio projects whose source script is original. It is not created for every draft or unreleased concept. Existing saves are supported by matching `sourceScriptId` when available and then the retained produced-script title.

Original releases group by `franchiseId`; standalone releases remain individual IP. A release already matched to acquired rights is never also registered as Studio Original.

New projects persist `isOriginal` and `sourceScriptId` into release history so future matching is deterministic.

## Library UI

Both sources use the existing compact dossier cards.

- Acquired cards show their legal deal badge.
- Studio Original cards show a prominent **Studio Original** badge, Permanent control, release count, and lifetime gross.
- Original cards never display a fake purchase price.
- Franchise and universe membership are small status chips, not duplicate cards.

## Dossier expansion command

The existing dossier gains an **Expansion Command** section:

- **Franchise Command:** opens the existing Franchise tab where sequel, spin-off, finale, and reboot eligibility already lives.
- **Universe Command:** opens the existing Universe tab for shared-canon management.
- **Hold IP:** closes the dossier without consuming or changing anything.
- **Renew Licence:** appears only for acquired, non-permanent rights near expiry or already expired. It extends the current contract using studio capital.

Acquired IP retains **Develop IP**, which uses Development Authorization. Studio Original IP uses **Open Franchise Command** as its primary action.

## Renewal rules

- Only active or expired non-permanent acquired rights can renew.
- Renewal becomes available with 26 or fewer weeks remaining, or after expiry.
- Cost is 35% of the original acquisition price, rounded to whole currency units.
- Renewal adds 104 weeks from the later of the current week or existing expiry.
- Insufficient studio capital leaves state unchanged and returns a clear reason.

## Scope boundary

No new franchise grouping, sequel generator, universe builder, or release dashboard is created. Slice 3 only registers ownership correctly and opens the current specialized systems.

## Verification

- Pure audits cover original-IP detection, acquired/original de-duplication, franchise grouping, legacy title fallback, and renewal rules.
- UI audit covers provenance badges and Expansion Command handoffs.
- Existing rights, sequel, universe, lint, and build checks pass.
- Browser QA covers acquired and Studio Original cards, dossier expansion handoffs, Hold IP, and renewal visibility without mutating the save.
