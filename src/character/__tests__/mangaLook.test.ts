/**
 * The manga look (docs/CHARACTER_STUDIO.md, manga look pass): a manga-body character keeps its measured head size in
 * every art style but chibi, new characters start in a manga-friendly art style and pose, and the face and hair have
 * the manga options (eye shapes, eyelashes, sparkle eyes, ahoge, hime cut).
 */
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe, mangaVariantFor } from '../data/recipes';
import { poseById } from '../data/poses';
import * as Arms from '../data/poseArms';
import { pose } from '../data/poseDsl';
import { pointOn, solveFK } from '../rig/fk';
import { castRecipes } from '../data/cast';
import { renderCharacter } from '../render/renderCharacter';
import { buildSkeleton } from '../rig/skeleton';
import { migrateCharacter } from '../schema/migrate';
import { defaultCharacter, parseCharacter } from '../schema/parse';
import { CHARACTER_SCHEMA_VERSION, type Character, type StyleId } from '../schema/types';
import { applyEdit } from '../studio/edit';

const cam = (yaw = 0) => ({ yaw, pitch: 0, roll: 0, shot: 'full' as const });
const base = applyEdit(fromRecipe(RECIPES[4], 'r'), {
    body: { bodyStyle: 'manga', age: 25 },
    hair: { style: 'bald' },
});
const ys = (d: string) =>
    (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, k) => k % 2 === 1);
/** figure height over the drawn head's height, as drawn (head part only, so hair does not count) */
const drawnHeads = (style: StyleId, bodyStyle: 'manga' | 'classic' = 'manga') => {
    const c = applyEdit({ ...base, style }, { body: { bodyStyle } });
    const m = renderCharacter(c, cam());
    const head = ys(m.parts.find((p) => p.key === 'head')!.d);
    return m.height / (Math.max(...head) - Math.min(...head));
};
const keys = (c: Parameters<typeof renderCharacter>[0], yaw = 0) =>
    renderCharacter(c, cam(yaw)).parts.map((p) => p.key);

describe('the manga body draws its measured head in every art style', () => {
    it('7–8 heads tall as drawn in cartoon, anime, manga, webtoon and realistic', () => {
        for (const style of ['cartoon', 'anime', 'manga', 'webtoon', 'realistic'] as const) {
            const h = drawnHeads(style);
            expect(h, style).toBeGreaterThan(7);
            expect(h, style).toBeLessThan(8.3);
        }
    });

    it('chibi keeps its big head; the classic body keeps the style head size as before', () => {
        expect(drawnHeads('chibi')).toBeLessThan(4.5);
        const s = buildSkeleton(applyEdit(base, { body: { bodyStyle: 'classic' } }).body);
        const skeletonHeads = s.height / s.headHeight;
        expect(drawnHeads('cartoon', 'classic')).toBeLessThan(skeletonHeads / 1.2);
    });
});

describe('new characters start manga-friendly', () => {
    it('recipes, the cast and the blank start use the anime style and the relaxed manga idle', () => {
        for (const c of [
            fromRecipe(RECIPES[0], 'a'),
            fromRecipe(castRecipes()[50], 'b'),
            defaultCharacter(),
        ]) {
            expect(c.style, c.name).toBe('anime');
            expect(c.rig.pose.id, c.name).toBe('manga-idle');
        }
    });

    it('variants follow age and build: webtoon (tall / slim, 14–40), seinen / josei (25+), shonen / shojo (younger)', () => {
        const variants = new Set(castRecipes().map((r) => fromRecipe(r, 'x').body.mangaVariant));
        expect([...variants].sort()).toEqual(['josei', 'seinen', 'shojo', 'shonen', 'webtoon']);
        const v = (build: 'tall' | 'average', age: number, gender: number) =>
            mangaVariantFor({ build, age, gender });
        expect(v('tall', 22, 0)).toBe('webtoon');
        expect(v('average', 30, 0)).toBe('seinen');
        expect(v('average', 60, 1)).toBe('josei');
        expect(v('average', 16, 0)).toBe('shonen');
        expect(v('average', 10, 1)).toBe('shojo');
    });

    it('seinen is broader than shonen; both are 7.5–8 heads grown', () => {
        const grown = (mangaVariant: 'seinen' | 'shonen') =>
            buildSkeleton(applyEdit(base, { body: { mangaVariant, gender: 0 } }).body);
        const se = grown('seinen');
        const sh = grown('shonen');
        expect(se.size.shoulderW / se.height).toBeGreaterThan(sh.size.shoulderW / sh.height);
        for (const s of [se, sh]) {
            expect(s.height / s.headHeight).toBeGreaterThanOrEqual(7.5);
            expect(s.height / s.headHeight).toBeLessThanOrEqual(8);
        }
    });
});

