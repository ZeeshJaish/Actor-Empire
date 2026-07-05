# Profile Builder System Guide

The profile builder should behave like `avataaars`: option IDs drive a canonical avatar skeleton. Do not use loose full-portrait PNGs as interchangeable parts.

## Current Foundation

- Registry: `services/profileBuilder.ts`
- Renderer: `views/avatar/profilePortraitRenderer.ts`
- UI: `views/avatar/ProfilePictureBuilder.tsx`
- Audit: `npm run audit:profile-builder`
- Export: PNG data URL saved into the existing `player.avatar` field.
- Art grid: `112 x 128`, scaled up with `image-rendering: pixelated`.

## Categories

The canonical categories are:

`skinTone -> faceShape -> hair -> hairColor -> eyebrows -> eyes -> eyeColor -> nose -> mouth -> facialHair -> outfit -> frame`

The render stack is:

`frame -> outfit -> skinTone/faceShape -> nose -> eyeColor -> eyes -> eyebrows -> mouth -> facialHair -> hairColor -> hair`

This is deliberate. Clothes own the body/collar area, the face owns head geometry, and hair sits above facial features.

## Gender Filtering

Each option has `genderTags`.

- `ALL`: available to everyone.
- `MALE`: available to male players and NPCs.
- `FEMALE`: available to female players and NPCs.
- `NON_BINARY`: available to non-binary players and NPCs.

Female defaults should favor female-compatible hair, brows, clean facial hair, and outfits. Hard-masculine items such as `buzz-cut`, beards, and `classic-tux` are filtered out of the female default pool unless we explicitly decide to add inclusive variants later.

## Mouth Rule

Mouths stay limited to three controlled options: `Smile`, `Full Lips`, and `Pout`. Female NPC generation should only use `Full Lips` or `Pout`, while broader emotional mouth states should wait until the whole portrait system supports expressions.

## Future GPT Asset Rule

The correct generated-asset workflow is base-plus-edit, not separate one-off generations:

1. Generate one approved `base.png` at `1024 x 1024`.
2. Generate every variant in edit mode from that same base image.
3. Change only one feature per file.
4. Keep skin tone and hair color neutral in source art; palette-swap colors in code.
5. Verify a small pilot batch before making the full set.

If we later replace canvas-native drawing with generated bitmap layers, each generated part must map to one registry option and one category. The generated art must follow this system, not the other way around.

Prompt shape:

```text
Generate one Actor Empire [category] option for a modular celebrity profile builder.
It must fit the existing front-facing portrait skeleton and preserve the same eye line, nose center, mouth line, head scale, and shoulder/collar zone.
Style: premium cinematic pixel-art actor headshot, thick dark outline, warm studio lighting, restrained detail.
Subject: [specific option].
Constraints: [category ownership rules].
Avoid: full portrait, different camera angle, real celebrity likeness, photorealism, anime, vector-flat style, extra body parts, text, logo, watermark.
```
