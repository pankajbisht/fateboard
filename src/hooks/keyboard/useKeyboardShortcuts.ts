import { useEffect } from 'react';
import { useStore } from '@store';
import { replaceToShortcut } from '@/lib/utils/isMac';

/** Commands allowed from a focused field that has nothing unsaved in it (see below). */
const HISTORY_COMMANDS = new Set(['undo', 'redo']);

/**
 * Focused element that should still hand ⌘Z / ⌘⇧Z to the canvas history:
 * - a field whose value is already applied (`data-history-passthrough`, set by NumberField while
 *   nothing is half-typed): Enter keeps the focus there, ⌘Z must still undo the change;
 * - Fabric's hidden textarea (typing on the canvas): undo finishes the typing session first.
 */
const passesHistoryThrough = (target: HTMLElement) =>
    target.getAttribute?.('data-fabric') === 'textarea' ||
    !!target.closest?.('[data-history-passthrough="true"]');

function buildCombo(e: KeyboardEvent, drag = false) {
    return [
        e.metaKey ? 'Meta' : '',
        e.ctrlKey ? 'Ctrl' : '',
        e.shiftKey ? 'Shift' : '',
        e.altKey ? 'Alt' : '',
        drag ? 'Drag' : '',
        e.code.startsWith('Key') ? e.code.replace('Key', '').toLowerCase() : e.code,
    ]
        .filter(Boolean)
        .join('+');
}

export function useKeyboardShortcuts() {
    const commands = useStore((s) => s.commands);
    const runCommand = useStore((s) => s.runCommand);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target;

            // Skip if the user is typing in an input / textarea / contentEditable,
            // except undo / redo from a field that has nothing unsaved (see passesHistoryThrough)
            const typing =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;
            if (typing && !passesHistoryThrough(target)) return;

            // Build pressed combo string
            // const keyCombo = [
            //     e.metaKey ? 'Meta' : '',
            //     e.ctrlKey ? 'Ctrl' : '',
            //     e.shiftKey ? 'Shift' : '',
            //     e.altKey ? 'Alt' : '',
            //     e.key.length === 1 ? e.key.toLowerCase() : e.key,
            // ]
            //     .filter(Boolean)
            //     .join('+');

            const keyCombo = buildCombo(e);

            // Find matching command
            // const command = commands.find((c) =>
            //     c.shortcut?.some((s) => {
            //         console.log(s.toLowerCase(), keyCombo.toLowerCase())
            //         return s.toLowerCase() === keyCombo.toLowerCase()
            //     }),
            // );
            //
            //

            // if (e.metaKey && (e.code === 'Equal' || e.code === 'Minus')) {
            //     e.preventDefault(); // may not fully stop browser zoom

            //     runCommand(e.code === 'Equal' ? 'zoomIn' : 'zoomOut');
            //     return;
            // }

            const command = commands.find((command) => {
                // console.assert(
                //     replaceToShortcut(command.shortcut) !== replaceToShortcut(keyCombo),
                //     replaceToShortcut(command.shortcut),
                //     replaceToShortcut(keyCombo),
                // );

                // menu-only commands have no shortcut (replaceToShortcut would throw on them and
                // break every shortcut registered after them)
                if (!command.shortcut) return false;
                return replaceToShortcut(command.shortcut) === replaceToShortcut(keyCombo);
            });

            // console.log(commands, keyCombo)

            if (command) {
                if (typing) {
                    if (!HISTORY_COMMANDS.has(command.id)) return;
                    // let go of the field first: it must follow the undone value, not re-apply its own
                    target.blur?.();
                }
                e.preventDefault(); // stop browser default (like Cmd+S)
                runCommand(command.id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [commands, runCommand]);
}
