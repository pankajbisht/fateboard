// @vitest-environment node
/**
 * Pose fixes from the owner's review (docs/CHARACTER_STUDIO.md, pose pass): the boxing guard holds the fists in front
 * of the chin with the elbows down by the ribs, instead of crossing the forearms in front of the chest.
 */
import { describe, expect, it } from 'vitest';
import { POSES, poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { pointOn, solveFK } from '../rig/fk';
import { buildSkeleton } from '../rig/skeleton';
import { applyEdit } from '../studio/edit';

/** fist, elbow, shoulder and head joint in the chest's frame, in head heights */
function arm(id: string, r: number, bodyStyle: 'manga' | 'classic', s: 'L' | 'R') {
    const c = applyEdit(fromRecipe(RECIPES[r], 'x'), { pose: poseById(id)!, body: { bodyStyle } });
    const sk = buildSkeleton(c.body);
    const f = solveFK(sk, c.rig.pose);
    const local = (p: number[]) => {
        const d = [0, 1, 2].map((i) => p[i] - f.pos.chest[i]);
        const R = f.rot.chest;
        return [0, 1, 2].map(
            (k) => (R[k] * d[0] + R[3 + k] * d[1] + R[6 + k] * d[2]) / sk.headHeight,
        );
    };
    return {
        fist: local(pointOn(f, `hand${s}`, [0, -sk.hand * 0.5, 0])),
        elbow: local(f.pos[`lowerArm${s}`]),
        shoulder: local(f.pos[`upperArm${s}`]),
        head: local(f.pos.head),
    };
}

describe('boxing guards', () => {
    for (const id of ['guard', 'crouch-guard'])
        it(`${id}: fists in front of the chin, elbows down by the ribs, child to tall adult, both bodies`, () => {
            for (const bodyStyle of ['manga', 'classic'] as const)
                for (const r of [0, 4, 8])
                    for (const s of ['L', 'R'] as const) {
                        const a = arm(id, r, bodyStyle, s);
                        const label = `${id} ${bodyStyle} ${r} ${s}`;
                        const side = s === 'L' ? 1 : -1;
                        // the fist: on its own side, near the chin's height, in front of the face
                        expect(a.fist[0] * side, `${label} side`).toBeGreaterThan(0);
                        expect(
                            Math.abs(a.fist[1] - (a.head[1] - 0.15)),
                            `${label} height`,
                        ).toBeLessThan(0.4);
                        expect(a.fist[2], `${label} forward`).toBeGreaterThan(a.head[2] + 0.2);
                        // the elbow: below the shoulder and not out to the side (no wings)
                        expect(a.elbow[1], `${label} elbow down`).toBeLessThan(
                            a.shoulder[1] - 0.35,
                        );
                        expect(Math.abs(a.elbow[0]), `${label} elbow in`).toBeLessThan(
                            Math.abs(a.shoulder[0]) + 0.2,
                        );
                    }
        });
});

describe('sharply bent manga limbs', () => {
    const parts = (id: string, yaw: number) =>
        renderCharacter(applyEdit(fromRecipe(RECIPES[4], 'x'), { pose: poseById(id)! }), {
            yaw,
            pitch: 0,
            roll: 0,
            shot: 'full',
        }).parts;
    const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

    it('a folded arm (boxing guard) is two round capsules with one outline behind them, not a flat V', () => {
        for (const yaw of [0, 25, 330]) {
            const ps = parts('guard', yaw);
            for (const s of ['L', 'R']) {
                expect(
                    ps.some((p) => p.key === `arm${s}-contour-back`),
                    `${yaw} ${s}`,
                ).toBe(true);
                // the upper-arm fill is the upper arm only: it does not run on to the wrist
                const up = nums(ps.find((p) => p.key === `upperArm${s}`)!.d);
                const fore = nums(ps.find((p) => p.key === `lowerArm${s}`)!.d);
                const minY = (n: number[]) => Math.min(...n.filter((_, i) => i % 2 === 1));
                expect(minY(up), `${yaw} ${s}`).toBeGreaterThan(minY(fore));
                for (const p of ps) expect(/NaN|Infinity/.test(p.d), p.key).toBe(false);
            }
        }
    });

    it('a straight or gently bent limb keeps the single smooth shape', () => {
        const ps = parts('stand', 0);
        expect(ps.some((p) => p.key.endsWith('-contour-back'))).toBe(false);
        expect(ps.some((p) => p.key === 'armL-contour')).toBe(true);
    });
});

describe('lying poses', () => {
    it('lie across the view of the default front camera (pelvis to head runs sideways), not toward the viewer', () => {
        // seated on the floor (BJJ back control, a knockdown's fall) rests the hips, not the back: not lying
        for (const p of POSES.filter((x) => x.ground === 'floor' && !x.tags.includes('seated'))) {
            const sk = buildSkeleton(fromRecipe(RECIPES[4], 'x').body);
            const f = solveFK(sk, p);
            const axis = [0, 1, 2].map((i) => f.pos.head[i] - f.pos.pelvis[i]);
            // world x runs across the front camera's view, z toward it
            expect(Math.abs(axis[0]), p.id).toBeGreaterThan(Math.abs(axis[2]));
        }
    });
});
