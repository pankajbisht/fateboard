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

const menu = () => screen.getByRole('button', { name: 'Shape operations' });
const pick = (name: string) => {
    fireEvent.click(menu());
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(`^${name}`) }));
};

describe('shape operations menu (top toolbar, next to Group)', () => {
    it('is one menu button, disabled until 2 shapes are selected', () => {
        render(<BooleanOperations />);
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect((menu() as HTMLButtonElement).disabled).toBe(true);
        selectTwo();
        expect((menu() as HTMLButtonElement).disabled).toBe(false);
    });

    it('lists every operation with an icon and a description', () => {
        render(<BooleanOperations />);
        selectTwo();
        fireEvent.click(menu());
        const items = screen.getAllByRole('menuitem');
        expect(items.map((o) => o.querySelector('[data-label]')?.textContent)).toEqual([
            'Union',
            'Subtract',
            'Intersect',
            'Exclude',
            'Divide',
            'Crop',
            'Mask',
        ]);
        items.forEach((o) => expect(o.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1));
        expect(items[0].textContent).toContain('Merge the shapes into one');
    });

    it('runs the operation, closes, and the same operation can be run again', () => {
        render(<BooleanOperations />);
        selectTwo();
        pick('Union');
        expect(screen.queryByRole('menuitem')).toBeNull(); // closed after the pick
        pick('Union');
        expect(unionSelected).toHaveBeenCalledTimes(2);
        pick('Divide');
        pick('Mask');
        expect(divideSelected).toHaveBeenCalledTimes(1);
        expect(clipSelectedObject).toHaveBeenCalledTimes(1);
    });
});
