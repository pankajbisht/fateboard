import { useStore } from '@store';
import { NumberField } from '@/components/atoms/NumberField';
import { Slider } from '@/components/atoms/Slider';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { PENCIL_LIMITS } from '@/store/pencilStyle';
import { SwitchField } from '@/components/molecules/LabeledToggle';
import { Bar, Hint, Key, SHIFT } from './drawToolParts';
import { PencilModeSelect } from './PencilModeSelect';

/** One-line hint per mode. */
const MODE_HINT: Record<string, string> = {
    highlighter: 'a wide see-through marker that keeps what is under it readable',
    dashed: 'draws a dashed line',
    shape: 'draw a rough line, circle, box or triangle: it snaps to a clean shape',
    eraser: 'removes every hand-drawn stroke it touches',
};

/**
 * Pencil (Shift + P) options: mode, drawing color, size, opacity, smoothing; pressure and auto-close for
 * the plain Pencil. With the laser on (Mode › Laser, or K) only the mode and a hint show.
 */
export function PencilOptions() {
    const tool = useStore((s) => s.activeTool);
    const style = useStore((s) => s.pencilStyle);
    const setPencilStyle = useStore((s) => s.setPencilStyle);
    const color = useStore((s) => s.color);
    const updateBrush = useStore((s) => s.updateBrush);
    const { width, opacity, smoothing } = PENCIL_LIMITS;
    const percent = Math.round(style.opacity * 100);
    const plain = style.mode === 'pencil';

    if (tool === 'laser')
        return (
            <Bar label="Pencil" icon="pencil-line">
                <GlowDivider />
                <PencilModeSelect />
                <Hint>
                    <Key>K</Key> laser: drag to point, the red trail fades and adds nothing
                </Hint>
            </Bar>
        );

    return (
        <Bar label="Pencil" icon="pencil-line">
            <GlowDivider />
            <PencilModeSelect />
            <PaintTargetSwatch
                id="pencil-color"
                label="Drawing color"
                value={color}
                onChange={(hex) => updateBrush({ color: hex })}
            />
            <span className="text-ink-muted">Size</span>
            <NumberField
                aria-label="Pencil size"
                title="Line thickness (px)"
                min={width.min}
                max={width.max}
                value={style.width}
                onCommit={(w) => setPencilStyle({ width: w })}
                stepper="stack"
                size="toolbar"
                className="w-16"
            />
            <span className="flex items-center gap-1.5 text-ink-muted">
                Opacity
                <Slider
                    aria-label="Pencil opacity"
                    aria-valuetext={`${percent}%`}
                    min={opacity.min * 100}
                    max={opacity.max * 100}
                    value={percent}
                    onChange={(v) => setPencilStyle({ opacity: v / 100 })}
                    className="w-20"
                />
                <span className="w-8 tabular-nums text-ink">{percent}%</span>
            </span>
            <span className="flex items-center gap-1.5 text-ink-muted">
                Smoothing
                <Slider
                    aria-label="Pencil smoothing"
                    min={smoothing.min}
                    max={smoothing.max}
                    value={style.smoothing}
                    onChange={(v) => setPencilStyle({ smoothing: v })}
                    className="w-20"
                />
            </span>
            {plain && (
                <>
                    <GlowDivider />
                    <SwitchField
                        label="Pressure"
                        className="[&>div]:min-h-0"
                        checked={style.pressure}
                        onChange={(pressure) => setPencilStyle({ pressure })}
                    />
                    <SwitchField
                        label="Auto-close"
                        disabled={style.pressure}
                        className="[&>div]:min-h-0"
                        checked={style.autoClose}
                        onChange={(autoClose) => setPencilStyle({ autoClose })}
                    />
                </>
            )}
            <Hint>
                {plain ? (
                    <>
                        <Key>{SHIFT}</Key> straight line ·{' '}
                        {style.pressure
                            ? 'Auto-close works with Pressure off'
                            : 'end near the start to close a shape'}
                    </>
                ) : (
                    MODE_HINT[style.mode]
                )}
            </Hint>
        </Bar>
    );
}
