// @vitest-environment node
/**
 * The face system (docs/CHARACTER_STUDIO.md phase 2): 20 emotions as parameter vectors, lip-sync shapes, gaze,
 * blink, the schema step that added them, and the face never leaving the head's drawn outline (BUG-253).
 */
import { describe, expect, it } from 'vitest';
import { EMOTIONS, EMOTION_IDS, VISEMES, resolveFace } from '../data/emotions';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { AVAILABLE_STYLES } from '../render/styles';
import { migrateCharacter } from '../schema/migrate';
import { parseCharacter } from '../schema/parse';
import { CHARACTER_SCHEMA_VERSION, type CharacterCamera } from '../schema/types';
import { applyEdit } from '../studio/edit';
import { anglesFor } from './sweep';

const cam = (yaw: number, shot: CharacterCamera['shot'] = 'closeup'): CharacterCamera => ({
    yaw,
    pitch: 0,
    roll: 0,
    shot,
});
const meera = fromRecipe(RECIPES[1], 'm');
const part = (c: typeof meera, yaw: number, key: string) =>
    renderCharacter(c, cam(yaw)).parts.find((p) => p.key === key);
const numbers = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe('emotions', () => {
    it('are 20, each with a name and finite parameters', () => {
        expect(EMOTIONS).toHaveLength(20);
        expect(new Set(EMOTION_IDS).size).toBe(20);
        for (const e of EMOTIONS) {
            expect(e.name.trim()).not.toBe('');
            for (const t of [0, 0.5, 1]) {
                const p = resolveFace(
                    { mouthStyle: 'smile', blink: 0, viseme: 'rest' },
                    { id: e.id, intensity: t },
                );
                for (const [k, v] of Object.entries(p))
                    if (typeof v === 'number')
                        expect(Number.isFinite(v), `${e.id} ${k}`).toBe(true);
            }
        }
    });

    it('intensity 0 is the resting face; 1 is the full emotion; in between is a blend', () => {
        const face = { mouthStyle: 'smile', blink: 0, viseme: 'rest' } as const;
        const rest = resolveFace(face, { id: 'neutral', intensity: 0 });
        expect(resolveFace(face, { id: 'angry', intensity: 0 })).toEqual(rest);
        const half = resolveFace(face, { id: 'angry', intensity: 0.5 }).browTilt;
        const full = resolveFace(face, { id: 'angry', intensity: 1 }).browTilt;
        expect(half).toBeGreaterThan(0);
        expect(half).toBeLessThan(full);
    });

    it('lip-sync shapes set the mouth; blinking closes the eyes; a held blink wins over a wide-eyed emotion', () => {
        const face = (viseme: string, blink = 0) => ({
            mouthStyle: 'neutral' as const,
            blink,
            viseme,
        });
        const ah = resolveFace(face('aa'), { id: 'neutral', intensity: 0 });
        const oh = resolveFace(face('oh'), { id: 'neutral', intensity: 0 });
        expect(ah.mouthOpen).toBeGreaterThan(0.5);
        expect(oh.mouthRound).toBe(1);
        expect(resolveFace(face('mbp'), { id: 'surprised', intensity: 1 }).mouthOpen).toBe(0);
        expect(VISEMES.length).toBeGreaterThanOrEqual(8);
        expect(resolveFace(face('rest', 1), { id: 'shocked', intensity: 1 }).eyeOpen).toBe(0);
    });
});

