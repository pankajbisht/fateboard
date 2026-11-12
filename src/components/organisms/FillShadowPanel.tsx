import clsx from 'clsx';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useStore } from '@store';
import { useSelectionStyle } from '@hooks/useSelectionStyle';
import {
    DEFAULT_GRADIENT,
    GRADIENT_PRESETS,
    gradientCss,
    insertStop,
    reverseStops,
    sortStops,
    type FillKind,
    type GradientFill,
    type GradientStop,
} from '@/lib/fillStyle';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { Field } from '../molecules/Field';
import { PanelSection } from '../molecules/PanelSection';
import { SliderField } from '../molecules/LabeledSlider';
import LabeledToggle from '../molecules/LabeledToggle';
import { SegmentedControl } from '../molecules/SegmentedControl';
import { PaintTargetSwatch } from '../molecules/PaintTargetSwatch';
import { EmptyState } from '../molecules/EmptyState';
import { FillHarmony } from './FillHarmony';
import { ShadowControls } from './ShadowControls';

const FILL_TYPES: { value: FillKind; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'solid', label: 'Solid' },
    { value: 'linear', label: 'Linear' },
    { value: 'radial', label: 'Radial' },
];

const pct = (v: number) => Math.round(v * 100);

/* ------------------------------ stop bar ------------------------------ */

/**
 * Gradient preview with draggable color stops (Figma-style): click a stop to select it, drag it to
 * move, click the bar to add one, arrow keys nudge the selected stop.
 */
function StopBar({
    stops,
    selected,
    onSelect,
    onMove,
    onCommit,
    onAdd,
}: {
    stops: GradientStop[];
    selected: number;
    onSelect: (i: number) => void;
    onMove: (i: number, offset: number) => void;
    onCommit: () => void;
    onAdd: (offset: number) => void;
}) {
    const barRef = useRef<HTMLDivElement>(null);
    const drag = useRef<number | null>(null);

    const offsetAt = (clientX: number) => {
        const r = barRef.current?.getBoundingClientRect();
        if (!r || r.width === 0) return 0.5;
        return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    };

    const onKey = (e: KeyboardEvent, i: number) => {
        const step = e.shiftKey ? 0.1 : 0.01;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            onMove(i, stops[i].offset + (e.key === 'ArrowRight' ? step : -step));
        }
    };

    return (
        <div className="relative pb-3 pt-1">
            <div
                ref={barRef}
                role="presentation"
                title="Click to add a color stop"
                className="h-6 cursor-copy rounded-md border border-line-strong"
                style={{ background: gradientCss({ stops }) }}
                onPointerDown={(e) => {
                    if (e.target === barRef.current) onAdd(offsetAt(e.clientX));
                }}
            />
            {stops.map((s, i) => (
                <button
                    key={i}
                    type="button"
                    aria-label={`Color stop ${i + 1} at ${pct(s.offset)}%`}
                    aria-pressed={i === selected}
                    onClick={() => onSelect(i)}
                    onKeyDown={(e) => onKey(e, i)}
                    onKeyUp={onCommit}
                    onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        onSelect(i);
                        drag.current = i;
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                    }}
                    onPointerMove={(e) => drag.current === i && onMove(i, offsetAt(e.clientX))}
                    onPointerUp={() => {
                        if (drag.current !== null) onCommit();
                        drag.current = null;
                    }}
                    style={{ left: `${s.offset * 100}%`, background: s.color }}
                    className={clsx(
                        'absolute top-4 h-4 w-4 -translate-x-1/2 cursor-ew-resize touch-none rounded-full border-2 shadow-sm',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60',
                        i === selected
                            ? 'border-primary-600 ring-2 ring-primary-200'
                            : 'border-surface',
                    )}
                />
            ))}
        </div>
    );
}

/* ------------------------------ gradient ------------------------------ */

