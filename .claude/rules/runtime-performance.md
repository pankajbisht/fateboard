---
paths:
    - 'src/store/**'
    - 'src/lib/canvas/**'
    - 'src/lib/brushes/**'
    - 'src/lib/storage/**'
    - 'src/lib/serialization.ts'
    - 'src/feature/import/**'
    - 'src/animation/**'
    - 'src/hooks/**'
    - 'src/components/organisms/board/**'
    - 'src/components/organisms/filter/**'
    - 'src/components/config/**'
---

# Runtime performance (target: 1000+ objects, long strokes, big photos, 60 fps)

Full checklist (30 items, status, ranked fixes P1…P12): docs/PERFORMANCE_AUDIT.md. Read the row for what you
touch; when you fix one, update its status and date there. Fabric installed: 7.4.0.

Highest impact, check every time:

- **Photos**: never keep a bitmap larger than it needs to be; cap at import (P1). No new full-size `data:` URL
  copies in snapshots, pages or thumbnails.
- **Autosave / history**: capture synchronously, write one at a time, debounce to idle (P2). Never save or
  snapshot per pointer move; one gesture = one history step.
- **Strokes**: simplify on commit (RDP for outlines, a distance filter for samples, P6); draw the live stroke on
  the top context, one blit per move, never `renderAll` per sample.
- **Input**: Fabric gets `MouseEvent` / `TouchEvent`, not `PointerEvent`. Read pressure and coalesced samples
  through `lib/canvas/penInput` (P3), never `e.pointerType` / `e.pressure` directly.
- **GPU / caches**: anything Fabric caches per object (WebGL textures, object caches) must be freed when the
  object leaves the canvas (P4); `object:removed` fires with `obj.canvas` already unset.
- **Serialization**: a runtime flag that must survive undo / reload goes in `CUSTOM_PROPS` (P9). Keep Fabric's
  `includeDefaultValues` true (files must not depend on library defaults); shrink custom data instead (P7).
- **Bundle**: a dock panel or rare feature is `lazy()` (P5); measure with skill `fate-perf`.
- **Measure, don't guess**: wrap heavy work in `timed()` / `timedAsync()` (P11, `lib/perf/perfMarks`) and
  compare before / after on the 500-object stress board (`e2e/perf-budget.spec.ts`).
