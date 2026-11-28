import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ColorPickerPopover } from '../ColorPickerPopover';

/** Flicker fixes: the popover must hold still and ignore its own late echoes while a drag runs. */
let RO: typeof ResizeObserver;
afterEach(() => {
    cleanup();
    if (RO) window.ResizeObserver = RO;
});

function withResizeObserver() {
    let fire = () => {};
    RO = window.ResizeObserver;
    window.ResizeObserver = class {
        constructor(cb: () => void) {
            fire = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
    return () => act(() => fire());
}

function anchorAt(top: number) {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    anchor.getBoundingClientRect = () =>
        ({ top, left: 900, right: 930, bottom: top + 30 }) as DOMRect;
    return anchor;
}

describe('ColorPickerPopover while dragging', () => {
    it('does not move while a pointer is down; fits the window again on release', () => {
        const resize = withResizeObserver();
        const anchor = anchorAt(500);
        render(
            <ColorPickerPopover
                anchor={anchor}
                color="#ff0000"
                onChange={() => {}}
                onClose={() => {}}
            />,
        );
        const dialog = screen.getByRole('dialog', { name: 'Custom color' });
        const before = dialog.style.top;

        fireEvent.pointerDown(screen.getByRole('slider', { name: 'Saturation and brightness' }));
        Object.defineProperty(dialog, 'offsetHeight', { value: 600, configurable: true });
        resize();
        expect(dialog.style.top).toBe(before);

        fireEvent.pointerUp(document);
        expect(dialog.style.top).toBe(`${window.innerHeight - 600 - 8}px`);
        anchor.remove();
    });

    it('keeps its place when it gets shorter (no jump under the pointer)', () => {
        const resize = withResizeObserver();
        const anchor = anchorAt(100);
        render(
            <ColorPickerPopover
                anchor={anchor}
                color="#ff0000"
                onChange={() => {}}
                onClose={() => {}}
            />,
        );
        const dialog = screen.getByRole('dialog', { name: 'Custom color' });
        Object.defineProperty(dialog, 'offsetHeight', { value: 300, configurable: true });
        resize();
        const top = dialog.style.top;
        Object.defineProperty(dialog, 'offsetHeight', { value: 120, configurable: true });
        resize();
        expect(dialog.style.top).toBe(top);
        anchor.remove();
    });

    it('ignores a late echo of an earlier drag step (the thumb does not snap back)', () => {
        const sent: string[] = [];
        const { rerender } = render(
            <ColorPickerPopover
                anchor={null}
                color="#ff0000"
                onChange={(h) => sent.push(h)}
                onClose={() => {}}
            />,
        );
        const sv = screen.getByRole('slider', { name: 'Saturation and brightness' });
        fireEvent.pointerDown(screen.getByRole('dialog', { name: 'Custom color' })); // drag running
        fireEvent.keyDown(sv, { key: 'ArrowDown', shiftKey: true });
        fireEvent.keyDown(sv, { key: 'ArrowDown', shiftKey: true });
        expect(sent).toEqual(['#e60000', '#cc0000']);
        // the store reports the first step after the second was sent
        rerender(
            <ColorPickerPopover
                anchor={null}
                color={sent[0]}
                onChange={(h) => sent.push(h)}
                onClose={() => {}}
            />,
        );
        expect(sv.getAttribute('aria-valuetext')).toContain('brightness 80%');
        fireEvent.pointerUp(document);
    });
});
