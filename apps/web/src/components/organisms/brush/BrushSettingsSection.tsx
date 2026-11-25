import { useStore } from '@store';
import { getPreset } from '@/store/brushConfig';
import { stampParamsOf } from '@/store/brushes/stampBrush';
import { STAMP_RANGES } from '@/lib/brushes/stamp/stampParams';
import { Select } from '../../atoms/Select';
import { Field } from '../../molecules/Field';
import { SliderField } from '../../molecules/LabeledSlider';
import LabeledToggle from '../../molecules/LabeledToggle';
import { PanelSection } from '../../molecules/PanelSection';
import { PaintTargetSwatch } from '../../molecules/PaintTargetSwatch';
import { SETTING_GROUPS, type SettingControl } from './brushSettingsConfig';

/**
 * Brush settings of the selected stamp brush (Procreate's Brush Studio): size and opacity, then every engine
 * setting by group. Changes are kept per brush (`stampOverrides`) and apply to the next stroke; Reset goes
 * back to the library's settings.
 */
export function BrushSettingsSection() {
    const brush = useStore((s) => s.brush);
    const width = useStore((s) => s.width);
    const opacity = useStore((s) => s.brushOpacity);
    const overrides = useStore((s) => s.stampOverrides);
    const setStampOverride = useStore((s) => s.setStampOverride);
    const resetStampOverride = useStore((s) => s.resetStampOverride);
    const updateBrush = useStore((s) => s.updateBrush);
    const preset = getPreset(brush);
    if (preset.engine !== 'stamp') return null;
    const params = stampParamsOf({
        brush,
        brushOpacity: opacity,
        smoothing: 0,
        stampOverrides: overrides,
    });
    const changed = !!overrides[brush] && Object.keys(overrides[brush]).length > 0;
    const set = (patch: object) => setStampOverride(brush, patch);

    const control = (c: SettingControl) => {
        if (c.kind === 'switch')
            return (
                <LabeledToggle
                    key={c.key}
                    label={c.label}
                    checked={params[c.key]}
                    onChange={(v) => set({ [c.key]: v })}
                />
            );
        if (c.kind === 'select')
            return (
                <Field key={c.key} label={c.label} inline>
                    <Select
                        aria-label={c.label}
                        size="sm"
                        value={params[c.key]}
                        onChange={(v) => set({ [c.key]: v })}
                        options={c.options}
                    />
                </Field>
            );
        if (c.kind === 'color')
            return (
                <Field key={c.key} label={c.label} inline>
                    <PaintTargetSwatch
                        id="stamp-color2"
                        label={c.label}
                        value={params.color2}
                        onChange={(hex) => set({ color2: hex })}
                    />
                </Field>
            );
        const [min, max] = STAMP_RANGES[c.key];
        const k = c.pct ? 100 : 1;
        return (
            <SliderField
                key={c.key}
                label={c.label}
                min={min * k}
                max={max * k}
                step={c.pct ? Math.max(1, (c.step ?? 0.01) * 100) : (c.step ?? 1)}
                unit={c.pct ? '%' : c.unit}
                value={Math.round(params[c.key] * k * 100) / 100}
                onChange={(v) => set({ [c.key]: v / k })}
            />
        );
    };

    return (
        <>
            <PanelSection
                title={`${preset.label} settings`}
                description="Changes stay with this brush and apply to your next stroke."
                onReset={changed ? () => resetStampOverride(brush) : undefined}
            >
                <SliderField
                    label="Size"
                    min={1}
                    max={preset.maxWidth}
                    unit="px"
                    value={width}
                    onChange={(v) => updateBrush({ width: v })}
                />
                <SliderField
                    label="Opacity"
                    min={5}
                    max={100}
                    unit="%"
                    value={Math.round(opacity * 100)}
                    onChange={(v) => updateBrush({ brushOpacity: v / 100 })}
                />
            </PanelSection>
            {SETTING_GROUPS.map((g) => (
                <PanelSection
                    key={g.title}
                    title={g.title}
                    collapsible
                    defaultOpen={g.title === 'Tip'}
                >
                    {g.controls.map(control)}
                </PanelSection>
            ))}
        </>
    );
}
