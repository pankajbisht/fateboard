import { apply } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { project } from './camera';
import { on, toScreen, type Ctx } from './parts';
import { hull, smoothClosed, type P2 } from './shapes';
import { shadeOf } from './styles';

/**
 * The neck in the same skin as the face (the manga body, as the owner's reference sheets draw it), with only a thin
 * soft shadow right under the jaw. The neck's own shading and a deep jaw shadow over most of it made the neck darker
 * than the face above and the neckline's skin below: it read as a separate piece, a jointed doll. Drawn just over the
 * neck's own fill as one of its shading layers, only while the neck's front faces the viewer.
 */
export function addJawShadow(ctx: Ctx, skel: Skeleton) {
    if (ctx.pack.palette === 'manga' || ctx.pack.shading.kind === 'none') return;
    const neck = ctx.parts.find((x) => x.key === 'neck');
    if (!neck) return;
    // the neck's own shading bands go: one tone with the face and the neckline
    neck.layers = neck.layers?.filter((l) => l.kind !== 'shade');
    const facing = project(ctx.view, apply(ctx.posed.rot.neck, [0, 0, 1]))[2];
    if (facing < 0.1) return;
    const n = skel.size.neck;
    const h = skel.offset.head[1];
    const xy = (x: number, y: number, z: number): P2 => {
        const s = toScreen(ctx, on(ctx, 'neck', [x, y, z]));
        return [s[0], s[1]];
    };
    // the jaw's cast shadow over the top of the neck (its upper part hidden by the head), its lower edge dipping at the
    // front. A thin band right under the chin, lighter than the face's own shade, read as a ring: the head looked like a
    // separate piece set on the neck.
    const pts: P2[] = [
        xy(-n * 1.02, h * 1.15, n * 0.2),
        xy(n * 1.02, h * 1.15, n * 0.2),
        xy(-n * 0.99, h * 0.72, n * 0.4),
        xy(n * 0.99, h * 0.72, n * 0.4),
        xy(-n * 0.55, h * 0.6, n * 0.9),
        xy(n * 0.55, h * 0.6, n * 0.9),
        xy(0, h * 0.55, n * 1.0),
    ];
    const poly = hull(pts);
    const soft = ctx.pack.shading.kind === 'soft';
    // a shading layer of the neck (not a part of its own: a style without shading keeps the same parts)
    neck.layers = [
        ...(neck.layers ?? []),
        {
            key: 'neck-shadow',
            kind: 'shade',
            d: smoothClosed(poly),
            // the same tone as the face's shade (parts.ts addSurface: soft shading stacks three bands of 0.38), so the
            // shaded side of the face runs on into the neck
            fill: shadeOf(ctx.fill.skin, ctx.pack.shading.strength * (soft ? 1.4 : 1)),
            ...(soft ? { opacity: 0.76 } : {}),
        },
    ];
}
