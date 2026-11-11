/**
 * The storage layer: the only module the app imports for persistence (`@/lib/storage`).
 *
 *   app (slices, panels)  ->  domain stores (projectStorage, settingsStorage, localList, flags)
 *                         ->  contracts (./types: KeyValueBackend, SyncKeyValue, LegacySource)
 *                         ->  adapters (./adapters: opendb IndexedDB, opendb localStorage, memory)
 *
 * The wiring below is the one place that picks a library. To change it (another library, a server
 * sync), write an adapter that implements the contract and swap it here.
 * `src/__tests__/storageBoundary.test.ts` keeps opendb-store and the browser storage APIs inside
 * this folder.
 */
import { createLegacyIndexedDbSource } from './adapters/legacyIndexedDb';
import { createMemoryBackend } from './adapters/memory';
import { createOpendbBackend } from './adapters/opendbIndexed';
import { createOpendbSyncStore } from './adapters/opendbLocal';
import { createProjectStorage } from './projectStorage';
import { createSettingsStorage } from './settingsStorage';

/** IndexedDB database of the opendb store (projects). */
export const PROJECT_DATABASE = 'fateboard-data';
/** The hand-written IndexedDB layout before opendb-store 3: adopted once, then deleted. */
const LEGACY_DATABASE = { database: 'fateboard', store: 'kv' };

const preferences = createOpendbSyncStore();

export const projectStorage = createProjectStorage(() =>
    typeof indexedDB !== 'undefined'
        ? {
              backend: createOpendbBackend({ database: PROJECT_DATABASE }),
              legacy: createLegacyIndexedDbSource(LEGACY_DATABASE),
              prefs: preferences,
          }
        : // jsdom / no IndexedDB: works for the session, nothing is kept
          { backend: createMemoryBackend(), legacy: null, prefs: preferences },
);

export const settingsStorage = createSettingsStorage(() => preferences);

export type { KeyValueBackend, LegacySource, SyncKeyValue } from './types';
export { createMemoryBackend, createMemorySyncStore } from './adapters/memory';
export {
    LEGACY_DRAW_KEY,
    PROJECT_KEY,
    UNREADABLE_KEY,
    createProjectStorage,
    type ProjectDoc,
    type ProjectStorage,
    type StoredBoard,
} from './projectStorage';
export {
    CANVAS_SIZE_PENDING_KEY,
    SETTINGS_KEY,
    createSettingsStorage,
    type SettingsStorage,
} from './settingsStorage';
export { readLocalList, writeLocalList } from './localList';
export { readSessionFlag, writeSessionFlag } from './sessionFlags';
