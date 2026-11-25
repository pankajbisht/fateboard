---
name: fate-new-slice
description: Add a new zustand slice (store state + actions) to the fateboard store correctly, test first. Use when a feature needs new store state or actions that do not belong in an existing slice, or when asked to create a slice in this repo.
---

# Add a slice to the fateboard store

Run inside skill `fate-task` (plan, failing test, verify, docs). Rules: `.claude/rules/zustand-slices.md`,
docs/CONVENTIONS.md "How to add a new slice". **Stop and ask** if the slice renames, moves or removes an existing
public key or action.

## 0. Does it need a new slice?
List the slices (`grep -n '^## ' docs/STATE.md`) and read only the candidate's section. If an existing slice owns the domain, add to it instead (watch its size ceiling in
`fileBudget.test.ts`; a slice over 400 lines is split with skill `fate-refactor`, not grown). A new slice is right
for a new domain with its own state and lifecycle.

## 1. Choose keys that cannot collide
List every key (state and actions). For each: `grep -rnw "<key>" src/store` must find nothing. Prefix
feature-specific names (`gridStyle`, not `style`). `storeKeys.test.ts` fails on any duplicate.

## 2. Write the failing test first
`src/store/slices/__tests__/create<Name>Slice.test.ts`, with the harness (no zustand, no React):

```ts
import { describe, expect, it } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas'; // only if it touches the canvas
import { create<Name>Slice } from '../create<Name>Slice';

const make = () => createHarness([create<Name>Slice as never], { canvas: null });

describe('<name> slice', () => {
    it('starts with <default>', () => expect(make().get().<key>).toBe(<default>));
    it('<action> does <effect>', () => { /* act, then assert state and canvas */ });
    it('does nothing without a canvas', () => { /* guard path returns falsy, no throw */ });
});
```
Include the slices it calls through `get()` in the harness. Run it: it fails because the module does not exist.

## 3. Implement `src/store/slices/create<Name>Slice.ts`
```ts
import type { SliceCreator } from '../types';

export interface <Name>Slice {
    <key>: <Type>;
    set<Key>: (value: <Type>) => void;
}

export const create<Name>Slice: SliceCreator<<Name>Slice> = (set, get) => ({
    <key>: <default>,
    set<Key>: (value) => set({ <key>: value }, false, '<name>/set<Key>'),
});
```
- No module-level mutable state; closures inside the creator.
- Canvas work: guard `get().canvas`, mutate → `requestRenderAll()` → history → autosave (CANVAS.md).
- I/O in `try/catch` + `console.error('[<name>] …', err)`, return falsy. No `any`.
- Persisted data: a function in `@/lib/storage`, never browser storage directly.

## 4. Register it
In `src/store/index.ts` import it and spread `...create<Name>Slice(set, get, store)` in `combinedSlice`
**before** `createAnimationSlice`. Do not reorder other slices.

## 5. Verify
`npx vitest run src/store src/__tests__/storeKeys.test.ts`, then `npm run check`, `npm run test:run`.
The Stop hook also runs type-check and the related tests.

## 6. Document
- docs/STATE.md: a section (purpose, keys, actions, cross-slice dependencies, persistence).
- docs/COMPONENTS.md: rows for components that read it.
- docs/DECISIONS.md: a log row if the slice embodies a design choice.
