import type { JointId, PartGroup } from '../schema/types';
import { pointOn, type Posed } from '../rig/fk';
import type { M3, V3 } from '../rig/math';
import { project } from './camera';
import { capsule, capsulePoly, crescent, hull, smoothClosed, smoothPoly, type P2 } from './shapes';
import { lighten, MANGA_PAPER, shadeOf, type StylePack } from './styles';

/**
 * Shared building blocks of the renderer: a drawn part, the drawing context, and helpers that turn 3D points
 * on the posed skeleton into parts (a capsule between two points, a smooth shell around sample points). The
 * style pack adds layers on top of each part: shadow crescents, a rim light, a hair highlight, and the outline
 * drawn last so shading never covers it.
 */
/** `acc` = the accessory being drawn (its colour is set just before: render/accPaint.ts) */
export type Material = 'skin' | 'top' | 'bottom' | 'shoes' | 'hair' | 'hair2' | 'acc';
export type PartRole = Material | 'feature' | 'line';

export interface LinearPaint {
    kind: 'linear';
    /** 90 = top → bottom */
    angle: number;
    stops: [number, string][];
}
export type Paint = string | LinearPaint;

/** Drawn on top of its part, in order. */
export interface Layer {
    key: string;
    kind: 'shade' | 'light' | 'outline';
    d: string;
    fill: Paint;
    stroke?: string | null;
    strokeWidth?: number;
    opacity?: number;
    /** manga screentone: ink coverage 0..1 */
    tone?: number;
}

export interface Part {
    /** stable across renders (React key, selection) */
    key: string;
    /** the selectable body part it belongs to */
    group: PartGroup | 'hair';
    role: PartRole;
    d: string;
    fill: Paint;
    stroke: string | null;
    strokeWidth: number;
    /** + = nearer the viewer; parts are drawn far to near */
    depth: number;
    /** manga screentone: ink coverage 0..1 */
    tone?: number;
    layers?: Layer[];
}

export interface Ctx {
    posed: Posed;
    view: M3;
    pack: StylePack;
    /** the style's colour grade (eye colour and other colours that are not a material) */
    tint: (hex: string) => string;
    /** a free colour through the style's palette and the scene's grade (accessories) */
    paint: (hex: string) => { fill: string; tone: number };
    /** colour per material, already mapped to the palette (manga: paper or ink) */
    fill: Record<Material, string>;
    /** manga: screentone ink coverage per material (0 = none) */
    tone: Record<Material, number>;
    outline: (fill: string) => string;
    line: number;
    /** screen direction toward the key light (unit) */
    light: P2;
    /** every projected sample point (framing) */
    points: P2[];
    parts: Part[];
}

export const toScreen = (ctx: Ctx, p: V3): V3 => {
    const s = project(ctx.view, p);
    ctx.points.push([s[0], s[1]]);
    return s;
};

export const on = (ctx: Ctx, j: JointId, local: V3): V3 => pointOn(ctx.posed, j, local);

function paintOf(ctx: Ctx, role: Material): Paint {
    const base = ctx.fill[role];
    const { pack } = ctx;
    if (pack.palette === 'manga') return base;
    if (role === 'hair' && pack.hairGradient)
        return {
            kind: 'linear',
            angle: 90,
            stops: [
                [0, lighten(base, 0.2)],
                [1, shadeOf(base, 0.28)],
            ],
        };
    if ((role === 'top' || role === 'bottom') && pack.clothGradient)
        return {
            kind: 'linear',
            angle: 90,
            stops: [
                [0, lighten(base, 0.07)],
                [1, shadeOf(base, 0.13)],
            ],
        };
    return base;
}

