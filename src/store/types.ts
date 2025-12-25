import type { StateCreator } from 'zustand';

// Reusable slice creator type that avoids circular `RootState` references.
// Slices should use `SliceCreator<MySlice>` instead of referencing `RootState`.
export type SliceCreator<T> = StateCreator<any, [], [], T>;

// After the store is created we export a proper RootState alias in `src/store/index.ts`.

export {};
