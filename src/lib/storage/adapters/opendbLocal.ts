import { local } from 'opendb-store';
import type { SyncKeyValue } from '../types';

/**
 * `SyncKeyValue` over opendb-store's localStorage store (namespace `app`, so keys written by
 * opendb-store 2 still read: `app.<key>` = `{"value": ...}`).
 */
export function createOpendbSyncStore(): SyncKeyValue {
    return {
        get: (key) => {
            try {
                return local.get(key) ?? undefined;
            } catch {
                return undefined; // storage blocked
            }
        },
        set: (key, value) => {
            try {
                return local.set(key, value);
            } catch {
                return false;
            }
        },
        remove: (key) => {
            try {
                local.remove(key);
                return true;
            } catch {
                return false;
            }
        },
    };
}
