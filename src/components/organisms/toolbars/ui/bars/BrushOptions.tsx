import { useStore } from '@store';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import type { SelectOption } from '@/components/atoms/Select';
import { BRUSH_ORDER, brushCategory, getPreset } from '@/store/brushConfig';
import { BRUSH_CATEGORIES, STAMP_BRUSH_IDS } from '@/store/brushLibrary';
import { Bar, BarSelect, BarSlider, Hint, Key } from './drawToolParts';

/** Every brush, grouped by library category (the same order as the Brush panel). */
const ALL_BRUSHES = [...BRUSH_ORDER, ...STAMP_BRUSH_IDS] as string[];
const BRUSH_OPTIONS: SelectOption<string>[] = BRUSH_CATEGORIES.flatMap((c) =>
    ALL_BRUSHES.filter((b) => brushCategory(b) === c.id).map((b) => ({
        value: b,
        label: getPreset(b).label,
        group: c.label,
    })),
);

/** Brush (B) / eraser options in the property bar: which brush, size, opacity, smoothing. */
export function BrushOptions() {
    const brush = useStore((s) => s.brush);
    const width = useStore((s) => s.width);
    const opacity = useStore((s) => s.brushOpacity);
    const smoothing = useStore((s) => s.smoothing);
    const setBrush = useStore((s) => s.setBrush);
    const updateBrush = useStore((s) => s.updateBrush);
    const eraser = brush === 'eraser';
    const percent = Math.round(opacity * 100);

    return (
        <Bar label={eraser ? 'Eraser' : 'Brush'} icon={eraser ? 'eraser' : 'brush-tool'}>
            <GlowDivider />
            <BarSelect<string>
                label="Brush"
                value={brush}
                options={BRUSH_OPTIONS}
                onChange={(b) => setBrush({ brush: b })}
            />
            <BarSlider
                label="Size"
                min={1}
                max={getPreset(brush).maxWidth}
                value={width}
                unit="px"
                onChange={(v) => updateBrush({ width: v })}
            />
            {!eraser && (
                <BarSlider
                    label="Opacity"
                    min={1}
                    max={100}
                    value={percent}
                    unit="%"
                    onChange={(v) => updateBrush({ brushOpacity: v / 100 })}
                />
            )}
            <BarSlider
                label="Smoothing"
                min={0}
                max={10}
                value={smoothing}
                onChange={(v) => updateBrush({ smoothing: v })}
            />
            <Hint>
                <Key>B</Key> opens the brush library with every setting
            </Hint>
        </Bar>
    );
}
