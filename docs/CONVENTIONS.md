# Conventions

These describe **how new code should be written**. Where existing code differs, it is noted. Do not refactor
existing code to match unless that is the task.

## Formatting & lint

- Prettier (`.prettierrc`): 4-space indent, single quotes, semicolons, trailing commas, `printWidth: 100`, LF.
  Some files (`createAnimationSlice.ts`, `engine.ts`) use 2 spaces; let Prettier fix files you
  touch.
- ESLint 9 flat config (`eslint.config.js`): `js.recommended` + `typescript-eslint` recommended. `no-explicit-any`
  and `no-unused-vars` are **warnings** in `src/**`; react-hooks and react-refresh presets are commented out.
- Pre-commit: husky → `lint-staged` (prettier + eslint --fix on staged `src/**`).

## Naming

| Thing | Pattern | Example |
|---|---|---|
| Slice creator | `create<Name>Slice` in `src/store/slices/create<Name>Slice.ts` | `createPagesSlice` |
| Slice interface | `<Name>Slice` | `PagesSlice` |
| Actions | verb first, camelCase | `addPage`, `setZoom`, `toggleGrid` |
| Booleans | `is*`, `has*`, `can*` | `isPageSwitching`, `canUndo` |
| Private slice state | leading `_` (stored) or closure variable (not stored) | `_historyPaused`, `persistLock` |
| Components | PascalCase file = component name | `LayersPanel.tsx` |
| Feature folder | `organisms/<feature>/{index.ts, ui/, <feature>.config.ts(x), <feature>.type.ts}` | `organisms/board/` |
| Toolbar/command config | `components/config/toolbars/ui/<Bar>Config.tsx` | `EditBarConfig.tsx` |
| Custom Fabric props | camelCase, no `__` prefix if they must be saved; `__` = runtime-only ref | `shapeId`, `__text` |

Avoid: numbered copies (`LayerPanel1.tsx`, `clone1`, `toggleActiveObjectLock1`), files without extensions (`asd`),
and generic store keys (`items`, `visible`, `x`, `y`, `opacity`, `color`). Use a slice prefix for new keys
(`anim*`, `page*`, `brush*`).

## Imports

- Aliases (Vite + tsconfig): `@/` → `src/`, `@store` → `src/store/index.ts`, `@components/`, `@lib/`, `@hooks/`.
  `@animation/` exists in Vite only (not tsconfig), so use `@/animation/...`.
- Import the store as `import { useStore } from '@store'`. There is no `useEditorStore`.
- Import Fabric as `import * as fabric from 'fabric'` (or named imports). Never rely on `fabric.fabric`.
- Import storage only as `@/lib/storage` (never its files). Only `src/lib/storage/**` may use `opendb-store`,
  `localStorage`, `sessionStorage` or `indexedDB` (`storageBoundary.test.ts`). New persisted data = a function in a
  domain store there; a new library or backend = a new adapter wired in `lib/storage/index.ts`
  (docs/ARCHITECTURE.md "Storage layer").

## TypeScript

Today: `strict: false`, `strictNullChecks: false`, and local shims make `fabric` `any` (BUG-013). Rules for new or
changed code:

1. Type every slice with an exported interface and `SliceCreator<YourSlice>`.
2. No new `any` in store code; use `fabric.FabricObject`, `fabric.Canvas`, and a typed augmentation for custom props.
3. Every `async` action returns a `Promise` and is awaited by callers that depend on the result.
4. `loadFromJSON` is always awaited. Never pass a callback (it is a reviver in Fabric 6+).
5. Always pass `originX`/`originY` when constructing Fabric objects (Fabric 7 defaults to center).

## Slice pattern rules

1. **One store.** Add slices to `combinedSlice` in `src/store/index.ts`; never create a second zustand store.
2. **Keys must be unique across all slices.** Grep before adding a key; `src/__tests__/storeKeys.test.ts` fails on a
   duplicate key or a slice spread twice. Prefix feature-specific fields (`brushOpacity`, `filterOpacity`).
3. **Fabric is the source of truth for document content.** Store fields mirror UI state (selection, tool, panel
   values). Derived lists (layers) are rebuilt from the canvas, not edited in place.
