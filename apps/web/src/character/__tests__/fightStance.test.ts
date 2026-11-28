// @vitest-environment node
/**
 * Fight stances are bladed the right way (BUG-279, docs/COMBAT_PACK.md §2): along the direction the fighter looks,
 * the lead foot, lead shoulder and lead fist are ahead of the rear ones. Orthodox leads with the left side, southpaw
 * is the exact mirror of orthodox. Checked on a child, an adult and a tall adult, manga and classic bodies.
 */
import { describe, expect, it } from 'vitest';
import { poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { pointOn, solveFK } from '../rig/fk';
import { mirrorPose } from '../rig/poseOps';
import { buildSkeleton } from '../rig/skeleton';
import { applyEdit } from '../studio/edit';

const STANCES: [id: string, lead: 'L' | 'R'][] = [
    ['box-orthodox', 'L'],
    ['box-southpaw', 'R'],
    ['peekaboo', 'L'],
    ['muay-stance', 'L'],
];

/** distance (in head heights) of each joint along the fighter's horizontal gaze */
function alongGaze(id: string, r: number, bodyStyle: 'manga' | 'classic') {
    const c = applyEdit(fromRecipe(RECIPES[r], 'x'), { pose: poseById(id)!, body: { bodyStyle } });
    const sk = buildSkeleton(c.body);
    const f = solveFK(sk, c.rig.pose);
    const head = f.pos.head;
    const ahead = pointOn(f, 'head', [0, 0, 10]);
    const g = [ahead[0] - head[0], ahead[2] - head[2]];
    const n = Math.hypot(g[0], g[1]);
    const d = (p: number[]) => (p[0] * g[0] + p[2] * g[1]) / n / sk.headHeight;
    const fist = (s: 'L' | 'R') => d(pointOn(f, `hand${s}`, [0, -sk.hand * 0.5, 0]));
    return {
        gazeZ: g[1] / n,
        fist: { L: fist('L'), R: fist('R') },
        shoulder: { L: d(f.pos.upperArmL), R: d(f.pos.upperArmR) },
        foot: { L: d(f.pos.footL), R: d(f.pos.footR) },
    };
}

describe('fight stances lead with the right side (BUG-279)', () => {
    for (const [id, lead] of STANCES)
        it(`${id}: lead foot, shoulder and fist ahead of the rear ones, eyes forward`, () => {
            const rear = lead === 'L' ? 'R' : 'L';
            for (const bodyStyle of ['manga', 'classic'] as const)
                for (const r of [0, 4, 8]) {
                    const a = alongGaze(id, r, bodyStyle);
                    const label = `${id} ${bodyStyle} recipe ${r}`;
                    // eyes on the opponent (+z), not looking off to the side
                    expect(a.gazeZ, label).toBeGreaterThan(Math.cos((25 * Math.PI) / 180));
                    expect(a.foot[lead] - a.foot[rear], `${label} foot`).toBeGreaterThan(0.5);
                    expect(
                        a.shoulder[lead] - a.shoulder[rear],
                        `${label} shoulder`,
                    ).toBeGreaterThan(0.2);
                    expect(a.fist[lead] - a.fist[rear], `${label} fist`).toBeGreaterThan(0.4);
                }
        });

    it('southpaw is the exact mirror of orthodox', () => {
        const o = mirrorPose(poseById('box-orthodox')!);
        const s = poseById('box-southpaw')!;
        expect(s.joints).toEqual(o.joints);
        expect(s.rootRotation).toEqual(o.rootRotation);
        expect(s.rootOffset).toEqual(o.rootOffset);
        expect([s.handShapeL, s.handShapeR, s.ground]).toEqual([
            o.handShapeL,
            o.handShapeR,
            o.ground,
        ]);
    });
});
