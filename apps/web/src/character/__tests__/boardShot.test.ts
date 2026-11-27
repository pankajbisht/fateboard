/**
 * A close-up or bust goes on the page as that shot (2026-11-27): the group was fitted to its shapes, so the whole
 * figure came along whatever the shot. Now it is a frame-sized group with a clip of the frame (like a scene).
 */
import * as fabric from 'fabric';
import { describe, expect, it } from 'vitest';
import { buildCharacterObject, PX_PER_CM, swapCharacterDrawing } from '../board';
import { renderCharacter } from '../render/renderCharacter';
import { DEFAULT_CAMERA, defaultCharacter } from '../schema/parse';
import type { ShotId } from '../schema/types';

const character = defaultCharacter('Shot test');
const cam = (shot: ShotId) => ({ ...DEFAULT_CAMERA, shot });

describe('character shots on the page', () => {
    it.each(['closeup', 'bust', 'full'] as ShotId[])(
        'a %s is the size of its frame and clipped to it',
        async (shot) => {
            const g = (await buildCharacterObject({ character, camera: cam(shot) }))!;
            const vb = renderCharacter(character, cam(shot)).viewBox;
            const h = Math.round(vb[3] * PX_PER_CM);
            expect(g.height).toBeCloseTo(h, 0);
            expect(g.width).toBeCloseTo((h * vb[2]) / vb[3], 0);
            expect(g.clipPath).toBeInstanceOf(fabric.Rect);
            expect(g.clipPath!.width).toBeCloseTo(g.width, 0);
        },
    );

    it('a close-up is much shorter than the full figure (the body is not on the page)', async () => {
        const full = (await buildCharacterObject({ character, camera: cam('full') }))!;
        const close = (await buildCharacterObject({ character, camera: cam('closeup') }))!;
        expect(close.height).toBeLessThan(full.height * 0.4);
    });

    it('Update on page with a new shot takes the new frame', async () => {
        const target = (await buildCharacterObject({ character, camera: cam('full') }))!;
        const data = { character, camera: cam('bust') };
        const fresh = (await buildCharacterObject(data))!;
        const want = { w: fresh.width, h: fresh.height };
        swapCharacterDrawing(target, fresh, data);
        expect(target.width).toBeCloseTo(want.w, 0);
        expect(target.height).toBeCloseTo(want.h, 0);
        expect(target.clipPath!.height).toBeCloseTo(want.h, 0);
    });
});
