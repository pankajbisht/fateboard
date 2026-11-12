import { useStore } from '@/store';
import { ARRANGE_RULES, readSelection } from '@/lib/canvas/arrange';

export type ArrangeRule = keyof typeof ARRANGE_RULES;

/** `when` / `enabled` for an arrange command: the same rule the header bars use (BUG-192). */
export const arrangeWhen = (rule: ArrangeRule) => () =>
    ARRANGE_RULES[rule](readSelection(useStore.getState().canvas));
