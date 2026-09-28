# Adaptive Performance Phase 7 Implementation Plan

1. Add a pure, bounded long-session validation accumulator using test-first development.
2. Exclude background time and emit 30/60-minute checkpoints exactly once.
3. Record runtime health, native memory/thermal evidence and applied profile changes.
4. Run runtime monitoring on iOS in observation-only mode while keeping adaptation Android-only.
5. Add a device-lab matrix and operator checklist for cold/warm start and critical flows.
6. Verify TypeScript, production build, Phase 1–6 audits and the new Phase 7 audit.
7. Report physical-device coverage honestly; do not mark hardware rows passed without evidence.
