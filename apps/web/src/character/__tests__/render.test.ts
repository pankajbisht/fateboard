/**
 * Character Studio phase 1: rendering from any angle, the pose library, the recipes and the schema
 * (docs/CHARACTER_STUDIO.md §5 acceptance checks).
 */
import { describe, expect, it } from 'vitest';
import { POSES } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { SWEEP_BODIES } from './poseSweep';
import { renderCharacter, shownHairColor } from '../render/renderCharacter';
import { characterSvg } from '../render/toSvg';
import { viewBin } from '../render/camera';
import { clampPose } from '../rig/limits';
import { migrateCharacter } from '../schema/migrate';
import { defaultCharacter, parseCharacter, parsePose } from '../schema/parse';
import { CHARACTER_SCHEMA_VERSION, type CharacterCamera } from '../schema/types';

const cam = (yaw: number, extra: Partial<CharacterCamera> = {}): CharacterCamera => ({
    yaw,
    pitch: 0,
    roll: 0,
    shot: 'full',
    ...extra,
});

describe('rendering', () => {
    // the every-pose × every-angle sweep is in render.sweep.<body>.test.ts (one file per body, run in parallel)
    const bodies = [SWEEP_BODIES.kid, SWEEP_BODIES.adult, SWEEP_BODIES.elder].map((c) => ({
        ...c,
        style: 'cartoon' as const,
    }));

    it('parts are drawn far to near; the face only shows when it faces the camera', () => {
        const c = bodies[1];
        const front = renderCharacter(c, cam(0));
        const depths = front.parts.map((p) => p.depth);
        expect(depths).toEqual([...depths].sort((a, b) => a - b));
        expect(front.parts.some((p) => p.key === 'eyeL')).toBe(true);
        const back = renderCharacter(c, cam(180));
        expect(back.parts.some((p) => p.key.startsWith('eye'))).toBe(false);
        // seen from the left side, only the left eye is visible
        const left = renderCharacter(c, cam(90)).parts.map((p) => p.key);
        expect(left).toContain('eyeL');
        expect(left).not.toContain('eyeR');
    });

    it('shots frame less of the body, from full to close-up', () => {
        const c = bodies[1];
        const heights = (['full', 'knee', 'waist', 'bust', 'closeup'] as const).map(
            (shot) => renderCharacter(c, cam(0, { shot })).viewBox[3],
        );
        expect(heights).toEqual([...heights].sort((a, b) => b - a));
    });

    it('view bins by the angle between camera and body', () => {
        expect(viewBin(0, 0)).toEqual({ bin: 'front', mirrored: false });
        expect(viewBin(40, 0).bin).toBe('threeQuarter');
        expect(viewBin(-90, 0)).toEqual({ bin: 'side', mirrored: true });
        expect(viewBin(180, 10).bin).toBe('back');
    });

    it('the SVG is a valid document with one path per part', () => {
        // cartoon has no shading layers, so each part is exactly one path (other styles add layer paths)
        const m = renderCharacter(bodies[0], cam(30));
        const doc = new DOMParser().parseFromString(characterSvg(m, 300), 'image/svg+xml');
        expect(doc.querySelector('parsererror')).toBeNull();
        expect(doc.querySelectorAll('path')).toHaveLength(m.parts.length);
        expect(doc.documentElement.getAttribute('height')).toBe('300');
    });

    it('hair greys with age unless the colour was chosen by hand', () => {
        const c = defaultCharacter();
        const old = { ...c, body: { ...c.body, age: 80 } };
        expect(shownHairColor(old)).not.toBe(old.hair.color);
        const chosen = { ...old, body: { ...old.body, overridden: ['hairColor'] } };
        expect(shownHairColor(chosen)).toBe(old.hair.color);
    });
});

describe('pose library', () => {
    it('has 278 poses with unique ids, all valid data and inside the joint limits', () => {
        expect(POSES.length).toBeGreaterThanOrEqual(355);
        expect(new Set(POSES.map((p) => p.id)).size).toBe(POSES.length);
        for (const p of POSES) {
            expect(parsePose(p), p.id).toEqual(p);
            expect(clampPose(p).joints, p.id).toEqual(p.joints);
        }
    });
});

describe('recipes', () => {
    it('14 people (12 + the reference pair), no two with the same face + hair + palette', () => {
        expect(RECIPES).toHaveLength(14);
        const keys = RECIPES.map((r) =>
            JSON.stringify([
                r.eye,
                r.brow,
                r.nose,
                r.mouth,
                r.hair,
                r.skin,
                r.top.color,
                r.bottom.color,
            ]),
        );
        expect(new Set(keys).size).toBe(RECIPES.length);
        expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
    });

    it('cover boys, girls, adults and elders of both genders', () => {
        const groups = new Set(
            RECIPES.map(
                (r) =>
                    `${r.gender > 0.5 ? 'f' : 'm'}-${r.age < 18 ? 'young' : r.age < 56 ? 'adult' : 'elder'}`,
            ),
        );
        expect([...groups].sort()).toEqual([
            'f-adult',
            'f-elder',
            'f-young',
            'm-adult',
            'm-elder',
            'm-young',
        ]);
    });

    it('a recipe becomes a complete, valid character', () => {
        const c = fromRecipe(RECIPES[3], 'id-1');
        expect(parseCharacter(c)).toEqual(c);
        expect(c).toMatchObject({
            id: 'id-1',
            source: 'recipe',
            recipeRef: 'ananya',
            style: 'anime',
        });
    });
});

describe('schema', () => {
    it('fills in defaults and clamps out-of-range values', () => {
        const c = parseCharacter({
            name: '  Riya  ',
            body: { age: 300, fat: 7, skinTone: 'red' },
            style: 'nope',
        })!;
        expect(c.name).toBe('Riya');
        expect(c.body.age).toBe(80);
        expect(c.body.fat).toBe(1);
        expect(c.body.skinTone).toMatch(/^#[0-9a-f]{6}$/);
        expect(c.style).toBe('cartoon');
        expect(c.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
    });

    it('is stable: parsing a parsed character changes nothing', () => {
        const c = fromRecipe(RECIPES[8], 'k');
        expect(parseCharacter(JSON.parse(JSON.stringify(c)))).toEqual(c);
    });

    it('a JSON without a version is read; a newer, unknown version is refused', () => {
        expect(migrateCharacter({ name: 'old' })).toMatchObject({
            schemaVersion: CHARACTER_SCHEMA_VERSION,
        });
        expect(
            parseCharacter({ schemaVersion: CHARACTER_SCHEMA_VERSION + 1, name: 'future' }),
        ).toBeNull();
        expect(parseCharacter('not a character')).toBeNull();
        expect(parseCharacter([1, 2])).toBeNull();
    });

    it('changing the style changes nothing else', () => {
        const c = fromRecipe(RECIPES[1], 's');
        const anime = parseCharacter({ ...c, style: 'anime' })!;
        expect({ ...anime, style: c.style }).toEqual(c);
    });
});
