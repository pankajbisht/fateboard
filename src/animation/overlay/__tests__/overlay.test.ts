/**
 * Timeline overlays (owner request 2026-11-17, from the "Anime Studio" timeline brief): onion skin ghosts
 * before (red) / after (green) the playhead, and the motion path of animated objects. Real Fabric objects;
 * bitmaps are fakes (jsdom has no 2D canvas).
 */
import { describe, expect, it, vi } from 'vitest';
import { ActiveSelection, Rect } from 'fabric';
import type { Track } from '../../engine';
import { createAnimationOverlay } from '../animationOverlay';
import { GHOST_TINT, ghostTimes, renderGhost } from '../ghosts';
import { MAX_PATH_SAMPLES, computeMotionPath, movesPosition } from '../motionPath';
import { captureLook, putBackLook, showSample } from '../objectLook';

/* eslint-disable @typescript-eslint/no-explicit-any -- fake 2D contexts, bitmaps and canvases */
const box = (props: Record<string, unknown> = {}) => {
    const r = new Rect({
        left: 10,
        top: 20,
        width: 20,
        height: 10,
        strokeWidth: 0,
        fill: '#0000ff',
        originX: 'left',
        originY: 'top',
        ...props,
    });
    (r as any).animId = 'a1';
    r.setCoords();
    return r;
};

const slide = (from = 0, to = 300, ms = 1000): Track => ({
    objectId: 'a1',
    label: 'Box',
    rest: { left: 10, top: 20, scaleX: 1, scaleY: 1, angle: 0, skewX: 0, skewY: 0, opacity: 1 },
    keyframes: [
        { id: 'k1', time: 0, props: { left: from }, easing: 'linear' },
        { id: 'k2', time: ms, props: { left: to }, easing: 'linear' },
    ],
});

function fakeCtx() {
    const calls: string[] = [];
    const ctx: any = { calls };
    for (const m of [
        'save',
        'restore',
        'beginPath',
        'moveTo',
        'lineTo',
        'stroke',
        'fill',
        'closePath',
        'fillRect',
        'drawImage',
        'setLineDash',
        'setTransform',
    ])
        ctx[m] = vi.fn(() => calls.push(m));
    ctx.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    return ctx;
}

const fakeBuffer = () => {
    const ctx = fakeCtx();
    return { width: 0, height: 0, getContext: () => ctx, ctx } as any;
};

describe('onion skin: ghost times', () => {
    it('puts `count` ghosts on each side, `step` frames apart, fading with distance', () => {
        const o = { fps: 30, duration: 1000, count: 2, step: 3, opacity: 0.4 };
        expect(ghostTimes(500, o)).toEqual([
            { time: 400, side: 'before', alpha: 0.4 },
            { time: 600, side: 'after', alpha: 0.4 },
            { time: 300, side: 'before', alpha: 0.30000000000000004 },
            { time: 700, side: 'after', alpha: 0.30000000000000004 },
        ]);
    });

    it('never goes before 0 or past the end of the timeline', () => {
        const o = { fps: 30, duration: 1000, count: 2, step: 3, opacity: 0.4 };
        expect(ghostTimes(50, o).map((g) => g.side)).toEqual(['after', 'after']);
        expect(ghostTimes(950, o).map((g) => g.side)).toEqual(['before', 'before']);
    });
});

describe('showing another time leaves no trace', () => {
    it('showSample shows the sampled values; putBackLook restores exactly', () => {
        const r = box();
        const look = captureLook(r);
        showSample(r, slide(), 500);
        expect(r.left).toBe(150);
        putBackLook(r, look);
        expect(r.left).toBe(10);
        expect(r.fill).toBe('#0000ff');
        expect(r.getBoundingRect().left).toBe(10); // coordinates follow
    });
});

describe('onion skin: ghost bitmaps', () => {
    it('renders the objects at the ghost time into a tinted bitmap over their scene box', () => {
        const r = box();
        const seen: number[] = [];
        vi.spyOn(r, 'render').mockImplementation(() => void seen.push(r.left));
        const buf = fakeBuffer();
        const at = { time: 500, side: 'before' as const, alpha: 0.35 };
        const g = renderGhost([{ obj: r, track: slide() }], at, 1000, 2, () => buf)!;

        expect(seen).toEqual([150]); // drawn where it is at 500 ms
        expect(r.left).toBe(10); // and put back
        // box = 150..170 × 20..30, padded by 2 device px (1 scene unit at 2 px per unit)
        expect(g).toMatchObject({ x: 149, y: 19, w: 22, h: 12, alpha: 0.35 });
        expect(buf.width).toBe(44);
        expect(buf.height).toBe(24);
        expect(buf.ctx.fillStyle).toBe(GHOST_TINT.before);
        expect(buf.ctx.calls).toContain('fillRect');
    });

    // reviewer (2026-11-17): a scale that overshoots below 0 makes Fabric flip the object; a failed bitmap
    // must not leave it flipped or at the ghost time
    it('puts the object back even when the bitmap cannot be drawn, flip included', () => {
        const r = box();
        const shrink: Track = {
            ...slide(),
            keyframes: [
                { id: 'k1', time: 0, props: { scaleX: 0.2 }, easing: 'linear' },
                { id: 'k2', time: 1000, props: { scaleX: -0.5 }, easing: 'linear' },
            ],
        };
        const broken = () => ({ width: 0, height: 0, getContext: () => null }) as any;
        const at = { time: 1000, side: 'after' as const, alpha: 0.3 };
        expect(renderGhost([{ obj: r, track: shrink }], at, 0, 1, broken)).toBeNull();
        expect(r.flipX).toBe(false);
        expect(r.scaleX).toBe(1);
    });

    it('applies each ghost time once per object (box and bitmap in one pass)', () => {
        const r = box();
        const set = vi.spyOn(r, 'set');
        vi.spyOn(r, 'render').mockImplementation(() => {});
        renderGhost(
            [{ obj: r, track: slide() }],
            { time: 500, side: 'before', alpha: 0.3 },
            1000,
            1,
            fakeBuffer,
        );
        expect(set).toHaveBeenCalledTimes(2); // show the sample, put it back
    });

    it('skips an object that looks the same at the ghost time', () => {
        const r = box();
        const still = slide(10, 10);
        const g = renderGhost(
            [{ obj: r, track: still }],
            { time: 500, side: 'after', alpha: 0.3 },
            100,
            1,
            fakeBuffer,
        );
        expect(g).toBeNull();
    });
});

