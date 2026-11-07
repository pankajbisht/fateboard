import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { NumberField } from '../NumberField';

afterEach(cleanup);

function setup(props: Partial<Parameters<typeof NumberField>[0]> = {}) {
    const onCommit = vi.fn();
    render(<NumberField aria-label="Width" value={160} onCommit={onCommit} {...props} />);
    return {
        input: screen.getByRole('spinbutton', { name: 'Width' }) as HTMLInputElement,
        onCommit,
    };
}

describe('NumberField (type, then commit)', () => {
    it('typing does not apply every keystroke; Enter applies the whole value once', () => {
        const { input, onCommit } = setup();
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '2' } });
        fireEvent.change(input, { target: { value: '25' } });
        fireEvent.change(input, { target: { value: '250' } });
        expect(onCommit).not.toHaveBeenCalled();
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledWith(250);
    });

    it('the field can be emptied while typing; an empty / invalid value reverts on blur (never 0)', () => {
        const { input, onCommit } = setup();
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '' } });
        expect(input.value).toBe('');
        fireEvent.blur(input);
        expect(onCommit).not.toHaveBeenCalled();
        expect(input.value).toBe('160');
    });

    it('accepts decimals and negatives, and commits on blur', () => {
        const { input, onCommit } = setup({ value: 0 });
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '-12.5' } });
        fireEvent.blur(input);
        expect(onCommit).toHaveBeenCalledWith(-12.5);
    });

    it('Escape cancels the edit', () => {
        const { input, onCommit } = setup();
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '999' } });
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(input.value).toBe('160');
        fireEvent.blur(input);
        expect(onCommit).not.toHaveBeenCalled();
    });

    it('arrow keys nudge by step (Shift = 10×) and apply right away', () => {
        const { input, onCommit } = setup();
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        expect(onCommit).toHaveBeenLastCalledWith(161);
        fireEvent.keyDown(input, { key: 'ArrowDown', shiftKey: true });
        expect(onCommit).toHaveBeenLastCalledWith(150);
    });

    it('clamps to min / max', () => {
        const { input, onCommit } = setup({ min: 1, max: 500 });
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '9999' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onCommit).toHaveBeenLastCalledWith(500);
    });

    it('shows outside changes (e.g. a mouse drag) but never clobbers what you are typing', () => {
        function Harness() {
            const [v, setV] = useState(10);
            return (
                <>
                    <NumberField aria-label="X" value={v} onCommit={setV} />
                    <button onClick={() => setV(42)}>external</button>
                </>
            );
        }
        render(<Harness />);
        const input = screen.getByRole('spinbutton', { name: 'X' }) as HTMLInputElement;
        fireEvent.click(screen.getByText('external'));
        expect(input.value).toBe('42');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '7' } });
        fireEvent.click(screen.getByText('external'));
        expect(input.value).toBe('7');
    });

    it('clicking the canvas commits before the canvas reacts (pointerdown fires before blur)', () => {
        // The Fabric canvas changes / clears the selection on pointerdown, which the browser
        // dispatches before it moves focus (blur). The edit must land on the object that was
        // selected while typing, so the field commits on the outside pointerdown itself.
        const order: string[] = [];
        const onCommit = vi.fn(() => order.push('commit'));
        render(
            <>
                <NumberField aria-label="Width" value={160} onCommit={onCommit} />
                <canvas data-testid="board" />
            </>,
        );
        const input = screen.getByRole('spinbutton', { name: 'Width' }) as HTMLInputElement;
        const board = screen.getByTestId('board');
        board.addEventListener('pointerdown', () => order.push('canvas'));

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '250' } });
        fireEvent.pointerDown(board);
        fireEvent.blur(input);

        expect(order).toEqual(['commit', 'canvas']);
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledWith(250);
    });

    it('a pointerdown inside the field itself does not commit', () => {
        const { input, onCommit } = setup();
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '250' } });
        fireEvent.pointerDown(input);
        expect(onCommit).not.toHaveBeenCalled();
    });

    it('shows at most 2 decimals and an optional inline label / unit', () => {
        render(
            <NumberField aria-label="R" label="R" unit="°" value={45.123456} onCommit={() => {}} />,
        );
        expect((screen.getByRole('spinbutton', { name: 'R' }) as HTMLInputElement).value).toBe(
            '45.12',
        );
        expect(screen.getByText('°')).toBeTruthy();
    });
});

