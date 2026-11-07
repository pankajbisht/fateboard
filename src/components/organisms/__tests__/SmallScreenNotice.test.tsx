/**
 * Phones (owner decision, 2026-11-07): the editor is desktop-only and says so. Below 768 px the
 * editor shows a notice with "Continue anyway" (remembered for the session); wider screens see nothing.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SmallScreenNotice } from '../SmallScreenNotice';

const setWidth = (w: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
    act(() => {
        window.dispatchEvent(new Event('resize'));
    });
};

beforeEach(() => {
    try {
        sessionStorage.clear();
    } catch {
        /* storage blocked */
    }
});
afterEach(() => {
    cleanup();
    setWidth(1024);
});

describe('SmallScreenNotice', () => {
    it('shows nothing on a desktop-width window', () => {
        setWidth(1440);
        render(<SmallScreenNotice />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('explains the editor is desktop-only on a phone, and Continue anyway dismisses it', () => {
        setWidth(390);
        render(<SmallScreenNotice />);
        const dialog = screen.getByRole('dialog', { name: /larger screen/i });
        expect(dialog).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Continue anyway' }));
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('remembers the choice for the session', () => {
        setWidth(390);
        const first = render(<SmallScreenNotice />);
        fireEvent.click(screen.getByRole('button', { name: 'Continue anyway' }));
        first.unmount();
        render(<SmallScreenNotice />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('appears when the window becomes narrow', () => {
        setWidth(1440);
        render(<SmallScreenNotice />);
        setWidth(500);
        expect(screen.getByRole('dialog')).toBeTruthy();
    });
});
