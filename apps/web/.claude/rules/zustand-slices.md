---
paths:
    - 'src/store/**'
---

# Store and slices

Full rules: docs/CONVENTIONS.md "Slice pattern rules" and "Error handling"; per-slice reference: docs/STATE.md.
New slice: skill `fate-new-slice`.

- One store: slices are spread into `combinedSlice` in `src/store/index.ts`, **before** `createAnimationSlice`.
  Never a second zustand store. (`storeKeys.test.ts`)
- Every key is unique across all slices: grep before adding one, prefix feature fields (`brushOpacity`).
- Type each slice: exported interface + `SliceCreator<YourSlice>`. No new `any` in store code (lint ratchet).
- No module-level mutable state: closure variables inside the creator (it leaks between stores and tests).
- Fabric is the source of truth for document content; the store mirrors UI state; derived lists are rebuilt from
  the canvas.
- Document-changing action = mutate Fabric → `canvas.requestRenderAll()` → history (`saveState()` when no canvas
  event fires) → autosave. State outside the canvas that belongs to the document calls `persist()`.
- Actions never throw to React: guard `const canvas = get().canvas; if (!canvas) return;`, wrap I/O in
  `try/catch` + `console.error('[slice] …', err)` and return a falsy value.
- Destructive actions are one undo step and offer Undo (`showToast({ actionLabel: 'Undo', … })`); deleting saved
  data asks with `confirmDialog({ tone: 'danger' })`. Never `alert/confirm/prompt` (`nativeDialogs.test.ts`).
- Cross-slice calls go through `get()`; list the dependency in docs/STATE.md.
- Never a static import from a slice to a module that imports the store (BUG-048): use a dynamic `import()`.
- Persistence only through `@/lib/storage` (`storageBoundary.test.ts`).
- **Ask before** renaming or removing a public key or action used by components or other slices.
- Tests: `src/store/slices/__tests__/`, with `src/test/sliceHarness.ts` (no zustand, no React) and
  `src/test/fakeCanvas.ts`.
