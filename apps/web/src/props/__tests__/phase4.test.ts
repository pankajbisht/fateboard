import * as fabric from 'fabric';
import { describe, expect, it } from 'vitest';
import { buildPropObject } from '../board';
import { getProp } from '../catalog';
import { propSvg } from '../render/propSvg';
import { PROP_SCENES } from '../scenes';
import { defaultPropData, shadowByDefault } from '../schema/parse';

/** Scene Objects phase 4 (docs/PROPS.md): shadows, time of day, scene presets. */
const lum = (c: unknown) => {
    const [r, g, b] = new fabric.Color(String(c)).getSource();
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

describe('auto shadows', () => {
    it('grounded props get a shadow by default; sky, effects, flat and flying things do not', () => {
        for (const id of ['tree-round', 'car', 'chair', 'street-lamp', 'house-village', 'cat'])
            expect(shadowByDefault(getProp(id)!), id).toBe(true);
        for (const id of [
            'cloud-puffy',
            'sweat-drop',
            'sky-day',
            'airplane',
            'river',
            'crosswalk',
            'blackboard',
        ])
            expect(shadowByDefault(getProp(id)!), id).toBe(false);
    });

    it('the shadow is a soft ellipse under the prop, drawn first and inside its box', () => {
        const def = getProp('rock')!;
        const svg = propSvg(def, { ...defaultPropData(def), shadow: true });
        expect(svg).toMatch(/<svg[^>]*><ellipse [^>]*opacity="0\.2"/);
        expect(propSvg(def, defaultPropData(def))).not.toContain('opacity="0.2"');
    });
});

describe('time of day', () => {
    it('night darkens and cools the colours, sunset warms them', async () => {
        const fillOf = async (light: 'day' | 'sunset' | 'night') =>
            (await buildPropObject({ propId: 'sun', light }))!
                .getObjects()
                .find((o) => o.type === 'circle')!.fill;
        const day = await fillOf('day');
        const night = await fillOf('night');
        const sunset = await fillOf('sunset');
        expect(lum(night)).toBeLessThan(lum(day) - 0.2);
        expect(sunset).not.toBe(day);
        const [r, , b] = new fabric.Color(String(night)).getSource();
        expect(b).toBeGreaterThan(r * 0.5); // bluish
    });
});

describe('scene presets', () => {
    it('Classroom, Rooftop, Forest and Street', () => {
        expect(PROP_SCENES.map((s) => s.label)).toEqual([
            'Classroom',
            'Rooftop',
            'Forest',
            'Street',
        ]);
    });

    it.each(PROP_SCENES.map((s) => [s.id, s] as const))(
        '%s uses real props on three depth planes',
        (_, scene) => {
            for (const item of scene.items) {
                expect(getProp(item.propId), item.propId).toBeDefined();
                expect(item.x).toBeGreaterThanOrEqual(0);
                expect(item.x).toBeLessThanOrEqual(1);
            }
            expect(new Set(scene.items.map((i) => i.plane))).toEqual(
                new Set(['background', 'midground', 'foreground']),
            );
            expect(scene.items.filter((i) => i.plane === 'background').some((i) => i.cover)).toBe(
                true,
            );
        },
    );
});