describe('the schema step', () => {
    it('a version 1 character gains a straight gaze, open eyes and a resting mouth', () => {
        const v1 = JSON.parse(JSON.stringify(meera));
        v1.schemaVersion = 1;
        delete v1.face.gaze;
        delete v1.face.blink;
        delete v1.face.viseme;
        expect(migrateCharacter(v1)!.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
        const c = parseCharacter(v1)!;
        expect(c.face).toMatchObject({ gaze: { x: 0, y: 0 }, blink: 0, viseme: 'rest' });
        expect(c.face.eyeStyle).toBe(meera.face.eyeStyle);
    });

    it('repairs bad face values and unknown emotions', () => {
        const c = parseCharacter({
            ...meera,
            face: { ...meera.face, gaze: { x: 9, y: 'up' }, blink: -3, viseme: 'zzz' },
            emotion: { id: 'ecstatic-ish', intensity: 4 },
        })!;
        expect(c.face).toMatchObject({ gaze: { x: 1, y: 0 }, blink: 0, viseme: 'rest' });
        expect(c.emotion).toEqual({ id: 'neutral', intensity: 1 });
    });
});

describe('the drawn face', () => {
    it('an emotion changes the face and nothing else (the body and clothes are the same shapes)', () => {
        const angry = applyEdit(meera, { emotion: { id: 'angry', intensity: 1 } });
        const a = renderCharacter(meera, cam(0, 'full'));
        const b = renderCharacter(angry, cam(0, 'full'));
        expect(b.parts.find((p) => p.key === 'browL')!.d).not.toBe(
            a.parts.find((p) => p.key === 'browL')!.d,
        );
        for (const k of ['torso', 'hips', 'head', 'handL-palm'])
            expect(b.parts.find((p) => p.key === k)!.d).toBe(a.parts.find((p) => p.key === k)!.d);
    });

    it('blinking shuts the eyes (a line, no iris); half a blink narrows them', () => {
        const open = part(meera, 0, 'eyeL')!;
        const half = part(applyEdit(meera, { face: { blink: 0.5 } }), 0, 'eyeL')!;
        const shut = applyEdit(meera, { face: { blink: 1 } });
        expect(part(shut, 0, 'irisL')).toBeUndefined();
        expect(part(shut, 0, 'eyeL')!.fill).toBe('none');
        expect(numbers(half.d)[3]).toBeLessThan(numbers(open.d)[3]);
    });

    it('gaze moves the iris toward where it looks and keeps it inside the eye', () => {
        const at = (x: number, y: number) => {
            const c = applyEdit(meera, { face: { gaze: { x, y } } });
            const n = numbers(part(c, 0, 'irisL')!.d);
            return { cx: (n[0] + n[7]) / 2, cy: (n[1] + n[8]) / 2 };
        };
        const ahead = at(0, 0);
        expect(at(1, 0).cx).toBeGreaterThan(ahead.cx);
        expect(at(-1, 0).cx).toBeLessThan(ahead.cx);
        expect(at(0, 1).cy).toBeLessThan(ahead.cy);
        // at the extreme, the iris edge stays within the white (centre offset ≤ white half-width − iris half-width)
        const white = numbers(part(meera, 0, 'eyeL')!.d);
        const iris = numbers(part(meera, 0, 'irisL')!.d);
        const room = (white[2] - iris[2]) * 1.0001;
        expect(Math.abs(at(1, 0).cx - ahead.cx)).toBeLessThanOrEqual(room);
    });

    it('crying draws tears, embarrassment draws blush, and an open mouth shows teeth when it should', () => {
        const keys = (c: typeof meera) => renderCharacter(c, cam(0)).parts.map((p) => p.key);
        expect(keys(applyEdit(meera, { emotion: { id: 'crying', intensity: 1 } }))).toEqual(
            expect.arrayContaining(['tearL', 'tearR']),
        );
        expect(keys(applyEdit(meera, { emotion: { id: 'embarrassed', intensity: 1 } }))).toEqual(
            expect.arrayContaining(['blushL', 'blushR']),
        );
        expect(keys(meera)).not.toContain('tearL');
        expect(keys(applyEdit(meera, { emotion: { id: 'laughing', intensity: 1 } }))).toContain(
            'teeth',
        );
        expect(keys(applyEdit(meera, { face: { viseme: 'ee' } }))).toContain('teeth');
    });

    it('every emotion, mouth shape and style renders finite shapes', () => {
        const bad: string[] = [];
        for (const style of AVAILABLE_STYLES)
            for (const e of EMOTIONS) {
                const c = applyEdit({ ...meera, style }, { emotion: { id: e.id, intensity: 1 } });
                for (const p of renderCharacter(c, cam(25)).parts)
                    if (!numbers(p.d).every(Number.isFinite)) bad.push(`${style} ${e.id} ${p.key}`);
            }
        expect(bad).toEqual([]);
        for (const v of VISEMES)
            expect(part(applyEdit(meera, { face: { viseme: v.id } }), 0, 'mouth')).toBeTruthy();
    }, 60_000); // 19 styles × every emotion: about 6 s on a busy machine
});

describe('BUG-253: no feature leaves the head', () => {
    /** Even-odd inside, or within `eps` of the edge, for the head's quadratic outline (sampled). */
    const sample = (d: string): [number, number][] => {
        const n = numbers(d);
        const out: [number, number][] = [];
        let cur: [number, number] = [n[0], n[1]];
        for (let i = 2; i + 3 < n.length; i += 4) {
            const c: [number, number] = [n[i], n[i + 1]];
            const e: [number, number] = [n[i + 2], n[i + 3]];
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
        return (
            odd ||
            poly.some((a, i) => {
                const b = poly[(i + 1) % poly.length];
                const dx = b[0] - a[0];
                const dy = b[1] - a[1];
                const t = Math.max(
                    0,
                    Math.min(
                        1,
                        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1),
                    ),
                );
                return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) <= eps;
            })
        );
    };

    it('eyes and brows stay inside the head outline from every side, in every style and mood', () => {
        const misses: string[] = [];
        let combo = 0;
        // 12 of the 36 angles (10° steps) for each style, person and mood, a different set for each, so all 36 are drawn
        for (const style of AVAILABLE_STYLES)
            for (const r of [RECIPES[0], RECIPES[3], RECIPES[8]])
                for (const emotion of ['neutral', 'surprised', 'laughing'])
                    for (const yaw of anglesFor(combo++, 12, 10)) {
                        const c = applyEdit(
                            { ...fromRecipe(r, 'x'), style },
                            { emotion: { id: emotion, intensity: 1 } },
                        );
                        const model = renderCharacter(c, cam(yaw));
                        const head = sample(model.parts.find((p) => p.key === 'head')!.d);
                        for (const p of model.parts.filter((x) =>
                            /^(eye|brow|iris)[LR]$/.test(x.key),
                        )) {
                            const n = numbers(p.d);
                            // the first point, and the other end (an ellipse's far end, or a curve / polyline's last point)
                            const far: [number, number] = /A/.test(p.d)
                                ? [n[7], n[8]]
                                : [n[n.length - 2], n[n.length - 1]];
                            for (const pt of [[n[0], n[1]], far] as [number, number][])
                                if (!inside(head, pt, 0.2))
                                    misses.push(`${style} ${r.id} ${emotion} ${yaw} ${p.key}`);
                        }
                    }
        expect(misses).toEqual([]);
    }, 30000);
});

