import * as fabric from 'fabric';
import { describe, expect, it } from 'vitest';
import { finishFreehand } from '../finishFreehand';

/** A rough freehand circle as the Pencil makes it (absolute M / L commands). */
const roughCircle = () => {
    const cmds: (string | number)[][] = [];
    for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const r = 80 + Math.sin(i * 1.7) * 3;
        cmds.push([i ? 'L' : 'M', 200 + r * Math.cos(a), 150 + r * Math.sin(a)]);
    }
    return new fabric.Path(cmds as never, { originX: 'left', originY: 'top' });
};

describe('finishFreehand', () => {
    it('Pencil › Smart shape turns a rough circle into a clean closed circle in the same place', () => {
        const path = roughCircle();
        const before = path.getBoundingRect();
        finishFreehand(path, { activeTool: 'pencil', pencilStyle: { mode: 'shape' } }, 12);
        const cmds = path.path as unknown as (string | number)[][];
        expect(cmds.filter((c) => c[0] === 'C')).toHaveLength(4);
        expect(cmds.at(-1)?.[0]).toBe('Z');
        const after = path.getBoundingRect();
        expect(
            Math.abs(after.left + after.width / 2 - (before.left + before.width / 2)),
        ).toBeLessThan(4);
        expect(Math.abs(after.width - after.height)).toBeLessThan(2); // round, not oval
    });

    it('a scribble in Smart shape stays as drawn', () => {
        const zig = new fabric.Path(
            Array.from({ length: 30 }, (_, i) => [i ? 'L' : 'M', i * 6, (i % 2) * 50]) as never,
        );
        const before = JSON.stringify(zig.path);
        finishFreehand(zig, { activeTool: 'pencil', pencilStyle: { mode: 'shape' } }, 12);
        expect(JSON.stringify(zig.path)).toBe(before);
    });

    it('other modes keep auto-close (a Z only when asked)', () => {
        const a = roughCircle();
        finishFreehand(
            a,
            { activeTool: 'pencil', pencilStyle: { mode: 'pencil' }, autoClose: true },
            12,
        );
        expect((a.path as unknown as string[][]).at(-1)?.[0]).toBe('Z');
        const b = roughCircle();
        finishFreehand(b, { activeTool: 'draw', autoClose: false }, 12);
        expect((b.path as unknown as string[][]).filter((c) => c[0] === 'C')).toHaveLength(0);
    });
});
