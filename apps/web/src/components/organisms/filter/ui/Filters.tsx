// Filters.tsx  (v2)
import { PanelSection } from '@/components/molecules/PanelSection';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Icon } from '@/components/atoms/Icon';
import React, { useEffect, useState } from 'react';
import * as fabric from 'fabric';

import LabeledSlider from '@/components/molecules/LabeledSlider';
import LabeledToggle from '@/components/molecules/LabeledToggle';
import IconButton from '@/components/atoms/IconButton';
import { Tooltip } from '@/components/molecules/Tooltip';

import {
    type ColorKey,
    DEFAULT_FILTER_STATE,
    FILTER_PRESETS,
    type FilterState,
    type NumericKey,
    PRESET_KEYS,
    type PresetKey,
    type ToggleKey,
    makeThumbSource,
    renderPresetThumbs,
} from './filterEngine';
import { useImageFilters } from './useImageFilters';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';

/* ======================================================
   CONFIG
====================================================== */

type SliderDef = { key: NumericKey; label: string; min: number; max: number; step: number };

const LIGHT: SliderDef[] = [
    { key: 'exposure', label: 'Exposure', min: -1, max: 1, step: 0.01 },
    { key: 'brightness', label: 'Brightness', min: -1, max: 1, step: 0.01 },
    { key: 'contrast', label: 'Contrast', min: -1, max: 1, step: 0.01 },
    { key: 'gamma', label: 'Gamma', min: 0.2, max: 2.2, step: 0.01 },
    { key: 'fade', label: 'Fade', min: 0, max: 1, step: 0.01 },
    { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.01 },
];

const COLOR: SliderDef[] = [
    { key: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.01 },
    { key: 'vibrance', label: 'Vibrance', min: -1, max: 1, step: 0.01 },
    { key: 'hue', label: 'Hue', min: -1, max: 1, step: 0.01 },
    { key: 'temperature', label: 'Temperature', min: -1, max: 1, step: 0.01 },
    { key: 'tint', label: 'Tint', min: -1, max: 1, step: 0.01 },
];

const DETAIL: SliderDef[] = [
    { key: 'sharpen', label: 'Sharpen', min: 0, max: 1, step: 0.01 },
    { key: 'blur', label: 'Blur', min: 0, max: 1, step: 0.01 },
    { key: 'noise', label: 'Noise / Grain', min: 0, max: 1, step: 0.01 },
    { key: 'pixelate', label: 'Pixelate', min: 1, max: 20, step: 1 },
    { key: 'threshold', label: 'Threshold (B/W cut)', min: 0, max: 1, step: 0.01 },
];

const TOGGLES: { key: ToggleKey; label: string }[] = [
    { key: 'grayscale', label: 'Grayscale' },
    { key: 'sepia', label: 'Sepia' },
    { key: 'invert', label: 'Invert' },
    { key: 'edge', label: 'Edge Detect' },
    { key: 'emboss', label: 'Emboss' },
];

/* ======================================================
   SMALL UI PIECES
====================================================== */

const Section = PanelSection;

/** Filter colors are painted from the right dock palette (the app's only color picker). */
function ColorField({
    id,
    label,
    value,
    onChange,
    onCommit,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    onCommit: () => void;
}) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span>{label}</span>
            <PaintTargetSwatch
                id={id}
                label={label}
                value={value}
                onChange={(hex) => {
                    onChange(hex);
                    onCommit();
                }}
            />
        </div>
    );
}

/* ======================================================
   PRESET THUMBNAILS (cached per image, built from original pixels)
====================================================== */

const thumbCache = new WeakMap<fabric.FabricImage, Record<string, string>>();

function usePresetThumbnails(img: fabric.FabricImage | null) {
    const [thumbs, setThumbs] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!img) {
            setThumbs({});
            return;
        }
        const cached = thumbCache.get(img);
        if (cached) {
            setThumbs(cached);
            return;
        }

        let cancelled = false;
        const source = makeThumbSource(img);
        if (!source) return;

        setThumbs({});
        renderPresetThumbs(source, PRESET_KEYS, () => cancelled).then((res) => {
            if (cancelled) return;
            thumbCache.set(img, res);
            setThumbs(res);
        });

        return () => {
            cancelled = true;
        };
    }, [img]);

    return thumbs;
}

