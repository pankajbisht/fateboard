import type { KeyValueBackend, SyncKeyValue } from '../types';

/** In-memory document backend: tests, and environments without IndexedDB (jsdom). Not persistent. */
export function createMemoryBackend(): KeyValueBackend {
    const map = new Map<string, unknown>();
    return {
        async get(key) {
            return map.has(key) ? structuredClone(map.get(key)) : undefined;
        },
        async set(key, value) {
            map.set(key, structuredClone(value));
        },
        async delete(key) {
            map.delete(key);
        },
    };
}

/** In-memory preference store (tests). Not persistent. */
export function createMemorySyncStore(): SyncKeyValue {
    const map = new Map<string, unknown>();
    return {
        get: (key) => (map.has(key) ? structuredClone(map.get(key)) : undefined),
        set: (key, value) => {
            map.set(key, structuredClone(value));
            return true;
        },
        remove: (key) => {
            map.delete(key);
            return true;
        },
    };
}