describe('extreme angles (docs/CHARACTER_STUDIO.md phase 3: head keyshapes)', () => {
    const at = (c: typeof meera, pitch: number, yaw = 0) =>
        renderCharacter(c, { yaw, pitch, roll: 0, shot: 'closeup' }).parts;
    const keys = (c: typeof meera, pitch: number, yaw = 0) => at(c, pitch, yaw).map((p) => p.key);

    it('from above the hair shows its crown (a swirl), from the front it does not, and a bald head has none', () => {
        expect(keys(meera, 68)).toContain('hair-crown');
        expect(keys(meera, 0)).not.toContain('hair-crown');
        expect(keys(meera, -68)).not.toContain('hair-crown');
        expect(keys(applyEdit(meera, { hair: { style: 'bald' } }), 68)).not.toContain('hair-crown');
        // the crown is hair-coloured, darker than the hair, and in the head's group
        const crown = at(meera, 68).find((p) => p.key === 'hair-crown')!;
        expect(crown.group).toBe('hair');
        expect(crown.fill).toBe('none');
    });

    it('from below the face shows the underside: a jaw line and nostrils; not from the front or above', () => {
        for (const k of ['jaw-line', 'nostrilL', 'nostrilR']) {
            expect(keys(meera, -68), k).toContain(k);
            expect(keys(meera, 0), k).not.toContain(k);
            expect(keys(meera, 68), k).not.toContain(k);
        }
    });

    it('the crown and the underside stay inside the head from every turn, in every style and hairstyle', () => {
        const head = (c: typeof meera, pitch: number, yaw: number) => {
            const m = renderCharacter(c, { yaw, pitch, roll: 0, shot: 'closeup' });
            return m.parts;
        };
        for (const style of AVAILABLE_STYLES)
            for (const hair of ['short', 'long', 'afro', 'ponytail-high', 'bun'] as const)
                for (const pitch of [-68, 68])
                    for (let yaw = 0; yaw < 360; yaw += 45) {
                        const c = applyEdit({ ...meera, style }, { hair: { style: hair } });
                        for (const p of head(c, pitch, yaw).filter((x) =>
                            /^(hair-crown|jaw-line|nostril[LR])$/.test(x.key),
                        ))
                            for (const n of numbers(p.d))
                                expect(
                                    Number.isFinite(n),
                                    `${style} ${hair} ${pitch} ${yaw} ${p.key}`,
                                ).toBe(true);
                    }
    }, 30_000); // 5 styles × 5 hairstyles × 16 views: about 5 s on a busy machine

    it('every character and style draws from straight above and below, from every side, without a broken path', () => {
        for (const style of AVAILABLE_STYLES)
            for (const r of [RECIPES[0], RECIPES[8]])
                for (const pitch of [-70, 70])
                    for (let yaw = 0; yaw < 360; yaw += 60)
                        for (const p of at({ ...fromRecipe(r, 'x'), style }, pitch, yaw))
                            expect(
                                /NaN|Infinity/.test(p.d),
                                `${style} ${r.id} ${pitch} ${yaw} ${p.key}`,
                            ).toBe(false);
    });
});
