import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createShapeStyleSlice } from '@/store/slices/createShapeStyleSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';
import { DEFAULT_GRADIENT, readFill, readShadow } from '@/lib/fillStyle';

/* eslint-disable @typescript-eslint/no-explicit-any */

function setup() {
    const canvas = createFakeCanvas() as any;
    const saveState = vi.fn();
    const geditor = {
        enable: vi.fn(),
        disable: vi.fn(),
        attach: vi.fn(),
        syncFromObject: vi.fn(),
        activeStop: null,
        detach: vi.fn(),
    };
    const h = createHarness([createShapeStyleSlice as any], { canvas, saveState, geditor });
    const rect = new fabric.Rect({ width: 100, height: 50, fill: '#ff0000' });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    return { h, rect, saveState, geditor };
}

describe('applyGradientFill', () => {
    it('paints the selection with a gradient and records history', () => {
        const { h, rect, saveState } = setup();
        h.get().applyGradientFill({ ...DEFAULT_GRADIENT, angle: 0 });
        const f = readFill(rect);
        expect(f.kind).toBe('linear');
        expect(f.gradient!.angle).toBeCloseTo(0, 0);
        expect(h.get().fillMode).toBe('gradient');
        expect(saveState).toHaveBeenCalledTimes(1);
    });

    it('{ history: false } previews without an undo step (slider / stop drag)', () => {
        const { h, saveState } = setup();
        h.get().applyGradientFill(DEFAULT_GRADIENT, { history: false });
        expect(saveState).not.toHaveBeenCalled();
    });

    it('keeps the on-canvas handles in sync while editing', () => {
        const { h, rect, geditor } = setup();
        h.get().setGradientEditing(true);
        h.get().applyGradientFill(DEFAULT_GRADIENT);
        expect(geditor.syncFromObject).toHaveBeenCalledWith(rect);
    });
});

describe('setShadow', () => {
    it('sets color, opacity, blur and offsets; null removes it', () => {
        const { h, rect, saveState } = setup();
        h.get().setShadow({ color: '#00ff00', opacity: 0.4, blur: 6, offsetX: 1, offsetY: 2 });
        expect(readShadow(rect)).toEqual({
            color: '#00ff00',
            opacity: 0.4,
            blur: 6,
            offsetX: 1,
            offsetY: 2,
        });
        h.get().setShadow(null);
        expect(rect.shadow).toBeNull();
        expect(saveState).toHaveBeenCalledTimes(2);
    });

    it('applyShadowPreset / removeShadow keep working (old footer API)', () => {
        const { h, rect } = setup();
        h.get().applyShadowPreset('soft');
        expect(readShadow(rect)).toMatchObject({ blur: 12, offsetY: 6 });
        h.get().removeShadow();
        expect(rect.shadow).toBeNull();
    });
});

describe('setGradientEditing', () => {
    it('turns the on-canvas gradient handles on and off', () => {
        const { h, geditor } = setup();
        h.get().setGradientEditing(true);
        expect(geditor.enable).toHaveBeenCalled();
        // handles appear right away on the selected shape (no extra click)
        expect(geditor.attach).toHaveBeenCalledWith(h.get().canvas.getActiveObject());
        expect(h.get().gradientEditing).toBe(true);
        h.get().setGradientEditing(false);
        expect(geditor.disable).toHaveBeenCalled();
        expect(h.get().gradientEditing).toBe(false);
    });
});
