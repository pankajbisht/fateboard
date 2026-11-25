import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';

/** Integration: the real command slice feeds the macro recorder through `runCommand`. */
describe('macro recording through runCommand', () => {
    afterEach(() => useStore.getState().clearMacro());

    it('records the ids of commands run while recording, and nothing after stop', async () => {
        await useStore.getState().loadCommands();
        const s = useStore.getState();
        const duplicate = s.commands.find((c) => c.id === 'duplicate')!;
        const spy = vi.spyOn(duplicate, 'handler').mockImplementation(() => {});

        s.startMacroRecording();
        useStore.getState().runCommand('duplicate');
        useStore.getState().runCommand('does-not-exist');
        useStore.getState().stopMacroRecording();
        useStore.getState().runCommand('duplicate');

        expect(useStore.getState().macroSteps).toEqual(['duplicate']);
        expect(spy).toHaveBeenCalledTimes(2);
        spy.mockRestore();
    });
});