/** The part, then the style's layers: shadow bands, rim light, hair highlight, outline on top. */
export function addSurface(
    ctx: Ctx,
    key: string,
    group: PartGroup | 'hair',
    role: Material,
    poly: P2[],
    d: string,
    depth: number,
    size: number,
    /** false: the fill and its shading only; a separate contour part draws the outline (manga body) */
    outlined = true,
    /**
     * Convex pieces to cut the shading from. Shading is a crescent of a convex shape, so a body with a waist or a
     * bent limb gives its convex slabs here instead; each crescent then stays inside its slab, inside the outline.
     */
    shadePolys?: P2[][],
    /** a shadow band for shapes that are not convex (a waist): given the shading size, the polygon to fill */
    shadeBand?: (size: number) => P2[],
) {
    const { pack, light } = ctx;
    const base = ctx.fill[role];
    const stroke = outlined ? ctx.outline(base) : null;
    const width = ctx.line * pack.line.silhouette;
    const layers: Layer[] = [];
    const shift = (k: number): P2 => [light[0] * size * k, light[1] * size * k];
    const ink = pack.palette === 'manga' && base !== MANGA_PAPER;

    const pieces = shadePolys ?? [poly];
    if (pack.shading.kind !== 'none' && !ink) {
        const bands = pack.shading.kind === 'soft' ? [1, 0.75, 0.5] : [1];
        bands.forEach((b, i) => {
            pieces.forEach((piece, pi) => {
                const c = shadeBand
                    ? shadeBand(pack.shading.offset * b)
                    : crescent(piece, shift(pack.shading.offset * b));
                if (!c || c.length < 3) return;
                const manga = pack.palette === 'manga';
                layers.push({
                    key: `${key}-shade${i}${pi ? `-${pi}` : ''}`,
                    kind: 'shade',
                    d: smoothClosed(c),
                    fill: manga
                        ? MANGA_PAPER
                        : shadeOf(base, pack.shading.strength * (bands.length > 1 ? 1.4 : 1)),
                    // manga: a shadow is a denser tone than its material (dark skin: denser still)
                    ...(manga
                        ? { tone: Math.min(0.7, ctx.tone[role] ? ctx.tone[role] + 0.2 : 0.45) }
                        : bands.length > 1
                          ? { opacity: 0.38 }
                          : {}),
                });
            });
        });
    }
    // the rim light is a crescent too: not for a waisted body (it would be a wedge); its shadow band is enough
    if (pack.rim && !ink && !shadeBand)
        pieces.forEach((piece, pi) => {
            const c = crescent(piece, shift(0.07));
            if (c)
                layers.push({
                    key: `${key}-rim${pi ? `-${pi}` : ''}`,
                    kind: 'light',
                    d: smoothClosed(c),
                    fill: lighten(base, pack.rim),
                });
        });
    if (role === 'hair' && pack.hairHighlight && key === 'hair-front') {
        const c = crescent(poly, shift(-0.13));
        if (c)
            layers.push({
                key: `${key}-shine`,
                kind: 'light',
                d: smoothClosed(c),
                fill: ink ? MANGA_PAPER : lighten(base, 0.45),
            });
    }
    const outlineOnTop = layers.length > 0 && stroke !== null;
    if (outlineOnTop)
        layers.push({
            key: `${key}-line`,
            kind: 'outline',
            d,
            fill: 'none',
            stroke,
            strokeWidth: width,
        });
    ctx.parts.push({
        key,
        group,
        role,
        d,
        fill: paintOf(ctx, role),
        stroke: outlineOnTop ? null : stroke,
        strokeWidth: outlineOnTop ? 0 : width,
        depth,
        ...(ctx.tone[role] ? { tone: ctx.tone[role] } : {}),
        ...(layers.length ? { layers } : {}),
    });
}

