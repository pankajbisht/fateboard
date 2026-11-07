import { Icon } from '@/components/atoms/Icon';
import { useStore } from '@/store';

/**
 * Canvas tools as keyboard commands (same letters as Figma / Illustrator): V = Select, H = Hand,
 * A = Node tool. Single letters never fire while typing (the shortcut hook skips inputs and the
 * text editor's hidden textarea). The left rail shows the same letters in its tooltips.
 */
const tool = (
    id: string,
    tool: 'select' | 'pan' | 'node',
    label: string,
    key: string,
    icon: Parameters<typeof Icon>[0]['name'],
) => ({
    id,
    label,
    title: `${label} tool`,
    description: `Switch to the ${label} tool`,
    shortcut: key,
    icon: <Icon name={icon} />,
    onClick: () => useStore.getState().setActiveTool(tool),
    handler: ({ get }: { get: typeof useStore.getState }) => get().setActiveTool(tool),
});

export const ToolBarConfig = [
    tool('tool-select', 'select', 'Select', 'V', 'arrow-pointer'),
    tool('tool-hand', 'pan', 'Hand', 'H', 'hand'),
    tool('tool-node', 'node', 'Node', 'A', 'share-nodes'),
];
