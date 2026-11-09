/**
 * One side-panel system for BOTH editor sides (left sidebar = reference, right dock follows):
 * rail width, panel width, rail button recipe, active look and the panel open/close animation.
 */
/** Rail width at the default (md) icon size; the live width is the CSS var --ui-rail. */
export const SIDE_RAIL_WIDTH = 52;
/** CSS width for a rail: follows the icon size setting, falls back to the md width. */
export const railWidthCss = (fallback = SIDE_RAIL_WIDTH) => `var(--ui-rail, ${fallback}px)`;
export const SIDE_PANEL_WIDTH = 360;

/** Panel frame (the column that slides open next to a rail). Add the border side per edge. */
export const sidePanelFrame =
    'flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-line bg-surface ' +
    'transition-[width] duration-200 ease-in-out motion-reduce:transition-none';

/** Rail column (holds the icon buttons). Add the border side per edge. */
export const sideRail =
    'flex h-full min-h-0 shrink-0 flex-col items-center gap-1 border-line bg-surface py-3';

export const buttonBase =
    'inline-flex items-center justify-center rounded-lg transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-primary-500 focus-visible:ring-offset-1 ' +
    'disabled:cursor-not-allowed disabled:opacity-40';

/** Rail button: size + icon follow Settings > Icon size (--ui-rail-btn / --ui-rail-icon). */
export const railButtonBase = `${buttonBase} relative size-[var(--ui-rail-btn)] shrink-0 [&_svg]:size-[var(--ui-rail-icon)]`;

export const activeButton = 'bg-primary-50 text-primary-ink';

export const inactiveButton = 'text-ink-muted hover:bg-surface-muted hover:text-ink';
