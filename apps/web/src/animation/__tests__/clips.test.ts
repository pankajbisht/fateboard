// @vitest-environment node
/**
 * Fight clips on the timeline (docs/COMBAT_PACK.md, owner decision Q1): at time t only the drawing for t shows,
 * held on the first frame before the start and on the last after the end; the over layer hides for zoom frames.
 */
import type { Canvas, FabricObject } from 'fabric';
import { describe, expect, it } from 'vitest';
import { applyClipsAt, clipFrameAt, clipTiming } from '../clips';

const kid = () => ({ visible: true }) as FabricObject;
function clipObject(count: number, extra: Record<string, unknown> = {}) {
    const kids = [kid(), ...Array.from({ length: count }, kid), kid()];
    const obj = {
        fightClip: {
            name: 'c',
            start: 1000,
            fps: 10,
            count,
            hits: [],
            first: 1,
            over: count + 1,
            fullFrom: count,
            ...extra,
        },
        getObjects: () => kids,
        set: () => undefined,
    } as unknown as FabricObject;
    return { obj, kids };
}
const canvasOf = (...objs: FabricObject[]) => ({ getObjects: () => objs }) as unknown as Canvas;

describe('fight clips', () => {
    it('reads the timing and refuses broken data', () => {
        expect(clipTiming({})).toBeNull();
        expect(clipTiming({ fightClip: { start: 0, fps: 0, count: 3, first: 0 } })).toBeNull();
        expect(clipTiming(clipObject(4).obj)).toMatchObject({
            start: 1000,
            fps: 10,
            count: 4,
            first: 1,
        });
    });

    it('picks the frame for a time, held before the start and after the end', () => {
        const c = clipTiming(clipObject(5).obj)!;
        expect(clipFrameAt(c, 0)).toBe(0);
        expect(clipFrameAt(c, 1000)).toBe(0);
        expect(clipFrameAt(c, 1250)).toBe(2);
        expect(clipFrameAt(c, 99_999)).toBe(4);
    });

    it('shows only the frame for t, keeps the place and the over layer, and reports a change once', () => {
        const { obj, kids } = clipObject(5);
        const canvas = canvasOf(obj);
        expect(applyClipsAt(canvas, 1250)).toBe(true);
        expect(kids.map((k) => k.visible)).toEqual([true, false, false, true, false, false, true]);
        expect(applyClipsAt(canvas, 1260)).toBe(false);
    });

    it('hides the over layer from the first whole (zoomed) frame', () => {
        const { obj, kids } = clipObject(5, { fullFrom: 3 });
        applyClipsAt(canvasOf(obj), 1350);
        expect(kids[6].visible).toBe(false);
        applyClipsAt(canvasOf(obj), 1050);
        expect(kids[6].visible).toBe(true);
    });
});
