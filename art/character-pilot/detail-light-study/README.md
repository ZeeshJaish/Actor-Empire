# Character detail and lighting study 04

Continues the owner's positively received volume study 03 with a bounded detail pass and a controlled lighting comparison. The earlier study is preserved.

## Review

Open `http://127.0.0.1:8766/detail-light-study/` on the existing local preview server.

- Rotate the actual GLB and select front, three-quarter, side or portrait framing.
- Compare soft studio, warm-key/cool-rim, and directional daylight presets.
- Adjust key and rim brightness in live 3D.
- Switch to Blender renders for full material quality; the two available render framings are three-quarter and square portrait.
- Expand the before/after section to compare the detail change under the same studio light and camera.

## Changes

Cloth compression folds are shaped into the jacket, sleeves and trousers. Pocket welts now have strips, recessed dark openings, bar tacks and fine topstitching. The jacket includes a metal zipper slider and pull. Palms and thumbs are joined into continuous meshes, with subtle knuckle shaping. Head curvature, lower eyelids, and material roughness have been refined.

The Blender lighting renders omit contour lines so internal fold silhouettes do not look like cuts. Live 3D retains the simple surface contour shader. Live lighting uses directional approximations to Blender's area lights; procedural fabric bump is available in Blender renders.

## Source and regeneration

- `actor-detail-study-04.blend` is the complete editable refined scene, saved with the warm/cool lighting setup.
- `actor-detail-study-04.glb` is the actual interactive asset.
- `build_detail_light_study.py` loads the preserved `../volume-study/actor-volume-study-03.blend`, applies the refinement and produces eight images.
- `fix_sheen_export.py` corrects the inspected Blender 5.1.1 glTF export's omission of the separate Principled Sheen Weight. Its three fabric sheen factors are set to 0.10, preserving the original binary geometry data.
- `manifest.json` records the three lighting rigs and matching camera outputs.
- `asset-check.json` records validation against the actual GLB and eight distinct rendered PNGs.

Run from the game repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python art/character-pilot/detail-light-study/build_detail_light_study.py
```

## Verification and limits

The export contains 77,532 triangles in 334 mesh primitives and is 1,793,200 bytes. All exported positions were checked for finite values and all triangle indices for valid bounds. The three fabric sheen factors match 0.10. Eight distinct images were generated and the Blender build completed without errors. Preview controls, portrait framing, lighting selection, render mode, and the key-brightness range were checked in the browser; the checked narrow viewport had no horizontal overflow.

This is a single static art study. Rigging, expressions, modular production assets, mobile optimization, save migration and game integration remain outside this pass. The larger mesh and draw-call count require optimization before production use. No game-system files were edited for this study.
