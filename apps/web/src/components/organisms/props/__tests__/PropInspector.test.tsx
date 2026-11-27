/** Scene Objects inspector (docs/PROPS.md phase 3): restyle the selected prop. */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { PropInspector } from '../PropInspector';

const updateSelectedProp = vi.fn(async () => true);
const randomizeSelectedProp = vi.fn(async () => true);
const applyPreset = vi.fn(() => true);

/** The shared fake canvas with one object selected; `select` changes it and fires the event. */
function canvasWith(obj: unknown) {
    const canvas = createFakeCanvas();
    canvas.setActiveObject(obj as never);
    return Object.assign(canvas, {
        select(next: unknown) {
            canvas.setActiveObject(next as never);
            canvas.fire('selection:updated', {});
        },
    });
}

const chair = {
    propData: {
        v: 1,
        propId: 'chair',
        variant: 0,
        colors: {},
        outline: '#141414',
        outlineWidth: 3,
        tone: { kind: 'none', density: 0.5 },
        light: 'day',
        shadow: true,
    },
};

describe('PropInspector', () => {
    let canvas: ReturnType<typeof canvasWith>;
    beforeEach(() => {
        canvas = canvasWith(chair);
        useStore.setState({
            canvas,
            updateSelectedProp,
            randomizeSelectedProp,
            applyPreset,
            animDuration: 6000,
        } as never);
    });
    afterEach(() => vi.clearAllMocks());

    it('shows the selected prop and switches its variant', () => {
        render(<PropInspector />);
        expect(screen.getByText('Selected: Chair')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('radio', { name: 'Side' }));
        expect(updateSelectedProp).toHaveBeenCalledWith({ variant: 1 });
    });

    it('sets a screentone, and Randomize asks for another look', () => {
        render(<PropInspector />);
        fireEvent.click(screen.getByRole('radio', { name: 'Dots' }));
        expect(updateSelectedProp).toHaveBeenCalledWith({ tone: { kind: 'dots', density: 0.5 } });
        fireEvent.click(screen.getByRole('button', { name: 'Randomize' }));
        expect(randomizeSelectedProp).toHaveBeenCalled();
    });

    it('has a colour button per slot and the outline controls', () => {
        render(<PropInspector />);
        expect(screen.getByRole('button', { name: 'Wood colour' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Outline colour' })).toBeInTheDocument();
        expect(screen.getByRole('slider', { name: 'Outline width' })).toBeInTheDocument();
    });

    it('is not shown for other objects, and follows the selection', () => {
        canvas = canvasWith({ type: 'rect' });
        useStore.setState({ canvas } as never);
        render(<PropInspector />);
        expect(screen.queryByText(/^Selected:/)).toBeNull();
        act(() => canvas.select(chair));
        expect(screen.getByText('Selected: Chair')).toBeInTheDocument();
    });

    it('the shadow switch turns the contact shadow off', () => {
        render(<PropInspector />);
        const sw = screen.getByRole('switch', { name: 'Shadow' });
        expect(sw).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(sw);
        expect(updateSelectedProp).toHaveBeenCalledWith({ shadow: false });
    });

    it('trees get a looping wind sway, clouds a drift; other props no ambient button', () => {
        const tree = { propData: { ...chair.propData, propId: 'tree-round' } };
        canvas.select(tree);
        const { unmount } = render(<PropInspector />);
        fireEvent.click(screen.getByRole('button', { name: 'Add wind sway' }));
        expect(applyPreset).toHaveBeenCalledWith('windSway', {
            start: 0,
            duration: 2400,
            repeat: 3,
        });
        unmount();
        act(() => canvas.select({ propData: { ...chair.propData, propId: 'cloud-puffy' } }));
        const second = render(<PropInspector />);
        expect(screen.getByRole('button', { name: 'Add drift' })).toBeInTheDocument();
        second.unmount();
        act(() => canvas.select(chair));
        render(<PropInspector />);
        expect(screen.queryByRole('button', { name: /^Add (wind sway|drift)$/ })).toBeNull();
    });
});
