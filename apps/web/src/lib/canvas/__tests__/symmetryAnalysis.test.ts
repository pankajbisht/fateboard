// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    analyzeSymmetry,
    fixMoves,
    heatColor,
    likeness,
    sideOf,
    type AnalysisItem,
} from '../symmetryAnalysis';
import { nearestOnPolyline, reflectAcrossCurve, thin } from '../symmetryCurve';
import { reflection, rotation } from '../symmetryMath';

const item = (id: string, cx: number, cy: number, w = 20, h = 10, kind = 'rect'): AnalysisItem => ({
    id,
    cx,
    cy,
    w,
    h,
    kind,
});
const mirrorX = reflection({ x: 100, y: 0 }, 90); // vertical axis x = 100

describe('symmetry analysis', () => {
    it('a perfect mirror pair and an object on the axis score 100', () => {
        const a = analyzeSymmetry(
            [item('a', 60, 50), item('b', 140, 50), item('c', 100, 90)],
            mirrorX,
        );
        expect(a.score).toBe(100);
        expect(a.pairs).toHaveLength(1);
        expect(a.selfs.map((s) => s.id)).toEqual(['c']);
        expect(a.unmatched).toEqual([]);
    });

    it('a lonely object scores 0 and pulls the score down; kinds must match', () => {
        const a = analyzeSymmetry(
            [item('a', 60, 50), item('b', 140, 50, 20, 10, 'ellipse')],
            mirrorX,
        );
        expect(a.unmatched.sort()).toEqual(['a', 'b']);
        expect(a.score).toBe(0);
    });

    it('a near pair scores between, and the fix moves the partner onto the mirror image', () => {
        const items = [item('a', 60, 50), item('b', 143, 52, 22, 10), item('c', 102, 90)];
        const a = analyzeSymmetry(items, mirrorX);
        expect(a.score).toBeGreaterThan(50);
        expect(a.score).toBeLessThan(100);
        const moves = fixMoves(items, a, mirrorX);
        expect(moves).toContainEqual({ id: 'b', cx: 140, cy: 50, w: 20, h: 10 });
        expect(moves).toContainEqual({ id: 'c', cx: 100, cy: 90, w: 20, h: 10 });
    });

    it('turn symmetry pairs each object with its turned image (sizes may swap)', () => {
        const turn = rotation({ x: 0, y: 0 }, 90);
        const a = analyzeSymmetry([item('a', 50, 0, 20, 10), item('b', 0, 50, 10, 20)], turn);
        expect(a.pairs).toHaveLength(1);
    });

    it('sides, heat colours and point-cloud likeness', () => {
        expect(sideOf({ x: 50, y: 0 }, { x: 100, y: 0 }, 90)).toBe(1);
        expect(sideOf({ x: 150, y: 0 }, { x: 100, y: 0 }, 90)).toBe(-1);
        expect(sideOf({ x: 100, y: 5 }, { x: 100, y: 0 }, 90)).toBe(0);
        expect(heatColor(1)).toBe('rgba(40, 180, 60, 0.35)');
        expect(heatColor(0)).toBe('rgba(220, 40, 60, 0.35)');
        const pts = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
        ];
        expect(likeness(pts, pts, 5)).toBe(100);
        expect(likeness(pts, [{ x: 500, y: 500 }], 5)).toBe(0);
        expect(likeness([], pts, 5)).toBe(0);
    });
});

describe('curve axis', () => {
    const line = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
    ];

    it('a straight curve mirrors like a straight axis', () => {
        expect(reflectAcrossCurve({ x: 40, y: 15 }, line)).toEqual({ x: 40, y: -15 });
        expect(nearestOnPolyline({ x: 40, y: 15 }, line)).toMatchObject({
            q: { x: 40, y: 0 },
            angle: 0,
            dist: 15,
        });
    });

    it('a bent curve mirrors through the nearest segment', () => {
        const bent = [...line, { x: 100, y: 100 }];
        const p = reflectAcrossCurve({ x: 110, y: 60 }, bent);
        expect(p.x).toBeCloseTo(90, 6);
        expect(p.y).toBeCloseTo(60, 6);
        expect(nearestOnPolyline({ x: 0, y: 0 }, [{ x: 1, y: 1 }])).toBeNull();
    });

    it('thin drops points closer than the step but keeps the end', () => {
        const pts = [0, 0.5, 1, 5, 5.2].map((x) => ({ x, y: 0 }));
        expect(thin(pts, 2).map((p) => p.x)).toEqual([0, 5, 5.2]);
    });
});
