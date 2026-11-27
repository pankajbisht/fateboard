import { useStore } from '@store';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { SliderField } from '@/components/molecules/LabeledSlider';
import { SwitchField } from '@/components/molecules/LabeledToggle';
import { ToolbarPopover } from '@/components/molecules/ToolbarPopover';
import { COPY_SPRAY_LIMITS as L, DEFAULT_COPY_SPRAY_STYLE as D } from '@/lib/canvas/copySpray';
import { Bar, BarSlider, Hint, Key, ALT } from './drawToolParts';
import { SprayModeSelect } from './SprayModeSelect';

const pct = (v: number) => `${v}%`;
const toPct = (v: number) => Math.round(v * 100);

/**
 * Spray (Shift + B) options in Copy mode. The bar keeps the source and what you change often (size, spread); the
 * finer variation (spacing, size / turn / opacity jitter, align to the drag) sits in the "Variation" panel. The
 * source is the selection made before Copy mode, or the object clicked (Alt + click swaps it).
 */
export function CopySprayOptions() {
    const style = useStore((s) => s.copySprayStyle);
    const set = useStore((s) => s.setCopySprayStyle);
    const source = useStore((s) => s.copySpraySource);
    return (
        <Bar label="Spray" icon="copy-spray">
            <GlowDivider />
            <SprayModeSelect />
            <span
                role="status"
                className={
                    source
                        ? 'flex items-center gap-1 text-ink-muted'
                        : 'rounded-md bg-primary-100 px-2 py-0.5 font-medium text-primary-ink'
                }
            >
                {source ? (
                    <>
                        Spraying <span className="font-semibold text-ink">{source}</span>
                    </>
                ) : (
                    'Click an object to spray copies of it'
                )}
            </span>
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
                label="Spread"
                min={0}
                max={toPct(L.spread.max)}
                step={5}
                value={toPct(style.spread)}
                format={pct}
                onChange={(v) => set({ spread: v / 100 })}
            />
            <ToolbarPopover label="Copy variation" trigger="Variation" className="w-64">
                <SliderField
                    label="Spacing"
                    min={toPct(L.spacing.min)}
                    max={toPct(L.spacing.max)}
                    step={5}
                    value={toPct(style.spacing)}
                    defaultValue={toPct(D.spacing)}
                    format={pct}
                    hint="Gap between copies along the drag"
                    onChange={(v) => set({ spacing: v / 100 })}
                />
                <SliderField
                    label="Size jitter"
                    min={0}
                    max={100}
                    value={toPct(style.sizeJitter)}
                    defaultValue={toPct(D.sizeJitter)}
                    format={pct}
                    onChange={(v) => set({ sizeJitter: v / 100 })}
                />
                <SliderField
                    label="Rotation jitter"
                    min={0}
                    max={L.rotateJitter.max}
                    value={Math.round(style.rotateJitter)}
                    defaultValue={D.rotateJitter}
                    unit="°"
                    onChange={(rotateJitter) => set({ rotateJitter })}
                />
                <SliderField
                    label="Opacity jitter"
                    min={0}
                    max={100}
                    value={toPct(style.opacityJitter)}
                    defaultValue={toPct(D.opacityJitter)}
                    format={pct}
                    onChange={(v) => set({ opacityJitter: v / 100 })}
                />
                <SwitchField
                    label="Align to stroke"
                    checked={style.align}
                    onChange={(align) => set({ align })}
                />
            </ToolbarPopover>
            <Hint>
                Click an object, then drag to spray it · <Key>{ALT}</Key> + click picks another ·
                Spread scatters copies around the pointer · <Key>Esc</Key> Select tool
            </Hint>
        </Bar>
    );
}
