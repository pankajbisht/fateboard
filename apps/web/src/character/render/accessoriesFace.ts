import type { Character } from '../schema/types';
import { useColor } from './accPaint';
import { ellipse, polyline, type P2 } from './shapes';
import type { Ctx } from './parts';

/** What face.ts hands over: where a spot on the head is on screen, and whether it is seen. */
export interface FaceSpots {
    at: (lon: number, lat: number, out?: number) => { facing: number; p: P2 };
    shows: (lon: number, lat: number, reach: number) => boolean;
    /** the eye's half width on screen, and the head's sideways tilt (degrees) */
    eye: number;
    tilt: number;
    depth: number;
    lineW: number;
}

/** Glasses, sunglasses and a bindi, drawn over the face's own features. */
export function addFaceAccessories(ctx: Ctx, c: Character, s: FaceSpots) {
    for (const a of c.dress.accessories) {
        useColor(ctx, a.color);
        const part = (key: string, d: string, fill: string, w: number, bias: number) =>
            ctx.parts.push({
                key,
                group: 'head',
                role: fill === 'none' ? 'line' : 'feature',
                d,
                fill,
                stroke: ctx.fill.acc,
                strokeWidth: w,
                depth: s.depth + bias,
            });
        if (a.kind === 'glasses' || a.kind === 'sunglasses') {
            const eyes = [-1, 1].map((sx) => ({ sx, e: s.at(sx * 0.36, -0.1, 1.03) }));
            for (const { sx, e } of eyes) {
                if (!s.shows(sx * 0.36, -0.1, s.eye * 1.6)) continue;
                part(
                    `acc-lens${sx}`,
                    ellipse(e.p, s.eye * 1.55, s.eye * 1.3, s.tilt),
                    a.kind === 'sunglasses' ? ctx.fill.acc : 'none',
                    s.lineW * 1.3,
                    0.2,
                );
            }
            if (eyes.every(({ sx }) => s.shows(sx * 0.36, -0.1, s.eye * 1.6)))
                part(
                    'acc-bridge',
                    polyline([
                        [eyes[0].e.p[0] + s.eye * 1.55, eyes[0].e.p[1]],
                        [eyes[1].e.p[0] - s.eye * 1.55, eyes[1].e.p[1]],
                    ]),
                    'none',
                    s.lineW * 1.1,
                    0.2,
                );
        }
        if (a.kind === 'bindi' && s.shows(0, 0.26, 0)) {
            const b = s.at(0, 0.26, 1.02);
            part('acc-bindi', ellipse(b.p, s.eye * 0.32, s.eye * 0.32, 0), ctx.fill.acc, 0, 0.2);
        }
    }
}
