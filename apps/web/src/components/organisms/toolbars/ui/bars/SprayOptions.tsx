import { useStore } from '@store';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { NumberField } from '@/components/atoms/NumberField';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { SPRAY_LIMITS } from '@/store/sprayStyle';
import { Bar, BarSlider, Hint } from './drawToolParts';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Spray (Shift + B) options: colour, nozzle size, flow, particle size, softness, opacity. */
export function SprayOptions() {
    const style = useStore((s) => s.sprayStyle);
    const setSprayStyle = useStore((s) => s.setSprayStyle);
    const color = useStore((s) => s.color);
    const updateBrush = useStore((s) => s.updateBrush);
    const L = SPRAY_LIMITS;
    return (
        <Bar label="Spray" icon="spray-can">
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
                value={Math.round(style.flow * 100)}
                format={(v) => `${v}%`}
                onChange={(v) => setSprayStyle({ flow: v / 100 })}
            />
            <BarSlider
                label="Particle"
                min={L.particle.min}
                max={L.particle.max}
                step={0.5}
                unit=" px"
                value={style.particle}
                onChange={(particle) => setSprayStyle({ particle })}
            />
            <BarSlider
                label="Softness"
                min={0}
                max={100}
                value={Math.round(style.softness * 100)}
                format={(v) => `${v}%`}
                onChange={(v) => setSprayStyle({ softness: v / 100 })}
            />
            <BarSlider
                label="Opacity"
                min={5}
                max={100}
                value={Math.round(style.opacity * 100)}
                format={(v) => pct(v / 100)}
                onChange={(v) => setSprayStyle({ opacity: v / 100 })}
            />
            <Hint>Hold still to build up paint</Hint>
        </Bar>
    );
}
