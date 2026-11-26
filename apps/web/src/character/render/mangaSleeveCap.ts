import { apply, lerp3, type V3 } from '../rig/math';
import { project } from './camera';
import type { Skeleton } from '../rig/skeleton';
import type { PartGroup } from '../schema/types';
import { addHem, depthOf, inkLine, ringAround } from './clothDetail';
import { mangaShoulderRing } from './mangaTorso';
import { mangaLook } from './mangaVariants';
import { addSurface, on, toScreen, type Ctx, type Material } from './parts';
import { chaikin, hull, smoothClosed, type P2 } from './shapes';

/**
 * A manga sleeve with a head (owner redraw request, 2026-11-25). The old sleeve was a tube that started flat at the
 * shoulder joint: the round end of the arm showed above it, and raising the arm opened a gap between the sleeve and
 * the torso. This sleeve is the hull of a round head round the joint (pushed back over the torso, so it overlaps the
 * shoulder) and the hem ring down the bone. The joint is inside the head at every angle, so nothing opens when the arm
 * rotates. Ink: the outer side carries the silhouette weight, the seam where the head lies on the torso is thinner,
 * the hem is its front arc.
 */
type Cls = 'seam' | 'sil';

export interface CapSleeve {
    key: string;
    group: PartGroup;
    role: Material;
    side: 'L' | 'R';
    /** shoulder and elbow joints */
    a: V3;
    b: V3;
    /** radius at the joint and at the elbow */
    ra: number;
    rb: number;
    /** how far down the bone the sleeve runs (0..1) */
    frac: number;
    /** a free hem at the end (a short sleeve); false: the limb carries on in the same cloth (a long sleeve) */
    hem: boolean;
    /** the top's fit (the torso's shoulder ring is as wide as the cloth) */
    fit: number;
    /** the ink of the seam on the body side when it differs from the fill: a sleeveless top's bare shoulder is skin, its
     * armhole edge is the cloth's */
    seamInk?: Material;
    /** false: no seam on the body side (a bare shoulder over bare skin: there is no cloth edge to ink) */
    seam?: boolean;
}

