import { useEffect, useRef, type ReactNode } from 'react';
import { PaintTargetSwatch } from '../molecules/PaintTargetSwatch';
import { Button } from '../atoms/Button';
import { PanelSection } from '../molecules/PanelSection';
import { SliderField } from '../molecules/LabeledSlider';
import { SegmentedControl } from '../molecules/SegmentedControl';
import { SelectField } from '../molecules/SelectField';
import LabeledToggle from '../molecules/LabeledToggle';
import { useStore } from '@store';
import {
    BLEND_MODES,
    BRUSH_ORDER,
    BRUSH_PRESETS,
    SHADOW_PRESETS,
    clamp,
    getEngine,
    getPreset,
    isStrokeBrush,
    isVariableBrush,
    mixWithWhite,
    toHex6,
    toRgba,
    type BlendMode,
    type BrushType,
    type EraserMode,
    type LineCap,
    type LineJoin,
    type LineStyle,
    type Symmetry,
} from '@store/brushConfig'; // adjust to wherever you put brushConfig.ts

// The store type doesn't know the new brush fields yet, so select loosely.
const useBrushStore = <T,>(pick: (s: any) => T): T => useStore(pick as never) as T;

/* ------------------------------ small UI bits ------------------------------ */

/* Shared molecules under the names this panel already uses. */
function Section({ title, children }: { title: string; children: ReactNode }) {
    return <PanelSection title={title}>{children}</PanelSection>;
}

/* ---------------------------------- panel ---------------------------------- */

