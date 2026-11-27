import { useStore } from '@store';
import { SHADOW_PRESETS, getEngine, toHex6 } from '@store/brushConfig';
import { Button } from '../../atoms/Button';
import { SliderField } from '../../molecules/LabeledSlider';
import LabeledToggle from '../../molecules/LabeledToggle';
import { PanelSection } from '../../molecules/PanelSection';
import { PaintTargetSwatch } from '../../molecules/PaintTargetSwatch';

/** Shadow and glow of a classic brush (presets, blur, offset, opacity, color). */
export function BrushShadowSection() {
    const brush = useStore((s) => s.brush);
    const shadowBlur = useStore((s) => s.shadowBlur);
    const shadowOffsetX = useStore((s) => s.shadowOffsetX);
    const shadowOffsetY = useStore((s) => s.shadowOffsetY);
    const shadowColor = toHex6(useStore((s) => s.brushShadowColor));
    const shadowOpacity = useStore((s) => s.shadowOpacity);
    const shadowMatchColor = useStore((s) => s.shadowMatchColor);
    const updateBrush = useStore((s) => s.updateBrush);
    const shadowActive = shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0;

    return (
        <PanelSection title="Shadow and glow">
            <div className="grid grid-cols-4 gap-1.5">
                {SHADOW_PRESETS.map((p) => (
                    <Button
                        key={p.label}
                        variant="secondary"
                        size="sm"
                        className="px-1"
                        onClick={() => updateBrush(p.values)}
                    >
                        {p.label}
                    </Button>
                ))}
            </div>
            <SliderField
                label="Blur"
                value={shadowBlur}
                min={0}
                max={60}
                unit="px"
                onChange={(v) => updateBrush({ shadowBlur: v })}
            />
            <div className="grid grid-cols-2 gap-3">
                <SliderField
                    label="Offset X"
                    value={shadowOffsetX}
                    min={-60}
                    max={60}
                    onChange={(v) => updateBrush({ shadowOffsetX: v })}
                />
                <SliderField
                    label="Offset Y"
                    value={shadowOffsetY}
                    min={-60}
                    max={60}
                    onChange={(v) => updateBrush({ shadowOffsetY: v })}
                />
            </div>
            <SliderField
                label="Shadow opacity"
                value={Math.round(shadowOpacity * 100)}
                min={5}
                max={100}
                unit="%"
                onChange={(v) => updateBrush({ shadowOpacity: v / 100 })}
            />
            <LabeledToggle
                label="Use brush color"
                hint="On = glow, off = pick a shadow color"
                checked={shadowMatchColor}
                onChange={(v) => updateBrush({ shadowMatchColor: v })}
            />
            {!shadowMatchColor && (
                <PaintTargetSwatch
                    id="brush-shadow"
                    label="Shadow color"
                    value={shadowColor}
                    showLabel
                    onChange={(hex) => updateBrush({ brushShadowColor: hex })}
                />
            )}
            {getEngine(brush) === 'neon' && !shadowActive && (
                <p className="text-caption text-ink-subtle">
                    Neon glows by default; set a shadow here to override it.
                </p>
            )}
        </PanelSection>
    );
}
