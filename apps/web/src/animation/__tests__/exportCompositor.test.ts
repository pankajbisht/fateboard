/**
 * fate-reviewer (2026-11-17), P1: a "transparent background" GIF came out opaque, because Fabric paints the
 * board's background colour / image into every `toCanvasElement` frame (`_renderBackground`). The pixels
 * are checked in e2e/gif-export.spec.ts (jsdom's canvas is a stub here, setupTests).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- a fake Fabric canvas */
import { describe, expect, it, vi } from 'vitest';
import { makeCompositor } from '../exportVideo';

function fakeBoard() {
    const image = { type: 'image' };
    const seen: unknown[][] = [];
    const frames: { width: number; height: number }[] = [];
    const board: any = {
        backgroundColor: '#ffffff',
        backgroundImage: image,
        getWidth: () => 40,
        getHeight: () => 20,
        toCanvasElement: vi.fn(() => {
            seen.push([board.backgroundColor, board.backgroundImage]);
            const frame = { width: 40, height: 20 };
            frames.push(frame);
            return frame;
        }),
    };
    return { board, image, seen, frames };
}

describe('export compositor', () => {
    it('transparent: the board background is left out of the frame, then put back', () => {
        const { board, image, seen } = fakeBoard();
        makeCompositor(board, 40, 20, null).draw();
        expect(seen).toEqual([['', undefined]]);
        expect(board.backgroundColor).toBe('#ffffff');
        expect(board.backgroundImage).toBe(image);
    });

    it('put back even when the render fails', () => {
        const { board, image } = fakeBoard();
        board.toCanvasElement = () => {
            throw new Error('render failed');
        };
        expect(() => makeCompositor(board, 40, 20, null).draw()).toThrow('render failed');
        expect(board.backgroundColor).toBe('#ffffff');
        expect(board.backgroundImage).toBe(image);
    });

    it('with a background colour the board keeps its own background', () => {
        const { board, image, seen } = fakeBoard();
        makeCompositor(board, 40, 20, '#000000').draw();
        expect(seen).toEqual([['#ffffff', image]]);
    });

    // Memory (2026-11-27): every frame was a new full-size bitmap that was never freed. Canvas bitmaps are
    // native memory the garbage collector does not weigh, so a long or large export grew to several GB.
    it('frees each frame bitmap once it is composited', () => {
        const { board, frames } = fakeBoard();
        const c = makeCompositor(board, 40, 20, '#000000');
        c.draw();
        c.draw();
        expect(frames).toHaveLength(2);
        expect(frames.every((f) => f.width === 0 && f.height === 0)).toBe(true);
    });

    it('release frees the output canvas', () => {
        const { board } = fakeBoard();
        const c = makeCompositor(board, 40, 20, null);
        c.release();
        expect([c.out.width, c.out.height]).toEqual([0, 0]);
    });
});
