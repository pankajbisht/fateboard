import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { BooleanOperations } from '../BooleanOperationsDropdown';

/* eslint-disable @typescript-eslint/no-explicit-any */

const unionSelected = vi.fn();
const divideSelected = vi.fn();
const clipSelectedObject = vi.fn();
let canvas: any;
let prev: any;

beforeEach(() => {
    prev = useStore.getState();
    canvas = createFakeCanvas();
    [unionSelected, divideSelected, clipSelectedObject].forEach((f) => f.mockReset());
    act(() =>
        useStore.setState({ canvas, unionSelected, divideSelected, clipSelectedObject } as any),
    );
});
afterEach(() => {
    cleanup();
    act(() =>
        useStore.setState({
            canvas: prev.canvas,
            unionSelected: prev.unionSelected,
            divideSelected: prev.divideSelected,
            clipSelectedObject: prev.clipSelectedObject,
        } as any),
    );
});

const selectTwo = () => {
    const a = new fabric.Rect({ width: 10, height: 10 });
    const b = new fabric.Rect({ width: 10, height: 10, left: 5 });
    canvas.add(a, b);
    act(() => {
        canvas.setActiveObject(new fabric.ActiveSelection([a, b]));
        canvas.fire('selection:created', { selected: [a, b] });
    });
};

const menu = () => screen.getByRole('combobox', { name: 'Shape operations' });
const pick = (name: string) => {
    fireEvent.click(menu());
    fireEvent.click(screen.getByRole('option', { name: new RegExp(`^${name}`) }));
};

describe('footer shape operations (one compact dropdown)', () => {
    it('is a single dropdown (no separate icon buttons), disabled until 2 shapes are selected', () => {
        render(<BooleanOperations />);
        expect(screen.queryAllByRole('button')).toHaveLength(0);
        expect(
            menu().getAttribute('aria-disabled') === 'true' ||
                (menu() as HTMLButtonElement).disabled,
        ).toBe(true);
        selectTwo();
        expect((menu() as HTMLButtonElement).disabled).toBe(false);
    });

    it('lists every operation with an icon', () => {
        render(<BooleanOperations />);
        selectTwo();
        fireEvent.click(menu());
        const items = screen.getAllByRole('option');
        expect(items.map((o) => o.querySelector('[data-label]')?.textContent)).toEqual([
            'Union',
            'Subtract',
            'Intersect',
            'Exclude',
            'Divide',
            'Crop',
            'Mask',
        ]);
        items.forEach((o) => expect(o.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2)); // check + op icon
    });

    it('any operation can be used again (an action menu never keeps a value)', () => {
        render(<BooleanOperations />);
        selectTwo();
        pick('Union');
        pick('Union');
        expect(unionSelected).toHaveBeenCalledTimes(2);
        pick('Divide');
        pick('Mask');
        expect(divideSelected).toHaveBeenCalledTimes(1);
        expect(clipSelectedObject).toHaveBeenCalledTimes(1);
        expect(menu().textContent).toContain('Shape ops'); // back to the placeholder
    });
});
