import { useStore } from '@store';
import { NumberField } from '@/components/atoms/NumberField';
import { Slider } from '@/components/atoms/Slider';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { PENCIL_LIMITS } from '@/store/pencilStyle';
import { SwitchField } from '@/components/molecules/LabeledToggle';
import { Bar, Hint, Key } from './drawToolParts';

/** Pencil (Shift + P) options: drawing color, size, opacity, smoothing, pressure, auto-close. */
export function PencilOptions() {
    const style = useStore((s) => s.pencilStyle);
    const setPencilStyle = useStore((s) => s.setPencilStyle);
    const color = useStore((s) => s.color);
    const updateBrush = useStore((s) => s.updateBrush);
    const { width, opacity, smoothing } = PENCIL_LIMITS;
    const percent = Math.round(style.opacity * 100);

    return (
        <Bar label="Pencil" icon="pencil-line">
            <GlowDivider />
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
            <Hint>
                <Key>Shift</Key> straight line ·{' '}
                {style.pressure
                    ? 'Auto-close works with Pressure off'
                    : 'end near the start to close a shape'}
            </Hint>
        </Bar>
    );
}
