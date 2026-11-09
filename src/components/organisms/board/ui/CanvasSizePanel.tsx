/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { EmptyState } from '@/components/molecules/EmptyState';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { Icon } from '@/components/atoms/Icon';
import { useMemo, useState } from 'react';
import { useStore } from '@store';
import { CANVAS_PRESETS, DEFAULT_CANVAS_PRESET } from '../board.config';
import type { CanvasPreset, CanvasSizePanelProps } from '../board.type';
import { PanelAction } from '@/components/molecules/PanelAction';
import { Chip } from '@/components/atoms/Chip';
import { useUnit } from '@hooks/useUnit';
import { formatSize, fromUnit, toUnit, unitPrecision } from '@/lib/units';

export { DEFAULT_CANVAS_PRESET };

const CATEGORIES = ['All', 'Video', 'Social Media', 'Print', 'Presentation'] as const;

type CategoryFilter = (typeof CATEGORIES)[number];

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s×]/g, '');

type Orientation = 'landscape' | 'portrait';

const SWAP_SUFFIX = '@swapped';

/** `youtube@swapped` -> `youtube`, so the list can still highlight the preset after rotating it. */
const baseId = (id: string) => id.replace(SWAP_SUFFIX, '');

const getOrientation = (size: { width: number; height: number }): Orientation | 'square' =>
    size.width === size.height ? 'square' : size.width > size.height ? 'landscape' : 'portrait';

/** Same format, long side horizontal (landscape) or vertical (portrait). */
function orientPreset(preset: CanvasPreset, orientation: Orientation): CanvasPreset {
    const base = baseId(preset.id);
    const long = Math.max(preset.width, preset.height);
    const short = Math.min(preset.width, preset.height);
    const width = orientation === 'landscape' ? long : short;
    const height = orientation === 'landscape' ? short : long;

    const original = CANVAS_PRESETS.find((p) => p.id === base);
    const isOriginalSize = !!original && original.width === width && original.height === height;

    const id = !original
        ? `custom-${width}x${height}` // custom size: id follows the dimensions
        : isOriginalSize
          ? base
          : `${base}${SWAP_SUFFIX}`;

    return {
        ...preset,
        id,
        width,
        height,
    };
}

/**
 * Works with props (controlled) or without them (reads/writes the store directly),
 * so the sidebar config can simply render <CanvasSizePanel />.
 */
