import { useEffect } from 'react';
import { useStore } from '@store';
import { replaceToShortcut } from '@/lib/utils/isMac';
import { canvasKeysBlocked } from '@/lib/keyboard/modalOpen';

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
            if (canvasKeysBlocked()) return; // a modal dialog owns the keyboard (BUG-062)

            // Skip if the user is typing in an input / textarea / contentEditable,
            // except undo / redo from a field that has nothing unsaved (see passesHistoryThrough)
            const typing =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;
            if (typing && !passesHistoryThrough(target)) return;

            const keyCombo = replaceToShortcut(buildCombo(e));

            // menu-only commands have no shortcut (replaceToShortcut would throw on them and break
            // every shortcut registered after them); `keys` are extra combos (Delete, BUG-103)
            const command = commands.find((c) => {
                const combos = [c.shortcut, ...((c.keys as string[] | undefined) ?? [])].filter(
                    (k): k is string => typeof k === 'string' && k.length > 0,
                );
                return combos.some((k) => replaceToShortcut(k) === keyCombo);
            });

            // not available right now (e.g. ⌘B with no text selected): leave the key to the browser
            if (command && typeof command.enabled === 'function' && !command.enabled()) return;

            if (command) {
                if (typing) {
                    const onCanvasText = target.getAttribute?.('data-fabric') === 'textarea';
                    if (command.allowWhileTyping && onCanvasText) {
                        e.preventDefault();
                        runCommand(command.id);
                        return;
                    }
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
