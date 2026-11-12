import { useEffect, useReducer } from 'react';
import { useStore } from '@store';
import { ARRANGE_RULES, readSelection, type SelectionState } from '@/lib/canvas/arrange';

const EVENTS = ['selection:created', 'selection:updated', 'selection:cleared'] as const;

/**
 * Live selection facts for the arrange tools (header Align / Group / Lock), read from the Fabric canvas
 * (source of truth). Re-reads on selection events and when an action rebuilds the layer list (lock,
 * group and align change the objects without changing the selection).
 */
export function useArrangeState(): SelectionState {
    const canvas = useStore((s) => s.canvas);
    useStore((s) => s.layers);
    const [, bump] = useReducer((n: number) => n + 1, 0);

    useEffect(() => {
        if (!canvas) return;
        EVENTS.forEach((e) => canvas.on(e, bump));
        return () => EVENTS.forEach((e) => canvas.off(e, bump));
    }, [canvas]);

    return readSelection(canvas);
}

/** `can('group')`, `can('ungroup')`…: the arrange rules (`ARRANGE_RULES`) on the live selection. */
export function useArrangeCan(): (rule: keyof typeof ARRANGE_RULES) => boolean {
    const state = useArrangeState();
    return (rule) => ARRANGE_RULES[rule](state);
}
