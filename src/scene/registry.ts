/**
 * A catalogue of content (environments, formations, views, …): unique ids, lookup with a fallback, search by
 * name and tags. Content is data; every registry has a contract test that runs over all its entries.
 */
export interface Entry {
    id: string;
    name: string;
    tags?: readonly string[];
}

export interface Registry<T extends Entry> {
    readonly all: readonly T[];
    has(id: string): boolean;
    /** the entry, or the fallback for an unknown id (old or foreign data still renders) */
    get(id: string): T;
    /** entries whose name or tags contain every word of the query */
    search(query: string): T[];
}

export function createRegistry<T extends Entry>(
    entries: readonly T[],
    fallbackId: string,
): Registry<T> {
    const map = new Map<string, T>();
    for (const e of entries) {
        if (map.has(e.id))
            console.error(`[scene] duplicate registry id "${e.id}"; the first one is kept`);
        else map.set(e.id, e);
    }
    const fallback = map.get(fallbackId) ?? entries[0];
    return {
        all: entries,
        has: (id) => map.has(id),
        get: (id) => map.get(id) ?? fallback,
        search(query) {
            const words = query.toLowerCase().split(/\s+/).filter(Boolean);
            if (!words.length) return [...entries];
            return entries.filter((e) => {
                const text = `${e.name} ${e.id} ${(e.tags ?? []).join(' ')}`.toLowerCase();
                return words.every((w) => text.includes(w));
            });
        },
    };
}
