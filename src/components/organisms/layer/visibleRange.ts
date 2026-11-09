/**
 * Which rows of a fixed-height list to mount. `end` is exclusive. `firstRow` may be past the end
 * for a moment when the list shrinks (search, collapse) before the browser clamps its scroll.
 */
export function visibleRange(opts: {
    firstRow: number;
    viewportRows: number;
    count: number;
    overscan: number;
}): { start: number; end: number } {
    const { firstRow, viewportRows, count, overscan } = opts;
    const first = Math.min(firstRow, Math.max(0, count - viewportRows));
    return {
        start: Math.max(0, first - overscan),
        end: Math.min(count, first + viewportRows + overscan),
    };
}
