import { describe, expect, it } from 'vitest';

import { visibleRange } from '../visibleRange';

const base = { viewportRows: 10, overscan: 3 };

describe('visibleRange', () => {
    it('adds overscan after the viewport at the top of the list', () => {
        expect(visibleRange({ ...base, firstRow: 0, count: 100 })).toEqual({ start: 0, end: 13 });
    });

    it('adds overscan on both sides in the middle', () => {
        expect(visibleRange({ ...base, firstRow: 50, count: 100 })).toEqual({ start: 47, end: 63 });
    });

    it('stops at the last row', () => {
        expect(visibleRange({ ...base, firstRow: 90, count: 100 })).toEqual({
            start: 87,
            end: 100,
        });
    });

    it('still shows the end of the list when the scroll is past a list that just shrank', () => {
        expect(visibleRange({ ...base, firstRow: 500, count: 20 })).toEqual({ start: 7, end: 20 });
    });

    it('handles a list shorter than the viewport, and an empty one', () => {
        expect(visibleRange({ ...base, firstRow: 0, count: 4 })).toEqual({ start: 0, end: 4 });
        expect(visibleRange({ ...base, firstRow: 0, count: 0 })).toEqual({ start: 0, end: 0 });
    });
});
