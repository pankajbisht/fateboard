/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The right dock palette is the only color picker. These tests pin how a palette pick is routed:
 * panel target (PaintTargetSwatch) > gradient stop > defaults (nothing selected) > selection.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createShapeStyleSlice } from '@/store/slices/createShapeStyleSlice';
import { toOpaqueHex } from '@/store/slices/colorSystemFixes';

// A 2D context that behaves like a browser for the colors used here:
// invalid values are ignored by the fillStyle setter, and getImageData returns the painted pixel.
const PIXELS: Record<string, number[]> = {
    'oklch(63.7% 0.237 25.331)': [251, 44, 54, 255], // tailwind 4 red-500
    'rgba(0,0,0,0)': [0, 0, 0, 0],
};
const isValid = (c: string) => /^#[0-9a-f]{3,8}$/i.test(c) || c in PIXELS;
const hexToPixel = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(255);

function fakeCtx() {
    let style = '#000000';
    let painted = [0, 0, 0, 0];
    return {
        get fillStyle() {
            return style;
        },
        set fillStyle(v: string) {
            if (isValid(v)) style = v;
        },
        clearRect: () => (painted = [0, 0, 0, 0]),
        fillRect: () => (painted = PIXELS[style] ?? hexToPixel(style)),
        getImageData: () => ({ data: painted }),
    };
}

const realGetContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = (() => fakeCtx()) as any;
});
afterAll(() => {
    HTMLCanvasElement.prototype.getContext = realGetContext;
});

const makeShape = () => {
    const o: any = { type: 'rect', fill: '#000000', stroke: '#000000' };
    o.set = (k: any, v?: any) => Object.assign(o, typeof k === 'string' ? { [k]: v } : k);
    return o;
};

function setup(selected: any[] = []) {
    const canvas = createFakeCanvas(selected);
    selected.forEach((o) => canvas.setActiveObject(o));
    if (selected.length > 1) (canvas as any).getActiveObjects = () => selected;
    const extra = {
        canvas,
        geditor: null,
        saveState: vi.fn(),
        setBrushColor: vi.fn(),
        setShadowColor: vi.fn(),
    };
    return createHarness([createShapeStyleSlice as any], extra);
}

describe('toOpaqueHex', () => {
    it('keeps #rrggbb (lowercased) without touching a canvas', () => {
        expect(toOpaqueHex('#FF00AA')).toBe('#ff00aa');
    });
    it('turns tailwind 4 oklch colors into #rrggbb (they used to turn the brush black)', () => {
        expect(toOpaqueHex('oklch(63.7% 0.237 25.331)')).toBe('#fb2c36');
    });
    it('returns null for translucent colors so they are kept as they are', () => {
        expect(toOpaqueHex('rgba(0,0,0,0)')).toBeNull();
    });
});

describe('handleColorChange with a panel paint target', () => {
    let h: ReturnType<typeof setup>;
    beforeEach(() => {
        h = setup([makeShape()]);
    });

    it('sends the color to the target, not to the selection', () => {
        const apply = vi.fn();
        h.get().setPaintTarget({ id: 'brush-fill', label: 'Fill color', apply });
        h.get().handleColorChange('#00FF00');

        expect(apply).toHaveBeenCalledWith('#00ff00');
        expect(h.get().canvas.getActiveObjects()[0].fill).toBe('#000000');
        expect(h.get().fill).toBe('rgba(0, 0, 0, 0)');
        expect(h.get().paintTarget.color).toBe('#00ff00');
    });

    it('converts palette classes (bg-red-500 -> oklch) to hex for the target', () => {
        const apply = vi.fn();
        h.get().setPaintTarget({ id: 'page-background', label: 'Page background', apply });
        h.get().handleColorChange('bg-red-500');
        expect(apply).toHaveBeenCalledWith('#fb2c36');
    });

    it('passes translucent colors through unchanged', () => {
        const apply = vi.fn();
        h.get().setPaintTarget({ id: 'x', label: 'X', apply });
        h.get().handleColorChange('rgba(0,0,0,0)');
        expect(apply).toHaveBeenCalledWith('rgba(0,0,0,0)');
    });

    it('ignores invalid colors', () => {
        const apply = vi.fn();
        h.get().setPaintTarget({ id: 'x', label: 'X', apply });
        h.get().handleColorChange('not-a-color');
        expect(apply).not.toHaveBeenCalled();
    });

    it('works with no canvas (page / settings colors do not need one)', () => {
        const apply = vi.fn();
        h.set({ canvas: null });
        h.get().setPaintTarget({ id: 'x', label: 'X', apply });
        h.get().handleColorChange('#123456');
        expect(apply).toHaveBeenCalledWith('#123456');
    });

    it('choosing Fill / Stroke / Shadow hands the palette back to the selection', () => {
        h.get().setPaintTarget({ id: 'x', label: 'X', apply: vi.fn() });
        h.get().setActivePaint('stroke');
        expect(h.get().paintTarget).toBeNull();
        h.get().handleColorChange('#abcdef');
        expect(h.get().canvas.getActiveObjects()[0].stroke).toBe('#abcdef');
    });
});

describe('handleColorChange without a target', () => {
    it('paints the selection fill with plain hex', () => {
        const shape = makeShape();
        const h = setup([shape]);
        h.get().handleColorChange('bg-red-500');
        expect(shape.fill).toBe('#fb2c36');
        expect(h.get().fill).toBe('#fb2c36');
        expect(h.get().saveState).toHaveBeenCalled();
    });

    it('with nothing selected, fill updates the default fill and the brush color (as hex)', () => {
        const h = setup([]);
        h.get().handleColorChange('bg-red-500');
        expect(h.get().fill).toBe('#fb2c36');
        expect(h.get().setBrushColor).toHaveBeenCalledWith({ color: '#fb2c36' });
    });

    it('with nothing selected, stroke and shadow update only their defaults', () => {
        const h = setup([]);
        h.get().setActivePaint('stroke');
        h.get().handleColorChange('#111111');
        expect(h.get().stroke).toBe('#111111');
        h.get().setActivePaint('shadow');
        h.get().handleColorChange('#222222');
        expect(h.get().setShadowColor).toHaveBeenCalledWith('#222222');
        expect(h.get().setBrushColor).not.toHaveBeenCalled();
    });
});
