/**
 * Canvas keyboard shortcuts (global commands, gradient tool, node editor, page / layer keys) are off
 * while a modal dialog is open: a key pressed in a confirm dialog or the template preview must never
 * delete or move things on the canvas behind it (BUG-062 / BUG-061). Every modal in the app sets
 * `aria-modal="true"` (`molecules/Modal`, template preview).
 */
export const canvasKeysBlocked = (): boolean =>
    typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]') !== null;

const USES_ARROW_KEYS =
    '[role="radiogroup"], [role="slider"], [role="tablist"], [role="menu"], [role="listbox"]';

/** The focused control moves its own value or items with the arrow keys. */
export const arrowKeysOwnedByFocus = (): boolean =>
    document.activeElement?.closest(USES_ARROW_KEYS) != null;