describe('NumberField counter (− / + buttons)', () => {
    const press = (el: HTMLElement, init: PointerEventInit = {}) => {
        fireEvent.pointerDown(el, { button: 0, ...init });
        fireEvent.pointerUp(window);
    };

    it('shows − / + by default; each press applies one step (Shift = 10×)', () => {
        const { onCommit } = setup({ value: 10 });
        press(screen.getByRole('button', { name: 'Increase Width' }));
        expect(onCommit).toHaveBeenLastCalledWith(11);
        press(screen.getByRole('button', { name: 'Decrease Width' }), { shiftKey: true });
        expect(onCommit).toHaveBeenLastCalledWith(0);
        expect(onCommit).toHaveBeenCalledTimes(2);
    });

    it('keyboard / screen-reader activation (click without a pointer) also steps', () => {
        const { onCommit } = setup({ value: 10 });
        fireEvent.click(screen.getByRole('button', { name: 'Increase Width' }), { detail: 0 });
        expect(onCommit).toHaveBeenCalledWith(11);
    });

    it('a mouse click after pointerdown does not step twice', () => {
        const { onCommit } = setup({ value: 10 });
        const plus = screen.getByRole('button', { name: 'Increase Width' });
        press(plus);
        fireEvent.click(plus, { detail: 1 });
        expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it('steps from what you are typing, without committing the draft first', () => {
        const { input, onCommit } = setup({ value: 10 });
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '25' } });
        press(screen.getByRole('button', { name: 'Increase Width' }));
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledWith(26);
        expect(input.value).toBe('26');
    });

    it('buttons are disabled at min / max and when the field is disabled', () => {
        setup({ value: 5, min: 5, max: 5 });
        expect(
            (screen.getByRole('button', { name: 'Decrease Width' }) as HTMLButtonElement).disabled,
        ).toBe(true);
        expect(
            (screen.getByRole('button', { name: 'Increase Width' }) as HTMLButtonElement).disabled,
        ).toBe(true);
        cleanup();
        setup({ value: 5, disabled: true });
        expect(
            (screen.getByRole('button', { name: 'Increase Width' }) as HTMLButtonElement).disabled,
        ).toBe(true);
    });

    it('press and hold keeps stepping until released', () => {
        vi.useFakeTimers();
        try {
            const { onCommit } = setup({ value: 10 });
            const plus = screen.getByRole('button', { name: 'Increase Width' });
            fireEvent.pointerDown(plus, { button: 0 });
            expect(onCommit).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(1000);
            const held = onCommit.mock.calls.length;
            expect(held).toBeGreaterThan(3);
            fireEvent.pointerUp(window);
            vi.advanceTimersByTime(1000);
            expect(onCommit).toHaveBeenCalledTimes(held);
        } finally {
            vi.useRealTimers();
        }
    });

    it('custom button names, compact stacked arrows, or no counter at all', () => {
        render(
            <>
                <NumberField
                    aria-label="Font size"
                    value={24}
                    onCommit={() => {}}
                    incrementLabel="Bigger text"
                    decrementLabel="Smaller text"
                />
                <NumberField aria-label="X" value={0} onCommit={() => {}} stepper="stack" />
                <NumberField aria-label="Y" value={0} onCommit={() => {}} stepper={false} />
            </>,
        );
        expect(screen.getByRole('button', { name: 'Bigger text' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Smaller text' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Increase X' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Increase Y' })).toBeNull();
    });
});

describe('NumberField counter cleanup', () => {
    it('releasing after re-renders removes the window listeners (no leak, no ghost steps)', () => {
        vi.useFakeTimers();
        const remove = vi.spyOn(window, 'removeEventListener');
        try {
            function Harness() {
                const [v, setV] = useState(10);
                return <NumberField aria-label="N" value={v} onCommit={setV} />;
            }
            render(<Harness />);
            const add = vi.spyOn(window, 'addEventListener');
            fireEvent.pointerDown(screen.getByRole('button', { name: 'Increase N' }), {
                button: 0,
            }); // re-renders with 11
            const added = add.mock.calls.find((c) => c[0] === 'pointerup')?.[1];
            fireEvent.pointerUp(window);
            expect(remove.mock.calls.some((c) => c[0] === 'pointerup' && c[1] === added)).toBe(
                true,
            );
            add.mockRestore();
        } finally {
            remove.mockRestore();
            vi.useRealTimers();
        }
    });
});

describe('NumberField focus look', () => {
    it('only the field box shows focus (no second square ring around the inner input)', () => {
        render(<NumberField aria-label="F" value={1} onCommit={() => {}} />);
        const input = screen.getByRole('spinbutton', { name: 'F' });
        expect(input.className).not.toMatch(/ring-offset|focus-visible:ring-2/);
        expect(input.closest('label')!.className).toMatch(/focus-within:ring-2/);
    });
});
