import { useStore } from '@store';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { NumberField } from '@/components/atoms/NumberField';
import { Select } from '@/components/atoms/Select';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { ANGLE_STEPS, ISO_PEN_WIDTHS_MM, type DrafterMode } from '@/lib/canvas/drafter';
import type { DrafterStyle } from '@/store/slices/paintTools/paintToolStyles';
import { Bar, Hint, Key } from './drawToolParts';

const MODES: { value: DrafterMode; label: string }[] = [
    { value: 'line', label: 'Line' },
    { value: 'parallel', label: 'Parallel' },
    { value: 'perpendicular', label: 'Perpendicular' },
    { value: 'dimension', label: 'Dimension' },
    { value: 'construction', label: 'Construction line' },
];

/** Drafter (D) options: mode, protractor step, head angle, ISO pen width, colour. */
export function DrafterOptions() {
    const style = useStore((s) => s.drafterStyle);
    const setDrafterStyle = useStore((s) => s.setDrafterStyle);
    const color = useStore((s) => s.color);
    const updateBrush = useStore((s) => s.updateBrush);
    return (
        <Bar label="Drafter" icon="drafter">
            <GlowDivider />
            <PaintTargetSwatch
                id="drafter-color"
                label="Line color"
                value={color}
                onChange={(hex) => updateBrush({ color: hex })}
            />
            <Select<DrafterMode>
                aria-label="Drafter mode"
                size="sm"
                block={false}
                value={style.mode}
                onChange={(mode) => setDrafterStyle({ mode })}
                options={MODES}
            />
            <Select<DrafterStyle['step']>
                aria-label="Angle step"
                size="sm"
                block={false}
                value={style.step}
                onChange={(step) => setDrafterStyle({ step })}
                options={ANGLE_STEPS.map((v) => ({ value: v, label: `${v}°` }))}
            />
            <span className="text-ink-muted">Head</span>
            <NumberField
                aria-label="Head angle"
                title="Rotate the drafting head (degrees)"
                min={0}
                max={359}
                value={style.base}
                onCommit={(base) => setDrafterStyle({ base })}
                stepper="stack"
                size="toolbar"
                className="w-16"
            />
            <Select<DrafterStyle['penMm']>
                aria-label="Pen width"
                size="sm"
                block={false}
                value={style.penMm}
                onChange={(penMm) => setDrafterStyle({ penMm })}
                options={ISO_PEN_WIDTHS_MM.map((v) => ({ value: v, label: `${v} mm` }))}
            />
            <Hint>
                <Key>Alt</Key> free angle · starts snap to line ends
            </Hint>
        </Bar>
    );
}
