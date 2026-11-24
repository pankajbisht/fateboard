/**
 * The bottom timeline dock (owner request 2026-11-17: "move animation to the bottom, like other animation
 * tools"): open / height / onion skin / motion path are per-browser view preferences, and the overlay only
 * paints while the timeline is open.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uiPrefsStorage } from '@/lib/storage';
import { createHarness } from '@/test/sliceHarness';
import {
    ONION_DEFAULTS,
    TIMELINE_DEFAULT_HEIGHT,
    TIMELINE_MAX_HEIGHT,
    TIMELINE_MIN_HEIGHT,
    createTimelineSlice,
    sanitizeTimelinePrefs,
    type TimelineSlice,
} from '../createTimelineSlice';

/* eslint-disable @typescript-eslint/no-explicit-any -- the harness and fake canvas / context are untyped */
const make = (extra: Record<string, any> = {}) =>
    createHarness<TimelineSlice & Record<string, any>>([createTimelineSlice as any], extra);

beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
});
afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
});

describe('timeline dock state', () => {
    it('starts closed at the default height with overlays off', () => {
        const h = make();
        expect(h.get().timelineOpen).toBe(false);
        expect(h.get().timelineHeight).toBe(TIMELINE_DEFAULT_HEIGHT);
        expect(h.get().onionSkin).toEqual(ONION_DEFAULTS);
        expect(h.get().motionPath).toBe(false);
    });

    it('opens, closes and toggles', () => {
        const h = make();
        h.get().setTimelineOpen(true);
        expect(h.get().timelineOpen).toBe(true);
        h.get().toggleTimeline();
        expect(h.get().timelineOpen).toBe(false);
        h.get().toggleTimeline();
        expect(h.get().timelineOpen).toBe(true);
    });

    it('keeps the height inside its limits and rounds it', () => {
        const h = make();
        h.get().setTimelineHeight(20);
        expect(h.get().timelineHeight).toBe(TIMELINE_MIN_HEIGHT);
        h.get().setTimelineHeight(99999);
        expect(h.get().timelineHeight).toBe(TIMELINE_MAX_HEIGHT);
        h.get().setTimelineHeight(321.6);
        expect(h.get().timelineHeight).toBe(322);
        h.get().setTimelineHeight(Number.NaN);
        expect(h.get().timelineHeight).toBe(322);
    });

    it('onion skin settings are merged and clamped', () => {
        const h = make();
        h.get().setOnionSkin({ on: true, count: 9, opacity: 2 });
        expect(h.get().onionSkin).toEqual({ ...ONION_DEFAULTS, on: true, count: 3, opacity: 0.8 });
        h.get().setOnionSkin({ step: 0 });
        expect(h.get().onionSkin.step).toBe(1);
    });

    it('is remembered for this browser (one write after the change settles)', () => {
        const h = make();
        const save = vi.spyOn(uiPrefsStorage, 'save');
        h.get().setTimelineOpen(true);
        for (let px = 200; px < 400; px += 10) h.get().setTimelineHeight(px); // a drag
        h.get().setMotionPath(true);
        expect(save).not.toHaveBeenCalled();
        vi.runAllTimers();
        expect(save).toHaveBeenCalledTimes(1);
        const saved = uiPrefsStorage.load('timeline') as Record<string, unknown>;
        expect(saved).toMatchObject({ open: true, height: 390, motionPath: true });

        // a new store (reload) starts from what was saved
        const next = make();
        expect(next.get().timelineOpen).toBe(true);
        expect(next.get().timelineHeight).toBe(390);
        expect(next.get().motionPath).toBe(true);
    });

    it('ignores broken saved preferences', () => {
        uiPrefsStorage.save('timeline', 'garbage');
        expect(make().get().timelineOpen).toBe(false);
        expect(
            sanitizeTimelinePrefs({ open: 'yes', height: 'tall', onionSkin: { count: -4 } }),
        ).toEqual({
            open: false,
            height: TIMELINE_DEFAULT_HEIGHT,
            onionSkin: { ...ONION_DEFAULTS, count: 1 },
            motionPath: false,
        });
    });

    it('redraws the board when an overlay setting changes', () => {
        const requestRenderAll = vi.fn();
        const h = make({ canvas: { requestRenderAll } });
        h.get().setTimelineOpen(true);
        requestRenderAll.mockClear();
        h.get().setOnionSkin({ on: true });
        h.get().setMotionPath(true);
        expect(requestRenderAll).toHaveBeenCalledTimes(2);
    });
});

describe('animation overlay painting', () => {
    const ctx = () =>
        ({
            canvas: {},
            getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            closePath: vi.fn(),
            fillRect: vi.fn(),
            drawImage: vi.fn(),
            setLineDash: vi.fn(),
        }) as any;

    it('paints nothing while the timeline is closed', () => {
        const getObjects = vi.fn(() => []);
        const h = make({ canvas: { getObjects, requestRenderAll: vi.fn() }, tracks: {} });
        h.get().setMotionPath(true);
        h.get().setTimelineOpen(false);
        const c = ctx();
        h.get().paintAnimationOverlay(c);
        expect(getObjects).not.toHaveBeenCalled();
        expect(c.save).not.toHaveBeenCalled();
    });
});
