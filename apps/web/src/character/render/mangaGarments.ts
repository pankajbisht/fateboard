import type { BottomDef, TopDef } from '../data/garments';
import type { Skeleton } from '../rig/skeleton';
import { addHem, addTube, looseOf } from './clothDetail';
import type { Ctx, Material } from './parts';
import { addCapSleeve } from './mangaSleeveCap';
import { mangaLook } from './mangaVariants';
import { mangaThighTop } from './mangaTorso';

type Side = 'L' | 'R';

/**
 * Manga sleeves (clothDetail.ts): the part of the arm the sleeve covers but the limb does not take the cloth colour
 * for becomes a tube with a hem; a sleeve that runs to the wrist shows its cuff.
 */
export function mangaSleeve(
    ctx: Ctx,
    skel: Skeleton,
    s: Side,
    def: TopDef,
    roles: { upper: Material; lower: Material },
) {
    const z = skel.size;
    const p = ctx.posed.pos;
    const upper = `upperArm${s}` as const;
    const lower = `lowerArm${s}` as const;
    const hand = `hand${s}` as const;
    const L = def.sleeve;
    const k = Math.max(1, looseOf(true, def.fit));
    // a sleeveless or strapless top: the shoulders are bare (mangaTorso.ts; a sleeveless top's straps and armholes are
    // a panel over them, mangaTank.ts), and this round head joins the point of the shoulder to the arm with no line
    if (L <= 0)
        addCapSleeve(ctx, skel, {
            key: `${upper}-shoulder`,
            group: upper,
            role: 'skin',
            side: s,
            a: p[upper],
            b: p[lower],
            // as wide as the arm's own top (its profile), so the sides lie on the arm's contour
            ra: z.upperArm * mangaLook().arm.upper[0][1],
            rb: z.foreArm * 1.08,
            // only down to about the armpit: 0.3 of the arm made a long skin parallelogram whose straight inner side hid
            // the armhole's curve
            frac: 0.12,
            hem: false,
            fit: def.fit,
            seam: false,
        });
    // the sleeve's head covers the shoulder joint (mangaSleeveCap.ts); a covered upper arm still gets the head, so
    // a long sleeve has the same shoulder and no joint shows when the arm rises
    if (L > 0)
        addCapSleeve(ctx, skel, {
            // a long sleeve's head is its own piece over the shoulder (the limb carries the cloth below it)
            key: roles.upper === 'skin' ? `${upper}-sleeve` : `${upper}-sleeve-head`,
            group: upper,
            role: 'top',
            side: s,
            a: p[upper],
            b: p[lower],
            ra: z.upperArm * (roles.upper === 'skin' ? 1.3 : 1.16) * k,
            rb: z.foreArm * 1.08 * (roles.upper === 'skin' ? 1.28 : 1.04) * k,
            frac: roles.upper === 'skin' ? Math.min(L, 1) : 0.3,
            hem: roles.upper === 'skin',
            fit: def.fit,
        });
    if (L > 1 && roles.lower === 'skin')
        addTube(
            ctx,
            `${lower}-sleeve`,
            lower,
            'top',
            p[lower],
            p[hand],
            // at the elbow as wide as the arm there (the upper sleeve's end), round over it; looser only toward the cuff
            // (22% wider and flat at the elbow, it read as a box stuck on the forearm)
            z.foreArm * 1.08 * (ctx.pack.proportion.limb ?? 1) * 1.03,
            z.wrist * 1.3 * k,
            L - 1,
            true,
        );
    if (L >= 2 && roles.lower === 'top') {
        const depth = (ctx.parts.find((x) => x.key === lower)?.depth ?? 0) + 0.03;
        addHem(
            ctx,
            `${lower}-sleeve-hem`,
            lower,
            'top',
            p[lower],
            p[hand],
            0.97,
            z.wrist * 1.12 * k,
            depth,
        );
    }
}

/** Manga trouser legs: a partly covered bone gets a tube with a hem; a covered one shows its hem where it ends. */
export function mangaLeg(
    ctx: Ctx,
    skel: Skeleton,
    s: Side,
    def: BottomDef,
    roles: { thigh: Material; shin: Material },
) {
    const z = skel.size;
    const p = ctx.posed.pos;
    const thigh = `upperLeg${s}` as const;
    const shin = `lowerLeg${s}` as const;
    const foot = `foot${s}` as const;
    const L = def.leg;
    if (L <= 0 || def.skirt > 0) return;
    const k = looseOf(true, def.fit);
    const above = (key: string) => (ctx.parts.find((x) => x.key === key)?.depth ?? 0) + 0.03;
    if (roles.thigh === 'skin')
        addTube(
            ctx,
            `${thigh}-cloth`,
            thigh,
            'bottom',
            p[thigh],
            p[shin],
            // at the hip the cloth is only just over the leg (and the style's limb scale); its looseness widens it toward
            // the hem. Loose at the joint, the round head ballooned out past the hips (swim trunks, boxing shorts).
            mangaThighTop(skel) * (ctx.pack.proportion.limb ?? 1) * 1.04,
            z.knee * 1.12 * k,
            // never shorter than the seat it is drawn over (the hips loft runs 1.75 thigh radii down the thigh): hot pants
            // ended above it and the seat's cloth showed below their hem with no line
            Math.max(Math.min(L, 1), (mangaThighTop(skel) * 2) / skel.thigh),
            true,
        );
    // (cloth that ends at the knee: its hem is drawn by the bent limb on the colour edge, bentLimb.ts)
    if (L > 1.05 && roles.shin === 'skin')
        addTube(
            ctx,
            `${shin}-cloth`,
            shin,
            'bottom',
            p[shin],
            p[foot],
            z.knee * 1.1 * k,
            z.ankle * 1.15 * k,
            L - 1,
            // round over the knee: flat there, the shin's round top showed as skin notches beside a capri's leg
            true,
        );
    else if (L >= 2)
        addHem(
            ctx,
            `${shin}-hem`,
            shin,
            'bottom',
            p[shin],
            p[foot],
            0.96,
            z.ankle * 1.05 * k,
            above(shin),
        );
}
