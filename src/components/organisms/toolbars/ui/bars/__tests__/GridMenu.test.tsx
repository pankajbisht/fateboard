/** Top bar grid options: style, size and snap next to the grid toggle (saved per mode in Settings). */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { DEFAULT_SETTINGS } from '@/store/slices/createSettingSlice';
import { GridMenu } from '../GridMenu';

/* eslint-disable @typescript-eslint/no-explicit-any */
const reset = () =>
    act(() => {
        useStore.setState({ boardMode: 'design', gridEnabled: false, snapEnabled: false } as any);
        useStore.getState().resetSettings();
    });

beforeEach(reset);
afterEach(() => {
    cleanup();
    reset();
});

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Grid options' }));

describe('GridMenu', () => {
    it('lists the seven styles with the current one pressed', () => {
        render(<GridMenu />);
        open();
        const styles = screen.getByRole('group', { name: 'Grid style' });
        const names = [...styles.querySelectorAll('button')].map((b) => b.textContent);
        expect(names).toEqual([
            'Graph',
            'Squares',
            'Dashed',
            'Dots',
            'Crosses',
            'Isometric',
            'Ruled',
        ]);
        expect(screen.getByRole('button', { name: 'Graph' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('picking a style shows the grid in it and saves it for this mode', () => {
        render(<GridMenu />);
        open();
        fireEvent.click(screen.getByRole('button', { name: 'Isometric' }));
        const s = useStore.getState() as any;
        expect(s.gridStyle).toBe('isometric');
        expect(s.gridEnabled).toBe(true);
        expect(s.settings.grid.design.style).toBe('isometric');
        expect(s.settings.grid.whiteboard).toEqual(DEFAULT_SETTINGS.grid.whiteboard);
    });

    it('size slider (shown in the chosen unit) and snap switch', () => {
        render(<GridMenu />);
        open();
        fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } });
        expect((useStore.getState() as any).gridSize).toBe(40);
        expect(screen.getByText('40 px')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('switch', { name: 'Snap' }));
        expect((useStore.getState() as any).snapEnabled).toBe(true);
    });

    it('closes on Escape and on a click outside', () => {
        render(<GridMenu />);
        open();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: 'Grid options' })).toBeNull();
        open();
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('dialog', { name: 'Grid options' })).toBeNull();
    });

    it('keyboard: opening moves focus to the current style; Escape gives it back to the button', () => {
        render(<GridMenu />);
        const trigger = screen.getByRole('button', { name: 'Grid options' });
        trigger.focus();
        fireEvent.click(trigger);
        expect(screen.getByRole('button', { name: 'Graph' })).toHaveFocus();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(trigger).toHaveFocus();
    });

    it('the size slider covers every size the grid accepts (4–200 px)', () => {
        render(<GridMenu />);
        open();
        const slider = screen.getByRole('slider');
        expect(slider).toHaveAttribute('min', '4');
        expect(slider).toHaveAttribute('max', '200');
    });
});
