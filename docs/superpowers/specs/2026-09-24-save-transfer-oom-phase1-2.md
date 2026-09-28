# Save Transfer OOM — Phase 1 and Phase 2 Contract

## Objective

Prevent an unsafe whole-archive Android bridge call before it reaches Capacitor's `JSObject` parser, preserve all existing save-integrity guarantees, and define the bounded Save Transfer v2 format that the native streaming transport will consume in Phase 3.

## Phase 1 safety contract

- Measure compacted public save-slot bytes without constructing one complete save JSON string.
- Inspect media record sizes before converting any Blob to base64.
- Include local Actor Empire storage, base64 expansion, framing overhead, and a conservative eight-times transient-memory projection.
- Use the lower of the absolute legacy bridge ceiling, the device memory-class allowance, and the currently available-memory allowance.
- Block immediately when Android reports low memory.
- Measure the final serialized legacy archive again before the native call.
- Emit only bucketed sizes, counts, direction, stage, decision, and memory-class bucket. Never emit names, save keys, filenames, media IDs, or content.
- Export/import, Process Week, debounced autosave, and native memory checkpoint writes must not overlap.
- A block or failure must leave every current and previous save generation unchanged.

The interim guard is intentionally conservative. It protects users while Phase 3 is incomplete; it is not the long-term payload limit.

## Phase 2 format contract

Save Transfer v2 uses `AESAVE2` and format version 2 with framed records:

1. A bounded signed manifest envelope.
2. One header per record.
3. Raw record bytes following each header.

The manifest contains only descriptors:

- public save-slot record descriptors;
- Actor Empire local-storage record descriptors;
- raw binary media record descriptors;
- byte length and SHA-256 for every record;
- an aggregate digest over the ordered descriptors;
- archive totals, reader compatibility, chunk size, and explicit limits;
- an HMAC-SHA256 signature covering the manifest body.

Media encoding is `BINARY`, not archive-wide base64. Save and local-storage encodings are explicit UTF-8 record types. Duplicate record IDs, private save-generation keys, invalid digests, excess records, and declared sizes above their limits are rejected.

## Compatibility and activation

- Existing signed v1 import remains supported within the Phase 1 safety guard.
- The v2 format, validation, signature, and framing contract are implemented and tested.
- Android export must not switch to v2 until Phase 3 writes these frames through bounded native chunks.
- V2 import must not activate until Phase 4 can stream, stage, validate, and atomically promote it.

This activation boundary prevents a nominal v2 file from being sent through the same unsafe whole-string bridge path.

