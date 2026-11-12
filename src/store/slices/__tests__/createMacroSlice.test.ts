import { describe, expect, it, vi } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createMacroSlice } from '../createMacroSlice';

const make = () => {
    const log: string[] = [];
    const commands = ['duplicate', 'flip-x', 'locked', 'save'].map((id) => ({
        id,
        label: id,
        ...(id === 'save' && { macro: false }), // file commands opt out of macros
        enabled: () => id !== 'locked',
        handler: vi.fn(() => {
            log.push(id);
        }),
    }));
    const h = createHarness([createMacroSlice as never], { commands });
    // runCommand as the command slice does it: run, then let the macro recorder see the id
    h.set({
        runCommand: (id: string) => {
            commands.find((c) => c.id === id)?.handler();
            h.get().recordMacroStep(id);
        },
    });
    return { ...h, log };
};

describe('macro slice', () => {
    it('starts empty and not recording', () => {
        const { get } = make();
        expect(get().macroSteps).toEqual([]);
        expect(get().macroRecording).toBe(false);
    });

    it('records commands only while recording', () => {
        const { get } = make();
        get().runCommand('duplicate');
        get().startMacroRecording();
        get().runCommand('duplicate');
        get().runCommand('flip-x');
        get().stopMacroRecording();
        get().runCommand('flip-x');
        expect(get().macroSteps).toEqual(['duplicate', 'flip-x']);
    });

    it('starting a new recording replaces the old steps', () => {
        const { get } = make();
        get().addMacroStep('duplicate');
        get().startMacroRecording();
        expect(get().macroSteps).toEqual([]);
    });

    it('adds, removes and clears steps by hand; unknown ids are ignored', () => {
        const { get } = make();
        get().addMacroStep('duplicate');
        get().addMacroStep('nope');
        get().addMacroStep('flip-x');
        get().removeMacroStep(0);
        expect(get().macroSteps).toEqual(['flip-x']);
        get().clearMacro();
        expect(get().macroSteps).toEqual([]);
    });

    it('plays the steps in order, N times, without recording itself', async () => {
        const { get, log } = make();
        get().addMacroStep('duplicate');
        get().addMacroStep('flip-x');
        get().startMacroRecording();
        get().stopMacroRecording(); // empty recording keeps nothing
        get().addMacroStep('duplicate');
        get().addMacroStep('flip-x');
        expect(await get().playMacro(2)).toBe(4);
        expect(log).toEqual(['duplicate', 'flip-x', 'duplicate', 'flip-x']);
        expect(get().macroSteps).toEqual(['duplicate', 'flip-x']);
        expect(get().macroPlaying).toBe(false);
    });

    it('skips disabled steps and survives a throwing one', async () => {
        const { get, log } = make();
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        get().commands[1].handler.mockImplementationOnce(() => {
            throw new Error('boom');
        });
        ['locked', 'flip-x', 'duplicate'].forEach((id) => get().addMacroStep(id));
        expect(await get().playMacro()).toBe(1);
        expect(log).toEqual(['duplicate']);
        expect(err).toHaveBeenCalled();
        err.mockRestore();
    });

    it('waits for an async step before running the next one', async () => {
        const { get, log } = make();
        get().commands[0].handler.mockImplementationOnce(
            () => new Promise<void>((done) => setTimeout(() => (log.push('slow'), done()), 5)),
        );
        get().addMacroStep('duplicate');
        get().addMacroStep('flip-x');
        await get().playMacro();
        expect(log).toEqual(['slow', 'flip-x']);
    });

    it('never takes a command marked macro: false (file new / open / save)', () => {
        const { get } = make();
        get().addMacroStep('save');
        get().startMacroRecording();
        get().runCommand('save');
        expect(get().macroSteps).toEqual([]);
    });

    it('clamps the repeat count to 1-50 and ignores a second Play while playing', async () => {
        const { get, log } = make();
        get().addMacroStep('flip-x');
        expect(await get().playMacro(999)).toBe(50);
        expect(await get().playMacro(0)).toBe(1);
        expect(await get().playMacro(Number.NaN)).toBe(1);
        log.length = 0;
        const [first, second] = await Promise.all([get().playMacro(3), get().playMacro(3)]);
        expect([first, second]).toEqual([3, 0]);
    });

    it('stops when the page or the canvas changes between steps', async () => {
        const { get, set, log } = make();
        set({ canvas: 'A', currentPageId: 'p1' });
        get().commands[0].handler.mockImplementation(() => {
            log.push('duplicate');
            set({ currentPageId: 'p2' }); // the user switched page during playback
        });
        get().addMacroStep('duplicate');
        get().addMacroStep('flip-x');
        expect(await get().playMacro(5)).toBe(1);
        expect(log).toEqual(['duplicate']);
    });
});
