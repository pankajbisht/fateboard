import { useStore } from '@store';
import {
    BLEND_MODES,
    getEngine,
    getPreset,
    isStrokeBrush,
    isVariableBrush,
    toHex6,
    type EraserMode,
    type LineCap,
    type LineJoin,
    type LineStyle,
} from '@store/brushConfig';
import { Button } from '../../atoms/Button';
import { SliderField } from '../../molecules/LabeledSlider';
import LabeledToggle from '../../molecules/LabeledToggle';
import { PanelSection } from '../../molecules/PanelSection';
import { PaintTargetSwatch } from '../../molecules/PaintTargetSwatch';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { SelectField } from '../../molecules/SelectField';
import { SymmetryControls } from '../SymmetryControls';
import { BrushShadowSection } from './BrushShadowSection';
import { ClassicBrushPreview } from './ClassicBrushPreview';

/**
 * Settings of a classic (non-stamp) brush or the eraser, shown under the library in the Brush panel (they
 * were the Draw panel until 2026-11-28): preview, size / opacity / blend, eraser type, color, stroke
 * (smoothing, ends, corners, line style), ink / nib, fill, shadow and glow, straight lines and symmetry.
 */
export function ClassicBrushSettings() {
    const brush = useStore((s) => s.brush);
    const width = useStore((s) => s.width);
    const color = toHex6(useStore((s) => s.color));
    const opacity = useStore((s) => s.brushOpacity);
    const smoothing = useStore((s) => s.smoothing);
    const lineCap = useStore((s) => s.lineCap);
    const lineJoin = useStore((s) => s.lineJoin);
    const lineStyle = useStore((s) => s.lineStyle);
    const blend = useStore((s) => s.blend);
    const taper = useStore((s) => s.taper);
    const nibAngle = useStore((s) => s.nibAngle);
    const fillEnabled = useStore((s) => s.fillEnabled);
    const fillColor = toHex6(useStore((s) => s.fillColor));
    const fillOpacity = useStore((s) => s.fillOpacity);
    const straightLine = useStore((s) => s.straightLine);
    const eraserMode = useStore((s) => s.eraserMode);
    const updateBrush = useStore((s) => s.updateBrush);
    const setBrushWidth = useStore((s) => s.setBrushWidth);
    const setBrushColor = useStore((s) => s.setBrushColor);
    const commitRecentColor = useStore((s) => s.commitRecentColor);
    const resetBrush = useStore((s) => s.resetBrush);
    const undo = useStore((s) => s.undo);
    const redo = useStore((s) => s.redo);

    const engine = getEngine(brush);
    if (engine === 'stamp') return null; // BrushSettingsSection covers library brushes
    const preset = getPreset(brush);
    const eraser = engine === 'eraser';
    const strokeBrush = isStrokeBrush(brush); // caps, joins, dashes, fill, straight lines
    const variableBrush = isVariableBrush(brush); // ink / calligraphy

    return (
        <>
            <PanelSection title={`${preset.label} settings`}>
                <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                        <Button variant="secondary" size="sm" icon="undo" onClick={() => undo()}>
                            Undo
                        </Button>
                        <Button variant="secondary" size="sm" icon="redo" onClick={() => redo()}>
                            Redo
                        </Button>
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
                <ClassicBrushPreview />
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
            </PanelSection>

            <PanelSection title="Size and opacity">
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
            </PanelSection>

            {eraser && (
                <PanelSection title="Eraser type">
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
                </PanelSection>
            )}

            {!eraser && (
                <PanelSection title="Color">
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
                </PanelSection>
            )}

            {strokeBrush && (
                <PanelSection title="Stroke">
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
                </PanelSection>
            )}

            {variableBrush && (
                <PanelSection title={engine === 'ink' ? 'Ink' : 'Nib'}>
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
                </PanelSection>
            )}

            {strokeBrush && (
                <PanelSection title="Fill">
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
                </PanelSection>
            )}

            {!eraser && <BrushShadowSection />}

            {!eraser && (
                <PanelSection title="Drawing aids">
                    {strokeBrush && (
                        <LabeledToggle
                            label="Straight lines"
                            hint="Or hold Shift while drawing"
                            checked={straightLine}
                            onChange={(v) => updateBrush({ straightLine: v })}
                        />
                    )}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-ink">Symmetry</span>
                        <SymmetryControls />
                    </div>
                </PanelSection>
            )}
        </>
    );
}