export function DrawPanel(_props: { closePanel?: () => void }) {
    const canvas = useBrushStore((s) => s.canvas);
    const brush = useBrushStore((s) => s.brush) as BrushType;
    const width = useBrushStore((s) => s.width) as number;
    const color = toHex6(useBrushStore((s) => s.color) as string);
    const opacity = useBrushStore((s) => s.brushOpacity) as number;
    const smoothing = useBrushStore((s) => s.smoothing) as number;
    const lineCap = useBrushStore((s) => s.lineCap) as LineCap;
    const lineJoin = useBrushStore((s) => s.lineJoin) as LineJoin;
    const lineStyle = useBrushStore((s) => s.lineStyle) as LineStyle;
    const blend = useBrushStore((s) => s.blend) as BlendMode;
    const taper = useBrushStore((s) => s.taper) as number;
    const nibAngle = useBrushStore((s) => s.nibAngle) as number;
    const shadowBlur = useBrushStore((s) => s.shadowBlur) as number;
    const shadowOffsetX = useBrushStore((s) => s.shadowOffsetX) as number;
    const shadowOffsetY = useBrushStore((s) => s.shadowOffsetY) as number;
    const shadowColor = toHex6(useBrushStore((s) => s.brushShadowColor) as string);
    const shadowOpacity = useBrushStore((s) => s.shadowOpacity) as number;
    const shadowMatchColor = useBrushStore((s) => s.shadowMatchColor) as boolean;
    const fillEnabled = useBrushStore((s) => s.fillEnabled) as boolean;
    const fillColor = toHex6(useBrushStore((s) => s.fillColor) as string);
    const fillOpacity = useBrushStore((s) => s.fillOpacity) as number;
    const straightLine = useBrushStore((s) => s.straightLine) as boolean;
    const symmetry = useBrushStore((s) => s.symmetry) as Symmetry;
    const eraserMode = useBrushStore((s) => s.eraserMode) as EraserMode;

    const initBrush = useBrushStore((s) => s.initBrush);
    const setBrush = useBrushStore((s) => s.setBrush);
    const updateBrush = useBrushStore((s) => s.updateBrush);
    const setBrushWidth = useBrushStore((s) => s.setBrushWidth);
    const setBrushColor = useBrushStore((s) => s.setBrushColor);
    const setSymmetry = useBrushStore((s) => s.setSymmetry);
    const recenterSymmetry = useBrushStore((s) => s.recenterSymmetry);
    const commitRecentColor = useBrushStore((s) => s.commitRecentColor);
    const resetBrush = useBrushStore((s) => s.resetBrush);
    const undo = useBrushStore((s) => s.undo);
    const redo = useBrushStore((s) => s.redo);

    const engine = getEngine(brush);
    const preset = getPreset(brush);
    const eraser = engine === 'eraser';
    const strokeBrush = isStrokeBrush(brush); // caps, joins, dashes, fill, straight lines
    const variableBrush = isVariableBrush(brush); // ink / calligraphy
    const hasShadowControls = !eraser;
    const shadowActive = shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0;

    // (re)apply brush whenever the canvas instance changes
    useEffect(() => {
        initBrush();
    }, [canvas, initBrush]);

    // [ and ] change brush size, like Photoshop / Procreate
    const widthRef = useRef(width);
    widthRef.current = width;
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t) {
                const typing =
                    t.tagName === 'TEXTAREA' ||
                    t.isContentEditable ||
                    (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range');
                if (typing) return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key !== '[' && e.key !== ']') return;
            const w = widthRef.current;
            const step = w < 10 ? 1 : w < 40 ? 2 : 5;
            setBrushWidth({ width: clamp(w + (e.key === ']' ? step : -step), 1, 200) });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [setBrushWidth]);

    /* ---------- live preview (an approximation of the real brush) ---------- */
    const pw = clamp(width, 1, 36);
    const previewColor = engine === 'neon' ? mixWithWhite(color, 0.7) : color;
    const previewStroke = (() => {
        if (strokeBrush && engine !== 'pattern') {
            return {
                strokeWidth: pw,
                strokeLinecap: (lineStyle === 'dotted' || lineStyle === 'dashdot'
                    ? 'round'
                    : lineCap) as LineCap,
                strokeLinejoin: lineJoin,
                strokeDasharray:
                    lineStyle === 'dashed'
                        ? `${pw * 2} ${pw * 1.5}`
                        : lineStyle === 'dotted'
                          ? `0.1 ${pw * 2}`
                          : lineStyle === 'dashdot'
                            ? `${pw * 3} ${pw * 1.5} 0.1 ${pw * 1.5}`
                            : undefined,
            };
        }
        if (variableBrush)
            return {
                strokeWidth: pw,
                strokeLinecap: (engine === 'ink' ? 'round' : 'butt') as LineCap,
            };
        if (engine === 'pattern')
            return {
                strokeWidth: clamp(pw, 4, 20),
                strokeLinecap: 'butt' as const,
                strokeDasharray: '3 3',
            };
        return {
            strokeWidth: clamp(pw / 5, 2, 7),
            strokeLinecap: 'round' as const,
            strokeDasharray: '0.1 7',
        }; // spray / dots
    })();

    const previewShadow = (() => {
        if (engine === 'neon' && !shadowActive) return `drop-shadow(0 0 7px ${color})`;
        if (!shadowActive) return undefined;
        const c = toRgba(shadowMatchColor ? color : shadowColor, shadowOpacity);
        return `drop-shadow(${shadowOffsetX / 2}px ${shadowOffsetY / 2}px ${shadowBlur / 3}px ${c})`;
    })();

    return (
        <div className="flex select-none flex-col gap-4">
            {/* top bar */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                    {typeof undo === 'function' && (
                        <Button variant="secondary" size="sm" icon="undo" onClick={() => undo()}>
                            Undo
                        </Button>
                    )}
                    {typeof redo === 'function' && (
                        <Button variant="secondary" size="sm" icon="redo" onClick={() => redo()}>
                            Redo
                        </Button>
                    )}
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="rotate-left"
                    onClick={() => resetBrush()}
                >
                    Reset brush
                </Button>
            </div>

            {/* preview */}
            <div
                className="relative h-16 overflow-hidden rounded-md border border-line-strong"
                style={{
                    backgroundImage:
                        'conic-gradient(#e5e7eb 25%, #fff 0 50%, #e5e7eb 0 75%, #fff 0)',
                    backgroundSize: '12px 12px',
                }}
                aria-hidden="true"
            >
                {eraser ? (
                    <div className="flex h-full items-center justify-center">
                        <div
                            className="rounded-full border-2 border-dashed border-ink-muted"
                            style={{ width: clamp(width, 6, 56), height: clamp(width, 6, 56) }}
                        />
                    </div>
                ) : (
                    <svg
                        viewBox="0 0 200 64"
                        className="h-full w-full"
                        preserveAspectRatio="none"
                        style={{ overflow: 'visible' }}
                    >
                        <path
                            d="M12 34 C 40 6, 70 58, 100 32 S 160 8, 188 34"
                            fill={
                                strokeBrush && fillEnabled ? toRgba(fillColor, fillOpacity) : 'none'
                            }
                            stroke={previewColor}
                            opacity={opacity}
                            style={{
                                mixBlendMode: blend === 'source-over' ? undefined : (blend as any),
                                filter: previewShadow,
                            }}
                            {...previewStroke}
                        />
                    </svg>
                )}
            </div>

            {/* brush type */}
            <Section title="Brush">
                <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Brush type">
                    {BRUSH_ORDER.map((b) => (
                        <button
                            key={b}
                            type="button"
                            role="radio"
                            aria-checked={brush === b}
                            onClick={() => setBrush({ brush: b })}
                            className={`rounded-md border px-1 py-2 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 ${
                                brush === b
                                    ? 'border-primary-500 bg-primary-50 font-medium text-primary-ink'
                                    : 'border-line-strong bg-surface text-ink hover:bg-surface-muted'
                            }`}
                        >
                            {BRUSH_PRESETS[b].label}
                        </button>
                    ))}
                </div>
                {engine === 'ink' && (
                    <p className="text-caption text-ink-subtle">
                        Thickness follows pen pressure, or drawing speed with a mouse.
                    </p>
                )}
                {engine === 'texture' && (
                    <p className="text-caption text-ink-subtle">
                        Grain is generated when you pick the brush or color.
                    </p>
                )}
            </Section>

            {/* size / opacity / blend */}
            <Section title="Size and opacity">
                <SliderField
                    label="Size"
                    value={width}
                    min={1}
                    max={preset.maxWidth}
                    unit="px"
                    onChange={(v) => setBrushWidth({ width: v })}
                />
                {!eraser && (
                    <>
                        <SliderField
                            label="Opacity"
                            value={Math.round(opacity * 100)}
                            min={5}
                            max={100}
                            unit="%"
                            onChange={(v) => updateBrush({ brushOpacity: v / 100 })}
                        />
                        <SelectField
                            label="Blend mode"
                            value={blend}
                            onChange={(v) => updateBrush({ blend: v })}
                            options={BLEND_MODES.map((m) => ({ value: m.value, label: m.label }))}
                        />
                    </>
                )}
                <p className="text-caption text-ink-subtle">
                    Tip: press [ and ] to change the size.
                </p>
            </Section>

            {/* eraser mode */}
            {eraser && (
                <Section title="Eraser type">
                    <SegmentedControl<EraserMode>
                        aria-label="Eraser type"
                        value={eraserMode}
                        onChange={(v) => updateBrush({ eraserMode: v })}
                        options={[
                            { value: 'pixel', label: 'Pixel' },
                            { value: 'stroke', label: 'Whole stroke' },
                        ]}
                    />
                    <p className="text-caption text-ink-subtle">
                        {eraserMode === 'pixel'
                            ? 'Rubs out whatever is under the brush.'
                            : 'Deletes any hand-drawn stroke the brush touches.'}
                    </p>
                </Section>
            )}

            {/* color */}
            {!eraser && (
                <Section title="Color">
                    <PaintTargetSwatch
                        id="brush-color"
                        label="Brush color"
                        value={color}
                        showLabel
                        onChange={(hex) => {
                            setBrushColor({ color: hex });
                            commitRecentColor(hex);
                        }}
                    />
                </Section>
            )}

            {/* stroke: path brushes */}
            {strokeBrush && (
                <Section title="Stroke">
                    <SliderField
                        label="Smoothing"
                        value={smoothing}
                        min={0}
                        max={10}
                        onChange={(v) => updateBrush({ smoothing: v })}
                    />
                    <SegmentedControl<LineCap>
                        aria-label="Line ends"
                        value={lineCap}
                        onChange={(v) => updateBrush({ lineCap: v })}
                        options={[
                            { value: 'round', label: 'Round' },
                            { value: 'square', label: 'Square' },
                            { value: 'butt', label: 'Flat' },
                        ]}
                    />
                    <SegmentedControl<LineJoin>
                        aria-label="Corners"
                        value={lineJoin}
                        onChange={(v) => updateBrush({ lineJoin: v })}
                        options={[
                            { value: 'round', label: 'Round' },
                            { value: 'bevel', label: 'Bevel' },
                            { value: 'miter', label: 'Sharp' },
                        ]}
                    />
                    <SegmentedControl<LineStyle>
                        aria-label="Line style"
                        value={lineStyle}
                        onChange={(v) => updateBrush({ lineStyle: v })}
                        options={[
                            { value: 'solid', label: 'Solid' },
                            { value: 'dashed', label: 'Dash' },
                            { value: 'dotted', label: 'Dots' },
                            { value: 'dashdot', label: 'Dash-dot' },
                        ]}
                    />
                </Section>
            )}

            {/* stroke: ink / calligraphy */}
            {variableBrush && (
                <Section title={engine === 'ink' ? 'Ink' : 'Nib'}>
                    <SliderField
                        label="Smoothing"
                        value={smoothing}
                        min={0}
                        max={10}
                        onChange={(v) => updateBrush({ smoothing: v })}
                    />
                    {engine === 'ink' ? (
                        <SliderField
                            label="Taper at ends"
                            value={taper}
                            min={0}
                            max={10}
                            onChange={(v) => updateBrush({ taper: v })}
                        />
                    ) : (
                        <SliderField
                            label="Nib angle"
                            value={nibAngle}
                            min={0}
                            max={180}
                            unit="°"
                            onChange={(v) => updateBrush({ nibAngle: v })}
                        />
                    )}
                </Section>
            )}

            {/* fill */}
            {strokeBrush && (
                <Section title="Fill">
                    <LabeledToggle
                        label="Fill the drawn shape"
                        hint="Draw a closed loop to fill it"
                        checked={fillEnabled}
                        onChange={(v) => updateBrush({ fillEnabled: v })}
                    />
                    {fillEnabled && (
                        <>
                            <PaintTargetSwatch
                                id="brush-fill"
                                label="Fill color"
                                value={fillColor}
                                showLabel
                                onChange={(hex) => updateBrush({ fillColor: hex })}
                            />
                            <SliderField
                                label="Fill opacity"
                                value={Math.round(fillOpacity * 100)}
                                min={5}
                                max={100}
                                unit="%"
                                onChange={(v) => updateBrush({ fillOpacity: v / 100 })}
                            />
                        </>
                    )}
                </Section>
            )}

            {/* shadow / glow */}
            {hasShadowControls && (
                <Section title="Shadow and glow">
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
                    {engine === 'neon' && !shadowActive && (
                        <p className="text-caption text-ink-subtle">
                            Neon glows by default; set a shadow here to override it.
                        </p>
                    )}
                </Section>
            )}

            {/* drawing aids */}
            {!eraser && (
                <Section title="Drawing aids">
                    {strokeBrush && (
                        <LabeledToggle
                            label="Straight lines"
                            hint="Or hold Shift while drawing"
                            checked={straightLine}
                            onChange={(v) => updateBrush({ straightLine: v })}
                        />
                    )}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-ink">Mirror drawing</span>
                        <SegmentedControl<Symmetry>
                            aria-label="Mirror drawing"
                            value={symmetry}
                            onChange={(v) => setSymmetry(v)}
                            options={[
                                { value: 'none', label: 'Off' },
                                { value: 'x', label: 'Left-right' },
                                { value: 'y', label: 'Top-bottom' },
                                { value: 'both', label: '4-way' },
                            ]}
                        />
                        {symmetry !== 'none' && (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="self-start"
                                onClick={() => recenterSymmetry()}
                            >
                                Set mirror axis to view center
                            </Button>
                        )}
                    </div>
                </Section>
            )}
        </div>
    );
}
