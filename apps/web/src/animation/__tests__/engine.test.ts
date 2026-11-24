import { describe, expect, it } from 'vitest';
import {
    EASINGS,
    EASING_NAMES,
    MAX_DURATION,
    MIN_DURATION,
    PRESETS,
    applyTracksAt,
    buildPreset,
    contentEnd,
    cubicBezier,
    easeKeyframe,
    ensureAnimId,
    getAnimId,
    isTextObject,
    labelOf,
    mergeKeyframes,
    readProps,
    restoreObject,
    sampleTrack,
    sortKeyframes,
    usedProps,
    type Keyframe,
    type Track,
} from '../engine';

/* eslint-disable @typescript-eslint/no-explicit-any */

const kf = (
    time: number,
    props: Keyframe['props'],
    easing: Keyframe['easing'] = 'linear',
    id = `k${time}`,
): Keyframe => ({
    id,
    time,
    props,
    easing,
});

/** Plain object that behaves like the parts of a FabricObject the engine touches. */
function fakeObj(props: Record<string, any> = {}) {
    const o: any = {
        type: 'rect',
        left: 0,
        top: 0,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
        opacity: 1,
        width: 100,
        height: 50,
        originX: 'left',
        originY: 'top',
        coords: 0,
        ...props,
        set(key: any, value?: any) {
            if (typeof key === 'string') this[key] = value;
            else Object.assign(this, key);
            return this;
        },
        setCoords() {
            this.coords += 1;
        },
    };
    return o;
}

const canvasWith = (...objs: any[]) => ({ getObjects: () => objs }) as any;

describe('easings', () => {
    it('every named easing maps 0 → 0 and 1 → 1', () => {
        for (const name of EASING_NAMES) {
            const fn = EASINGS[name];
            expect(fn(0)).toBeCloseTo(0, 5);
            expect(fn(1)).toBeCloseTo(1, 5);
        }
    });

    it('hold stays at 0 until the end', () => {
        expect(EASINGS.hold(0.99)).toBe(0);
        expect(EASINGS.hold(1)).toBe(1);
    });

    it('cubicBezier is clamped at the ends and linear for (0,0,1,1)', () => {
        const linear = cubicBezier(0, 0, 1, 1);
        expect(linear(-1)).toBe(0);
        expect(linear(2)).toBe(1);
        expect(linear(0.25)).toBeCloseTo(0.25, 3);
        expect(linear(0.5)).toBeCloseTo(0.5, 3);
    });

    it('cubicBezier ease-in starts slow', () => {
        const easeIn = cubicBezier(0.42, 0, 1, 1);
        expect(easeIn(0.25)).toBeLessThan(0.25);
    });

    it('easeKeyframe prefers a custom bezier over the named easing', () => {
        expect(easeKeyframe({ easing: 'hold' }, 0.5)).toBe(0);
        expect(easeKeyframe({ easing: 'hold', bezier: [0, 0, 1, 1] }, 0.5)).toBeCloseTo(0.5, 3);
    });
});

