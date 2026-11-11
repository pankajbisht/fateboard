/**
 * Settings page: Reset asks first (the app's dialog) and restores every default; the default canvas
 * size is chosen from the canvas presets.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { DEFAULT_SETTINGS } from '@/store/slices/createSettingSlice';
import Preferences from '../ui/Preferences';

const settings = () => useStore.getState().settings;
let original: ReturnType<typeof useStore.getState>['confirmDialog'];

beforeEach(() => {
    original = useStore.getState().confirmDialog;
    act(() => useStore.getState().resetSettings());
});
afterEach(() => {
    act(() => useStore.getState().resetSettings());
    useStore.setState({ confirmDialog: original });
});

const changeEverything = () =>
    act(() => {
        const s = useStore.getState();
        s.setMode('dark');
        s.setColorTheme('rose');
        s.setIconSize('lg');
        s.setUnit('in');
        s.setDefaultCanvasPreset('youtube-shorts');
        s.setCanvasOrientation('portrait');
    });

describe('Preferences', () => {
    it('Reset asks with the app dialog, then restores every default', async () => {
        const confirmDialog = vi.fn(async () => true);
        useStore.setState({ confirmDialog });
        changeEverything();
        render(<Preferences />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Reset settings' }));
        });

        expect(confirmDialog).toHaveBeenCalledTimes(1);
        expect(settings()).toEqual(DEFAULT_SETTINGS);
        expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
    });

    it('cancelling Reset changes nothing', async () => {
        useStore.setState({ confirmDialog: vi.fn(async () => false) });
        changeEverything();
        const before = settings();
        render(<Preferences />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Reset settings' }));
        });

        expect(settings()).toBe(before);
    });

    it('the canvas size is picked from the canvas presets, shown in the chosen unit', () => {
        render(<Preferences />);
        const select = screen.getByRole('combobox', { name: 'Canvas size' });
        expect(select).toHaveTextContent('Presentation 16:9');

        fireEvent.click(select);
        fireEvent.click(screen.getByRole('option', { name: /Instagram Post/ }));

        expect(settings().defaultCanvasPresetId).toBe('instagram-post');
    });

    it('sizes are shown in Settings > Units (BUG-082)', () => {
        act(() => useStore.getState().setUnit('mm'));
        render(<Preferences />);
        fireEvent.click(screen.getByRole('combobox', { name: 'Canvas size' }));
        expect(screen.getByRole('option', { name: /Presentation 16:9/ })).toHaveTextContent(
            '508 × 285.7 mm',
        );
    });

    it('Orientation is chosen here; the size list shows each format in it', () => {
        render(<Preferences />);
        expect(screen.getByRole('radio', { name: 'Landscape' })).toHaveAttribute(
            'aria-checked',
            'true',
        );

        fireEvent.click(screen.getByRole('radio', { name: 'Portrait' }));

        expect(settings().canvasOrientation).toBe('portrait');
        fireEvent.click(screen.getByRole('combobox', { name: 'Canvas size' }));
        expect(screen.getByRole('option', { name: /Presentation 16:9/ })).toHaveTextContent(
            '1080 × 1920',
        );
    });

    it('Custom size: typed in the chosen unit, stored in px, applied as typed', () => {
        act(() => useStore.getState().setUnit('mm'));
        render(<Preferences />);
        fireEvent.click(screen.getByRole('combobox', { name: 'Canvas size' }));
        fireEvent.click(screen.getByRole('option', { name: /Custom size/ }));

        fireEvent.change(screen.getByLabelText('Width (mm)'), { target: { value: '210' } });
        fireEvent.change(screen.getByLabelText('Height (mm)'), { target: { value: '297' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply size' }));

        expect(settings()).toMatchObject({
            defaultCanvasPresetId: 'custom',
            customCanvasSize: { width: 794, height: 1123 },
            canvasOrientation: 'portrait',
        });
        expect(screen.getByRole('radio', { name: 'Portrait' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
    });

    it('Custom size: a size outside the limits says so and changes nothing', () => {
        render(<Preferences />);
        fireEvent.click(screen.getByRole('combobox', { name: 'Canvas size' }));
        fireEvent.click(screen.getByRole('option', { name: /Custom size/ }));
        const before = settings().customCanvasSize;

        fireEvent.change(screen.getByLabelText('Width (px)'), { target: { value: '12.5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply size' }));

        expect(screen.getByRole('alert')).toHaveTextContent(/whole-number/);
        expect(settings().customCanvasSize).toEqual(before);
    });
});
