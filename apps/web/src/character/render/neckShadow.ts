import { apply } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { project } from './camera';
import { on, toScreen, type Ctx } from './parts';
import { hull, smoothClosed, type P2 } from './shapes';
import { darken } from './styles';

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
    // a band under the chin only (most of it hidden by the head), its lower edge dipping a little at the front
    const pts: P2[] = [
        xy(-n * 1.02, h * 1.15, n * 0.2),
        xy(n * 1.02, h * 1.15, n * 0.2),
        xy(-n * 0.98, h * 0.92, n * 0.45),
        xy(n * 0.98, h * 0.92, n * 0.45),
        xy(-n * 0.5, h * 0.82, n * 0.9),
        xy(n * 0.5, h * 0.82, n * 0.9),
        xy(0, h * 0.78, n * 1.0),
    ];
    const poly = hull(pts);
    // a shading layer of the neck (not a part of its own: a style without shading keeps the same parts)
    neck.layers = [
        ...(neck.layers ?? []),
        {
            key: 'neck-shadow',
            kind: 'shade',
            d: smoothClosed(poly),
            fill: darken(ctx.fill.skin, 0.12),
        },
    ];
}
