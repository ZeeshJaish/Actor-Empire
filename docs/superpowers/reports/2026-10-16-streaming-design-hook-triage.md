# Streaming design hook triage

The flagged CSS files have no working-tree changes. These findings predate the catalog/pricing and premiere subscriber fixes; no functional regression was established by this detector pass. This is a focused hook review, not a full accessibility or responsive certification.

| File and line | Finding | Disposition |
| --- | --- | --- |
| `PremiereNight.module.css:144` | Side accent | False positive: zero-size `.playglyph` uses a border triangle to draw the video play icon. File-scoped rule/value ignore persisted. |
| `PremiereNight.module.css:145` | Border accent on rounded element | False positive: transparent triangle borders belong to `.playglyph`, which has no radius. Detector crosses selector boundaries. File-scoped rule/value ignore persisted. |
| `PremiereNight.module.css:2` | Inter font | Existing font choice; unchanged and unsuppressed pending visual preference. |
| `PremiereNight.module.css:70` | Bounce easing | Existing brand-ident pop animation; unchanged and unsuppressed pending visual preference. |
| `streaming-hq.css:15` | Inter font | Existing HQ font choice; unchanged and unsuppressed. |
| `streaming-hq.css:1655` | Inter font | Existing launch receipt font choice; unchanged and unsuppressed. |
| `streaming-hq.css:1684` | Inter font | Existing Opening Programme font choice; unchanged and unsuppressed. |

The manual scan also surfaced two advisories:

- `PremiereNight.module.css:183`: false grid detection. The source explicitly describes paper fibre, implemented with small radial dots and varying repeat sizes, not grid-line gradients. A file-scoped `codex-grid-background` value ignore was persisted.
- `streaming-hq.css:156`: actual decorative HQ command grid. This is an existing visual choice; left unchanged and unsuppressed pending preference.

Only `.impeccable/config.json` changed for this triage. The three exceptions name their code evidence and affect only the corresponding rules in the premiere CSS file. No whole-file or project-wide rule ignore was added; the prior unrelated ignore remains intact.

The confirmation detector pass leaves four Inter warnings, one bounce warning and the HQ grid advisory. `git diff --check` passes. There were no application source changes requiring another gameplay/build run; the prior 38/38 suites, 118/118 checks and local functional verdict remain applicable.
