import { createLibrary } from './libraryStorage';
import type { KeyValueBackend } from './types';

/**
 * Fight combos (docs/COMBAT_PACK.md, Stage 4): the user's own saved sequences of exchanges. Values are returned
 * unvalidated: the fight slice parses them (`parseCombo`), and entries it cannot read are kept.
 */
export const COMBO_LIBRARY_KEY = 'fightCombos';

export function createComboStorage(backend: () => KeyValueBackend) {
    const lib = createLibrary(backend, COMBO_LIBRARY_KEY);
    return {
        loadLibrary: lib.load,
        /** Adds the combo or replaces the one with its id. */
        upsert: lib.upsert,
        remove: lib.remove,
    };
}

export type ComboStorage = ReturnType<typeof createComboStorage>;
