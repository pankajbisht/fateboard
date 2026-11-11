import { describe, expect, it, vi } from 'vitest';
import { createAnimationSlice } from '../createAnimationSlice';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

function obj(props: Record<string, any> = {}) {
    return {
        type: 'rect',
        left: 0,
        top: 0,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
        opacity: 1,
        width: 10,
        height: 10,
        originX: 'left',
        originY: 'top',
        ...props,
        set(k: any, v?: any) {
            if (typeof k === 'string') (this as any)[k] = v;
            else Object.assign(this, k);
            return this;
        },
        setCoords() {},
    };
}

function setup() {
    const target: any = obj();
    const canvas: any = createFakeCanvas([target]);
    canvas.setActiveObject(target);
    const h = createHarness([createAnimationSlice as never], { canvas });
    return { canvas, target, h };
}

const track = (h: any) => Object.values(h.get().tracks)[0] as any;

describe('createAnimationSlice', () => {
    it('addKeyframe creates a track for the selected object at the playhead', () => {
        const { h, target } = setup();
        h.get().seek(1000);
        h.get().addKeyframe();
        const tr = track(h);
        expect(tr.objectId).toBe(target.animId);
        expect(tr.keyframes.map((k: any) => k.time)).toEqual([1000]);
    });

    it('does nothing without a selection', () => {
        const { h, canvas } = setup();
        canvas.discardActiveObject();
        h.get().addKeyframe();
        expect(Object.keys(h.get().tracks)).toHaveLength(0);
    });

    it('seek applies the animated value to the object', () => {
        const { h, target } = setup();
        h.get().addKeyframe(0);
        target.left = 100;
        h.get().addKeyframe(1000);
        h.get().seek(500);
        expect(target.left).toBeGreaterThan(0);
        expect(target.left).toBeLessThan(100);
        h.get().seek(1000);
        expect(target.left).toBe(100);
    });

    it('seek clamps to [0, duration]', () => {
        const { h } = setup();
        h.get().seek(-50);
        expect(h.get().currentTime).toBe(0);
        h.get().seek(1e9);
        expect(h.get().currentTime).toBe(h.get().animDuration);
    });

    it('applyPreset builds keyframes and grows the duration when needed', () => {
        const { h } = setup();
        const ok = h.get().applyPreset('fadeIn', { start: 4800, duration: 1000 });
        expect(ok).toBe(true);
        expect(track(h).keyframes).toHaveLength(2);
        expect(h.get().animDuration).toBeGreaterThan(5000);
    });

    it('typewriter is refused for non-text objects', () => {
        const { h } = setup();
        expect(h.get().applyPreset('typewriter', { start: 0, duration: 500 })).toBe(false);
    });

    it('its own undo/redo restores track edits', () => {
        const { h } = setup();
        h.get().addKeyframe(0);
        h.get().addKeyframe(500);
        expect(track(h).keyframes).toHaveLength(2);
        h.get().animUndo();
        expect(track(h).keyframes).toHaveLength(1);
        h.get().animRedo();
        expect(track(h).keyframes).toHaveLength(2);
    });

    it('select, nudge and delete keyframes', () => {
        const { h } = setup();
        h.get().addKeyframe(100);
        const tr = track(h);
        const ref = { objectId: tr.objectId, keyframeId: tr.keyframes[0].id };
        h.get().selectKeyframe(ref);
        h.get().nudgeSelected(50);
        expect(track(h).keyframes[0].time).toBe(150);
        h.get().nudgeSelected(-1000); // clamped at 0
        expect(track(h).keyframes[0].time).toBe(0);
        h.get().deleteSelected();
        expect(track(h).keyframes).toHaveLength(0);
        expect(h.get().selectedKeyframes).toHaveLength(0);
    });

    it('copy/paste keyframes at the playhead', () => {
        const { h } = setup();
        h.get().addKeyframe(100);
        const tr = track(h);
        h.get().selectKeyframe({ objectId: tr.objectId, keyframeId: tr.keyframes[0].id });
        h.get().copyKeyframes();
        h.get().seek(2000);
        h.get().pasteKeyframes();
        expect(track(h).keyframes.map((k: any) => k.time)).toEqual([100, 2000]);
    });

    it('setWorkArea clamps in/out and play starts from the work-area start', () => {
        const { h } = setup();
        h.get().setWorkArea(1000, 2000);
        expect(h.get().workIn).toBe(1000);
        expect(h.get().workOut).toBe(2000);
        h.get().play();
        expect(h.get().isPlaying).toBe(true);
        expect(h.get().currentTime).toBe(1000);
        h.get().pause();
        expect(h.get().isPlaying).toBe(false);
    });

    it('clearAllAnimations restores rest state and empties tracks', () => {
        const { h, target } = setup();
        h.get().addKeyframe(0);
        target.left = 300;
        h.get().addKeyframe(1000);
        h.get().seek(1000);
        h.get().clearAllAnimations();
        expect(h.get().tracks).toEqual({});
        expect(target.left).toBe(0);
    });

    it('getAnimationData / loadAnimationData round-trip', () => {
        const { h } = setup();
        h.get().addKeyframe(250);
        const data = h.get().getAnimationData();
        const other = setup();
        other.h.get().loadAnimationData(data);
        expect(Object.keys(other.h.get().tracks)).toEqual(Object.keys(data.tracks));
        expect(other.h.get().past).toHaveLength(0);
    });

    // BUG-180: the track is gone after the undo, so nothing else would bring the object back
    it('undoing a new track puts its object back at rest, redo animates it again', () => {
        const { h, target } = setup();
        h.get().applyPreset('fadeOut', { start: 0, duration: 500 });
        h.get().seek(500);
        expect(target.opacity).toBe(0);
        h.get().animUndo();
        expect(h.get().tracks).toEqual({});
        expect(target.opacity).toBe(1);
        expect(target.__animRest).toBeUndefined();
        h.get().animRedo();
        expect(target.opacity).toBe(0);
    });

    // BUG-176: the preview after adding a preset plays that preset only
    it('previewRange plays one span once and stops at its end, whatever loop / work area say', () => {
        const frames: FrameRequestCallback[] = [];
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
        vi.stubGlobal('cancelAnimationFrame', () => {});
        const now = vi.spyOn(performance, 'now').mockReturnValue(0);
        try {
            const { h } = setup();
            h.get().setLoop(true);
            h.get().setWorkArea(0, 500);
            h.get().previewRange(1000, 1600);
            expect(h.get().isPlaying).toBe(true);
            expect(h.get().currentTime).toBe(1000);
            frames.shift()!(400);
            expect(h.get().currentTime).toBe(1400);
            frames.shift()!(900);
            expect(h.get().currentTime).toBe(1600);
            expect(h.get().isPlaying).toBe(false);
            // normal playback is back on the work area
            h.get().play();
            expect(h.get().currentTime).toBe(0);
            h.get().pause();
        } finally {
            vi.unstubAllGlobals();
            now.mockRestore();
        }
    });
});
