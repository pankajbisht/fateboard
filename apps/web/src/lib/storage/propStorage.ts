import { createLibrary } from './libraryStorage';
import type { KeyValueBackend } from './types';

/**
 * Scene Objects storage (docs/PROPS.md phase 6): the user's own props (imported SVG / PNG). Values are returned
 * unvalidated: the props slice parses them (`parseUserProp`), and entries it cannot read are kept.
 */
export const PROP_LIBRARY_KEY = 'propLibrary';

export function createPropStorage(backend: () => KeyValueBackend) {
    const lib = createLibrary(backend, PROP_LIBRARY_KEY);
    return {
        loadLibrary: lib.load,
        /** Adds the prop or replaces the one with its id. */
        upsert: lib.upsert,
        remove: lib.remove,
    };
}

export type PropStorage = ReturnType<typeof createPropStorage>;
