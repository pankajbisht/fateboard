// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type * as fabric from 'fabric';
import { VariableWidthBrush } from '../variableWidthBrush';

// P6 (docs/PERFORMANCE_AUDIT.md): a long ink stroke is simplified when it is saved; a straight line
// needs a handful of vertices, not one per pointer sample.
describe('VariableWidthBrush commit (P6)', () => {
    it('a 2000-sample straight ink stroke saves fewer than 50 vertices', () => {
        const added: fabric.Path[] = [];
        const canvas = {
            getZoom: () => 1,
            fire: vi.fn(),
            add: (p: fabric.Path) => added.push(p),
            requestRenderAll: vi.fn(),
        };
        const brush = new (VariableWidthBrush as unknown as new (c: unknown) => unknown)(
            canvas,
        ) as {
            width: number;
            color: string;
            samples: { x: number; y: number; f: number }[];
            finalizePath: () => void;
        };
        brush.width = 10;
        brush.color = '#000000';
        brush.samples = Array.from({ length: 2000 }, (_, i) => ({ x: i * 2, y: 100, f: 1 }));
        brush.finalizePath();
        expect(added).toHaveLength(1);
        expect(added[0].path.length).toBeLessThan(50);
    });
});
