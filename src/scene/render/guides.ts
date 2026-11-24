import { horizon, makeView, projectSegment, type P2 } from '../camera/projection';
import type { Scene } from '../schema/types';
import { ENVIRONMENTS } from '../sets/registry';
import { clipSegment, polyPath } from './geometry';

/**
 * Studio-only guide lines (never exported): rule of thirds, the horizon, and a 1 m grid on the ground around
 * the stage, drawn with the scene's own camera so it shows the perspective the actors stand in.
 */
export type GuideKind = 'thirds' | 'horizon' | 'grid';

export interface GuidePath {
    key: GuideKind;
    d: string;
}

export function sceneGuides(scene: Scene, kinds: readonly GuideKind[]): GuidePath[] {
    const v = makeView(scene.camera, scene.frame.aspect);
    const { width: w, height: h } = v;
    const out: GuidePath[] = [];
    const seg = (a: P2, b: P2) => {
        const c = clipSegment(a, b, 0, 0, w, h);
        return c ? polyPath(c, false) : '';
    };
    if (kinds.includes('grid')) {
        const { x, z } = ENVIRONMENTS.get(scene.set.environment).stage;
        let d = '';
        for (let i = -6; i <= 6; i++) {
            const a = projectSegment(v, [x + i * 100, 0.5, z - 600], [x + i * 100, 0.5, z + 600]);
            const b = projectSegment(v, [x - 600, 0.5, z + i * 100], [x + 600, 0.5, z + i * 100]);
            if (a) d += seg(a[0], a[1]);
            if (b) d += seg(b[0], b[1]);
        }
        if (d) out.push({ key: 'grid', d });
    }
    if (kinds.includes('horizon')) {
        const hz = horizonLine(v);
        if (hz) {
            const d = seg(hz[0], hz[1]);
            if (d) out.push({ key: 'horizon', d });
        }
    }
    if (kinds.includes('thirds'))
        out.push({
            key: 'thirds',
            d:
                [w / 3, (2 * w) / 3].map((x) => seg([x, 0], [x, h])).join('') +
                [h / 3, (2 * h) / 3].map((y) => seg([0, y], [w, y])).join(''),
        });
    return out;
}

/** The horizon (through its two vanishing points) stretched across the whole frame. */
function horizonLine(v: ReturnType<typeof makeView>): [P2, P2] | null {
    const hz = horizon(v);
    if (!hz) return null;
    const [p, q] = hz;
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const l = Math.hypot(dx, dy);
    if (l < 1e-9) return null;
    const k = (v.width * 4) / l;
    return [
        [p[0] - dx * k, p[1] - dy * k],
        [q[0] + dx * k, q[1] + dy * k],
    ];
}
