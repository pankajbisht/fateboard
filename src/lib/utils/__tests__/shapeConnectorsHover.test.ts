import { describe, expect, it, vi } from 'vitest';

import { createFakeCanvas } from '@/test/fakeCanvas';

import { installConnectorBehavior } from '../shapeConnectors';

const fakeContext = () => ({
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    lineWidth: 0,
    strokeStyle: '',
});

function setup() {
    const contextTop = fakeContext();
    const canvas = Object.assign(createFakeCanvas(), { contextTop });
    installConnectorBehavior(canvas, {} as never);
    const shape = {
        customType: 'shape',
        canvas,
        getCoords: () => [
            { x: 10, y: 20 },
            { x: 110, y: 20 },
            { x: 110, y: 70 },
            { x: 10, y: 70 },
        ],
    };
    return { canvas, contextTop, shape };
}

describe('connector hover outline', () => {
    it('does not repaint the whole scene when the hovered shape changes', () => {
        const { canvas, shape } = setup();
        const before = canvas.renderCount();

        canvas.fire('mouse:over', { target: shape });
        canvas.fire('mouse:out', { target: shape });

        expect(canvas.renderCount()).toBe(before);
    });

    it('draws the outline on the top canvas', () => {
        const { canvas, contextTop, shape } = setup();

        canvas.fire('mouse:over', { target: shape });

        expect(contextTop.moveTo).toHaveBeenCalledWith(10, 20);
        expect(contextTop.stroke).toHaveBeenCalledTimes(1);
    });

    it('clears only its own pixels when the pointer leaves', () => {
        const { canvas, contextTop, shape } = setup();

        canvas.fire('mouse:over', { target: shape });
        canvas.fire('mouse:out', { target: shape });

        expect(contextTop.clearRect).toHaveBeenCalledTimes(1);
        const [x, y, w, h] = contextTop.clearRect.mock.calls[0] as number[];
        expect(x).toBeLessThanOrEqual(10);
        expect(y).toBeLessThanOrEqual(20);
        expect(x! + w!).toBeGreaterThanOrEqual(110);
        expect(y! + h!).toBeGreaterThanOrEqual(70);
        expect(w).toBeLessThan(120); // not a full-canvas clear: the text cursor shares this canvas
    });

    it('follows the shape when the scene renders, and goes away once it is selected', () => {
        const { canvas, contextTop, shape } = setup();

        canvas.fire('mouse:over', { target: shape });
        canvas.fire('after:render', { ctx: contextTop });
        expect(contextTop.stroke).toHaveBeenCalledTimes(2);

        canvas.setActiveObject(shape);
        canvas.fire('after:render', { ctx: contextTop });
        expect(contextTop.stroke).toHaveBeenCalledTimes(2);
        expect(contextTop.clearRect).toHaveBeenCalledTimes(2);
    });

    it('applies the viewport (whiteboard zoom / pan) to the outline', () => {
        const { canvas, contextTop, shape } = setup();
        canvas.viewportTransform = [2, 0, 0, 2, 5, 7];

        canvas.fire('mouse:over', { target: shape });

        expect(contextTop.moveTo).toHaveBeenCalledWith(25, 47);
    });

    it('never paints into another context (export, thumbnails)', () => {
        const { canvas, shape } = setup();
        const exportContext = fakeContext();

        canvas.fire('mouse:over', { target: shape });
        canvas.fire('after:render', { ctx: exportContext });

        expect(exportContext.stroke).not.toHaveBeenCalled();
    });
});
