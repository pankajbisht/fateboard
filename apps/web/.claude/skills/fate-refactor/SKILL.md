---
name: fate-refactor
description: Safely split a god component, god slice or oversized module in the fateboard repo without changing behaviour. Use when asked to refactor, split, decompose, clean up or reduce the size of a file in this repo, or to work an item from the refactor roadmap in docs/CODE_REVIEW.md.
---

# Refactor a large fateboard file without changing behaviour

A refactor here is **behaviour-preserving**. If the task also needs a behaviour change, do the refactor first,
land it green, then change behaviour in a separate step with its own failing test.

## Rules

- **One file (or one cohesive feature) per task.** Pick it from the roadmap in `docs/CODE_REVIEW.md`.
- **Public slice API is frozen.** Store keys and actions used by components or other slices keep their names
  and signatures (ask the owner before any rename, CLAUDE.md). Moving the *implementation* is fine.
- **No drive-by changes**: no reformatting of untouched code, no new features, no dependency upgrades.

## Procedure

1. **Plan** (write it down before editing): current responsibilities of the file (list them), target modules
   with their single responsibility, what moves where, which tests pin the behaviour. Ask the `fate-architect`
   agent for the plan when the file is over ~800 lines.
2. **Characterization tests first.** Before moving code, make sure the behaviour is pinned:
   slices → `src/test/sliceHarness.ts` + `src/test/fakeCanvas.ts`; components → RTL; user flows → the matching
   `e2e/*.spec.ts`. Add what is missing and see it pass on the old code.
3. **Extract in this order**, running the focused tests after each step:
   1. **Pure logic → `src/lib/<domain>/`** (geometry, parsing, export, formatting, presets). Pure functions, typed,
      unit-tested, no React, no store. Candidates: path math in `createNodeEditorSlice`, raster/SVG export in
      `ExportCanvas`, timecode/keyframe math in `AnimationPanel`.
   2. **Constants and option tables → a sibling `*.config.ts`.**
   3. **Effects and subscriptions → hooks** (`useX.ts` next to the component), each with one job and a cleanup.
   4. **Sub-components → their own files** in a feature folder:
      ```
      organisms/<feature>/
        <Feature>Panel.tsx      composition only: reads store with selectors, passes props down
        components/<Part>.tsx   presentational, props in, callbacks out
        use<Thing>.ts           effects / canvas subscriptions
        <feature>.logic.ts      pure functions (or in src/lib/<domain>/ when shared)
        <feature>.config.ts     constants, option lists
      ```
   5. **Fabric mutations found in a component → a store action** (rule: only store actions mutate Fabric), with
      history and autosave like every other document change.
   6. **Module-level `let`/`Map` in a slice → the slice creator's closure** (rule 6).
4. **Replace local duplicates** with existing atoms/helpers (`IconButton`, `PanelSection`, `Field`, a shared
   `clamp` in `src/lib/utils`), never the other way round.
5. **Gates**: `npm run check`, `npm run test:run`, `npm run build`, and the E2E specs for the feature
   (`npm run e2e -- <spec> --workers=2`). Behaviour tests must pass **unchanged**.
6. **Ratchets**: lower or delete the file's line in `LEGACY_CEILINGS` (`src/__tests__/fileBudget.test.ts`); add new
   folders that pass strict mode to `tsconfig.strict.json`; lower `--max-warnings` if `any`s were removed.
7. **Docs**: `docs/COMPONENTS.md` / `docs/STATE.md` for moved code, the roadmap row in `docs/CODE_REVIEW.md`.

## Anti-patterns

- A `utils.ts` dumping ground, or a generic abstraction with one caller.
- Splitting by file length instead of by responsibility (two halves of one concern in two files).
- Prop drilling more than two levels: read the store with a selector in the child instead.
- Re-export barrels that hide where code lives (exception: a module's single public entry, like `@/lib/storage`).
- Changing behaviour "while we're here".
