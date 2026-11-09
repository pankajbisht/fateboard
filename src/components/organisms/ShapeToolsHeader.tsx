import { memo } from 'react';
import { useStore } from '@store';
import type { Transform } from '@/lib/types/transform.type';
import { LayerControlBar } from './toolbars/ui/bars/LayerControlBar.tsx';
import { FlipBar } from './toolbars/ui/bars/FlipBar.tsx';
import { transformFieldsConfig } from '../config/transformfields.config.ts';
import { GlowDivider } from '../atoms/GlowDivider.tsx';
import OriginSelector from '../molecules/OriginSelector.tsx';
import { NumberField } from '../atoms/NumberField.tsx';
import { useUnit } from '@hooks/useUnit';
import { fromUnit, toUnit, unitPrecision } from '@/lib/units';

type TransformFieldConfig = (typeof transformFieldsConfig)[number];

/**
 * One X / Y / W / H / R field. Subscribes to its own value only: dragging an object changes x / y
 * on every mouse move, and that must not re-render the rest of the header (anchor, icons, fields).
 */
const TransformField = memo(function TransformField({ field }: { field: TransformFieldConfig }) {
    const value = useStore((s) => s.transform[field.key]);
    const hasSelection = useStore((s) => s.hasSelection);
    const setTransform = useStore((s) => s.setTransform);
    const unit = useUnit();
    // lengths are shown in Settings > Units and stored in px (BUG-082)
    const isLength = 'length' in field && field.length;
    const show = (px: number | undefined) =>
        isLength && typeof px === 'number' ? toUnit(px, unit) : px;
    return (
        <NumberField
            label={field.label}
            aria-label={field.name}
            title={field.name}
            unit={
                isLength
                    ? unit === 'px'
                        ? undefined
                        : unit
                    : 'unit' in field
                      ? field.unit
                      : undefined
            }
            precision={isLength ? unitPrecision(unit) : undefined}
            min={'min' in field ? show(field.min) : undefined}
            max={'max' in field ? field.max : undefined}
            value={show(value as number)}
            disabled={!hasSelection}
            onCommit={(v) =>
                setTransform(field.key as keyof Transform, isLength ? fromUnit(v, unit) : v)
            }
            stepper="stack"
            size="toolbar"
            className="w-24"
        />
    );
});

/** Corner radius fields (rects only). */
const RadiusFields = memo(function RadiusFields() {
    const rx = useStore((s) => s.transform.rx);
    const ry = useStore((s) => s.transform.ry);
    const setRadius = useStore((s) => s.setRadius);
    const unit = useUnit();
    const d = unitPrecision(unit);
    const label = unit === 'px' ? undefined : unit;
    return (
        <div className="flex items-center gap-2 px-2">
            <GlowDivider />

            <NumberField
                label="Rx"
                aria-label="Corner radius X"
                min={0}
                unit={label}
                precision={d}
                value={toUnit(rx, unit)}
                onCommit={(v) => setRadius(fromUnit(v, unit), ry)}
                stepper="stack"
                size="toolbar"
                className="w-24"
            />
            <NumberField
                label="Ry"
                aria-label="Corner radius Y"
                min={0}
                unit={label}
                precision={d}
                value={toUnit(ry, unit)}
                onCommit={(v) => setRadius(rx, fromUnit(v, unit))}
                stepper="stack"
                size="toolbar"
                className="w-24"
            />
        </div>
    );
});

export const ShapeToolsHeader = () => {
    const originId = useStore((s) => s.transform.id);
    const setOrigin = useStore((s) => s.setOrigin);
    // booleans, re-evaluated on every store change (selection changes always write the store)
    const active = useStore((s) => !!s.canvas?.getActiveObject());
    const isRect = useStore((s) => {
        const type = s.canvas?.getActiveObject()?.type;
        return type === 'square' || type === 'rect';
    });

    return (
        <div
            className={`px-2 py-1 overflow-x-auto bg-surface ${
                !active ? 'pointer-events-none opacity-50 dark:opacity-65' : ''
            }`}
        >
            <div className="flex items-center justify-between whitespace-nowrap text-sm">
                <div className="flex items-center gap-4">
                    <LayerControlBar />
                    <GlowDivider />

                    {/* transform row: anchor -> X Y W H R -> flips (all act around the anchor) */}
                    <div className="flex items-center gap-2">
                        <div className="mr-1 flex items-center">
                            <OriginSelector value={originId} onChange={setOrigin} />
                        </div>
                        {transformFieldsConfig.map((field) => (
                            <TransformField key={field.key} field={field} />
                        ))}
                        <div className="ml-1 flex items-center">
                            <FlipBar />
                        </div>
                    </div>
                </div>

                {isRect && <RadiusFields />}
            </div>
        </div>
    );
};
