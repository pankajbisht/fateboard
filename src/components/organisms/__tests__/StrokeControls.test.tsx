/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { StrokeControls } from '../StrokeControls';

let canvas: any;
let prev: any;

beforeEach(() => {
    prev = useStore.getState();
    canvas = createFakeCanvas();
    act(() => useStore.setState({ canvas, hasActiveShape: true } as never));
});
afterEach(() => {
    cleanup();
    act(() =>
        useStore.setState({ canvas: prev.canvas, hasActiveShape: prev.hasActiveShape } as never),
    );
});

const follows = (a: Element, b: Element) =>
    !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('footer Fill / Stroke rows', () => {
    it('each row: label, then its add / remove toggle, then the color tile', () => {
        render(<StrokeControls />);
        const fillLabel = screen.getByText('Fill');
        const strokeLabel = screen.getByText('Stroke');
        const fillToggle = document.querySelector('[data-paint="fill"]')!;
        const strokeToggle = document.querySelector('[data-paint="stroke"]')!;
        expect(fillToggle).toBeTruthy();
        expect(strokeToggle).toBeTruthy();
        // same row as its label, right after it
        expect(fillLabel.parentElement).toBe(fillToggle.closest('[data-tile-row]'));
        expect(strokeLabel.parentElement).toBe(strokeToggle.closest('[data-tile-row]'));
        expect(follows(fillLabel, fillToggle)).toBe(true);
        expect(follows(fillToggle, strokeLabel)).toBe(true);
        // compact: fits the 16 px footer row
        expect(fillToggle.className).toMatch(/\bsize-4\b/);
    });

    it('the footer toggles work on the selection', () => {
        render(<StrokeControls />);
        const rect = new fabric.Rect({ fill: '#fff', stroke: '#000', strokeWidth: 2 });
        act(() => {
            canvas.add(rect);
            canvas.setActiveObject(rect);
            canvas.fire('selection:created', { selected: [rect] });
        });
        const strokeToggle = document.querySelector('[data-paint="stroke"]') as HTMLButtonElement;
        expect(strokeToggle.getAttribute('aria-label')).toBe('Remove stroke');
        fireEvent.click(strokeToggle);
        expect(rect.strokeWidth).toBe(0);
        expect(strokeToggle.getAttribute('aria-label')).toBe('Add stroke');
    });
});
