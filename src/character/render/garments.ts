import type { BottomDef, Collar, TopDef } from '../data/garments';
import { addMangaHanging } from './hangLoft';
import { apply, lerp3, normalize, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { project } from './camera';
import { addLimb, addShell, ellipsoid, on, ring, toScreen, type Ctx, type Material } from './parts';
import { curve3, polyline, type P2 } from './shapes';
import { darken } from './styles';

/**
 * Garments on the body (docs/CHARACTER_STUDIO.md phase 3), driven by the data in `data/garments.ts`: sleeves and
 * trouser legs along the limb (recoloured when they fit close, drawn as thicker overlays when loose or partial), a
 * skirt or a long top as a shell hanging from the waist, collars, and folds on loose cloth.
 */
type Side = 'L' | 'R';

/** The limb part, covered from its start to `frac` of its length in the garment's colour, a little thicker. */
export function cover(
    ctx: Ctx,
    key: string,
    group: Parameters<typeof addLimb>[2],
    role: Material,
    a: V3,
    ra: number,
    b: V3,
    rb: number,
    frac: number,
    scale: number,
) {
    const end = lerp3(a, b, Math.min(1, frac));
    const before = ctx.parts.length;
    addLimb(
        ctx,
        key,
        group,
        role,
        a,
        ra * scale,
        end,
        (ra + (rb - ra) * Math.min(1, frac)) * scale,
        0.02,
    );
    // a cover sits on the limb it covers: just in front of that limb's own part, whatever depth its shape gives it
    // (the manga body's bent limbs take their depth from the whole limb, so a sleeve could fall behind its arm)
    const limb = ctx.parts.find((x) => x.key === group);
    if (limb)
        for (const part of ctx.parts.slice(before))
            part.depth = Math.max(part.depth, limb.depth + 0.02);
}

/** Roles of an arm's two limbs for a top: recoloured when the sleeve covers it and fits close. */
/** `ignoreLoose`: the manga body colours its limb shape with the cloth even when the sleeve is loose (the cloth overlay then adds the bagginess). */
export function sleeveRoles(
    def: TopDef,
    ignoreLoose = false,
): { upper: Material; lower: Material } {
    const loose = !ignoreLoose && def.fit > 1.02;
    return {
        upper: def.sleeve >= 1 && !loose ? 'top' : 'skin',
        lower: def.sleeve >= 2 && !loose ? 'top' : 'skin',
    };
}

/**
 * Overlays for the sleeve parts that were not recoloured. On the manga body the sleeve is wider: the bent arm swells to
 * about 1.1 of its radius and carries its own outline, which showed just inside a tight sleeve as a doubled line.
 */
export function addSleeve(ctx: Ctx, skel: Skeleton, s: Side, def: TopDef, manga = false) {
    const z = skel.size;
    const p = ctx.posed.pos;
    const upper = `upperArm${s}` as const;
    const lower = `lowerArm${s}` as const;
    const hand = `hand${s}` as const;
    const L = def.sleeve;
    const roles = sleeveRoles(def);
    const k = def.fit > 1.02 ? def.fit * 1.1 : 1;
    if (L > 0 && roles.upper === 'skin')
        cover(
            ctx,
            `${upper}-sleeve`,
            upper,
            'top',
            p[upper],
            z.upperArm,
            p[lower],
            z.foreArm * 1.08,
            Math.min(L, 1),
            (manga ? 1.32 : 1.18 * 0.95) * k,
        );
    if (L > 1 && roles.lower === 'skin')
        cover(
            ctx,
            `${lower}-sleeve`,
            lower,
            'top',
            p[lower],
            z.foreArm * 1.1,
            p[hand],
            z.wrist * 1.1,
            L - 1,
            (manga ? 1.24 : 1.08) * k,
        );
}

/** Roles of a leg's two limbs for a bottom. */
export function legRoles(def: BottomDef, ignoreLoose = false): { thigh: Material; shin: Material } {
    const loose = !ignoreLoose && Math.abs(def.fit - 1) > 0.02;
    return {
        thigh: def.leg >= 1 && !loose ? 'bottom' : 'skin',
        shin: def.leg >= 2 && !loose ? 'bottom' : 'skin',
    };
}

export function addLegCloth(ctx: Ctx, skel: Skeleton, s: Side, def: BottomDef) {
    const z = skel.size;
    const p = ctx.posed.pos;
    const thigh = `upperLeg${s}` as const;
    const shin = `lowerLeg${s}` as const;
    const foot = `foot${s}` as const;
    const roles = legRoles(def);
    if (def.leg > 0 && roles.thigh === 'skin')
        cover(
            ctx,
            `${thigh}-cloth`,
            thigh,
            'bottom',
            p[thigh],
            z.thigh,
            p[shin],
            z.knee,
            Math.min(def.leg, 1),
            def.fit * 1.04,
        );
    // a leg longer than the knee but not recoloured: the lower part
    const lowerLen = def.leg - 1;
    if (def.leg > 1 && (roles.shin === 'skin' || def.leg < 2))
        cover(
            ctx,
            `${shin}-cloth`,
            shin,
            'bottom',
            p[shin],
            z.knee * 0.95,
            p[foot],
            z.ankle,
            lowerLen,
            def.fit * 1.04,
        );
}

/** A point `s` along the leg: 0 = hip, 1 = knee, 2 = ankle. */
const along = (ctx: Ctx, s: Side, t: number): V3 => {
    const p = ctx.posed.pos;
    const hip = p[`upperLeg${s}`];
    const knee = p[`lowerLeg${s}`];
    const ankle = p[`foot${s}`];
    return t <= 1 ? lerp3(hip, knee, t) : lerp3(knee, ankle, Math.min(1, t - 1));
};

/**
 * A shell hanging from the waist to `t` along both legs (skirt, tunic, kurta): in front of the legs. The manga body
 * hangs it as a loft that follows the hips instead (hangLoft.ts); a convex shell ballooned on its waisted torso.
 */
export function addHanging(
    ctx: Ctx,
    skel: Skeleton,
    key: string,
    role: Material,
    t: number,
    flare: number,
    manga = false,
) {
    if (manga) return addMangaHanging(ctx, skel, key, role, t, flare);
    const z = skel.size;
    const torsoLen = skel.offset.spine2[1] / 0.26;
    const hem: V3[] = [];
    for (const s of ['L', 'R'] as const) {
        const at = along(ctx, s, t);
        const r = z.thigh * (flare + 0.45 * Math.min(t, 1.4));
        for (const [dx, dz] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [0.7, 0.7],
            [-0.7, 0.7],
            [0.7, -0.7],
            [-0.7, -0.7],
        ])
            hem.push([at[0] + dx * r, at[1], at[2] + dz * r]);
    }
    const waist = ring(
        ctx,
        'spine1',
        -torsoLen * 0.04,
        z.waistW * 0.55,
        z.chestDepth * 0.46,
        12,
        z.belly * 0.4,
    );
    const legDepth = Math.max(
        ...ctx.parts.filter((x) => x.group.startsWith('upperLeg')).map((x) => x.depth),
    );
    addShell(ctx, key, 'torso', role, [...waist, ...hem], legDepth + (key === 'skirt' ? 1 : 1.2));
}

