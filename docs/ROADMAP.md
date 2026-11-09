# Roadmap

Ordered by **dependency first, then priority**. Each feature lists the bugs that must be fixed before (blocking)
and decisions it needs ([DECISIONS.md](DECISIONS.md)). "Exists" means code is already in the repo.

Features you named: animation + video export, snap/grid, templates, shapes ("etc."). Items marked *(proposed)* are
my suggestions to confirm, not requests from you.

## M0: Foundation (no user-visible features)

Goal: make every later change safe to ship.

| # | Work | Fixes | Needs |
|---|---|---|---|
| 0.1 | Real type-check in CI (`tsc -p tsconfig.app.json --noEmit`), CI runs type-check + tests + build | BUG-012, BUG-044 | Q8 (dead files break type-check) |
| 0.2 | Delete dead code + unused deps | BUG-031, BUG-032 | Q8 |
| 0.3 | Test harness (fake canvas, `makeStore`, canvas mock), Playwright smoke | none | Q9 |
| 0.4 | Store collision guard + rename colliding keys (**done** 2026-11-07, BUG-017 left) | BUG-001, BUG-002, BUG-017, BUG-019, BUG-020, BUG-023 | Q1 ✅ |
| 0.5 | Single serialization contract (`CUSTOM_PROPS`, `serializeCanvas`, `loadCanvas`), await all `loadFromJSON` | BUG-003, BUG-014 | none |
| 0.6 | Remove Fabric `any` shims; explicit origins | BUG-013, BUG-008 (part) | Q4, Q10 |

## M1: Data integrity (users stop losing work)

| # | Work | Fixes | Blocked by | Needs |
|---|---|---|---|---|
| 1.1 | Undo/redo correct: register history events, per-page stacks, pause during loads | BUG-005, BUG-006, BUG-034 | 0.4, 0.5 | Q7 |
| 1.2 | Destructive actions safe (Ctrl+O, New board, Apply template, Clear page) | BUG-040, BUG-009 (**done** 2026-11-07: template = one undo step + Undo toast) | 1.1 | Q11 ✅ |
| 1.3 | Project persistence: pages + meta in one versioned document, migration from `drawJson` | BUG-004 (**done** 2026-11-07, IndexedDB), BUG-036 (**done** 2026-11-08: `lib/storage/localList`) | 0.5 | Q5 ✅ |
| 1.4 | Mount/restore race fixed | BUG-016 | 1.3 | none |

## M2: One canvas geometry model

| # | Work | Fixes | Blocked by | Needs |
|---|---|---|---|---|
| 2.1 | Single viewport/geometry owner; page/template/zoom call it (**done** 2026-11-07; BUG-022 left) | BUG-007, BUG-022, BUG-025 | M1 | Q2, Q3 |
| 2.2 | Mode model (design/whiteboard) wired end-to-end | BUG-015 | 2.1 | Q3 |

## Features (after M0-M2)

### F1. Shapes (exists: catalog, text-in-shape, connectors, custom shapes, boolean ops)

Priority: high (core editing). Remaining work: connectors and text shapes survive undo/pages/reload; custom shapes
move into the project/storage module; Text panel actually edits text (BUG-041); origin selector works (BUG-042);
shape stroke vs text stroke separated (BUG-020).
**Blocking bugs:** none open (all fixed by 2026-11-09, see BUGS.md). **Depends on:** M0, M1.1.

### F2. Snap & grid (exists: `createNotebookSlice` grid + object snapping + guides; settings has separate `snapToGrid`/`gridSize`; whiteboard has a CSS dot grid)

Priority: high (cheap once geometry is fixed). Work: one source of truth for grid size/snap (settings ↔ notebook),
one grid renderer per mode, snap respects page bounds in design mode, keyboard toggles documented, grid never exported.
**Blocking bugs:** none open (all fixed by 2026-11-09, see BUGS.md). **Depends on:** M0.4, M2.1.

### F3. Templates (exists: gallery, favourites, save-as-template, apply onto artboard)

Priority: medium-high. Work: apply into a **new page** (or undoable), artboard = page geometry (no separate
VPT/clipPath model), template content positioned with explicit origins, saved templates persisted with the project
store, template thumbnails.
**Blocking bugs:** none open (all fixed by 2026-11-09, see BUGS.md). **Depends on:** M1.2, M1.3, M2.1. **Decisions:** Q2, Q3.

### F4. Animation + video export (exists: keyframes, presets, curves, auto-key, playback, MP4 via WebCodecs, WebM/MP4 realtime fallback, PNG still)

Priority: high (headline feature), but it has the most blockers. Work, in order:
1. ~~Persist animation data per page in the project document; serialize `animId` (BUG-010).~~ Done 2026-11-07.
2. ~~Never save animated values: capture/persist from rest state; refresh rest on edits (BUG-011).~~ Done 2026-11-07
   (left: multi-selection rest refresh BUG-142, playhead after canvas undo BUG-140, keyframe history per page BUG-141).
3. Separate history + clipboard + shortcuts from the canvas (BUG-001, BUG-017, BUG-018).
4. Export the page rect regardless of zoom/pan; output size presets (1080p/4K/square/vertical) (BUG-026).
5. Multi-page export as scenes *(proposed, Q12)*; audio track *(proposed; not in code today)*.
6. Performance: selectors instead of `useStore()` so playback does not re-render the editor (BUG-029).
**Blocking bugs:** none open (all fixed by 2026-11-09, see BUGS.md). 
**Depends on:** M0, M1, M2.1. **Decisions:** Q1, Q5, Q7, Q12.

### F5. Layers polish (exists)

Linked clones survive save/undo (BUG-027), `hasSelection`/menu states (BUG-033), align-to-canvas respects the page
rect and pan. **Depends on:** M0.5, M2.1.

### F6. Export & sharing (exists: Export tab PNG/JPEG/SVG/JSON with crop; `saveBoard`; per-page PNG; local-only share)

Work: one export pipeline that uses page geometry; PDF *(proposed; no PDF library installed today)*;
decide Share (Q6). **Blocking bugs:** none open (all fixed by 2026-11-09, see BUGS.md). 

### F7. Brush quality (exists: 14 brushes, eraser, symmetry)

Single writer for `freeDrawingBrush`; brush state separated from text/style state.
**Blocking bugs:** none open (all fixed by 2026-11-09, see BUGS.md). 

### F8. Performance & a11y hardening *(proposed)*

Selectors everywhere (BUG-029), no full-canvas stringify on selection (BUG-034), incremental history, accessible
names on toolbar buttons (BUG-043), remove `console.log` (BUG-037).

## Suggested sequence

`M0 → M1 → M2 → F2 (snap/grid) → F1 (shapes) → F3 (templates) → F4 (animation/export) → F5/F6/F7 → F8`

Snap/grid comes before shapes and templates because it is small once M2 lands and makes both easier to verify.
Animation is last of the named features because it depends on persistence, history and geometry all being right.
