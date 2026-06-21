# Owned Right Development Choices Design

## Goal

Turn the existing `Develop Property` action into a clear, cinematic choice between
movie, series, fresh adaptation, and reboot development while preserving Actor
Empire's current Rights Vault, script, concept, greenlight, franchise, and universe
flows.

## Non-Duplication Rule

This slice must extend the existing system rather than introduce a second production
pipeline.

- `OwnedRight` remains the ownership record.
- `developOwnedRight` remains the domain entry point and consumes the existing expiry
  and project allowance.
- Development produces the existing `Script` type inside `studioState.scripts`.
- The player continues through Development Lab -> Concept and the existing Greenlight
  flow.
- Existing franchise and universe records remain the authority for sequels, spin-offs,
  franchise creation, and universe membership.
- No separate rights-project collection, duplicate concept type, or alternate
  greenlight wizard will be created.

## Player Flow

1. The player opens Development Lab -> Vault -> Rights.
2. An active owned-property card displays `Develop Property`.
3. The action opens a full-screen `Development Brief` over the current Rights Library.
4. The player chooses a format:
   - Movie
   - Series
5. The player chooses a strategy:
   - Fresh Adaptation
   - Reboot
   - Sequel, shown but locked until this property has a released project
   - Spin-off, shown but locked until this property has a released project
6. The brief shows the exact expiry, remaining project allowance, and creative
   guarantee before confirmation.
7. `Begin Development` calls the existing owned-right development transition with the
   selected format and strategy.
8. A short `Development Authorized` confirmation plays, the created script is stored in
   the existing Script Vault, and Development Lab switches to Concept.

## Development Rules

- Movie creates an existing `Script` with `projectType: MOVIE`.
- Series creates an existing `Script` with `projectType: SERIES`.
- Fresh Adaptation uses the current adaptation metadata.
- Reboot uses the current reboot intent and tags so downstream screens recognize it.
- Sequel and Spin-off remain unavailable in this slice unless the owned property can be
  linked to a released studio project. Their cards explain the lock instead of hiding
  the choices.
- Expired rights and rights with no remaining project allowance cannot open a valid
  authorization flow.
- A successful authorization increments `projectsUsed` exactly once.
- Closing the brief or changing selections does not consume a project allowance.

## Existing-System Data Changes

`developOwnedRight` will accept a small development-choice input and populate fields
that already drive the production system:

- `projectType`
- `sourceMaterial`
- `connectedProjectIntent`
- `tags`
- existing owned-right source metadata

Only minimal source-link metadata may be added to `Script` if required to identify the
originating `OwnedRight`. That link must not become a new project lifecycle.

## UI And UX

The Development Brief uses the established Rights Market visual language: black studio
room, amber contract accents, property emblem, paper/stamp details, and strong status
color.

- The top section identifies the property and current control type.
- A compact control strip shows expiry, projects remaining, and restrictions.
- Format and strategy choices use large touch-friendly cards.
- Selected choices have an unmistakable amber active state.
- Locked choices stay visible with a lock, reason, and unlock condition.
- The confirmation footer states what will happen: one allowance is consumed and a
  concept enters the existing pipeline.
- Authorization uses an emerald stamp animation and then moves the player to Concept.
- Reduced-motion settings remove large movement while preserving the status change.

## Error Handling

- The domain transition remains the final authority for expiry and project limits.
- If the state changes while the brief is open, confirmation fails safely and displays
  the current reason.
- Unknown or old-save fields normalize to the current Fresh Adaptation Movie behavior.
- No money is charged during development; acquisition cost was already paid at signing.

## Testing

- Domain audit covers Movie, Series, Fresh Adaptation, Reboot, expiry, allowance use,
  and one-time consumption.
- UI audit confirms the brief uses the existing Rights Vault callback and does not add
  an alternate project store.
- TypeScript lint and production build must pass.
- Browser QA covers opening the brief, changing format and strategy, locked continuation
  choices, authorization feedback, and arrival in the existing Concept screen.

## Deferred To The Second Slice

- Property value and momentum simulation
- Hit/flop effects on property strength
- License renewal
- Direct franchise creation
- Direct universe attachment
- Character and release-history management beyond the continuation eligibility signal
