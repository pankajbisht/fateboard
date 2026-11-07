import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { readFill, readShadow } from '@/lib/fillStyle';
import { FillShadowPanel } from '../FillShadowPanel';
import { TABS_CONFIG } from '../../config/tabs.config';

/* eslint-disable @typescript-eslint/no-explicit-any */

let canvas: any;
let rect: fabric.Rect;

beforeEach(() => {
    canvas = createFakeCanvas();
    rect = new fabric.Rect({ width: 100, height: 50, fill: '#ff0000' });
    canvas.add(rect);
    act(() => useStore.setState({ canvas, geditor: null, saveState: () => {} } as any));
});

afterEach(() => {
    cleanup();
    act(() => useStore.setState({ canvas: null } as any));
});

const select = () =>
    act(() => {
        canvas.setActiveObject(rect);
        canvas.fire('selection:created', { selected: [rect] });
    });

describe('FillShadowPanel (right dock tab)', () => {
    it('is a right dock tab', () => {
        expect(TABS_CONFIG.some((t) => t.id === 'appearance' && t.label === 'Fill & Shadow')).toBe(
            true,
        );
    });

    it('asks for a selection first', () => {
        render(<FillShadowPanel />);
        expect(screen.getByText('Nothing selected')).toBeTruthy();
    });

    it('shows the current fill type and switches solid -> linear -> radial -> none', () => {
        render(<FillShadowPanel />);
        select();
        expect(screen.getByRole('radio', { name: 'Solid' }).getAttribute('aria-checked')).toBe(
            'true',
        );

        fireEvent.click(screen.getByRole('radio', { name: 'Linear' }));
        expect(readFill(rect).kind).toBe('linear');
        expect(screen.getAllByRole('button', { name: /^Color stop/ })).toHaveLength(2);

        fireEvent.click(screen.getByRole('radio', { name: 'Radial' }));
        expect(readFill(rect).kind).toBe('radial');

        fireEvent.click(screen.getByRole('radio', { name: 'None' }));
        expect(readFill(rect).kind).toBe('none');
    });

    it('edits gradient stops: add, reverse, delete, presets', () => {
        render(<FillShadowPanel />);
        select();
        fireEvent.click(screen.getByRole('radio', { name: 'Linear' }));

        fireEvent.click(screen.getByRole('button', { name: 'Add color stop' }));
        expect(readFill(rect).gradient!.stops).toHaveLength(3);

        const before = readFill(rect).gradient!.stops.map((s) => s.color);
        fireEvent.click(screen.getByRole('button', { name: 'Reverse gradient' }));
        expect(readFill(rect).gradient!.stops.map((s) => s.color)).toEqual([...before].reverse());

        fireEvent.click(screen.getByRole('button', { name: 'Delete color stop' }));
        expect(readFill(rect).gradient!.stops).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: 'Sunset gradient' }));
        expect(readFill(rect).gradient!.stops[0].color).toBe('#ff7f0e');
    });

    it('adds a shadow, applies a preset and removes it', () => {
        render(<FillShadowPanel />);
        select();
        fireEvent.click(screen.getByRole('switch', { name: 'Shadow' }));
        expect(readShadow(rect)).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Glow' }));
        expect(readShadow(rect)).toMatchObject({ color: '#22a7ff', offsetX: 0, offsetY: 0 });

        fireEvent.click(screen.getByRole('switch', { name: 'Shadow' }));
        expect(rect.shadow).toBeNull();
    });
});

describe('object opacity (moved here from the footer)', () => {
    it('shows the selected object opacity and changes it (preview while dragging, one undo step on release)', () => {
        rect.set('opacity', 0.6);
        render(<FillShadowPanel />);
        select();
        const slider = screen.getByRole('slider', { name: 'Opacity' });
        expect((slider as HTMLInputElement).value).toBe('60');

        fireEvent.change(slider, { target: { value: '30' } });
        expect(rect.opacity).toBeCloseTo(0.3); // live preview
        fireEvent.pointerUp(slider);
        expect(rect.opacity).toBeCloseTo(0.3); // committed
    });

    it('the shadow slider is labelled "Shadow opacity" (no two "Opacity" sliders)', () => {
        render(<FillShadowPanel />);
        select();
        fireEvent.click(screen.getByRole('switch', { name: 'Shadow' }));
        expect(screen.getByRole('slider', { name: 'Shadow opacity' })).toBeTruthy();
        expect(screen.getAllByRole('slider', { name: 'Opacity' })).toHaveLength(1);
    });
});

describe('grouped shapes (text shapes, arrows, cards)', () => {
    it('reads and paints the box inside the group, not the group itself', () => {
        const box = new fabric.Rect({ width: 100, height: 50, fill: '#ffffff' });
        const label = new fabric.Textbox('Hi', { fill: '#111111' });
        const group = new fabric.Group([box, label]);
        canvas.add(group);
        render(<FillShadowPanel />);
        act(() => {
            canvas.setActiveObject(group);
            canvas.fire('selection:created', { selected: [group] });
        });

        // shows the box's white fill (the group's own fill is ignored by Fabric)
        expect(screen.getByRole('radio', { name: 'Solid' }).getAttribute('aria-checked')).toBe(
            'true',
        );
        expect(screen.getByRole('button', { name: /Fill color: #ffffff/ })).toBeTruthy();

        fireEvent.click(screen.getByRole('radio', { name: 'Linear' }));
        expect(readFill(box).kind).toBe('linear');
        // the panel follows (gradient editor visible)
        expect(screen.getByRole('button', { name: 'Reverse gradient' })).toBeTruthy();
        expect(readFill(label).kind).toBe('solid'); // text inside keeps its color
    });
});

describe('footer', () => {
    it('no longer carries the gradient / shadow controls (they live in the dock tab)', async () => {
        const src = (await import('../StrokeControls?raw')).default as string;
        expect(src).not.toMatch(/ShadowDropdown|GradientToolIcon|geditor/);
        // opacity moved to the Fill & Shadow tab; the footer "− 100% +" looked like a second zoom
        expect(src).not.toMatch(/OpacityControl/);
    });
});
