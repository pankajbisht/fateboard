/**
 * The Export pane's GIF output (2026-11-17): its own sizes, frame rates and switches, the board's
 * proportions, and a clear limit instead of a huge file.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- partial store state */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { ExportSection } from '../ExportSection';

const exportVideo = vi.fn(async () => {});
let prev: any;

const pick = (combo: string, option: RegExp | string) => {
    fireEvent.click(screen.getByRole('combobox', { name: combo }));
    fireEvent.click(screen.getByRole('option', { name: option }));
};

beforeEach(() => {
    prev = useStore.getState();
    exportVideo.mockClear();
    useStore.setState({
        exportVideo,
        animDuration: 5000,
        workIn: 0,
        workOut: null,
        exportState: { status: 'idle', progress: 0 },
    } as any);
});
afterEach(() => {
    cleanup();
    useStore.setState({
        exportVideo: prev.exportVideo,
        animDuration: prev.animDuration,
        workIn: prev.workIn,
        workOut: prev.workOut,
    } as any);
});

describe('GIF export settings', () => {
    it('GIF has its own sizes and frame rates, no video quality, and three switches', () => {
        render(<ExportSection />);
        pick('Output', /^GIF/);
        expect(screen.queryByRole('combobox', { name: 'Quality' })).toBeNull();
        expect(screen.queryByRole('combobox', { name: 'Resolution' })).toBeNull();
        expect(screen.getByRole('combobox', { name: 'Size' })).toHaveTextContent('480 px wide');
        expect(screen.getByRole('combobox', { name: 'Frame rate' })).toHaveTextContent('15 fps');
        for (const name of ['Loop forever', 'Dither', 'Transparent background'])
            expect(screen.getByRole('switch', { name })).toBeTruthy();
        expect(screen.getByText(/5\.0 s · 76 frames, 480 px wide/)).toBeTruthy();
    });

    it('exports at the chosen width with the board proportions and the chosen options', () => {
        render(<ExportSection />);
        pick('Output', /^GIF/);
        pick('Size', /320 px wide/);
        pick('Frame rate', '12 fps');
        fireEvent.click(screen.getByRole('switch', { name: 'Loop forever' }));
        fireEvent.click(screen.getByRole('switch', { name: 'Transparent background' }));
        // no background colour for a transparent GIF
        expect(screen.queryByText('Background')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Export GIF' }));
        expect(exportVideo).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'gif',
                width: 320,
                height: 0,
                fps: 12,
                gif: { loop: false, dither: false, transparent: true },
            }),
        );
        // the timeline's own frame rate is not changed by the GIF's
        expect(useStore.getState().animFps).toBe(prev.animFps);
    });

    it('longer than 30 s: the button is off and says how to export a part', () => {
        useStore.setState({ animDuration: 40_000 } as any);
        render(<ExportSection />);
        pick('Output', /^GIF/);
        expect(screen.getByRole('button', { name: 'Export GIF' })).toBeDisabled();
        expect(screen.getByText(/at most 30 s; this is 40\.0 s\. Set a work area/)).toBeTruthy();
    });
});
