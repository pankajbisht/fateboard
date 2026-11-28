import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { reflection, rotation } from '@/lib/canvas/symmetryMath';
import { turnHue, variationFor } from '@/lib/canvas/symmetryVariation';
import { symmetryClones } from '../symmetryCopies';
import { installSymmetryPreview } from '../symmetryPreview';

const text = () =>
    new fabric.FabricText('Hi', { left: 110, top: 40, originX: 'left', originY: 'top' });

describe('symmetry copy options', () => {
    it('readable text: a mirrored copy is not flipped; "mirror" flips it', async () => {
        const [readable] = await symmetryClones(text(), [reflection({ x: 100, y: 0 }, 90)]);
        expect(readable.flipX || readable.flipY).toBe(false);
        expect(readable.getCenterPoint().x).toBeLessThan(100); // still on the mirrored side
        const [mirrored] = await symmetryClones(text(), [reflection({ x: 100, y: 0 }, 90)], {
            textMode: 'mirror',
        });
        expect(mirrored.flipX !== mirrored.flipY).toBe(true);
    });

    it('turned (not mirrored) text copies keep their turn', async () => {
        const [turned] = await symmetryClones(text(), [rotation({ x: 0, y: 0 }, 90)]);
        expect(turned.angle).toBeCloseTo(90, 6);
    });

    it('variation: hue turns per copy, fade and shrink grow with k, wobble is seeded', async () => {
        const r = new fabric.Rect({
            left: 0,
            top: 0,
            width: 10,
            height: 10,
            fill: '#ff0000',
            originX: 'left',
            originY: 'top',
        });
        const v = { hue: 120, fade: 0.5, shrink: 0.5, wobble: 0, seed: 1 };
        const copies = await symmetryClones(
            r,
            [rotation({ x: 50, y: 50 }, 90), rotation({ x: 50, y: 50 }, 180)],
            {
                variation: v,
            },
        );
        expect(new fabric.Color(copies[0].fill as string).toHex()).toBe('00FF00');
        expect(copies[1].opacity).toBeCloseTo(0.5, 6);
        expect(copies[1].getScaledWidth()).toBeCloseTo(5 + copies[1].strokeWidth / 2, 0);
        const w = { ...v, wobble: 10 };
        expect(variationFor(3, 5, w)).toEqual(variationFor(3, 5, w));
        expect(variationFor(3, 5, w)).not.toEqual(variationFor(3, 5, { ...w, seed: 2 }));
    });

    it('turnHue keeps greys and wraps the hue', () => {
        expect(turnHue(128, 128, 128, 90)).toEqual([128, 128, 128]);
        expect(turnHue(255, 0, 0, 360)).toEqual([255, 0, 0]);
        expect(turnHue(255, 0, 0, -120)).toEqual([0, 0, 255]);
    });
});

describe('symmetry ghost preview', () => {
    it('wraps the brush once per brush and forces full renders only while ghosts are on', () => {
        const handlers: Record<string, () => void> = {};
        const render = vi.fn();
        const brush = { _render: render, needsFullRender: () => false };
        const canvas = {
            isDrawingMode: true,
            freeDrawingBrush: brush,
            on: (name: string, fn: () => void) => {
                handlers[name] = fn;
                return () => delete handlers[name];
            },
        } as unknown as fabric.Canvas;
        let matrices = [rotation({ x: 0, y: 0 }, 90)];
        const off = installSymmetryPreview(canvas, () => matrices);
        handlers['mouse:down:before']();
        const wrapped = brush._render;
        expect(wrapped).not.toBe(render);
        expect(brush.needsFullRender()).toBe(true);
        handlers['mouse:down:before']();
        expect(brush._render).toBe(wrapped); // not wrapped twice
        matrices = [];
        handlers['mouse:down:before']();
        expect(brush.needsFullRender()).toBe(false);
        brush._render();
        expect(render).toHaveBeenCalledTimes(1);
        off();
        expect(handlers['mouse:down:before']).toBeUndefined();
    });
});
