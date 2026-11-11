import { createIndexedStore, type StoreError } from 'opendb-store/indexeddb';
import type { KeyValueBackend } from '../types';

/**
 * `KeyValueBackend` over opendb-store's IndexedDB store.
 *
 * opendb promises never reject: a failed read returns `null` (same as "not saved"), a failed write
 * returns `false`, and a database that cannot be opened (private mode, sandboxed frame, a stuck
 * open) silently becomes memory for the rest of the session. Every failure is reported to
 * `onError`, so this adapter turns failures back into rejections:
 * - any failure reported while a call runs rejects that call (a concurrent failure may reject a
 *   neighbour too: a false alarm is safe, a hidden failure is not);
 * - after the memory fallback (`STORAGE_UNAVAILABLE` with no cause), every call rejects, because
 *   nothing would reach the disk.
 * `src/lib/storage/__tests__/opendbBackend.test.ts` pins this against the real library.
 *
 * `null` values are not supported (opendb reads them as missing); documents are objects.
 */
export function createOpendbBackend({
    database,
    namespace = 'fateboard',
}: {
    database: string;
    namespace?: string;
}): KeyValueBackend {
    let failures = 0;
    let lastError: StoreError | undefined;
    let unavailable: StoreError | undefined;

    const store = createIndexedStore({
        database,
        namespace,
        onError: (error) => {
            failures += 1;
            lastError = error;
            if (error.code === 'STORAGE_UNAVAILABLE' && error.cause === undefined) {
                unavailable = error;
            }
        },
    });

    const call = async <T>(
        what: 'read' | 'write' | 'delete',
        key: string,
        work: () => Promise<T>,
        succeeded: (result: T) => boolean = () => true,
    ): Promise<T> => {
        const before = failures;
        const result = unavailable ? undefined : await work();
        if (unavailable || failures !== before || !succeeded(result as T)) {
            throw new Error(`[storage] IndexedDB ${what} of "${key}" failed`, {
                cause: unavailable ?? lastError,
            });
        }
        return result as T;
    };

    return {
        get: async (key) => {
            const value = await call('read', key, () => store.get(key));
            return value === null ? undefined : value;
        },
        set: async (key, value) => {
            await call(
                'write',
                key,
                () => store.set(key, value),
                (ok) => ok,
            );
        },
        delete: async (key) => {
            await call('delete', key, () => store.remove(key));
        },
    };
}
