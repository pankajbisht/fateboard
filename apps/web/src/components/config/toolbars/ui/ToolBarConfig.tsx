import { Icon } from '@/components/atoms/Icon';
import { useStore } from '@/store';
import { shortcut } from '@/lib/utils/isMac';
import type { CanvasTool } from '@/store/canvasTools';

/**
 * Canvas tools as keyboard commands (same letters as Figma / Illustrator): V = Select, H = Hand,
 * A = Node tool, P = Pen, Shift + P = Pencil (Figma), K = Laser pointer (Excalidraw), B = Brush, Shift + B = Spray,
 * Shift + S = Copy spray (Illustrator's Symbol Sprayer),
 * G = Paint bucket, L = Lasso (Photoshop), D = Drafter, N = Note. Single letters never fire while typing (the shortcut hook skips inputs and the
 * text editor's hidden textarea). The left rail shows the same letters in its tooltips.
 */
const tool = (
    id: string,
    tool: CanvasTool,
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
    tool('tool-node', 'node', 'Node', 'A', 'node-tool'),
    tool('tool-pen', 'pen', 'Pen', 'P', 'pen-tool'),
    tool('tool-pencil', 'pencil', 'Pencil', shortcut('⇧P', 'Shift+P'), 'pencil-line'),
    tool('tool-laser', 'laser', 'Laser pointer', 'K', 'laser-pointer'),
    tool('tool-brush', 'draw', 'Brush', 'B', 'brush-tool'), // paints with the current brush
    tool('tool-spray', 'spray', 'Spray', shortcut('⇧B', 'Shift+B'), 'spray-can'),
    tool('tool-copy-spray', 'copySpray', 'Copy spray', shortcut('⇧S', 'Shift+S'), 'copy-spray'),
    tool('tool-bucket', 'bucket', 'Paint bucket', 'G', 'paint-bucket'), // Photoshop / Krita
    tool('tool-lasso', 'lasso', 'Lasso', 'L', 'lasso'), // Photoshop
    tool('tool-drafter', 'drafter', 'Drafter', 'D', 'drafter'),
    tool('tool-note', 'note', 'Note', 'N', 'note'), // note pins (createNotesSlice)
];
