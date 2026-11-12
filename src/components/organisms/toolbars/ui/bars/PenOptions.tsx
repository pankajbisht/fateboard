import { useStore } from '@store';
import { NumberField } from '@/components/atoms/NumberField';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { ToolbarPopover } from '@/components/molecules/ToolbarPopover';
import type { PenStyle } from '@/store/slices/drawingTools/penStyle';
import { SwitchField } from '@/components/molecules/LabeledToggle';
import { SliderField } from '@/components/molecules/LabeledSlider';
import type { PenShape } from '@/lib/canvas/penShape';
import { Bar, Hint, Key } from './drawToolParts';

/** Live preview of the stroke style on the popover button (dash, line ends, arrowheads). */
function StrokePreview({ style }: { style: PenStyle }) {
    const dotted = style.dash === 'dotted';
    return (
        <svg viewBox="0 0 40 14" className="h-3.5 w-10" fill="none" aria-hidden>
            <g stroke="currentColor" strokeWidth={2} strokeLinejoin={style.lineJoin}>
                <path
                    d="M4 7H36"
                    strokeLinecap={dotted ? 'round' : style.lineCap}
                    strokeDasharray={
                        style.dash === 'dashed' ? '6 4' : dotted ? '0.1 4.5' : undefined
                    }
                />
                {style.arrow !== 'none' && <path d="M31 2.5L36 7L31 11.5" />}
                {style.arrow === 'both' && <path d="M9 2.5L4 7L9 11.5" />}
            </g>
        </svg>
    );
}

/** Inkscape Pen "Shape" picker: the outline an open path becomes. */
const PEN_SHAPE_OPTIONS: { value: PenShape; label: string; title: string }[] = [
    { value: 'none', label: 'None', title: 'A plain stroke' },
    {
        value: 'triangle-in',
        label: 'Triangle in',
        title: 'Triangle in: thin at the start, thick at the end',
    },
    {
        value: 'triangle-out',
        label: 'Triangle out',
        title: 'Triangle out: thick at the start, thin at the end',
    },
    { value: 'ellipse', label: 'Ellipse', title: 'Ellipse: thin, thick in the middle, thin' },
];

function ShapePreview({ shape }: { shape: PenShape }) {
    return (
        <svg viewBox="0 0 40 14" className="h-3.5 w-10" aria-hidden>
            {shape === 'none' && <path d="M4 7H36" stroke="currentColor" strokeWidth={2} />}
            {shape === 'triangle-in' && <path d="M4 7L36 2V12Z" fill="currentColor" />}
            {shape === 'triangle-out' && <path d="M4 2L36 7L4 12Z" fill="currentColor" />}
            {shape === 'ellipse' && <ellipse cx={20} cy={7} rx={16} ry={5} fill="currentColor" />}
        </svg>
    );
}

const SHAPE_ROWS = [
    {
        key: 'lineCap',
        label: 'Line ends',
        options: [
            { value: 'round', label: 'Round' },
            { value: 'square', label: 'Square' },
            { value: 'butt', label: 'Flat' },
        ],
    },
    {
        key: 'lineJoin',
        label: 'Corners',
        options: [
            { value: 'round', label: 'Round' },
            { value: 'miter', label: 'Sharp' },
            { value: 'bevel', label: 'Bevel' },
        ],
    },
    {
        key: 'dash',
        label: 'Dash',
        options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
        ],
    },
    {
        key: 'arrow',
        label: 'Arrowheads',
        options: [
            { value: 'none', label: 'None' },
            { value: 'end', label: 'End' },
            { value: 'both', label: 'Both ends' },
        ],
    },
] as const;

