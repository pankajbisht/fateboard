/**
 * Perf: dragging an object updates `transform.x/y` on every mouse move. Only the X and Y fields
 * may re-render; the anchor picker, the other fields, layer and flip buttons must not.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

const renders = vi.hoisted(() => ({ origin: 0, fields: {} as Record<string, number> }));

vi.mock('../../molecules/OriginSelector.tsx', async (importOriginal) => {
    const actual: any = await importOriginal();
    const Real = actual.default;
    const Counted = (props: any) => {
        renders.origin++;
        return <Real {...props} />;
    };
    return { ...actual, default: Counted };
});

vi.mock('../../atoms/NumberField.tsx', async (importOriginal) => {
    const actual: any = await importOriginal();
    const Real = actual.NumberField;
    const NumberField = (props: any) => {
        const name = props['aria-label'];
        renders.fields[name] = (renders.fields[name] ?? 0) + 1;
        return <Real {...props} />;
    };
    return { ...actual, NumberField };
});

const { ShapeToolsHeader } = await import('../ShapeToolsHeader');

let prev: any;

beforeEach(() => {
    prev = useStore.getState();
    const canvas = createFakeCanvas() as any;
    const rect = new fabric.Rect({ width: 160, height: 100 });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    act(() =>
        useStore.setState({
            canvas,
            hasSelection: true,
            transform: { ...prev.transform, x: 640, y: 360, width: 160, height: 100, rotation: 0 },
        } as any),
    );
});

afterEach(() => {
    cleanup();
    act(() => useStore.setState({ canvas: prev.canvas, hasSelection: false } as any));
});

describe('ShapeToolsHeader re-renders while dragging', () => {
    it('a move re-renders only X and Y', () => {
        render(<ShapeToolsHeader />);
        renders.origin = 0;
        renders.fields = {};

        for (let i = 1; i <= 5; i++) {
            act(() =>
                useStore.setState((s: any) => ({
                    transform: { ...s.transform, x: 640 + i, y: 360 + i },
                })),
            );
        }

        expect(renders.fields.X).toBe(5);
        expect(renders.fields.Y).toBe(5);
        expect(renders.fields.Width ?? 0).toBe(0);
        expect(renders.fields.Height ?? 0).toBe(0);
        expect(renders.fields.Rotation ?? 0).toBe(0);
        expect(renders.origin).toBe(0);
    });
});
