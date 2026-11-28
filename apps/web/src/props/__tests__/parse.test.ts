// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getProp } from '../catalog';
import { defaultPropData, parsePropData } from '../schema/parse';

describe('prop data (saved on the page object)', () => {
    it('defaults come from the catalogue', () => {
        const d = defaultPropData(getProp('sun')!);
        expect(d).toEqual({
            v: 1,
            propId: 'sun',
            variant: 0,
            colors: {},
            outline: '#141414',
            outlineWidth: 3,
            tone: { kind: 'none', density: 0.5 },
            light: 'day',
            shadow: false,
        });
    });

    it('keeps time of day and shadow, dropping bad values', () => {
        expect(parsePropData({ propId: 'rock', light: 'night', shadow: true })).toMatchObject({
            light: 'night',
            shadow: true,
        });
        expect(parsePropData({ propId: 'rock', light: 'noon', shadow: 'yes' })).toMatchObject({
            light: 'day',
            shadow: false,
        });
    });

    it('keeps a screentone setting, and drops a bad one', () => {
        expect(
            parsePropData({ propId: 'rock', tone: { kind: 'lines', density: 0.8 } })!.tone,
        ).toEqual({
            kind: 'lines',
            density: 0.8,
        });
        expect(parsePropData({ propId: 'rock', tone: { kind: 'zig', density: 9 } })!.tone).toEqual({
            kind: 'none',
            density: 0.5,
        });
        expect(
            parsePropData({ propId: 'rock', tone: { kind: 'dots', density: 9 } })!.tone.density,
        ).toBe(0.9);
    });

    it('reads saved data back, dropping what it does not know', () => {
        expect(
            parsePropData({
                v: 1,
                propId: 'rock',
                variant: 0,
                colors: { stone: '#AABBCC', nope: 5, bad: 'red' },
                outline: '#000000',
                outlineWidth: 4,
                extra: true,
            }),
        ).toEqual({
            v: 1,
            propId: 'rock',
            variant: 0,
            colors: { stone: '#aabbcc' },
            outline: '#000000',
            outlineWidth: 4,
            tone: { kind: 'none', density: 0.5 },
            light: 'day',
            shadow: false,
        });
    });

    it('clamps numbers and falls back on bad values', () => {
        const d = parsePropData({ propId: 'rock', variant: 99, outlineWidth: 500, outline: 'x' })!;
        expect(d.variant).toBe(0);
        expect(d.outlineWidth).toBe(20);
        expect(d.outline).toBe('#141414');
    });

    it('is null for anything that is not a prop', () => {
        expect(parsePropData(null)).toBeNull();
        expect(parsePropData('tree')).toBeNull();
        expect(parsePropData({ propId: 'no-such-prop' })).toBeNull();
    });
});
