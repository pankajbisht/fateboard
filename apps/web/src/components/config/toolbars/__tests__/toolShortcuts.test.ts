/** V / H / A switch tools, through the one command registry (shortcut table + palette list them). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { commandRegistry } from '../../commandConfig';
import { replaceToShortcut } from '@/lib/utils/isMac';

/* eslint-disable @typescript-eslint/no-explicit-any */
const prev = useStore.getState().setActiveTool;
afterEach(() => useStore.setState({ setActiveTool: prev } as any));

describe('tool shortcuts', () => {
    it.each([
        ['v', 'select'],
        ['h', 'pan'],
        ['a', 'node'],
    ])('%s switches to %s', (key, tool) => {
        const setActiveTool = vi.fn();
        useStore.setState({ setActiveTool } as any);
        const command: any = commandRegistry.find(
            (c: any) => replaceToShortcut(c.shortcut) === replaceToShortcut(key),
        );
        expect(command).toBeDefined();
        command.handler({ get: useStore.getState, set: useStore.setState });
        expect(setActiveTool).toHaveBeenCalledWith(tool);
    });
});
