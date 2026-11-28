/**
 * Geometry tool: the object a finished stroke adds to the board, in scene units. Drafter = its line /
 * dimension / construction line (./drafterTool.ts); Scale and Set square = a line in the pen width; Protractor
 * = both arms, the angle arc and its degree label as one group; Compass = a circle or an arc.
 */
import * as fabric from 'fabric';
import { angleOf, mmToPx } from '@/lib/canvas/drafter';
import { angleArcRadius, arcPath, rayPoint } from '@/lib/canvas/geometry';
import type { Unit } from '@/lib/units';
import { drafterObject } from './drafterTool';
import type { GeometryStyle } from './paintToolStyles';

type Pt = { x: number; y: number };
type Named = fabric.FabricObject & { name?: string };

const common = { originX: 'left', originY: 'top', fill: null, strokeLineCap: 'round' } as const;
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const named = <T extends fabric.FabricObject>(o: T, name: string): T => {
    (o as Named).name = name;
    return o;
};

function angleObject(v: Pt, a: Pt, b: Pt, sweep: number, style: GeometryStyle, color: string) {
    const pen = { ...common, stroke: color, strokeWidth: mmToPx(style.penMm) };
    const arms = new fabric.Path(`M ${a.x} ${a.y} L ${v.x} ${v.y} L ${b.x} ${b.y}`, {
        ...pen,
        strokeLineJoin: 'round',
    });
    const r = angleArcRadius(dist(v, a), dist(v, b));
    const a0 = angleOf(v, a);
    const arc = new fabric.Path(arcPath(v, r, a0, sweep), { ...pen, strokeWidth: mmToPx(0.25) });
    const at = rayPoint(v, a0 + sweep / 2, r + mmToPx(4));
    const label = new fabric.FabricText(`${+Math.abs(sweep).toFixed(1)}°`, {
        left: at.x,
        top: at.y,
        originX: 'center',
        originY: 'center',
        fontSize: mmToPx(3.5),
        fontFamily: 'Inter, Arial, sans-serif',
        fill: color,
    });
    return named(
        new fabric.Group([arms, arc, label], { originX: 'left', originY: 'top' }),
        'Angle',
    );
}

/**
 * The object for a finished stroke: `points` as the instrument placed them (2 or 3), `sweep` the angle from the
 * first arm (Protractor) or radius (Compass arc) to the last point, continuous past 180°.
 */
export function geometryObject(
    points: Pt[],
    sweep: number,
    style: GeometryStyle,
    color: string,
    unit: Unit,
): fabric.FabricObject {
    const [a, b, c] = points;
    switch (style.instrument) {
        case 'protractor':
            return angleObject(a, b, c, sweep, style, color);
        case 'compass': {
            const pen = { ...common, stroke: color, strokeWidth: mmToPx(style.penMm) };
            const r = dist(a, b);
            if (style.compass === 'arc' && c)
                return named(new fabric.Path(arcPath(a, r, angleOf(a, b), sweep), pen), 'Arc');
            return named(
                new fabric.Circle({
                    ...pen,
                    left: a.x,
                    top: a.y,
                    originX: 'center',
                    originY: 'center',
                    radius: r,
                }),
                'Circle',
            );
        }
        case 'scale':
        case 'setSquare':
            return drafterObject(a, b, { mode: 'line', penMm: style.penMm }, color, unit);
        default:
            return drafterObject(a, b, style, color, unit);
    }
}
