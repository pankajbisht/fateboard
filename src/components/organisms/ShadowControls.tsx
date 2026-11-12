import type { ShadowStyle } from '@/lib/fillStyle';
import { SHADOW_PRESETS } from '@/lib/fillStyle';
import { Chip } from '../atoms/Chip';
import { Field } from '../molecules/Field';
import { SliderField } from '../molecules/LabeledSlider';
import LabeledToggle from '../molecules/LabeledToggle';
import { PaintTargetSwatch } from '../molecules/PaintTargetSwatch';

const pct = (v: number) => Math.round(v * 100);

const sameShadow = (a: ShadowStyle, b: ShadowStyle) =>
    a.color === b.color &&
    Math.abs(a.opacity - b.opacity) < 0.01 &&
    a.blur === b.blur &&
    a.offsetX === b.offsetX &&
    a.offsetY === b.offsetY;

/** Fill & Shadow "Shadow" section: on / off, presets, color, opacity, blur, offset. */
export function ShadowControls({
    shadow,
    onChange,
}: {
    shadow: ShadowStyle | null;
    onChange: (s: ShadowStyle | null, history?: boolean) => void;
}) {
    const slider = (key: 'blur' | 'offsetX' | 'offsetY', label: string, min: number, max: number) =>
        shadow && (
            <SliderField
                label={label}
                min={min}
                max={max}
                step={1}
                unit="px"
                value={shadow[key]}
                onChange={(v) => onChange({ ...shadow, [key]: v }, false)}
                onCommit={(v) => onChange({ ...shadow, [key]: v })}
            />
        );

    return (
        <>
            <LabeledToggle
                label="Shadow"
                checked={!!shadow}
                onChange={(on) => onChange(on ? SHADOW_PRESETS[0].shadow : null)}
            />
            {shadow && (
                <>
                    <div className="flex flex-wrap gap-1">
                        {SHADOW_PRESETS.map((p) => (
                            <Chip
                                key={p.id}
                                active={sameShadow(p.shadow, shadow)}
                                onClick={() => onChange(p.shadow)}
                            >
                                {p.label}
                            </Chip>
                        ))}
                    </div>
                    <Field label="Shadow color" inline>
                        <PaintTargetSwatch
                            id="shadow-color"
                            label="Shadow color"
                            value={shadow.color}
                            onChange={(color) => onChange({ ...shadow, color })}
                        />
                    </Field>
                    <SliderField
                        label="Shadow opacity"
                        min={0}
                        max={100}
                        step={1}
                        unit="%"
                        value={pct(shadow.opacity)}
                        onChange={(v) => onChange({ ...shadow, opacity: v / 100 }, false)}
                        onCommit={(v) => onChange({ ...shadow, opacity: v / 100 })}
                    />
                    {slider('blur', 'Blur', 0, 100)}
                    {slider('offsetX', 'Offset X', -100, 100)}
                    {slider('offsetY', 'Offset Y', -100, 100)}
                </>
            )}
        </>
    );
}