export function addCapSleeve(ctx: Ctx, skel: Skeleton, o: CapSleeve) {
    const look = mangaLook().sleeve;
    const f = Math.min(1, Math.max(0.05, o.frac));
    const re = (o.ra + (o.rb - o.ra) * f) * (o.hem ? look.hem : 1);
    const A = toScreen(ctx, o.a);
    const E = toScreen(ctx, lerp3(o.a, o.b, f));
    const len = Math.hypot(E[0] - A[0], E[1] - A[1]);
    const u: P2 = len > 1e-4 ? [(E[0] - A[0]) / len, (E[1] - A[1]) / len] : [0, 1];
    const n: P2 = [-u[1], u[0]];
    const head = o.ra * look.cap;
    const C: P2 = [A[0] - u[0] * o.ra * look.back, A[1] - u[1] * o.ra * look.back];
    const pts: P2[] = Array.from({ length: 20 }, (_, i) => {
        const k = (i / 20) * Math.PI * 2;
        return [C[0] + Math.cos(k) * head, C[1] + Math.sin(k) * head];
    });
    for (const q of ringAround(o.a, o.b, f, re)) {
        const s = toScreen(ctx, q.p);
        pts.push([s[0], s[1]]);
    }
    const sx = o.side === 'L' ? 1 : -1;
    const t = skel.offset.spine2[1] / 0.26; // torso length
    // the outer half of the torso's shoulder ring: the joint is below the point of the shoulder, so the head must
    // reach up over it or the torso's shoulder sticks out above the sleeve
    // (a bare shoulder, under a sleeveless top, covers the same: the strap is the part of the torso inside it)
    mangaShoulderRing(ctx, skel, o.fit).forEach((p, i) => {
        if (Math.cos((i / 12) * Math.PI * 2) * sx < 0.45) return;
        const q = toScreen(ctx, p);
        pts.push([q[0], q[1]]);
    });
    if (o.role === 'skin' && o.seam !== false) {
        // a bare shoulder's armhole: from the strap down to the armpit, bowing in toward the chest as a tank top's cut
        // does (the hull alone ran it straight down, a square wedge of skin)
        const z = skel.size;
        const outer = z.shoulderW * 0.46 + z.upperArm * 1.12;
        const armIn = z.shoulderW * 0.46 - z.upperArm * 0.9;
        const chestZ = z.chestDepth * 0.5;
        const a = Math.acos(0.62 * sx);
        const S = on(ctx, 'chest', [
            Math.cos(a) * outer * 0.88,
            t * 0.18,
            Math.sin(a) * chestZ * 0.68 * o.fit,
        ]);
        const C = on(ctx, 'chest', [sx * (armIn - z.upperArm * 0.9), t * 0.06, chestZ * 0.85]);
        const P = on(ctx, 'chest', [sx * armIn, -t * 0.06, chestZ * 0.75]);
        for (let i = 0; i <= 6; i++) {
            const k = i / 6;
            const q = [0, 1, 2].map(
                (d) => (1 - k) * (1 - k) * S[d] + 2 * k * (1 - k) * C[d] + k * k * P[d],
            ) as V3;
            const w = toScreen(ctx, q);
            pts.push([w[0], w[1]]);
        }
    }
    const poly = hull(pts);
    if (poly.length < 3) return;
    // A bare shoulder lies over the torso's (cloth) shoulder even on the far side, which the torso would otherwise cover
    // with a cloth pad; not once that shoulder turns well away (then the torso hides it, as it hides the far arm).
    const away = project(ctx.view, apply(ctx.posed.rot.chest, [sx, 0, 0]))[2];
    const torso = ctx.parts.find((x) => x.key === 'torso')?.depth ?? -Infinity;
    const depth =
        o.role === 'skin' && away > -0.6
            ? Math.max(depthOf(ctx, o.group), torso) + 0.02
            : depthOf(ctx, o.group) + 0.02;
    addSurface(ctx, o.key, o.group, o.role, poly, smoothClosed(poly), depth, o.ra * 2, false, [
        poly,
    ]);
    // a bare shoulder is the arm's own skin: no shading of its own, so no edge shows where it ends on the arm
    if (o.role === 'skin') {
        const part = ctx.parts.find((x) => x.key === o.key);
        if (part) part.layers = [];
    }

    // which side of the arm the body is on (screen), to tell the seam over the torso from the outer silhouette
    const Q = toScreen(ctx, on(ctx, 'chest', [0, 0, 0]));
    const body = (Q[0] - A[0]) * n[0] + (Q[1] - A[1]) * n[1] > 0 ? 1 : -1;
    const along = (p: P2) => (p[0] - A[0]) * u[0] + (p[1] - A[1]) * u[1];
    const across = (p: P2) => ((p[0] - A[0]) * n[0] + (p[1] - A[1]) * n[1]) * body;
    const endFrom = len - re * 0.6;
    // Each edge of the outline: the end is skipped (a short sleeve's hem is its front arc, addHem; a long sleeve or a
    // bare shoulder carries on into the limb, whose own contour this shape covers, so its sides are inked down to the
    // end), so is the top of a sleeve's head where it lies over the torso's own shoulder line (inked it made a wedge);
    // the rest of the body side is the thin seam, the outer side the silhouette. On a bare shoulder the body side above
    // the joint is the armhole: it is inked, in the cloth's colour.
    const cls = (p: P2, q: P2): Cls | 'skip' => {
        const mid: P2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const inner = across(mid) > o.ra * 0.15;
        // the end: a short sleeve's hem side, or the end of a cap that carries on into the limb (shorter than the limb is
        // wide, a bare shoulder's cap drew its bottom edge as a line across the upper arm)
        const endAt = o.hem ? endFrom : len - re * 0.25;
        if ((len > o.ra || !o.hem) && along(p) > endAt && along(q) > endAt) return 'skip';
        if (inner && along(p) < 0 && along(q) < 0 && o.role !== 'skin') return 'skip';
        if (inner && o.seam === false) return 'skip';
        return inner ? 'seam' : 'sil';
    };
    const edges = poly.map((p, i) => cls(p, poly[(i + 1) % poly.length]));
    // chains of edges of one class, starting after a skipped edge so no chain wraps round the start; every chain
    // tapers at both ends, so where the outer side begins on the torso's shoulder it fades into that contour
    const start = Math.max(0, edges.indexOf('skip') + 1);
    const runs: { k: Cls; pts: P2[] }[] = [];
    let open: { k: Cls; pts: P2[] } | null = null;
    for (let i = 0; i < poly.length; i++) {
        const j = (start + i) % poly.length;
        const k = edges[j];
        const p = poly[j];
        const q = poly[(j + 1) % poly.length];
        if (k === 'skip') open = null;
        else if (open && open.k === k) open.pts.push(q);
        else {
            open = { k, pts: [p, q] };
            runs.push(open);
        }
    }
    const sil = ctx.pack.line.silhouette;
    runs.forEach((r, i) => {
        if (r.pts.length < 2) return;
        inkLine(
            ctx,
            `${o.key}-${r.k}${i}`,
            o.group,
            r.k === 'seam' ? (o.seamInk ?? o.role) : o.role,
            [{ pts: chaikin(r.pts), taper: [true, true] }],
            depth + 0.002,
            r.k === 'seam' ? 0.55 : sil,
        );
    });
    if (o.hem) addHem(ctx, `${o.key}-hem`, o.group, o.role, o.a, o.b, f, re, depth + 0.003);
}