const HANG_T = { waist: 0, hip: 0.18, thigh: 0.6, knee: 1.08 } as const;

export function addTopHang(ctx: Ctx, skel: Skeleton, def: TopDef, manga = false) {
    if (def.hang === 'waist') return;
    addHanging(
        ctx,
        skel,
        'tunic',
        'top',
        HANG_T[def.hang],
        def.hang === 'knee' ? 1.3 : 1.45,
        manga,
    );
}

/** Collar and neckline on the chest's front; hidden when the chest turns away (a hood shows from behind). */
export function addCollar(ctx: Ctx, skel: Skeleton, collar: Collar) {
    if (collar === 'none') return;
    const z = skel.size;
    const t = skel.offset.spine2[1] / 0.26;
    const torso = ctx.parts.find((x) => x.key === 'torso');
    if (!torso) return;
    const facing = project(ctx.view, apply(ctx.posed.rot.chest, normalize([0, 0, 1])))[2];
    const depth = torso.depth + 0.4;
    const nw = z.neck * 1.12;
    const ny = t * 0.3;
    const nf = z.neck * 1.1;
    const at = (x: number, y: number, f: number): V3 => on(ctx, 'chest', [x, y, f]);
    const xy = (v: V3): P2 => {
        const s = toScreen(ctx, v);
        return [s[0], s[1]];
    };
    const ink = ctx.outline(ctx.fill.top) ?? darken(ctx.fill.top, 0.4);
    const line = (key: string, d: string) =>
        ctx.parts.push({
            key,
            group: 'torso',
            role: 'line',
            d,
            fill: 'none',
            stroke: ink,
            strokeWidth: ctx.line * 0.8,
            depth,
        });
    const front = z.chestDepth * 0.5;

    if (collar === 'hood') {
        // the hood hangs behind the neck: seen from behind it is the whole back of the collar
        const pts = ellipsoid(
            ctx,
            'chest',
            [0, ny + t * 0.04, -z.neck * 0.9],
            [z.neck * 1.7, z.neck * 1.35, z.neck * 1.3],
            () => true,
            5,
            9,
        );
        addShell(ctx, 'collar-hood', 'torso', 'top', pts, torso.depth + (facing > 0 ? -0.6 : 0.6));
        return;
    }
    // front collar lines only while the chest faces the viewer: from the side they stuck out past the neck
    if (facing < 0.4) return;
    if (collar === 'crew')
        line(
            'collar-crew',
            curve3(xy(at(-nw, ny, nf)), xy(at(0, ny - t * 0.07, nf * 1.12)), xy(at(nw, ny, nf))),
        );
    else if (collar === 'high') {
        const pts = [
            ...ring(ctx, 'chest', ny - t * 0.02, z.neck * 1.22, z.neck * 1.12, 10),
            ...ring(ctx, 'chest', ny + t * 0.1, z.neck * 1.1, z.neck, 10),
        ];
        addShell(ctx, 'collar-high', 'torso', 'top', pts, depth);
    } else {
        const deep =
            collar === 'lapel' || collar === 'open' ? 0.34 : collar === 'polo' ? 0.16 : 0.2;
        // the opening: a sharp V of skin with no outline across the neck, and its two edges as lines (a smoothed
        // outlined shell read as a teardrop hanging under the chin)
        const [l, r, tip] = [
            at(-nw * 0.95, ny, nf),
            at(nw * 0.95, ny, nf),
            at(0, ny - t * deep, front),
        ].map(xy);
        ctx.parts.push({
            key: 'neckline',
            group: 'torso',
            role: 'skin',
            d: `${polyline([l, r, tip])}Z`,
            fill: ctx.fill.skin,
            stroke: null,
            strokeWidth: 0,
            depth,
            ...(ctx.tone.skin ? { tone: ctx.tone.skin } : {}),
        });
        line('neckline-v', polyline([l, tip, r]));
        if (collar !== 'v') {
            // two flaps (a shirt collar, lapels)
            for (const sx of [-1, 1])
                addShell(
                    ctx,
                    `collar-flap${sx}`,
                    'torso',
                    'top',
                    [
                        at(sx * nw * 1.12, ny + t * 0.02, nf),
                        at(sx * nw * 0.2, ny - t * deep * 0.95, front),
                        at(sx * nw * 0.85, ny - t * deep * 0.55, front * 1.02),
                    ],
                    depth + 0.1,
                );
        }
        if (collar === 'open')
            line(
                'zip',
                polyline([
                    xy(at(0, ny - t * deep, front)),
                    xy(on(ctx, 'spine1', [0, 0, z.chestDepth * 0.45 + z.belly])),
                ]),
            );
    }
}

