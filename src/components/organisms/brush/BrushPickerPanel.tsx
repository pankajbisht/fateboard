import clsx from 'clsx';
import { useStore } from '@store';
import { BRUSH_ORDER, BRUSH_PRESETS, type BrushType } from '@/store/brushConfig';
import { PanelSection } from '../../molecules/PanelSection';
import { BrushPreview } from './BrushPreview';

/**
 * Left rail "Brush" (B): every brush as a tile with a sample stroke. A click picks the brush and starts
 * painting (Draw tool). Size, color and effects stay in the Draw panel; the Calligraphy pen's options show in
 * the top bar while it is active.
 */
export function BrushPickerPanel() {
    const brush = useStore((s) => s.brush);
    const activeTool = useStore((s) => s.activeTool);
    const setBrush = useStore((s) => s.setBrush);
    const setActiveTool = useStore((s) => s.setActiveTool);

    const pick = (b: BrushType) => {
        setBrush({ brush: b });
        if (activeTool !== 'draw') setActiveTool('draw');
    };

    return (
        <PanelSection
            title="Brushes"
            description="Pick a brush and paint. Size, color and effects are in the Draw panel."
        >
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Brushes">
                {BRUSH_ORDER.map((b) => (
                    <button
                        key={b}
                        type="button"
                        role="radio"
                        aria-checked={brush === b}
                        onClick={() => pick(b)}
                        className={clsx(
                            'flex flex-col items-center gap-0.5 rounded-md border px-1.5 pt-1 pb-1.5 text-xs transition-colors',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
                            brush === b
                                ? 'border-primary-500 bg-primary-50 font-medium text-primary-ink'
                                : 'border-line-strong bg-surface text-ink hover:bg-surface-muted',
                        )}
                    >
                        <BrushPreview brush={b} />
                        {BRUSH_PRESETS[b].label}
                    </button>
                ))}
            </div>
            {brush === 'nib' && (
                <p className="text-caption text-ink-muted">
                    Calligraphy pen: width, thinning, angle, fixation and caps are in the top bar.
                </p>
            )}
        </PanelSection>
    );
}

export default BrushPickerPanel;
