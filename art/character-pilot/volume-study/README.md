# Character volume study 03

One bald actor modeled against the owner's five-character lineup, following feedback that the previous study had a flat, extruded head. This pass replaces the v2 geometry with an actual rounded skull, shaped jaw and cheeks, projecting nose, dimensional ears, padded jacket, and shaped legs and hands.

## Review

Serve the parent directory and open `/volume-study/`. The existing review server uses `http://127.0.0.1:8766/volume-study/`.

The page supports front, three-quarter, side and square portrait framing. Live 3D supports dragging and zooming. Studio render shows the same character rendered in Blender. The reference and review assets are local.

## Files

- `actor-volume-study-03.blend`: editable Blender 5.1.1 source, including curves, materials, lights and camera.
- `actor-volume-study-03.glb`: real volumetric model for the interactive preview.
- `renders/`: front, three-quarter, side and portrait PNGs.
- `build_volume_study.py`: reproducible source, including all geometry and material construction.
- `verification.json`: dimensions of the actual skull mesh and generated camera views.
- `asset-check.json`: validation of actual exported vertex positions, triangle indices and image dimensions.

Run from the game repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python art/character-pilot/volume-study/build_volume_study.py
```

## Verification and scope

The exported GLB is 660,120 bytes, with 19,552 triangles across 254 mesh primitives. Positions were checked for finite values and triangle indices for valid bounds. Three full-body renders are 1100 × 1350; the portrait is 1000 × 1000. The skull measures 1.367 units wide and 1.274 units deep, excluding the protruding nose and ears.

This is a static character art study, not an approved production library. It has no animation rig, expression system, modular swaps, or save migration. Mesh count and draw calls have not been optimized for mobile gameplay. Blender uses procedural fabric bump and Freestyle contours; the live preview uses the exported base materials and a simple contour shader, so the two lighting treatments differ. Surface features and the clothing still need further art direction if the owner wants a closer match to the reference.

All work is contained in this art-study directory. Existing pilots and game systems are separate.
