/**
 * Style packs S1 (docs/CHARACTER_STUDIO.md §7.3): cartoon, anime, realistic, manga B/W, webtoon. Each restyles
 * the same character JSON, from every angle and pose, with shapes only (so the page shows the same thing).
 */
import { describe, expect, it } from 'vitest';
import { POSES } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { drawables } from '../render/parts';
import { renderCharacter } from '../render/renderCharacter';
import { AVAILABLE_STYLES, MANGA_INK, MANGA_PAPER, STYLE_PACKS, packFor } from '../render/styles';
import { TONE_PLACEHOLDER, characterSvg } from '../render/toSvg';
import { applyEdit } from '../studio/edit';
import { PART_GROUPS, STYLE_IDS, type CharacterCamera, type StyleId } from '../schema/types';

const cam = (yaw: number): CharacterCamera => ({ yaw, pitch: 0, roll: 0, shot: 'full' });
// the style packs are tested on the classic body (circle-arc limbs, outlined parts); the manga body has its own tests
const classic = (c: ReturnType<typeof fromRecipe>) =>
    applyEdit(c, { body: { bodyStyle: 'classic' } });
const meera = classic(fromRecipe(RECIPES[1], 'm'));
const styled = (style: StyleId) => ({ ...meera, style });
/** rx of an ellipse path "M… A rx ry …" */
const rx = (d: string) => Number(/A([\d.]+) /.exec(d)![1]);

describe('style packs', () => {
    it('20 packs (21 ids with line art; pixel waits for the raster pipeline), all vector, unknown or unbuilt styles draw as cartoon', () => {
        expect(AVAILABLE_STYLES).toHaveLength(20);
        expect(new Set(AVAILABLE_STYLES).size).toBe(20);
        for (const id of AVAILABLE_STYLES) {
            expect(STYLE_PACKS[id].id).toBe(id);
            expect(STYLE_PACKS[id].name.trim()).not.toBe('');
            expect(STYLE_PACKS[id].tags.length).toBeGreaterThanOrEqual(2);
            expect(STYLE_PACKS[id].boardOutput).toBe('vector');
            expect(STYLE_IDS).toContain(id);
        }
        expect(STYLE_IDS).toHaveLength(21);
        expect(AVAILABLE_STYLES).not.toContain('pixel');
        expect(packFor('anime').id).toBe('anime');
        expect(packFor('pixel').id).toBe('cartoon');
    });

    it('every style draws every pose from every 30° without a broken path or a missing part', () => {
        // every third pose in every style (the render test draws every pose)
        for (const style of AVAILABLE_STYLES)
            for (const pose of POSES.filter((_, i) => i % 3 === 0))
                for (let yaw = 0; yaw < 360; yaw += 30) {
                    const m = renderCharacter({ ...styled(style), rig: { pose } }, cam(yaw));
                    for (const d of drawables(m.parts))
                        expect(
                            /NaN|Infinity/.test(d.d),
                            `${style} ${pose.id} ${yaw} ${d.key}`,
                        ).toBe(false);
                    const groups = new Set(m.parts.map((p) => p.group));
                    for (const g of PART_GROUPS)
                        expect(groups.has(g), `${style} ${pose.id} ${g}`).toBe(true);
                }
    }, 90000);

    it('switching style changes only the style field', () => {
        let c = meera;
        for (const style of AVAILABLE_STYLES) {
            const next = applyEdit(c, { style });
            expect({ ...next, style: meera.style }).toEqual(meera);
            c = next;
        }
    });

    it('cartoon is flat; anime, webtoon, manga and realistic shade (realistic in soft bands)', () => {
        const shadeLayers = (style: StyleId) =>
            renderCharacter(styled(style), cam(20))
                .parts.flatMap((p) => p.layers ?? [])
                .filter((l) => l.kind === 'shade');
        expect(shadeLayers('cartoon')).toHaveLength(0);
        for (const s of ['anime', 'webtoon', 'manga'] as const)
            expect(shadeLayers(s).length).toBeGreaterThan(10);
        const soft = shadeLayers('realistic');
        expect(soft.length).toBeGreaterThan(20);
        expect(soft.every((l) => l.opacity !== undefined && l.opacity < 1)).toBe(true);
    });

    it('eyes: anime biggest, realistic smallest', () => {
        const eye = (style: StyleId) =>
            rx(renderCharacter(styled(style), cam(0)).parts.find((p) => p.key === 'eyeL')!.d);
        expect(eye('anime')).toBeGreaterThan(eye('cartoon'));
        expect(eye('realistic')).toBeLessThan(eye('cartoon') * 0.8);
    });

    it('manga is only ink, paper and screentone', () => {
        const items = drawables(renderCharacter(styled('manga'), cam(30)).parts);
        for (const d of items) {
            if (typeof d.fill !== 'string') throw new Error(`gradient in manga: ${d.key}`);
            expect([MANGA_INK, MANGA_PAPER, 'none', '#ffffff', '#120c0a'], d.key).toContain(d.fill);
        }
        expect(items.some((d) => d.tone)).toBe(true);
    });

    it('webtoon adds a rim light; anime and manga a hair highlight; anime and webtoon gradient hair', () => {
        const layers = (style: StyleId) =>
            renderCharacter(styled(style), cam(20)).parts.flatMap((p) => p.layers ?? []);
        expect(layers('webtoon').some((l) => l.key.endsWith('-rim'))).toBe(true);
        expect(layers('anime').some((l) => l.key === 'hair-front-shine')).toBe(true);
        expect(layers('manga').some((l) => l.key === 'hair-front-shine')).toBe(true);
        for (const s of ['anime', 'webtoon'] as const) {
            const hair = renderCharacter(styled(s), cam(0)).parts.find(
                (p) => p.key === 'hair-front',
            )!;
            expect(typeof hair.fill).toBe('object');
        }
    });

    it('the SVG file keeps gradients (unique ids per character) and greys out tones for the page', () => {
        const anime = characterSvg(renderCharacter(styled('anime'), cam(0)), 300);
        const doc = new DOMParser().parseFromString(anime, 'image/svg+xml');
        expect(doc.querySelector('parsererror')).toBeNull();
        const grads = [...doc.querySelectorAll('linearGradient')].map((g) => g.id);
        expect(grads.length).toBeGreaterThan(0);
        for (const id of grads) expect(anime).toContain(`url(#${id})`);
        const other = characterSvg(
            renderCharacter({ ...fromRecipe(RECIPES[2], 'k'), style: 'anime' }, cam(0)),
            300,
        );
        expect(other).not.toContain(`id="${grads[0]}"`);
        expect(characterSvg(renderCharacter(styled('manga'), cam(0)), 300)).toContain(
            TONE_PLACEHOLDER,
        );
    });
});

