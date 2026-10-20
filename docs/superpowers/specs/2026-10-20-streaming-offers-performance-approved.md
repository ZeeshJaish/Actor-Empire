# Approved streaming offers, collection negotiation and performance scope

User approved on 20 October 2026: first push a GitHub checkpoint, then implement the preceding offer UI, collection negotiation and performance plan; keep saves/rights safe, compare before/after with 5,000 titles, leave local ready.

Checkpoint d9887b1 and tag checkpoint-streaming-ui-collection-performance-fix are pushed to origin/codex/streaming-tap-lag. Work continues in the existing feature checkout used by the user's local game.

Required behavior:
- Remove Marketing from new private-offer controls and new offer economics/generated bid terms while preserving commitments on already signed contracts.
- Custom exact upfront money entry with readable preview; no hidden $250K rounding, invalid values or silent clamping.
- Only supported deal terms editable. Explain sequel rights, sublicensing and renewal via accessible small info controls. Incoming/outgoing terms use consistent meanings.
- Complete collection private offer -> processed-week response/counter -> sign flow. Allocate negotiated price across all components, validate all current rights, preserve snapshot and terms through reload, charge money/energy exactly once, reject stale/unavailable/mismatched scope without partial ownership.
- Restore a subtle premium colour gradient/glow and cinematic hierarchy on all auction result states; retain poster/title/winner and useful final terms. Keep the subtle acquired text and three-second-after-presentation gated skip.
- Replace repeated full world/title/licence preparation with one indexed immutable read batch, share appropriate read models, avoid recalculation for irrelevant draft/step updates, bound previews to visible results. A worker is conditional on evidence after algorithmic fixes; do not add artificial waits.
- Cached presentation is not authorization. Current rights, country/window/mode, funds, energy and idempotency checks stay on actions. Expiry/production/localization/pricing/network/world changes invalidate dependent reads. Do not silently drop owned titles or erase legacy contracts.
- Preserve durable save generation verification, current/previous recovery and processed-week persistence. Actual Anshu save must not be reset, purchased from or advanced during disposable testing.
- Use exact same pinned 5,000-title fixture for before/after. Report immediate paint and later long tasks; distinguish memory-only browser, Node and real-device evidence. No universal Android/iPhone claim.
- Main local server remains the correct checkout on port 5174 and user browser stays open.
