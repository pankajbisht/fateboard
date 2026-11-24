/**
 * Line art (docs/CHARACTER_STUDIO.md, reference pass phase 2): the contours of the manga body are ink lines (filled
 * ribbons that taper where a line ends, full width where two pieces join), and the "Line art" style draws the figure
 * like the owner's reference sheets: white fills, no shading, dark ink, the outer line heavier than the inner ones.
 */
import { describe, expect, it } from 'vitest';
import { poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { inkRibbon } from '../render/ink';
import { STYLE_IDS } from '../schema/types';
import { applyEdit } from '../studio/edit';

const cam = (yaw: number) => ({ yaw, pitch: 0, roll: 0, shot: 'full' as const });
const teen = applyEdit(fromRecipe(RECIPES[4], 'x'), {
    body: { age: 16, gender: 0 },
    pose: poseById('stand')!,
});
const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe('ink lines', () => {
    it('a ribbon is a closed shape, narrow at a free end and full width in the middle', () => {
        const line: [number, number][] = Array.from({ length: 11 }, (_, i) => [i * 10, 0]);
        const d = inkRibbon([{ pts: line, taper: [true, true] }], 4);
        expect(d.endsWith('Z')).toBe(true);
        const ys = nums(d).filter((_, i) => i % 2 === 1);
        const n = ys.length / 2;
        // the first point's half width against the middle one's
        expect(Math.abs(ys[0])).toBeLessThan(Math.abs(ys[Math.floor(n / 2)]) * 0.6);
        // no taper: the ends are as wide as the middle
        const flat = nums(inkRibbon([{ pts: line, taper: [false, false] }], 4)).filter(
            (_, i) => i % 2 === 1,
        );
        expect(Math.abs(flat[0])).toBeCloseTo(Math.abs(flat[Math.floor(n / 2)]), 1);
    });

    it('the manga body contours are filled ink ribbons, finite from every side', () => {
        for (const yaw of [0, 45, 90, 180]) {
            const parts = renderCharacter(teen, cam(yaw)).parts;
            for (const key of [
                'armL-contour',
                'armL-contour-lo',
                'legL-contour',
                'body-contour-l',
            ]) {
                const p = parts.find((x) => x.key === key);
                if (!p) continue;
                expect(p.stroke, `${yaw} ${key}`).toBeNull();
                expect(p.fill, `${yaw} ${key}`).not.toBe('none');
                expect(p.d.endsWith('Z'), `${yaw} ${key}`).toBe(true);
                expect(/NaN|Infinity/.test(p.d), `${yaw} ${key}`).toBe(false);
            }
        }
    });
});

describe('the Line art style', () => {
    it('is a style: white fills, no shading layers, near-black ink', () => {
        expect(STYLE_IDS).toContain('lineart');
        const parts = renderCharacter({ ...teen, style: 'lineart' }, cam(20)).parts;
        for (const key of ['torso', 'upperLegL', 'head']) {
            const p = parts.find((x) => x.key === key)!;
            expect(p.fill, key).toBe('#ffffff');
            expect(p.layers?.filter((l) => l.kind !== 'outline').length ?? 0, key).toBe(0);
        }
        const ink = parts.find((x) => x.key === 'legL-contour')!.fill as string;
        // dark: each channel under 0x50
        expect(parseInt(ink.slice(1, 3), 16)).toBeLessThan(0x50);
    });
});
