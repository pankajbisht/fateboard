import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import {
    readFill,
    readShadow,
    shadowToFabric,
    toFabricGradient,
    reverseStops,
    insertStop,
    type GradientFill,
} from '../fillStyle';

const rect = (fill: unknown) => new fabric.Rect({ width: 200, height: 100, fill: fill as string });

const LINEAR: GradientFill = {
    type: 'linear',
    angle: 90,
    center: { x: 0.5, y: 0.5 },
    radius: 0.5,
    stops: [
        { offset: 0, color: '#ff0000' },
        { offset: 1, color: '#0000ff' },
    ],
};

describe('readFill', () => {
    it('reads none / solid', () => {
        expect(readFill(rect('rgba(0,0,0,0)')).kind).toBe('none');
        expect(readFill(rect('')).kind).toBe('none');
        const solid = readFill(rect('#12ab34'));
        expect(solid).toMatchObject({ kind: 'solid', color: '#12ab34' });
    });

    it('round-trips a linear gradient (type, angle, stops)', () => {
        const r = rect('#000');
        r.set('fill', toFabricGradient({ ...LINEAR, angle: 45 }));
        const f = readFill(r);
        expect(f.kind).toBe('linear');
        expect(f.gradient!.angle).toBeCloseTo(45, 0);
        expect(f.gradient!.stops.map((s) => s.color)).toEqual(['#ff0000', '#0000ff']);
    });

    it('a linear gradient switched to radial starts centered (not at the linear end point)', () => {
        const r = rect('#000');
        r.set('fill', toFabricGradient({ ...LINEAR, angle: 90 }));
        const g = readFill(r).gradient!;
        expect(g.center).toEqual({ x: 0.5, y: 0.5 });
        expect(g.radius).toBe(0.5);
    });

    it('round-trips a radial gradient (center, size)', () => {
        const r = rect('#000');
        r.set(
            'fill',
            toFabricGradient({
                ...LINEAR,
                type: 'radial',
                center: { x: 0.3, y: 0.6 },
                radius: 0.4,
            }),
        );
        const f = readFill(r);
        expect(f.kind).toBe('radial');
        expect(f.gradient!.center.x).toBeCloseTo(0.3);
        expect(f.gradient!.center.y).toBeCloseTo(0.6);
        expect(f.gradient!.radius).toBeCloseTo(0.4);
    });

    it('reads pixel-unit gradients written by the on-canvas editor', () => {
        const r = rect('#000');
        r.set(
            'fill',
            new fabric.Gradient({
                type: 'linear',
                gradientUnits: 'pixels',
                coords: { x1: 0, y1: 0, x2: 0, y2: 100 },
                colorStops: LINEAR.stops,
            }),
        );
        expect(readFill(r).gradient!.angle).toBeCloseTo(90, 0);
    });
});

describe('gradient stop helpers', () => {
    it('reverses stops (offsets mirrored, order kept sorted)', () => {
        expect(reverseStops(LINEAR.stops)).toEqual([
            { offset: 0, color: '#0000ff' },
            { offset: 1, color: '#ff0000' },
        ]);
    });

    it('inserts a stop at an offset with the blended color, keeping order', () => {
        const next = insertStop(LINEAR.stops, 0.5);
        expect(next.stops).toHaveLength(3);
        expect(next.stops[1].offset).toBe(0.5);
        expect(next.stops[1].color).toBe('#800080');
        expect(next.index).toBe(1);
    });
});

describe('shadow', () => {
    it('writes color + opacity as rgba and reads them back as hex + opacity', () => {
        const r = rect('#fff');
        r.set(
            'shadow',
            shadowToFabric({ color: '#ff0000', opacity: 0.5, blur: 10, offsetX: 2, offsetY: 4 }),
        );
        expect((r.shadow as fabric.Shadow).color).toBe('rgba(255, 0, 0, 0.5)');
        expect(readShadow(r)).toEqual({
            color: '#ff0000',
            opacity: 0.5,
            blur: 10,
            offsetX: 2,
            offsetY: 4,
        });
        expect(readShadow(rect('#fff'))).toBeNull();
    });
});
