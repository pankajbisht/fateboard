/** Scene Objects phase 4 tools (docs/PROPS.md): presets, time of day, ground line. */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { PropSceneTools } from '../PropSceneTools';

const a = {
    applyPropScene: vi.fn(async () => 6),
    setPropTimeOfDay: vi.fn(async () => 2),
    setPropGroundSnap: vi.fn(),
    setPropGroundLine: vi.fn(),
};

describe('PropSceneTools', () => {
    beforeEach(() =>
        useStore.setState({
            canvas: createFakeCanvas([{ propData: { propId: 'cat', light: 'sunset' } }]),
            propGroundSnap: false,
            propGroundLine: 0.85,
            ...a,
        } as never),
    );
    afterEach(() => vi.clearAllMocks());

    it('a preset lays out its scene', () => {
        render(<PropSceneTools />);
        fireEvent.click(screen.getByRole('button', { name: 'Forest scene' }));
        expect(a.applyPropScene).toHaveBeenCalledWith('forest');
    });

    it("time of day shows the page's and changes all props", () => {
        render(<PropSceneTools />);
        expect(screen.getByRole('radio', { name: 'Sunset' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        fireEvent.click(screen.getByRole('radio', { name: 'Night' }));
        expect(a.setPropTimeOfDay).toHaveBeenCalledWith('night');
    });

    it('the ground line switch turns snapping on; its slider shows when on', () => {
        render(<PropSceneTools />);
        expect(screen.queryByRole('slider', { name: 'Ground line' })).toBeNull();
        fireEvent.click(screen.getByRole('switch', { name: 'Snap to ground line' }));
        expect(a.setPropGroundSnap).toHaveBeenCalledWith(true);
    });

    it('shows the ground line slider when snapping is on', () => {
        useStore.setState({ propGroundSnap: true } as never);
        render(<PropSceneTools />);
        expect(screen.getByRole('slider', { name: 'Ground line' })).toBeInTheDocument();
    });
});
