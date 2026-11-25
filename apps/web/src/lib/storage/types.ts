/**
 * The storage contracts. Domain stores (`projectStorage`, `settingsStorage`) depend on these
 * interfaces only; adapters in `./adapters` implement them. To use another library or a server,
 * write one adapter and pass it in `./index.ts`; nothing else changes.
 */

/**
 * Durable async key/value storage for documents.
 * `get` reads a missing key as `undefined`. Every method REJECTS on failure: a failed read must
 * never look like "nothing saved", or the next autosave replaces the user's board (BUG-154).
 */
export interface KeyValueBackend {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
}

/**
 * Small synchronous storage for preferences and flags. Never throws: an unreadable or missing key
 * reads as `undefined`; `set` / `remove` return false when the write did not happen.
 */
export interface SyncKeyValue {
    get(key: string): unknown;
    set(key: string, value: unknown): boolean;
    remove(key: string): boolean;
}

/** Data in an older storage layout, copied into the current backend once and then discarded. */
export interface LegacySource {
    /** Every entry of the old layout, or `null` when there is nothing there. Rejects on failure. */
    read(): Promise<Record<string, unknown> | null>;
    discard(): Promise<void>;
}
