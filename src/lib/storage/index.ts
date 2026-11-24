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
import { createUiPrefsStorage } from './uiPrefs';
import { createCharacterStorage } from './characterStorage';
import { createSceneStorage } from './sceneStorage';
import type { KeyValueBackend } from './types';

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

/** View preferences per browser (dock sizes, overlays): not part of any document. */
export const uiPrefsStorage = createUiPrefsStorage(() => preferences);

let characterBackend: KeyValueBackend | null = null;
/** Character Studio library + draft, in the project database (memory in tests / without IndexedDB). */
const projectBackend = () =>
    (characterBackend ??=
        typeof indexedDB !== 'undefined'
            ? createOpendbBackend({ database: PROJECT_DATABASE })
            : createMemoryBackend());
export const characterStorage = createCharacterStorage(projectBackend);
/** Scene Studio draft, in the same project database. */
export const sceneStorage = createSceneStorage(projectBackend);

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
export { UI_PREFS_KEY, createUiPrefsStorage, type UiPrefsStorage } from './uiPrefs';
export {
    CHARACTER_DRAFT_KEY,
    CHARACTER_LIBRARY_KEY,
    createCharacterStorage,
    type CharacterStorage,
} from './characterStorage';
export {
    SCENE_DRAFT_KEY,
    SCENE_LIBRARY_KEY,
    createSceneStorage,
    type SceneStorage,
} from './sceneStorage';
export { readLocalList, writeLocalList } from './localList';
export { readSessionFlag, writeSessionFlag } from './sessionFlags';
