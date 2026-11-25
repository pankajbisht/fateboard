import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '@/store';
import { createFakeCanvas } from '@/test/fakeCanvas';

import { commandRegistry } from '../../commandConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */

const byId = (id: string) => commandRegistry.find((c) => c.id === id) as any;
const run = (id: string) => byId(id).handler({ get: useStore.getState, set: useStore.setState });

const NUDGES: [string, number, number][] = [
    ['nudge-left', -1, 0],
    ['nudge-right', 1, 0],
    ['nudge-up', 0, -1],
    ['nudge-down', 0, 1],
    ['nudge-left-far', -10, 0],
    ['nudge-right-far', 10, 0],
    ['nudge-up-far', 0, -10],
    ['nudge-down-far', 0, 10],
];

describe('canvas key commands', () => {
    const nudgeSelection = vi.fn();
    const selectAllObjects = vi.fn();

    beforeEach(() => {
        nudgeSelection.mockClear();
        selectAllObjects.mockClear();
        const canvas = createFakeCanvas([{ id: 'a' }]);
        canvas.setActiveObject(canvas.getObjects()[0]);
        useStore.setState({
            canvas,
            activeTool: 'select',
            nodeEditor: null,
            nudgeSelection,
            selectAllObjects,
        } as never);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        useStore.setState({ canvas: null, activeTool: 'select', nodeEditor: null } as never);
    });

    it.each(NUDGES)('%s moves by %i, %i', (id, dx, dy) => {
        run(id);
        expect(nudgeSelection).toHaveBeenCalledWith(dx, dy);
    });

    it('keeps all of them off the toolbars and menus', async () => {
        const { contextMenuRegistry } = await import('../../contextMenuRegistry');
        const ids = contextMenuRegistry.map((c: any) => c.id);
        for (const [id] of NUDGES) expect(ids).not.toContain(id);
        expect(ids).not.toContain('select-all');
    });

    it('runs select all', () => {
        run('select-all');
        expect(selectAllObjects).toHaveBeenCalledTimes(1);
    });

    it('needs a selection to nudge, so arrows otherwise stay with the browser', () => {
        expect(byId('nudge-left').enabled()).toBe(true);
        useStore.getState().canvas.discardActiveObject();
        expect(byId('nudge-left').enabled()).toBe(false);
    });

    it.each(['draw', 'pan', 'node'])('leaves the keys alone with the %s tool', (activeTool) => {
        useStore.setState({ activeTool } as never);
        expect(byId('nudge-left').enabled()).toBe(false);
        expect(byId('select-all').enabled()).toBe(false);
    });

    it('leaves the keys alone while nodes are being edited', () => {
        useStore.setState({ nodeEditor: {} } as never);
        expect(byId('nudge-left').enabled()).toBe(false);
        expect(byId('select-all').enabled()).toBe(false);
    });

    it.each(['radiogroup', 'slider', 'tablist', 'menu', 'listbox'])(
        'leaves arrows to a focused %s, which uses them itself',
        (role) => {
            const control = document.body.appendChild(document.createElement('div'));
            control.setAttribute('role', role);
            const inner = control.appendChild(document.createElement('button'));
            inner.focus();
            expect(byId('nudge-left').enabled()).toBe(false);
        },
    );

    it('still nudges after a plain toolbar button was clicked', () => {
        document.body.appendChild(document.createElement('button')).focus();
        expect(byId('nudge-left').enabled()).toBe(true);
    });
});
