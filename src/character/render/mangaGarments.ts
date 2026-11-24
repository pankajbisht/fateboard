import type { BottomDef, TopDef } from '../data/garments';
import type { Skeleton } from '../rig/skeleton';
import { addHem, addTube, looseOf } from './clothDetail';
import type { Ctx, Material } from './parts';

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
    if (L > 0 && roles.upper === 'skin')
        addTube(
            ctx,
            `${upper}-sleeve`,
            upper,
            'top',
            p[upper],
            p[lower],
            z.upperArm * 1.3 * k,
            z.foreArm * 1.08 * 1.28 * k,
            Math.min(L, 1),
        );
    if (L > 1 && roles.lower === 'skin')
        addTube(
            ctx,
            `${lower}-sleeve`,
            lower,
            'top',
            p[lower],
            p[hand],
            z.foreArm * 1.08 * 1.22 * k,
            z.wrist * 1.3 * k,
            L - 1,
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
            z.thigh * 1.12 * k,
            z.knee * 1.12 * k,
            Math.min(L, 1),
        );
    else if (L <= 1.05)
        addHem(
            ctx,
            `${thigh}-hem`,
            thigh,
            'bottom',
            p[thigh],
            p[shin],
            0.96,
            z.knee * 1.04 * k,
            above(shin),
        );
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