4. **Mutations go through actions.** Components call `useStore.getState().action()` or a selected action. They do not
   mutate Fabric objects directly (existing violations: `CanvasBoard` floating toolbar, `Editor.tsx` brush effect).
5. Every action that changes the document must: (a) mutate Fabric, (b) `canvas.requestRenderAll()`, (c) record
   history (canvas events record it; `saveState()` for changes that fire none), (d) let autosave run (do not call
   `canvas.clear()` without `persistLock`/`importJSON`). Autosave saves the whole project; state that lives outside
   the canvas but belongs to the document (pages, animation tracks) must call `persist()` when it changes.
6. Cross-slice calls: `get().otherAction?.()` with optional call only for truly optional slices. Document the
   dependency in STATE.md.
7. Canvas listeners: register in one function, keep disposers, and unregister on `dispose`. Ignore helper objects
   (`excludeFromExport`) and events during `isPageSwitching`/`_isRestoring`.
8. Selectors: `useStore((s) => s.key)`; for several keys use `useShallow`. **Never** `useStore()` with no selector.
9. No module-level mutable state in slices (it leaks between store instances and tests); use closure variables
   inside the creator.
10. Never rename a public slice key without approval (CLAUDE.md "How we work").

## Error handling

- Store actions never throw to React. Wrap I/O (storage, file parsing, `loadFromJSON`, export) in `try/catch`,
  `console.error('[slice] message', err)`, and return a falsy value (`false`/`null`), as `createPagesSlice` does.
- Guard on missing canvas first: `const canvas = get().canvas; if (!canvas) return;`.
- User-visible failures: set a status field (e.g. `exportState`), `get().showToast({ message })`, or
  `get().alertDialog({ title, message })`. Never `window.alert/confirm/prompt` (a test fails on them).
- Destructive actions (Q11): make them **one undo step** (`saveState(true)` before, `pauseHistory()` while replacing,
  `resumeHistory()` + `saveState(true)` after) and offer Undo:
  `get().showToast({ message, actionLabel: 'Undo', onAction: () => get().undo() })` (see `applyDesignTemplate`).
  Actions that also delete saved data (New board, delete page) keep a `confirmDialog({ …, tone: 'danger' })`.
- Keyboard: add shortcuts as commands (`shortcut`, extra `keys`, `enabled()` = leave the key to the browser when not
  available, `allowWhileTyping` for text styling). Any other canvas key listener returns early when
  `canvasKeysBlocked()` (a modal is open). A panel that handles keys itself calls `stopPropagation` for them.
- Render errors: the routed pages sit in `ErrorBoundary` (RootLayout); do not add per-panel boundaries that hide
  errors silently.
- New modals: build on `molecules/Modal.tsx` (+ `ModalButton`) so every modal shares the theme, focus trap, Escape,
  backdrop and key isolation.

## How to add a new slice

1. Create `src/store/slices/create<Name>Slice.ts`:
   ```ts
   import type { SliceCreator } from '../types';
   export interface NameSlice { nameValue: number; setNameValue: (v: number) => void }
   export const createNameSlice: SliceCreator<NameSlice> = (set, get) => ({
       nameValue: 0,
       setNameValue: (v) => set({ nameValue: v }),
   });
   ```
   Existing slices pass a 3rd devtools action name (`set(p, false, 'page/setZoom')`). `SliceCreator` is not typed with
   the devtools mutator, so whether that type-checks is **UNKNOWN - verify** once `type-check` really runs (BUG-012).
2. Check every key against STATE.md and `grep -rn "\bnameValue\b" src`.
3. Spread it in `combinedSlice` **before** `createAnimationSlice` (keep Animation last until BUG-001 is fixed).
4. Add `src/store/slices/__tests__/create<Name>Slice.test.ts` (see TESTING.md template).
5. Add a section to `docs/STATE.md` and, if UI uses it, a row in `docs/COMPONENTS.md`.

## How to add a new panel

**Left sidebar panel:**
1. Create `src/components/organisms/<feature>/ui/<Feature>Panel.tsx` (+ `index.ts`). Read state with selectors;
   call store actions.
