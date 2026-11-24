import { shortcut } from '@/lib/utils/isMac';

/**
 * Show / hide the timeline: ⌘⌥T, as in Adobe Animate (Window › Timeline). The same string is the command's
 * `shortcut` and the text in tooltips (letter keys are written bare: the matcher drops `Key` from codes).
 */
export const TIMELINE_KEYS = shortcut('⌘⌥T', 'Ctrl+Alt+T');
/** `/draw?tab=animate` opens the timeline (it was a right-dock tab until 2026-11-17; Help links use it). */
export const TIMELINE_LINK_TAB = 'animate';