describe('keyframe helpers', () => {
    it('sortKeyframes returns a new array sorted by time', () => {
        const input = [kf(300, {}), kf(100, {}), kf(200, {})];
        const out = sortKeyframes(input);
        expect(out.map((k) => k.time)).toEqual([100, 200, 300]);
        expect(input[0].time).toBe(300); // not mutated
    });

    it('mergeKeyframes merges same-time keyframes prop by prop and keeps order', () => {
        const existing = [kf(0, { left: 0 }), kf(1000, { left: 100 })];
        const incoming = [
            kf(1000.4, { top: 50 }, 'easeInQuad', 'new1'),
            kf(500, { left: 50 }, 'linear', 'new2'),
        ];
        const out = mergeKeyframes(existing, incoming);
        expect(out.map((k) => k.time)).toEqual([0, 500, 1000]);
        expect(out[2].props).toEqual({ left: 100, top: 50 });
        expect(out[2].easing).toBe('easeInQuad');
        expect(existing[1].props).toEqual({ left: 100 }); // not mutated
    });

    it('contentEnd is the last keyframe time across tracks', () => {
        const tracks: Record<string, Track> = {
            a: {
                objectId: 'a',
                label: 'A',
                rest: readProps(fakeObj()),
                keyframes: [kf(0, {}), kf(1200, {})],
            },
            b: { objectId: 'b', label: 'B', rest: readProps(fakeObj()), keyframes: [kf(3000, {})] },
        };
        expect(contentEnd(tracks)).toBe(3000);
        expect(contentEnd({})).toBe(0);
    });

    it('usedProps lists animated props in canonical order', () => {
        const track: Track = {
            objectId: 'a',
            label: 'A',
            rest: readProps(fakeObj()),
            keyframes: [kf(0, { opacity: 0, left: 0 }), kf(100, { top: 4 })],
        };
        expect(usedProps(track)).toEqual(['left', 'top', 'opacity']);
    });
});

describe('sampleTrack', () => {
    const track: Track = {
        objectId: 'a',
        label: 'A',
        rest: readProps(fakeObj()),
        keyframes: [kf(1000, { left: 0 }, 'linear'), kf(2000, { left: 100 }, 'linear')],
    };

    it('holds the first value before the first keyframe and the last after the end', () => {
        expect(sampleTrack(track, 0).left).toBe(0);
        expect(sampleTrack(track, 5000).left).toBe(100);
    });

    it('interpolates linearly between keyframes', () => {
        expect(sampleTrack(track, 1500).left).toBeCloseTo(50, 5);
        expect(sampleTrack(track, 1250).left).toBeCloseTo(25, 5);
    });

    it('uses the easing of the keyframe that starts the segment', () => {
        const eased: Track = {
            ...track,
            keyframes: [kf(0, { left: 0 }, 'easeInQuad'), kf(1000, { left: 100 })],
        };
        expect(sampleTrack(eased, 500).left).toBeCloseTo(25, 5);
    });

    it('omits props that no keyframe animates', () => {
        expect(sampleTrack(track, 1500)).not.toHaveProperty('top');
    });
});

describe('object helpers', () => {
    it('ensureAnimId assigns once and is stable', () => {
        const o = fakeObj();
        const id = ensureAnimId(o);
        expect(id).toBeTruthy();
        expect(ensureAnimId(o)).toBe(id);
        expect(getAnimId(o)).toBe(id);
    });

    it('labelOf prefers text, then name, then the capitalised type', () => {
        expect(labelOf(fakeObj({ text: '  Hello world, this is long  ' }))).toBe(
            'Hello world, this ',
        );
        expect(labelOf(fakeObj({ name: 'Logo' }))).toBe('Logo');
        expect(labelOf(fakeObj({ type: 'circle' }))).toBe('Circle');
    });

    it('isTextObject detects a string text prop', () => {
        expect(isTextObject(fakeObj({ text: '' }))).toBe(true);
        expect(isTextObject(fakeObj())).toBe(false);
    });

    it('readProps copies transform props and string colours only', () => {
        const p = readProps(fakeObj({ left: 5, fill: '#ff0000', stroke: { gradient: true } }));
        expect(p.left).toBe(5);
        expect(p.fill).toBe('#ff0000');
        expect(p).not.toHaveProperty('stroke');
    });
});

