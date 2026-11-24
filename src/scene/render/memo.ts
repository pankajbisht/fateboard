/**
 * A small least-recently-used cache. The scene renderer is pure; these caches only skip work whose inputs did
 * not change (dragging one actor re-renders that actor, not the set and the others). Bounded, so memory stays flat.
 */
export function lru<V>(size: number) {
    const map = new Map<string, V>();
    return {
        get(key: string): V | undefined {
            const v = map.get(key);
            if (v !== undefined) {
                map.delete(key);
                map.set(key, v);
            }
            return v;
        },
        set(key: string, value: V) {
            map.set(key, value);
            if (map.size > size) map.delete(map.keys().next().value as string);
        },
    };
}
