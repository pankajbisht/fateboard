/**
 * Perf: moving the mouse over the page must only move the ruler marker. It used to re-render the
 * whole board and redraw every ruler tick on each mouse move.
 */
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Ruler, createPointerSource } from '../Ruler';

/** 2D context where every method is a no-op (the shared setup mock lacks setTransform etc.). */
const anyContext = () =>
    new Proxy({} as Record<string | symbol, unknown>, {
        get: (target, key) =>
            key === 'measureText' ? () => ({ width: 0 }) : (target[key] ??= vi.fn()),
        set: (target, key, value) => ((target[key] = value), true),
    });

beforeEach(() => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(
        () => anyContext() as never,
    );
});

describe('ruler pointer marker', () => {
    it('follows the pointer without redrawing the ticks', () => {
        const pointer = createPointerSource();
        const getContext = vi.mocked(HTMLCanvasElement.prototype.getContext);
        getContext.mockClear();

        const { getByTestId, queryByTestId } = render(
            <Ruler
                orientation="horizontal"
                length={800}
                origin={40}
                scale={0.5}
                extent={1920}
                pointer={pointer}
            />,
        );
        const drawsAfterMount = getContext.mock.calls.length;
        expect(drawsAfterMount).toBeGreaterThan(0);
        expect(queryByTestId('ruler-marker-horizontal')).toBeNull();

        act(() => pointer.set({ x: 120.4, y: 33 }));
        expect(getByTestId('ruler-marker-horizontal').style.transform).toBe('translateX(120px)');

        act(() => pointer.set({ x: 300, y: 50 }));
        expect(getByTestId('ruler-marker-horizontal').style.transform).toBe('translateX(300px)');

        act(() => pointer.set(null));
        expect(queryByTestId('ruler-marker-horizontal')).toBeNull();

        expect(getContext.mock.calls.length).toBe(drawsAfterMount);
    });

    it('vertical ruler reads the y coordinate; off-ruler positions hide the marker', () => {
        const pointer = createPointerSource();
        const { getByTestId, queryByTestId } = render(
            <Ruler
                orientation="vertical"
                length={500}
                origin={0}
                scale={1}
                extent={1080}
                pointer={pointer}
            />,
        );
        act(() => pointer.set({ x: 10, y: 75 }));
        expect(getByTestId('ruler-marker-vertical').style.transform).toBe('translateY(75px)');

        act(() => pointer.set({ x: 10, y: 900 }));
        expect(queryByTestId('ruler-marker-vertical')).toBeNull();
    });
});
