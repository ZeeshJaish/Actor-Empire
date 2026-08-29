# Actor Empire Blueprint

An interactive, code-grounded map of Actor Empire's player journeys, gameplay systems, simulation layers, and source-of-truth files.

## Open it

From the repository root:

```bash
python3 -m http.server 4173 --directory game-blueprint
```

Then open `http://127.0.0.1:4173/`.

## Refresh after game changes

```bash
node game-blueprint/generate-source-index.mjs
```

The scanner updates the source counts shown in the left rail and fails when a file referenced by the map no longer exists. The gameplay descriptions and connections live in `graph-data.js`; update those when a system's behavior or ownership changes.

## What is mapped

- Player entry, creation, navigation, pages, energy, and Next Week
- Actor career, casting, production calendar, release, awards, and continuations
- Development Lab, Greenlight, Production House, rights, studios, businesses, and markets
- Phone apps, public image, creator platforms, representation, relationships, family, and health
- EMPIRE+ founding, infrastructure, HQ, content, audience, product, finance, rivals, weekly loop, and legacy
- Canonical Player state, autosave, migration, transfer, telemetry, recovery, purchases, and ads

The site is dependency-free and intentionally isolated from the game build.
