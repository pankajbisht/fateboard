/** A scene's wind blows on every actor the same way on the page, whichever way each one faces (2026-11-27). */
import { describe, expect, it } from 'vitest';
import { defaultCharacter } from '@/character/schema/parse';
import { withSceneWind } from '../render/renderActors';
import { newScene, parseSceneSet } from '../schema/parse';

describe('scene wind', () => {
    it('is saved only when it blows, its direction in 0..360', () => {
        expect(parseSceneSet({ wind: 0 })).not.toHaveProperty('wind');
        expect(parseSceneSet({ wind: 0.6, windDir: -90 })).toMatchObject({
            wind: 0.6,
            windDir: 270,
        });
    });

    it("turns into each actor's own frame: one facing the other way feels it from the other side", () => {
        const set = { ...newScene().set, wind: 0.8, windDir: 0 };
        const c = defaultCharacter();
        expect(withSceneWind(c, set, 0).effects).toMatchObject({ wind: 0.8, windDir: 0 });
        expect(withSceneWind(c, set, 180).effects!.windDir).toBeCloseTo(180);
        // facing +x (90): the world's +x wind blows from its back to its front
        expect(withSceneWind(c, set, 90).effects!.windDir).toBeCloseTo(90);
    });

    it("keeps the actor's own stronger wind and its other effects", () => {
        const set = { ...newScene().set, wind: 0.3, windDir: 0 };
        const c = {
            ...defaultCharacter(),
            effects: { wind: 0.9, windDir: 45, updraft: 0, twirl: 0, wet: 0.5 },
        };
        expect(withSceneWind(c, set, 0)).toBe(c);
        const calm = { ...c, effects: { ...c.effects, wind: 0 } };
        expect(withSceneWind(calm, set, 0).effects).toMatchObject({ wind: 0.3, wet: 0.5 });
        expect(withSceneWind(c, newScene().set, 0)).toBe(c);
    });
});
