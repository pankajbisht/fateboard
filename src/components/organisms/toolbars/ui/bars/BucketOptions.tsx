import { useStore } from '@store';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { Bar, BarSlider, Hint } from './drawToolParts';

/** Paint bucket (G) options: colour, what a click fills, tolerance, gap closing, expand, placement. */
export function BucketOptions() {
    const style = useStore((s) => s.bucketStyle);
    const setBucketStyle = useStore((s) => s.setBucketStyle);
    const color = useStore((s) => s.color);
    const updateBrush = useStore((s) => s.updateBrush);
    return (
        <Bar label="Paint bucket" icon="paint-bucket">
            <GlowDivider />
            <PaintTargetSwatch
                id="bucket-color"
                label="Fill color"
                value={color}
                onChange={(hex) => updateBrush({ color: hex })}
            />
            <SegmentedControl<'auto' | 'region' | 'shape'>
                aria-label="Fill"
                size="sm"
                block={false}
                className="[&>button]:flex-none [&>button]:px-2.5"
                value={style.mode}
                onChange={(mode) => setBucketStyle({ mode })}
                options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'region', label: 'Area' },
                    { value: 'shape', label: 'Shape' },
                ]}
            />
            <BarSlider
                label="Tolerance"
                min={0}
                max={255}
                value={style.tolerance}
                onChange={(tolerance) => setBucketStyle({ tolerance })}
            />
            <BarSlider
                label="Gap"
                min={0}
                max={20}
                unit=" px"
                value={style.gap}
                onChange={(gap) => setBucketStyle({ gap })}
            />
            <BarSlider
                label="Expand"
                min={0}
                max={6}
                unit=" px"
                width="w-14"
                value={style.expand}
                onChange={(expand) => setBucketStyle({ expand })}
            />
            <SegmentedControl<'behind' | 'top'>
                aria-label="Place fill"
                size="sm"
                block={false}
                className="[&>button]:flex-none [&>button]:px-2.5"
                value={style.placement}
                onChange={(placement) => setBucketStyle({ placement })}
                options={[
                    { value: 'behind', label: 'Under lines' },
                    { value: 'top', label: 'On top' },
                ]}
            />
            <Hint>Auto: recolour a shape or fill an enclosed area</Hint>
        </Bar>
    );
}
