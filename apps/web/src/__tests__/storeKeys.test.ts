/**
 * BUG-002: the store is ONE object spread from every slice; a key defined by two slices silently
 * belongs to whichever is spread last. Every key must be unique, and every slice spread once.
 * Reads the spread order straight from `src/store/index.ts`, so a new slice is checked too.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import '@/store'; // load the real module graph first (slices import each other)

const INDEX = import.meta.glob<string>('/src/store/index.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
})['/src/store/index.ts'];

const SLICE_MODULES = import.meta.glob<Record<string, unknown>>('/src/store/slices/*.ts', {
    eager: true,
});

const spreadOrder = (): string[] =>
    [...INDEX.matchAll(/\.\.\.(\w+)\(set, get, store\)/g)].map((m) => m[1]);

const creators = (): Record<string, (...args: any[]) => Record<string, unknown>> => {
    const out: Record<string, any> = {};
    for (const mod of Object.values(SLICE_MODULES))
        for (const [name, value] of Object.entries(mod))
            if (typeof value === 'function') out[name] = value;
    return out;
};

describe('store keys (BUG-002)', () => {
    it('spreads every slice exactly once', () => {
        const order = spreadOrder();
        expect(order.length).toBeGreaterThan(20);
        const twice = order.filter((name, i) => order.indexOf(name) !== i);
        expect(twice).toEqual([]);
    });

    it('no key is defined by two slices', () => {
        const all = creators();
        const fakeStore = { getState: () => ({}), setState: () => {}, subscribe: () => () => {} };
        const owners: Record<string, string[]> = {};
        for (const name of new Set(spreadOrder())) {
            const create = all[name];
            expect(create, `slice creator ${name}`).toBeTypeOf('function');
            const slice = create(
                () => undefined,
                () => ({}),
                fakeStore,
            );
            for (const key of Object.keys(slice)) (owners[key] ??= []).push(name);
        }
        const collisions = Object.entries(owners)
            .filter(([, by]) => by.length > 1)
            .map(([key, by]) => `${key}: ${by.join(' -> ')}`);
        expect(collisions).toEqual([]);
    });
});