/** A few curved fold lines on the front of loose cloth (torso and hanging part). */
export function addFolds(ctx: Ctx, skel: Skeleton, hang: TopDef['hang']) {
    const torso = ctx.parts.find((x) => x.key === 'torso');
    const stroke = ctx.outline(ctx.fill.top);
    if (!torso || !stroke) return;
    const z = skel.size;
    const facing = project(ctx.view, apply(ctx.posed.rot.chest, normalize([0, 0, 1])))[2];
    if (facing < 0.25) return;
    const xy = (v: V3): P2 => {
        const s = toScreen(ctx, v);
        return [s[0], s[1]];
    };
    const f = z.chestDepth * 0.5 + z.belly;
    for (const sx of [-0.55, 0, 0.55]) {
        const a = xy(on(ctx, 'spine1', [sx * z.waistW * 0.3, z.waistW * 0.12, f]));
        const m = xy(on(ctx, 'spine1', [sx * z.waistW * 0.36, -z.waistW * 0.04, f * 1.02]));
        const b = xy(
            on(ctx, 'pelvis', [
                sx * z.hipW * 0.26,
                z.hipW * 0.04,
                z.hipDepth * 0.5 + (hang === 'waist' ? 0 : 0.4),
            ]),
        );
        ctx.parts.push({
            key: `fold${sx}`,
            group: 'torso',
            role: 'line',
            d: curve3(a, m, b),
            fill: 'none',
            stroke,
            strokeWidth: ctx.line * 0.55,
            depth: torso.depth + 0.5,
        });
    }
}
