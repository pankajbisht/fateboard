/** Opening a page on the design board (2026-11-17): the Page slice sets the opening zoom once the board is measured. */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as fabric from 'fabric';
import { useStore } from '@store';
import { useOpenPageView } from '../useDesignCanvasSize';

const applyPageSize = vi.fn();
const canvas = {} as fabric.Canvas;

describe('useOpenPageView', () => {
    beforeEach(() => {
        applyPageSize.mockReset();
        useStore.setState({ applyPageSize } as never);
    });

    it('once the board is measured, and again when the page size changes (not on every render)', () => {
        type P = { size: { width: number; height: number }; measured: boolean };
        const { rerender } = renderHook(
            (p: P) => useOpenPageView(canvas, false, p.size, p.measured),
            {
                initialProps: { size: { width: 1080, height: 1920 }, measured: false },
            },
        );
        expect(applyPageSize).not.toHaveBeenCalled();
        rerender({ size: { width: 1080, height: 1920 }, measured: true });
        expect(applyPageSize).toHaveBeenCalledTimes(1);
        rerender({ size: { width: 1080, height: 1920 }, measured: true });
        expect(applyPageSize).toHaveBeenCalledTimes(1);
        rerender({ size: { width: 794, height: 1123 }, measured: true });
        expect(applyPageSize).toHaveBeenCalledTimes(2);
    });

    it('never on the whiteboard or without a canvas', () => {
        renderHook(() => useOpenPageView(canvas, true, { width: 1080, height: 1920 }, true));
        renderHook(() => useOpenPageView(null, false, { width: 1080, height: 1920 }, true));
        expect(applyPageSize).not.toHaveBeenCalled();
    });
});
