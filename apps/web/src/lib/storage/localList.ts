/**
 * Small per-browser libraries (custom shapes, patterns, font templates) in localStorage, through one
 * helper (BUG-036): keys are `fateboard:<name>`, values a version envelope `{ v, items }`, old keys
 * are migrated once and removed, and nothing ever throws (blocked / full / corrupt storage).
 * Documents themselves live in IndexedDB (`projectStorage`); settings in `fateboard-settings`.
 */
const VERSION = 1;
const keyOf = (name: string) => `fateboard:${name}`;

const parseItems = (raw: string | null): unknown[] | null => {
    if (!raw) return null;
    try {
        const data: unknown = JSON.parse(raw);
        if (Array.isArray(data)) return data; // legacy: a bare array
        const items = (data as { items?: unknown } | null)?.items;
        return Array.isArray(items) ? items : null;
    } catch {
        return null;
    }
};

export function writeLocalList<T>(name: string, items: readonly T[]): boolean {
    try {
        localStorage.setItem(keyOf(name), JSON.stringify({ v: VERSION, items }));
        return true;
    } catch (error) {
        console.warn(`[storage] could not save "${name}" (storage full or blocked)`, error);
        return false;
    }
}

/** Valid items of the list; `legacyKeys` are read (and moved) when the new key is empty. */
export function readLocalList<T>(
    name: string,
    isItem: (value: unknown) => value is T,
    legacyKeys: readonly string[] = [],
): T[] {
    try {
        const current = parseItems(localStorage.getItem(keyOf(name)));
        if (current) return current.filter(isItem);
        for (const legacy of legacyKeys) {
            const old = parseItems(localStorage.getItem(legacy));
            if (!old) continue;
            const items = old.filter(isItem);
            if (writeLocalList(name, items)) localStorage.removeItem(legacy);
            return items;
        }
    } catch {
        /* storage blocked: start empty */
    }
    return [];
}