describe('manga face options', () => {
    it('sharp, droopy and sparkle eyes draw; sparkle adds extra highlights', () => {
        for (const eyeStyle of ['sharp', 'droopy', 'sparkle'] as const) {
            const k = keys(applyEdit(base, { face: { eyeStyle } }));
            expect(k, eyeStyle).toContain('eyeL');
            expect(k, eyeStyle).toContain('irisR');
        }
        const sparkle = keys(applyEdit(base, { face: { eyeStyle: 'sparkle' } }));
        expect(sparkle).toContain('sparkleL');
        expect(keys(base)).not.toContain('sparkleL');
    });

    it('sharp and droopy eyes are almond outlines whose outer corner turns up or down', () => {
        // the outline is `M inner Q upper outer Q lower inner Z`: inner and outer corners are the 1st and 3rd points
        const corners = (eyeStyle: 'sharp' | 'droopy', key: 'eyeL' | 'eyeR') => {
            const c = applyEdit(base, { face: { eyeStyle }, pose: poseById('stand')! });
            const d = renderCharacter(c, cam()).parts.find((p) => p.key === key)!.d;
            expect(d, eyeStyle).toMatch(/^M[^A]*Q[^A]*Q[^A]*Z$/);
            const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
            const [ix, iy, , , ox, oy] = n;
            return { lift: iy - oy, width: Math.abs(ox - ix) };
        };
        for (const key of ['eyeL', 'eyeR'] as const) {
            const sharp = corners('sharp', key);
            const droopy = corners('droopy', key);
            // y grows downward: sharp lifts the outer corner above the inner one, droopy drops it below
            expect(sharp.lift, key).toBeGreaterThan(sharp.width * 0.1);
            expect(droopy.lift, key).toBeLessThan(-droopy.width * 0.1);
        }
        // round eyes stay ellipses
        const round = renderCharacter(base, cam()).parts.find((p) => p.key === 'eyeL')!.d;
        expect(round).toMatch(/A/);
    });

    it('bigger eye styles stay visible at the same angles as round eyes (no one-eyed ¾ view)', () => {
        const c = applyEdit(base, { pose: poseById('stand')! });
        const eyes = (eyeStyle: 'round' | 'sharp' | 'droopy' | 'sparkle', yaw: number) =>
            renderCharacter(applyEdit(c, { face: { eyeStyle } }), cam(yaw))
                .parts.map((p) => p.key)
                .filter((k) => /^eye[LR]$/.test(k))
                .sort()
                .join(',');
        for (const yaw of [20, 30, 40, 320, 330, 340])
            for (const style of ['sharp', 'droopy', 'sparkle'] as const)
                expect(eyes(style, yaw), `${style} ${yaw}`).toBe(eyes('round', yaw));
    });

    it('eyelashes draw a lash line and flicks on open eyes only', () => {
        const on = applyEdit(base, { face: { lashes: true } });
        expect(keys(on)).toContain('lashL');
        expect(keys(on)).toContain('lashR');
        expect(keys(base)).not.toContain('lashL');
        const shut = applyEdit(on, { face: { blink: 1 } });
        expect(keys(shut)).not.toContain('lashL');
    });

    it('new women get eyelashes, new men do not', () => {
        const woman = RECIPES.find((r) => r.gender >= 0.5)!;
        const man = RECIPES.find((r) => r.gender < 0.5)!;
        expect(fromRecipe(woman, 'w').face.lashes).toBe(true);
        expect(fromRecipe(man, 'm').face.lashes).toBe(false);
    });
});

