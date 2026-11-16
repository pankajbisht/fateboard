import { describe, expect, it, vi } from 'vitest';
import type * as fabric from 'fabric';
import { attachDrafter } from '../paintTools/drafterTool';
import { DEFAULT_DRAFTER_STYLE } from '../paintTools/paintToolStyles';

/** Canvas double that records listeners so a test can play pointer events. */
function eventCanvas() {
    const handlers: Record<string, ((e: unknown) => void)[]> = {};
    const canvas = {
        on: (name: string, fn: (e: unknown) => void) => {
            (handlers[name] ??= []).push(fn);
            return () => (handlers[name] = handlers[name].filter((h) => h !== fn));
        },
        getActiveObject: () => undefined,
        getObjects: () => [],
        clearContext: vi.fn(),
        viewportTransform: [1, 0, 0, 1, 0, 0],
    } as unknown as fabric.Canvas;
    const fire = (name: string, x: number, y: number, e: Record<string, unknown> = {}) =>
        handlers[name]?.forEach((h) => h({ e: { button: 0, ...e }, scenePoint: { x, y } }));
    return { canvas, fire };
}

describe('Drafter pointer flow', () => {
    it('a drag draws one line snapped to the head steps (regression: the end used a cleared start)', () => {
        const { canvas, fire } = eventCanvas();
        const onLine = vi.fn();
        const detach = attachDrafter(canvas, {
            style: () => DEFAULT_DRAFTER_STYLE,
            color: () => '#000000',
            unit: () => 'px',
            screen: () => 1,
            onLine,
            onEscape: vi.fn(),
        });
        fire('mouse:down', 10, 10);
        fire('mouse:move', 60, 14);
        expect(() => fire('mouse:up', 110, 16)).not.toThrow();
        expect(onLine).toHaveBeenCalledTimes(1);
        const [a, b] = onLine.mock.calls[0];
        expect(a).toEqual({ x: 10, y: 10 });
        expect(b.y).toBeCloseTo(10); // 0° after the 15° snap
        expect(b.x).toBeCloseTo(10 + Math.hypot(100, 6));
        detach();
    });

    it('Alt draws at any angle; a tiny drag draws nothing', () => {
        const { canvas, fire } = eventCanvas();
        const onLine = vi.fn();
        attachDrafter(canvas, {
            style: () => DEFAULT_DRAFTER_STYLE,
            color: () => '#000000',
            unit: () => 'px',
            screen: () => 1,
            onLine,
            onEscape: vi.fn(),
        });
        fire('mouse:down', 0, 0);
        fire('mouse:up', 100, 7, { altKey: true });
        expect(onLine.mock.calls[0][1]).toEqual({ x: 100, y: 7 });
        fire('mouse:down', 0, 0);
        fire('mouse:up', 1, 1);
        expect(onLine).toHaveBeenCalledTimes(1);
    });
});
