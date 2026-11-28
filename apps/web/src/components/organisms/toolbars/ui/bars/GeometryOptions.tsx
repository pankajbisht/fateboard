import { useStore } from '@store';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { NumberField } from '@/components/atoms/NumberField';
import { Select } from '@/components/atoms/Select';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { ANGLE_STEPS, ISO_PEN_WIDTHS_MM, type DrafterMode } from '@/lib/canvas/drafter';
import {
    SCALE_TICKS_MM,
    type CompassMode,
    type GeometryInstrument,
    type SetSquareKind,
} from '@/lib/canvas/geometry';
import type { GeometryStyle } from '@/store/slices/paintTools/paintToolStyles';
import { Bar, Hint, Key, ALT, SHIFT } from './drawToolParts';

const INSTRUMENTS: { value: GeometryInstrument; label: string }[] = [
    { value: 'drafter', label: 'Drafter' },
    { value: 'scale', label: 'Scale' },
    { value: 'setSquare', label: 'Set square' },
    { value: 'protractor', label: 'Protractor' },
    { value: 'compass', label: 'Compass' },
];
const DRAFTER_MODES: { value: DrafterMode; label: string }[] = [
    { value: 'line', label: 'Line' },
    { value: 'parallel', label: 'Parallel' },
    { value: 'perpendicular', label: 'Perpendicular' },
    { value: 'dimension', label: 'Dimension' },
    { value: 'construction', label: 'Construction line' },
];
const SQUARES: { value: SetSquareKind; label: string }[] = [
    { value: '45', label: '45° square' },
    { value: '30-60', label: '30° / 60° square' },
];
const COMPASS: { value: CompassMode; label: string }[] = [
    { value: 'circle', label: 'Circle' },
    { value: 'arc', label: 'Arc' },
];
const tickLabel = (mm: number) => (mm === 0 ? 'Any length' : mm === 10 ? '1 cm' : `${mm} mm`);

type Set = (patch: Partial<GeometryStyle>) => void;

function AngleStep({ style, set }: { style: GeometryStyle; set: Set }) {
    return (
        <Select<GeometryStyle['step']>
            aria-label="Angle step"
            size="sm"
            block={false}
            value={style.step}
            onChange={(step) => set({ step })}
            options={ANGLE_STEPS.map((v) => ({ value: v, label: `${v}°` }))}
        />
    );
}

function Rotation({ style, set, label }: { style: GeometryStyle; set: Set; label: string }) {
    return (
        <>
            <span className="text-ink-muted">{label}</span>
            <NumberField
                aria-label={`${label} angle`}
                title={`Rotate the ${label.toLowerCase()} (degrees)`}
                min={0}
                max={359}
                value={style.base}
                onCommit={(base) => set({ base })}
                stepper="stack"
                size="toolbar"
                className="w-16"
            />
        </>
    );
}

/** The options of the instrument in use, then the hint for its gesture. */
function InstrumentFields({ style, set }: { style: GeometryStyle; set: Set }) {
    switch (style.instrument) {
        case 'scale':
            return (
                <Select<GeometryStyle['scaleTickMm']>
                    aria-label="Scale snap"
                    size="sm"
                    block={false}
                    value={style.scaleTickMm}
                    onChange={(scaleTickMm) => set({ scaleTickMm })}
                    options={SCALE_TICKS_MM.map((v) => ({ value: v, label: tickLabel(v) }))}
                />
            );
        case 'setSquare':
            return (
                <>
                    <Select<SetSquareKind>
                        aria-label="Set square"
                        size="sm"
                        block={false}
                        value={style.setSquare}
                        onChange={(setSquare) => set({ setSquare })}
                        options={SQUARES}
                    />
                    <Rotation style={style} set={set} label="Square" />
                </>
            );
        case 'protractor':
            return <AngleStep style={style} set={set} />;
        case 'compass':
            return (
                <>
                    <Select<CompassMode>
                        aria-label="Compass draws"
                        size="sm"
                        block={false}
                        value={style.compass}
                        onChange={(compass) => set({ compass })}
                        options={COMPASS}
                    />
                    {style.compass === 'arc' && <AngleStep style={style} set={set} />}
                </>
            );
        default:
            return (
                <>
                    <Select<DrafterMode>
                        aria-label="Drafter mode"
                        size="sm"
                        block={false}
                        value={style.mode}
                        onChange={(mode) => set({ mode })}
                        options={DRAFTER_MODES}
                    />
                    <AngleStep style={style} set={set} />
                    <Rotation style={style} set={set} label="Head" />
                </>
            );
    }
}

function GestureHint({
    instrument,
    compass,
}: {
    instrument: GeometryInstrument;
    compass: CompassMode;
}) {
    if (instrument === 'protractor')
        return (
            <Hint>
                Drag the first arm, click the second · <Key>{ALT}</Key> free
            </Hint>
        );
    if (instrument === 'compass')
        return (
            <Hint>
                Drag from the centre{compass === 'arc' ? ', click where the arc ends' : ''} ·{' '}
                <Key>{ALT}</Key> free angle
            </Hint>
        );
    if (instrument === 'scale')
        return (
            <Hint>
                <Key>{SHIFT}</Key> stepped angle · <Key>{ALT}</Key> any length
            </Hint>
        );
    return (
        <Hint>
            <Key>{ALT}</Key> free angle · starts snap to line ends
        </Hint>
    );
}

/** Geometry (D) options: the instrument (mode), its settings, ISO pen width, colour. */
export function GeometryOptions() {
    const style = useStore((s) => s.geometryStyle);
    const setGeometryStyle = useStore((s) => s.setGeometryStyle);
    const color = useStore((s) => s.color);
    const updateBrush = useStore((s) => s.updateBrush);
    return (
        <Bar label="Geometry" icon="geometry">
            <GlowDivider />
            <PaintTargetSwatch
                id="geometry-color"
                label="Line color"
                value={color}
                onChange={(hex) => updateBrush({ color: hex })}
            />
            <Select<GeometryInstrument>
                aria-label="Geometry mode"
                size="sm"
                block={false}
                value={style.instrument}
                onChange={(instrument) => setGeometryStyle({ instrument })}
                options={INSTRUMENTS}
            />
            <InstrumentFields style={style} set={setGeometryStyle} />
            <Select<GeometryStyle['penMm']>
                aria-label="Pen width"
                size="sm"
                block={false}
                value={style.penMm}
                onChange={(penMm) => setGeometryStyle({ penMm })}
                options={ISO_PEN_WIDTHS_MM.map((v) => ({ value: v, label: `${v} mm` }))}
            />
            <GestureHint instrument={style.instrument} compass={style.compass} />
        </Bar>
    );
}
