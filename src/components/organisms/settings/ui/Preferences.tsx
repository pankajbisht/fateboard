import { useId, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '@/store';
import {
    CUSTOM_CANVAS_ID,
    CUSTOM_CANVAS_LIMITS,
    getDefaultCanvasPreset,
    type IconSize,
    type ThemeMode,
    type Unit,
} from '@/store/slices/createSettingSlice';
import {
    CANVAS_PRESETS,
    orientPreset,
    type CanvasOrientation,
} from '@/components/organisms/board/board.config';
import { formatSize, fromUnit, toUnit, unitPrecision } from '@/lib/units';
import { ColorThemePicker } from './ColorThemePicker';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select, type SelectOption } from '@/components/atoms/Select';
import { Switch } from '@/components/atoms/Switch';
import { SegmentedControl, type SegmentOption } from '@/components/molecules/SegmentedControl';

/* -------------------------------------------------------------------------- */
/*  Option lists                                                               */
/* -------------------------------------------------------------------------- */

const THEME_OPTIONS: Option<ThemeMode>[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
];

const ICON_SIZE_OPTIONS: Option<IconSize>[] = [
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
];

const ORIENTATION_OPTIONS: Option<CanvasOrientation>[] = [
    { value: 'landscape', label: 'Landscape' },
    { value: 'portrait', label: 'Portrait' },
];

const UNIT_OPTIONS: Option<Unit>[] = [
    { value: 'px', label: 'px' },
    { value: 'mm', label: 'mm' },
    { value: 'cm', label: 'cm' },
    { value: 'in', label: 'in' },
];

/** Same as --ui-rail-icon in index.css, so the preview shows the real size. */
const ICON_PREVIEW_PX: Record<IconSize, number> = { sm: 16, md: 19, lg: 23 };

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                            */
/* -------------------------------------------------------------------------- */

type Option<T extends string> = SegmentOption<T>;

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
            </div>
            <div className="divide-y divide-line px-5">{children}</div>
        </section>
    );
}

