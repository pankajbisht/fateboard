import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { OverflowToolbar } from '../OverflowToolbar';

let roCallbacks: (() => void)[] = [];
globalThis.ResizeObserver = class {
    cb: () => void;
    constructor(cb: () => void) {
        this.cb = cb;
        roCallbacks.push(cb);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

let rowWidth = 1000;
const mounts: Record<string, number> = {};

function Bar({ id }: { id: string }) {
    useEffect(() => {
        mounts[id] = (mounts[id] ?? 0) + 1;
        return () => {
            mounts[id] -= 1;
        };
    }, [id]);
    return <button>{id}</button>;
}

const ITEMS = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, node: <Bar id={id} /> }));

beforeEach(() => {
    roCallbacks = [];
    for (const k of Object.keys(mounts)) delete mounts[k];
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement,
    ) {
        const w = this.hasAttribute('data-toolbar-item')
            ? 100
            : this.hasAttribute('data-toolbar-more')
              ? 40
              : 0;
        return {
            width: w,
            height: 30,
            top: 0,
            left: 0,
            right: w,
            bottom: 30,
            x: 0,
            y: 0,
            toJSON() {},
        } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
        this: HTMLElement,
    ) {
        return this.hasAttribute('data-toolbar-row') ? rowWidth : 0;
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const inRow = () =>
    [...document.querySelectorAll('[data-toolbar-row] > [data-toolbar-item]')].map(
        (el) => el.textContent,
    );

describe('OverflowToolbar', () => {
    it('shows every tool when they fit', () => {
        rowWidth = 1000;
        render(<OverflowToolbar items={ITEMS} />);
        expect(inRow()).toEqual(['a', 'b', 'c', 'd', 'e']);
        expect(screen.queryByRole('button', { name: 'More tools' })).toBeNull();
    });

    it('moves tools that do not fit into a "More tools" menu, keeping each mounted once', () => {
        rowWidth = 350; // 3 × 100 + 40 (More) fits, 4 × 100 does not
        render(<OverflowToolbar items={ITEMS} />);
        expect(inRow()).toEqual(['a', 'b', 'c']);

        const more = screen.getByRole('button', { name: 'More tools' });
        expect(more.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(more);
        expect(more.getAttribute('aria-expanded')).toBe('true');
        const menu = screen.getByRole('group', { name: 'More tools' });
        expect(menu.textContent).toContain('d');
        expect(menu.textContent).toContain('e');

        // every bar exists exactly once (bars register global shortcuts)
        expect(Object.values(mounts).every((n) => n === 1)).toBe(true);
    });

    it('brings tools back when the window gets wider', () => {
        rowWidth = 350;
        render(<OverflowToolbar items={ITEMS} />);
        expect(inRow()).toHaveLength(3);
        rowWidth = 1000;
        act(() => roCallbacks.forEach((cb) => cb()));
        expect(inRow()).toHaveLength(5);
        expect(Object.values(mounts).every((n) => n === 1)).toBe(true);
    });

    it('closes the menu on Escape', () => {
        rowWidth = 350;
        render(<OverflowToolbar items={ITEMS} />);
        const more = screen.getByRole('button', { name: 'More tools' });
        fireEvent.click(more);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(more.getAttribute('aria-expanded')).toBe('false');
    });
});
