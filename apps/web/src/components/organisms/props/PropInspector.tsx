import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { PRESETS } from '@/animation/presets';
import { ambientFor } from '@/props/ambient';
import { getProp } from '@/props/catalog';
import { parsePropData } from '@/props/schema/parse';
import type { PropData, PropToneKind } from '@/props/types';
import Button from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import { Field } from '../../molecules/Field';
import LabeledToggle from '../../molecules/LabeledToggle';
import { SliderField } from '../../molecules/LabeledSlider';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { CustomColorButton } from '../character/CustomColorButton';

type Listener = { on: (e: string, h: () => void) => () => void; getActiveObject: () => unknown };

/** The selected prop's data, following selection changes and edits (null for anything else). */
function useSelectedProp(): PropData | null {
    const canvas = useStore((s) => s.canvas) as unknown as Listener | null;
    const [data, setData] = useState<PropData | null>(null);
    useEffect(() => {
        if (!canvas) return;
        const read = () =>
            setData(
                parsePropData(
                    (canvas.getActiveObject() as { propData?: unknown } | null)?.propData,
                ),
            );
        read();
        const events = [
            'selection:created',
            'selection:updated',
            'selection:cleared',
            'object:modified',
        ];
        const offs = events.map((e) => canvas.on(e, read));
        return () => offs.forEach((off) => off());
    }, [canvas]);
    return data;
}

const TONES: { value: PropToneKind; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'dots', label: 'Dots' },
    { value: 'lines', label: 'Lines' },
    { value: 'gradient', label: 'Gradient' },
];

const title = (slot: string) => slot.charAt(0).toUpperCase() + slot.slice(1);

/**
 * Restyle the selected Scene Object (docs/PROPS.md phase 3): variant, colour slots, outline, manga
 * screentone, Randomize. Every change rebuilds the drawing in the same object: one undo step.
 */
export function PropInspector() {
    const data = useSelectedProp();
    const { update, randomize, applyPreset, animDuration } = useStore(
        useShallow((s) => ({
            update: s.updateSelectedProp,
            randomize: s.randomizeSelectedProp,
            applyPreset: s.applyPreset,
            animDuration: s.animDuration,
        })),
    );
    // the outline width slider shows its value while dragging, and rebuilds once on release
    const [width, setWidth] = useState<number | null>(null);
    const [density, setDensity] = useState<number | null>(null);
    const def = data ? getProp(data.propId) : undefined;
    if (!data || !def) return null;
    const variants = def.variants ?? [];
    const set = (patch: Partial<PropData>) => void update(patch);
    const ambient = ambientFor(def);
    const ambientMeta = ambient ? PRESETS.find((p) => p.id === ambient) : undefined;
    // loop the motion over the whole animation (the timeline's length), from its start
    const addAmbient = () =>
        ambientMeta &&
        applyPreset(ambientMeta.id, {
            start: 0,
            duration: ambientMeta.defaultDuration,
            repeat: Math.max(1, Math.ceil((animDuration || 0) / ambientMeta.defaultDuration)),
        });

    return (
        <PanelSection title={`Selected: ${def.label}`}>
            {variants.length > 1 &&
                (variants.length <= 3 ? (
                    <SegmentedControl
                        aria-label="Variant"
                        value={String(data.variant)}
                        onChange={(v) => set({ variant: Number(v) })}
                        options={variants.map((label, i) => ({ value: String(i), label }))}
                    />
                ) : (
                    <Field label="Variant">
                        <Select
                            value={data.variant}
                            onChange={(v) => set({ variant: Number(v) })}
                            options={variants.map((label, i) => ({ value: i, label }))}
                        />
                    </Field>
                ))}
            <div className="flex flex-wrap items-center gap-2">
                {Object.keys(def.colors).map((slot) => (
                    <CustomColorButton
                        key={slot}
                        label={`${title(slot)} colour`}
                        value={data.colors[slot] ?? def.colors[slot]}
                        onChange={(hex) => set({ colors: { [slot]: hex } })}
                    />
                ))}
                <CustomColorButton
                    label="Outline colour"
                    value={data.outline}
                    onChange={(hex) => set({ outline: hex })}
                />
            </div>
            <SliderField
                label="Outline width"
                min={0}
                max={10}
                step={0.5}
                value={width ?? data.outlineWidth}
                onChange={setWidth}
                onCommit={(v) => {
                    setWidth(null);
                    set({ outlineWidth: v });
                }}
                unit="px"
            />
            <SegmentedControl
                aria-label="Screentone"
                value={data.tone.kind}
                onChange={(kind) => set({ tone: { ...data.tone, kind } })}
                options={TONES}
            />
            {data.tone.kind !== 'none' && (
                <SliderField
                    label="Tone density"
                    min={0.1}
                    max={0.9}
                    step={0.1}
                    value={density ?? data.tone.density}
                    onChange={setDensity}
                    onCommit={(v) => {
                        setDensity(null);
                        set({ tone: { ...data.tone, density: v } });
                    }}
                />
            )}
            <LabeledToggle
                label="Shadow"
                checked={data.shadow}
                onChange={(on) => set({ shadow: on })}
            />
            {ambientMeta && (
                <Button variant="secondary" size="sm" onClick={addAmbient}>
                    {`Add ${ambientMeta.label.toLowerCase()}`}
                </Button>
            )}
            <Button variant="secondary" size="sm" icon="shuffle" onClick={() => void randomize()}>
                Randomize
            </Button>
        </PanelSection>
    );
}