2. Add an item to `organisms/editorsidebar/editorsidebar.config.tsx`:
   `{ id: '<feature>', label, icon: 'fa-solid fa-…', kind: 'panel', panel: <FeaturePanel />, activateTool?: '<tool>' }`.
3. If it needs props, wrap it in a small container component that reads them from the store. Do not render a
   props-driven panel without props (BUG-041).

**Right dock tab:** add `{ id, label, icon, closable, content: () => <Panel/> }` to `components/config/tabs.config.tsx`.

Then add an RTL test (TESTING.md) and a row in COMPONENTS.md.

## How to add a new tool

A tool is a value of `activeTool` (Canvas slice) that changes pointer behaviour.

1. Extend `CanvasTool` in `createCanvasSlice.ts` and `EditorTool` in `organisms/editorsidebar/editorsidebar.type.ts`.
2. Add a `case` in `setActiveTool` that configures `canvas.isDrawingMode/selection/skipTargetFind/defaultCursor`
   and attaches handlers. Pair it with cleanup in the reset section at the top of `setActiveTool` (the next tool
   must undo it).
3. Add a sidebar item: `kind: 'action'` for a pure tool, or `kind: 'panel'` with `activateTool` for a tool with
   options.
4. Keyboard shortcut: add a command `{ id, label, shortcut: shortcut('⌘X', 'Ctrl+x'), handler: ({get}) => get().setActiveTool('<tool>') }`
   to a `components/config/toolbars/ui/*Config.tsx` that is part of `commandRegistry`. Make sure the shortcut is free:
   check all `*BarConfig.tsx`, the Animation panel (`animation/animation.logic.ts` `keyCommand`), `DrawPanel` (`[`/`]`), `PagePanel` (PageUp/Down),
   `ExtraBar` (Ctrl+' / Ctrl+;), `createNodeEditorSlice`.
5. Tests: a unit test for `setActiveTool('<tool>')` flags and an E2E for the pointer flow.
6. Update CANVAS.md (events) and COMPONENTS.md.

## Git: branches and commits

Applied by skill `fate-ship` and checked by `.claude/skills/fate-ship/scripts/validate.mjs`
(`src/__tests__/gitConventions.test.ts`). Not yet enforced by a git hook for humans (no commitlint): UNKNOWN -
verify whether the owner wants a `commit-msg` hook.

- **Work on a branch, never on `main`.** Changes reach `main` through a pull request and the `CI passed` check.
- **Branch**: `<type>/<ticket>-<short-description>`, lowercase kebab-case, ≤ 60 chars, ticket optional:
  `fix/bug-204-slider-late-input`, `feat/gallery-tutorial-pages`, `refactor/r-03-split-layers-panel`,
  `release/1.4.0`. Types = the commit types below + `hotfix`, `release`. Branches pushed before this rule
  (`feature/newAgentSystem`) keep their names.
- **Commit message**: [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/):

  ```
  fix(slider): ignore late input after release in Firefox

  Firefox fires one more `input` event after `pointerup`, which moved the
  value back to where the drag started. Ignore input once the drag ended.

  Refs: BUG-204
  ```

  - Header `<type>(<scope>)!: <subject>` ≤ 72 chars. Types: `feat`, `fix`, `perf`, `refactor`, `test`,
    `docs`, `build`, `ci`, `chore`, `style`, `revert`. Scope = area in lowercase kebab-case (`store`, `canvas`,
    `seo`, `e2e`, `claude`, …), optional.
  - Subject in the imperative mood ("add", not "added" / "adds"), lowercase first letter, no final period.
  - Blank line, then a body that says **why** (lines ≤ 100). Footers: `Refs: BUG-xxx, R-xx`;
    `BREAKING CHANGE: …` (with `!`) only for an owner-approved public API change.
  - No `wip`, `fixup!` or `squash!` commits on a pushed branch.
- **Never**: `--no-verify`, force push (`--force-with-lease` only with the owner's OK), committing `.env*`
  (except `.env.example`), keys, build output or `CLAUDE.local.md`.