export function PresetThumbnails({
    thumbs,
    active,
    onSelect,
}: {
    thumbs: Record<string, string>;
    active: PresetKey | null;
    onSelect: (key: PresetKey) => void;
}) {
    return (
        <div className="flex gap-3 overflow-x-auto rounded-md pb-1">
            {PRESET_KEYS.map((key) => {
                const isActive = (active ?? 'none') === key;
                return (
                    <div
                        key={key}
                        title={FILTER_PRESETS[key].label}
                        onClick={() => onSelect(key)}
                        className={`flex-shrink-0 cursor-pointer rounded-md border-2 p-1 transition-colors ${
                            isActive ? 'border-primary-500' : 'border-line hover:border-line-strong'
                        }`}
                    >
                        {thumbs[key] ? (
                            <img
                                src={thumbs[key]}
                                alt={FILTER_PRESETS[key].label}
                                className="h-16 w-16 rounded-md object-cover"
                            />
                        ) : (
                            <div className="h-16 w-16 animate-pulse rounded-md bg-surface-strong" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function Filters() {
    const {
        kind,
        images,
        state,
        update,
        commit,
        reset,
        applyPreset,
        setPresetIntensity,
        setComparing,
        flatten,
    } = useImageFilters();

    const thumbs = usePresetThumbnails(images[0] ?? null);

    const header = (
        <div className="flex items-center justify-end">
            <div className="flex items-center gap-1">
                {kind === 'image' && (
                    <>
                        <Tooltip content="Hold to compare with original">
                            <IconButton
                                aria-label="Hold to compare with original"
                                icon={<Icon name="eye" />}
                                onPointerDown={() => setComparing(true)}
                                onPointerUp={() => setComparing(false)}
                                onPointerLeave={() => setComparing(false)}
                                onPointerCancel={() => setComparing(false)}
                            />
                        </Tooltip>
                        <Tooltip content="Reset all filters">
                            <IconButton
                                aria-label="Reset all filters"
                                icon={<Icon name="rotate-left" />}
                                onClick={() => reset()}
                            />
                        </Tooltip>
                    </>
                )}
                {kind !== 'none' && (
                    <Tooltip content="Convert Shape to Image">
                        <IconButton
                            aria-label="Convert shape to image"
                            icon={<Icon name="image" />}
                            onClick={flatten}
                        />
                    </Tooltip>
                )}
            </div>
        </div>
    );

    if (kind !== 'image') {
        return (
            <>
                {header}
                <EmptyState
                    icon="image"
                    title={kind === 'other' ? 'Filters work on images' : 'No image selected'}
                    description={
                        kind === 'other'
                            ? 'Use “Convert shape to image” first.'
                            : 'Select an image to edit its filters.'
                    }
                />
            </>
        );
    }

    /** Your LabeledSlider, now controlled. Wrapper handles drag-end (history) + double-click reset. */
    const renderSlider = ({ key, ...props }: SliderDef) => (
        <div
            key={key}
            onPointerUp={commit}
            onKeyUp={commit}
            onDoubleClick={() => {
                update({ [key]: DEFAULT_FILTER_STATE[key] });
                commit();
            }}
        >
            <LabeledSlider
                {...props}
                value={state[key]}
                onChange={(v: number) => update({ [key]: v })}
            />
        </div>
    );

    const renderToggle = (key: ToggleKey, label: string) => (
        <LabeledToggle
            key={key}
            label={label}
            checked={state[key]}
            onChange={(v: boolean) => {
                update({ [key]: v });
                commit();
            }}
            className="justify-between"
        />
    );

    const setColor = (key: ColorKey) => (v: string) => update({ [key]: v });
    const keys = (defs: SliderDef[]) => defs.map((d) => d.key) as (keyof FilterState)[];

    return (
        <>
            {header}

            {images.length > 1 && (
                <p className="text-xs text-ink-muted">
                    Editing {images.length} images. Changes apply to all of them.
                </p>
            )}

            <Section title="Presets">
                <PresetThumbnails thumbs={thumbs} active={state.preset} onSelect={applyPreset} />
                {state.preset && (
                    <div onPointerUp={commit} onKeyUp={commit}>
                        <LabeledSlider
                            label="Intensity"
                            min={0}
                            max={1}
                            step={0.01}
                            value={state.presetIntensity}
                            onChange={(v: number) => setPresetIntensity(v)}
                        />
                    </div>
                )}
            </Section>

            <Section title="Light" onReset={() => reset(keys(LIGHT))}>
                {LIGHT.map(renderSlider)}
            </Section>

            <Section title="Color" onReset={() => reset(keys(COLOR))}>
                {COLOR.map(renderSlider)}
            </Section>

            <Section title="Detail" onReset={() => reset(keys(DETAIL))}>
                {DETAIL.map(renderSlider)}
            </Section>

            <Section
                title="Effects"
                onReset={() => reset([...TOGGLES.map((t) => t.key), 'matrix', 'matrixAmount'])}
            >
                {TOGGLES.map(({ key, label }) => renderToggle(key, label))}
            </Section>

            <Section
                title="Duotone"
                onReset={() => reset(['duotone', 'duotoneShadow', 'duotoneHighlight'])}
            >
                {renderToggle('duotone', 'Enable duotone')}
                <ColorField
                    id="filter-duotoneShadow"
                    label="Duotone shadows"
                    value={state.duotoneShadow}
                    onChange={setColor('duotoneShadow')}
                    onCommit={commit}
                />
                <ColorField
                    id="filter-duotoneHighlight"
                    label="Duotone highlights"
                    value={state.duotoneHighlight}
                    onChange={setColor('duotoneHighlight')}
                    onCommit={commit}
                />
            </Section>

            <Section title="Color Overlay" onReset={() => reset(['tintAmount', 'tintColor'])}>
                <ColorField
                    id="filter-tintColor"
                    label="Overlay color"
                    value={state.tintColor}
                    onChange={setColor('tintColor')}
                    onCommit={commit}
                />
                {renderSlider({ key: 'tintAmount', label: 'Amount', min: 0, max: 1, step: 0.01 })}
            </Section>

            <Section
                title="Remove Color"
                onReset={() => reset(['removeColor', 'removeColorValue', 'removeColorDistance'])}
            >
                {renderToggle('removeColor', 'Make color transparent')}
                <ColorField
                    id="filter-removeColorValue"
                    label="Color to remove"
                    value={state.removeColorValue}
                    onChange={setColor('removeColorValue')}
                    onCommit={commit}
                />
                {renderSlider({
                    key: 'removeColorDistance',
                    label: 'Tolerance',
                    min: 0,
                    max: 1,
                    step: 0.01,
                })}
            </Section>
        </>
    );
}
