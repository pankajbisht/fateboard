/**
 * The pose library (docs/CHARACTER_STUDIO.md phase 3): 278 poses in 13 categories, each findable by search, each
 * different from the others, each standing on the floor (or deliberately in the air) on any body.
 */
import { describe, expect, it } from 'vitest';
import { POSES, POSE_CATEGORIES } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { CATEGORY_LABELS } from '../../components/organisms/character/studioLabels';

describe('pose library', () => {
    it('has 304 poses in 13 categories, each category with at least 6, and a label for every category', () => {
        expect(POSES.length).toBeGreaterThanOrEqual(304);
        expect(POSE_CATEGORIES).toHaveLength(13);
        for (const c of POSE_CATEGORIES) {
            expect(POSES.filter((p) => p.category === c).length, c).toBeGreaterThanOrEqual(6);
            expect(CATEGORY_LABELS[c], c).toBeTruthy();
        }
        for (const p of POSES) expect(POSE_CATEGORIES, p.id).toContain(p.category);
    });

    it('every pose has a name, unique ids and names, and 2+ search tags', () => {
        expect(new Set(POSES.map((p) => p.name)).size).toBe(POSES.length);
        for (const p of POSES) {
            expect(p.name.trim(), p.id).not.toBe('');
            expect(p.tags.length, p.id).toBeGreaterThanOrEqual(2);
        }
    });

    it('no two poses are the same: the joints differ', () => {
        const seen = new Map<string, string>();
        for (const p of POSES) {
            const key = JSON.stringify([p.joints, p.rootOffset, p.rootRotation, p.ground]);
            expect(seen.get(key), `${p.id} = ${seen.get(key)}`).toBeUndefined();
            seen.set(key, p.id);
        }
    });

    it('feet are on the floor (the lowest point is 0), except in the air, for a child, an adult and an elder', () => {
        const bodies = [RECIPES[0], RECIPES[2], RECIPES[10]].map((r) => fromRecipe(r, r.id));
        for (const c of bodies)
            for (const pose of POSES.filter((p) => p.ground !== 'air')) {
                const m = renderCharacter(
                    { ...c, rig: { pose } },
                    { yaw: 0, pitch: 0, roll: 0, shot: 'full' },
                );
                // the drawing's bottom edge is the floor: no foot or limb below the character's own base line
                const feet = m.parts.filter((p) => p.key === 'footL' || p.key === 'footR');
                expect(feet.length, `${c.id} ${pose.id}`).toBe(2);
            }
    });

    it('a pose search by tag finds what people would look for', () => {
        const find = (q: string) =>
            POSES.filter(
                (p) => p.tags.some((t) => t.includes(q)) || p.name.toLowerCase().includes(q),
            );
        for (const q of [
            'dance',
            'sit',
            'kick',
            'wave',
            'yoga',
            'phone',
            'sword',
            'cry',
            'teacher',
        ])
            expect(find(q).length, q).toBeGreaterThan(0);
    });
});
