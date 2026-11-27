# Library and clipboard

Owner brief 2026-11-26: "prop library should be on scene also; with prop we have a clipboard feature where if we
create something we should add it on the clipboard, and that could be scene, props or character; we need the best
UX so we can manage all things perfectly." Owner answers the same day:

| Question | Answer |
|---|---|
| Props in a scene | Standing in the 3D world (perspective, depth-sorted with characters, draggable) |
| What the clipboard collects | Everything, automatically: saved characters and scenes, styled or imported props, Ctrl+C on the canvas; the last ~30, pinned ones kept |
| Where it is managed | One new left-rail **Library** panel (Clipboard, My characters, My scenes, My props) |
| Order | Plan, then phase L1 (props in scenes) now; one phase per session |

## 1. Phases

| # | Scope | Status |
|---|---|---|
| L1 | Props in the Scene Studio: schema v2, renderer, Props tab, stage editing (docs/PROPS.md §9) | **done 2026-11-26** |
| L2 | Clipboard domain + storage + slice (no UI beyond a toast) | planned |
| L3 | Library panel (left rail): Clipboard, My characters, My scenes, My props | planned |
| L4 | Clipboard everywhere: drop clip items into a scene (characters → actors, props → scene props), "Paste from clipboard" in the studio, keyboard | planned |

## 2. Design (L2–L4)

**Clip item** (`src/library/clip.ts`, pure domain, guarded like `src/props`):

```
ClipItem = { v: 1, id, kind: 'character' | 'scene' | 'prop' | 'objects', name, createdAt, pinned,
             thumb (small SVG / PNG data URL, ≤ 64 kB), data }
  character → Character JSON (parseCharacter)    scene → Scene JSON (parseScene)
  prop      → PropData or a user prop id          objects → Fabric JSON of a canvas selection (COPY_PROPS)
```

- **Automatic capture:** `saveStudioCharacter`, `saveStudioScene`, `importPropFile`, a prop restyle
  (`updateSelectedProp`, coalesced per object), and the layers slice's `copy` / `cut` each push one item. A repeat
  of the same thing (same id, or the same content hash) moves it to the top instead of adding a copy.
- **Keep:** the newest 30 unpinned items plus every pinned item (cap 200). Stored with `@/lib/storage`
  (`clipStorage`, project database, read-modify-write like `propStorage`). PNG thumbs capped at import
  (runtime-performance P1). The in-memory `clipboard` of the layers slice stays as it is: Ctrl+V pastes the last
  copy, as today.
- **Slice** `createClipboardSlice`: `clipItems`, `clipStatus`, `loadClips`, `pushClip`, `pinClip`, `renameClip`,
  `removeClip` (confirm + Undo), `useClip(id, target?)`. Using a clip on the page: character / scene / prop =
  the existing place actions; objects = the layers slice's paste path. In the studio: character → `addSceneActor`,
  prop → `addSceneProp`, scene → `load` edit.
- **Library panel** (lazy): search across everything; a type filter (All, Characters, Scenes, Props, Objects);
  Clipboard on top (newest first, pinned group), then My characters / My scenes / My props (the existing
  libraries, shown, not copied). Every card: thumbnail, name, kind badge, click = add, drag = drop on the page or
  stage, and a menu with Rename, Pin, Open in studio (characters / scenes), Delete. Empty states explain what
  lands there. The Characters and Scene Objects panels keep their own sections and link to the Library.
- **Risks:** thumbnail size (cap and lazy-render), storage growth (caps above), and Fabric JSON from an older
  build (load through the one loader; refuse unknown versions with a message).
