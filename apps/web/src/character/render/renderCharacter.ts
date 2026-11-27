import type { Character, CharacterCamera, Pose, ShotId } from '../schema/types';
import { solveFK } from '../rig/fk';
import { ground } from '../rig/grounding';
import { clampPose } from '../rig/limits';
import { ageing, buildSkeleton } from '../rig/skeleton';
import { addBody } from './body';
import { SHOT_BOTTOM, frame, project, viewBin, viewMatrix, type ViewBin } from './camera';
import { addHead } from './head';
import type { Ctx, Part } from './parts';
import type { P2 } from './shapes';
import { tintFor } from './tints';
import { MANGA_INK, darken, mangaPaint, mixColor, packFor } from './styles';
import type { Material } from './parts';

/**
 * render(character, camera) → the parts to draw, far to near, and the view box for the shot. Pure: the studio
 * view, thumbnails and the SVG placed on the board all call it, so they always agree.
 */
export interface RenderModel {
    parts: Part[];
    viewBox: [number, number, number, number];
    bin: ViewBin;
    /** standing height in rig units (cm) */
    height: number;
}

export type { Part } from './parts';

/** Line weight per shot (share of the full-figure weight): softer than the share of the figure each shot shows. */
const SHOT_LINE: Record<ShotId, number> = {
    full: 1,
    knee: 0.84,
    waist: 0.64,
    bust: 0.46,
    closeup: 0.32,
};

/** Elders stoop a little (unless the user set the posture by hand). */
export function withPosture(pose: Pose, a: number): Pose {
    if (a <= 0) return pose;
    const add = (j: keyof Pose['joints'], x: number) => {
        const e = pose.joints[j] ?? { x: 0, y: 0, z: 0 };
        return { ...e, x: e.x + x };
    };
    return {
        ...pose,
        joints: {
            ...pose.joints,
            spine1: add('spine1', 3 * a),
            chest: add('chest', 7 * a),
            neck: add('neck', 9 * a),
            head: add('head', -8 * a),
        },
    };
}

/** Hair greys with age unless the user picked its colour (the tip colour greys too). */
export function shownHairColor(c: Character, color = c.hair.color): string {
    if (c.body.overridden.includes('hairColor')) return color;
    return mixColor(color, '#d4d4d4', ageing(c.body.age) * 0.9);
}

/** Scene inputs (docs/CHARACTER_STUDIO.md §9.2): the studio passes none. */
export interface RenderOptions {
    /** screen direction toward the key light (unit, y down) */
    light?: P2;
    /** the scene's colour grade (night, golden hour); colour styles only */
    grade?: (hex: string) => string;
}

/** The studio's key light: from the upper left, in front. */
export const DEFAULT_LIGHT: P2 = [-0.55, -0.835];

export function renderCharacter(
    c: Character,
    camera: CharacterCamera,
    opts: RenderOptions = {},
): RenderModel {
    const skel = buildSkeleton(c.body);
    const old = c.body.overridden.includes('posture') ? 0 : ageing(c.body.age);
    const pose = clampPose(withPosture(c.rig.pose, old));
    const posed = ground(skel, solveFK(skel, pose), pose.ground);
    const view = viewMatrix(camera);
    const pack = packFor(c.style);
    const colors: Record<Material, string> = {
        skin: c.body.skinTone,
        top: c.dress.top.color,
        bottom: c.dress.bottom.color,
        shoes: c.dress.shoes.color,
        hair: shownHairColor(c),
        hair2: c.hair.tip ? shownHairColor(c, c.hair.tip) : shownHairColor(c),
        acc: '#888888',
    };
    // wet hair and cloth are darker (schema/effects.ts)
    const wet = c.effects?.wet ?? 0;
    if (wet > 0)
        for (const m of ['hair', 'hair2', 'top', 'bottom'] as Material[])
            colors[m] = darken(colors[m], 0.16 * wet);
    const tint = pack.palette === 'manga' ? tintFor('none') : tintFor(pack.tint);
    const fill = { ...colors };
    for (const m of Object.keys(fill) as Material[]) fill[m] = tint(fill[m]);
    const tone: Record<Material, number> = {
        skin: 0,
        top: 0,
        bottom: 0,
        shoes: 0,
        hair: 0,
        hair2: 0,
        acc: 0,
    };
    const grade = opts.grade;
    if (grade && pack.palette !== 'manga')
        for (const m of Object.keys(fill) as Material[]) fill[m] = grade(fill[m]);
    if (pack.palette === 'manga')
        for (const m of Object.keys(colors) as Material[]) {
            const p = mangaPaint(colors[m], m === 'skin');
            fill[m] = p.fill;
            tone[m] = p.tone;
        }
    const ctx: Ctx = {
        posed,
        view,
        pack,
        fill,
        tone,
        outline: (f) =>
            pack.line.color === 'ink'
                ? MANGA_INK
                : pack.line.color === 'none'
                  ? (null as unknown as string)
                  : darken(f, pack.line.darken),
        // the same visual weight in every shot: a closer shot shows less of the figure, so its lines are thinner
        line: skel.height * pack.line.width * SHOT_LINE[camera.shot],
        tint,
        paint: (hex: string) =>
            pack.palette === 'manga'
                ? mangaPaint(hex)
                : { fill: grade ? grade(tint(hex)) : tint(hex), tone: 0 },
        light: opts.light ?? DEFAULT_LIGHT,
        points: [],
        parts: [],
        effects: c.effects,
    };
    addBody(ctx, skel, c);
    addHead(ctx, skel, c);

    const parts = ctx.parts
        .map((p, i) => ({ p, i }))
        .sort((a, b) => a.p.depth - b.p.depth || a.i - b.i)
        .map(({ p }) => p);

    const ys = ctx.points.map(([, y]) => y);
    const top = Math.min(...ys);
    const mark = SHOT_BOTTOM[camera.shot];
    const at = (j: keyof typeof posed.pos) => project(view, posed.pos[j])[1];
    const bottom =
        mark === 'feet'
            ? Math.max(...ys)
            : mark === 'knee'
              ? Math.max(at('lowerLegL'), at('lowerLegR'))
              : mark === 'pelvis'
                ? at('pelvis')
                : mark === 'chest'
                  ? at('chest')
                  : at('neck') + skel.headHeight * 0.15;
    const chestYaw = (Math.atan2(posed.rot.chest[2], posed.rot.chest[8]) * 180) / Math.PI;
    return {
        parts,
        viewBox: frame(ctx.points as P2[], top, Math.max(bottom, top + skel.headHeight)),
        bin: viewBin(camera.yaw, chestYaw).bin,
        height: skel.height,
    };
}