function GradientControls({
    gradient,
    onChange,
}: {
    gradient: GradientFill;
    onChange: (g: GradientFill, history?: boolean) => void;
}) {
    const [selected, setSelected] = useState(0);
    const editing = useStore((s) => (s as { gradientEditing?: boolean }).gradientEditing ?? false);
    const setGradientEditing = useStore((s) => s.setGradientEditing);
    const stops = gradient.stops;
    const sel = Math.min(selected, stops.length - 1);

    useEffect(() => {
        if (selected > stops.length - 1) setSelected(stops.length - 1);
    }, [selected, stops.length]);

    const setStops = (next: GradientStop[], history = true) =>
        onChange({ ...gradient, stops: next }, history);
    const moveStop = (i: number, offset: number, history = false) => {
        const moving = { ...stops[i], offset: Math.min(1, Math.max(0, offset)) };
        const next = sortStops(stops.map((s, k) => (k === i ? moving : s)));
        setSelected(
            next.indexOf(next.find((s) => s.offset === moving.offset && s.color === moving.color)!),
        );
        setStops(next, history);
    };
    const addStop = (offset: number) => {
        const { stops: next, index } = insertStop(stops, offset);
        setSelected(index);
        setStops(next);
    };

    return (
        <>
            <StopBar
                stops={stops}
                selected={sel}
                onSelect={setSelected}
                onMove={(i, o) => moveStop(i, o)}
                onCommit={() => setStops(stops)}
                onAdd={addStop}
            />

            <div className="flex items-center gap-1">
                <PaintTargetSwatch
                    id="gradient-stop"
                    label={`Stop ${sel + 1} color`}
                    value={stops[sel]?.color ?? '#000000'}
                    showLabel
                    onChange={(color) =>
                        setStops(stops.map((s, k) => (k === sel ? { ...s, color } : s)))
                    }
                    className="flex-1"
                />
                <IconButton
                    icon={<Icon name="plus" />}
                    aria-label="Add color stop"
                    title="Add color stop"
                    onClick={() => {
                        const next = stops[sel + 1] ?? stops[sel - 1];
                        addStop(next ? (stops[sel].offset + next.offset) / 2 : 0.5);
                    }}
                />
                <IconButton
                    icon={<Icon name="trash-can" />}
                    tone="danger"
                    aria-label="Delete color stop"
                    title="Delete color stop (a gradient needs 2)"
                    disabled={stops.length <= 2}
                    onClick={() => {
                        setSelected(Math.max(0, sel - 1));
                        setStops(stops.filter((_, k) => k !== sel));
                    }}
                />
                <IconButton
                    icon={<Icon name="arrows-left-right" />}
                    aria-label="Reverse gradient"
                    title="Reverse gradient"
                    onClick={() => {
                        setSelected(stops.length - 1 - sel);
                        setStops(reverseStops(stops));
                    }}
                />
            </div>

            <SliderField
                label="Stop position"
                min={0}
                max={100}
                step={1}
                unit="%"
                value={pct(stops[sel]?.offset ?? 0)}
                onChange={(v) => moveStop(sel, v / 100)}
                onCommit={(v) => moveStop(sel, v / 100, true)}
            />

            {gradient.type === 'linear' ? (
                <div className="flex items-end gap-1">
                    <SliderField
                        label="Angle"
                        min={0}
                        max={359}
                        step={1}
                        unit="°"
                        value={Math.round(gradient.angle)}
                        defaultValue={90}
                        onChange={(angle) => onChange({ ...gradient, angle }, false)}
                        onCommit={(angle) => onChange({ ...gradient, angle })}
                        className="flex-1"
                    />
                    <IconButton
                        icon={<Icon name="rotate" />}
                        aria-label="Rotate 90°"
                        title="Rotate 90°"
                        onClick={() =>
                            onChange({
                                ...gradient,
                                angle: (Math.round(gradient.angle) + 90) % 360,
                            })
                        }
                    />
                </div>
            ) : (
                <>
                    <SliderField
                        label="Center X"
                        min={0}
                        max={100}
                        step={1}
                        unit="%"
                        value={pct(gradient.center.x)}
                        defaultValue={50}
                        onChange={(v) =>
                            onChange(
                                { ...gradient, center: { ...gradient.center, x: v / 100 } },
                                false,
                            )
                        }
                        onCommit={(v) =>
                            onChange({ ...gradient, center: { ...gradient.center, x: v / 100 } })
                        }
                    />
                    <SliderField
                        label="Center Y"
                        min={0}
                        max={100}
                        step={1}
                        unit="%"
                        value={pct(gradient.center.y)}
                        defaultValue={50}
                        onChange={(v) =>
                            onChange(
                                { ...gradient, center: { ...gradient.center, y: v / 100 } },
                                false,
                            )
                        }
                        onCommit={(v) =>
                            onChange({ ...gradient, center: { ...gradient.center, y: v / 100 } })
                        }
                    />
                    <SliderField
                        label="Size"
                        min={5}
                        max={150}
                        step={1}
                        unit="%"
                        value={pct(gradient.radius)}
                        defaultValue={50}
                        onChange={(v) => onChange({ ...gradient, radius: v / 100 }, false)}
                        onCommit={(v) => onChange({ ...gradient, radius: v / 100 })}
                    />
                </>
            )}

            <LabeledToggle
                label="Edit on canvas"
                hint="Drag the handles on the object; double-click a stop to remove it."
                checked={editing}
                onChange={setGradientEditing}
            />

            <Field label="Presets">
                <div className="grid grid-cols-7 gap-1.5">
                    {GRADIENT_PRESETS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            aria-label={`${p.label} gradient`}
                            title={p.label}
                            onClick={() => {
                                setSelected(0);
                                setStops(p.stops);
                            }}
                            className="aspect-square cursor-pointer rounded-md border border-line-strong transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                            style={{ background: gradientCss(p, 45) }}
                        />
                    ))}
                </div>
            </Field>
        </>
    );
}

