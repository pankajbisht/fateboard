/**
 * Shared store for the big embedded files inside canvas snapshots (BUG-155).
 *
 * A photo is saved inside the document as a `data:` URL (BUG-121), often several MB. Undo keeps
 * up to 21 snapshots per page, and each one used to hold its own copy of every photo. Here a
 * snapshot holds a short token instead, and the photo itself is kept once for all snapshots.
 *
 * Tokens carry a random id made per store, so text typed by a user or read from a file can never
 * be mistaken for one.
 */

/** Shorter values are cheaper to copy than to look up. */
const MIN_ASSET_LENGTH = 2048;

export interface SnapshotAssets {
    /** `JSON.stringify(value)` with every large `data:` URL replaced by its token. */
    stringify: (value: unknown) => string;
    /** `JSON.parse(text)` with every token replaced by its `data:` URL. */
    parse: (text: string) => unknown;
    /** Forgets every asset that none of `snapshots` uses. Call when snapshots are dropped. */
    prune: (snapshots: Iterable<string>) => void;
    /** Number of assets held. */
    size: () => number;
}

export function createSnapshotAssets(): SnapshotAssets {
    const prefix = `fateboard-asset:${crypto.randomUUID()}:`;
    const tokenBySource = new Map<string, string>();
    const sourceByToken = new Map<string, string>();
    let count = 0;

    const tokenOf = (source: string): string => {
        let token = tokenBySource.get(source);
        if (!token) {
            token = `${prefix}${++count}`;
            tokenBySource.set(source, token);
            sourceByToken.set(token, source);
        }
        return token;
    };

    return {
        stringify: (value) =>
            JSON.stringify(value, (_key, item: unknown) =>
                typeof item === 'string' &&
                item.length >= MIN_ASSET_LENGTH &&
                item.startsWith('data:')
                    ? tokenOf(item)
                    : item,
            ),

        parse: (text) =>
            JSON.parse(text, (_key, item: unknown) =>
                typeof item === 'string' && item.startsWith(prefix)
                    ? (sourceByToken.get(item) ?? item)
                    : item,
            ),

        prune: (snapshots) => {
            if (!sourceByToken.size) return;
            const used = new Set<string>();
            for (const text of snapshots) {
                let at = text.indexOf(prefix);
                while (at !== -1) {
                    let end = at + prefix.length;
                    while (end < text.length && text[end] >= '0' && text[end] <= '9') end++;
                    used.add(text.slice(at, end));
                    at = text.indexOf(prefix, end);
                }
            }
            for (const [token, source] of sourceByToken) {
                if (used.has(token)) continue;
                sourceByToken.delete(token);
                tokenBySource.delete(source);
            }
        },

        size: () => sourceByToken.size,
    };
}