describe('applyTracksAt / restoreObject', () => {
    it('writes sampled values onto the matching object and updates coords', () => {
        const obj = fakeObj();
        const id = ensureAnimId(obj);
        const tracks: Record<string, Track> = {
            [id]: {
                objectId: id,
                label: 'A',
                rest: readProps(obj),
                keyframes: [kf(0, { left: 0 }), kf(1000, { left: 200 })],
            },
        };
        applyTracksAt(canvasWith(obj), tracks, 500);
        expect(obj.left).toBeCloseTo(100, 5);
        expect(obj.coords).toBe(1);
    });

    it('skips setCoords when updateCoords is false (export path)', () => {
        const obj = fakeObj();
        const id = ensureAnimId(obj);
        const tracks = {
            [id]: {
                objectId: id,
                label: 'A',
                rest: readProps(obj),
                keyframes: [kf(0, { left: 10 })],
            },
        };
        applyTracksAt(canvasWith(obj), tracks, 0, false);
        expect(obj.left).toBe(10);
        expect(obj.coords).toBe(0);
    });

    it('a muted track shows the rest state', () => {
        const obj = fakeObj({ left: 7 });
        const id = ensureAnimId(obj);
        const rest = readProps(obj);
        obj.left = 999;
        applyTracksAt(
            canvasWith(obj),
            {
                [id]: {
                    objectId: id,
                    label: 'A',
                    rest,
                    muted: true,
                    keyframes: [kf(0, { left: 50 })],
                },
            },
            0,
        );
        expect(obj.left).toBe(7);
    });

    it('typewriter reveal slices the full text', () => {
        const obj = fakeObj({ text: 'Hello' });
        const id = ensureAnimId(obj);
        const track: Track = {
            objectId: id,
            label: 'Hello',
            rest: readProps(obj),
            fullText: 'Hello',
            keyframes: [kf(0, { reveal: 0 }), kf(1000, { reveal: 1 })],
        };
        applyTracksAt(canvasWith(obj), { [id]: track }, 400);
        expect(obj.text).toBe('He');
        restoreObject(canvasWith(obj), track);
        expect(obj.text).toBe('Hello');
    });

    it('ignores tracks whose object is not on the canvas', () => {
        expect(() =>
            applyTracksAt(
                canvasWith(),
                {
                    ghost: {
                        objectId: 'ghost',
                        label: 'g',
                        rest: readProps(fakeObj()),
                        keyframes: [kf(0, { left: 1 })],
                    },
                },
                0,
            ),
        ).not.toThrow();
    });
});

describe('presets', () => {
    it('every preset id builds sorted keyframes within [start, start + duration]', () => {
        for (const meta of PRESETS) {
            const obj = fakeObj({ text: meta.textOnly ? 'abc' : undefined });
            const kfs = buildPreset(meta.id, obj, readProps(obj), 100, 600);
            expect(kfs.length).toBeGreaterThan(1);
            expect(kfs[0].time).toBe(100);
            expect(kfs[kfs.length - 1].time).toBe(700);
            expect(kfs.map((k) => k.time)).toEqual(
                [...kfs.map((k) => k.time)].sort((a, b) => a - b),
            );
        }
    });

    it('fadeIn goes from 0 to the rest opacity', () => {
        const obj = fakeObj({ opacity: 0.8 });
        const kfs = buildPreset('fadeIn', obj, readProps(obj), 0, 500);
        expect(kfs[0].props.opacity).toBe(0);
        expect(kfs[kfs.length - 1].props.opacity).toBe(0.8);
    });

    it('repeatable presets repeat back-to-back and share boundary keyframes', () => {
        const obj = fakeObj();
        const once = buildPreset('pulse', obj, readProps(obj), 0, 800, 1);
        const twice = buildPreset('pulse', obj, readProps(obj), 0, 800, 2);
        expect(twice[twice.length - 1].time).toBe(1600);
        expect(twice.length).toBe(once.length * 2 - 1);
    });

    it('non-repeatable presets ignore repeat', () => {
        const obj = fakeObj();
        const kfs = buildPreset('fadeIn', obj, readProps(obj), 0, 500, 5);
        expect(kfs[kfs.length - 1].time).toBe(500);
    });

    it('duration limits are sane', () => {
        expect(MIN_DURATION).toBeLessThan(MAX_DURATION);
    });
});