describe('motion path', () => {
    it('samples the centre once per frame between the first and last position keyframe', () => {
        const r = box();
        const p = computeMotionPath(r, slide(0, 300), 10)!;
        expect(p.points).toHaveLength(22); // 0..1000 ms at 10 fps = 11 points
        expect(p.points.slice(0, 2)).toEqual([10, 25]); // left 0 + half width, top 20 + half height
        expect(p.points.slice(-2)).toEqual([310, 25]);
        expect(p.keys).toEqual([10, 25, 310, 25]);
        expect(p.frameDots).toBe(true);
        expect(r.left).toBe(10); // geometry put back
    });

    // reviewer (2026-11-17): inside a multi-selection `top` is relative to the selection; a left-only track
    // must still give the scene path (the rest values are absolute)
    it('is in scene coordinates for an object inside a multi-selection', () => {
        const r = box({ left: 100, top: 200 });
        const other = box({ left: 400, top: 600 });
        const sel = new ActiveSelection([r, other]);
        expect(r.group).toBe(sel);
        const t = { ...slide(0, 300), rest: { ...slide().rest, left: 100, top: 200 } };
        const p = computeMotionPath(r, t, 10)!;
        expect(p.points.slice(0, 2)).toEqual([10, 205]);
        expect(p.points.slice(-2)).toEqual([310, 205]);
    });

    it('long paths are sampled sparsely', () => {
        const p = computeMotionPath(box(), slide(0, 300, 600_000), 60)!;
        expect(p.points.length / 2).toBeLessThanOrEqual(MAX_PATH_SAMPLES + 1);
        expect(p.frameDots).toBe(false);
    });

    it('needs two position keyframes', () => {
        const t = slide();
        t.keyframes = [t.keyframes[0], { ...t.keyframes[1], props: { opacity: 0 } }];
        expect(movesPosition(t)).toBe(false);
        expect(computeMotionPath(box(), t, 30)).toBeNull();
    });
});

describe('overlay painter', () => {
    const input = (canvas: any, extra: Record<string, unknown> = {}) => ({
        canvas,
        tracks: { a1: slide() },
        time: 500,
        fps: 30,
        duration: 1000,
        busy: false,
        onionSkin: { on: true, count: 1, step: 3, opacity: 0.35 },
        motionPath: false,
        ...extra,
    });

    it('renders ghosts once per frame and only blits on other renders', () => {
        const r = box();
        vi.spyOn(r, 'render').mockImplementation(() => {});
        const canvas: any = { getObjects: () => [r] };
        const createBuffer = vi.fn(fakeBuffer);
        const overlay = createAnimationOverlay(createBuffer);
        const ctx = fakeCtx();
        const same = input(canvas);

        overlay.paint(ctx, same);
        overlay.paint(ctx, same);
        expect(createBuffer).toHaveBeenCalledTimes(2); // one before, one after; the 2nd paint reused them
        expect(ctx.drawImage).toHaveBeenCalledTimes(4);

        overlay.paint(ctx, { ...same, time: 600 }); // new frame
        expect(createBuffer).toHaveBeenCalledTimes(4);
    });

    it('draws no ghosts while playing or exporting, and paths only when asked', () => {
        const r = box();
        const canvas: any = { getObjects: () => [r] };
        const overlay = createAnimationOverlay(vi.fn(fakeBuffer));
        const ctx = fakeCtx();
        overlay.paint(ctx, input(canvas, { busy: true }));
        expect(ctx.drawImage).not.toHaveBeenCalled();
        expect(ctx.stroke).not.toHaveBeenCalled();

        overlay.paint(ctx, input(canvas, { busy: true, motionPath: true }));
        expect(ctx.stroke).toHaveBeenCalled(); // the path is shown while playing
    });

    it('leaves a text being edited alone (its text and cursor belong to the typing)', () => {
        const r = box();
        (r as any).isEditing = true;
        const render = vi.spyOn(r, 'render').mockImplementation(() => {});
        const createBuffer = vi.fn(fakeBuffer);
        createAnimationOverlay(createBuffer).paint(fakeCtx(), input({ getObjects: () => [r] }));
        expect(render).not.toHaveBeenCalled();
        expect(createBuffer).not.toHaveBeenCalled();
    });

    it('ignores muted tracks and objects that are not on the board', () => {
        const canvas: any = { getObjects: () => [] };
        const overlay = createAnimationOverlay(vi.fn(fakeBuffer));
        const ctx = fakeCtx();
        overlay.paint(ctx, input(canvas, { motionPath: true }));
        const r = box();
        const muted = { a1: { ...slide(), muted: true } };
        overlay.paint(ctx, input({ getObjects: () => [r] }, { tracks: muted, motionPath: true }));
        expect(ctx.calls).toEqual([]);
    });
});
