/** BUG-022: fitting / resetting the whiteboard view never wipes the page colour. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */
let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;

beforeEach(() => {
    prev = { ...useStore.getState() };
    canvas = createFakeCanvas();
    useStore.setState({ canvas, boardMode: 'whiteboard' } as any);
});
afterEach(() => {
    useStore.setState({
        canvas: prev.canvas,
        boardMode: prev.boardMode,
        pageBackground: prev.pageBackground,
    } as any);
});

describe('page colour survives view resets (BUG-022)', () => {
    it('fitToScreen / applyPageSize keep the page background', () => {
        state().setPageBackground('#ffe4e6');
        state().fitToScreen();
        expect(canvas.backgroundColor).toBe('#ffe4e6');
        state().applyPageSize();
        expect(canvas.backgroundColor).toBe('#ffe4e6');
    });
});
