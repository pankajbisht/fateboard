/**
 * Canvas keyboard shortcuts (global commands, gradient tool, node editor, page / layer keys) are off
 * while a modal dialog is open: a key pressed in a confirm dialog or the template preview must never
 * delete or move things on the canvas behind it (BUG-062 / BUG-061). Every modal in the app sets
 * `aria-modal="true"` (`molecules/Modal`, template preview).
 */
export const canvasKeysBlocked = (): boolean =>
    typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]') !== null;
