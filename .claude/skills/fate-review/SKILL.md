---
name: fate-review
description: Senior code review for the fateboard repo (Fabric.js canvas editor, React 19, zustand slices). Use when asked to review code, a diff, a branch, a PR, a file or a folder in this repo, or to check a change against the project rules before commit. Produces verified, ranked findings with file:line evidence; does not edit code unless asked.
---

# fateboard code review

You are reviewing as a senior engineer who owns this codebase's long-term health. Every finding must be
**verified** (you read the code or ran a command) and **actionable** (says what to change). No speculation, no
style nits that Prettier or ESLint already enforce.

## 0. Scope

- No argument: the current branch vs `main` plus the working tree (`git diff $(git merge-base HEAD main)`, and
  untracked files from `git status`).
- A path, PR number or branch: that target only.
- Known debt is in `docs/CODE_REVIEW.md` (R-xx) and `docs/BUGS.md` (BUG-xxx). Do not re-report it as new. Do
  report a change that makes it **worse** (a god file grows, a new `any`, a new layering violation).

## 1. Load the rules (always)

Read `CLAUDE.md`, then the sections of `docs/CONVENTIONS.md` and `docs/ARCHITECTURE.md` that the changed code
touches. Those rules are the contract; this checklist only points at them.

## 2. Measure

```
node .claude/skills/fate-review/scripts/metrics.mjs --changed
```

Flags are heuristics (size, state, effects, canvas calls, `any`, layering). Read the flagged code before you
report anything.

## 3. Review checklist (in priority order)

**P0: data safety and crashes**
- Document changes follow: mutate → `requestRenderAll()` → history (`saveState`) → autosave (`persist`). Bulk
  operations hold `persistLock` / `pauseHistory` and release them in `finally`.
- Storage only through `@/lib/storage`. A failed read must never look like "nothing saved" (BUG-154/173).
- Async races: canvas disposed or page switched while awaiting (`if (get().canvas !== canvas) return`).
- Actions never throw to React: `try/catch` + `console.error('[slice] …')` + falsy return.
- Security: no `innerHTML` / `dangerouslySetInnerHTML` / `eval`; values from opened files validated.

**P1: architecture rules (CLAUDE.md "Never do" + slice rules)**
- Dependency direction: `components → store → lib`. `store` and `lib` must not import `@/components/*`; `lib`
  must not import the store (BUG-048). Shared config/data belongs in `lib/` or `config/`, not `components/`.
- Only store actions mutate Fabric objects. A component calling `canvas.add/remove/set` is a finding.
- One store, unique keys, slice added before `createAnimationSlice`, no module-level mutable state in slices
  (use the creator's closure), canvas listeners registered once with disposers.
- Serialization only through `serializeCanvas` / `CUSTOM_PROPS`; loads only in canvas/pages slices.
- Helpers on the canvas: `excludeFromExport` + layer/snap exclusion flags.
- Geometry/zoom only through CanvasBoard + Page slice (`setZoom`, `zoomToRect`).

**P2: design and maintainability**
- Single responsibility: a component renders and wires; effects/subscriptions go in hooks
  (`useX.ts`); pure logic (math, parsing, export, formatting) goes in `lib/` with unit tests.
- Size budget: `.tsx` ≤ 300 lines, `.ts` ≤ 400 (`src/__tests__/fileBudget.test.ts`). A file over budget may not
  grow; new code goes into a new, focused module.
- Reuse before writing: design-system atoms (`Button`, `IconButton`, `PanelSection`, `Field`, `Select`, …),
  `lib/` helpers. A locally redefined `clamp`, `IconButton`, `Section` or `Field` is a finding.
- TypeScript: no new `any` (lint ratchet), typed props, discriminated unions over boolean soup; a folder that
  passes `tsconfig.strict.json` should be added to it.
- React: selector per value (`useStore((s) => s.x)`), effect cleanup, stable deps, `memo` for long lists,
  no derived state copied into `useState`.
- Patterns already in use (prefer them over new ones): slice creator + closure state; command objects for
  shortcuts (`shortcut`, `keys`, `enabled`); contract + adapter for storage (`lib/storage`); guard tests for
  architecture rules.

**P3: tests and docs (Definition of done)**
- A test that fails without the change (unit/RTL; Playwright for user flows). Refactors: characterization
  tests first, unchanged afterwards.
- `docs/` updated; bugs marked in `docs/BUGS.md`; decisions in `docs/DECISIONS.md`.

## 4. Verify before reporting

For each candidate finding, write the concrete failure: inputs/state → wrong result. If you cannot, drop it or
mark it `PLAUSIBLE` with what would confirm it. Prefer 5 real findings over 20 guesses.

## 5. Report

Group by severity (P0 → P3). For each finding:

```
[P1] <one-line defect>  (src/path/file.ts:123)
Rule: <CLAUDE.md / CONVENTIONS / principle>
Failure: <inputs/state → what goes wrong>
Fix: <the smallest correct change; name the pattern or existing helper>
Verdict: CONFIRMED | PLAUSIBLE
```

End with: files reviewed, commands run, and what you did **not** review. If the host offers a findings tool
(`ReportFindings`) and the user asked for a code review, report through it instead of text.
