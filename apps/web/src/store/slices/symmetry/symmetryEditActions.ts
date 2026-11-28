/**
 * Symmetry slice: editing reference pins and the Mirror Chain (add / update / reorder / remove).
 */
import { newChainStep } from '@/lib/canvas/symmetryGroups';
import type { SymmetryPin } from '@/lib/canvas/symmetryFrame';
import type { SymmetryPeers, SymmetrySlice } from '../createSymmetrySlice';
import { sanitizeChainStep, symmetryFrameOf } from './symmetrySetup';

type Set = (partial: Partial<SymmetrySlice>, replace: false, action: string) => void;
type Get = () => SymmetrySlice;

export const newSymmetryId = (prefix: string) =>
    `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export function createSymmetryEditActions(set: Set, get: Get, peers: () => SymmetryPeers) {
    return {
        addSymmetryPin: (at) => {
            const s = peers();
            const frame = symmetryFrameOf(s);
            const p = at ?? frame?.center;
            if (!p) return null;
            const id = newSymmetryId('pin');
            const pin: SymmetryPin = {
                id,
                name: `Pin ${s.symmetryPins.length + 1}`,
                x: p.x,
                y: p.y,
                angle: 90,
            };
            set(
                {
                    symmetryPins: [...s.symmetryPins, pin],
                    symmetryPinId: id,
                    symmetrySource: 'pin',
                },
                false,
                'symmetry/addPin',
            );
            return id;
        },

        updateSymmetryPin: (id, patch) => {
            const fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
            set(
                {
                    symmetryPins: get().symmetryPins.map((p) =>
                        p.id !== id
                            ? p
                            : {
                                  ...p,
                                  ...(typeof patch.name === 'string'
                                      ? { name: patch.name.slice(0, 40) || p.name }
                                      : {}),
                                  ...(fin(patch.x) ? { x: patch.x } : {}),
                                  ...(fin(patch.y) ? { y: patch.y } : {}),
                                  ...(fin(patch.angle) ? { angle: patch.angle } : {}),
                              },
                    ),
                },
                false,
                'symmetry/pin',
            );
        },

        pickSymmetryPin: (id: string) => {
            if (!get().symmetryPins.some((p) => p.id === id)) return;
            set({ symmetryPinId: id, symmetrySource: 'pin' }, false, 'symmetry/pickPin');
        },

        removeSymmetryPin: (id) => {
            const s = get();
            const pins = s.symmetryPins.filter((p) => p.id !== id);
            const wasActive = s.symmetryPinId === id;
            set(
                {
                    symmetryPins: pins,
                    symmetryPinId: wasActive ? (pins[0]?.id ?? null) : s.symmetryPinId,
                    symmetrySource: wasActive && !pins.length ? 'free' : s.symmetrySource,
                    symmetryChain: s.symmetryChain.map((st) =>
                        st.pinId === id ? { ...st, pinId: null } : st,
                    ),
                },
                false,
                'symmetry/removePin',
            );
        },

        addSymmetryStep: (kind) => {
            set(
                { symmetryChain: [...get().symmetryChain, newChainStep(kind)] },
                false,
                'symmetry/chain',
            );
            const s = peers();
            if ((s.symmetry ?? 'none') !== 'chain') s.setSymmetry?.('chain');
        },
        updateSymmetryStep: (id, patch) =>
            set(
                {
                    symmetryChain: get().symmetryChain.map((st) =>
                        st.id === id ? sanitizeChainStep(st, patch ?? {}) : st,
                    ),
                },
                false,
                'symmetry/chain',
            ),
        moveSymmetryStep: (id, by) => {
            const list = [...get().symmetryChain];
            const i = list.findIndex((st) => st.id === id);
            const j = i + by;
            if (i < 0 || j < 0 || j >= list.length) return;
            [list[i], list[j]] = [list[j], list[i]];
            set({ symmetryChain: list }, false, 'symmetry/chain');
        },
        removeSymmetryStep: (id) =>
            set(
                { symmetryChain: get().symmetryChain.filter((st) => st.id !== id) },
                false,
                'symmetry/chain',
            ),
    } satisfies Partial<SymmetrySlice>;
}
