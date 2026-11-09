/**
 * Run one or more slice creators against a tiny in-memory store, without zustand or React.
 * Mirrors how `combinedSlice` composes slices: every creator gets the same set/get/store.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Creator = (set: any, get: any, store: any) => Record<string, any>;

export interface Harness<S = any> {
    get: () => S;
    set: (partial: any) => void;
    /** every `set` call, newest last (useful to assert devtools action names) */
    calls: { partial: any; replace?: unknown; action?: unknown }[];
}

export function createHarness<S = any>(
    creators: Creator[],
    extra: Record<string, any> = {},
): Harness<S> {
    let state: any = { ...extra };
    const calls: Harness['calls'] = [];
    const listeners = new Set<(s: any, p: any) => void>();
    const set = (partial: any, replace?: unknown, action?: unknown) => {
        calls.push({ partial, replace, action });
        const prev = state;
        const next = typeof partial === 'function' ? partial(state) : partial;
        state = replace === true ? next : { ...state, ...next };
        listeners.forEach((l) => l(state, prev));
    };
    const get = () => state;
    const store = {
        getState: get,
        setState: set,
        subscribe: (l: (s: any, p: any) => void) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
    };
    for (const create of creators) state = { ...state, ...create(set, get, store) };
    return { get, set, calls };
}

export const tick = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));
