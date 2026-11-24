/**
 * "From thought to visual" on the landing page: a live board that builds a poster, with steps in
 * sync, a time-lapse scrubber, a before / after wipe and a zoom lens (and BUG-196 fixed).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BuildStage, STAGE_MS } from '../BuildStage';

const stage = () => screen.getByRole('region', { name: 'From thought to visual, live' });
const picture = () => within(stage()).getAllByRole('img')[0]!;
const step = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

const mockReducedMotion = (reduce: boolean) => {
    window.matchMedia = ((query: string) => ({
        matches: reduce && query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as typeof window.matchMedia;
};

describe('BuildStage', () => {
    const original = window.matchMedia;
    beforeEach(() => mockReducedMotion(false));
    afterEach(() => {
        window.matchMedia = original;
        vi.useRealTimers();
    });

    it('starts on the sketch, with the first step current', () => {
        render(<BuildStage />);
        expect(picture()).toHaveAccessibleName('The board at step 1');
        expect(step('Draw Naturally')).toHaveAttribute('aria-current', 'step');
    });

    it('builds the poster by itself, one step at a time, and loops', () => {
        vi.useFakeTimers();
        render(<BuildStage />);
        act(() => vi.advanceTimersByTime(STAGE_MS));
        expect(picture()).toHaveAccessibleName('The board at step 2');
        expect(step('Adjust as You Go')).toHaveAttribute('aria-current', 'step');
        for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(STAGE_MS));
        expect(picture()).toHaveAccessibleName('The board at step 1');
    });

    it('pauses while the pointer is on it', () => {
        vi.useFakeTimers();
        render(<BuildStage />);
        fireEvent.pointerEnter(stage());
        act(() => vi.advanceTimersByTime(STAGE_MS * 2));
        expect(picture()).toHaveAccessibleName('The board at step 1');
        fireEvent.pointerLeave(stage());
        act(() => vi.advanceTimersByTime(STAGE_MS));
        expect(picture()).toHaveAccessibleName('The board at step 2');
    });

    it('does not play by itself for people who ask for reduced motion (BUG-196)', () => {
        mockReducedMotion(true);
        vi.useFakeTimers();
        render(<BuildStage />);
        act(() => vi.advanceTimersByTime(STAGE_MS * 3));
        expect(picture()).toHaveAccessibleName('The board at step 1');
        expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });

    it('jumps to a step from the list, and stops playing', () => {
        vi.useFakeTimers();
        render(<BuildStage />);
        fireEvent.click(step('Bring It to Life'));
        expect(picture()).toHaveAccessibleName('The board at step 3');
        act(() => vi.advanceTimersByTime(STAGE_MS * 2));
        expect(picture()).toHaveAccessibleName('The board at step 3');
    });

    it('takes arrow keys only while it has focus (BUG-196)', () => {
        render(<BuildStage />);
        fireEvent.keyDown(document.body, { key: 'ArrowRight' });
        expect(picture()).toHaveAccessibleName('The board at step 1');
        fireEvent.keyDown(stage(), { key: 'ArrowRight' });
        expect(picture()).toHaveAccessibleName('The board at step 2');
        fireEvent.keyDown(stage(), { key: 'End' });
        expect(picture()).toHaveAccessibleName('The finished board');
    });

    it('scrubs through time: between two steps both frames blend', () => {
        render(<BuildStage />);
        const scrubber = screen.getByRole('slider', { name: 'Time-lapse' });
        fireEvent.change(scrubber, { target: { value: '1.25' } });
        const frames = within(stage()).getAllByRole('img');
        expect(frames[0]).toHaveAccessibleName('The board at step 2');
        expect(frames[1]).toHaveAccessibleName('The board at step 3');
        expect(frames[1]!.closest('[data-frame="next"]')).toHaveStyle({ opacity: '0.25' });

        fireEvent.pointerUp(scrubber);
        expect(within(stage()).getAllByRole('img')).toHaveLength(1);
        expect(picture()).toHaveAccessibleName('The board at step 2');
    });

    it('compares the thought with the visual behind a wipe you can move', () => {
        render(<BuildStage />);
        fireEvent.click(screen.getByRole('radio', { name: 'Compare' }));
        const wipe = screen.getByRole('slider', { name: 'Compare thought and visual' });
        expect(wipe).toHaveAttribute('aria-valuenow', '50');
        expect(within(stage()).getByText('Thought')).toBeInTheDocument();
        expect(within(stage()).getByText('Visual')).toBeInTheDocument();

        fireEvent.keyDown(wipe, { key: 'ArrowLeft' });
        expect(wipe).toHaveAttribute('aria-valuenow', '45');
        const before = stage().querySelector('[data-frame="before"]') as HTMLElement;
        expect(before.style.clipPath).toMatch(/^inset\(0(px)? 55% 0(px)? 0(px)?\)$/);
    });

    it('shows a zoom lens under a mouse, never under a finger', () => {
        render(<BuildStage />);
        const area = stage().querySelector('[data-stage-picture]')!;
        fireEvent.pointerMove(area, { pointerType: 'touch', clientX: 40, clientY: 40 });
        expect(screen.queryByTestId('stage-lens')).toBeNull();
        fireEvent.pointerMove(area, { pointerType: 'mouse', clientX: 40, clientY: 40 });
        expect(screen.getByTestId('stage-lens')).toBeInTheDocument();
        fireEvent.pointerLeave(area);
        expect(screen.queryByTestId('stage-lens')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Zoom lens' }));
        fireEvent.pointerMove(area, { pointerType: 'mouse', clientX: 40, clientY: 40 });
        expect(screen.queryByTestId('stage-lens')).toBeNull();
    });
});
