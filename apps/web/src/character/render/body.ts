import type { Character } from '../schema/types';
import { apply, type V3 } from '../rig/math';
import { project } from './camera';
import type { Skeleton } from '../rig/skeleton';
import { BOTTOM_DEFS, TOP_DEFS } from '../data/garments';
import { addBodyAccessories } from './accessoriesBody';
import { addHand } from './hand';
import { addJointDetail } from './joints';
import { PROFILES, addBentLimb } from './bentLimb';
import { addMangaTorso, mangaThighTop } from './mangaTorso';
import { addJawShadow } from './neckShadow';
import { mangaLook } from './mangaVariants';
import { addHoodieDetail, looseOf } from './clothDetail';
import { addPocketCovers, pocketHands } from './pockets';
import { addProps, handShapeFor } from './props';
import {
    addCollar,
    addFolds,
    addHanging,
    addLegCloth,
    addSleeve,
    addTopHang,
    legRoles,
    sleeveRoles,
} from './garments';
import { addLimb, addShell, on, ring, type Ctx } from './parts';
import { addShoe } from './shoes';
import { addLegPocket, addTrim } from './trims';

/**
 * The body below the head: torso and hips (shells around rings fixed to the spine joints, so they bend and
 * twist with it), neck, arms, hands, legs and shoes. Clothes come from the garment data (data/garments.ts) through
 * render/garments.ts: sleeves, trouser legs, skirts and long tops, collars and folds.
 */

