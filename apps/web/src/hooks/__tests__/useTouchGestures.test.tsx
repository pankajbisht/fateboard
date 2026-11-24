/** Touch on the board: which tools count as drawing (after a pen was used, a finger pans with them). */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Canvas } from 'fabric';

import { useStore } from '@store';

type Deps = { getMode: () => { drawing: boolean } };
const captured: { deps?: Deps } = {};
vi.mock('@/lib/canvas/touchGestures', () => ({
    attachTouchGestures: (_root: HTMLElement, deps: Deps) => {
        captured.deps = deps;
        return () => undefined;
    },
}));

import { useTouchGestures } from '../useTouchGestures';

describe('useTouchGestures drawing mode', () => {
    afterEach(() => useStore.setState({ activeTool: 'select' } as never));

    it('treats the drag-to-draw tools as drawing, Select as not', () => {
        const root = { current: document.createElement('div') };
        const canvas = {
            upperCanvasEl: document.createElement('canvas'),
            isDrawingMode: false,
        } as unknown as Canvas;
        renderHook(() => useTouchGestures(root, canvas));
        const drawing = (tool: string) => {
            useStore.setState({ activeTool: tool } as never);
            return captured.deps!.getMode().drawing;
        };
        expect(drawing('select')).toBe(false);
        expect(drawing('pen')).toBe(true);
        expect(drawing('copySpray')).toBe(true); // a resting palm must not spray copies
    });
});
