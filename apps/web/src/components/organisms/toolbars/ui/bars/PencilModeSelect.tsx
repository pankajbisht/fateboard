import { useStore } from '@store';
import { PENCIL_MODES, type PencilMode } from '@/store/pencilStyle';
import { BarSelect } from './drawToolParts';

/**
 * The Pencil's mode (Pencil, Highlighter, Dashed, Smart shape, Eraser, Laser): first control of the
 * Pencil bar. Laser is its own tool (K) underneath, so picking it switches the tool, and picking a
 * drawing mode while the laser is on goes back to the Pencil.
 */
export function PencilModeSelect() {
    const tool = useStore((s) => s.activeTool);
    const mode = useStore((s) => s.pencilStyle.mode);
    const setPencilStyle = useStore((s) => s.setPencilStyle);
    const setActiveTool = useStore((s) => s.setActiveTool);
    return (
        <BarSelect<PencilMode | 'laser'>
            label="Pencil mode"
            value={tool === 'laser' ? 'laser' : mode}
            options={PENCIL_MODES}
            onChange={(next) => {
                if (next === 'laser') {
                    setActiveTool('laser');
                    return;
                }
                setPencilStyle({ mode: next });
                if (tool !== 'pencil') setActiveTool('pencil');
            }}
        />
    );
}
