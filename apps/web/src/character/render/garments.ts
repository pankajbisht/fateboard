import type { BottomDef, TopDef } from '../data/garments';
import { looseOf } from './clothDetail';
import { addMangaHanging } from './hangLoft';
import { withField } from './effects';
import { mangaLeg, mangaSleeve } from './mangaGarments';
export { addCollar } from './collars';
import { apply, lerp3, normalize, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { project } from './camera';
import { addLimb, addShell, on, ring, toScreen, type Ctx, type Material } from './parts';
import { curve3, type P2 } from './shapes';

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
    // the manga body paints the cloth onto the limb itself (loose or not): only the parts left bare get a tube
    const roles = sleeveRoles(def, manga);
    if (manga) return mangaSleeve(ctx, skel, s, def, roles);
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

export function addLegCloth(ctx: Ctx, skel: Skeleton, s: Side, def: BottomDef, manga = false) {
    const z = skel.size;
    const p = ctx.posed.pos;
    const thigh = `upperLeg${s}` as const;
    const shin = `lowerLeg${s}` as const;
    const foot = `foot${s}` as const;
    // the manga body paints the cloth onto the limb itself (loose or not): only bare parts get a tube
    const roles = legRoles(def, manga);
    if (manga) return mangaLeg(ctx, skel, s, def, roles);
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
    underLoose = 1,
) {
    // effects (wind, updraft, twirl, wet) bend the cloth from the waist down (render/effects.ts)
    const p = ctx.posed.pos;
    withField(
        ctx,
        ctx.effects,
        () => ({
            anchor: p.spine1,
            length: Math.max(1, (p.spine1[1] - (p.lowerLegL[1] + p.lowerLegR[1]) / 2) * 0.9),
            start: 0,
            base: 0,
            cling: 0.18,
            lift: 0.75,
            spread: 0.25,
            group: 'torso',
            dripsBehind: false,
        }),
        () =>
            manga
                ? addMangaHanging(ctx, skel, key, role, t, flare, underLoose)
                : addShellHanging(ctx, skel, key, role, t, flare),
    );
}

/** The classic body's hanging shell (see addHanging). */
function addShellHanging(
    ctx: Ctx,
    skel: Skeleton,
    key: string,
    role: Material,
    t: number,
    flare: number,
) {
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

export function addTopHang(
    ctx: Ctx,
    skel: Skeleton,
    def: TopDef,
    manga = false,
    /** what is worn under it: a long top stays wider than loose trouser legs */
    bottom?: BottomDef,
) {
    if (def.hang === 'waist') return;
    addHanging(
        ctx,
        skel,
        'tunic',
        'top',
        HANG_T[def.hang],
        def.hang === 'knee' ? 1.3 : 1.45,
        manga,
        bottom && bottom.skirt <= 0 ? looseOf(true, bottom.fit) : 1,
    );
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
