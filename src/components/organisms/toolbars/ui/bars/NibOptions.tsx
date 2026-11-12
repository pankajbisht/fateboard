import { useStore } from '@store';
import { NumberField } from '@/components/atoms/NumberField';
import { Slider } from '@/components/atoms/Slider';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { getPreset } from '@/store/brushConfig';
import { Bar, Hint, Key } from './drawToolParts';

/** One labelled slider of the bar; `percent` shows 0-1 values as %. */
function NibSlider({
    label,
    value,
    min,
    max,
    unit,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    onChange: (v: number) => void;
}) {
    return (
        <span className="flex items-center gap-1.5 text-ink-muted">
            {label}
            <Slider
                aria-label={`Calligraphy ${label.toLowerCase()}`}
                aria-valuetext={`${value}${unit}`}
                min={min}
                max={max}
                value={value}
                onChange={onChange}
                className="w-16"
            />
            <span className="w-9 tabular-nums text-ink">
                {value}
                {unit}
            </span>
        </span>
    );
}

/**
 * Calligraphy pen options (brush `nib`, Inkscape's Calligraphy tool), shown while drawing with it: color,
 * width, thinning, angle, fixation, caps.
 */
export function NibOptions() {
    const style = useStore((s) => s.nibStyle);
    const setNibStyle = useStore((s) => s.setNibStyle);
    const color = useStore((s) => s.color);
    const width = useStore((s) => s.width);
    const updateBrush = useStore((s) => s.updateBrush);
    const pct = (v: number) => Math.round(v * 100);

    return (
        <Bar label="Calligraphy" icon="paintbrush">
            <GlowDivider />
            <PaintTargetSwatch
                id="nib-color"
                label="Calligraphy color"
                value={color}
                onChange={(hex) => updateBrush({ color: hex })}
            />
            <span className="text-ink-muted">Width</span>
            <NumberField
                aria-label="Calligraphy width"
                title="Nib width (px)"
                min={1}
                max={getPreset('nib').maxWidth}
                value={width}
                onCommit={(w) => updateBrush({ width: w })}
                stepper="stack"
                size="toolbar"
                className="w-16"
            />
            <NibSlider
                label="Thinning"
                min={-100}
                max={100}
                unit="%"
                value={pct(style.thinning)}
                onChange={(v) => setNibStyle({ thinning: v / 100 })}
            />
            <NibSlider
                label="Angle"
                min={-90}
                max={90}
                unit="°"
                value={style.angle}
                onChange={(angle) => setNibStyle({ angle })}
            />
            <NibSlider
                label="Fixation"
                min={0}
                max={100}
                unit="%"
                value={pct(style.fixation)}
                onChange={(v) => setNibStyle({ fixation: v / 100 })}
            />
            <NibSlider
                label="Caps"
                min={0}
                max={50}
                unit=""
                value={Math.round(style.caps * 10)}
                onChange={(v) => setNibStyle({ caps: v / 10 })}
            />
            <Hint>
                Fast strokes get thinner with Thinning · Fixation 100% keeps the nib angle ·{' '}
                <Key>Shift</Key> straight line
            </Hint>
        </Bar>
    );
}