/* -------------------------------- panel ------------------------------- */

/**
 * Right dock "Fill & Shadow": fill type (none / solid / linear / radial) with a full gradient
 * editor, color harmonies of the fill, and the drop shadow. Reads the selection live from the canvas; writes only through
 * store actions (undoable; slider drags preview without undo steps and commit on release).
 */
export function FillShadowPanel() {
    const [style, refresh] = useSelectionStyle();
    const setFill = useStore((s) => s.setFill);
    const applyGradientFill = useStore((s) => s.applyGradientFill);
    const setShadow = useStore((s) => s.setShadow);
    const setGradientEditing = useStore((s) => s.setGradientEditing);
    const previewOpacity = useStore((s) => s.previewOpacity);
    const endOpacityPreview = useStore((s) => s.endOpacityPreview);
    const setOpacity = useStore((s) => s.setOpacity);

    if (!style) {
        return (
            <EmptyState
                icon="palette"
                title="Nothing selected"
                description="Select a shape or text on the canvas to edit its fill, gradient and shadow."
            />
        );
    }

    const { fill, shadow } = style;
    const gradient = (g: GradientFill, history = true) => {
        applyGradientFill(g, { history });
        refresh();
    };

    const setKind = (kind: FillKind) => {
        if (kind !== 'linear' && kind !== 'radial') setGradientEditing(false);
        if (kind === 'none') setFill('rgba(0,0,0,0)');
        else if (kind === 'solid')
            setFill(fill.gradient?.stops[0]?.color ?? fill.color ?? '#d1d5db');
        else if (fill.gradient) gradient({ ...fill.gradient, type: kind });
        else {
            const stops = fill.color
                ? [{ offset: 0, color: fill.color }, DEFAULT_GRADIENT.stops[1]]
                : DEFAULT_GRADIENT.stops;
            gradient({ ...DEFAULT_GRADIENT, type: kind, stops });
        }
        refresh();
    };

    return (
        <>
            {style.count > 1 && (
                <p className="text-caption text-ink-muted">
                    Changes apply to {style.count} objects.
                </p>
            )}

            {style.canFill && (
                <PanelSection title="Fill">
                    <SegmentedControl<FillKind>
                        aria-label="Fill type"
                        value={fill.kind}
                        onChange={setKind}
                        options={FILL_TYPES}
                    />
                    {fill.kind === 'solid' && (
                        <Field label="Color" inline>
                            <PaintTargetSwatch
                                id="fill-solid"
                                label="Fill color"
                                value={fill.color ?? '#000000'}
                                onChange={(c) => {
                                    setFill(c);
                                    refresh();
                                }}
                            />
                        </Field>
                    )}
                    {fill.gradient && (
                        <GradientControls gradient={fill.gradient} onChange={gradient} />
                    )}
                </PanelSection>
            )}

            {style.canFill && (
                <PanelSection title="Color harmony">
                    <FillHarmony
                        fill={fill}
                        onSolid={(c) => {
                            setFill(c);
                            refresh();
                        }}
                        onGradient={gradient}
                    />
                </PanelSection>
            )}

            <PanelSection title="Opacity">
                <SliderField
                    label="Opacity"
                    min={5}
                    max={100}
                    step={1}
                    unit="%"
                    value={Math.round(style.opacity * 100)}
                    defaultValue={100}
                    onChange={(v) => {
                        previewOpacity(v); // live, no undo step
                        refresh();
                    }}
                    onCommit={(v) => {
                        endOpacityPreview();
                        setOpacity(v / 100); // one undo step
                        refresh();
                    }}
                />
            </PanelSection>

            <PanelSection title="Shadow">
                <ShadowControls
                    shadow={shadow}
                    onChange={(s, history = true) => {
                        setShadow(s, { history });
                        refresh();
                    }}
                />
            </PanelSection>
        </>
    );
}

export default FillShadowPanel;
