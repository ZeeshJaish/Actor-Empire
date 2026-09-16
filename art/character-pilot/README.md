# Actor Empire character art pilot

An isolated, working **3 × 3 × 3 modular character preview**, built in Blender 5.1.1.
The model is original local geometry, not an image-generation output or a converted
concept picture. This is a first art/assembly study, not final character art.

## Try it

From the game repository:

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory art/character-pilot
```

Open http://127.0.0.1:8766. Change face, hair and brows independently; drag the model
to rotate it; switch between full body and headshot; toggle the simple head turn.
The profile thumbnail is rendered from the same assembled 3D model. Expand the
gallery to inspect and select all 27 combinations.

**Save look** saves a versioned recipe in this preview's local browser storage.
**Export recipe / Import recipe** move that recipe between browsers.
**Save portrait** downloads a 256-pixel PNG. These controls do not touch game saves.

## Contents

- `actor-empire-character-pilot.blend`: editable source with named part groups,
  materials, a portrait camera, lighting and the default assembled character.
- `build_character.py`: reproducible procedural modeling and export script.
- `exports/actor-empire-character.glb`: one asset containing all interchangeable
  parts, metadata and a `LookAround` animation. The viewer selects visibility.
- `exports/recipes.json`: all 27 valid combinations.
- `renders/first-character.png`: Blender-rendered baseline character.
- `renders/character-lineup.png`: three contrasting combinations rendered in Blender.
- `renders/<face>-<hair>-<brows>.png`: all 27 Blender renders for inspection.
- `appearance.mjs`: small, versioned recipe contract for this pilot.
- `appearance.test.mjs`: round-trip, invalid recipe and combination coverage.
- `verify_asset.mjs`: validates the actual exported GLB's part groups and animation.

Faces: square, round, tapered. Hair: bald, crop, swept. Brows: straight, angled, arched.
The head variants share a crown and feature attachment region; their cheek and jaw
geometry differs. The model's parts carry `category` and `option` metadata in glTF.

## Rebuild and check

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python art/character-pilot/build_character.py -- --gallery --review
node --test art/character-pilot/appearance.test.mjs
node art/character-pilot/verify_asset.mjs
```

Blender background rendering required permission to run outside the Codex sandbox
on this Mac. The preview server listens only on localhost.

## Scope and limits

- One adult body, one outfit and one skin/hair palette in this first pilot.
- The animation turns the rigid assembled head. This is **not a full skeletal rig**,
  facial performance system or cutscene implementation.
- Art is intentionally simple and more geometric than the approved concept target;
  final proportions, outlines and detail need owner review before library expansion.
- The preview uses real-time geometry; it does not preload 27 full character models
  or require rendering every possible future appearance into an image library.
- Gallery images are made on demand for review. The 27 offline PNGs are QA outputs.
- This is not integrated with the canonical game profile renderer or `Player` saves.
  Integration should extend the existing profile option registry and preserve old
  bitmap portraits, with a versioned migration after the art/assembly approach is approved.
- No native mobile performance claim: desktop browser interactions and a narrow app
  browser layout have been checked; Android/iOS device testing is still future work.
- No game code, dependencies or saves were changed by this pilot.

## Third-party code

The preview vendors only the required Three.js **0.185.1** modules from the existing
local installation in `chonk/node_modules/three`. Its MIT license is retained in
`vendor/THREE-LICENSE.txt`. The viewer has no CDN or remote asset dependency. No
third-party character models, textures, or licensed character likenesses are used.
