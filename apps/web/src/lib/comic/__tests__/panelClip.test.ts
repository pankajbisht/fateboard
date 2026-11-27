/** A picture or scene in a comic panel is cut to that panel, in its own coordinates (2026-11-27). */
import { describe, expect, it } from 'vitest';
import { panelClipPolygon, type Mat } from '../panelClip';

const ID: Mat = [1, 0, 0, 1, 0, 0];
const panel = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 250 },
    { x: 100, y: 250 },
];
const bounds = (pts: { x: number; y: number }[]) => ({
    x0: Math.min(...pts.map((p) => p.x)),
    x1: Math.max(...pts.map((p) => p.x)),
    y0: Math.min(...pts.map((p) => p.y)),
    y1: Math.max(...pts.map((p) => p.y)),
});

describe('panelClipPolygon', () => {
    it('maps the panel into the object plane (page → local)', () => {
        // an object centred at (200, 175), scaled 2: local = (page - centre) / 2
        const toLocal: Mat = [0.5, 0, 0, 0.5, -100, -87.5];
        const b = bounds(panelClipPolygon(panel, toLocal)!);
        expect(b).toEqual({ x0: -50, x1: 50, y0: -37.5, y1: 37.5 });
    });

    it("is cut to the object's own frame (a scene's frame), so nothing past the frame shows", () => {
        const b = bounds(panelClipPolygon(panel, ID, { width: 360, height: 300 })!);
        // the frame spans -180..180 × -150..150 around the object's centre
        expect(b).toEqual({ x0: 100, x1: 180, y0: 100, y1: 150 });
    });

    it('keeps a rotated panel (or a rotated object) as a quad', () => {
        const c = Math.SQRT1_2;
        const pts = panelClipPolygon(panel, [c, c, -c, c, 0, 0])!;
        expect(pts).toHaveLength(4);
        expect(pts[0].x).toBeCloseTo(100 * c - 100 * c);
        expect(pts[0].y).toBeCloseTo(100 * c + 100 * c);
    });

    it('is null when the object frame and the panel do not meet', () => {
        expect(panelClipPolygon(panel, ID, { width: 50, height: 50 })).toBeNull();
        expect(panelClipPolygon([], ID)).toBeNull();
    });
});
