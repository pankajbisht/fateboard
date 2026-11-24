import type { StateCreator } from 'zustand';

// Reusable slice creator type that avoids circular `RootState` references.
// Slices should use `SliceCreator<MySlice>` instead of referencing `RootState`.
// Typed with the devtools mutator so `set(partial, replace, actionName)` type-checks.
export type SliceCreator<T> = StateCreator<any, [['zustand/devtools', never]], [], T>;

// After the store is created we export a proper RootState alias in `src/store/index.ts`.

export {};
