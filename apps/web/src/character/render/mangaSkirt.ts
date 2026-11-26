import type { V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { addRingHem, inkLine } from './clothDetail';
import { addLoft } from './loft';
import type { SkirtLook } from './mangaVariants';
import { ring, toScreen, type Ctx, type Material } from './parts';
import { shadeOf } from './styles';
import type { P2 } from './shapes';

/**
 * The skirt's details on the manga body (owner redraw request, 2026-11-25): a waistband that wraps the waist (a band
 * one shade darker with its lower edge inked across the front) and a few fold or pleat lines down the front, each
 * drawn only while it faces the camera. `rings` are the skirt loft's rings (hangLoft.ts): 12 points each, angle 0 at
 * the character's left, a quarter turn = the front.
 */
export function addSkirtDetail(
    ctx: Ctx,
    skel: Skeleton,
    rings: V3[][],
    role: Material,
    depth: number,
    look: SkirtLook,
) {
    const z = skel.size;
    const t0 = skel.offset.spine2[1] / 0.26; // torso length
    if (look.band > 0) {
        const half = z.waistW * 0.4 * 1.06;
        const band = [
            ring(ctx, 'spine1', t0 * 0.06, half, z.chestDepth * 0.41, 12, z.belly * 0.5),
            ring(
                ctx,
                'spine1',
                t0 * (0.06 - look.band),
                half * 1.02,
                z.chestDepth * 0.42,
                12,
                z.belly * 0.5,
            ),
        ];
        const before = ctx.parts.length;
        addLoft(ctx, 'skirt-band', 'torso', role, band, depth + 0.001, false);
        for (const part of ctx.parts.slice(before))
            if (part.key === 'skirt-band' && ctx.pack.palette !== 'manga')
                part.fill = shadeOf(ctx.fill[role], 0.16);
        addRingHem(ctx, 'skirt-band-edge', 'torso', role, band[1], depth + 0.003);
    }
    if (look.folds <= 0 || rings.length < 3) return;
    // the point at `a` (radians, 0 = left, π/2 = front) on a 12-point ring, between its samples
    const at = (rg: V3[], a: number): V3 => {
        const f = ((((a / (Math.PI * 2)) * rg.length) % rg.length) + rg.length) % rg.length;
        const i = Math.floor(f);
        const k = f - i;
        const p = rg[i];
        const q = rg[(i + 1) % rg.length];
        return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];
    };
    const centre = (rg: V3[]): V3 =>
        rg.reduce<V3>(
            (m, p) => [m[0] + p[0] / rg.length, m[1] + p[1] / rg.length, m[2] + p[2] / rg.length],
            [0, 0, 0],
        );
    // the folds start part way down and open toward the hem
    const from = 2;
    const span = 1.1; // radians of the front the folds spread over
    for (let i = 0; i < look.folds; i++) {
        const a = Math.PI / 2 + (look.folds === 1 ? 0 : -span / 2 + (span * i) / (look.folds - 1));
        const pts: P2[] = [];
        let facing = 0;
        for (let r = from; r < rings.length; r++) {
            const p3 = at(rings[r], a);
            const s = toScreen(ctx, p3);
            const c = toScreen(ctx, centre(rings[r]));
            facing += s[2] - c[2];
            // a soft fold begins half way between its first two rings
            if (r === from) {
                const n = toScreen(ctx, at(rings[r + 1], a));
                pts.push([(s[0] + n[0]) / 2, (s[1] + n[1]) / 2]);
            } else pts.push([s[0], s[1]]);
        }
        if (facing <= 0 || pts.length < 2) continue;
        // the line stops a little above the hem, so it does not cut the hem's ink
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        pts[pts.length - 1] = [
            last[0] - (last[0] - prev[0]) * 0.08,
            last[1] - (last[1] - prev[1]) * 0.08,
        ];
        inkLine(
            ctx,
            `skirt-fold${i}`,
            'torso',
            role,
            [{ pts, taper: [true, true] }],
            depth + 0.003,
            0.5,
        );
    }
}
