// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    FRAME_W,
    frameHeight,
    horizon,
    makeView,
    project,
    projectPolygon,
    scaleAt,
    screenToGround,
    vanishingPoint,
} from '../camera/projection';
import { DEFAULT_SCENE_CAMERA } from '../schema/parse';
import type { SceneCamera, V3 } from '../schema/types';

const cam = (patch: Partial<SceneCamera> = {}): SceneCamera => ({
    ...DEFAULT_SCENE_CAMERA,
    ...patch,
});
const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('scene camera projection', () => {
    it('a point straight ahead lands in the middle of the frame', () => {
        const v = makeView(cam({ position: [0, 100, 500], pitch: 0 }), '16:9');
        const p = project(v, [0, 100, 0])!;
        close(p[0], FRAME_W / 2);
        close(p[1], frameHeight('16:9') / 2);
    });

    it('frame → ground → frame is the identity (perspective and orthographic, any angle)', () => {
        const lenses: SceneCamera['lens'][] = [
            { kind: 'perspective', focalMm: 24 },
            { kind: 'perspective', focalMm: 85 },
            { kind: 'orthographic', heightCm: 600 },
        ];
        for (const lens of lenses)
            for (const yaw of [0, 37, 140, 300])
                for (const pitch of [5, 30, 70]) {
                    const v = makeView(
                        cam({ position: [120, 260, 640], yaw, pitch, roll: 4, lens }),
                        '4:3',
                    );
                    for (const [sx, sy] of [
                        [500, 600],
                        [120, 700],
                        [880, 520],
                    ]) {
                        const g = screenToGround(v, sx, sy);
                        if (!g) continue;
                        close(g[1], 0);
                        const back = project(v, g)!;
                        close(back[0], sx, 1e-6);
                        close(back[1], sy, 1e-6);
                    }
                }
    });

    it('things twice as far are drawn half as big', () => {
        const v = makeView(cam({ position: [0, 150, 800], pitch: 0 }), '16:9');
        close(scaleAt(v, [0, 150, 400]) / scaleAt(v, [0, 150, 0]), 2, 1e-9);
    });

    it('parallel ground lines meet at their vanishing point, on the horizon', () => {
        const v = makeView(cam({ position: [0, 160, 700], yaw: 25, pitch: 10 }), '16:9');
        const dir: V3 = [0.3, 0, -1];
        const vp = vanishingPoint(v, dir)!;
        for (const x0 of [-200, 0, 300]) {
            const a = project(v, [x0, 0, 0])!;
            const b = project(v, [x0 + dir[0] * 5000, 0, dir[2] * 5000])!;
            // vp, a, b on one line
            const cross = (b[0] - a[0]) * (vp[1] - a[1]) - (b[1] - a[1]) * (vp[0] - a[0]);
            expect(Math.abs(cross) / Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThan(1e-6);
        }
        const [h0, h1] = horizon(v)!;
        const onHorizon = (h1[0] - h0[0]) * (vp[1] - h0[1]) - (h1[1] - h0[1]) * (vp[0] - h0[0]);
        expect(Math.abs(onHorizon) / Math.hypot(h1[0] - h0[0], h1[1] - h0[1])).toBeLessThan(1e-6);
    });

    it('a level camera puts the horizon through the middle of the frame', () => {
        const v = makeView(cam({ pitch: 0, roll: 0 }), '1:1');
        const [a, b] = horizon(v)!;
        close(a[1], FRAME_W / 2, 1e-6);
        close(b[1], FRAME_W / 2, 1e-6);
    });

    it('a floor that runs behind the camera is cut at the near plane, never flipped', () => {
        const v = makeView(cam({ position: [0, 150, 300], pitch: 10 }), '16:9');
        const poly = projectPolygon(v, [
            [-5000, 0, -5000],
            [5000, 0, -5000],
            [5000, 0, 5000],
            [-5000, 0, 5000],
        ])!;
        expect(poly.length).toBeGreaterThanOrEqual(3);
        for (const [x, y] of poly) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        // the floor is below the horizon: no point of it above the middle line (camera looks down)
        expect(Math.min(...poly.map(([, y]) => y))).toBeGreaterThan(0);
        expect(
            projectPolygon(v, [
                [0, 0, 400],
                [10, 0, 400],
                [10, 0, 410],
            ]),
        ).toBeNull();
    });
});
