import { useStore } from '@store';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { SwitchField } from '@/components/molecules/LabeledToggle';
import { COPY_SPRAY_LIMITS as L } from '@/lib/canvas/copySpray';
import { Bar, BarSlider, Hint, Key } from './drawToolParts';

const pct = (v: number) => `${v}%`;
const toPct = (v: number) => Math.round(v * 100);

/**
 * Copy spray (Shift + S) options: copy size, spacing along the drag, spread around the pointer, size / turn /
 * opacity jitter, align to the drag. Sprays copies of the selection made before the tool was chosen.
 */
export function CopySprayOptions() {
    const style = useStore((s) => s.copySprayStyle);
    const set = useStore((s) => s.setCopySprayStyle);
    return (
        <Bar label="Copy spray" icon="copy-spray">
            <GlowDivider />
            <BarSlider
                label="Size"
                min={toPct(L.scale.min)}
                max={toPct(L.scale.max)}
                step={5}
                value={toPct(style.scale)}
                format={pct}
                onChange={(v) => set({ scale: v / 100 })}
            />
            <BarSlider
                label="Spacing"
                min={toPct(L.spacing.min)}
                max={toPct(L.spacing.max)}
                step={5}
                value={toPct(style.spacing)}
                format={pct}
                onChange={(v) => set({ spacing: v / 100 })}
            />
            <BarSlider
                label="Spread"
                min={0}
                max={toPct(L.spread.max)}
                step={5}
                value={toPct(style.spread)}
                format={pct}
                onChange={(v) => set({ spread: v / 100 })}
            />
            <GlowDivider />
            <BarSlider
                label="Size jitter"
                min={0}
                max={100}
                value={toPct(style.sizeJitter)}
                format={pct}
                onChange={(v) => set({ sizeJitter: v / 100 })}
            />
            <BarSlider
                label="Rotation jitter"
                min={0}
                max={L.rotateJitter.max}
                value={Math.round(style.rotateJitter)}
                unit="°"
                onChange={(rotateJitter) => set({ rotateJitter })}
            />
            <BarSlider
                label="Opacity jitter"
                min={0}
                max={100}
                value={toPct(style.opacityJitter)}
                format={pct}
                onChange={(v) => set({ opacityJitter: v / 100 })}
            />
            <SwitchField
                label="Align to stroke"
                className="[&>div]:min-h-0"
                checked={style.align}
                onChange={(align) => set({ align })}
            />
            <Hint>
                Select objects, then <Key>Shift</Key> + <Key>S</Key> and drag · <Key>Esc</Key>{' '}
                Select tool
            </Hint>
        </Bar>
    );
}