// fate-reviewer (2026-11-18)
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
        // both bodies: the manga torso is a waisted loft with its own shadow band
        for (const bodyStyle of ['classic', 'manga'] as const)
            for (const style of ['anime', 'realistic', 'manga', 'webtoon'] as const)
                for (const r of [RECIPES[0], RECIPES[1], RECIPES[9]])
                    for (const pose of POSES.filter((_, i) => i % 11 === 0))
                        for (let yaw = 0; yaw < 360; yaw += 45) {
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
        // ~1600 renders: a few seconds alone, more while the whole suite runs in parallel
    }, 90000);

    it('manga: dark skin is screentone, never ink, so the face stays readable', () => {
        const grace = { ...fromRecipe(RECIPES[9], 'g'), style: 'manga' as const };
        const m = renderCharacter(grace, cam(0));
        const head = m.parts.find((p) => p.key === 'head')!;
        expect(head.fill).toBe(MANGA_PAPER);
        expect(head.tone).toBeGreaterThan(0.4);
        expect(m.parts.find((p) => p.key === 'mouth')!.stroke).toBe(MANGA_INK);
    });

    it('manga: a sleepy eyelid has the skin tone too', () => {
        const kabir = { ...fromRecipe(RECIPES[2], 'k'), style: 'manga' as const };
        const sleepy = { ...kabir, face: { ...kabir.face, eyeStyle: 'sleepy' as const } };
        const lid = renderCharacter(sleepy, cam(0)).parts.find((p) => p.key === 'lidL')!;
        const head = renderCharacter(sleepy, cam(0)).parts.find((p) => p.key === 'head')!;
        expect(lid.tone).toBe(head.tone);
    });

    it('the selection outline keeps its width when the outline is a layer; soft-band opacity is exact in the file', () => {
        const items = drawables(renderCharacter(styled('anime'), cam(0)).parts);
        const torso = items.find((d) => d.key === 'torso')!;
        expect(torso.strokeWidth).toBe(0);
        expect(torso.outlineWidth).toBeGreaterThan(0);
        expect(characterSvg(renderCharacter(styled('realistic'), cam(20)), 300)).toContain(
            'fill-opacity="0.38"',
        );
    });
});

describe('the 14 packs of phase 9', () => {
    const sheet = (style: StyleId) => renderCharacter(styled(style), cam(0));
    const part = (style: StyleId, key: string) => sheet(style).parts.find((p) => p.key === key)!;
    /** the part's outline colour, wherever it is drawn (on the part, or as its top layer) */
    const outline = (style: StyleId, key: string) => {
        const p = part(style, key);
        return p.stroke ?? p.layers?.find((l) => l.kind === 'outline')?.stroke ?? null;
    };
    const fills = (style: StyleId) =>
        sheet(style)
            .parts.filter((p) => p.role !== 'feature' && p.role !== 'line')
            .map((p) => p.fill);

    it('look different: no two styles draw the same picture', () => {
        const seen = new Map<string, string>();
        for (const style of AVAILABLE_STYLES) {
            const key = JSON.stringify(
                sheet(style).parts.map((p) => [p.key, p.d, p.fill, p.stroke, p.strokeWidth]),
            );
            expect(seen.get(key), `${style} = ${seen.get(key)}`).toBeUndefined();
            seen.set(key, style);
        }
    });

    it('flat and paper cut-out have no outline; stick, sketch and comic use ink; noir is grey', () => {
        for (const style of ['flat', 'paper-cut'] as const)
            expect(outline(style, 'torso'), style).toBeNull();
        for (const style of ['stick', 'sketch', 'comic-western'] as const)
            expect(outline(style, 'torso'), style).toBe(MANGA_INK);
        for (const f of fills('noir')) {
            const [, r, g, b] = /^#(..)(..)(..)$/.exec(f as string)!;
            expect(r === g && g === b, `noir ${f}`).toBe(true);
        }
    });

    it('chibi has a bigger head, stick figures thinner limbs', () => {
        const limb = (style: StyleId) => rx(part(style, 'upperArmL').d);
        expect(limb('stick')).toBeLessThan(limb('cartoon') * 0.5);
        const box = (style: StyleId) => {
            const n = (part(style, 'head').d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
            const xs = n.filter((_, i) => i % 2 === 0);
            return Math.max(...xs) - Math.min(...xs);
        };
        expect(box('chibi')).toBeGreaterThan(box('cartoon') * 1.4);
    });

    it('a style changes colours and drawing, never the character: the same body parts exist', () => {
        const body = (style: StyleId) =>
            sheet(style)
                .parts.map((p) => p.key)
                .filter((k) => !/^shine2/.test(k))
                .sort();
        for (const style of AVAILABLE_STYLES) expect(body(style), style).toEqual(body('cartoon'));
    });
});