function PenHint() {
    const mode = useStore((s) => s.penMode);
    const points = useStore((s) => s.penPointCount);
    if (mode === 'freeform') return <Hint>Drag to draw · end near the start to close a shape</Hint>;
    if (points === 0)
        return (
            <Hint>
                {mode === 'pen' ? (
                    <>
                        Click to add points, drag for curves · click an end of a path to continue it
                    </>
                ) : (
                    <>
                        Click to add points: the curve bends through them · <Key>Alt</Key> + click =
                        sharp corner
                    </>
                )}
            </Hint>
        );
    return (
        <Hint>
            <span className="font-semibold text-ink">
                {points} {points === 1 ? 'point' : 'points'}
            </span>
            ·<Key>Shift</Key> 45° · <Key>Alt</Key>{' '}
            {mode === 'pen' ? 'drag = sharp curve' : 'click = corner'} · <Key>Enter</Key> finish ·
            click the first point to close
        </Hint>
    );
}

/** Pen (P) options: mode, stroke color / width / style, fill of closed shapes, and a hint. */
export function PenOptions() {
    const style = useStore((s) => s.penStyle);
    const setPenStyle = useStore((s) => s.setPenStyle);
    const mode = useStore((s) => s.penMode);
    const setPenMode = useStore((s) => s.setPenMode);

    return (
        <Bar label="Pen" icon="pen-tool">
            <GlowDivider />
            <SegmentedControl
                aria-label="Pen mode"
                size="sm"
                block={false}
                className="[&>button]:flex-none [&>button]:px-2.5"
                value={mode}
                onChange={setPenMode}
                options={[
                    { value: 'pen', label: 'Pen', title: 'Click for corners, drag for curves' },
                    {
                        value: 'curvature',
                        label: 'Curvature',
                        title: 'Click points: the curve bends smoothly through them',
                    },
                    { value: 'freeform', label: 'Freeform', title: 'Drag to draw by hand' },
                ]}
            />
            <GlowDivider />
            <span className="text-ink-muted">Stroke</span>
            <PaintTargetSwatch
                id="pen-stroke"
                label="Pen stroke"
                value={style.stroke}
                onChange={(stroke) => setPenStyle({ stroke })}
            />
            {/* labels outside the field: NumberField's own label / unit text is too faint (BUG-200) */}
            <span className="text-ink-muted">Width</span>
            <NumberField
                aria-label="Pen stroke width"
                title="Stroke width of new paths (px)"
                min={0.5}
                max={100}
                step={0.5}
                value={style.strokeWidth}
                onCommit={(strokeWidth) => setPenStyle({ strokeWidth })}
                stepper="stack"
                size="toolbar"
                className="w-16"
            />
            <ToolbarPopover
                label="Stroke style"
                trigger={<StrokePreview style={style} />}
                className="w-72"
            >
                {SHAPE_ROWS.map((row) => (
                    <div key={row.key} className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-ink-muted">{row.label}</span>
                        <SegmentedControl
                            aria-label={row.label}
                            size="sm"
                            value={style[row.key]}
                            onChange={(value) => setPenStyle({ [row.key]: value })}
                            options={[...row.options]}
                        />
                    </div>
                ))}
            </ToolbarPopover>
            <ToolbarPopover
                label="Path shape"
                trigger={<ShapePreview shape={style.shape} />}
                className="w-96"
            >
                <SegmentedControl
                    aria-label="Shape"
                    size="sm"
                    value={style.shape}
                    onChange={(shape) => setPenStyle({ shape })}
                    options={PEN_SHAPE_OPTIONS}
                />
                {style.shape !== 'none' && (
                    <SliderField
                        label="Thickness"
                        min={1}
                        max={200}
                        unit="px"
                        value={style.shapeWidth}
                        onChange={(shapeWidth) => setPenStyle({ shapeWidth })}
                    />
                )}
                <p className="text-xs text-ink-muted">
                    Open paths become one filled outline in the stroke color. Closed shapes stay as
                    they are.
                </p>
            </ToolbarPopover>
            <GlowDivider />
            <SwitchField
                label="Fill"
                className="[&>div]:min-h-0"
                checked={style.fillEnabled}
                onChange={(fillEnabled) => setPenStyle({ fillEnabled })}
            />
            <PaintTargetSwatch
                id="pen-fill"
                label="Pen fill"
                value={style.fill}
                disabled={!style.fillEnabled}
                onChange={(fill) => setPenStyle({ fill })}
            />
            <PenHint />
        </Bar>
    );
}
