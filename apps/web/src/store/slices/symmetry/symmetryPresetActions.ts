/**
 * Symmetry slice: preset actions (apply / save / delete / dice). User presets are saved in the browser through
 * `@/lib/storage` (local list "symmetry-presets"); built-ins live in symmetryPresets.ts.
 */
import { readLocalList, writeLocalList } from '@/lib/storage';
import type { SymmetryPeers, SymmetrySlice } from '../createSymmetrySlice';
import {
    PRESET_DEFAULTS,
    isSymmetryPreset,
    randomSymmetryPreset,
    type SymmetryPreset,
} from './symmetryPresets';
import { sanitizeSymmetryOptions, sanitizeSymmetryVariation } from './symmetrySetup';
import { newSymmetryId as newId } from './symmetryEditActions';

const PRESETS_KEY = 'symmetry-presets';

type Set = (partial: Partial<SymmetrySlice>, replace: false, action: string) => void;
type Get = () => SymmetrySlice;

function loadPresets(): SymmetryPreset[] {
    try {
        return readLocalList(PRESETS_KEY, isSymmetryPreset);
    } catch {
        return [];
    }
}

export function createSymmetryPresetActions(set: Set, get: Get, peers: () => SymmetryPeers) {
    const toast = (message: string) => peers().showToast?.({ message });
    const writePresets = (list: SymmetryPreset[]) => {
        set({ symmetryPresets: list }, false, 'symmetry/presets');
        writeLocalList(PRESETS_KEY, list);
    };
    return {
        symmetryPresets: loadPresets(),

        applySymmetryPreset: (p) => {
            const s = peers();
            set(
                {
                    symmetryOptions: sanitizeSymmetryOptions(PRESET_DEFAULTS.options, {
                        ...p.options,
                        textMode: s.symmetryOptions.textMode,
                        preview: s.symmetryOptions.preview,
                    }),
                    symmetryVariation: sanitizeSymmetryVariation(
                        PRESET_DEFAULTS.variation,
                        p.variation,
                    ),
                    symmetryChain: p.chain.map((st) => ({ ...st, id: newId('step') })),
                },
                false,
                'symmetry/preset',
            );
            s.updateBrush?.({ symmetryAngle: p.symmetryAngle, symmetryCount: p.symmetryCount });
            s.setSymmetry?.(p.symmetry);
        },

        saveSymmetryPreset: (name) => {
            const s = peers();
            const mode = s.symmetry ?? 'none';
            if (mode === 'none') {
                toast('Turn symmetry on before saving a preset.');
                return null;
            }
            const mine = s.symmetryPresets;
            const preset: SymmetryPreset = {
                id: newId('preset'),
                name: (name ?? '').trim().slice(0, 40) || `My symmetry ${mine.length + 1}`,
                group: 'mine',
                symmetry: mode,
                symmetryAngle: s.symmetryAngle ?? 90,
                symmetryCount: s.symmetryCount ?? 6,
                options: { ...s.symmetryOptions },
                chain: s.symmetryChain.map((st) => ({ ...st })),
                variation: { ...s.symmetryVariation },
            };
            writePresets([...mine, preset]);
            return preset;
        },

        deleteSymmetryPreset: async (id) => {
            const s = peers();
            const preset = s.symmetryPresets.find((p) => p.id === id);
            if (!preset) return false;
            const ok = s.confirmDialog
                ? await s.confirmDialog({
                      title: 'Delete preset?',
                      message: `"${preset.name}" will be removed from this browser.`,
                      tone: 'danger',
                  })
                : true;
            if (!ok) return false;
            writePresets(get().symmetryPresets.filter((p) => p.id !== id));
            return true;
        },

        rollSymmetryDice: (seed) => {
            const preset = randomSymmetryPreset(seed ?? Math.floor(Math.random() * 1e6) + 1);
            get().applySymmetryPreset(preset);
            return preset;
        },
    } satisfies Partial<SymmetrySlice>;
}
