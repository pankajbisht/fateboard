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
import { anglesFor } from './sweep';

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

    // every style × every third pose (the render test draws every pose from every 15°), each from 3 angles of
    // the twelve 30° steps, a different set for each pair so all twelve are drawn. The full product was 26 000
    // renders with an expect per part. One test per style: all styles in one test passed 90 s on CI under
    // coverage once the combat poses landed (the same renders and checks, as hair.test.ts's sweep)
    const sweepPoses = POSES.filter((_, k) => k % 3 === 0);
    AVAILABLE_STYLES.forEach((style, s) =>
        it(`${style} draws every pose, from angles spread round the circle, without a broken path or a missing part`, () => {
            const bad: string[] = [];
            sweepPoses.forEach((pose, k) => {
                for (const yaw of anglesFor(s * sweepPoses.length + k, 3, 30)) {
                    const m = renderCharacter({ ...styled(style), rig: { pose } }, cam(yaw));
                    for (const d of drawables(m.parts))
                        if (/NaN|Infinity/.test(d.d))
                            bad.push(`${style} ${pose.id} ${yaw} ${d.key}`);
                    const groups = new Set(m.parts.map((p) => p.group));
                    for (const g of PART_GROUPS)
                        if (!groups.has(g)) bad.push(`${style} ${pose.id} ${g}`);
                }
            });
            expect(bad).toEqual([]);
        }, 30000),
    );

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
    // the shading-inside-outline sweep is in styles.shading.test.ts (its own file so it runs on its own worker)
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
