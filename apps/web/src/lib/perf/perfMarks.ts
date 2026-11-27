/**
 * Timing marks for the DevTools Performance panel ("Timings") and for E2E budgets
 * (docs/PERFORMANCE_AUDIT.md P11). On in development and with `?perf` in the URL; otherwise each call costs
 * one boolean check. Read them with `performance.getEntriesByName('fate:<name>')`.
 */
const enabled =
    typeof performance !== 'undefined' &&
    typeof performance.measure === 'function' &&
    (import.meta.env.DEV || /[?&]perf(=|&|$)/.test(globalThis.location?.search ?? ''));

/** Measures are kept by the browser until cleared: keep the newest ones only. */
const MAX_ENTRIES = 500;
let count = 0;

function record(name: string, start: number) {
    performance.measure(`fate:${name}`, { start, end: performance.now() });
    if (++count > MAX_ENTRIES) {
        performance.clearMeasures();
        count = 0;
    }
}

/** Run `fn` and record it as `fate:<name>`. */
export function timed<T>(name: string, fn: () => T): T {
    if (!enabled) return fn();
    const start = performance.now();
    try {
        return fn();
    } finally {
        record(name, start);
    }
}

/** Same for async work (until it settles). */
export async function timedAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!enabled) return fn();
    const start = performance.now();
    try {
        return await fn();
    } finally {
        record(name, start);
    }
}
