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

/**
 * Panel width (BUG-215). Wide screens: the panel sits next to its rail at `--panel-w` (0 when
 * closed) and the canvas gets the rest. Below `lg` (tablets, phones) it overlays the canvas next to
 * its rail instead of squeezing it, never wider than the screen minus the rail column it hangs from
 * (`100%` = the containing rail column).
 */
const panelSize =
    'w-[var(--panel-w)] max-lg:absolute max-lg:inset-y-0 max-lg:z-30 max-lg:transition-none';
/** Left panel: right of the left rail; it may cover the dock (the left sidebar sits above it). */
export const leftPanelSize = `${panelSize} max-lg:left-full max-lg:w-[min(var(--panel-w),calc(100vw_-_100%))]`;
/** Dock panel: left of the dock, and it leaves the left rail (`--ui-rail`) uncovered. */
export const dockPanelSize = `${panelSize} max-lg:right-full max-lg:w-[min(var(--panel-w),calc(100vw_-_100%_-_var(--ui-rail,52px)))]`;

/**
 * Upright phones (below `sm`, BUG-219): the board gets the full width. Rails become bars under it
 * (`phoneRailBar`) and a panel is a bottom sheet over the board, above its bar (`phoneSheet`;
 * add `phoneSheetClosed` while it is closed, its width no longer hides it).
 */
export const phoneRailBar =
    'max-sm:h-auto max-sm:w-full! max-sm:flex-row max-sm:px-2 max-sm:py-1 max-sm:border-x-0 max-sm:border-t';
export const phoneSheet =
    'max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-full max-sm:h-[55dvh] max-sm:w-full ' +
    'max-sm:rounded-t-xl max-sm:border-x-0 max-sm:border-t max-sm:shadow-xl';
export const phoneSheetClosed = 'max-sm:hidden';
/** The accent bar of an active rail button: on the outer edge, under the button on a phone bar. */
export const phoneActiveBar =
    'max-sm:inset-x-2 max-sm:top-auto max-sm:bottom-0 max-sm:h-[3px] max-sm:w-auto max-sm:rounded-none max-sm:rounded-t';

/** The panel's content keeps its full width while the frame animates (no reflow) on wide screens. */
export const panelInner = 'h-full w-[var(--panel-full)] max-lg:w-full';

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
