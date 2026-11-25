import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createGeneratorSlice } from '../createGeneratorSlice';

const make = (canvas: unknown = createFakeCanvas()) => {
    const saveState = vi.fn();
    const addLayer = vi.fn();
    const h = createHarness([createGeneratorSlice as never], { canvas, saveState, addLayer });
    return { ...h, saveState, addLayer };
};

describe('generator slice', () => {
    it('insertFractal adds one selected path, records history and a layer', () => {
        const canvas = createFakeCanvas();
        const { get, saveState, addLayer } = make(canvas);
        const path = get().insertFractal({ kind: 'koch', depth: 2, size: 120 });
        expect(path).toBeInstanceOf(fabric.Path);
        expect(canvas.getObjects()).toEqual([path]);
        expect(canvas.getActiveObject()).toBe(path);
        expect(path.originX).toBe('center');
        expect(path.name).toBe('Koch snowflake');
        expect(saveState).toHaveBeenCalledOnce();
        expect(addLayer).toHaveBeenCalledWith(path, 'path');
    });

    it('line fractals are stroked, not filled', () => {
        const path = make().get().insertFractal({ kind: 'dragon', depth: 4, size: 100 });
        expect(path.fill).toBe('');
        expect(path.stroke).toBeTruthy();
    });

    it('insertAutomaton draws the live cells as one filled path', () => {
        const canvas = createFakeCanvas();
        const path = make(canvas).get().insertAutomaton({
            mode: 'elementary',
            rule: 90,
            cols: 9,
            rows: 5,
            cell: 10,
        });
        expect(canvas.getObjects()).toHaveLength(1);
        expect(path.name).toBe('Rule 90');
        expect(path.path.filter((c: unknown[]) => c[0] === 'Z')).toHaveLength(1 + 2 + 2 + 4 + 2);
    });

    it('returns null and adds nothing for an all-dead grid', () => {
        const canvas = createFakeCanvas();
        const path = make(canvas).get().insertAutomaton({
            mode: 'life',
            preset: 'random',
            density: 0,
            cols: 5,
            rows: 5,
        });
        expect(path).toBeNull();
        expect(canvas.getObjects()).toHaveLength(0);
    });

    it('does nothing without a canvas', () => {
        expect(make(null).get().insertFractal({ kind: 'tree', depth: 3, size: 80 })).toBeNull();
    });
});