export function addBody(ctx: Ctx, skel: Skeleton, c: Character) {
    const z = skel.size;
    const p = ctx.posed.pos;
    const t = skel.offset.spine2[1] / 0.26; // torso length
    const topDef = TOP_DEFS[c.dress.top.kind];
    const botDef = BOTTOM_DEFS[c.dress.bottom.kind];
    const fit = topDef.fit;
    const manga = c.body.bodyStyle === 'manga';
    // the manga limbs are one bent shape each: they take the cloth colour themselves, so no skin shows beside a baggy leg
    const sleeves = sleeveRoles(topDef, manga);
    const legs = legRoles(botDef, manga);

    // torso: shoulders (chest frame) → waist (spine1 frame), with bust and belly
    const torso: V3[] = [
        ...ring(ctx, 'chest', t * 0.3, z.neck * 1.25, z.neck * 1.1, 8),
        ...ring(ctx, 'chest', t * 0.21, z.shoulderW * 0.5 * fit, z.chestDepth * 0.33 * fit),
        ...ring(
            ctx,
            'chest',
            0,
            (z.shoulderW * 0.37 + z.bust * 0.3) * fit,
            z.chestDepth * 0.48 * fit,
        ),
        ...ring(
            ctx,
            'spine2',
            0,
            ((z.waistW + z.shoulderW * 0.75) / 4.2) * fit,
            z.chestDepth * 0.45 * fit,
        ),
        ...ring(
            ctx,
            'spine1',
            0,
            z.waistW * 0.46 * fit,
            z.chestDepth * 0.42 * fit,
            12,
            z.belly * 0.5,
        ),
        on(ctx, 'spine1', [0, t * 0.05, z.chestDepth * 0.42 + z.belly]),
    ];
    if (z.bust > 0.5)
        for (const sx of [-1, 1])
            torso.push(
                on(ctx, 'chest', [sx * z.shoulderW * 0.17, -t * 0.03, z.chestDepth * 0.5 + z.bust]),
            );
    // a top that ends at the waist hangs over the trousers (the reference sheets draw T-shirts untucked)
    if (manga)
        addMangaTorso(ctx, skel, fit, z.bust > 0.5, topDef.hang === 'waist', !!topDef.strapless);
    else addShell(ctx, 'torso', 'torso', 'top', torso);

    // hips and the top of the legs (trousers / shorts / skirt waistband)
    const hips: V3[] = [
        ...ring(ctx, 'spine1', -t * 0.02, z.waistW * 0.52, z.chestDepth * 0.44, 12, z.belly * 0.4),
        ...ring(ctx, 'pelvis', skel.offset.hipL[1] * 0.6, z.hipW / 2, z.hipDepth / 2),
        on(ctx, 'upperLegL', [0, -skel.thigh * 0.12, 0]),
        on(ctx, 'upperLegR', [0, -skel.thigh * 0.12, 0]),
    ];
    if (!manga) addShell(ctx, 'hips', 'torso', 'bottom', hips);

    // neck: drawn behind the head, under the collar
    const neckTop = on(ctx, 'head', [0, z.head[1] * 0.4, -z.head[2] * 0.15]);
    addLimb(
        ctx,
        'neck',
        'neck',
        'skin',
        p.neck,
        z.neck * (manga ? 1.05 : 1.22),
        neckTop,
        z.neck * (manga ? 0.88 : 1),
        -t * 0.02,
    );

    if (manga) addJawShadow(ctx, skel);

    for (const s of ['L', 'R'] as const) {
        const upper = `upperArm${s}` as const;
        const lower = `lowerArm${s}` as const;
        const hand = `hand${s}` as const;
        if (manga)
            addBentLimb(ctx, {
                joints: [p[upper], p[lower], p[hand]],
                // loose cloth widens the limb's own shape (no overlay capsules on the manga body)
                radii: [
                    z.upperArm * looseOf(sleeves.upper === 'top', topDef.fit),
                    z.foreArm * 1.08 * looseOf(sleeves.upper === 'top', topDef.fit),
                    z.wrist * looseOf(sleeves.lower === 'top', topDef.fit),
                ],
                profiles: [mangaLook().arm.upper, mangaLook().arm.fore],
                keys: [upper, lower],
                groups: [upper, lower],
                roles: [sleeves.upper, sleeves.lower],
                contour: `arm${s}-contour`,
                hemAtBend: topDef.sleeve <= 1.05,
                muscle: c.body.muscle,
            });
        else {
            addLimb(
                ctx,
                upper,
                upper,
                sleeves.upper,
                p[upper],
                z.upperArm,
                p[lower],
                z.foreArm * 1.08,
            );
            addLimb(ctx, lower, lower, sleeves.lower, p[lower], z.foreArm, p[hand], z.wrist);
        }
        addSleeve(ctx, skel, s, topDef, manga);
        if (!pocketHands(c))
            addHand(
                ctx,
                skel,
                s,
                handShapeFor(c, s, s === 'L' ? c.rig.pose.handShapeL : c.rig.pose.handShapeR),
                manga,
            );

        const thigh = `upperLeg${s}` as const;
        const shin = `lowerLeg${s}` as const;
        const foot = `foot${s}` as const;
        if (manga)
            addBentLimb(ctx, {
                joints: [p[thigh], p[shin], p[foot]],
                radii: [
                    // loose trousers widen toward the knee and hem, not at the seat: the full looseness at the hip joint
                    // pushed the leg's round top out over the hips like a balloon
                    mangaThighTop(skel) *
                        Math.min(1.06, looseOf(legs.thigh === 'bottom', botDef.fit)),
                    z.knee * 0.98 * looseOf(legs.thigh === 'bottom', botDef.fit),
                    z.ankle * looseOf(legs.shin === 'bottom', botDef.fit),
                ],
                profiles: [PROFILES.thigh, PROFILES.shin],
                keys: [thigh, shin],
                groups: [thigh, shin],
                roles: [legs.thigh, legs.shin],
                contour: `leg${s}-contour`,
                // the cloth ends at the knee (shorts), not a capri's that carries on down the shin as a tube
                hemAtBend: botDef.leg <= 1.05,
                kneeOverCloth: legs.thigh === 'skin' && botDef.leg > 0 && botDef.skirt <= 0,
                muscle: c.body.muscle,
            });
        else {
            addLimb(ctx, thigh, thigh, legs.thigh, p[thigh], z.thigh, p[shin], z.knee);
            addLimb(ctx, shin, shin, legs.shin, p[shin], z.knee * 0.95, p[foot], z.ankle);
        }
        addLegCloth(ctx, skel, s, botDef, manga);
        addShoe(ctx, skel, s, c.dress.shoes.kind);
    }

    if (botDef.skirt > 0)
        addHanging(ctx, skel, 'skirt', 'bottom', botDef.skirt, botDef.flare ?? 1.5, manga);
    if (botDef.trim === 'pocket') for (const s of ['L', 'R'] as const) addLegPocket(ctx, skel, s);
    addTrim(ctx, skel, topDef.trim);
    addTopHang(ctx, skel, topDef, manga, botDef);
    addCollar(ctx, skel, topDef.collar);
    if (manga && c.dress.top.kind.includes('hoodie'))
        addHoodieDetail(ctx, skel, project(ctx.view, apply(ctx.posed.rot.chest, [0, 0, 1]))[2]);
    if (topDef.folds) {
        const before = ctx.parts.length;
        addFolds(ctx, skel, topDef.hang);
        // on a long top (kurta, coat) the folds lie on its hanging cloth: at body depth it covered them and only their
        // tips showed above it, as three stray dots at the waist
        const tunic = ctx.parts.find((x) => x.key === 'tunic');
        if (manga && tunic)
            for (const part of ctx.parts.slice(before)) part.depth = tunic.depth + 0.003;
    }
    addPocketCovers(ctx, skel, c, botDef);
    addJointDetail(ctx, skel, c, topDef, botDef);
    addBodyAccessories(ctx, skel, c);
    addProps(ctx, skel, c);
}
