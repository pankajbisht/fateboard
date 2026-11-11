import { describe, expect, it } from 'vitest';
import { PRESETS, type Tracks } from '@/animation/engine';
import {
    keyCommand,
    presetEnd,
    presetStart,
    rulerTicks,
    seconds,
    snapTargets,
    snapTime,
    timecode,
} from '../animation.logic';
import { EASING_LABELS, PROP_LABELS, describeProp, propField } from '../animation.labels';
import { PRESET_DEMOS } from '../presetDemos';

const key = (k: string, mods: Partial<Parameters<typeof keyCommand>[0]> = {}) =>
    keyCommand({
        key: k,
        code: k === ' ' ? 'Space' : `Key${k.toUpperCase()}`,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        ...mods,
    });

const tracks = (times: Record<string, number[]>): Tracks =>
    Object.fromEntries(
        Object.entries(times).map(([id, ts]) => [
            id,
            {
                objectId: id,
                label: id,
                rest: {} as Tracks[string]['rest'],
                keyframes: ts.map((time, i) => ({
                    id: `${id}-${i}`,
                    time,
                    props: {},
                    easing: 'linear' as const,
                })),
            },
        ]),
    );

describe('time formatting', () => {
    it('timecode is MM:SS:FF and never negative', () => {
        expect(timecode(0, 30)).toBe('00:00:00');
        expect(timecode(1500, 30)).toBe('00:01:15');
        expect(timecode(61_000, 24)).toBe('01:01:00');
        expect(timecode(-50, 30)).toBe('00:00:00');
    });

    it('seconds drops trailing zeros', () => {
        expect(seconds(600)).toBe('0.6 s');
        expect(seconds(2000)).toBe('2 s');
    });

    it('ruler ticks keep labels apart and cover the whole timeline', () => {
        expect(rulerTicks(5000, 90)).toEqual([0, 1, 2, 3, 4, 5]);
        expect(rulerTicks(1000, 400)).toHaveLength(5); // 0.25 s steps
    });
});

describe('timeline snapping', () => {
    const base = { duration: 5000, fps: 30, pps: 100 };

    it('snaps to the nearest frame and stays inside the timeline', () => {
        expect(snapTime(1010, base)).toBe(1000);
        expect(snapTime(-200, base)).toBe(0);
        expect(snapTime(9000, base)).toBe(5000);
    });

    it('a target within 7 px wins over the frame grid', () => {
        expect(snapTime(1040, { ...base, targets: [1017] })).toBe(1017);
        expect(snapTime(1200, { ...base, targets: [1017] })).toBe(1200);
    });

    it('targets are the timeline ends, playhead, work area and the keyframes that stay', () => {
        const st = {
            animDuration: 5000,
            currentTime: 700,
            workIn: 200,
            workOut: 4000,
            tracks: tracks({ a: [100, 900] }),
        };
        expect(snapTargets(st, new Set(['a-1']))).toEqual([0, 5000, 700, 200, 4000, 100]);
    });
});

describe('preset timing', () => {
    const o = { currentTime: 640.4, tracks: tracks({ a: [0, 600], b: [200, 1500] }) };

    it('starts at the playhead, at 0, or after the last keyframe of the selected objects', () => {
        expect(presetStart('playhead', { ...o, objectIds: ['a'] })).toBe(640);
        expect(presetStart('start', { ...o, objectIds: ['a'] })).toBe(0);
        expect(presetStart('after', { ...o, objectIds: ['a'] })).toBe(600);
        expect(presetStart('after', { ...o, objectIds: ['a', 'b'] })).toBe(1500);
        expect(presetStart('after', { ...o, objectIds: ['new'] })).toBe(0);
    });

    it('the end counts repeats only for emphasis presets, and the stagger', () => {
        expect(presetEnd('fadeIn', 100, 600, { repeat: 3, stagger: 0, count: 1 })).toBe(700);
        expect(presetEnd('pulse', 100, 600, { repeat: 3, stagger: 0, count: 1 })).toBe(1900);
        expect(presetEnd('fadeIn', 0, 600, { repeat: 1, stagger: 100, count: 3 })).toBe(800);
    });
});

describe('panel keys', () => {
    it('maps the plain keys', () => {
        expect(key(' ')).toBe('toggle-play');
        expect(key('k')).toBe('keyframe');
        expect(key('L')).toBe('loop');
        expect(key('i')).toBe('work-in');
        expect(key('o')).toBe('work-out');
        expect(key('Backspace')).toBe('delete');
        expect(key('ArrowLeft')).toBe('back');
        expect(key('End')).toBe('end');
        expect(key('x')).toBeNull();
    });

    it('maps the editing chords', () => {
        expect(key('z', { metaKey: true })).toBe('undo');
        expect(key('z', { ctrlKey: true, shiftKey: true })).toBe('redo');
        expect(key('y', { ctrlKey: true })).toBe('redo');
        expect(key('a', { metaKey: true })).toBe('select-all');
        expect(key('c', { metaKey: true })).toBe('copy');
        expect(key('v', { ctrlKey: true })).toBe('paste');
    });

    // BUG-179: ⌘O set the work area and hid the app's Open; ⌘L toggled the loop
    it('leaves plain keys alone when Ctrl / ⌘ / Alt is held', () => {
        for (const k of ['k', 'l', 'i', 'o', ' ', 'Backspace', 'ArrowLeft']) {
            expect(key(k, { metaKey: true }), k).toBeNull();
            expect(key(k, { ctrlKey: true }), k).toBeNull();
            expect(key(k, { altKey: true }), k).toBeNull();
        }
    });
});

describe('labels', () => {
    it('every easing and property has a readable name', () => {
        for (const label of [...Object.values(EASING_LABELS), ...Object.values(PROP_LABELS)])
            expect(label).toMatch(/^[A-Z]/);
        expect(EASING_LABELS.easeInOutQuad).not.toMatch(/easeInOut/);
    });

    it('opacity and scale are edited in percent, positions in the chosen unit', () => {
        const opacity = propField('opacity', 'px');
        expect(opacity.show(0.5)).toBe(50);
        expect(opacity.store(25)).toBe(0.25);
        const left = propField('left', 'in');
        expect(left.show(96)).toBe(1);
        expect(left.store(2)).toBe(192);
        expect(describeProp('opacity', 0.5, 'px')).toBe('Opacity 50 %');
        expect(describeProp('fill', '#ff0000', 'px')).toBe('Fill #ff0000');
    });

    it('every preset has a hover demo', () => {
        for (const p of PRESETS) expect(PRESET_DEMOS[p.id].length, p.id).toBeGreaterThan(1);
    });
});
