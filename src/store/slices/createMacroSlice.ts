import type { SliceCreator } from '../types';
import type { CommandEntry } from './createCommandSlice';

/**
 * Macros: a list of command ids (the same commands as keyboard shortcuts, `commandRegistry`) that can be
 * replayed on the current selection. Steps are recorded from `runCommand` while recording, or added by hand
 * from the Macro panel. Session only (not saved with the document).
 */
export interface MacroSlice {
    macroSteps: string[];
    macroRecording: boolean;
    macroPlaying: boolean;
    startMacroRecording: () => void;
    stopMacroRecording: () => void;
    /** called by `runCommand` after every command; keeps it only while recording */
    recordMacroStep: (id: string) => void;
    addMacroStep: (id: string) => void;
    removeMacroStep: (index: number) => void;
    clearMacro: () => void;
    /** runs every step `times` times, in order; resolves to the number of steps that ran */
    playMacro: (times?: number) => Promise<number>;
}

export const MACRO_MAX_TIMES = 50;

export const createMacroSlice: SliceCreator<MacroSlice> = (set, get) => {
    /** A command a macro may hold: exists and is not opted out (`macro: false`: file new / open / save). */
    const find = (id: string): CommandEntry | undefined =>
        (get().commands as CommandEntry[] | undefined)?.find(
            (c) => c.id === id && c.macro !== false,
        );

    return {
        macroSteps: [],
        macroRecording: false,
        macroPlaying: false,

        startMacroRecording: () =>
            set({ macroSteps: [], macroRecording: true }, false, 'macro/startRecording'),

        stopMacroRecording: () => set({ macroRecording: false }, false, 'macro/stopRecording'),

        recordMacroStep: (id) => {
            if (!get().macroRecording || get().macroPlaying || !find(id)) return;
            set({ macroSteps: [...get().macroSteps, id] }, false, 'macro/recordStep');
        },

        addMacroStep: (id) => {
            if (!find(id)) return;
            set({ macroSteps: [...get().macroSteps, id] }, false, 'macro/addStep');
        },

        removeMacroStep: (index) =>
            set(
                { macroSteps: get().macroSteps.filter((_: string, i: number) => i !== index) },
                false,
                'macro/removeStep',
            ),

        clearMacro: () => set({ macroSteps: [], macroRecording: false }, false, 'macro/clear'),

        playMacro: async (times = 1) => {
            if (get().macroPlaying) return 0;
            const steps: string[] = get().macroSteps;
            const rounds = Math.min(MACRO_MAX_TIMES, Math.max(1, Math.round(times) || 1));
            set({ macroPlaying: true, macroRecording: false }, false, 'macro/play');
            let ran = 0;
            // stop when the user switches page or the canvas is replaced between (async) steps
            const { canvas, currentPageId } = get();
            const moved = () =>
                get().canvas !== canvas ||
                get().currentPageId !== currentPageId ||
                !!get().isPageSwitching;
            try {
                for (let r = 0; r < rounds && !moved(); r++) {
                    for (const id of steps) {
                        if (moved()) break;
                        const cmd = find(id);
                        if (!cmd || (cmd.enabled && !cmd.enabled())) continue;
                        try {
                            // some handlers are async (duplicate, paste); wait so steps stay in order
                            await Promise.resolve(cmd.handler());
                            ran++;
                        } catch (error) {
                            console.error('[macro] step failed:', id, error);
                        }
                    }
                }
            } finally {
                set({ macroPlaying: false }, false, 'macro/playDone');
            }
            return ran;
        },
    };
};