describe('manga brows and mouths', () => {
    const still = applyEdit(base, { pose: poseById('stand')! });
    const part = (c: Character, key: string) =>
        renderCharacter(c, cam()).parts.find((p) => p.key === key);
    const pts = (d: string) => {
        const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
        return Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]] as const);
    };

    it('angry brows slope down toward the nose; thin brows are thinner than soft ones', () => {
        // browL is on the character's left: its inner end (first point) is nearer the nose
        for (const key of ['browL', 'browR']) {
            const angry = pts(part(applyEdit(still, { face: { browStyle: 'angry' } }), key)!.d);
            const soft = pts(part(still, key)!.d);
            const drop = (p: typeof angry) => p[0][1] - p[p.length - 1][1];
            expect(drop(angry), key).toBeGreaterThan(drop(soft) + 0.5);
        }
        const w = (browStyle: 'thin' | 'soft') =>
            part(applyEdit(still, { face: { browStyle } }), 'browL')!.strokeWidth;
        expect(w('thin')).toBeLessThan(w('soft') * 0.8);
    });

    it('cat mouth is a ω (two curves), small is narrower, fang adds a fang', () => {
        const mouth = (mouthStyle: 'cat' | 'small' | 'smile' | 'fang') =>
            part(applyEdit(still, { face: { mouthStyle } }), 'mouth')!;
        expect(mouth('cat').d.match(/Q/g)?.length).toBe(2);
        const width = (d: string) => {
            const xs = pts(d).map((p) => p[0]);
            return Math.max(...xs) - Math.min(...xs);
        };
        expect(width(mouth('small').d)).toBeLessThan(width(mouth('smile').d) * 0.75);
        expect(part(applyEdit(still, { face: { mouthStyle: 'fang' } }), 'fang')).toBeTruthy();
        expect(part(still, 'fang')).toBeUndefined();
    });

    it('the cast keeps to the original brows and mouths', () => {
        for (const r of castRecipes()) {
            expect(['soft', 'straight', 'thick'], r.id).toContain(r.brow);
            expect(['smile', 'neutral', 'grin'], r.id).toContain(r.mouth);
        }
    });
});

describe('manga hair options', () => {
    it('the hime cut has side locks beside the face', () => {
        const k = keys(applyEdit(base, { hair: { style: 'hime' } }));
        expect(k).toContain('hair-front');
        expect(k.filter((x) => /^hair-x\d$/.test(x)).length).toBeGreaterThanOrEqual(2);
    });

    it('an ahoge stands on top of the head from every side, and a hat hides it', () => {
        const c = applyEdit(base, { hair: { style: 'short', ahoge: true } });
        for (const yaw of [0, 90, 180, 270])
            expect(keys(c, yaw), String(yaw)).toContain('hair-ahoge');
        expect(keys(applyEdit(c, { hair: { ahoge: false } }))).not.toContain('hair-ahoge');
        const hat = applyEdit(c, { accessories: [{ kind: 'cap', color: '#222222' }] });
        expect(keys(hat)).not.toContain('hair-ahoge');
        for (const p of renderCharacter(c, cam(30)).parts) expect(p.d, p.key).not.toMatch(/NaN/);
    });
});

describe('schema 7', () => {
    it('an older character gets no eyelashes and no ahoge, and the version is current', () => {
        const old = JSON.parse(JSON.stringify(fromRecipe(RECIPES[1], 'o')));
        old.schemaVersion = 6;
        delete old.face.lashes;
        delete old.hair.ahoge;
        const m = migrateCharacter(old)!;
        expect(m.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
        const c = parseCharacter(old)!;
        expect(c.face.lashes).toBe(false);
        expect(c.hair.ahoge).toBe(false);
    });
});

describe('hand placements found on the classic body still land on the manga body', () => {
    it('chin, forehead, ear, mouth, hip and guard: within a quarter head of the classic spot, in head units', () => {
        // the arms of data/poseArms.ts were angle-searched on the classic body; the manga arm is shorter
        const arms = {
            chin: Arms.handToChin,
            forehead: Arms.handToForehead,
            ear: Arms.handToEar,
            mouth: Arms.handToMouth,
            hip: Arms.handOnHip,
            guard: Arms.guard,
        };
        const spot = (bodyStyle: 'classic' | 'manga', name: string, arm: (typeof arms)['chin']) => {
            const p = pose('t', 't', 'gesture', ['t', 't'], { armR: arm });
            const s = buildSkeleton(
                applyEdit(fromRecipe(RECIPES[4], 'x'), { body: { bodyStyle, age: 25 } }).body,
            );
            const f = solveFK(s, p);
            const palm = pointOn(f, 'handR', [0, -s.hand * 0.5, 0]);
            const j = name === 'hip' ? 'pelvis' : 'head';
            const d = [0, 1, 2].map((i) => palm[i] - f.pos[j][i]);
            const R = f.rot[j];
            return [0, 1, 2].map(
                (k) => (R[k] * d[0] + R[3 + k] * d[1] + R[6 + k] * d[2]) / s.headHeight,
            );
        };
        for (const [name, arm] of Object.entries(arms)) {
            const a = spot('classic', name, arm);
            const b = spot('manga', name, arm);
            expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), name).toBeLessThan(
                // the reference-sheet hips are narrower: the hand on the hip rests at the waist (reads the same);
                // phase 6 of the reference pass places hands by target instead
                name === 'hip' ? 0.35 : 0.25,
            );
        }
    });
});