export function CanvasSizePanel(props: Partial<CanvasSizePanelProps>) {
    const storePreset = useStore((s: any) => s.selectedPreset) as CanvasPreset | undefined;
    const setStorePreset = useStore((s: any) => s.setSelectedPreset);

    const selectedPreset: CanvasPreset =
        props.selectedPreset ?? storePreset ?? DEFAULT_CANVAS_PRESET;

    const onSelectPreset =
        props.onSelectPreset ??
        ((preset: CanvasPreset) => {
            setStorePreset?.(preset);
        });

    // Remembered choice, used when the current size is square and has no orientation of its own.
    const [orientationPref, setOrientationPref] = useState<Orientation>(() => {
        const o = getOrientation(selectedPreset);
        return o === 'square' ? 'landscape' : o;
    });
    const currentOrientation = getOrientation(selectedPreset);
    const orientation: Orientation =
        currentOrientation === 'square' ? orientationPref : currentOrientation;
    const isSquare = currentOrientation === 'square';

    const changeOrientation = (next: Orientation) => {
        setOrientationPref(next);
        if (isSquare || next === orientation) return;
        onSelectPreset(orientPreset(selectedPreset, next));
    };

    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<CategoryFilter>('All');
    const [showCustom, setShowCustom] = useState(false);
    // shown / typed in Settings > Units, stored in px (BUG-082)
    const unit = useUnit();
    const inUnit = (px: number) => {
        const f = 10 ** unitPrecision(unit);
        return String(Math.round(toUnit(px, unit) * f) / f);
    };
    const [customWidth, setCustomWidth] = useState(() => inUnit(selectedPreset.width));
    const [customHeight, setCustomHeight] = useState(() => inUnit(selectedPreset.height));
    const [customError, setCustomError] = useState('');

    const filteredPresets = useMemo(() => {
        const search = normalize(query);

        return CANVAS_PRESETS.filter((preset) => {
            const matchesCategory = category === 'All' || preset.category === category;

            const searchableText = normalize(
                `${preset.label} ${preset.category} ${preset.width}x${preset.height}`,
            );

            return matchesCategory && (!search || searchableText.includes(search));
        });
    }, [category, query]);

    // Picking from the list keeps the chosen orientation (landscape / portrait).
    const selectPreset = (preset: CanvasPreset) => {
        setCustomError('');
        onSelectPreset(orientPreset(preset, orientation));
    };

    const applyCustomSize = () => {
        const typedW = Number(customWidth);
        const typedH = Number(customHeight);
        // px must be whole numbers; mm / cm / in may have decimals and are rounded to whole px
        const pxOk = unit !== 'px' || (Number.isInteger(typedW) && Number.isInteger(typedH));
        const width = Math.round(fromUnit(typedW, unit));
        const height = Math.round(fromUnit(typedH, unit));

        if (
            !pxOk ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width < 1 ||
            height < 1 ||
            width > 10000 ||
            height > 10000
        ) {
            setCustomError(
                unit === 'px'
                    ? 'Enter whole-number dimensions between 1 and 10,000 px.'
                    : `Enter dimensions between ${inUnit(1)} and ${inUnit(10000)} ${unit}.`,
            );
            return;
        }

        // Custom sizes are applied exactly as typed; orientation follows from them.
        setCustomError('');
        if (width !== height) {
            setOrientationPref(width > height ? 'landscape' : 'portrait');
        }
        onSelectPreset({
            id: `custom-${width}x${height}`,
            label: 'Custom Size',
            category: 'Custom',
            width,
            height,
            icon: 'ruler-combined',
        } as CanvasPreset);

        setShowCustom(false);
    };

    return (
        <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-surface">
            {/* Panel title and selected size */}
            <div className="shrink-0 space-y-3 border-b border-line p-4">
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 p-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-ink">
                        <Icon name={selectedPreset.icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                            {selectedPreset.label}
                        </p>
                        <p className="text-xs text-ink-muted">
                            {formatSize(selectedPreset.width, selectedPreset.height, unit)}
                        </p>
                    </div>
                    <Icon name="check" className="text-primary-ink" />
                </div>

                {/* Orientation */}
                <SegmentedControl
                    aria-label="Canvas orientation"
                    size="sm"
                    value={isSquare ? '' : orientation}
                    onChange={(item) => changeOrientation(item as 'landscape' | 'portrait')}
                    options={[
                        { value: 'landscape', label: 'Landscape', disabled: isSquare },
                        { value: 'portrait', label: 'Portrait', disabled: isSquare },
                    ]}
                />
            </div>

            {/* Search and category filters */}
            <div className="shrink-0 space-y-3 border-b border-line p-4">
                <Input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search formats…"
                    aria-label="Search canvas formats"
                />

                <div
                    aria-label="Filter formats by category"
                    className="flex min-w-0 gap-1.5 overflow-x-auto pb-1"
                >
                    {CATEGORIES.map((item) => {
                        const active = category === item;

                        return (
                            <Chip key={item} active={active} onClick={() => setCategory(item)}>
                                {item}
                            </Chip>
                        );
                    })}
                </div>
            </div>

            {/* Only this section scrolls */}
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-label uppercase text-ink-subtle">
                        {category === 'All' ? 'All formats' : category}
                    </span>
                    <Badge>{filteredPresets.length}</Badge>
                </div>

                {filteredPresets.length > 0 ? (
                    <div className="space-y-2">
                        {filteredPresets.map((basePreset) => {
                            // show every format in the chosen orientation
                            const preset = orientPreset(basePreset, orientation);
                            const active = baseId(selectedPreset.id) === basePreset.id;

                            const ratio = preset.width / preset.height;
                            const previewWidth = ratio >= 1 ? 32 : Math.max(12, 32 * ratio);
                            const previewHeight = ratio >= 1 ? Math.max(12, 25 / ratio) : 25;

                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => selectPreset(preset)}
                                    aria-pressed={active}
                                    className={[
                                        'flex w-full min-w-0 items-center gap-2.5 rounded-lg border p-2 text-left transition-colors',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60',
                                        active
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-line hover:border-line-strong hover:bg-surface-muted',
                                    ].join(' ')}
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-muted">
                                        <span
                                            className="block rounded-[2px] border-2 border-ink-muted bg-surface"
                                            style={{
                                                width: previewWidth,
                                                height: previewHeight,
                                            }}
                                        />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-ink">
                                            {preset.label}
                                        </span>
                                        <span className="block text-xs text-ink-muted">
                                            {formatSize(preset.width, preset.height, unit)}
                                        </span>
                                    </span>

                                    {active && (
                                        <Icon name="check" className="shrink-0 text-primary-ink" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon="magnifying-glass"
                        title="No formats found"
                        description="Try another search or use custom dimensions."
                    />
                )}
            </div>

            {/* Custom dimensions stay at the bottom of the panel */}
            <div className="shrink-0 border-t border-line bg-surface px-4 py-3">
                <button
                    type="button"
                    onClick={() => setShowCustom((value) => !value)}
                    aria-expanded={showCustom}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                >
                    <Icon name="ruler-combined" className="text-xs text-ink-muted" />
                    <span className="flex-1">Custom dimensions</span>
                    <Icon
                        name="chevron-down"
                        className={`text-xs transition-transform ${showCustom ? 'rotate-180' : ''}`}
                    />
                </button>

                {showCustom && (
                    <div className="mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                label={`Width (${unit})`}
                                type="number"
                                min={0}
                                value={customWidth}
                                onChange={(event) => setCustomWidth(event.target.value)}
                            />
                            <Input
                                label={`Height (${unit})`}
                                type="number"
                                min={0}
                                value={customHeight}
                                onChange={(event) => setCustomHeight(event.target.value)}
                            />
                        </div>

                        {customError && (
                            <p role="alert" className="text-caption text-danger">
                                {customError}
                            </p>
                        )}

                        <PanelAction icon="check" onClick={applyCustomSize}>
                            Apply size
                        </PanelAction>
                    </div>
                )}
            </div>
        </div>
    );
}
