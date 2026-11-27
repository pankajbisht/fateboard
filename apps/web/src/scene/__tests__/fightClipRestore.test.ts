/**
 * A fight clip is saved as a poster plus its recipe (2026-11-27: one clip put 12k shapes, 16 MB, into every undo
 * step and autosave). After a load (undo, redo, page switch, reload) the drawings come back from the recipe; the
 * drawings of a clip that left the canvas are reused, so an undo does not draw the clip again.
 */
import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { serializeCanvas } from '@/lib/serialization';
import { COMBO_PRESETS } from '../combat/choreo';
import { buildFightClip } from '../combat/clip';
import {
    buildFightClipObject,
    restoreFightClipFrames,
    type FightClipData,
    type FightClipRecipe,
} from '../board';
import { newScene } from '../schema/parse';
import type { Scene } from '../schema/types';

const actor = (id: string, r: number, x: number) => ({
    id,
    character: fromRecipe(RECIPES[r], id),
    x,
    z: 0,
    facing: 0,
    lookAt: null,
});
const scene = (): Scene => ({ ...newScene(), actors: [actor('a', 4, -80), actor('b', 8, 80)] });
const recipe = (): FightClipRecipe => ({
    scene: scene(),
    a: 'a',
    b: 'b',
    combo: COMBO_PRESETS.get('sparring'),
    options: { maxDrawings: 4 },
});

type Clip = fabric.Group & { fightClip: FightClipData };
const drawings = (g: fabric.Group) => {
    const { first, count } = (g as Clip).fightClip;
    return (g.getObjects() as fabric.Group[]).slice(first, first + count);
};
const sizes = (g: fabric.Group) => drawings(g).map((k) => k.getObjects().length);

async function placed() {
    const r = recipe();
    const clip = buildFightClip(r.scene, r.a, r.b, r.combo, r.options)!;
    const group = (await buildFightClipObject(clip, 'Sparring', 0, r))!;
    const canvas = new fabric.StaticCanvas(undefined, { renderOnAddRemove: false });
    canvas.add(group);
    return { canvas, group };
}

/** What an undo does: the page JSON loaded into a canvas, the old objects gone. */
async function reload(from: fabric.StaticCanvas) {
    const json = serializeCanvas(from as never);
    from.clear();
    const to = new fabric.StaticCanvas(undefined, { renderOnAddRemove: false });
    await to.loadFromJSON(json);
    return { canvas: to, group: to.getObjects()[0] as fabric.Group };
}

describe('fight clip: poster + recipe', () => {
    it('a loaded poster gets every drawing back, in place, from the cached drawings', async () => {
        const first = await placed();
        const full = sizes(first.group);
        expect(full.length).toBeGreaterThan(1);
        const before = drawings(first.group);
        const at = before.map((k) => [k.left, k.top, k.visible]);

        const loaded = await reload(first.canvas);
        expect(
            sizes(loaded.group)
                .slice(1)
                .every((n) => n === 0),
        ).toBe(true);
        expect(await restoreFightClipFrames(loaded.group)).toBe(true);
        expect(sizes(loaded.group)).toEqual(full);
        // the old clip left the canvas: its drawings were moved, not drawn again
        expect(drawings(loaded.group).slice(1)).toEqual(before.slice(1));
        drawings(loaded.group).forEach((k, i) => {
            expect(k.left).toBeCloseTo(at[i][0] as number, 2);
            expect(k.top).toBeCloseTo(at[i][1] as number, 2);
        });
        // a full clip is left alone
        expect(await restoreFightClipFrames(loaded.group)).toBe(false);
    }, 60_000);

    it('a copy next to the live clip is drawn fresh (the live clip keeps its drawings)', async () => {
        const first = await placed();
        const json = serializeCanvas(first.canvas as never);
        const other = new fabric.StaticCanvas(undefined, { renderOnAddRemove: false });
        await other.loadFromJSON(json);
        const copy = other.getObjects()[0] as fabric.Group;
        expect(await restoreFightClipFrames(copy)).toBe(true);
        expect(sizes(copy)).toEqual(sizes(first.group));
        expect(drawings(copy)[1]).not.toBe(drawings(first.group)[1]);
    }, 60_000);

    it('a clip without a valid recipe stays as it is', async () => {
        const first = await placed();
        (first.group as Clip).fightClip = { ...(first.group as Clip).fightClip, recipe: undefined };
        expect(await restoreFightClipFrames(first.group)).toBe(false);
    }, 60_000);
});
