import { useStore } from '@store';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { NumberField } from '@/components/atoms/NumberField';
import { SliderField } from '@/components/molecules/LabeledSlider';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { ToolbarPopover } from '@/components/molecules/ToolbarPopover';
import { DEFAULT_SPRAY_STYLE, SPRAY_LIMITS } from '@/store/sprayStyle';
import { Bar, BarSlider, Hint } from './drawToolParts';
import { SprayModeSelect } from './SprayModeSelect';

const pct = (v: number) => `${v}%`;
const toPct = (v: number) => Math.round(v * 100);

/**
 * Spray (Shift + B) options in the paint modes (Paint, Mist, Splatter). The bar keeps what you change often
 * (mode, colour, size, flow); the finer texture (particle, softness, opacity) sits in the "Texture" panel.
 * Copy mode shows CopySprayOptions.
 */
export function SprayOptions() {
    const style = useStore((s) => s.sprayStyle);
    const setSprayStyle = useStore((s) => s.setSprayStyle);
    const color = useStore((s) => s.color);
    const updateBrush = useStore((s) => s.updateBrush);
    const L = SPRAY_LIMITS;
    const D = DEFAULT_SPRAY_STYLE;
    return (
        <Bar label="Spray" icon="spray-can">
            <GlowDivider />
            <SprayModeSelect />
            <GlowDivider />
            <PaintTargetSwatch
                id="spray-color"
                label="Spray color"
                value={color}
                onChange={(hex) => updateBrush({ color: hex })}
            />
            <span className="text-ink-muted">Size</span>
            <NumberField
                aria-label="Spray size"
                title="Nozzle diameter (px)"
                min={L.size.min}
                max={L.size.max}
                value={style.size}
                onCommit={(size) => setSprayStyle({ size })}
                stepper="stack"
                size="toolbar"
                className="w-16"
            />
            <BarSlider
                label="Flow"
                min={5}
                max={100}
                value={toPct(style.flow)}
                format={pct}
                onChange={(v) => setSprayStyle({ flow: v / 100 })}
            />
            <ToolbarPopover label="Spray texture" trigger="Texture" className="w-64">
                <SliderField
                    label="Particle"
                    min={L.particle.min}
                    max={L.particle.max}
                    step={0.5}
                    unit=" px"
                    value={style.particle}
                    defaultValue={D.particle}
                    hint="Size of each drop"
                    onChange={(particle) => setSprayStyle({ particle })}
                />
                <SliderField
                    label="Softness"
                    min={0}
                    max={100}
                    value={toPct(style.softness)}
                    defaultValue={toPct(D.softness)}
                    format={pct}
                    hint="Denser in the middle, fainter at the edge"
                    onChange={(v) => setSprayStyle({ softness: v / 100 })}
                />
                <SliderField
                    label="Opacity"
                    min={5}
                    max={100}
                    value={toPct(style.opacity)}
                    defaultValue={toPct(D.opacity)}
                    format={pct}
                    onChange={(v) => setSprayStyle({ opacity: v / 100 })}
                />
            </ToolbarPopover>
            <Hint>Hold still to build up paint</Hint>
        </Bar>
    );
}
