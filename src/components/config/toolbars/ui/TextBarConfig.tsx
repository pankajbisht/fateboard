import { useStore } from '@/store';
import { shortcut } from '@/lib/utils/isMac';
import { readActiveText } from '@/hooks/useActiveText';

/**
 * ⌘B / ⌘I / ⌘U (Ctrl+B / I / U) for the selected text, also while typing on the canvas (BUG-096).
 * Toggle like the text float's B / I / U buttons and go through `updateText` (highlighted characters
 * only while typing; one undo step). With no text selected the browser keeps the key.
 */
const textSelected = () => !!readActiveText(useStore.getState().canvas);

const toggle = (
    props: (t: NonNullable<ReturnType<typeof readActiveText>>) => Record<string, unknown>,
) => {
    const t = readActiveText(useStore.getState().canvas);
    if (t) useStore.getState().updateText(props(t));
};

export const TextBarConfig = [
    {
        id: 'text-bold',
        label: 'Bold',
        title: 'Bold text',
        description: 'Make the selected text bold (or not)',
        shortcut: shortcut('⌘B', 'Ctrl+b'),
        enabled: textSelected,
        allowWhileTyping: true,
        handler: () => toggle((t) => ({ fontWeight: t.bold ? 'normal' : 'bold' })),
    },
    {
        id: 'text-italic',
        label: 'Italic',
        title: 'Italic text',
        description: 'Make the selected text italic (or not)',
        shortcut: shortcut('⌘I', 'Ctrl+i'),
        enabled: textSelected,
        allowWhileTyping: true,
        handler: () => toggle((t) => ({ fontStyle: t.italic ? 'normal' : 'italic' })),
    },
    {
        id: 'text-underline',
        label: 'Underline',
        title: 'Underline text',
        description: 'Underline the selected text (or not)',
        shortcut: shortcut('⌘U', 'Ctrl+u'),
        enabled: textSelected,
        allowWhileTyping: true,
        handler: () => toggle((t) => ({ underline: !t.underline })),
    },
];
