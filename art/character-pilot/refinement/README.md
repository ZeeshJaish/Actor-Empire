# Bald character study 02

A visual correction following the owner's feedback that the initial modular Blender pilot was far from the supplied bold-cartoon concept board.

## Deliverables

- `bald-actor-study-v2.blend`: actual editable Blender scene, saved with the full-body camera.
- `renders/bald-actor-v2.png`: full-body render.
- `renders/bald-actor-v2-portrait.png`: portrait from the same geometry and materials.
- `index.html`: direct comparison with the owner-supplied reference, shown with CSS cropping.
- `build_bald_study.py`: reproducible Blender 5.1.1 source.

Run from the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python art/character-pilot/refinement/build_bald_study.py
```

## Scope and limitations

One static character in a folded-arm pose, with authored flat color planes and Freestyle contours. This is an art study for review, not an approved production character or a rigged modular library. Some facial detail is shallow geometry designed for frontal and slight three-quarter cameras. It requires further modeling for wider camera angles and animation. The rendered contour treatment is not exported to the earlier GLB viewer.

The initial modular pilot remains separate in the parent directory. No game profile data, saves, or live game UI were changed by this study.
