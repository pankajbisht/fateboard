import type { KeyValueBackend } from './types';

/**
 * A list of saved things under one key (saved characters, saved scenes). Every change is read-modify-write in the
 * storage layer: a failed read rejects before anything is written, so the stored list is never replaced by a
 * half-loaded one (BUG-154 pattern), and entries this app cannot read (a newer schema) are kept as they are.
 */
type Entry = { id?: unknown };
const idOf = (v: unknown) => (v && typeof v === 'object' ? (v as Entry).id : undefined);

export function createLibrary(backend: () => KeyValueBackend, key: string) {
    const load = async (): Promise<unknown[]> => {
        const v = await backend().get(key);
        return Array.isArray(v) ? v : [];
    };
    const change = async (fn: (list: unknown[]) => unknown[]) => {
        const next = fn(await load());
        await backend().set(key, next);
        return next;
    };
    return {
        load,
        save: (list: unknown[]) => backend().set(key, list),
        /** Adds the item or replaces the one with its id. */
        upsert: <T extends { id: string }>(item: T) =>
            change((list) =>
                list.some((x) => idOf(x) === item.id)
                    ? list.map((x) => (idOf(x) === item.id ? item : x))
                    : [...list, item],
            ),
        remove: (id: string) => change((list) => list.filter((x) => idOf(x) !== id)),
    };
}
