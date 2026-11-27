import * as fabric from 'fabric';
import { describe, expect, it } from 'vitest';
import { CUSTOM_PROPS } from '@/lib/serialization';
import { buildPropObject, isPropGroup, readPropData, swapPropDrawing } from '../board';

describe('props board edge', () => {
    it('builds a centred group that carries its prop data and name', async () => {
        const g = await buildPropObject({ propId: 'tree-pine' });
        expect(g).toBeInstanceOf(fabric.Group);
        expect(g!.originX).toBe('center');
        expect(g!.originY).toBe('center');
        expect((g as unknown as { name?: string }).name).toBe('Pine tree');
        expect(isPropGroup(g)).toBe(true);
        expect(readPropData(g)).toMatchObject({ propId: 'tree-pine', variant: 0 });
        expect(g!.width).toBeGreaterThan(50);
    });

    it('returns null for an unknown prop', async () => {
        expect(await buildPropObject({ propId: 'nope' })).toBeNull();
    });

    it('prop data saves with the page', () => {
        expect(CUSTOM_PROPS).toContain('propData');
    });

    it('reads nothing from other objects', () => {
        expect(readPropData(new fabric.Rect())).toBeNull();
        expect(isPropGroup(new fabric.Group([]))).toBe(false);
    });

    it('screentone turns light fills to paper, dark to ink and mid tones to tone', async () => {
        const g = (await buildPropObject({
            propId: 'tree-round',
            tone: { kind: 'dots', density: 0.5 },
        }))!;
        const fills = g
            .getObjects()
            .map((o) => o.fill)
            .filter((f) => typeof f === 'string');
        // no colour left: paper, ink, or the flat grey a tone falls back to without a canvas (jsdom)
        for (const f of fills)
            expect(
                ['#ffffff', '#141414', 'none', ''].includes(String(f)) ||
                    /^#([0-9a-f])\1\1\1\1\1$|^#([0-9a-f]{2})\2\2$/i.test(String(f)),
            ).toBe(true);
        expect(readPropData(g)!.tone.kind).toBe('dots');
    });

    it('a gradient tone fills mid tones with a gradient', async () => {
        const g = (await buildPropObject({
            propId: 'tree-round',
            tone: { kind: 'gradient', density: 0.5 },
        }))!;
        expect(g.getObjects().some((o) => o.fill instanceof fabric.Gradient)).toBe(true);
    });

    it('a swap keeps the same object, its place, turn and scale', async () => {
        const g = (await buildPropObject({ propId: 'rock' }))!;
        g.set({ left: 300, top: 120, angle: 20, scaleX: 2, scaleY: 2 });
        const fresh = (await buildPropObject({ propId: 'rock', colors: { stone: '#123456' } }))!;
        swapPropDrawing(g, fresh, readPropData(fresh)!);
        expect([g.left, g.top, g.angle, g.scaleX]).toEqual([300, 120, 20, 2]);
        expect(readPropData(g)!.colors).toEqual({ stone: '#123456' });
        expect(g.getObjects().some((o) => o.fill === '#123456')).toBe(true);
    });
});
