import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { TABS_CONFIG } from '../../../config/tabs.config';
import { FractalPanel } from '../FractalPanel';
import { AutomataPanel } from '../AutomataPanel';
import { MacroPanel } from '../MacroPanel';

/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for the store and fake canvas */

let canvas: any;

beforeEach(() => {
    canvas = createFakeCanvas();
    act(() => useStore.setState({ canvas, saveState: () => {}, addLayer: () => {} } as any));
});

afterEach(() => {
    cleanup();
    act(() => {
        useStore.getState().clearMacro();
        useStore.setState({ canvas: null } as any);
    });
});

describe('generator dock tabs', () => {
    it('Fractals, Cellular Automata and Macro are right dock tabs', () => {
        const labels = TABS_CONFIG.map((t) => t.label);
        expect(labels).toEqual(expect.arrayContaining(['Fractals', 'Cellular Automata', 'Macro']));
    });

    it('Fractals inserts one path on the canvas', () => {
        render(<FractalPanel />);
        fireEvent.click(screen.getByRole('button', { name: /insert fractal/i }));
        expect(canvas.getObjects()).toHaveLength(1);
        expect(canvas.getObjects()[0].name).toBe('Koch snowflake');
    });

    it('Cellular Automata inserts one path on the canvas', () => {
        render(<AutomataPanel />);
        fireEvent.click(screen.getByRole('button', { name: /insert pattern/i }));
        expect(canvas.getObjects()).toHaveLength(1);
        expect(canvas.getObjects()[0].name).toBe('Rule 30');
    });

    it('Macro: record shows Stop; steps can be removed; Play runs them', async () => {
        await useStore.getState().loadCommands();
        const dup = useStore.getState().commands.find((c) => c.id === 'duplicate')!;
        const spy = vi.spyOn(dup, 'handler').mockImplementation(() => {});
        render(<MacroPanel />);
        expect(screen.getByRole('button', { name: /play macro/i })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: /^record$/i }));
        act(() => useStore.getState().runCommand('duplicate'));
        act(() => useStore.getState().runCommand('duplicate'));
        fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
        expect(screen.getByRole('list', { name: /macro steps/i }).children).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: 'Remove step 2' }));
        expect(useStore.getState().macroSteps).toEqual(['duplicate']);

        spy.mockClear();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /play macro/i }));
        });
        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });
});
