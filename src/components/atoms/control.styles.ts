/**
 * Shared class recipes for form controls, so every atom has the same height, border, radius,
 * colors and focus ring (light + dark via semantic tokens). See docs/DESIGN.md.
 */

/** Keyboard focus ring (mouse clicks do not show it). */
export const FOCUS_RING =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-surface';

/** Height + text size per control size. `sm` is for dense rows, `md` is the default. */
export const CONTROL_SIZE = {
    sm: 'h-7 text-xs',
    md: 'h-8 text-xs',
} as const;

export type ControlSize = keyof typeof CONTROL_SIZE;

/** Bordered box used by inputs, selects and number fields. */
export const CONTROL_BOX = [
    'rounded-md border border-line-strong bg-surface text-ink',
    'transition-colors hover:border-ink-subtle',
    'focus-visible:outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-400/30',
    'disabled:cursor-not-allowed disabled:opacity-50 dark:disabled:opacity-60 disabled:hover:border-line-strong',
    // inside a group that is already faded as a whole (data-dimmed), don't fade twice
    '[[data-dimmed]_&]:disabled:opacity-100',
].join(' ');
