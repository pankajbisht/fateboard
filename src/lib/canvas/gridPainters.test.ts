/**
 * Grid painters, with a recording Path2D / context (jsdom has no canvas). Checks what each style
 * draws, not pixels.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GRID_STYLES } from './grid';
import { paintGridStyle, type GridView } from './gridPainters';

type Op = [string, ...number[]];

class FakePath {
    ops: Op[] = [];
    moveTo(x: number, y: number) {
        this.ops.push(['moveTo', x, y]);
    }
    lineTo(x: number, y: number) {
        this.ops.push(['lineTo', x, y]);
    }
    arc(x: number, y: number, r: number) {
        this.ops.push(['arc', x, y, r]);
    }
}

const fakeCtx = () => {
    const drawn: { kind: 'stroke' | 'fill'; path: FakePath; alpha: number; dash: number[] }[] = [];
    let dash: number[] = [];
    const ctx = {
        globalAlpha: 1,
        lineWidth: 1,
        strokeStyle: '',
        fillStyle: '',
        setLineDash: (d: number[]) => {
            dash = d;
        },
        stroke(path: FakePath) {
            drawn.push({ kind: 'stroke', path, alpha: ctx.globalAlpha, dash });
        },
        fill(path: FakePath) {
            drawn.push({ kind: 'fill', path, alpha: ctx.globalAlpha, dash });
        },
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, drawn };
};

const view = (zoom = 1, w = 200, h = 100): GridView => ({
    vpt: [zoom, 0, 0, zoom, 0, 0],
    width: w,
    height: h,
    pixelRatio: 2,
});

const ops = (drawn: ReturnType<typeof fakeCtx>['drawn'], name: string) =>
    drawn.flatMap((d) => d.path.ops).filter((o) => o[0] === name);

beforeEach(() => vi.stubGlobal('Path2D', FakePath));
afterEach(() => vi.unstubAllGlobals());

describe('grid painters', () => {
    it('every style draws something at zoom 1', () => {
        for (const style of GRID_STYLES) {
            const { ctx, drawn } = fakeCtx();
            paintGridStyle(ctx, view(), style, 20);
            expect(drawn.flatMap((d) => d.path.ops).length, style).toBeGreaterThan(0);
        }
    });

    it('graph lines: vertical + horizontal lines, minor ones are device-pixel hairlines', () => {
        const { ctx, drawn } = fakeCtx();
        paintGridStyle(ctx, view(), 'lines', 20);
        // x = 0..200 step 20 → 11 lines, y = 0..100 → 6 lines
        expect(ops(drawn, 'moveTo')).toHaveLength(17);
        // retina 2: minor line centred on a device pixel (x + 0.25)
        expect(ops(drawn, 'moveTo')).toContainEqual(['moveTo', 20.25, 0]);
    });

    it('dots are round (arcs), one per crossing', () => {
        const { ctx, drawn } = fakeCtx();
        paintGridStyle(ctx, view(), 'dots', 20);
        expect(ops(drawn, 'arc')).toHaveLength(11 * 6);
        expect(drawn.every((d) => d.kind === 'fill')).toBe(true);
    });

    it('crosses: a "+" (two strokes) per crossing', () => {
        const { ctx, drawn } = fakeCtx();
        paintGridStyle(ctx, view(), 'crosses', 20);
        expect(ops(drawn, 'moveTo')).toHaveLength(2 * 11 * 6);
    });

    it('dashed: short fixed dashes that move with the content (no jump at a cell boundary)', () => {
        // phase of the dash pattern (period 7) at the content origin, for a pan of `oy`
        const phase = (oy: number) => {
            const { ctx, drawn } = fakeCtx();
            paintGridStyle(ctx, { ...view(1), vpt: [1, 0, 0, 1, 0, oy] }, 'dashed', 20);
            expect(drawn[0].dash).toEqual([4, 3]);
            const startY = ops(drawn, 'moveTo')[0][2]; // first vertical line
            return (((startY - oy) % 7) + 7) % 7;
        };
        expect(phase(0)).toBeCloseTo(0);
        expect(phase(0.5)).toBeCloseTo(0); // crosses the cell boundary at the top edge
        expect(phase(-13.25)).toBeCloseTo(0);
    });

    it('ruled: horizontal lines only', () => {
        const { ctx, drawn } = fakeCtx();
        paintGridStyle(ctx, view(), 'ruled', 20);
        const moves = ops(drawn, 'moveTo');
        expect(moves).toHaveLength(6);
        expect(moves.every((m) => m[1] === 0)).toBe(true);
    });

    it('isometric: rows plus two 60° families', () => {
        const { ctx, drawn } = fakeCtx();
        paintGridStyle(ctx, view(), 'isometric', 20);
        const lines = ops(drawn, 'lineTo');
        const moves = ops(drawn, 'moveTo');
        const slopes = moves.map((m, i) => {
            const dx = lines[i][1] - m[1];
            const dy = lines[i][2] - m[2];
            return dx === 0 ? Infinity : Math.round((dy / dx) * 1000) / 1000;
        });
        expect(slopes).toContain(0);
        expect(slopes).toContain(Math.round(Math.sqrt(3) * 1000) / 1000);
        expect(slopes).toContain(-Math.round(Math.sqrt(3) * 1000) / 1000);
    });

    it('minor lines fade in with zoom instead of popping in', () => {
        const at = (zoom: number) => {
            const { ctx, drawn } = fakeCtx();
            paintGridStyle(ctx, view(zoom), 'lines', 20);
            return drawn.map((d) => d.alpha);
        };
        expect(at(0.5)[0]).toBeCloseTo(0.5); // 10 px cells: half way between 6 and 14
        expect(at(1)[0]).toBe(1);
        expect(at(0.25)).toEqual([1]); // 5 px cells: only the every-5th lines
    });

    it('nothing is drawn when the grid would be a blur', () => {
        const { ctx, drawn } = fakeCtx();
        paintGridStyle(ctx, view(0.05), 'lines', 20); // 1 px cells, 5 px majors
        expect(drawn).toHaveLength(0);
    });
});
