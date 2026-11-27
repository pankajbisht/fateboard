/**
 * Runs one write at a time; while one runs, only the NEWEST waiting value is kept. IndexedDB keeps the
 * order of overlapping writes, but every `put` structured-clones the whole project on the main thread,
 * so a burst of edits paid for every snapshot instead of the last one.
 */
export function createLatestWriter<T>(
    write: (value: T) => Promise<void>,
    hooks: { onSaved?: () => void; onError?: (error: unknown) => void } = {},
) {
    let active = 0; // writes in flight (more than one only after a flush)
    let waiting: { value: T } | null = null;

    const run = async (value: T): Promise<void> => {
        active++;
        try {
            await write(value);
            hooks.onSaved?.();
        } catch (error) {
            hooks.onError?.(error);
        } finally {
            active--;
            const next = active === 0 ? waiting : null;
            if (next) {
                waiting = null;
                void run(next.value);
            }
        }
    };

    return {
        /** Save `value` now, or after the running write (replacing any older waiting value). */
        write(value: T): void {
            if (active > 0) waiting = { value };
            else void run(value);
        },
        /**
         * Save `value` NOW, even while a write runs (closing tab: a queued write may never start). The
         * waiting value is dropped, `value` is newer. IndexedDB keeps the order of the two writes.
         */
        flush(value: T): void {
            waiting = null;
            void run(value);
        },
        /** A write is running or waiting. */
        busy: (): boolean => active > 0 || waiting !== null,
    };
}
