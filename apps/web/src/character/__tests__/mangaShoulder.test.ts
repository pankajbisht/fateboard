// @vitest-environment node
/**
 * The manga shoulder line (docs/CHARACTER_STUDIO.md, reference pass phase 7). In the reference sheets a man's T-shirt
 * runs from the neck down the slope of the trapezius to the shoulder and then straight down with the sleeve. The torso
 * was widest at the armpit, below the top of the sleeve, so its outline bulged out beside the arm: an S-curve that read
 * as a bust on a boy.
 */
import { describe, expect, it } from 'vitest';
import { poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { applyEdit } from '../studio/edit';

const points = (d: string): [number, number][] => {
    const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const out: [number, number][] = [];
    for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
    return out;
};

describe('the manga shoulder', () => {
    for (const age of [16, 25])
        it(`a man of ${age} is widest at the shoulders, not lower at the armpit`, () => {
            const c = applyEdit(fromRecipe(RECIPES[4], 's'), {
                body: { age, gender: 0, bodyStyle: 'manga' },
                top: { kind: 'tshirt' },
                pose: poseById('stand')!,
            });
            const torso = renderCharacter(c, {
                yaw: 0,
                pitch: 0,
                roll: 0,
                shot: 'full',
            }).parts.find((p) => p.key === 'torso')!;
            const pts = points(torso.d);
            const ys = pts.map((p) => p[1]);
            const top = Math.min(...ys);
            const h = Math.max(...ys) - top;
            const widthAt = (k: number) => {
                const xs = pts
                    .filter((p) => Math.abs(p[1] - (top + k * h)) < h * 0.04)
                    .map((p) => p[0]);
                return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
            };
            // the shoulder (high on the top) is wider than the chest below the armpit; the old outline was 15% wider
            // there than at the shoulder
            expect(widthAt(0.3)).toBeLessThan(widthAt(0.15));
        });
});
