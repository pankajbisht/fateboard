import { useEffect } from 'react';
import { useStore } from '@store';
import { replaceToShortcut } from '@/lib/utils/isMac';

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

            // ✅ Skip if user is typing in input/textarea/contentEditable
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

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

                return replaceToShortcut(command.shortcut) === replaceToShortcut(keyCombo);
            });

            // console.log(commands, keyCombo)

            if (command) {
                e.preventDefault(); // stop browser default (like Cmd+S)
                runCommand(command.id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [commands, runCommand]);
}
