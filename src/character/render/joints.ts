import type { BottomDef, TopDef } from '../data/garments';
import { apply, normalize, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import type { Character, JointId } from '../schema/types';
import { project } from './camera';
import { legRoles } from './garments';
import { addShell, ellipsoid, on, toScreen, type Ctx, type Material } from './parts';
import { curve3, type P2 } from './shapes';

/**
 * Joints and body landmarks (docs/CHARACTER_STUDIO.md phase 3): shoulder caps, elbows, wrists, knees with a kneecap,
 * ankles, chest or bust lines and the hip crease from behind. They round off the tube-and-block look where limbs
 * meet and give the body its shape in every view. Bare skin gets skin blobs; cloth gets cloth, so a sleeve or a
 * trouser leg keeps its colour. Lines only show on the side that faces the camera.
 */
type Side = 'L' | 'R';
const SIDES: Side[] = ['L', 'R'];

export function addJointDetail(
    ctx: Ctx,
    skel: Skeleton,
    c: Character,
    top: TopDef,
    bot: BottomDef,
) {
    const z = skel.size;
    const legs = legRoles(bot, c.body.bodyStyle === 'manga');
    const t = skel.offset.spine2[1] / 0.26;
    const depthOf = (key: string) => ctx.parts.find((x) => x.key === key)?.depth ?? 0;
    const faces = (j: JointId, v: V3 = [0, 0, 1]) =>
        project(ctx.view, apply(ctx.posed.rot[j], normalize(v)))[2];
    // the manga limbs are single bent shapes, so they have no joint blobs
    const manga = c.body.bodyStyle === 'manga';
    const blobAt = (
        key: string,
        joint: JointId,
        center: V3,
        r: V3,
        role: Material,
        ref: string | string[],
        bias = -0.012,
    ) =>
        addShell(
            ctx,
            key,
            joint as never,
            role,
            ellipsoid(ctx, joint, center, r, () => true, 6, 10),
            Math.min(...[ref].flat().map(depthOf)) + bias,
        );
    const blob: typeof blobAt = (...args) => {
        if (!manga) blobAt(...args);
    };
    const xy = (v: V3): P2 => {
        const s = toScreen(ctx, v);
        return [s[0], s[1]];
    };
    const line = (
        key: string,
        group: 'torso' | JointId,
        d: string,
        ink: string,
        w: number,
        ref: string,
    ) =>
        ctx.parts.push({
            key,
            group: group as never,
            role: 'line',
            d,
            fill: 'none',
            stroke: ink,
            strokeWidth: w,
            depth: depthOf(ref) + 0.3,
        });

    for (const s of SIDES) {
        const upper = `upperArm${s}` as const;
        const lower = `lowerArm${s}` as const;
        const hand = `hand${s}` as const;
        const thigh = `upperLeg${s}` as const;
        const shin = `lowerLeg${s}` as const;
        const foot = `foot${s}` as const;
        // shoulder cap (the deltoid), in cloth when the top has sleeves
        const sleeved = top.sleeve >= 0.3;
        blob(
            `${upper}-cap`,
            upper,
            [0, -skel.upperArm * 0.1, 0],
            [z.upperArm * 1.18, z.upperArm * 1.45, z.upperArm * 1.2],
            sleeved ? 'top' : 'skin',
            upper,
        );
        // elbow
        blob(
            `${lower}-elbow`,
            lower,
            [0, 0, -z.foreArm * 0.1],
            [z.foreArm * 1.1, z.foreArm * 1.05, z.foreArm * 1.15],
            top.sleeve >= 1.6 ? 'top' : 'skin',
            [upper, lower],
        );
        // wrist
        if (top.sleeve < 1.9)
            blob(
                `${hand}-wrist`,
                hand,
                [0, -skel.hand * 0.04, 0],
                [z.wrist * 1.08, z.wrist * 0.9, z.wrist * 1.0],
                'skin',
                lower,
            );
        // knee and kneecap
        const kneeRole = legs.shin;
        blob(
            `${shin}-knee`,
            shin,
            [0, 0, z.knee * 0.12],
            [z.knee * 1.06, z.knee * 1.1, z.knee * 1.12],
            kneeRole,
            [thigh, shin],
        );
        // the kneecap line: bare knees only on the manga body (the reference draws none on trousers)
        if (faces(shin) > 0.25 && !(manga && kneeRole !== 'skin')) {
            const ink = ctx.outline(ctx.fill[kneeRole]);
            const a = xy(on(ctx, shin, [-z.knee * 0.5, z.knee * 0.35, z.knee * 1.15]));
            const m = xy(on(ctx, shin, [0, -z.knee * 0.15, z.knee * 1.3]));
            const b = xy(on(ctx, shin, [z.knee * 0.5, z.knee * 0.35, z.knee * 1.15]));
            line(`${shin}-kneecap`, shin, curve3(a, m, b), ink, ctx.line * 0.6, shin);
        }
        // ankle
        blob(
            `${foot}-ankle`,
            foot,
            [0, z.ankle * 0.2, 0],
            [z.ankle * 1.1, z.ankle * 1.0, z.ankle * 1.1],
            legs.shin,
            shin,
            0.01,
        );
    }

    // bare manga feet: the toes, four short lines on the top of the foot
    if (manga && c.dress.shoes.kind === 'barefoot')
        for (const s of SIDES) {
            const foot = `foot${s}` as const;
            if (faces(foot, [0, 1, 0]) < 0.1) continue;
            const ink = ctx.outline(ctx.fill.skin);
            for (const k of [-0.5, -0.17, 0.17, 0.5]) {
                const x = k * z.foot * 1.6;
                const a = xy(on(ctx, foot, [x, -skel.ankle * 0.45, skel.foot * 0.6]));
                const b = xy(on(ctx, foot, [x * 1.05, -skel.ankle * 0.62, skel.foot * 0.8]));
                line(
                    `${foot}-toe${k}`,
                    foot,
                    `M${a.join(' ')}L${b.join(' ')}`,
                    ink,
                    ctx.line * 0.4,
                    foot,
                );
            }
        }

    // the neck: the two long neck muscles, from behind the ears down to the collar pit (the manga body)
    if (manga && faces('chest') > 0.25) {
        const ink = ctx.outline(ctx.fill.skin);
        for (const sx of [-1, 1]) {
            const a = xy(
                on(ctx, 'neck', [sx * z.neck * 0.8, skel.offset.head[1] * 0.85, z.neck * 0.45]),
            );
            const m = xy(
                on(ctx, 'neck', [sx * z.neck * 0.55, skel.offset.head[1] * 0.35, z.neck * 0.95]),
            );
            const b = xy(on(ctx, 'chest', [sx * z.neck * 0.22, t * 0.33, z.neck * 1.05]));
            line(`neck-${sx}`, 'neck', curve3(a, m, b), ink, ctx.line * 0.4, 'neck');
        }
    }

    // chest and bust: the lower edge of each pectoral, or of each breast, and a sternum line for a muscular chest
    // a grown man's chest always shows its pectorals a little (male and female bodies read apart)
    const manChest = c.body.gender < 0.35 && c.body.age >= 16 && z.bust <= 0.5;
    // only while the chest faces the viewer: turned further, the lines leave the body's outline (they floated in
    // front of the chest seen from the side)
    // pectorals belong to a male frame: a muscular woman showed pectoral and sternum lines under her bust
    // on the manga body a man's chest shows its pectorals only when he is muscular: on a slim boy in a T-shirt the
    // arcs read as a bust (the reference sheets draw none)
    const pecs =
        c.body.gender < 0.5 && c.body.age >= 14 && (c.body.muscle > 0.35 || (manChest && !manga));
    if (faces('chest') > 0.45 && (z.bust > 0.5 || pecs)) {
        const ink = ctx.outline(ctx.fill.top);
        const front = z.chestDepth * 0.5;
        const bust = z.bust > 0.5;
        // a shallow arc under each breast (or the lower edge of each pectoral), from near the middle out and up toward
        // the side; a deep U in the middle of the chest read as a smile
        const drop = bust ? z.bust * 0.35 : Math.max(c.body.muscle, 0.3) * 0.9;
        for (const sx of [-1, 1]) {
            const a = xy(
                on(ctx, 'chest', [sx * z.shoulderW * 0.06, -t * 0.1, front * 1.02 + z.bust * 0.6]),
            );
            const m = xy(
                on(ctx, 'chest', [
                    sx * z.shoulderW * 0.19,
                    -t * 0.1 - drop * 0.5,
                    front * 1.02 + z.bust,
                ]),
            );
            const b = xy(
                on(ctx, 'chest', [
                    sx * z.shoulderW * 0.33,
                    -t * 0.065,
                    front * 0.95 + z.bust * 0.5,
                ]),
            );
            line(
                `chest-${sx}`,
                'torso',
                curve3(a, m, b),
                ink,
                ctx.line * (bust ? 0.55 : 0.5),
                'torso',
            );
        }
        if (c.body.muscle > 0.5 && z.bust <= 0.5 && c.body.gender < 0.5)
            line(
                'sternum',
                'torso',
                `M${xy(on(ctx, 'chest', [0, t * 0.12, front * 1.02])).join(' ')}L${xy(on(ctx, 'chest', [0, -t * 0.14, front * 1.02])).join(' ')}`,
                ink,
                ctx.line * 0.5,
                'torso',
            );
    }

    // from behind: the crease between the buttocks and the curve under each
    // (not on the manga body: the reference draws no crease on trousers or a skirt)
    if (faces('pelvis') < -0.2 && !manga) {
        const ink = ctx.outline(ctx.fill[bot.skirt > 0 ? 'bottom' : 'bottom']);
        const hy = skel.offset.hipL[1];
        const back = -z.hipDepth * 0.5;
        const p = (x: number, y: number): V3 => on(ctx, 'pelvis', [x, y, back]);
        line(
            'glute-crease',
            'torso',
            `M${xy(p(0, hy * 0.1)).join(' ')}L${xy(p(0, hy * 1.2)).join(' ')}`,
            ink,
            ctx.line * 0.55,
            'hips',
        );
        if (bot.skirt === 0)
            for (const sx of [-1, 1])
                line(
                    `glute-${sx}`,
                    'torso',
                    curve3(
                        xy(p(sx * z.hipW * 0.04, hy * 1.2)),
                        xy(p(sx * z.hipW * 0.22, hy * 1.5)),
                        xy(p(sx * z.hipW * 0.42, hy * 1.1)),
                    ),
                    ink,
                    ctx.line * 0.5,
                    'hips',
                );
    }
}
