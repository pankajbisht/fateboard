// @vitest-environment node
/**
 * Style fixes: shading on body shapes stays inside the drawn outline, for every shaded style, both body styles,
 * three recipes, a spread of poses and angles. Split from styles.test.ts because it is the slowest check of the
 * styles (about 16 s): in its own file it runs on its own worker, in parallel (docs/TESTING.md "Speed").
 */
import { describe, expect, it } from 'vitest';
import { POSES } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import type { CharacterCamera } from '../schema/types';
import { anglesFor } from './sweep';

const cam = (yaw: number): CharacterCamera => ({ yaw, pitch: 0, roll: 0, shot: 'full' });

describe('style fixes', () => {
    /** Points along an "M…Q…Z" path (each quadratic sampled 8 times). */
    const sample = (d: string): [number, number][] => {
        const nums = d.match(/-?[\d.]+/g)!.map(Number);
        const out: [number, number][] = [];
        let cur: [number, number] = [nums[0], nums[1]];
        for (let i = 2; i + 3 < nums.length; i += 4) {
            const c: [number, number] = [nums[i], nums[i + 1]];
            const e: [number, number] = [nums[i + 2], nums[i + 3]];
            for (let k = 0; k < 8; k++) {
                const t = k / 8;
                out.push([
                    (1 - t) ** 2 * cur[0] + 2 * (1 - t) * t * c[0] + t * t * e[0],
                    (1 - t) ** 2 * cur[1] + 2 * (1 - t) * t * c[1] + t * t * e[1],
                ]);
            }
            cur = e;
        }
        return out;
    };
    /**
     * Inside the polygon (even-odd), or within `eps` of its edge. Not a convex test: rounding the path to 0.1
     * (fmt) makes long straight edges slightly wavy, and one reversed micro-edge would fail a convex test.
     */
    const inside = (poly: [number, number][], p: [number, number], eps: number) => {
        let odd = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i];
            const b = poly[j];
            if (
                a[1] > p[1] !== b[1] > p[1] &&
                p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
            )
                odd = !odd;
        }
        if (odd) return true;
        return poly.some((a, i) => {
            const b = poly[(i + 1) % poly.length];
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const t = Math.max(
                0,
                Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)),
            );
            return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) <= eps;
        });
    };
    const SHELLS = /^(torso|hips|skirt|head|hair-front|hair-back|foot[LR])$/;

    it('shading on body shapes stays inside the drawn outline (every style, many poses and angles)', () => {
        const misses: string[] = [];
        let n = 0;
        // both bodies: the manga torso is a waisted loft with its own shadow band; 3 of the 8 angles for each combination
        for (const bodyStyle of ['classic', 'manga'] as const)
            for (const style of ['anime', 'realistic', 'manga', 'webtoon'] as const)
                for (const r of [RECIPES[0], RECIPES[1], RECIPES[9]])
                    for (const pose of POSES.filter((_, i) => i % 11 === 0))
                        for (const yaw of anglesFor(n++, 3, 45)) {
                            const base = fromRecipe(r, r.id);
                            const m = renderCharacter(
                                {
                                    ...base,
                                    body: { ...base.body, bodyStyle },
                                    style,
                                    rig: { pose },
                                },
                                cam(yaw),
                            );
                            for (const p of m.parts.filter((x) => SHELLS.test(x.key))) {
                                const outline = sample(p.d);
                                for (const l of (p.layers ?? []).filter(
                                    (x) => x.kind !== 'outline',
                                ))
                                    // 0.15: both paths are rounded to 0.1 (fmt), each point is off by up to 0.071
                                    if (!sample(l.d).every((q) => inside(outline, q, 0.15)))
                                        misses.push(`${style} ${r.id} ${pose.id} ${yaw} ${l.key}`);
                            }
                        }
        expect(misses).toEqual([]);
    }, 90000);
});
