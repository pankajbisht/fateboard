import { describe, expect, it } from 'vitest';
import {
    DEFAULT_PENCIL_STYLE,
    PENCIL_MODES,
    pencilState,
    sanitizePencilStyle,
} from '../pencilStyle';

const stateFor = (mode: string) =>
    pencilState({
        activeTool: 'pencil',
        brush: 'marker',
        color: '#ff0000',
        pencilStyle: { ...DEFAULT_PENCIL_STYLE, width: 4, mode },
    } as Record<string, unknown>) as Record<string, unknown>;

describe('Pencil modes', () => {
    it('offers Pencil, Highlighter, Dashed, Smart shape, Eraser and Laser', () => {
        expect(PENCIL_MODES.map((m) => m.value)).toEqual([
            'pencil',
            'highlighter',
            'dashed',
            'shape',
            'eraser',
            'laser',
        ]);
    });

    it('keeps a valid mode, ignores junk; Laser is a tool, not a stored mode', () => {
        expect(DEFAULT_PENCIL_STYLE.mode).toBe('pencil');
        expect(sanitizePencilStyle(DEFAULT_PENCIL_STYLE, { mode: 'highlighter' }).mode).toBe(
            'highlighter',
        );
        expect(sanitizePencilStyle(DEFAULT_PENCIL_STYLE, { mode: 'laser' }).mode).toBe('pencil');
        expect(sanitizePencilStyle(DEFAULT_PENCIL_STYLE, { mode: 42 }).mode).toBe('pencil');
    });

    it('Pencil draws a solid line in the drawing color', () => {
        expect(stateFor('pencil')).toMatchObject({ brush: 'pencil', width: 4, lineStyle: 'solid' });
    });

    it('Highlighter: wide, see-through, multiply blend, never auto-closed', () => {
        const s = stateFor('highlighter');
        expect(s).toMatchObject({ brush: 'pencil', blend: 'multiply', autoClose: false });
        expect(s.width).toBeGreaterThanOrEqual(16);
        expect(s.brushOpacity).toBeLessThanOrEqual(0.5);
    });

    it('Dashed: a dashed line', () => {
        expect(stateFor('dashed')).toMatchObject({ brush: 'pencil', lineStyle: 'dashed' });
    });

    it('Smart shape: a plain pencil line, closed by the recognizer instead of auto-close', () => {
        expect(stateFor('shape')).toMatchObject({ brush: 'pencil', autoClose: false });
    });

    it('Eraser: the whole-stroke eraser, a little wider than the line', () => {
        const s = stateFor('eraser');
        expect(s).toMatchObject({ brush: 'eraser', eraserMode: 'stroke' });
        expect(s.width).toBeGreaterThan(4);
    });

    it('stylus pressure applies only to the plain Pencil', () => {
        const pressed = (mode: string) =>
            (
                pencilState({
                    activeTool: 'pencil',
                    pencilStyle: { ...DEFAULT_PENCIL_STYLE, pressure: true, mode },
                } as Record<string, unknown>) as Record<string, unknown>
            ).brush;
        expect(pressed('pencil')).toBe('ink');
        expect(pressed('dashed')).toBe('pencil');
    });
});