function Row({
    title,
    description,
    children,
    labelId,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    labelId?: string;
}) {
    return (
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 sm:max-w-xs">
                <p id={labelId} className="text-sm font-medium text-ink">
                    {title}
                </p>
                {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Custom canvas size                                                         */
/* -------------------------------------------------------------------------- */

/** px -> the unit, rounded like the unit is shown elsewhere. */
const inUnit = (px: number, unit: Unit) => {
    const f = 10 ** unitPrecision(unit);
    return String(Math.round(toUnit(px, unit) * f) / f);
};

/**
 * Width / height for Settings > Canvas size > Custom size, typed in Settings > Units and stored in
 * whole px (same rules the Canvas Size panel had: px must be whole, other units are rounded to px).
 */
function CustomSizeFields({
    width,
    height,
    unit,
    onApply,
}: {
    width: number;
    height: number;
    unit: Unit;
    onApply: (width: number, height: number) => boolean;
}) {
    const [w, setW] = useState(() => inUnit(width, unit));
    const [h, setH] = useState(() => inUnit(height, unit));
    const [error, setError] = useState('');
    const { min, max } = CUSTOM_CANVAS_LIMITS;

    const apply = () => {
        const typedW = Number(w);
        const typedH = Number(h);
        const pxOk = unit !== 'px' || (Number.isInteger(typedW) && Number.isInteger(typedH));
        const pxW = Math.round(fromUnit(typedW, unit));
        const pxH = Math.round(fromUnit(typedH, unit));
        if (!pxOk || !onApply(pxW, pxH)) {
            setError(
                unit === 'px'
                    ? `Enter whole-number dimensions between ${min} and ${max.toLocaleString('en')} px.`
                    : `Enter dimensions between ${inUnit(min, unit)} and ${inUnit(max, unit)} ${unit}.`,
            );
            return;
        }
        setError('');
    };

    return (
        <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <Input
                    label={`Width (${unit})`}
                    type="number"
                    min={0}
                    value={w}
                    onChange={(e) => setW(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && apply()}
                />
                <Input
                    label={`Height (${unit})`}
                    type="number"
                    min={0}
                    value={h}
                    onChange={(e) => setH(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && apply()}
                />
            </div>
            {error && (
                <p role="alert" className="text-caption text-danger">
                    {error}
                </p>
            )}
            <Button size="sm" variant="secondary" onClick={apply}>
                Apply size
            </Button>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

function Preferences() {
    const settings = useStore((s) => s.settings);
    const setMode = useStore((s) => s.setMode);
    const setIconSize = useStore((s) => s.setIconSize);
    const toggleFreehand = useStore((s) => s.toggleFreehand);
    const setColorTheme = useStore((s) => s.setColorTheme);
    const setUnit = useStore((s) => s.setUnit);
    const setDefaultCanvasPreset = useStore((s) => s.setDefaultCanvasPreset);
    const setCanvasOrientation = useStore((s) => s.setCanvasOrientation);
    const setCustomCanvasSize = useStore((s) => s.setCustomCanvasSize);
    const resetSettings = useStore((s) => s.resetSettings);
    const confirmDialog = useStore((s) => s.confirmDialog);

    const freehandLabelId = useId();
    const canvasSizeLabelId = useId();

    // the size boards get: the custom size after orientation, as the fields show it
    const canvasSize = getDefaultCanvasPreset(settings);
    const isCustom = settings.defaultCanvasPresetId === CUSTOM_CANVAS_ID;
    const custom = isCustom
        ? canvasSize
        : getDefaultCanvasPreset({ ...settings, defaultCanvasPresetId: CUSTOM_CANVAS_ID });

    // sizes in the chosen orientation and unit, grouped by category; Custom size last
    const presetOptions = useMemo<SelectOption[]>(
        () => [
            ...CANVAS_PRESETS.map((preset) => {
                const { width, height } = orientPreset(preset, settings.canvasOrientation);
                return {
                    value: preset.id,
                    label: preset.label,
                    description: formatSize(width, height, settings.unit),
                    group: preset.category,
                    icon: preset.icon,
                };
            }),
            {
                value: CUSTOM_CANVAS_ID,
                label: 'Custom size',
                description: formatSize(custom.width, custom.height, settings.unit),
                group: 'Custom',
                icon: 'ruler-combined',
            },
        ],
        [settings.canvasOrientation, settings.unit, custom.width, custom.height],
    );

    const confirmReset = async () => {
        const ok = await confirmDialog({
            title: 'Reset all settings?',
            message:
                'Theme, color theme, icon size, board type, canvas size, orientation and units go back to their defaults. The page you had open takes the default size when you go back to the editor.',
            confirmLabel: 'Reset settings',
            tone: 'danger',
        });
        if (ok) resetSettings();
    };

    const iconPx = ICON_PREVIEW_PX[settings.iconSize];

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
            <header>
                <h1 className="text-2xl font-semibold text-ink">Settings</h1>
                <p className="mt-1 text-sm text-ink-muted">
                    Changes are saved automatically on this device.
                </p>
            </header>

            <Section title="Appearance">
                <Row title="Theme" description="System follows your device setting.">
                    <SegmentedControl
                        block={false}
                        aria-label="Theme"
                        value={settings.mode}
                        options={THEME_OPTIONS}
                        onChange={setMode}
                    />
                </Row>

                <Row
                    title="Color theme"
                    description="Brand color for buttons, selections and the board. Works in light and dark."
                >
                    <ColorThemePicker value={settings.colorTheme} onChange={setColorTheme} />
                </Row>

                <Row title="Icon size" description="Applies to toolbars and panels.">
                    <div className="flex items-center gap-4">
                        <span
                            aria-hidden
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-muted"
                        >
                            <span
                                className="rounded-sm bg-ink-muted transition-all"
                                style={{ width: iconPx, height: iconPx }}
                            />
                        </span>
                        <SegmentedControl
                            block={false}
                            aria-label="Icon size"
                            value={settings.iconSize}
                            options={ICON_SIZE_OPTIONS}
                            onChange={setIconSize}
                        />
                    </div>
                </Row>
            </Section>

            <Section
                title="Canvas"
                description="Choose between an endless canvas and a fixed page, and the page's size and orientation."
            >
                <Row
                    title="Freehand"
                    description="An endless canvas with no page boundary."
                    labelId={freehandLabelId}
                >
                    <Switch
                        checked={settings.freehand}
                        onChange={() => toggleFreehand()}
                        aria-labelledby={freehandLabelId}
                    />
                </Row>

                <Row title="Orientation" description="Landscape or portrait for the canvas size.">
                    <SegmentedControl
                        block={false}
                        aria-label="Orientation"
                        value={settings.canvasOrientation}
                        options={ORIENTATION_OPTIONS}
                        onChange={setCanvasOrientation}
                    />
                </Row>

                {/* the one place to choose the canvas size (no left-rail panel); grid / snap: top bar */}
                <Row
                    title="Canvas size"
                    description="New boards start at this size, and the page you had open takes it when you go back to the editor. Undo brings the old size back."
                    labelId={canvasSizeLabelId}
                >
                    <div className="w-full sm:w-64">
                        <Select
                            aria-labelledby={canvasSizeLabelId}
                            value={settings.defaultCanvasPresetId}
                            options={presetOptions}
                            onChange={setDefaultCanvasPreset}
                        />
                        {isCustom && (
                            <CustomSizeFields
                                // fresh fields when the size changes elsewhere (orientation, unit)
                                key={`${canvasSize.width}x${canvasSize.height}-${settings.unit}`}
                                width={canvasSize.width}
                                height={canvasSize.height}
                                unit={settings.unit}
                                onApply={setCustomCanvasSize}
                            />
                        )}
                    </div>
                </Row>
            </Section>

            <Section title="Units">
                <Row title="Units" description="Used on rulers and size fields.">
                    <SegmentedControl
                        block={false}
                        aria-label="Units"
                        value={settings.unit}
                        options={UNIT_OPTIONS}
                        onChange={setUnit}
                    />
                </Row>
            </Section>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-5 py-4">
                <div>
                    <p className="text-sm font-medium text-ink">Reset settings</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                        Restore every setting on this page to its default.
                    </p>
                </div>
                <Button variant="danger-outline" size="sm" onClick={() => void confirmReset()}>
                    Reset settings
                </Button>
            </div>
        </div>
    );
}

export default Preferences;
