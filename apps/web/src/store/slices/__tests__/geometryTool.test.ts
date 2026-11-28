import { describe, expect, it, vi } from 'vitest';
import type * as fabric from 'fabric';
import { mmToPx } from '@/lib/canvas/drafter';
import { attachGeometry } from '../paintTools/geometryTool';
import { DEFAULT_GEOMETRY_STYLE, type GeometryStyle } from '../paintTools/paintToolStyles';

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

function setup(patch: Partial<GeometryStyle> = {}) {
    const { canvas, fire } = eventCanvas();
    const onDraw = vi.fn();
    const onEscape = vi.fn();
    const style = { ...DEFAULT_GEOMETRY_STYLE, ...patch };
    const detach = attachGeometry(canvas, {
        style: () => style,
        color: () => '#000000',
        unit: () => 'px',
        screen: () => 1,
        onDraw,
        onEscape,
    });
    const drag = (x0: number, y0: number, x1: number, y1: number, e = {}) => {
        fire('mouse:down', x0, y0);
        fire('mouse:move', (x0 + x1) / 2, (y0 + y1) / 2, e);
        fire('mouse:up', x1, y1, e);
    };
    const click = (x: number, y: number) => {
        fire('mouse:down', x, y);
        fire('mouse:up', x, y);
    };
    return { fire, onDraw, onEscape, detach, drag, click };
}

describe('Geometry tool › Drafter pointer flow', () => {
    it('a drag draws one line snapped to the head steps (regression: the end used a cleared start)', () => {
        const { onDraw, drag, detach } = setup();
        expect(() => drag(10, 10, 110, 16)).not.toThrow();
        expect(onDraw).toHaveBeenCalledTimes(1);
        const [[a, b]] = onDraw.mock.calls[0];
        expect(a).toEqual({ x: 10, y: 10 });
        expect(b.y).toBeCloseTo(10); // 0° after the 15° snap
        expect(b.x).toBeCloseTo(10 + Math.hypot(100, 6));
        detach();
    });

    it('Alt draws at any angle; a tiny drag draws nothing', () => {
        const { onDraw, drag } = setup();
        drag(0, 0, 100, 7, { altKey: true });
        expect(onDraw.mock.calls[0][0][1]).toEqual({ x: 100, y: 7 });
        drag(0, 0, 1, 1);
        expect(onDraw).toHaveBeenCalledTimes(1);
    });

    it('Escape cancels a stroke first, then leaves the tool', () => {
        const { fire, onDraw, onEscape } = setup({ instrument: 'protractor' });
        fire('mouse:down', 0, 0);
        fire('mouse:up', 100, 0);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(onEscape).not.toHaveBeenCalled();
        fire('mouse:down', 0, 100);
        fire('mouse:up', 0, 100);
        expect(onDraw).not.toHaveBeenCalled(); // the half-done angle was dropped
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(onEscape).toHaveBeenCalledTimes(1);
    });
});

describe('Geometry tool › other instruments', () => {
    it('Scale: the length snaps to the ticks at any angle; Alt = any length', () => {
        const { onDraw, drag } = setup({ instrument: 'scale', scaleTickMm: 10 });
        const cm = mmToPx(10);
        drag(0, 0, 3.3 * cm * 0.6, 3.3 * cm * 0.8); // 3.3 cm at a free angle
        const [[a, b]] = onDraw.mock.calls[0];
        expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(3 * cm);
        expect(b.y / b.x).toBeCloseTo(0.8 / 0.6);
        drag(0, 0, 33, 0, { altKey: true });
        expect(onDraw.mock.calls[1][0][1].x).toBeCloseTo(33);
    });

    it('Set square: the line runs along the nearest edge', () => {
        const { onDraw, drag } = setup({ instrument: 'setSquare', setSquare: '30-60' });
        drag(0, 0, 100, 55);
        const [[, b]] = onDraw.mock.calls[0];
        expect((Math.atan2(b.y, b.x) * 180) / Math.PI).toBeCloseTo(30);
    });

    it('Protractor: drag the first arm, click the second: three points and the snapped angle', () => {
        const { fire, onDraw, click } = setup({ instrument: 'protractor', step: 5 });
        fire('mouse:down', 0, 0);
        fire('mouse:up', 100, 0);
        expect(onDraw).not.toHaveBeenCalled();
        fire('mouse:move', 50, 60);
        click(50, 61); // ~50.7°
        expect(onDraw).toHaveBeenCalledTimes(1);
        const [points, sweep] = onDraw.mock.calls[0];
        expect(points).toHaveLength(3);
        expect(sweep).toBe(50);
    });

    it('Compass: a drag draws a circle; Arc mode takes a click for the end and keeps the radius', () => {
        const circle = setup({ instrument: 'compass' });
        circle.drag(0, 0, 30, 40);
        expect(circle.onDraw.mock.calls[0][0]).toEqual([
            { x: 0, y: 0 },
            { x: 30, y: 40 },
        ]);

        const arc = setup({ instrument: 'compass', compass: 'arc', step: 15 });
        arc.fire('mouse:down', 0, 0);
        arc.fire('mouse:up', 50, 0);
        arc.fire('mouse:move', 0, 200);
        arc.click(0, 200); // 90° clockwise on screen
        const [points, sweep] = arc.onDraw.mock.calls[0];
        expect(sweep).toBe(90);
        expect(Math.hypot(points[2].x, points[2].y)).toBeCloseTo(50);
    });

    it('an arc follows the pointer past 180° (the sweep is tracked while moving)', () => {
        const { fire, onDraw, click } = setup({ instrument: 'compass', compass: 'arc', step: 15 });
        fire('mouse:down', 0, 0);
        fire('mouse:up', 50, 0);
        for (const deg of [45, 90, 135, 180, 225, 270]) {
            const t = (deg * Math.PI) / 180;
            fire('mouse:move', Math.cos(t) * 50, Math.sin(t) * 50);
        }
        click(0, -50); // 270° clockwise, not the short -90°
        expect(onDraw.mock.calls[0][1]).toBe(270);
    });

    it('changing the instrument mid-stroke drops the half-done stroke', () => {
        const style: GeometryStyle = { ...DEFAULT_GEOMETRY_STYLE, instrument: 'protractor' };
        const { canvas, fire } = eventCanvas();
        const onDraw = vi.fn();
        attachGeometry(canvas, {
            style: () => style,
            color: () => '#000000',
            unit: () => 'px',
            screen: () => 1,
            onDraw,
            onEscape: vi.fn(),
        });
        fire('mouse:down', 0, 0);
        fire('mouse:up', 100, 0);
        style.instrument = 'compass'; // picked in the bar between the two arms
        fire('mouse:down', 0, 100);
        fire('mouse:up', 0, 100);
        expect(onDraw).not.toHaveBeenCalled();
    });

    it('a right-click never places the second arm', () => {
        const { fire, onDraw } = setup({ instrument: 'protractor' });
        fire('mouse:down', 0, 0);
        fire('mouse:up', 100, 0);
        fire('mouse:down', 0, 100, { button: 2 });
        fire('mouse:up', 0, 100, { button: 2 });
        expect(onDraw).not.toHaveBeenCalled();
    });
});
