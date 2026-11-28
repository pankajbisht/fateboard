// @vitest-environment node
/** Ambient presets for scenery (docs/PROPS.md phase 5): wind sway and drift, looped on the timeline. */
import { describe, expect, it } from 'vitest';
import { PRESETS, buildPreset, readProps } from '../engine';

/** A centred 100 × 200 object (like a placed prop), scaled 2×. */
function prop(props: Record<string, unknown> = {}) {
    const o: Record<string, unknown> = {
        type: 'group',
        left: 300,
        top: 400,
        scaleX: 2,
        scaleY: 2,
        angle: 0,
        skewX: 0,
        skewY: 0,
        opacity: 1,
        width: 100,
        height: 200,
        originX: 'center',
        originY: 'center',
        ...props,
        set(key: string | Record<string, unknown>, value?: unknown) {
            if (typeof key === 'string') o[key] = value;
            else Object.assign(o, key);
            return o;
        },
        setCoords() {},
    };
    return o as never;
}

describe('ambient presets', () => {
    it('are listed as repeatable emphasis presets', () => {
        for (const id of ['windSway', 'drift'] as const) {
            const meta = PRESETS.find((p) => p.id === id)!;
            expect(meta).toMatchObject({ group: 'emphasis', repeatable: true });
        }
    });

    it('wind sway leans the prop with skew while its base stays put', () => {
        const obj = prop();
        const rest = readProps(obj);
        const kfs = buildPreset('windSway', obj, rest, 0, 2400);
        expect(kfs[0].time).toBe(0);
        expect(kfs.at(-1)!.time).toBe(2400);
        const skews = kfs.map((k) => k.props.skewX ?? 0);
        expect(Math.max(...skews)).toBeGreaterThan(2);
        expect(Math.min(...skews)).toBeLessThan(-2);
        // base centre x = left + sx * (h / 2) * tan(skew): unchanged at every keyframe
        for (const k of kfs) {
            const skew = ((k.props.skewX ?? 0) * Math.PI) / 180;
            const baseX = (k.props.left ?? rest.left) + 2 * 100 * Math.tan(skew);
            expect(baseX).toBeCloseTo(300, 5);
        }
        expect(kfs.at(-1)!.props.skewX).toBeCloseTo(0, 5);
    });

    it('drift moves sideways and comes back', () => {
        const obj = prop();
        const kfs = buildPreset('drift', obj, readProps(obj), 0, 6000);
        const xs = kfs.map((k) => k.props.left ?? 300);
        expect(Math.max(...xs)).toBeGreaterThan(330);
        expect(Math.min(...xs)).toBeLessThan(270);
        expect(xs.at(-1)).toBeCloseTo(300, 5);
        expect(kfs.every((k) => k.props.top === undefined)).toBe(true);
    });
});