/** A tapered limb from `a` to `b`. */
export function addLimb(
    ctx: Ctx,
    key: string,
    group: PartGroup,
    role: Material,
    a: V3,
    ra: number,
    b: V3,
    rb: number,
    depthBias = 0,
) {
    const k = ctx.pack.proportion.limb ?? 1;
    ra *= k;
    rb *= k;
    const pa = toScreen(ctx, a);
    const pb = toScreen(ctx, b);
    const A: P2 = [pa[0], pa[1]];
    const B: P2 = [pb[0], pb[1]];
    addSurface(
        ctx,
        key,
        group,
        role,
        capsulePoly(A, ra, B, rb),
        capsule(A, ra, B, rb),
        (pa[2] + pb[2]) / 2 + depthBias,
        ra + rb,
    );
}

/** A smooth shape around 3D points; depth = their average unless given. */
export function addShell(
    ctx: Ctx,
    key: string,
    group: PartGroup | 'hair',
    role: Material,
    points: V3[],
    depth?: number,
) {
    const s = points.map((p) => toScreen(ctx, p));
    const poly = hull(s.map((p) => [p[0], p[1]]));
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const size = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    // shading is cut from the rounded outline as drawn, so it never spills past it
    addSurface(
        ctx,
        key,
        group,
        role,
        smoothPoly(poly),
        smoothClosed(poly),
        depth ?? s.reduce((a, p) => a + p[2], 0) / s.length,
        size,
    );
}

/** `n` points on a horizontal ellipse in a joint's frame (local y = `y`). */
export function ring(
    ctx: Ctx,
    j: JointId,
    y: number,
    rx: number,
    rz: number,
    n = 12,
    dz = 0,
): V3[] {
    const out: V3[] = [];
    for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        out.push(on(ctx, j, [Math.cos(t) * rx, y, Math.sin(t) * rz + dz]));
    }
    return out;
}

/** Points on an ellipsoid in a joint's frame, filtered by `keep` (local unit coordinates). */
export function ellipsoid(
    ctx: Ctx,
    j: JointId,
    center: V3,
    r: V3,
    keep: (u: V3) => boolean = () => true,
    lat = 8,
    lon = 14,
): V3[] {
    const out: V3[] = [];
    for (let a = 0; a <= lat; a++) {
        const phi = -Math.PI / 2 + (a / lat) * Math.PI;
        for (let b = 0; b < lon; b++) {
            const th = (b / lon) * Math.PI * 2;
            const u: V3 = [
                Math.cos(phi) * Math.sin(th),
                Math.sin(phi),
                Math.cos(phi) * Math.cos(th),
            ];
            if (!keep(u)) continue;
            out.push(
                on(ctx, j, [
                    center[0] + u[0] * r[0],
                    center[1] + u[1] * r[1],
                    center[2] + u[2] * r[2],
                ]),
            );
        }
    }
    return out;
}

/** Every path to draw, in order (a part, then its layers): what the studio view, the SVG and the board share. */
export interface Drawable {
    key: string;
    group: PartGroup | 'hair';
    d: string;
    fill: Paint;
    stroke: string | null;
    strokeWidth: number;
    opacity?: number;
    /** manga screentone: ink coverage 0..1 */
    tone?: number;
    /** the part's own shape (selection outline) */
    main: boolean;
    /** width of the part's outline, wherever it is drawn (selection ring) */
    outlineWidth: number;
}

export function drawables(parts: Part[]): Drawable[] {
    const out: Drawable[] = [];
    for (const p of parts) {
        const outlineWidth =
            p.layers?.find((l) => l.kind === 'outline')?.strokeWidth ?? p.strokeWidth;
        out.push({
            key: p.key,
            group: p.group,
            d: p.d,
            fill: p.fill,
            stroke: p.stroke,
            strokeWidth: p.strokeWidth,
            tone: p.tone,
            main: true,
            outlineWidth,
        });
        for (const l of p.layers ?? [])
            out.push({
                key: l.key,
                group: p.group,
                d: l.d,
                fill: l.fill,
                stroke: l.stroke ?? null,
                strokeWidth: l.strokeWidth ?? 0,
                opacity: l.opacity,
                tone: l.tone,
                main: false,
                outlineWidth,
            });
    }
    return out;
}
