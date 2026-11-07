import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useStore } from '@store';
import { Footer } from '../ui/Footer';
import { zoomToSlider, sliderToZoom } from '../ui/ZoomControl';

/* eslint-disable @typescript-eslint/no-explicit-any */

const setZoom = vi.fn();
const fitToScreen = vi.fn();
const zoomIn = vi.fn();
const zoomOut = vi.fn();
const actualSize = vi.fn();

beforeEach(() => {
    [setZoom, fitToScreen, zoomIn, zoomOut, actualSize].forEach((f) => f.mockReset());
    act(() =>
        useStore.setState({
            zoom: 1,
            scale: 0.5,
            setZoom,
            fitToScreen,
            zoomIn,
            zoomOut,
            actualSize,
            selectedPreset: { id: 'yt', label: 'YouTube', width: 1280, height: 720 },
        } as any),
    );
});

afterEach(cleanup);

describe('Footer view controls (right side)', () => {
    it('ends with: zoom slider over the page size, then the fullscreen button', () => {
        render(<Footer />);
        const view = screen.getByTestId('footer-view');
        const slider = within(view).getByRole('slider', { name: 'Zoom' });
        const size = within(view).getByText('1280 × 720 px');

        // stacked like the Fill / Stroke tiles: slider above, size below, in one column
        const column = slider.closest('[data-footer-stack]');
        expect(column).toBeTruthy();
        expect(column!.contains(size)).toBe(true);
        expect(
            slider.compareDocumentPosition(size) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();

        // fullscreen is the last control of the footer
        const buttons = screen.getAllByRole('button');
        expect(buttons.at(-1)!.getAttribute('title')).toMatch(/Fullscreen/i);
    });

    it('shows the visible zoom (fit scale × zoom) and sets zoom from the slider', () => {
        render(<Footer />);
        expect(screen.getByText('50%')).toBeTruthy(); // scale 0.5 × zoom 1

        const slider = screen.getByRole('slider', { name: 'Zoom' });
        fireEvent.change(slider, { target: { value: String(zoomToSlider(2)) } });
        expect(setZoom).toHaveBeenCalled();
        expect(setZoom.mock.calls.at(-1)![0]).toBeCloseTo(2, 1);
    });

    it('is the one zoom control: − / + step, the % sets 100%, Fit fits the page', () => {
        render(<Footer />);
        const view = screen.getByTestId('footer-view');
        fireEvent.click(within(view).getByRole('button', { name: 'Zoom out' }));
        expect(zoomOut).toHaveBeenCalledTimes(1);
        fireEvent.click(within(view).getByRole('button', { name: 'Zoom in' }));
        expect(zoomIn).toHaveBeenCalledTimes(1);
        fireEvent.click(within(view).getByRole('button', { name: /Zoom to 100%/ }));
        expect(actualSize).toHaveBeenCalledTimes(1);
        const fit = within(view).getByRole('button', { name: 'Fit to screen' });
        fireEvent.click(fit);
        expect(fitToScreen).toHaveBeenCalledTimes(1);
        // Fit must not look like the fullscreen button next to it
        const fullscreen = screen.getByTitle(/Fullscreen/i);
        expect(fit.innerHTML).not.toBe(fullscreen.innerHTML);
        // order: − slider + % Fit
        const order = [
            within(view).getByRole('button', { name: 'Zoom out' }),
            within(view).getByRole('slider', { name: 'Zoom' }),
            within(view).getByRole('button', { name: 'Zoom in' }),
            within(view).getByRole('button', { name: /Zoom to 100%/ }),
            within(view).getByRole('button', { name: 'Fit to screen' }),
        ];
        for (let k = 1; k < order.length; k++)
            expect(
                order[k - 1].compareDocumentPosition(order[k]) & Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
    });

    it('the size is no longer duplicated in the stroke area', () => {
        render(<Footer />);
        expect(screen.getAllByText('1280 × 720 px')).toHaveLength(1);
    });
});

describe('whiteboard mode', () => {
    it('has no page, so no page size under the zoom', () => {
        act(() => useStore.getState().setFreehand(true));
        render(<Footer />);
        expect(screen.queryByText('1280 × 720 px')).toBeNull();
        expect(screen.getByRole('slider', { name: 'Zoom' })).toBeTruthy();
        act(() => useStore.getState().setFreehand(false));
    });
});

describe('log zoom scale', () => {
    it('maps 10%..400% to the slider and back', () => {
        expect(sliderToZoom(0)).toBeCloseTo(0.1);
        expect(sliderToZoom(100)).toBeCloseTo(4);
        expect(sliderToZoom(zoomToSlider(1))).toBeCloseTo(1);
    });
});

describe('Footer spacing', () => {
    it('has the same 16 px inset on the left and right (labels do not touch the edge)', () => {
        const { container } = render(<Footer />);
        const footer = container.querySelector('footer')!;
        expect(footer.className).toMatch(/\bpx-4\b/);
        expect(footer.className).not.toMatch(/\b(pl|pr)-\d/); // one value for both sides
    });
});
