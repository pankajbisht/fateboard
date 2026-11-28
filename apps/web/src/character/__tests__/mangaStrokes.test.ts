// @vitest-environment node
/**
 * Strokes on the manga body (docs/CHARACTER_STUDIO.md, stroke pass): every outline sits at the depth of the shape it
 * outlines, so a limb half behind the torso does not draw its hidden part's outline over the chest; sleeves cover the
 * arm's own outline (no doubled lines); bust and collar lines show only where the chest faces the viewer.
 */
import { describe, expect, it } from 'vitest';
import { POSES, poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { buildSkeleton } from '../rig/skeleton';
import { applyEdit } from '../studio/edit';

const cam = (yaw: number) => ({ yaw, pitch: 0, roll: 0, shot: 'full' as const });
const woman = applyEdit(fromRecipe(RECIPES[3], 'f'), {
    body: { age: 22, gender: 1 },
    top: { kind: 'tshirt' },
});

describe('limb outlines follow their bones', () => {
    it('the upper bone outline is no nearer than the upper bone fill, in every pose and side', () => {
        for (const pose of POSES.filter((_, i) => i % 9 === 0))
            for (const yaw of [0, 35, 90, 200, 300]) {
                const parts = renderCharacter(applyEdit(woman, { pose }), cam(yaw)).parts;
                for (const [contour, fill] of [
                    ['armL-contour', 'upperArmL'],
                    ['armR-contour', 'upperArmR'],
                    ['legL-contour', 'upperLegL'],
                    ['legR-contour', 'upperLegR'],
                ]) {
                    const c = parts.find((p) => p.key === contour);
                    const f = parts.find((p) => p.key === fill);
                    if (!c || !f) continue;
                    expect(c.depth, `${pose.id} ${yaw} ${contour}`).toBeLessThanOrEqual(
                        f.depth + 0.01,
                    );
                    // the lower bone has its own outline piece
                    expect(
                        parts.some((p) => p.key === `${contour}-lo`),
                        `${pose.id} ${yaw} ${contour}`,
                    ).toBe(true);
                }
            }
    });
});

describe('chest lines only where the chest faces the viewer', () => {
    it('bust and collar lines show from the front and three-quarter, not from the side', () => {
        const c = applyEdit(woman, { pose: poseById('stand')! });
        const keys = (yaw: number) => renderCharacter(c, cam(yaw)).parts.map((p) => p.key);
        // the manga bust draws its lines on the chest's own surface: `under-bust0` and `under-bust1`
        const bust = (yaw: number) => keys(yaw).filter((k) => k.startsWith('under-bust'));
        expect(bust(0)).toHaveLength(2);
        expect(bust(30).length).toBeGreaterThan(0);
        expect(keys(0)).toContain('collar-crew');
        for (const yaw of [75, 90, 270]) {
            expect(bust(yaw), String(yaw)).toEqual([]);
            expect(keys(yaw), String(yaw)).not.toContain('collar-crew');
        }
    });

    it('a bust line is a shallow arc under the breast toward the side, not a deep U in the middle', () => {
        const d = renderCharacter(
            applyEdit(woman, { pose: poseById('stand')! }),
            cam(0),
        ).parts.find((p) => p.key === 'under-bust1')!.d;
        const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
        const xs = n.filter((_, i) => i % 2 === 0);
        const ys = n.filter((_, i) => i % 2 === 1);
        const w = Math.max(...xs) - Math.min(...xs);
        const h = Math.max(...ys) - Math.min(...ys);
        // wider than deep
        expect(h).toBeLessThan(w * 0.7);
    });
});

describe('muscle lines stay under cloth', () => {
    it('the upper arm muscle line is under a T-shirt sleeve on the same arm', () => {
        for (const yaw of [0, 35, 300]) {
            const parts = renderCharacter(
                applyEdit(woman, { pose: poseById('stand')!, body: { muscle: 0.6 } }),
                cam(yaw),
            ).parts;
            for (const s of ['L', 'R']) {
                const line = parts.find((p) => p.key === `arm${s}-contour-m1`);
                const sleeve = parts.find((p) => p.key === `upperArm${s}-sleeve`);
                if (line && sleeve) expect(line.depth, `${yaw} ${s}`).toBeLessThan(sleeve.depth);
            }
        }
    });
});

describe('the manga bust in profile', () => {
    it('stands out by most of its size, high on the chest (nearer the armpit than the waist)', () => {
        const profile = (bust: number) => {
            const c = applyEdit(woman, { pose: poseById('stand')!, body: { bust } });
            const torso = renderCharacter(c, cam(90)).parts.find((p) => p.key === 'torso')!.d;
            const n = (torso.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
            const pts = n.flatMap((v, i) => (i % 2 === 0 ? [[v, n[i + 1]]] : []));
            return pts;
        };
        const flat = profile(0);
        const full = profile(1);
        const xsF = full.map((p) => p[0]);
        const xs0 = flat.map((p) => p[0]);
        const out = Math.max(
            Math.max(...xsF) - Math.max(...xs0),
            Math.min(...xs0) - Math.min(...xsF),
        );
        const sk = buildSkeleton(applyEdit(woman, { body: { bust: 1 } }).body);
        expect(out).toBeGreaterThan(sk.size.bust * 0.6);
        // where the bust is fullest: above the middle of the torso part (y grows downward)
        const front =
            Math.max(...xsF) - Math.max(...xs0) >= Math.min(...xs0) - Math.min(...xsF) ? 1 : -1;
        const tip = full.reduce((a, b) => (front * b[0] > front * a[0] ? b : a));
        const ys = full.map((p) => p[1]);
        expect(tip[1]).toBeLessThan((Math.min(...ys) + Math.max(...ys)) / 2);
    });
});
