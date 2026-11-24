/**
 * The owner's reference sheets (docs/CHARACTER_STUDIO.md, reference pass): a teen boy in 18 everyday poses and 16 hand
 * gestures, drawn as clean line art. Every reference pose renders finite here; with CONTACT_SHEET=<folder> the test
 * also writes the contact sheets to compare by eye (`CONTACT_SHEET=/tmp/sheet npx vitest run referenceSheet`).
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contactSheet } from '@/test/contactSheet';
import { poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { characterSvg } from '../render/toSvg';
import { applyEdit } from '../studio/edit';
import type { Character, StyleId } from '../schema/types';
import { FULL_BODY_REFERENCE, GESTURE_REFERENCE } from './referencePoses';

const teen = (style: StyleId = 'anime'): Character =>
    applyEdit(fromRecipe(RECIPES[4], 'ref'), {
        body: { age: 16, gender: 0, mangaVariant: 'shonen' },
        top: { kind: 'tshirt', color: '#f8fafc' },
        bottom: { kind: 'jeans', color: '#f8fafc' },
        style,
    });

const render = (c: Character, id: string, yaw: number, shot: 'full' | 'waist') => {
    const pose = poseById(id) ?? poseById('stand')!;
    return characterSvg(
        renderCharacter({ ...c, rig: { pose } }, { yaw, pitch: 0, roll: 0, shot }),
        320,
    );
};

describe('the reference sheets', () => {
    for (const [name, list, shot] of [
        ['full-body', FULL_BODY_REFERENCE, 'full'],
        ['gestures', GESTURE_REFERENCE, 'waist'],
    ] as const)
        it(`${name}: every reference pose renders finite`, () => {
            const c = teen(process.env.CONTACT_STYLE as StyleId | undefined);
            const cells = list.map((r) => ({ svg: render(c, r.id, r.yaw, shot), label: r.id }));
            for (const cell of cells) expect(/NaN|Infinity/.test(cell.svg), cell.label).toBe(false);
            const out = process.env.CONTACT_SHEET;
            if (out)
                writeFileSync(`${out}/${name}.svg`, contactSheet(cells, shot === 'full' ? 6 : 4));
        });
});
